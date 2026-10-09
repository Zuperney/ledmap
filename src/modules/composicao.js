// Composição: o canvas do Screen visto como o servidor de vídeo enxerga.
// Usa as posições da aba Screen (não tem posição própria): test card por tela, regiões e proporção.
import { tiles, groups, gname, members, bbox, res, nf, fmt } from "./core.js";
import { chave, projetoAtivo } from "./projetos.js";
import { cabDe } from "./gabinetes.js";
import { ports, routes, cellEl, owners, pcolor, portById } from "./cabeamento.js";
import { saveFile, csv, pmsg } from "./exportar.js";
import { histTick } from "./historico.js";

var CSTORE, cfg = { preset: "mapa", escopo: "" };
var MONO = "IBM Plex Mono, ui-monospace, Menlo, Consolas, monospace";
var DISP = "Barlow Condensed, Arial Narrow, sans-serif";

export var PRESETS = {
  mapa: "Mapa de gabinetes",
  alinhamento: "Alinhamento",
  cabos: "Mapa de cabos (sinal)",
  barras: "Barras de cor",
  branco: "Branco sólido"
};
var CORES = ["#e6194b", "#3cb44b", "#ffe119", "#4363d8", "#f58231", "#911eb4", "#46f0f0", "#f032e6", "#bcf60c", "#fabebe", "#008080", "#9a6324"];
var BARRAS = ["#ffffff", "#ffff00", "#00ffff", "#00ff00", "#ff00ff", "#ff0000", "#0000ff"];
var FORMATOS = [[16, 9], [4, 3], [1, 1], [21, 9], [32, 9], [9, 16], [3, 1], [4, 1], [5, 4], [2, 1]];

function limpa(c) {
  c = c && typeof c === "object" ? c : {};
  var esc = typeof c.escopo === "string" && groups.some(function (g) { return g.id === c.escopo; }) ? c.escopo : "";
  return { preset: PRESETS[c.preset] ? c.preset : "mapa", escopo: esc };
}

export function compState() { return cfg; }
export function loadComp(c) {
  cfg = limpa(c);
  try { localStorage.setItem(CSTORE, JSON.stringify(cfg)); } catch (e) {}
  if (document.body.getAttribute("data-aba") === "n") renderComp();
}
function salvar() { histTick(); try { localStorage.setItem(CSTORE, JSON.stringify(cfg)); } catch (e) {} }

function mdc(a, b) { while (b) { var t = b; b = a % b; a = t; } return a; }

// "16:9", ou "2,37:1 ≈ 21:9" quando a fração não é redonda
export function proporcao(w, h) {
  if (!w || !h) return "";
  var d = mdc(w, h), a = w / d, b = h / d;
  if (a <= 32 && b <= 32) return a + ":" + b;
  var r = w / h, perto = null;
  FORMATOS.forEach(function (f) { var e = Math.abs(r / (f[0] / f[1]) - 1); if (e < 0.02 && (!perto || e < perto.e)) perto = { f: f, e: e }; });
  var txt = r >= 1 ? fmt(Math.round(r * 100) / 100) + ":1" : "1:" + fmt(Math.round(h / w * 100) / 100);
  return perto ? txt + " ≈ " + perto.f[0] + ":" + perto.f[1] : txt;
}

function itensDoEscopo() {
  var list = cfg.escopo ? members(cfg.escopo) : tiles.slice();
  return list.map(function (t) { var q = res(t); return { t: t, q: q, x: t.cx, y: t.cy }; });
}

function textOn(hex) {
  var r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? "#111" : "#fff";
}

// caixa de informações: a maior fonte que cabe, com teto para não dominar telas grandes
function infoBox(ctx, it, x, y) {
  var t = it.t, q = it.q, g = cabDe(t);
  var linhas = [t.name, q.w + " × " + q.h + " px", q.cols + " × " + q.rows + " = " + (q.cols * q.rows) + " gab.", fmt(t.w) + " × " + fmt(t.h) + " m · pitch " + fmt(g.mw / g.rx * 1000) + " mm"];
  ctx.font = "600 100px " + MONO;
  var larg = Math.max.apply(null, linhas.map(function (l) { return ctx.measureText(l).width; }));
  var fs = Math.min(100 * q.w * 0.8 / larg, q.h * 0.8 / (linhas.length * 1.3 + 0.6), Math.pow(q.w * q.h, 0.25) * 0.85);
  if (fs < 6) return;
  ctx.font = "600 " + fs + "px " + MONO;
  var pad = fs * 0.4, bw = larg * fs / 100 + pad * 2, bh = linhas.length * fs * 1.3 + pad;
  var bx = x + (q.w - bw) / 2, by = y + (q.h - bh) / 2;
  ctx.fillStyle = "rgba(0,0,0,0.72)"; ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle = "#fff"; ctx.textAlign = "left"; ctx.textBaseline = "top";
  linhas.forEach(function (l, i) { ctx.fillText(l, bx + pad, by + pad / 2 + i * fs * 1.3); });
}

