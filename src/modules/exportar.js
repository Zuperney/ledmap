import { tiles, CH, CW, BASE, res, scaledPos, PITCH, groups, members, gname, bbox, nf, fmt, FLOOR } from "./core.js";
import { ports, routes, portState, cellEl, pname, owners, pcolor, portById, LIMIT, oc } from "./cabeamento.js";
import { boundsM } from "./rig.js";

let tById, dl, toastT, KCOL, MONO, DISP;

export function pmsg(t) {
    document.getElementById("proj-msg").textContent = t || "";
    var tb = document.getElementById("toast");
    clearTimeout(toastT);
    if (!t) { tb.hidden = true; return; }
    tb.textContent = t; tb.hidden = false;
    toastT = setTimeout(function () { tb.hidden = true; }, 5000);
  }

function showImage(blob) {
    var im = document.getElementById("img-out");
    try { if (im.getAttribute("src")) URL.revokeObjectURL(im.getAttribute("src")); } catch (e) {}
    im.src = URL.createObjectURL(blob);
    document.getElementById("img-modal").hidden = false;
  }

function fallback(name, data, why) {
    if (typeof data === "string") {
      var pd = document.getElementById("paste");
      pd.hidden = false; pd.open = true;
      document.getElementById("json-text").value = data.replace(/^\uFEFF/, "");
      try { pd.scrollIntoView({ block: "center" }); } catch (e) {}
      pmsg(why + " O conteúdo de " + name + " foi colocado na caixa de texto no topo: copie de lá.");
    } else {
      showImage(data);
      pmsg(why);
    }
  }

function nativeSave(name, data) {
    try {
      var blob = data instanceof Blob ? data : new Blob(["\ufeff" === data.charAt(0) ? data : data], { type: "text/plain;charset=utf-8" });
      var u = URL.createObjectURL(blob), a = document.createElement("a");
      a.href = u; a.download = name; a.style.display = "none";
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(u); a.remove(); }, 4000);
      return true;
    } catch (e) { return false; }
  }

export function saveFile(name, data) {
    if (!dl && nativeSave(name, data)) { pmsg("Baixando: " + name); return Promise.resolve(); }
    if (!dl) { fallback(name, data, "Download indisponível neste visualizador."); return Promise.resolve(); }
    return dl.save({ filename: name, data: data }).then(function () {
      pmsg("Enviado para salvar: " + name);
    }).catch(function (e) {
      if (e && e.code === "declined") pmsg("Salvamento cancelado.");
      else fallback(name, data, "Não foi possível baixar (" + ((e && (e.code || e.message)) || "erro") + ").");
    });
  }

