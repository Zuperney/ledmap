import { histTick } from "./historico.js";
import { chave } from "./projetos.js";
import { GAB, CAB_PADRAO, cabDe } from "./gabinetes.js";

let paineis = [];
let NS, FLOOR, CW, CH, STORE, PITCH, EXTRA_MAX, EXTRAS, BASE, tiles, groups, nextG, active, groupMove, svgM, svgC, rowsEl, gM, gC, selected, i;

function half(v, lo, hi) {
    v = Number(v);
    if (!isFinite(v)) return null;
    v = Math.round(v * 2) / 2;
    return v < lo || v > hi ? null : v;
  }

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
    return isFinite(v) && Math.abs(v) <= 100 ? Math.round(v * 100) / 100 : null;
  }

export function cleanExtra(x) {
    if (!x || typeof x !== "object") return null;
    var id = String(x.id == null ? "" : x.id);
    if (!/^\d{1,3}$/.test(id)) return null;
    var kind = Object.prototype.hasOwnProperty.call(PITCH, x.kind) ? x.kind : "imag";
    var cab = GAB[String(x.cab)] ? String(x.cab) : CAB_PADRAO[kind];
    var g = GAB[cab], mx = half(x.mx, -30, 60), my = half(x.my, -10, 30);
    var w = snapDim(x.w, g.mw), h = snapDim(x.h, g.mh);
    if (w === null || h === null || mx === null || my === null) return null;
    var cx = Math.round(Number(x.cx)), cy = Math.round(Number(x.cy));
    if (!isFinite(cx) || !isFinite(cy) || Math.abs(cx) > 20000 || Math.abs(cy) > 20000) { cx = 0; cy = 0; }
    var nm = typeof x.name === "string" ? x.name.trim().slice(0, 40) : "";
    return { id: id, name: nm || ("Painel " + id), kind: kind, cab: cab, w: w, h: h, mx: mx, my: my, cx: cx, cy: cy, grp: typeof x.grp === "string" ? x.grp : "", pn: "", extra: true };
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

export function save() {
    histTick();
    try {
      var pos = {}, tg = {}, mpos = {}, tp = {};
      tiles.forEach(function (t) { pos[t.id] = [t.cx, t.cy]; tg[t.id] = t.grp || ""; mpos[t.id] = [t.mx, t.my]; tp[t.id] = t.pn || ""; });
      localStorage.setItem(STORE, JSON.stringify({ pos: pos, tg: tg, mpos: mpos, tp: tp, groups: groups, nextG: nextG, paineis: paineis, extras: EXTRAS }));
    } catch (e) {}
  }

export function res(s) {
    var g = cabDe(s), cols = Math.max(1, Math.round(s.w / g.mw)), rows = Math.max(1, Math.round(s.h / g.mh));
    var w = cols * g.rx, h = rows * g.ry;
    return { cols: cols, rows: rows, cw: g.rx, ch: g.ry, mw: g.mw, mh: g.mh, u: Math.min(g.rx, g.ry), w: w, h: h, total: w * h };
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

export function pnome(p) { return (p.name || "").trim() || "Grupo " + p.id.slice(1); }

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
  try {
      var s0 = JSON.parse(localStorage.getItem(STORE) || "null");
      if (s0 && Array.isArray(s0.extras)) EXTRAS = cleanExtras(s0.extras);
    } catch (e) {}
  BASE = EXTRAS.slice();
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
          if (Array.isArray(mp) && mnum(mp[0]) !== null && mnum(mp[1]) !== null) { t.mx = mnum(mp[0]); t.my = mnum(mp[1]); }
          var sp = saved.pos && saved.pos[t.id];
          if (sp) { t.cx = saved.pos[t.id][0]; t.cy = saved.pos[t.id][1]; }
          if (saved.tg && Object.prototype.hasOwnProperty.call(saved.tg, t.id)) t.grp = saved.tg[t.id] || "";
          if (saved.tp && typeof saved.tp[t.id] === "string") t.pn = saved.tp[t.id];
        });
        paineis = limpaPaineis(saved.paineis);
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
}

export { tiles, FLOOR, svgM, gM, selected, svgC, CW, CH, gC, rowsEl, groups, PITCH, active, nextG, groupMove, BASE, EXTRAS, STORE, EXTRA_MAX, paineis };
export function set_paineis(v) { paineis = v; return v; }
export function set_selected(v) { selected = v; return v; }
export function set_active(v) { active = v; return v; }
export function set_nextG(v) { nextG = v; return v; }
export function set_groupMove(v) { groupMove = v; return v; }
export function set_groups(v) { groups = v; return v; }
export function set_EXTRAS(v) { EXTRAS = v; return v; }