function geometria(ctx, x, y, w, h) {
  var lw = Math.max(2, Math.min(w, h) * 0.006), rr = Math.min(w, h) * 0.08;
  ctx.strokeStyle = "#fff"; ctx.lineWidth = lw;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y + h); ctx.moveTo(x + w, y); ctx.lineTo(x, y + h); ctx.stroke();
  ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) / 2 - lw, 0, Math.PI * 2); ctx.stroke();
  [[x + rr, y + rr], [x + w - rr, y + rr], [x + rr, y + h - rr], [x + w - rr, y + h - rr]].forEach(function (p) { ctx.beginPath(); ctx.arc(p[0], p[1], rr, 0, Math.PI * 2); ctx.stroke(); });
  ctx.strokeRect(x + lw / 2, y + lw / 2, w - lw, h - lw);
}

function tela(ctx, it, ox, oy, own) {
  var t = it.t, q = it.q, x = it.x - ox, y = it.y - oy, p = cfg.preset, r, c, n = 1;
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, q.w, q.h); ctx.clip();
  for (r = 0; r < q.rows; r++) {
    for (c = 0; c < q.cols; c++) {
      var cx = x + c * q.cw, cy = y + r * q.ch, cor;
      if (p === "branco") cor = "#ffffff";
      else if (p === "barras" || p === "alinhamento") cor = p === "barras" ? "#000000" : CORES[(r + c) % 2 ? 3 : 0];
      else if (p === "cabos") { var o = own[t.id + ":" + c + ":" + r]; cor = o ? pcolor(portById(o.pid)) : "#2a2a2a"; }
      else cor = CORES[(r * q.cols + c) % CORES.length];
      ctx.fillStyle = cor; ctx.fillRect(cx, cy, q.cw, q.ch);
      if (p === "branco" || p === "barras") continue;
      ctx.strokeStyle = "rgba(0,0,0,0.55)"; ctx.lineWidth = Math.max(1, q.cw * 0.02); ctx.strokeRect(cx, cy, q.cw, q.ch);
      if (p === "mapa") {
        ctx.fillStyle = cor.charAt(0) === "#" ? textOn(cor) : "#fff";
        ctx.font = "700 " + (q.ch * 0.26) + "px " + MONO; ctx.textAlign = "left"; ctx.textBaseline = "top";
        ctx.fillText(String(n), cx + q.cw * 0.08, cy + q.ch * 0.06);
      }
      n++;
    }
  }
  if (p === "barras") { var bh = q.h * 0.2, bw = q.w / BARRAS.length; BARRAS.forEach(function (col, i) { ctx.fillStyle = col; ctx.fillRect(x + i * bw, y + (q.h - bh) / 2, bw + 0.5, bh); }); }
  if (p === "alinhamento") geometria(ctx, x, y, q.w, q.h);
  if (p === "mapa") infoBox(ctx, it, x, y);
  ctx.restore();
}

