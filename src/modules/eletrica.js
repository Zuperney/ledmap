import { tiles, groups, gname, res, nf, fmt } from "./core.js";
import { chave } from "./projetos.js";
import { cabDe, cabNome } from "./gabinetes.js";
import { cellEl, ports, routes, autoState, pname } from "./cabeamento.js";
import { snakePorTela } from "./auto-cabos.js";
import { VOLT, voltNome, phaseOf, phaseBalance, acTone, ampCab, typicalPerTile, dividirPorAmp } from "./eletrica-calc.js";
import { saveFile, csv, pmsg } from "./exportar.js";
import { histTick } from "./historico.js";

var ESTORE, cfg = { vk: "220_tri", brilho: 70, conteudo: 33, margem: 80 };
var PADRAO = { vk: "220_tri", brilho: 70, conteudo: 33, margem: 80 };

function limpa(c) {
  c = c && typeof c === "object" ? c : {};
  var n = function (v, lo, hi, d) { v = Number(v); return isFinite(v) && v >= lo && v <= hi ? Math.round(v) : d; };
  return { vk: VOLT[c.vk] ? c.vk : PADRAO.vk, brilho: n(c.brilho, 0, 100, PADRAO.brilho), conteudo: n(c.conteudo, 0, 100, PADRAO.conteudo), margem: n(c.margem, 50, 100, PADRAO.margem) };
}

export function eletricaState() { return cfg; }
export function loadEletrica(c) { cfg = limpa(c); try { localStorage.setItem(ESTORE, JSON.stringify(cfg)); } catch (e) {} }

function salvar() { histTick(); try { localStorage.setItem(ESTORE, JSON.stringify(cfg)); } catch (e) {} }

function celula(key) { var c = cellEl[key]; return { key: key, t: c.t, c: c.c, r: c.r }; }

// cabos de energia de uma Screen: acompanham as portas de sinal; o que não tem porta segue a serpentina padrão
function cabosDaScreen(grp) {
  var vc = VOLT[cfg.vk], m = cfg.margem / 100, usadas = {}, seqs = [];
  ports.forEach(function (p) {
    var ks = (routes[p.id] || []).filter(function (k) { return cellEl[k] && (cellEl[k].t.grp || "") === grp; });
    ks.forEach(function (k) { usadas[k] = 1; });
    if (ks.length) seqs.push(ks.map(celula));
  });
  var sobras = [];
  Object.keys(cellEl).forEach(function (k) { if (!usadas[k] && (cellEl[k].t.grp || "") === grp) { var c = celula(k), q = res(c.t); c.x = c.t.cx + c.c * q.cw; c.y = c.t.cy + c.r * q.ch; sobras.push(c); } });
  if (sobras.length) {
    var por = {};
    sobras.forEach(function (c) { var id = cabDe(c.t).id; (por[id] = por[id] || []).push(c); });
    Object.keys(por).forEach(function (id) { seqs.push(snakePorTela(por[id], autoState().routing, autoState().corner)); });
  }
  var cabos = [];
  seqs.forEach(function (seq) {
    var g0 = cabDe(seq[0].t), lim = g0.amp * m;
    seq.forEach(function (c) { c.a = ampCab(cabDe(c.t)); });
    dividirPorAmp(seq, lim).forEach(function (seg) {
      var A = seg.reduce(function (a, c) { return a + c.a; }, 0), n = cabos.length + 1;
      var rating = Math.min.apply(null, seg.map(function (c) { return cabDe(c.t).amp; }));
      cabos.push({ n: n, fase: phaseOf(n, vc), cells: seg, A: A, rating: rating, pct: A / rating * 100, conector: cabDe(seg[0].t).conector, telas: seg.map(function (c) { return c.t.id; }).filter(function (v, i, a) { return a.indexOf(v) === i; }) });
    });
  });
  return cabos;
}

