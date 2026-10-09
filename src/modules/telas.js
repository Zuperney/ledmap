import { GABINETES, GAB, gabPadrao } from "./gabinetes.js";
import { save, STORE, EXTRAS, BASE, res, nf, fmt, tiles, scaledPos, freeSpot, groups, gname, EXTRA_MAX, cleanExtra, set_EXTRAS } from "./core.js";
import { ksave, twoStep, routes } from "./cabeamento.js";
import { deleteLater } from "./tabela.js";
import { curTab } from "./abas.js";
import { pmsg } from "./exportar.js";

let KEY_REOPEN, KEY_PEND, addModal, aName, aW, aH, aPrev, aErr;

export function commitAndReload(reopen, pending) {
    save(); ksave();
    try {
      var chk = JSON.parse(localStorage.getItem(STORE) || "null");
      if (!chk || JSON.stringify(chk.extras) !== JSON.stringify(EXTRAS)) return false;
      if (reopen) localStorage.setItem(KEY_REOPEN, reopen);
      if (pending) localStorage.setItem(KEY_PEND, pending);
    } catch (e) { return false; }
    try { location.reload(); } catch (e) { return false; }
    return true;
  }

export function nextExtraId() {
    var m = 0;
    BASE.forEach(function (b) { m = Math.max(m, parseInt(b.id, 10) || 0); });
    return String(m + 1);
  }

function mult(v) { v = Number(v); return isFinite(v) && v > 0 && v <= 30; }

let aCab;

function updatePrev() {
    if (!mult(aW.value) || !mult(aH.value)) { aPrev.textContent = "Informe largura e altura entre 0,1 e 30 m."; return; }
    var g = GAB[aCab.value], q = res({ w: Number(aW.value), h: Number(aH.value), kind: "imag", cab: aCab.value });
    aPrev.textContent = "Gabinete " + fmt(g.mw * 100) + " × " + fmt(g.mh * 100) + " cm · painel final " +fmt(q.cols * g.mw) + " × " + fmt(q.rows * g.mh) + " m · " + q.cols + " × " + q.rows + " gabinetes (" + (q.cols * q.rows) + ") · " + q.w + " × " + q.h + " px · " + nf(q.total) + " px no total";
  }

export function freeM(w, h) {
    function hitAt(x, y) { return tiles.some(function (b) { return x < b.mx + b.w && b.mx < x + w && y < b.my + b.h && b.my < y + h; }); }
    var x, y;
    for (y = 0; y <= 8 - h + 1e-9; y += 0.5) for (x = 0; x <= 28 - w + 1e-9; x += 0.5) if (!hitAt(x, y)) return { x: x, y: y };
    for (y = 0; y <= 30 - h + 1e-9; y += 0.5) for (x = 0; x <= 60 - w + 1e-9; x += 0.5) if (!hitAt(x, y)) return { x: x, y: y };
    return null;
  }

export function freeC(t) {
    var q = res(t), p = scaledPos(t), all = tiles.concat(BASE);
    var hit = all.some(function (o) { var b = res(o); return p.x < o.cx + b.w && o.cx < p.x + q.w && p.y < o.cy + b.h && o.cy < p.y + q.h; });
    return hit ? (freeSpot(q.w, q.h, all) || freeSpot(q.w, q.h, BASE) || p) : p;
  }

function openAdd() {
    aName.value = "Painel " + nextExtraId();
    aErr.textContent = "";
    updatePrev();
    addModal.hidden = false;
    aName.focus();
  }

function closeAdd() { addModal.hidden = true; }

// lista de gabinetes do modal de painel; chamada de novo quando a biblioteca muda
export function preencherCabs(valor) {
    if (!aCab) return;
    var v = valor || aCab.value;
    aCab.textContent = "";
    GABINETES.forEach(function (g) {
      var o = document.createElement("option"); o.value = g.id;
      o.textContent = g.nome + " · " + g.rx + "×" + g.ry + " px · " + Math.round(g.mw * 1000) / 10 + "×" + Math.round(g.mh * 1000) / 10 + " cm";
      aCab.appendChild(o);
    });
    aCab.value = GAB[v] ? v : gabPadrao().id;
    if (!addModal.hidden) updatePrev();
  }

// exclui painéis (e as rotas de cabo que passam por eles) e recarrega
export function excluirPaineis(ids) {
    if (!ids.length) return;
    var prevEx = EXTRAS;
    set_EXTRAS(EXTRAS.filter(function (e) { return ids.indexOf(e.id) < 0; }));
    Object.keys(routes).forEach(function (pid) {
      routes[pid] = routes[pid].filter(function (k) { return ids.indexOf(k.split(":")[0]) < 0; });
    });
    if (!commitAndReload(curTab, "")) { set_EXTRAS(prevEx); pmsg("Não consegui salvar a exclusão neste navegador."); }
  }

export function init() {
  KEY_REOPEN = "mapa-telas-led-reopen";
  KEY_PEND = "mapa-telas-led-pending";
  deleteLater.forEach(function (pair) {
      twoStep(pair[0], "Excluir", "Confirmar?", function () { excluirPaineis([pair[1]]); });
    });
  addModal = document.getElementById("add-modal");
  aName = document.getElementById("a-name");
  aW = document.getElementById("a-w");
  aH = document.getElementById("a-h");
  aPrev = document.getElementById("a-prev");
  aErr = document.getElementById("a-err");
  aCab = document.getElementById("a-cab");
  preencherCabs(gabPadrao().id);
  [aCab, aW, aH].forEach(function (n) { n.addEventListener("input", updatePrev); });
  document.getElementById("add-open").addEventListener("click", openAdd);
  document.getElementById("add-open2").addEventListener("click", openAdd);
  document.getElementById("a-cancel").addEventListener("click", closeAdd);
  addModal.addEventListener("click", function (e) { if (e.target === addModal) closeAdd(); });
  document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      closeAdd();
      document.getElementById("img-modal").hidden = true;
    });
  document.getElementById("a-ok").addEventListener("click", function () {
      aErr.textContent = "";
      if (EXTRAS.length >= EXTRA_MAX) { aErr.textContent = "Limite de " + EXTRA_MAX + " painéis."; return; }
      if (!mult(aW.value) || !mult(aH.value)) { aErr.textContent = "Informe largura e altura válidas (até 30 m)."; return; }
      var id = nextExtraId();
      if (Number(id) > 999) { aErr.textContent = "Numeração esgotada."; return; }
      var w = Number(aW.value), h = Number(aH.value);
      var fm = freeM(w, h);
      if (!fm) { aErr.textContent = "Sem espaço livre na montagem."; return; }
      var fc = freeC({ w: w, h: h, kind: "imag", cab: aCab.value, mx: fm.x, my: fm.y });
      var c = cleanExtra({ id: id, name: aName.value, kind: "imag", cab: aCab.value, w: w, h: h, mx: fm.x, my: fm.y, cx: fc.x, cy: fc.y, grp: "" });
      if (!c) { aErr.textContent = "Dimensões ou posição fora do limite (até 30 m de largura e altura)."; return; }
      EXTRAS.push(c);
      if (!commitAndReload(curTab + ":" + id)) {
        EXTRAS.pop();
        aErr.textContent = "Não consegui salvar neste navegador, então o painel não foi adicionado.";
      }
    });
}

export { KEY_PEND, KEY_REOPEN };
