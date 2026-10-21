import { histTick } from "./historico.js";
import { chave } from "./projetos.js";
import { GAB, cabDe, garantirGabs } from "./gabinetes.js";
import { limpaGiro, limpaPivo, limpaVista, chaveGiro, deslocQuadro, deVistaAntiga } from "./espaco.js";

let paineis = [];
// O Rig mostra o palco por uma de 4 vistas ortogonais (Frente, Topo, Esquerda, Direita: ver espaco.js).
// Cada painel tem posição (mx, my, recuo z) e giro (rx, ry, rz em graus, em volta do pivô pv).
let vistaM = "frente";

// Planos (cabeamento e composição): painéis com o mesmo giro ficam num mesmo plano; o plano sem giro é o 0.
// O número do plano é estável na sessão (só serve para separar planos, não é gravado).
var numPlanos = { "0|0|0": 0 }, proxPlano = 1;
export function planoDe(t) { var k = chaveGiro(t); if (!(k in numPlanos)) numPlanos[k] = proxPlano++; return numPlanos[k]; }

// posição do painel no quadro do plano dele: x à esquerda, y do topo (para baixo) e profundidade.
// Sem giro: o mesmo do Rig (mx, −(my + h), recuo). Planos diferentes nunca se encostam (o cabo entre eles conta como salto).
export function quadro(t) {
  var d = deslocQuadro(t);
  return { x: t.mx + d[0], y: -(t.my + d[1] + t.h), z: (t.z || 0) - d[2] + planoDe(t) * 1000 };
}
export function zCabo(t) { return quadro(t).z; }

// x e y (do chão) na imagem da Montagem (Composição): cada plano é desenhado de frente; os planos ficam lado a lado,
// na ordem, com 1 m entre eles; o plano sem giro não se mexe
export function mxMont(t) {
  var faixas = {}, desl = {}, cursor = null;
  tiles.forEach(function (o) { var k = planoDe(o), x = quadro(o).x, f = faixas[k] || (faixas[k] = { x0: Infinity, x1: -Infinity }); f.x0 = Math.min(f.x0, x); f.x1 = Math.max(f.x1, x + o.w); });
  Object.keys(faixas).map(Number).sort(function (a, b) { return a - b; }).forEach(function (k) {
    var f = faixas[k];
    desl[k] = cursor === null ? 0 : cursor - f.x0;
    cursor = f.x1 + desl[k] + 1;
  });
  return quadro(t).x + (desl[planoDe(t)] || 0);
}
export function myMont(t) { return -quadro(t).y - t.h; }

// Projetos de antes do giro tinham "vistas de montagem" (paredes, fundo, teto, piso): cada painel numa vista vira um
// painel com o giro dela, no mesmo lugar do palco. Recebe a lista crua (mx, my, w, h, z, pl) e devolve os ids convertidos.
export function migrarVistasAntigas(lista, vistasAntigas) {
  var porId = {}, feitos = {};
  (Array.isArray(vistasAntigas) ? vistasAntigas : []).forEach(function (v) { if (v && typeof v.id === "string") porId[v.id] = v; });
  lista.forEach(function (x) {
    if (!x || !x.pl) return;
    var v = porId[x.pl];
    if (v) {
      var n = deVistaAntiga({ mx: Number(x.mx) || 0, my: Number(x.my) || 0, w: Number(x.w) || 0, h: Number(x.h) || 0, z: Number(x.z) || 0 }, v);
      x.mx = r2(n.mx); x.my = r2(n.my); x.z = r2(n.z); x.rx = n.rx; x.ry = n.ry; x.rz = n.rz; x.pv = n.pv;
      feitos[x.id] = 1;
    }
    x.pl = "";
  });
  return feitos;
}
function r2(v) { return Math.round(v * 100) / 100; }
let NS, FLOOR, CW, CH, STORE, PITCH, EXTRA_MAX, EXTRAS, BASE, tiles, groups, nextG, active, groupMove, svgM, svgC, rowsEl, gM, gC, selected, i;


// Arredonda uma medida (m) para um número inteiro de gabinetes de lado m (0,5 a 30 m).
export function snapDim(v, m) {
    v = Number(v);
    if (!isFinite(v) || v <= 0) return null;
    var n = Math.max(1, Math.round(v / m));
    var r = Math.round(n * m * 1000) / 1000;
    return r > 30 ? null : r;
  }

export function mnum(v) {
    v = Number(v);
    return isFinite(v) && Math.abs(v) <= 300 ? Math.round(v * 100) / 100 : null;
  }