function csvCell(v) {
    var t = String(v);
    return /[;"\n\r]/.test(t) ? "\"" + t.replace(/"/g, "\"\"") + "\"" : t;
  }

function csv(rows) {
    return "﻿" + rows.map(function (r) { return r.map(csvCell).join(";"); }).join("\r\n") + "\r\n";
  }

function currentItems() { return tiles.map(function (t) { return { t: t, x: t.cx, y: t.cy }; }); }

function nearestFree(px, py, w, h, others) {
    var best = null;
    for (var y = 0; y <= CH - h; y += 16) {
      for (var x = 0; x <= CW - w; x += 16) {
        var hit = others.some(function (o) { return x < o.x + o.w && o.x < x + w && y < o.y + o.h && o.y < y + h; });
        if (hit) continue;
        var d = (x - px) * (x - px) + (y - py) * (y - py);
        if (!best || d < best.d) best = { x: x, y: y, d: d };
      }
    }
    return best;
  }

function assembledItems() {
    var items = BASE.map(function (d) {
      var t = tById[d.id], q = res(t);
      var mv = !!d.extra || t.mx !== d.mx || t.my !== d.my, p;
      if (!mv) p = { x: d.cx, y: d.cy };
      else if (d.extra) p = scaledPos(t);
      else {
        var k = q.px * 2;
        p = {
          x: Math.min(Math.max(Math.round((d.cx + (t.mx - d.mx) * k) / 8) * 8, 0), CW - q.w),
          y: Math.min(Math.max(Math.round((d.cy - (t.my - d.my) * k) / 8) * 8, 0), CH - q.h)
        };
      }
      return { t: t, x: p.x, y: p.y, w: q.w, h: q.h, mv: mv };
    });
    items.forEach(function (it) {
      if (!it.mv) return;
      var others = items.filter(function (o) { return o !== it; });
      var hit = others.some(function (o) { return it.x < o.x + o.w && o.x < it.x + it.w && it.y < o.y + o.h && o.y < it.y + it.h; });
      if (hit) {
        var f = nearestFree(it.x, it.y, it.w, it.h, others);
        if (f) { it.x = f.x; it.y = f.y; }
      }
    });
    return items;
  }

function screensCsv() {
    var rows = [["screen", "screen_x_px", "screen_y_px", "screen_largura_px", "screen_altura_px", "tela", "nome", "pitch",
      "gabinetes_colunas", "gabinetes_linhas", "largura_px", "altura_px", "x_canvas_px", "y_canvas_px", "x_na_screen_px", "y_na_screen_px"]];
    function tileRow(label, bb, t) {
      var q = res(t);
      return [label, bb ? bb.x : "", bb ? bb.y : "", bb ? bb.w : "", bb ? bb.h : "", t.id, t.name, PITCH[t.kind].name,
        q.cols, q.rows, q.w, q.h, t.cx, t.cy, bb ? t.cx - bb.x : "", bb ? t.cy - bb.y : ""];
    }
    groups.forEach(function (g) {
      var mem = members(g.id);
      if (!mem.length) { rows.push([gname(g), "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]); return; }
      var bb = bbox(mem);
      mem.forEach(function (t) { rows.push(tileRow(gname(g), bb, t)); });
    });
    tiles.filter(function (t) { return !t.grp; }).forEach(function (t) { rows.push(tileRow("", null, t)); });
    return csv(rows);
  }

function cablingCsv() {
    var rows = [["porta", "ordem", "tela", "nome_tela", "coluna", "linha", "pitch", "px_gabinete", "px_acumulado",
      "x_canvas_px", "y_canvas_px", "status_porta"]];
    ports.forEach(function (pt) {
      var route = routes[pt.id], acc = 0, st = portState(route).txt;
      route.forEach(function (k, i) {
        var c = cellEl[k], q = res(c.t), px = q.px * q.px;
        acc += px;
        rows.push([pname(pt), i + 1, c.t.id, c.t.name, c.c + 1, c.r + 1, PITCH[c.t.kind].name, px, acc,
          c.t.cx + c.c * q.px, c.t.cy + c.r * q.px, st]);
      });
    });
    return csv(rows);
  }

function halo(ctx, str, x, y, fill, w) {
    ctx.lineJoin = "round";
    ctx.lineWidth = w;
    ctx.strokeStyle = "rgba(0,0,0,0.85)";
    ctx.strokeText(str, x, y);
    ctx.fillStyle = fill;
    ctx.fillText(str, x, y);
  }

function gcolor(i) { return "hsl(" + Math.round((i * 67 + 20) % 360) + ", 80%, 62%)"; }

function drawMap(mode, items) {
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, pos = {};
    items.forEach(function (it) {
      var q = res(it.t);
      pos[it.t.id] = it;
      x0 = Math.min(x0, it.x); y0 = Math.min(y0, it.y);
      x1 = Math.max(x1, it.x + q.w); y1 = Math.max(y1, it.y + q.h);
    });
    var bw = x1 - x0, bh = y1 - y0;
    var plain = mode === "pixelmap";
    var pad = plain ? 0 : 80, head = plain ? 0 : 150;
    var legendH = mode === "cabling" ? 260 + Math.ceil(Math.max(ports.length, 1) / 3) * 110 : 0;
    var W = Math.round(Math.max(bw + pad * 2, plain ? 1 : 2400));
    var H = Math.round(bh + pad * 2 + head + legendH);
    var cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    var ctx = cv.getContext("2d");
    var ox = Math.round((W - bw) / 2 - x0), oy = pad + head - y0;
    ctx.fillStyle = plain ? "#000000" : "#0d1319";
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    if (!plain) {
      ctx.font = "700 72px " + DISP;
      halo(ctx, mode === "cabling" ? "Cabeamento de dados" : "Screens", pad, 96, "#ffffff", 0);
      ctx.font = "400 34px " + MONO;
      halo(ctx, "Mapa de Telas LED · área ocupada " + nf(bw) + " × " + nf(bh) + " px", pad, 140, "#9fb2c1", 0);
    }

    items.forEach(function (it) {
      var t = it.t, q = res(t), x = it.x + ox, y = it.y + oy;
      ctx.globalAlpha = mode === "cabling" ? 0.3 : 0.9;
      ctx.fillStyle = KCOL[t.kind];
      ctx.fillRect(x, y, q.w, q.h);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = plain ? 2 : 1.5;
      ctx.beginPath();
      var k;
      for (k = 1; k < q.cols; k++) { ctx.moveTo(x + k * q.px, y); ctx.lineTo(x + k * q.px, y + q.h); }
      for (k = 1; k < q.rows; k++) { ctx.moveTo(x, y + k * q.px); ctx.lineTo(x + q.w, y + k * q.px); }
      ctx.stroke();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 4;
      ctx.strokeRect(x + 2, y + 2, q.w - 4, q.h - 4);
      if (mode !== "cabling") {
        var fz = Math.max(12, Math.round(q.px * 0.17));
        ctx.font = "400 " + fz + "px " + MONO;
        for (var r = 0; r < q.rows; r++) {
          for (var c = 0; c < q.cols; c++) {
            halo(ctx, (c + 1) + "-" + (r + 1), x + c * q.px + 6, y + r * q.px + fz + 4, "rgba(255,255,255,0.8)", 3);
          }
        }
      }
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      var big = Math.round(Math.min(q.w, q.h) * (q.h >= 600 ? 0.3 : 0.4));
      if (q.h >= 600) {
        ctx.font = "700 " + big + "px " + DISP;
        halo(ctx, t.id, x + q.w / 2, y + q.h / 2 - big * 0.55, "#ffffff", 10);
        ctx.font = "500 44px " + MONO;
        halo(ctx, q.w + " × " + q.h + " px", x + q.w / 2, y + q.h / 2 + big * 0.25, "#ffffff", 8);
        ctx.font = "400 36px " + MONO;
        halo(ctx, PITCH[t.kind].name + " · " + q.cols + " × " + q.rows + " gab.", x + q.w / 2, y + q.h / 2 + big * 0.25 + 56, "#ffffff", 8);
      } else {
        ctx.font = "700 " + big + "px " + DISP;
        halo(ctx, t.id + "  " + q.w + " × " + q.h + " px", x + q.w / 2, y + q.h / 2, "#ffffff", 8);
      }
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      if (plain) {
        ctx.font = "500 26px " + MONO;
        halo(ctx, (it.x - x0) + "," + (it.y - y0), x + 12, y + q.h - 12, "#ffffff", 6);
      }
    });

    if (mode === "screens") {
      groups.forEach(function (g, gi) {
        var mem = items.filter(function (it) { return it.t.grp === g.id; });
        if (!mem.length) return;
        var gx0 = Infinity, gy0 = Infinity, gx1 = -Infinity, gy1 = -Infinity;
        mem.forEach(function (it) {
          var q = res(it.t);
          gx0 = Math.min(gx0, it.x); gy0 = Math.min(gy0, it.y);
          gx1 = Math.max(gx1, it.x + q.w); gy1 = Math.max(gy1, it.y + q.h);
        });
        var col = gcolor(gi), m = 18;
        ctx.setLineDash([28, 16]);
        ctx.lineWidth = 6;
        ctx.strokeStyle = col;
        ctx.strokeRect(gx0 + ox - m, gy0 + oy - m, gx1 - gx0 + 2 * m, gy1 - gy0 + 2 * m);
        ctx.setLineDash([]);
        ctx.font = "700 60px " + DISP;
        halo(ctx, gname(g) + "  " + nf(gx1 - gx0) + " × " + nf(gy1 - gy0) + " px", gx0 + ox - m, gy0 + oy - m - 18, col, 10);
      });
    }

    if (mode === "cabling") {
      var own = owners();
      Object.keys(own).forEach(function (key) {
        var c = cellEl[key], q = res(c.t), it = pos[c.t.id];
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = pcolor(portById(own[key].pid));
        ctx.fillRect(it.x + ox + c.c * q.px, it.y + oy + c.r * q.px, q.px, q.px);
        ctx.globalAlpha = 1;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "700 " + Math.round(q.px * 0.34) + "px " + MONO;
        halo(ctx, String(own[key].i + 1), it.x + ox + (c.c + 0.5) * q.px, it.y + oy + (c.r + 0.5) * q.px, "#ffffff", 5);
      });
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ports.forEach(function (pt) {
        var route = routes[pt.id];
        if (!route.length) return;
        var col = pcolor(pt);
        var pts = route.map(function (key) {
          var c = cellEl[key], q = res(c.t), it = pos[c.t.id];
          return [it.x + ox + (c.c + 0.5) * q.px, it.y + oy + (c.r + 0.5) * q.px, q.px];
        });
        ctx.strokeStyle = col;
        ctx.lineWidth = 6;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.beginPath();
        pts.forEach(function (a, i) { if (i) ctx.lineTo(a[0], a[1]); else ctx.moveTo(a[0], a[1]); });
        ctx.stroke();
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(pts[0][0], pts[0][1], pts[0][2] * 0.22, 0, Math.PI * 2); ctx.fill();
        ctx.font = "700 " + Math.round(pts[0][2] * 0.5) + "px " + DISP;
        halo(ctx, pname(pt).slice(0, 8), pts[0][0] + pts[0][2] * 0.3, pts[0][1] - pts[0][2] * 0.3, "#ffffff", 8);
      });
      var ly = pad + head + bh + 70;
      ctx.font = "700 56px " + DISP;
      halo(ctx, "Portas", pad, ly, "#ffffff", 0);
      var colW = (W - pad * 2) / 3;
      ports.forEach(function (pt, i) {
        var route = routes[pt.id], st = portState(route);
        var px0 = pad + (i % 3) * colW, py0 = ly + 40 + Math.floor(i / 3) * 110;
        ctx.fillStyle = pcolor(pt);
        ctx.fillRect(px0, py0, 36, 36);
        ctx.font = "700 40px " + DISP;
        halo(ctx, pname(pt), px0 + 52, py0 + 32, "#ffffff", 0);
        ctx.font = "400 28px " + MONO;
        halo(ctx, route.length + " gab. · " + nf(st.load) + " / " + nf(LIMIT) + " px · " + st.txt, px0 + 52, py0 + 76, "#9fb2c1", 0);
      });
      var tot = Object.keys(cellEl).length, asg = Object.keys(own).length;
      ctx.font = "400 30px " + MONO;
      halo(ctx, tot + " gabinetes · " + asg + " com porta · " + (tot - asg) + " sem porta · limite de " + nf(LIMIT) + " px por porta · overclock " + (oc ? "ligado" : "desligado"),
        pad, H - 50, "#9fb2c1", 0);
    }
    return cv;
  }

function drawLayout(withCab) {
    var S = 120, b = boundsM, pad = 60, head = 150;
    var bw = (b.x1 - b.x0) * S, bh = (b.y1 - b.y0) * S, cs = 0.5 * S;
    var legendH = withCab ? 260 + Math.ceil(Math.max(ports.length, 1) / 3) * 110 : 0;
    var W = Math.round(Math.max(bw + pad * 2, 2400)), H = Math.round(bh + pad * 2 + head + legendH);
    var cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    var ctx = cv.getContext("2d");
    var ox = Math.round((W - bw) / 2 - b.x0 * S), oy = pad + head - b.y0 * S;
    function X(m) { return ox + m * S; }
    function Y(sy) { return oy + sy * S; }
    ctx.fillStyle = "#0d1319";
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    tiles.forEach(function (t) {
      minX = Math.min(minX, t.mx); maxX = Math.max(maxX, t.mx + t.w);
      minY = Math.min(minY, t.my); maxY = Math.max(maxY, t.my + t.h);
    });
    ctx.font = "700 72px " + DISP;
    halo(ctx, withCab ? "Montagem com cabeamento" : "Layout da montagem", pad, 96, "#ffffff", 0);
    ctx.font = "400 34px " + MONO;
    halo(ctx, "Mapa de Telas LED · conjunto " + fmt(maxX - minX) + " × " + fmt(maxY - minY) + " m · vista frontal, medidas em metros", pad, 140, "#9fb2c1", 0);
    var m, sy;
    ctx.strokeStyle = "#1c2a35"; ctx.lineWidth = 1;
    ctx.beginPath();
    for (m = Math.ceil(b.x0); m <= b.x1; m++) { ctx.moveTo(X(m), Y(b.y0)); ctx.lineTo(X(m), Y(b.y1)); }
    for (sy = Math.ceil(b.y0); sy <= b.y1; sy++) { ctx.moveTo(X(b.x0), Y(sy)); ctx.lineTo(X(b.x1), Y(sy)); }
    ctx.stroke();
    ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(X(b.x0), Y(FLOOR)); ctx.lineTo(X(b.x1), Y(FLOOR)); ctx.stroke();
    ctx.font = "400 30px " + MONO; ctx.textAlign = "center";
    for (m = 0; m <= 25; m += 5) halo(ctx, m + " m", X(m), Y(FLOOR) + 44, "#9fb2c1", 0);
    ctx.textAlign = "left";
    [2, 4, 6, 8].forEach(function (v) { halo(ctx, v + " m", X(b.x0) + 8, Y(FLOOR - v) - 8, "#9fb2c1", 0); });

    tiles.forEach(function (t) {
      var q = res(t), x = X(t.mx), y = Y(FLOOR - t.my - t.h), w = t.w * S, h = t.h * S, k;
      ctx.globalAlpha = withCab ? 0.3 : 0.85;
      ctx.fillStyle = KCOL[t.kind];
      ctx.fillRect(x, y, w, h);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "rgba(255,255,255,0.45)"; ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (k = 1; k < q.cols; k++) { ctx.moveTo(x + k * cs, y); ctx.lineTo(x + k * cs, y + h); }
      for (k = 1; k < q.rows; k++) { ctx.moveTo(x, y + k * cs); ctx.lineTo(x + w, y + k * cs); }
      ctx.stroke();
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 4;
      ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      if (t.h >= 3 && t.w >= 3) {
        ctx.font = "700 100px " + DISP;
        halo(ctx, t.id, x + w / 2, y + h / 2 - 80, "#ffffff", 10);
        ctx.font = "500 34px " + MONO;
        halo(ctx, t.name, x + w / 2, y + h / 2 - 10, "#ffffff", 7);
        halo(ctx, fmt(t.w) + " × " + fmt(t.h) + " m", x + w / 2, y + h / 2 + 34, "#ffffff", 7);
        halo(ctx, q.w + " × " + q.h + " px · " + q.cols + " × " + q.rows + " gab.", x + w / 2, y + h / 2 + 78, "#ffffff", 7);
      } else if (w >= 3.2 * S) {
        ctx.font = "700 " + Math.round(Math.min(h * 0.55, 48)) + "px " + DISP;
        halo(ctx, t.id + "  " + fmt(t.w) + " × " + fmt(t.h) + " m · " + q.w + " × " + q.h + " px", x + w / 2, y + h / 2, "#ffffff", 8);
      } else {
        ctx.font = "700 " + Math.round(Math.min(w, h) * 0.6) + "px " + DISP;
        halo(ctx, t.id, x + w / 2, y + h / 2, "#ffffff", 8);
      }
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    });

    if (withCab) {
      var own = owners();
      function cc(key) {
        var c = cellEl[key], t = c.t;
        return { x: X(t.mx + c.c * 0.5), y: Y(FLOOR - t.my - t.h + c.r * 0.5) };
      }
      Object.keys(own).forEach(function (key) {
        var p = cc(key);
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = pcolor(portById(own[key].pid));
        ctx.fillRect(p.x, p.y, cs, cs);
        ctx.globalAlpha = 1;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.font = "700 22px " + MONO;
        halo(ctx, String(own[key].i + 1), p.x + cs / 2, p.y + cs / 2, "#ffffff", 4);
      });
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      ports.forEach(function (pt) {
        var route = routes[pt.id];
        if (!route.length) return;
        var col = pcolor(pt);
        var pts = route.map(function (key) { var p = cc(key); return [p.x + cs / 2, p.y + cs / 2]; });
        ctx.strokeStyle = col; ctx.lineWidth = 6; ctx.lineJoin = "round"; ctx.lineCap = "round";
        ctx.beginPath();
        pts.forEach(function (a, i) { if (i) ctx.lineTo(a[0], a[1]); else ctx.moveTo(a[0], a[1]); });
        ctx.stroke();
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(pts[0][0], pts[0][1], 12, 0, Math.PI * 2); ctx.fill();
        ctx.font = "700 32px " + DISP;
        halo(ctx, pname(pt).slice(0, 8), pts[0][0] + 16, pts[0][1] - 16, "#ffffff", 8);
      });
      var ly = pad + head + bh + 70;
      ctx.font = "700 56px " + DISP;
      halo(ctx, "Portas", pad, ly, "#ffffff", 0);
      var colW = (W - pad * 2) / 3;
      ports.forEach(function (pt, i) {
        var route = routes[pt.id], st = portState(route);
        var px0 = pad + (i % 3) * colW, py0 = ly + 40 + Math.floor(i / 3) * 110;
        ctx.fillStyle = pcolor(pt);
        ctx.fillRect(px0, py0, 36, 36);
        ctx.font = "700 40px " + DISP;
        halo(ctx, pname(pt), px0 + 52, py0 + 32, "#ffffff", 0);
        ctx.font = "400 28px " + MONO;
        halo(ctx, route.length + " gab. · " + nf(st.load) + " / " + nf(LIMIT) + " px · " + st.txt, px0 + 52, py0 + 76, "#9fb2c1", 0);
      });
      var tot = Object.keys(cellEl).length, asg = Object.keys(own).length;
      ctx.font = "400 30px " + MONO;
      halo(ctx, tot + " gabinetes · " + asg + " com porta · " + (tot - asg) + " sem porta · limite de " + nf(LIMIT) + " px por porta · overclock " + (oc ? "ligado" : "desligado"),
        pad, H - 50, "#9fb2c1", 0);
    }
    return cv;
  }

function layoutCsv() {
    var rows = [["tela", "nome", "pitch", "largura_m", "altura_m", "x_m", "y_chao_m", "gab_colunas", "gab_linhas", "resolucao_px", "pixels_total"]];
    tiles.forEach(function (t) {
      var q = res(t);
      rows.push([t.id, t.name, PITCH[t.kind].name, fmt(t.w), fmt(t.h), fmt(t.mx), fmt(t.my), q.cols, q.rows, q.w + "x" + q.h, q.total]);
    });
    return csv(rows);
  }

function exportLayout(withCab, name) {
    drawLayout(withCab).toBlob(function (bl) {
      if (!bl) { pmsg("Não consegui gerar a imagem."); return; }
      saveFile(name, bl);
    }, "image/png");
  }

function exportPng(mode, items, name) {
    var cv = drawMap(mode, items);
    cv.toBlob(function (b) {
      if (!b) { pmsg("Não consegui gerar a imagem."); return; }
      saveFile(name, b);
    }, "image/png");
  }

export function init() {
  tById = {};
  tiles.forEach(function (t) { tById[t.id] = t; });
  dl = null;
  if (window.claude && window.claude.use) {
      window.claude.use("downloads").then(function (d) { dl = d; }).catch(function () {});
    }
  toastT = null;
  document.getElementById("img-close").addEventListener("click", function () { document.getElementById("img-modal").hidden = true; });
  KCOL = { imag: "#1f78b4", up: "#b0307f", c: "#c77a00" };
  MONO = "IBM Plex Mono, ui-monospace, Menlo, Consolas, monospace";
  DISP = "Barlow Condensed, Arial Narrow, sans-serif";
  document.getElementById("m-lay-png").addEventListener("click", function () { exportLayout(false, "layout-montagem.png"); });
  document.getElementById("m-laycab-png").addEventListener("click", function () { exportLayout(true, "montagem-cabeamento.png"); });
  document.getElementById("m-lay-csv").addEventListener("click", function () { saveFile("layout-montagem.csv", layoutCsv()); });
  document.getElementById("m-export").addEventListener("click", function () { exportPng("pixelmap", assembledItems(), "pixelmap-montagem.png"); });
  document.getElementById("scr-png").addEventListener("click", function () { exportPng("screens", currentItems(), "screens-configuracao.png"); });
  document.getElementById("scr-csv").addEventListener("click", function () { saveFile("screens-configuracao.csv", screensCsv()); });
  document.getElementById("k-png").addEventListener("click", function () { exportPng("cabling", currentItems(), "cabeamento.png"); });
  document.getElementById("k-csv").addEventListener("click", function () { saveFile("cabeamento.csv", cablingCsv()); });
}

export { tById };
