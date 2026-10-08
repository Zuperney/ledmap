import { save, STORE, EXTRAS, BASE, res, nf, tiles, scaledPos, freeSpot, groups, gname, EXTRA_MAX, cleanExtra, set_EXTRAS } from "./core.js";
import { ksave, twoStep, routes } from "./cabeamento.js";
import { deleteLater } from "./tabela.js";
import { curTab } from "./abas.js";
import { pmsg } from "./exportar.js";

let KEY_REOPEN, KEY_PEND, addModal, aName, aKind, aW, aH, aGrp, aMx, aMy, aPrev, aErr;

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

function mult(v) { v = Number(v); return isFinite(v) && v > 0 && Math.abs(v * 2 - Math.round(v * 2)) < 1e-9; }

function updatePrev() {
    if (!mult(aW.value) || !mult(aH.value)) { aPrev.textContent = "Use múltiplos de 0,5 m (gabinete de 50 × 50 cm)."; return; }
    var q = res({ w: Number(aW.value), h: Number(aH.value), kind: aKind.value });
    aPrev.textContent = q.cols + " × " + q.rows + " gabinetes (" + (q.cols * q.rows) + ") · " + q.w + " × " + q.h + " px · " + nf(q.total) + " px no total";
  }

export function freeM(w, h) {
    function hitAt(x, y) { return tiles.some(function (b) { return x < b.mx + b.w && b.mx < x + w && y < b.my + b.h && b.my < y + h; }); }
    var x, y;
    for (y = 0; y <= 8 - h + 1e-9; y += 0.5) for (x = -1; x <= 28 - w + 1e-9; x += 0.5) if (!hitAt(x, y)) return { x: x, y: y };
    for (y = 0; y <= 30 - h + 1e-9; y += 0.5) for (x = -1; x <= 60 - w + 1e-9; x += 0.5) if (!hitAt(x, y)) return { x: x, y: y };
    return null;
  }

export function freeC(t) {
    var q = res(t), p = scaledPos(t), all = tiles.concat(BASE);
    var hit = all.some(function (o) { var b = res(o); return p.x < o.cx + b.w && o.cx < p.x + q.w && p.y < o.cy + b.h && o.cy < p.y + q.h; });
    return hit ? (freeSpot(q.w, q.h, all) || freeSpot(q.w, q.h, BASE) || p) : p;
  }

function openAdd() {
    aName.value = "Tela " + nextExtraId();
    aGrp.textContent = "";
    var o0 = document.createElement("option"); o0.value = ""; o0.textContent = "— sem screen —"; aGrp.appendChild(o0);
    groups.forEach(function (g) { var o = document.createElement("option"); o.value = g.id; o.textContent = gname(g); aGrp.appendChild(o); });
    aMx.value = ""; aMy.value = ""; aErr.textContent = "";
    updatePrev();
    addModal.hidden = false;
    aName.focus();
  }

function closeAdd() { addModal.hidden = true; }

export function init() {
  KEY_REOPEN = "mapa-telas-led-reopen";
  KEY_PEND = "mapa-telas-led-pending";
  deleteLater.forEach(function (pair) {
      twoStep(pair[0], "Excluir", "Confirmar?", function () {
        var id = pair[1], prevEx = EXTRAS;
        set_EXTRAS(EXTRAS.filter(function (e) { return e.id !== id; }));
        Object.keys(routes).forEach(function (pid) {
          routes[pid] = routes[pid].filter(function (k) { return k.indexOf(id + ":") !== 0; });
        });
        if (!commitAndReload(curTab, "")) { set_EXTRAS(prevEx); pmsg("Não consegui salvar a exclusão neste navegador."); }
      });
    });
  addModal = document.getElementById("add-modal");
  aName = document.getElementById("a-name");
  aKind = document.getElementById("a-kind");
  aW = document.getElementById("a-w");
  aH = document.getElementById("a-h");
  aGrp = document.getElementById("a-grp");
  aMx = document.getElementById("a-mx");
  aMy = document.getElementById("a-my");
  aPrev = document.getElementById("a-prev");
  aErr = document.getElementById("a-err");
  [aKind, aW, aH].forEach(function (n) { n.addEventListener("input", updatePrev); });
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
      if (EXTRAS.length >= EXTRA_MAX) { aErr.textContent = "Limite de " + EXTRA_MAX + " telas."; return; }
      if (!mult(aW.value) || !mult(aH.value)) { aErr.textContent = "Largura e altura precisam ser múltiplos de 0,5 m."; return; }
      var id = nextExtraId();
      if (Number(id) > 999) { aErr.textContent = "Numeração esgotada."; return; }
      var w = Number(aW.value), h = Number(aH.value), mx, my;
      if (aMx.value === "" && aMy.value === "") {
        var fm = freeM(w, h);
        if (!fm) { aErr.textContent = "Sem espaço livre na montagem. Informe X e Y."; return; }
        mx = fm.x; my = fm.y;
      } else {
        mx = Number(aMx.value === "" ? 0 : aMx.value); my = Number(aMy.value === "" ? 0 : aMy.value);
      }
      var fc = freeC({ w: w, h: h, kind: aKind.value, mx: mx, my: my });
      var c = cleanExtra({ id: id, name: aName.value, kind: aKind.value, w: w, h: h, mx: mx, my: my, cx: fc.x, cy: fc.y, grp: aGrp.value });
      if (!c) { aErr.textContent = "Dimensões ou posição fora do limite (até 30 m de largura e altura)."; return; }
      EXTRAS.push(c);
      if (!commitAndReload("c:" + id)) {
        EXTRAS.pop();
        aErr.textContent = "Não consegui salvar neste navegador, então a tela não foi adicionada.";
      }
    });
}

export { KEY_PEND, KEY_REOPEN };
