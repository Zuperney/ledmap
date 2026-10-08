import { svgM, rowsEl, tiles, fmt, selected, gM, save, FLOOR, mnum, BASE } from "./core.js";
import { updInsp } from "./gaveta.js";
import { placeM, fitM, guideMV, guideMH, boundsM, statM } from "./rig.js";
import { cabOn, renderCabM, viewM } from "./rig-cabos.js";
import { tById } from "./exportar.js";
import { select } from "./tabela.js";
import { best } from "./canvas-edicao.js";
import { twoStep } from "./cabeamento.js";

let editM, dragM, magnetM, btnMagM;

function toWorldM(e) {
    var pt = svgM.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    return pt.matrixTransform(svgM.getScreenCTM().inverse());
  }

function rowM(t) {
    var c = rowsEl.children[tiles.indexOf(t)];
    if (c) c.querySelector(".mpos").textContent = fmt(t.mx) + " , " + fmt(t.my);
    updInsp();
  }

export function refreshM() {
    tiles.forEach(function (t) { placeM(t); rowM(t); });
    fitM();
    syncMPanel();
    if (cabOn) renderCabM();
  }

export function syncMPanel() {
    var t = selected && tById[selected];
    document.getElementById("m-who").textContent = t ? "Tela " + t.id + " · " + t.name : "Toque numa tela para movê-la";
    var ix = document.getElementById("m-x"), iy = document.getElementById("m-y");
    ix.disabled = iy.disabled = !t;
    ix.value = t ? t.mx : ""; iy.value = t ? t.my : "";
  }

export function setEditM(on) {
    editM = on;
    document.getElementById("m-edit").setAttribute("aria-pressed", String(on));
    document.getElementById("m-edit-panel").hidden = !on;
    tiles.forEach(function (t) { gM[t.id].classList.toggle("edit", on); });
    viewM.setLock(on);
    if (!on) { dragM = null; guideMV.classList.add("off"); guideMH.classList.add("off"); }
    syncMPanel();
  }

export function onDownM(e, t) {
    if (!editM) return;
    select(t.id);
    var w = toWorldM(e);
    dragM = { t: t, x0: t.mx, y0: t.my, wx: w.x, wy: w.y };
    gM[t.id].setPointerCapture(e.pointerId);
    e.preventDefault();
  }

function endDragM() {
    var was = !!dragM;
    dragM = null;
    guideMV.classList.add("off");
    guideMH.classList.add("off");
    if (was) { save(); fitM(); }
  }

export function init() {
  editM = false;
  dragM = null;
  magnetM = true;
  document.getElementById("m-edit").addEventListener("click", function () { setEditM(!editM); });
  svgM.addEventListener("pointermove", function (e) {
      if (!dragM) return;
      var t = dragM.t, step = Number(document.getElementById("m-snap").value) || 0.5;
      var w = toWorldM(e);
      var nx = Math.round((dragM.x0 + (w.x - dragM.wx)) / step) * step;
      var ny = Math.round((dragM.y0 - (w.y - dragM.wy)) / step) * step;
      var hx = null, hy = null;
      if (magnetM) {
        var T = 12 / ((svgM.getBoundingClientRect().width || 1) / (boundsM.x1 - boundsM.x0));
        var mxs = [{ v: nx, k: 0 }, { v: nx + t.w, k: 0 }, { v: nx + t.w / 2, k: 1 }];
        var mys = [{ v: ny, k: 0 }, { v: ny + t.h, k: 0 }, { v: ny + t.h / 2, k: 1 }];
        var txs = [], tys = [{ v: 0, k: 0 }];
        tiles.forEach(function (o) {
          if (o === t) return;
          txs.push({ v: o.mx, k: 0 }, { v: o.mx + o.w, k: 0 }, { v: o.mx + o.w / 2, k: 1 });
          tys.push({ v: o.my, k: 0 }, { v: o.my + o.h, k: 0 }, { v: o.my + o.h / 2, k: 1 });
        });
        hx = best(mxs, txs, T); hy = best(mys, tys, T);
        if (hx) nx += hx.d;
        if (hy) ny += hy.d;
      }
      var b = boundsM;
      nx = Math.min(Math.max(nx, b.x0), b.x1 - t.w);
      ny = Math.min(Math.max(ny, FLOOR - b.y1), FLOOR - b.y0 - t.h);
      t.mx = Math.round(nx * 100) / 100; t.my = Math.round(ny * 100) / 100;
      if (hx) { guideMV.setAttribute("x1", hx.line); guideMV.setAttribute("x2", hx.line); }
      if (hy) { guideMH.setAttribute("y1", FLOOR - hy.line); guideMH.setAttribute("y2", FLOOR - hy.line); }
      guideMV.classList.toggle("off", !hx);
      guideMH.classList.toggle("off", !hy);
      placeM(t); rowM(t); syncMPanel(); statM();
      if (cabOn) renderCabM();
    });
  svgM.addEventListener("pointerup", endDragM);
  svgM.addEventListener("pointercancel", endDragM);
  ["m-x", "m-y"].forEach(function (id) {
      document.getElementById(id).addEventListener("change", function () {
        var t = selected && tById[selected];
        if (!t) return;
        var nx = mnum(document.getElementById("m-x").value), ny = mnum(document.getElementById("m-y").value);
        if (nx !== null && ny !== null) { t.mx = nx; t.my = ny; save(); }
        refreshM();
      });
    });
  btnMagM = document.getElementById("m-magnet");
  btnMagM.addEventListener("click", function () { magnetM = !magnetM; btnMagM.setAttribute("aria-pressed", String(magnetM)); });
  twoStep(document.getElementById("m-reset"), "Restaurar", "Confirmar?", function () {
      tiles.forEach(function (t, idx) { t.mx = BASE[idx].mx; t.my = BASE[idx].my; });
      save(); refreshM();
    });
}

export { editM };