export function calcular() {
  var vc = VOLT[cfg.vk], out = [], tot = { W: 0, S: 0, tS: 0, gab: 0 };
  var chaves = groups.map(function (g) { return { id: g.id, nome: gname(g) }; }).concat([{ id: "", nome: "Sem screen" }]);
  chaves.forEach(function (ch) {
    var ts = tiles.filter(function (t) { return (t.grp || "") === ch.id; });
    if (!ts.length) return;
    var W = 0, S = 0, tS = 0, gab = 0;
    ts.forEach(function (t) {
      var q = res(t), g = cabDe(t), n = q.n;
      gab += n; W += n * g.pw; S += n * g.pw / g.fp; tS += n * typicalPerTile(g.pw, g.pb, cfg.brilho / 100, cfg.conteudo / 100) / g.fp;
    });
    var cabos = cabosDaScreen(ch.id);
    out.push({ id: ch.id, nome: ch.nome, telas: ts.length, gab: gab, W: W, S: S, tS: tS, I: S / vc.div, cabos: cabos, fases: phaseBalance(cabos, vc) });
    tot.W += W; tot.S += S; tot.tS += tS; tot.gab += gab;
  });
  var ger = tot.S / 1000 * 1.25;
  return { vc: vc, screens: out, total: { gab: tot.gab, W: tot.W, kVA: tot.S / 1000, I: tot.S / vc.div, tkVA: tot.tS / 1000, tI: tot.tS / vc.div, ger: ger, gerPct: ger > 0 ? Math.round(tot.tS / 1000 / ger * 100) : 0 } };
}

