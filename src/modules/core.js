import { histTick } from "./historico.js";

let NS, FLOOR, CW, CH, STORE, DATA, SEED_GROUPS, PITCH, EXTRA_MAX, EXTRAS, FR, moved, BASE, tiles, groups, nextG, active, groupMove, svgM, svgC, rowsEl, gM, gC, selected, i;

function half(v, lo, hi) {
    v = Number(v);
    if (!isFinite(v)) return null;
    v = Math.round(v * 2) / 2;
    return v < lo || v > hi ? null : v;
  }

export function mnum(v) {
    v = Number(v);
    return isFinite(v) && Math.abs(v) <= 100 ? Math.round(v * 100) / 100 : null;
  }

export function cleanExtra(x) {
    if (!x || typeof x !== "object") return null;
    var id = String(x.id == null ? "" : x.id);
    if (!/^\d{1,3}$/.test(id) || DATA.some(function (d) { return d.id === id; })) return null;
    var kind = x.kind;
    if (!Object.prototype.hasOwnProperty.call(PITCH, kind)) return null;
    var w = half(x.w, 0.5, 30), h = half(x.h, 0.5, 30), mx = half(x.mx, -30, 60), my = half(x.my, -10, 30);
    if (w === null || h === null || mx === null || my === null) return null;
    var cx = Math.round(Number(x.cx)), cy = Math.round(Number(x.cy));
    if (!isFinite(cx) || !isFinite(cy) || Math.abs(cx) > 20000 || Math.abs(cy) > 20000) { cx = 0; cy = 0; }
    var nm = typeof x.name === "string" ? x.name.trim().slice(0, 40) : "";
    return { id: id, name: nm || ("Tela " + id), kind: kind, w: w, h: h, mx: mx, my: my, cx: cx, cy: cy, grp: typeof x.grp === "string" ? x.grp : "", extra: true };
  }

export function cleanExtras(list) {
    var out = [], seen = {};
    (Array.isArray(list) ? list : []).forEach(function (x) {
      var c = cleanExtra(x);
      if (c && !seen[c.id] && out.length < EXTRA_MAX) { seen[c.id] = 1; out.push(c); }
    });
    return out;
  }

export function freeSpot(w, h, list) {
    for (var y = 0; y <= CH - h; y += 128) {
      for (var x = 0; x <= CW - w; x += 128) {
        var hit = list.some(function (t) { var b = res(t); return x < t.cx + b.w && t.cx < x + w && y < t.cy + b.h && t.cy < y + h; });
        if (!hit) return { x: x, y: y };
      }
    }
    return null;
  }

export function scaledPos(t) {
    var q = res(t);
    var x = Math.round((FR.ax0 + (t.mx - FR.mx0) * FR.sx) / 8) * 8;
    var y = Math.round((FR.ay0 + (FR.mtop - (t.my + t.h)) * FR.sy) / 8) * 8;
    return { x: Math.min(Math.max(x, 0), CW - q.w), y: Math.min(Math.max(y, 0), CH - q.h) };
  }

export function save() {
    histTick();
    try {
      var pos = {}, tg = {}, mpos = {};
      tiles.forEach(function (t) { pos[t.id] = [t.cx, t.cy]; tg[t.id] = t.grp || ""; mpos[t.id] = [t.mx, t.my]; });
      localStorage.setItem(STORE, JSON.stringify({ pos: pos, tg: tg, mpos: mpos, groups: groups, nextG: nextG, extras: EXTRAS }));
    } catch (e) {}
  }

export function res(s) {
    var cols = Math.round(s.w / 0.5), rows = Math.round(s.h / 0.5), px = PITCH[s.kind].px;
    return { cols: cols, rows: rows, px: px, w: cols * px, h: rows * px, total: cols * px * rows * px };
  }

export function esc(v) { return String(v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]; }); }

export function fmt(n) { return String(Math.round(n * 100) / 100).replace(".", ","); }

export function nf(n) { return n.toLocaleString("pt-BR"); }

export function el(name, attrs, parent) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

export function text(parent, cls, x, y, size, str) {
    var t = el("text", { "class": cls, x: x, y: y, "font-size": size }, parent);
    if (cls === "dim-t") t.setAttribute("stroke-width", size * 0.3);
    t.textContent = str;
    return t;
  }

export function cabPath(cols, rows, cw, ch) {
    var d = "", k;
    for (k = 1; k < cols; k++) d += "M" + (k * cw) + " 0V" + (rows * ch);
    for (k = 1; k < rows; k++) d += "M0 " + (k * ch) + "H" + (cols * cw);
    return d;
  }

export function groupById(id) { for (var i = 0; i < groups.length; i++) if (groups[i].id === id) return groups[i]; return null; }

export function gname(g) { return g.name.trim() || "Sem nome"; }

export function members(id) { return tiles.filter(function (t) { return t.grp === id; }); }

export function bbox(list) {
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    list.forEach(function (t) {
      var a = res(t);
      x0 = Math.min(x0, t.cx); y0 = Math.min(y0, t.cy);
      x1 = Math.max(x1, t.cx + a.w); y1 = Math.max(y1, t.cy + a.h);
    });
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }

export function init() {
  NS = "http://www.w3.org/2000/svg";
  FLOOR = 8;
  CW = 6144;
  CH = 2560;
  STORE = "mapa-telas-led-config-v3";
  DATA = [
    { id: "1",  name: "IMAG esquerda",       kind: "imag", w: 4,   h: 6, mx: 0,    my: 0,   cx: 0,    cy: 784,  grp: "g1" },
    { id: "2a", name: "C esquerdo · base",   kind: "c",    w: 8.5, h: 1, mx: 5,    my: 0,   cx: 800,  cy: 1536, grp: "g3" },
    { id: "2b", name: "C esquerdo · coluna", kind: "c",    w: 1.5, h: 5, mx: 5,    my: 1,   cx: 800,  cy: 256,  grp: "g3" },
    { id: "2c", name: "C esquerdo · teto",   kind: "c",    w: 7,   h: 1, mx: 5,    my: 6,   cx: 800,  cy: 0,    grp: "g3" },
    { id: "3",  name: "Upstage",             kind: "up",   w: 12,  h: 4, mx: 7.5,  my: 1.5, cx: 1968, cy: 560,  grp: "g2" },
    { id: "4a", name: "C direito · base",    kind: "c",    w: 8.5, h: 1, mx: 13.5, my: 0,   cx: 2976, cy: 1536, grp: "g3" },
    { id: "4b", name: "C direito · coluna",  kind: "c",    w: 1.5, h: 5, mx: 20.5, my: 1,   cx: 4768, cy: 256,  grp: "g3" },
    { id: "4c", name: "C direito · teto",    kind: "c",    w: 7,   h: 1, mx: 15,   my: 6,   cx: 3360, cy: 0,    grp: "g3" },
    { id: "5",  name: "IMAG direita",        kind: "imag", w: 4,   h: 6, mx: 23,   my: 0,   cx: 5280, cy: 784,  grp: "g1" }
  ];
  SEED_GROUPS = [{ id: "g1", name: "IMAGs" }, { id: "g2", name: "Upstage" }, { id: "g3", name: "Cs" }];
  PITCH = { imag: { name: "P5.9", px: 84 }, up: { name: "P5.9", px: 84 }, c: { name: "P3.9", px: 128 } };
  EXTRA_MAX = 40;
  EXTRAS = [];
  try {
      var s0 = JSON.parse(localStorage.getItem(STORE) || "null");
      if (s0 && Array.isArray(s0.extras)) EXTRAS = cleanExtras(s0.extras);
    } catch (e) {}
  FR = (function () {
    var mx0 = Infinity, mtop = -Infinity, mx1 = -Infinity, mbot = Infinity, ax0 = Infinity, ay0 = Infinity, ax1 = -Infinity, ay1 = -Infinity;
    DATA.forEach(function (d) {
      var q = res(d);
      mx0 = Math.min(mx0, d.mx); mx1 = Math.max(mx1, d.mx + d.w); mtop = Math.max(mtop, d.my + d.h); mbot = Math.min(mbot, d.my);
      ax0 = Math.min(ax0, d.cx); ay0 = Math.min(ay0, d.cy); ax1 = Math.max(ax1, d.cx + q.w); ay1 = Math.max(ay1, d.cy + q.h);
    });
    return { mx0: mx0, mtop: mtop, ax0: ax0, ay0: ay0, sx: (ax1 - ax0) / (mx1 - mx0), sy: (ay1 - ay0) / (mtop - mbot) };
  })();
  moved = {};
  (function () {
      var placed = DATA.slice();
      EXTRAS.forEach(function (e) {
        var q = res(e);
        var hit = placed.some(function (t) { var b = res(t); return e.cx < t.cx + b.w && t.cx < e.cx + q.w && e.cy < t.cy + b.h && t.cy < e.cy + q.h; });
        if (hit) {
          var f = freeSpot(q.w, q.h, placed);
          if (f) { moved[e.id] = [e.cx, e.cy]; e.cx = f.x; e.cy = f.y; }
        }
        placed.push(e);
      });
    })();
  BASE = DATA.concat(EXTRAS);
  tiles = BASE.map(function (s) { return Object.assign({}, s); });
  groups = SEED_GROUPS.map(function (g) { return Object.assign({}, g); });
  nextG = 4;
  active = null;
  groupMove = true;
  try {
      var saved = JSON.parse(localStorage.getItem(STORE) || "null");
      if (saved) {
        if (Array.isArray(saved.groups)) {
          groups = saved.groups.filter(function (g) { return g && typeof g.id === "string" && typeof g.name === "string"; });
          nextG = Number(saved.nextG) || groups.length + 1;
        }
        tiles.forEach(function (t) {
          var mp = saved.mpos && saved.mpos[t.id];
          if (Array.isArray(mp) && mnum(mp[0]) !== null && mnum(mp[1]) !== null) { t.mx = mnum(mp[0]); t.my = mnum(mp[1]); }
          var mv = moved[t.id], sp = saved.pos && saved.pos[t.id];
          if (sp && mv && sp[0] === mv[0] && sp[1] === mv[1]) sp = null;
          if (sp) { t.cx = saved.pos[t.id][0]; t.cy = saved.pos[t.id][1]; }
          if (saved.tg && Object.prototype.hasOwnProperty.call(saved.tg, t.id)) t.grp = saved.tg[t.id] || "";
        });
      }
    } catch (e) {}
  tiles.forEach(function (t) {
      if (t.grp && !groups.some(function (g) { return g.id === t.grp; })) t.grp = "";
    });
  svgM = document.getElementById("svg-m");
  svgC = document.getElementById("svg-c");
  rowsEl = document.getElementById("rows");
  gM = {};
  gC = {};
  selected = null;
}

export { tiles, FLOOR, svgM, gM, selected, svgC, CW, CH, gC, rowsEl, groups, PITCH, active, nextG, groupMove, BASE, EXTRAS, STORE, EXTRA_MAX };
export function set_selected(v) { selected = v; return v; }
export function set_active(v) { active = v; return v; }
export function set_nextG(v) { nextG = v; return v; }
export function set_groupMove(v) { groupMove = v; return v; }
export function set_groups(v) { groups = v; return v; }
export function set_EXTRAS(v) { EXTRAS = v; return v; }