// posição (m) com centímetro: paredes e teto de projetos antigos ficam longe do centro e fora da grade de 0,5 m
function cm(v, lo, hi) { v = Number(v); return isFinite(v) && v >= lo && v <= hi ? Math.round(v * 100) / 100 : null; }

export function cleanExtra(x) {
    if (!x || typeof x !== "object") return null;
    var id = String(x.id == null ? "" : x.id);
    if (!/^\d{1,3}$/.test(id)) return null;
    var kind = Object.prototype.hasOwnProperty.call(PITCH, x.kind) ? x.kind : "imag";
    var g = GAB[String(x.cab)] || cabDe({ kind: kind }), cab = g.id, mx = cm(x.mx, -200, 200), my = cm(x.my, -50, 100);
    var w = snapDim(x.w, g.mw), h = snapDim(x.h, g.mh);
    if (w === null || h === null || mx === null || my === null) return null;
    var cx = Math.round(Number(x.cx)), cy = Math.round(Number(x.cy));
    if (!isFinite(cx) || !isFinite(cy) || Math.abs(cx) > 20000 || Math.abs(cy) > 20000) { cx = 0; cy = 0; }
    var nm = typeof x.name === "string" ? x.name.trim().slice(0, 40) : "";
    return { id: id, name: nm || ("Painel " + id), kind: kind, cab: cab, w: w, h: h, mx: mx, my: my, cx: cx, cy: cy, grp: typeof x.grp === "string" ? x.grp : "", pn: "", off: limpaOff(x.off), z: profundidade(x.z), rx: limpaGiro(x.rx), ry: limpaGiro(x.ry), rz: limpaGiro(x.rz), pv: limpaPivo(x.pv), extra: true };
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
    var q = res(t), kx = q.cw / q.mw, ky = q.ch / q.mh, minX = Infinity, maxTop = -Infinity;
    tiles.concat([t]).forEach(function (o) { minX = Math.min(minX, o.mx); maxTop = Math.max(maxTop, o.my + o.h); });
    var x = Math.round(((t.mx - minX) * kx) / 8) * 8;
    var y = Math.round(((maxTop - (t.my + t.h)) * ky) / 8) * 8;
    return { x: Math.min(Math.max(x, 0), CW - q.w), y: Math.min(Math.max(y, 0), CH - q.h) };
  }

// definição completa dos gabinetes usados por uma lista de painéis
export function gabsUsados(list) {
    var vistos = {}, out = [];
    list.forEach(function (t) { var g = cabDe(t); if (!vistos[g.id]) { vistos[g.id] = 1; out.push(Object.assign({}, g)); } });
    return out;
  }

// Recuo, giro e pivô mudam sem recarregar: são editados no painel (tiles) e copiados aqui para a definição (EXTRAS),
// que é o que vai para o armazenamento e o JSON. A posição mx/my vai em "mpos" pelo save().
// Quem muda esses campos chama gravarVivo antes do save (o save não copia sozinho: quando a lista de painéis é
// trocada inteira, os tiles antigos sobrescreveriam os novos de mesmo número).
export function gravarVivo(lista) {
    var porId = {};
    lista.forEach(function (t) { porId[t.id] = t; });
    EXTRAS.forEach(function (x) { var t = porId[x.id]; if (t) ["z", "rx", "ry", "rz", "pv"].forEach(function (k) { x[k] = t[k]; }); });
  }

export function save() {
    histTick();
    try {
      var pos = {}, tg = {}, mpos = {}, tp = {};
      tiles.forEach(function (t) { pos[t.id] = [t.cx, t.cy]; tg[t.id] = t.grp || ""; mpos[t.id] = [t.mx, t.my]; tp[t.id] = t.pn || ""; });
      localStorage.setItem(STORE, JSON.stringify({ pos: pos, tg: tg, mpos: mpos, tp: tp, groups: groups, nextG: nextG, paineis: paineis, vista: vistaM, extras: EXTRAS, gabs: gabsUsados(EXTRAS) }));
    } catch (e) {}
  }