function h(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
function f1(n) { return fmt(Math.round(n * 10) / 10); }

function bloco(titulo, valor, sub) {
  var d = h("div", "ek"); d.appendChild(h("span", "ek-t", titulo)); d.appendChild(h("b", "ek-v", valor)); if (sub) d.appendChild(h("span", "ek-s", sub)); return d;
}

export function renderEletrica() {
  var root = document.getElementById("e-root");
  if (!root) return;
  root.textContent = "";
  var r = calcular(), t = r.total;
  document.getElementById("e-vk").value = cfg.vk;
  if (document.activeElement !== document.getElementById("e-bri")) document.getElementById("e-bri").value = cfg.brilho;
  if (document.activeElement !== document.getElementById("e-con")) document.getElementById("e-con").value = cfg.conteudo;
  if (document.activeElement !== document.getElementById("e-mar")) document.getElementById("e-mar").value = cfg.margem;

  var res0 = h("div", "card");
  res0.appendChild(h("h2", null, "Projeto · " + voltNome(cfg.vk)));
  var grade = h("div", "egrid");
  grade.appendChild(bloco("Pico", f1(t.kVA) + " kVA", nf(Math.round(t.W)) + " W · " + f1(t.I) + " A"));
  grade.appendChild(bloco("Típico", f1(t.tkVA) + " kVA", f1(t.tI) + " A (brilho " + cfg.brilho + "%, conteúdo " + cfg.conteudo + "%)"));
  grade.appendChild(bloco("Gerador mínimo", f1(t.ger) + " kVA", "pico × 1,25 · típico ocupa " + t.gerPct + "%"));
  grade.appendChild(bloco("Gabinetes", nf(t.gab), r.screens.reduce(function (a, s) { return a + s.cabos.length; }, 0) + " cabos de energia"));
  res0.appendChild(grade);
  res0.appendChild(h("p", "note", "Tudo é dimensionado pelo consumo máximo. O app entrega corrente e kVA e não sugere disjuntor: a proteção é do eletricista do quadro."));
  root.appendChild(res0);

  if (!r.screens.length) { root.appendChild(h("p", "empty", "Adicione painéis para calcular a energia.")); return; }

  var maxFase = 0;
  r.screens.forEach(function (s) { s.fases.forEach(function (f) { maxFase = Math.max(maxFase, f.A); }); });

  r.screens.forEach(function (s) {
    var c = h("div", "card");
    var cab = h("div", "ecab");
    cab.appendChild(h("h2", null, s.nome));
    cab.appendChild(h("span", "sb", s.telas + (s.telas === 1 ? " painel" : " painéis") + " · " + nf(s.gab) + " gab. · " + f1(s.S / 1000) + " kVA · " + nf(Math.round(s.W)) + " W · " + f1(s.I) + " A · " + s.cabos.length + " cabos"));
    c.appendChild(cab);
    if (s.fases.length) {
      var fb = h("div", "efases");
      s.fases.forEach(function (f) {
        var l = h("div", "ef"); l.appendChild(h("span", "ef-n", "Fase " + f.fase));
        var tr = h("span", "etrack"), fl = document.createElement("i"); fl.style.width = (maxFase ? f.A / maxFase * 100 : 0) + "%"; tr.appendChild(fl); l.appendChild(tr);
        l.appendChild(h("span", "ef-v", f1(f.A) + " A · " + f.cabos + " cabos")); fb.appendChild(l);
      });
      var mx = Math.max.apply(null, s.fases.map(function (f) { return f.A; })), mn = Math.min.apply(null, s.fases.map(function (f) { return f.A; }));
      if (mx > 0 && s.fases.length > 1) fb.appendChild(h("p", "note", "Diferença entre a fase mais e a menos carregada: " + Math.round((mx - mn) / mx * 100) + "%."));
      c.appendChild(fb);
    } else c.appendChild(h("p", "note", "Esta configuração não faz rodízio de fases: os cabos usam a mesma fase."));
    var lista = h("div", "ecabos");
    s.cabos.forEach(function (k) {
      var l = h("div", "ec " + acTone(k.pct));
      l.appendChild(h("span", "ec-n", "Cabo " + k.n + (k.fase ? " · " + k.fase : "")));
      var tr = h("span", "etrack"), fl = document.createElement("i"); fl.style.width = Math.min(100, k.pct) + "%"; tr.appendChild(fl); l.appendChild(tr);
      l.appendChild(h("span", "ec-v", k.cells.length + " gab. · " + f1(k.A) + " / " + k.rating + " A"));
      lista.appendChild(l);
    });
    c.appendChild(lista);
    root.appendChild(c);
  });
}

function csvCabos() {
  var r = calcular(), rows = [["screen", "cabo", "fase", "paineis", "gabinetes", "corrente_A", "limite_A", "uso_pct", "conector", "gabinete"]];
  r.screens.forEach(function (s) {
    s.cabos.forEach(function (k) { rows.push([s.nome, k.n, k.fase || "", k.telas.join("+"), k.cells.length, f1(k.A), k.rating, Math.round(k.pct), k.conector, cabNome(k.cells[0].t)]); });
  });
  return csv(rows);
}

export function init() {
  ESTORE = chave("eletrica");
  var sv = null;
  try { sv = JSON.parse(localStorage.getItem(ESTORE) || "null"); } catch (e) {}
  cfg = limpa(sv);
  var sel = document.getElementById("e-vk");
  Object.keys(VOLT).forEach(function (k) { var o = document.createElement("option"); o.value = k; o.textContent = voltNome(k); sel.appendChild(o); });
  sel.value = cfg.vk;
  sel.addEventListener("change", function () { cfg.vk = limpa({ vk: sel.value }).vk; salvar(); renderEletrica(); });
  [["e-bri", "brilho"], ["e-con", "conteudo"], ["e-mar", "margem"]].forEach(function (p) {
    document.getElementById(p[0]).addEventListener("change", function (e) { var n = limpa(Object.assign({}, cfg, (function () { var o = {}; o[p[1]] = e.target.value; return o; })())); cfg = n; salvar(); renderEletrica(); });
  });
  document.getElementById("e-csv").addEventListener("click", function () {
    if (!tiles.length) { pmsg("Adicione painéis antes de exportar."); return; }
    saveFile("eletrica-cabos.csv", csvCabos());
  });
}
