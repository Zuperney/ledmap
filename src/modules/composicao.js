// Composição: os dois lados do mapeamento, como a entrada e a saída do Resolume.
//   Montagem (entrada): os painéis nas posições do Rig, numa escala única (px por metro) — onde o conteúdo é feito.
//   Composição (saída): os painéis nas posições da aba Screen, em px nativos — o que vai para o processador.
// Não tem posição própria: test card por painel, regiões das duas pontas e proporção.
import { tiles, groups, gname, members, res, nf, fmt, painelById, pnome } from "./core.js";
import { chave, projetoAtivo } from "./projetos.js";
import { cabDe } from "./gabinetes.js";
import { ports, routes, cellEl, owners, pcolor, portById } from "./cabeamento.js";
import { saveFile, csv, pmsg } from "./exportar.js";
import { histTick } from "./historico.js";

var CSTORE, cfg = { preset: "mapa", escopo: "", modo: "comp", cores: {} };
var MONO = "IBM Plex Mono, ui-monospace, Menlo, Consolas, monospace";
var DISP = "Barlow Condensed, Arial Narrow, sans-serif";

export var PRESETS = {
  mapa: "Mapa de gabinetes",
  cores: "Cor por painel",
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
  var cores = {};
  if (c.cores && typeof c.cores === "object") Object.keys(c.cores).forEach(function (k) { if (/^[pa]:[\w-]{1,12}$/.test(k) && /^#[0-9a-f]{6}$/i.test(c.cores[k])) cores[k] = c.cores[k].toLowerCase(); });
  return { preset: PRESETS[c.preset] ? c.preset : "mapa", escopo: esc, modo: c.modo === "mont" ? "mont" : "comp", cores: cores };
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

// escala da montagem: a maior densidade entre os painéis (px por metro), para nenhum painel perder resolução
function escalaMont() {
  var s = 0;
  tiles.forEach(function (t) { var q = res(t); s = Math.max(s, q.cw / q.mw, q.ch / q.mh); });
  return s || 1;
}

// retângulos de um painel: entrada (montagem, escala única, y do topo) e saída (canvas do Screen, px nativos)
function geo(t, S, minX, topo) {
  var q = res(t);
  return {
    ent: { x: Math.round((t.mx - minX) * S), y: Math.round((topo - t.my - t.h) * S), w: Math.round(q.cols * q.mw * S), h: Math.round(q.rows * q.mh * S) },
    sai: { x: t.cx, y: t.cy, w: q.w, h: q.h }
  };
}

function itensDoEscopo() {
  var list = cfg.escopo ? members(cfg.escopo) : tiles.slice(), S = escalaMont(), minX = Infinity, topo = -Infinity;
  tiles.forEach(function (t) { minX = Math.min(minX, t.mx); topo = Math.max(topo, t.my + t.h); });
  return list.map(function (t) {
    var q = res(t), g = geo(t, S, minX, topo), r = cfg.modo === "mont" ? g.ent : g.sai;
    return { t: t, q: q, ent: g.ent, sai: g.sai, x: r.x, y: r.y, w: r.w, h: r.h, sx: r.w / q.w, sy: r.h / q.h };
  });
}

function caixa(rs) {
  var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  rs.forEach(function (r) { x0 = Math.min(x0, r.x); y0 = Math.min(y0, r.y); x1 = Math.max(x1, r.x + r.w); y1 = Math.max(y1, r.y + r.h); });
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

// ---- cor por painel: a mesma na entrada e na saída; painéis agrupados usam a cor do grupo ----
var PALETA = ["#e6194b", "#3cb44b", "#4363d8", "#f58231", "#911eb4", "#42d4f4", "#f032e6", "#bfef45", "#ffe119", "#469990", "#9a6324", "#800000", "#000075", "#808000", "#fabed4", "#dcbeff"];

function chaveCor(t) { return t.pn && painelById(t.pn) ? "a:" + t.pn : "p:" + t.id; }

export function corDe(t) {
  var k = chaveCor(t);
  if (cfg.cores[k]) return cfg.cores[k];
  var n = parseInt(k.slice(3), 10) || 0, base = k.charAt(0) === "a" ? 7 : 0;
  return PALETA[(n - 1 + base + PALETA.length * 4) % PALETA.length];
}

function tom(hex, f) {
  var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  var m = function (v) { return Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f); };
  return "rgb(" + m(r) + "," + m(g) + "," + m(b) + ")";
}

// rótulo grande no centro, com contorno escuro para ler sobre qualquer cor
function rotulo(ctx, linhas, x, y, w, h) {
  ctx.font = "700 100px " + DISP;
  var larg = Math.max.apply(null, linhas.map(function (l, i) { return ctx.measureText(l).width * (i ? 0.5 : 1); }));
  var fat = linhas.map(function (_, i) { return i ? 0.5 : 1; }), soma = fat.reduce(function (a, v) { return a + v * 1.15; }, 0);
  var fs = Math.min(100 * w * 0.85 / larg, h * 0.7 / soma);
  if (fs < 6) return;
  ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
  var cur = y + (h - fs * soma) / 2;
  linhas.forEach(function (l, i) {
    var s = fs * fat[i], cy = cur + s * 1.15 / 2;
    cur += s * 1.15;
    ctx.font = "700 " + s + "px " + DISP;
    ctx.lineWidth = s * 0.14; ctx.strokeStyle = "rgba(0,0,0,0.85)"; ctx.strokeText(l, x + w / 2, cy);
    ctx.fillStyle = "#fff"; ctx.fillText(l, x + w / 2, cy);
  });
}

function textOn(hex) {
  var r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? "#111" : "#fff";
}

// caixa de informações: a maior fonte que cabe, com teto para não dominar telas grandes
function infoBox(ctx, it, x, y) {
  var t = it.t, q = it.q, g = cabDe(t);
  caixaInfo(ctx, [t.name, q.w + " × " + q.h + " px", q.cols + " × " + q.rows + " = " + (q.cols * q.rows) + " gab.", fmt(t.w) + " × " + fmt(t.h) + " m · pitch " + fmt(g.mw / g.rx * 1000) + " mm"], x, y, q.w, q.h);
}

function caixaInfo(ctx, linhas, x, y, w, h) {
  var q = { w: w, h: h };
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

// semSobre: o painel faz parte de um grupo que vira uma imagem só; barras, geometria e info vão sobre o grupo
function tela(ctx, it, ox, oy, own, semSobre) {
  var t = it.t, q = it.q, x = 0, y = 0, p = cfg.preset, r, c, n = 1;
  ctx.save();
  ctx.translate(it.x - ox, it.y - oy); ctx.scale(it.sx, it.sy);
  ctx.beginPath(); ctx.rect(x, y, q.w, q.h); ctx.clip();
  for (r = 0; r < q.rows; r++) {
    for (c = 0; c < q.cols; c++) {
      var cx = x + c * q.cw, cy = y + r * q.ch, cor;
      if (p === "branco") cor = "#ffffff";
      else if (p === "barras" || p === "alinhamento") cor = p === "barras" ? "#000000" : CORES[(r + c) % 2 ? 3 : 0];
      else if (p === "cabos") { var o = own[t.id + ":" + c + ":" + r]; cor = o ? pcolor(portById(o.pid)) : "#2a2a2a"; }
      else if (p === "cores") cor = tom(corDe(t), (r + c) % 2 ? -0.28 : 0);
      else cor = CORES[(r * q.cols + c) % CORES.length];
      ctx.fillStyle = cor; ctx.fillRect(cx, cy, q.cw, q.ch);
      if (p === "branco" || p === "barras") continue;
      ctx.strokeStyle = "rgba(0,0,0,0.55)"; ctx.lineWidth = Math.max(1, q.cw * 0.02); ctx.strokeRect(cx, cy, q.cw, q.ch);
      if (p === "cabos" && o) {
        // ordem do gabinete no cabo, como na aba Cabeamento (a linha da rota passa pelo centro)
        ctx.font = "700 " + (q.ch * 0.3) + "px " + MONO; ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.lineJoin = "round";
        ctx.lineWidth = q.ch * 0.06; ctx.strokeStyle = "rgba(0,0,0,0.8)"; ctx.strokeText(String(o.i + 1), cx + q.cw * 0.08, cy + q.ch * 0.06);
        ctx.fillStyle = "#fff"; ctx.fillText(String(o.i + 1), cx + q.cw * 0.08, cy + q.ch * 0.06);
      }
      if (p === "mapa") {
        ctx.fillStyle = cor.charAt(0) === "#" ? textOn(cor) : "#fff";
        ctx.font = "700 " + (q.ch * 0.26) + "px " + MONO; ctx.textAlign = "left"; ctx.textBaseline = "top";
        ctx.fillText(String(n), cx + q.cw * 0.08, cy + q.ch * 0.06);
      }
      n++;
    }
  }
  if (!semSobre) {
    if (p === "barras") barras(ctx, x, y, q.w, q.h);
    if (p === "alinhamento") geometria(ctx, x, y, q.w, q.h);
    if (p === "mapa") infoBox(ctx, it, x, y);
    if (p === "cores") rotulo(ctx, t.pn && painelById(t.pn) ? [t.name, pnome(painelById(t.pn))] : [t.name], x, y, q.w, q.h);
  }
  ctx.restore();
}

function barras(ctx, x, y, w, h) { var bh = h * 0.2, bw = w / BARRAS.length; BARRAS.forEach(function (col, i) { ctx.fillStyle = col; ctx.fillRect(x + i * bw, y + (h - bh) / 2, bw + 0.5, bh); }); }

// na Montagem, cada grupo de painéis (com 2 ou mais no escopo) é uma imagem só
function unidades(items) {
  if (cfg.modo !== "mont") return [];
  var por = {}, out = [];
  items.forEach(function (it) { var pn = it.t.pn; if (pn && painelById(pn)) (por[pn] = por[pn] || []).push(it); });
  Object.keys(por).forEach(function (pn) {
    if (por[pn].length < 2) return;
    var gabs = {}, n = 0, x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    por[pn].forEach(function (it) { gabs[it.t.cab] = 1; n += it.q.cols * it.q.rows; x0 = Math.min(x0, it.t.mx); x1 = Math.max(x1, it.t.mx + it.t.w); y0 = Math.min(y0, it.t.my); y1 = Math.max(y1, it.t.my + it.t.h); });
    out.push({ p: painelById(pn), items: por[pn], r: caixa(por[pn].map(function (it) { return it.ent; })), gab: n, tipos: Object.keys(gabs).length, mw: x1 - x0, mh: y1 - y0 });
  });
  return out;
}

function sobreGrupo(ctx, u, ox, oy) {
  var x = u.r.x - ox, y = u.r.y - oy, w = u.r.w, h = u.r.h, p = cfg.preset;
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  if (p === "barras") barras(ctx, x, y, w, h);
  if (p === "alinhamento") geometria(ctx, x, y, w, h);
  if (p === "cores") rotulo(ctx, [pnome(u.p), u.items.map(function (it) { return it.t.name; }).join(" + ")], x, y, w, h);
  if (p === "mapa") caixaInfo(ctx, [pnome(u.p), nf(w) + " × " + nf(h) + " px", u.items.length + " painéis · " + u.gab + " gab.", fmt(u.mw) + " × " + fmt(u.mh) + " m · " + u.tipos + (u.tipos === 1 ? " gabinete" : " gabinetes")], x, y, w, h);
  ctx.restore();
}

function rotasDeCabo(ctx, ox, oy, noEscopo) {
  ports.forEach(function (pt) {
    var pts = (routes[pt.id] || []).filter(function (k) { return cellEl[k] && noEscopo[cellEl[k].t.id]; }).map(function (k) {
      var e = cellEl[k], it = noEscopo[e.t.id], q = it.q;
      return [it.x - ox + (e.c + 0.5) * q.cw * it.sx, it.y - oy + (e.r + 0.5) * q.ch * it.sy, Math.min(q.cw * it.sx, q.ch * it.sy)];
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
  var items = itensDoEscopo(), b = caixa(items);
  cv.width = Math.max(1, Math.round(b.w * k)); cv.height = Math.max(1, Math.round(b.h * k));
  var ctx = cv.getContext("2d");
  ctx.setTransform(k, 0, 0, k, 0, 0);
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, b.w, b.h);
  var own = cfg.preset === "cabos" ? owners() : {}, noEscopo = {}, us = unidades(items), emGrupo = {};
  us.forEach(function (u) { u.items.forEach(function (it) { emGrupo[it.t.id] = 1; }); });
  items.forEach(function (it) { noEscopo[it.t.id] = it; tela(ctx, it, b.x, b.y, own, !!emGrupo[it.t.id]); });
  us.forEach(function (u) { sobreGrupo(ctx, u, b.x, b.y); });
  if (cfg.preset === "cabos") rotasDeCabo(ctx, b.x, b.y, noEscopo);
  return b;
}

function h(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }

// regiões relativas ao canto de cima à esquerda de cada ponta (entrada e saída)
function linhasRegioes() {
  var items = itensDoEscopo(), be = caixa(items.map(function (i) { return i.ent; })), bs = caixa(items.map(function (i) { return i.sai; }));
  var b = cfg.modo === "mont" ? be : bs;
  return { b: b, be: be, bs: bs, items: items, telas: items.map(function (it) {
    return { t: it.t, x: it.x - b.x, y: it.y - b.y, w: it.w, h: it.h,
      ent: { x: it.ent.x - be.x, y: it.ent.y - be.y, w: it.ent.w, h: it.ent.h }, sai: { x: it.sai.x - bs.x, y: it.sai.y - bs.y, w: it.sai.w, h: it.sai.h } };
  }) };
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
  var mont = cfg.modo === "mont";
  document.getElementById("n-m-mont").setAttribute("aria-pressed", String(mont));
  document.getElementById("n-m-comp").setAttribute("aria-pressed", String(!mont));
  root.textContent = "";
  var cv = document.getElementById("n-cv"), stat = document.getElementById("n-stat");
  if (!tiles.length) { cv.hidden = true; stat.textContent = ""; root.appendChild(h("p", "empty", "Adicione painéis para montar a composição.")); return; }
  cv.hidden = false;

  var box = cv.parentNode, W = Math.max(200, box.clientWidth - 18), r = linhasRegioes(), b = r.b;
  var maxH = Math.max(160,Math.min(window.innerHeight * 0.55, 520));
  var k = Math.min(W / b.w, maxH / b.h), dpr = Math.min(2, window.devicePixelRatio || 1);
  desenhar(cv, k * dpr);
  cv.style.width = Math.round(b.w * k) + "px"; cv.style.height = Math.round(b.h * k) + "px";
  stat.textContent = (mont ? "Entrada · " : "Saída · ") + nf(b.w) + " × " + nf(b.h) + " px · " + proporcao(b.w, b.h) + " · " + r.telas.length + (r.telas.length === 1 ? " painel" : " painéis") + (mont ? " · " + fmt(Math.round(escalaMont() * 10) / 10) + " px/m" : "");

  var c = h("div", "card");
  var hd = h("div", "ecab");
  hd.appendChild(h("h2", null, mont ? "Regiões na montagem (entrada)" : "Regiões na composição (saída)"));
  hd.appendChild(h("span", "sb", mont
    ? "Canvas do conteúdo: os painéis como o público vê, todos na mesma escala (" + fmt(Math.round(escalaMont() * 10) / 10) + " px por metro, a maior densidade do projeto). x e y a partir do canto de cima à esquerda. Saída mostra para onde cada região vai."
    : "Canvas do processador: as posições da aba Screen, em px nativos. x e y a partir do canto de cima à esquerda" + (b.x || b.y ? " (no canvas do processador ela começa em " + b.x + ", " + b.y + ")" : "") + "."));
  c.appendChild(hd);
  var tw = h("div", "tablewrap"), tb = h("table"), th = h("thead"), tr = h("tr");
  tr.appendChild(h("th", null, "Cor"));
  ["Painel", "Screen", "x", "y", "L × A (px)", "Proporção", mont ? "Saída (x, y · L × A)" : "Entrada (x, y · L × A)"].forEach(function (s, i) { tr.appendChild(h("th", i > 1 ? "r" : null, s)); });
  th.appendChild(tr); tb.appendChild(th);
  var bd = h("tbody");
  // amostra de cor: toque para trocar (painel agrupado troca a cor do grupo todo)
  function amostra(l, t) {
    var td = h("td", "ncor");
    if (t) {
      var inp = document.createElement("input");
      inp.type = "color"; inp.value = corDe(t);
      inp.setAttribute("aria-label", "Cor de " + (t.pn && painelById(t.pn) ? pnome(painelById(t.pn)) : t.name));
      inp.addEventListener("change", function () { cfg.cores[chaveCor(t)] = inp.value.toLowerCase(); salvar(); renderComp(); });
      td.appendChild(inp);
    }
    l.appendChild(td);
    return l;
  }
  if (!cfg.escopo && groups.length) {
    groups.forEach(function (g) {
      var m = r.items.filter(function (it) { return it.t.grp === g.id; }); if (!m.length) return;
      var gb = caixa(m), go = caixa(m.map(function (it) { return mont ? it.sai : it.ent; })), bo = mont ? r.bs : r.be, l = amostra(h("tr", "grow"), null);
      [gname(g), "screen", nf(gb.x - b.x), nf(gb.y - b.y), nf(gb.w) + " × " + nf(gb.h), proporcao(gb.w, gb.h), nf(go.x - bo.x) + ", " + nf(go.y - bo.y) + " · " + nf(go.w) + " × " + nf(go.h)].forEach(function (s, i) { l.appendChild(h("td", i > 1 ? "r" : null, s)); });
      bd.appendChild(l);
    });
  }
  // grupos de painel: na Montagem cada um é uma imagem só (uma região de entrada); os painéis dele seguem embaixo
  unidades(r.items).forEach(function (u) {
    var l = amostra(h("tr", "grow"), u.items[0].t);
    [pnome(u.p), "grupo", nf(u.r.x - b.x), nf(u.r.y - b.y), nf(u.r.w) + " × " + nf(u.r.h), proporcao(u.r.w, u.r.h), "painéis " + u.items.map(function (it) { return it.t.id; }).join(", ")].forEach(function (s, i) { l.appendChild(h("td", i > 1 ? "r" : null, s)); });
    bd.appendChild(l);
  });
  r.telas.forEach(function (x) {
    var g = x.t.grp ? groups.filter(function (o) { return o.id === x.t.grp; })[0] : null, l = amostra(h("tr"), x.t), o = mont ? x.sai : x.ent;
    [x.t.id + " · " + x.t.name, g ? gname(g) : "—", nf(x.x), nf(x.y), nf(x.w) + " × " + nf(x.h), proporcao(x.w, x.h), nf(o.x) + ", " + nf(o.y) + " · " + nf(o.w) + " × " + nf(o.h)].forEach(function (s, i) { l.appendChild(h("td", i > 1 ? "r" : null, s)); });
    bd.appendChild(l);
  });
  tb.appendChild(bd); tw.appendChild(tb); c.appendChild(tw);
  if (Object.keys(cfg.cores).length) {
    var rc = h("button", "btn lnk", "Voltar às cores automáticas");
    rc.type = "button";
    rc.addEventListener("click", function () { cfg.cores = {}; salvar(); renderComp(); });
    c.appendChild(rc);
  }
  root.appendChild(c);
}

function nomeArq(ext) {
  var p = ((projetoAtivo() || {}).nome || "ledmap").replace(/[^\w\-]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
  var g = cfg.escopo ? groups.filter(function (o) { return o.id === cfg.escopo; })[0] : null;
  var s = g ? "-" + gname(g).replace(/[^\w\-]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() : "";
  return p + (cfg.modo === "mont" ? "-montagem" : "-composicao") + s + "-" + cfg.preset + "." + ext;
}

// as duas pontas de cada região, como uma fatia do Resolume: entrada (conteúdo) → saída (processador)
function textoRegioes() {
  var r = linhasRegioes(), modo = cfg.modo;
  cfg.modo = "mont"; var us = unidades(r.items); cfg.modo = modo;
  return ["Entrada (montagem) " + r.be.w + "×" + r.be.h + " px · Saída (composição) " + r.bs.w + "×" + r.bs.h + " px"].concat(us.map(function (u) {
    return pnome(u.p) + " (imagem única na entrada): x " + (u.r.x - r.be.x) + " · y " + (u.r.y - r.be.y) + " · " + u.r.w + "×" + u.r.h + " · painéis " + u.items.map(function (it) { return it.t.id; }).join(", ");
  }), r.telas.map(function (x) {
    return x.t.name + ": entrada x " + x.ent.x + " · y " + x.ent.y + " · " + x.ent.w + "×" + x.ent.h + "  →  saída x " + x.sai.x + " · y " + x.sai.y + " · " + x.sai.w + "×" + x.sai.h;
  })).join("\n");
}

function csvRegioes() {
  var r = linhasRegioes(), rows = [["painel", "nome", "screen", "grupo", "entrada_x_px", "entrada_y_px", "entrada_largura_px", "entrada_altura_px", "saida_x_px", "saida_y_px", "saida_largura_px", "saida_altura_px", "proporcao", "x_canvas_px", "y_canvas_px"]];
  r.telas.forEach(function (x) {
    var g = x.t.grp ? groups.filter(function (o) { return o.id === x.t.grp; })[0] : null;
    var pg = x.t.pn && painelById(x.t.pn);
    rows.push([x.t.id, x.t.name, g ? gname(g) : "", pg ? pnome(pg) : "", x.ent.x, x.ent.y, x.ent.w, x.ent.h, x.sai.x, x.sai.y, x.sai.w, x.sai.h, proporcao(x.sai.w, x.sai.h), x.t.cx, x.t.cy]);
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
  [["n-m-mont", "mont"], ["n-m-comp", "comp"]].forEach(function (m) {
    document.getElementById(m[0]).addEventListener("click", function () { if (cfg.modo !== m[1]) { cfg.modo = m[1]; salvar(); renderComp(); } });
  });
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