function rotasDeCabo(ctx, ox, oy, noEscopo) {
  ports.forEach(function (pt) {
    var pts = (routes[pt.id] || []).filter(function (k) { return cellEl[k] && noEscopo[cellEl[k].t.id]; }).map(function (k) {
      var e = cellEl[k], q = res(e.t);
      return [e.t.cx - ox + (e.c + 0.5) * q.cw, e.t.cy - oy + (e.r + 0.5) * q.ch, Math.min(q.cw, q.ch)];
    });
    if (!pts.length) return;
    ctx.strokeStyle = "#fff"; ctx.lineWidth = Math.max(3, pts[0][2] * 0.06); ctx.lineJoin = "round"; ctx.lineCap = "round";
    ctx.beginPath(); pts.forEach(function (a, i) { if (i) ctx.lineTo(a[0], a[1]); else ctx.moveTo(a[0], a[1]); }); ctx.stroke();
    var a0 = pts[0], rr = a0[2] * 0.24;
    ctx.fillStyle = pcolor(pt); ctx.beginPath(); ctx.arc(a0[0], a0[1], rr, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = Math.max(2, a0[2] * 0.02); ctx.stroke();
    ctx.fillStyle = "#fff"; ctx.font = "700 " + (a0[2] * 0.26) + "px " + DISP; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(String(pt.n), a0[0], a0[1]);
  });
}

// desenha o escopo inteiro em px reais; k reduz para a prévia
function desenhar(cv, k) {
  var items = itensDoEscopo(), b = bbox(items.map(function (i) { return i.t; }));
  cv.width = Math.max(1, Math.round(b.w * k)); cv.height = Math.max(1, Math.round(b.h * k));
  var ctx = cv.getContext("2d");
  ctx.setTransform(k, 0, 0, k, 0, 0);
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, b.w, b.h);
  var own = cfg.preset === "cabos" ? owners() : {}, noEscopo = {};
  items.forEach(function (it) { noEscopo[it.t.id] = 1; tela(ctx, it, b.x, b.y, own); });
  if (cfg.preset === "cabos") rotasDeCabo(ctx, b.x, b.y, noEscopo);
  return b;
}

function h(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }

function linhasRegioes() {
  var items = itensDoEscopo(), b = bbox(items.map(function (i) { return i.t; }));
  return { b: b, telas: items.map(function (it) { return { t: it.t, x: it.x - b.x, y: it.y - b.y, w: it.q.w, h: it.q.h }; }) };
}

export function renderComp() {
  var root = document.getElementById("n-root");
  if (!root) return;
  var sel = document.getElementById("n-escopo");
  var opts = [["", "Todos os painéis"]].concat(groups.filter(function (g) { return members(g.id).length; }).map(function (g) { return [g.id, gname(g)]; }));
  if (sel.options.length !== opts.length || opts.some(function (o, i) { return sel.options[i].value !== o[0] || sel.options[i].textContent !== o[1]; })) {
    sel.textContent = "";
    opts.forEach(function (o) { var e = document.createElement("option"); e.value = o[0]; e.textContent = o[1]; sel.appendChild(e); });
  }
  cfg = limpa(cfg);
  sel.value = cfg.escopo;
  document.getElementById("n-preset").value = cfg.preset;
  root.textContent = "";
  var cv = document.getElementById("n-cv"), stat = document.getElementById("n-stat");
  if (!tiles.length) { cv.hidden = true; stat.textContent = ""; root.appendChild(h("p", "empty", "Adicione painéis para montar a composição.")); return; }
  cv.hidden = false;

  var box = cv.parentNode, W = Math.max(200, box.clientWidth - 18), r = linhasRegioes(), b = r.b;
  var maxH = Math.max(160,Math.min(window.innerHeight * 0.55, 520));
  var k = Math.min(W / b.w, maxH / b.h), dpr = Math.min(2, window.devicePixelRatio || 1);
  desenhar(cv, k * dpr);
  cv.style.width = Math.round(b.w * k) + "px"; cv.style.height = Math.round(b.h * k) + "px";
  stat.textContent = nf(b.w) + " × " + nf(b.h) + " px · " + proporcao(b.w, b.h) + " · " + r.telas.length + (r.telas.length === 1 ? " painel" : " painéis");

  var c = h("div", "card");
  var hd = h("div", "ecab");
  hd.appendChild(h("h2", null, "Regiões"));
  hd.appendChild(h("span", "sb", "x e y a partir do canto de cima à esquerda da composição" + (b.x || b.y ? " (no canvas do processador ela começa em " + b.x + ", " + b.y + ")" : "") + "."));
  c.appendChild(hd);
  var tw = h("div", "tablewrap"), tb = h("table"), th = h("thead"), tr = h("tr");
  ["Painel", "Screen", "x", "y", "L × A (px)", "Proporção"].forEach(function (s, i) { tr.appendChild(h("th", i > 1 ? "r" : null, s)); });
  th.appendChild(tr); tb.appendChild(th);
  var bd = h("tbody");
  if (!cfg.escopo && groups.length) {
    groups.forEach(function (g) {
      var m = members(g.id); if (!m.length) return;
      var gb = bbox(m), l = h("tr", "grow");
      [gname(g), "screen", nf(gb.x - b.x), nf(gb.y - b.y), nf(gb.w) + " × " + nf(gb.h), proporcao(gb.w, gb.h)].forEach(function (s, i) { l.appendChild(h("td", i > 1 ? "r" : null, s)); });
      bd.appendChild(l);
    });
  }
  r.telas.forEach(function (x) {
    var g = x.t.grp ? groups.filter(function (o) { return o.id === x.t.grp; })[0] : null, l = h("tr");
    [x.t.id + " · " + x.t.name, g ? gname(g) : "—", nf(x.x), nf(x.y), nf(x.w) + " × " + nf(x.h), proporcao(x.w, x.h)].forEach(function (s, i) { l.appendChild(h("td", i > 1 ? "r" : null, s)); });
    bd.appendChild(l);
  });
  tb.appendChild(bd); tw.appendChild(tb); c.appendChild(tw);
  root.appendChild(c);
}