// n = gabinetes que existem (a grade menos os recortados); total = pixels desses gabinetes
// Memoizado por objeto: res() é chamado dentro de laços por gabinete (cabeamento, exportações, 3D).
// O cache vale enquanto o gabinete (mesmo objeto e medidas), w, h e o array de recortes forem os mesmos;
// "off" é sempre trocado por um array novo (nunca alterado no lugar), então comparar a referência basta.
// O resultado é compartilhado: quem chama não pode alterá-lo.
var cacheRes = new WeakMap();
export function res(s) {
    var g = cabDe(s), m = cacheRes.get(s);
    if (m && m.g === g && m.rx === g.rx && m.ry === g.ry && m.mw === g.mw && m.mh === g.mh && m.w === s.w && m.h === s.h && m.off === s.off) return m.q;
    var q = calcRes(s, g);
    cacheRes.set(s, { g: g, rx: g.rx, ry: g.ry, mw: g.mw, mh: g.mh, w: s.w, h: s.h, off: s.off, q: q });
    return q;
  }

function calcRes(s, g) {
    var cols = Math.max(1, Math.round(s.w / g.mw)), rows = Math.max(1, Math.round(s.h / g.mh));
    var w = cols * g.rx, h = rows * g.ry, fora = {}, nf0 = 0;
    (Array.isArray(s.off) ? s.off : []).forEach(function (k) {
      var p = k.split(":"), c = +p[0], r = +p[1];
      if (c < cols && r < rows && !fora[k]) { fora[k] = 1; nf0++; }
    });
    var n = Math.max(0, cols * rows - nf0);
    return { cols: cols, rows: rows, cw: g.rx, ch: g.ry, mw: g.mw, mh: g.mh, u: Math.min(g.rx, g.ry), w: w, h: h, n: n, fora: fora, total: n * g.rx * g.ry };
  }

// o gabinete (coluna c, linha r, a partir de cima à esquerda) existe neste painel?
export function existe(q, c, r) { return !q.fora[c + ":" + r]; }

// profundidade do painel em metros: 0 = no plano da montagem; positivo = recuado (para trás); negativo = avançado
export function profundidade(v) { v = Number(v); return isFinite(v) && Math.abs(v) <= 200 ? Math.round(v * 100) / 100 : 0; }

// retângulos (m, y do chão para cima) dos gabinetes que existem num painel, no quadro do plano dele
export function gabinetesFisicos(t) {
    var q = res(t), f = quadro(t), y0 = -f.y - t.h, out = [];
    for (var r = 0; r < q.rows; r++) for (var c = 0; c < q.cols; c++) {
      if (q.fora[c + ":" + r]) continue;
      out.push({ x: f.x + c * q.mw, y: y0 + (q.rows - 1 - r) * q.mh, w: q.mw, h: q.mh });
    }
    return out;
  }

// dois painéis se sobrepõem de verdade se algum gabinete de um cai em cima de um gabinete do outro
// (um painel pode ocupar o recorte do outro: miolo recuado, janela, moldura com conteúdo atrás).
// Só se compara no mesmo plano (mesmo giro); a profundidade não entra, como antes.
export function sobrepoem(a, b) {
    var e = 0.001;
    if (planoDe(a) !== planoDe(b)) return false;
    var fa = quadro(a), fb = quadro(b);
    if (!(fa.x < fb.x + b.w - e && fb.x < fa.x + a.w - e && fa.y < fb.y + b.h - e && fb.y < fa.y + a.h - e)) return false;
    var gb = gabinetesFisicos(b);
    return gabinetesFisicos(a).some(function (p) {
      return gb.some(function (o) { return p.x < o.x + o.w - e && o.x < p.x + p.w - e && p.y < o.y + o.h - e && o.y < p.y + p.h - e; });
    });
  }

