import { buildProject, applyProject } from "./projeto.js";
import { fitM } from "./rig.js";
import { clearMulti } from "./canvas-edicao.js";
import { pmsg, tById } from "./exportar.js";
import { selected, EXTRAS, EXTRA_MAX, cleanExtra } from "./core.js";
import { duplicarPainel } from "./telas.js";
import { curTab } from "./abas.js";

let histUndo, histRedo, histCur, histT, histBusy, HIST_MAX;

export function histSnap() { try { var o = buildProject(); delete o.exportadoEm; return JSON.stringify(o); } catch (e) { return null; } }

export function histBtns() {
    var u = document.getElementById("undo"), r = document.getElementById("redo");
    if (u) u.disabled = !histUndo.length;
    if (r) r.disabled = !histRedo.length;
  }

export function histTick() {
    if (histBusy || histCur === null) return;
    clearTimeout(histT);
    histT = setTimeout(histFlush, 350);
  }

function histFlush() {
    clearTimeout(histT); histT = null;
    if (histBusy || histCur === null) return;
    var now = histSnap();
    if (now === null || now === histCur) return;
    histUndo.push(histCur); if (histUndo.length > HIST_MAX) histUndo.shift();
    histRedo = []; histCur = now; histBtns();
  }

function histGo(dir) {
    histFlush();
    var from = dir < 0 ? histUndo : histRedo, to = dir < 0 ? histRedo : histUndo;
    if (!from.length) return;
    var target = from.pop(), now = histCur;
    histBusy = true;
    try { applyProject(JSON.parse(target)); fitM(); clearMulti(); histCur = target; to.push(now); pmsg(dir < 0 ? "Desfeito" : "Refeito"); }
    catch (e) { from.push(target); }
    histBusy = false; histBtns();
  }

export function duplicateSel() { if (selected && tById[selected]) duplicarPainel(selected); }

export function init() {
  histUndo = [];
  histRedo = [];
  histCur = null;
  histT = null;
  histBusy = false;
  HIST_MAX = 60;
  document.getElementById("undo").addEventListener("click", function () { histGo(-1); });
  document.getElementById("redo").addEventListener("click", function () { histGo(1); });
  document.addEventListener("keydown", function (e) {
      if (!(e.ctrlKey || e.metaKey) || /^(INPUT|SELECT|TEXTAREA)$/.test((e.target.tagName || ""))) return;
      var k = String(e.key).toLowerCase();
      if (k === "z" && !e.shiftKey) { e.preventDefault(); histGo(-1); }
      else if (k === "y" || (k === "z" && e.shiftKey)) { e.preventDefault(); histGo(1); }
    });
  histCur = histSnap();
  histBtns();
}

export { histT, histUndo, histRedo, histCur };
export function set_histUndo(v) { histUndo = v; return v; }
export function set_histRedo(v) { histRedo = v; return v; }
export function set_histCur(v) { histCur = v; return v; }