function nomeArq(ext) {
  var p = ((projetoAtivo() || {}).nome || "ledmap").replace(/[^\w\-]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
  var g = cfg.escopo ? groups.filter(function (o) { return o.id === cfg.escopo; })[0] : null;
  var s = g ? "-" + gname(g).replace(/[^\w\-]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() : "";
  return p + "-composicao" + s + "-" + cfg.preset + "." + ext;
}

function textoRegioes() {
  var r = linhasRegioes();
  return ["Composição " + r.b.w + "×" + r.b.h + " px (" + proporcao(r.b.w, r.b.h) + ")"].concat(r.telas.map(function (x) {
    return x.t.name + ": x " + x.x + " · y " + x.y + " · " + x.w + "×" + x.h;
  })).join("\n");
}

function csvRegioes() {
  var r = linhasRegioes(), rows = [["painel", "nome", "screen", "x_px", "y_px", "largura_px", "altura_px", "proporcao", "x_canvas_px", "y_canvas_px"]];
  r.telas.forEach(function (x) {
    var g = x.t.grp ? groups.filter(function (o) { return o.id === x.t.grp; })[0] : null;
    rows.push([x.t.id, x.t.name, g ? gname(g) : "", x.x, x.y, x.w, x.h, proporcao(x.w, x.h), x.t.cx, x.t.cy]);
  });
  return csv(rows);
}

export function init() {
  CSTORE = chave("comp");
  var sv = null;
  try { sv = JSON.parse(localStorage.getItem(CSTORE) || "null"); } catch (e) {}
  cfg = limpa(sv);
  var ps = document.getElementById("n-preset");
  Object.keys(PRESETS).forEach(function (k) { var o = document.createElement("option"); o.value = k; o.textContent = PRESETS[k]; ps.appendChild(o); });
  ps.value = cfg.preset;
  ps.addEventListener("change", function () { cfg.preset = limpa({ preset: ps.value }).preset; salvar(); renderComp(); });
  var es = document.getElementById("n-escopo");
  es.addEventListener("change", function () { cfg.escopo = limpa({ escopo: es.value }).escopo; salvar(); renderComp(); });
  document.getElementById("n-png").addEventListener("click", function () {
    if (!tiles.length) { pmsg("Adicione painéis antes de exportar."); return; }
    var cv = document.createElement("canvas");
    desenhar(cv, 1);
    cv.toBlob(function (bl) { if (!bl) { pmsg("Não consegui gerar a imagem."); return; } saveFile(nomeArq("png"), bl); }, "image/png");
  });
  document.getElementById("n-csv").addEventListener("click", function () {
    if (!tiles.length) { pmsg("Adicione painéis antes de exportar."); return; }
    saveFile(nomeArq("csv").replace("-" + cfg.preset, "-regioes"), csvRegioes());
  });
  document.getElementById("n-copy").addEventListener("click", function () {
    if (!tiles.length) { pmsg("Adicione painéis antes de copiar."); return; }
    var t = textoRegioes();
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { pmsg("Regiões copiadas."); }, function () { pmsg("Não consegui copiar."); });
    else pmsg("Copiar não está disponível neste navegador.");
  });
  var rt = null;
  window.addEventListener("resize", function () {
    if (document.body.getAttribute("data-aba") !== "n") return;
    clearTimeout(rt); rt = setTimeout(renderComp, 150);
  });
}