function limpaOff(l) {
    var out = [], seen = {};
    (Array.isArray(l) ? l : []).forEach(function (k) { if (typeof k === "string" && /^\d{1,3}:\d{1,3}$/.test(k) && !seen[k] && out.length < 4000) { seen[k] = 1; out.push(k); } });
    return out;
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

// Grupos de painel: telas (de gabinetes diferentes ou não) que formam uma peça física só no Rig.
export function limpaPaineis(l) {
    var out = [], seen = {};
    (Array.isArray(l) ? l : []).forEach(function (p) {
      if (p && typeof p.id === "string" && /^a\d{1,6}$/.test(p.id) && !seen[p.id]) { seen[p.id] = 1; out.push({ id: p.id, name: typeof p.name === "string" ? p.name.slice(0, 40) : "" }); }
    });
    return out;
  }

export function painelById(id) { for (var i = 0; i < paineis.length; i++) if (paineis[i].id === id) return paineis[i]; return null; }

// nome do grupo: o que o usuário deu, ou "Grupo N" pela ordem dos grupos (sem buracos)
export function pnome(p) {
    if ((p.name || "").trim()) return p.name.trim();
    var i = paineis.findIndex(function (x) { return x.id === p.id; });
    return "Grupo " + (i >= 0 ? i + 1 : paineis.length + 1);
  }

export function membrosPainel(id) { return id ? tiles.filter(function (t) { return t.pn === id; }) : []; }

export function novoPainel() {
    var n = 1;
    paineis.forEach(function (p) { n = Math.max(n, (parseInt(p.id.slice(1), 10) || 0) + 1); });
    var p = { id: "a" + n, name: "" };
    paineis.push(p);
    return p;
  }

// remove grupos sem tela (ou com uma só: grupo de uma tela não é grupo)
export function podarPaineis() {
    paineis = paineis.filter(function (p) {
      var m = membrosPainel(p.id);
      if (m.length < 2) { m.forEach(function (t) { t.pn = ""; }); return false; }
      return true;
    });
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
  STORE = chave("config");
  PITCH = { imag: { name: "P5.9", px: 84 }, up: { name: "P5.9", px: 84 }, c: { name: "P3.9", px: 128 } };
  EXTRA_MAX = 200;
  EXTRAS = [];
  var migrados = {};
  try {
      var s0 = JSON.parse(localStorage.getItem(STORE) || "null");
      if (s0) garantirGabs(s0.gabs);
      if (s0 && Array.isArray(s0.extras)) {
        // vistas de montagem antigas: o painel numa delas é convertido com a posição final dele (mpos), que vai para a
        // definição. Só esses: nos outros a definição fica como está (ela é comparada com o JSON ao importar).
        var crus = s0.extras.map(function (x) {
          var mp = s0.mpos && x && x.pl && s0.mpos[x.id];
          return Array.isArray(mp) && mnum(mp[0]) !== null && mnum(mp[1]) !== null ? Object.assign({}, x, { mx: mnum(mp[0]), my: mnum(mp[1]) }) : x;
        });
        migrados = migrarVistasAntigas(crus, s0.planos);
        EXTRAS = cleanExtras(crus);
      }
    } catch (e) {}
  BASE = EXTRAS.map(function (x) { return Object.assign({}, x); }); // cópia: recuo e giro mudam em EXTRAS sem recarregar, e "Restaurar" volta a este
  tiles = BASE.map(function (s) { return Object.assign({}, s); });
  groups = [];
  nextG = 1;
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
          if (!migrados[t.id] && Array.isArray(mp) && mnum(mp[0]) !== null && mnum(mp[1]) !== null) { t.mx = mnum(mp[0]); t.my = mnum(mp[1]); }
          var sp = saved.pos && saved.pos[t.id];
          if (sp) { t.cx = saved.pos[t.id][0]; t.cy = saved.pos[t.id][1]; }
          if (saved.tg && Object.prototype.hasOwnProperty.call(saved.tg, t.id)) t.grp = saved.tg[t.id] || "";
          if (saved.tp && typeof saved.tp[t.id] === "string") t.pn = saved.tp[t.id];
        });
        paineis = limpaPaineis(saved.paineis);
        vistaM = limpaVista(saved.vista); // ids de vistas de montagem antigas ("v1"…) voltam para a Frente
      }
    } catch (e) {}
  tiles.forEach(function (t) { if (t.pn && !painelById(t.pn)) t.pn = ""; });
  podarPaineis();
  tiles.forEach(function (t) {
      if (t.grp && !groups.some(function (g) { return g.id === t.grp; })) t.grp = "";
    });
  svgM = document.getElementById("svg-m");
  svgC = document.getElementById("svg-c");
  rowsEl = document.getElementById("rows");
  gM = {};
  gC = {};
  selected = null;
  if (Object.keys(migrados).length) save(); // grava já no formato novo (sem as vistas antigas)
}

export { tiles, FLOOR, svgM, gM, selected, svgC, CW, CH, gC, rowsEl, groups, PITCH, active, nextG, groupMove, BASE, EXTRAS, STORE, EXTRA_MAX, paineis };
export function set_paineis(v) { paineis = v; return v; }
export { vistaM };
export function set_vistaM(v) { vistaM = limpaVista(v); return vistaM; }
export function set_selected(v) { selected = v; return v; }
export function set_active(v) { active = v; return v; }
export function set_nextG(v) { nextG = v; return v; }
export function set_groupMove(v) { groupMove = v; return v; }
export function set_groups(v) { groups = v; return v; }
export function set_EXTRAS(v) { EXTRAS = v; return v; }
