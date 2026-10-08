import { tiles, res, gC, rowsEl, CW, CH, nf, svgC, active, groupMove, members, bbox, save, selected, BASE } from "./core.js";
import { occupied, guideV, guideH } from "./canvas.js";
import { updateBoxes, updateDetailStat } from "./screens.js";
import { updInsp } from "./gaveta.js";
import { select } from "./tabela.js";
import { tById } from "./exportar.js";

let moving, drag, multi, multiOn, magnetOn, btnMagnet;

export function placeC() {
    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    var bad = {};
    tiles.forEach(function (s, idx) {
      var a = res(s);
      gC[s.id].setAttribute("transform", "translate(" + s.cx + " " + s.cy + ")");
      rowsEl.children[idx].querySelector(".cpos").textContent = s.cx + " , " + s.cy;
      minX = Math.min(minX, s.cx); maxX = Math.max(maxX, s.cx + a.w);
      minY = Math.min(minY, s.cy); maxY = Math.max(maxY, s.cy + a.h);
      tiles.forEach(function (o, j) {
        if (j <= idx) return;
        var b = res(o);
        if (s.cx < o.cx + b.w && o.cx < s.cx + a.w && s.cy < o.cy + b.h && o.cy < s.cy + a.h) { bad[s.id] = true; bad[o.id] = true; }
      });
    });
    var nBad = 0;
    tiles.forEach(function (s) { var b = !!bad[s.id]; if (b) nBad++; gC[s.id].classList.toggle("overlap", b); });
    if (!tiles.length) { minX = 0; maxX = 0; minY = 0; maxY = 0; }
    occupied.setAttribute("x", minX); occupied.setAttribute("y", minY);
    occupied.setAttribute("width", maxX - minX); occupied.setAttribute("height", maxY - minY);
    var out = (minX < 0 || minY < 0 || maxX > CW || maxY > CH);
    if (!tiles.length) document.getElementById("stat-c").textContent = "Sem telas · ⋮ → + Adicionar tela";
    else document.getElementById("stat-c").innerHTML = "Área ocupada: <b>" + nf(maxX - minX) + " × " + nf(maxY - minY) + " px</b>" +
      (nBad ? ' · <span class="warn">' + nBad + " telas sobrepostas</span>" : "") +
      (out ? ' · <span class="warn">fora do quadro</span>' : "");
    updateBoxes();
    updateDetailStat();
    updInsp();
  }

function toWorld(e) {
    var p = svgC.createSVGPoint();
    p.x = e.clientX; p.y = e.clientY;
    return p.matrixTransform(svgC.getScreenCTM().inverse());
  }

function multiIds() { return Object.keys(multi); }

function paintMulti() {
    tiles.forEach(function (t) { gC[t.id].classList.toggle("msel", !!multi[t.id]); });
    var b = document.getElementById("btn-multi"), n = multiIds().length;
    b.textContent = n ? "Multi · " + n : "Multi";
    b.setAttribute("aria-pressed", String(multiOn));
  }

export function clearMulti() { multi = {}; multiOn = false; paintMulti(); }

export function onDown(e, s) {
    if (multiOn) { if (multi[s.id]) delete multi[s.id]; else multi[s.id] = 1; paintMulti(); select(s.id); e.preventDefault(); return; }
    var inMulti = multiIds().length > 1 && multi[s.id];
    if (!inMulti && multiIds().length) { multi = {}; paintMulti(); }
    select(s.id);
    if (!moving) return;
    var w = toWorld(e);
    var mem = inMulti ? tiles.filter(function (t) { return multi[t.id]; }) : (active !== null && groupMove && s.grp === active) ? members(active) : [s];
    var bb = bbox(mem);
    drag = {
      mem: mem.map(function (m) { return { s: m, x0: m.cx, y0: m.cy }; }),
      bx: bb.x, by: bb.y, bw: bb.w, bh: bb.h, wx: w.x, wy: w.y
    };
    gC[s.id].setPointerCapture(e.pointerId);
    e.preventDefault();
  }

export function best(mov, tgt, T) {
    var r = null;
    mov.forEach(function (m) {
      tgt.forEach(function (t) {
        if (m.k !== t.k) return;
        var d = t.v - m.v;
        if (Math.abs(d) <= T && (!r || Math.abs(d) < Math.abs(r.d))) r = { d: d, line: t.v };
      });
    });
    return r;
  }

function magnet(rect, excluded) {
    var hx = null, hy = null;
    if (magnetOn) {
      var T = 12 / ((svgC.getBoundingClientRect().width || 1) / 6272);
      var mx = [{ v: rect.x, k: 0 }, { v: rect.x + rect.w, k: 0 }, { v: rect.x + rect.w / 2, k: 1 }];
      var my = [{ v: rect.y, k: 0 }, { v: rect.y + rect.h, k: 0 }, { v: rect.y + rect.h / 2, k: 1 }];
      var tx = [{ v: 0, k: 0 }, { v: CW, k: 0 }];
      var ty = [{ v: 0, k: 0 }, { v: CH, k: 0 }];
      tiles.forEach(function (o) {
        if (excluded.indexOf(o) >= 0) return;
        var b = res(o);
        tx.push({ v: o.cx, k: 0 }, { v: o.cx + b.w, k: 0 }, { v: o.cx + b.w / 2, k: 1 });
        ty.push({ v: o.cy, k: 0 }, { v: o.cy + b.h, k: 0 }, { v: o.cy + b.h / 2, k: 1 });
      });
      hx = best(mx, tx, T);
      hy = best(my, ty, T);
    }
    if (hx) { guideV.setAttribute("x1", hx.line); guideV.setAttribute("x2", hx.line); }
    if (hy) { guideH.setAttribute("y1", hy.line); guideH.setAttribute("y2", hy.line); }
    guideV.classList.toggle("off", !hx);
    guideH.classList.toggle("off", !hy);
    return { x: rect.x + (hx ? hx.d : 0), y: rect.y + (hy ? hy.d : 0) };
  }

function endDrag() {
    var was = !!drag;
    drag = null;
    guideV.classList.add("off");
    guideH.classList.add("off");
    if (was) save();
  }

export function setMoving(on) {
    moving = on;
    document.getElementById("btn-move").setAttribute("aria-pressed", String(on));
    tiles.forEach(function (s) {
      gC[s.id].classList.toggle("edit", on);
      gC[s.id].style.touchAction = on ? "none" : "";
    });
  }

function gridToggle(btnId, gridId) {
    var b = document.getElementById(btnId);
    b.addEventListener("click", function () {
      var on = b.getAttribute("aria-pressed") !== "true";
      b.setAttribute("aria-pressed", String(on));
      document.getElementById(gridId).classList.toggle("off", !on);
    });
  }

export function init() {
  moving = true;
  drag = null;
  multi = {};
  multiOn = false;
  document.getElementById("btn-multi").addEventListener("click", function () {
      if (multiOn) { multiOn = false; if (multiIds().length < 2) multi = {}; }
      else { multiOn = true; if (selected && tById[selected] && !multiIds().length) multi[selected] = 1; }
      paintMulti();
    });
  magnetOn = true;
  svgC.addEventListener("pointermove", function (e) {
      if (!drag) return;
      var step = Number(document.getElementById("snap").value) || 1;
      var w = toWorld(e);
      var nx = Math.round((drag.bx + (w.x - drag.wx)) / step) * step;
      var ny = Math.round((drag.by + (w.y - drag.wy)) / step) * step;
      var m = magnet({ x: nx, y: ny, w: drag.bw, h: drag.bh }, drag.mem.map(function (o) { return o.s; }));
      var dx = m.x - drag.bx, dy = m.y - drag.by;
      drag.mem.forEach(function (o) { o.s.cx = o.x0 + dx; o.s.cy = o.y0 + dy; });
      placeC();
    });
  svgC.addEventListener("pointerup", endDrag);
  svgC.addEventListener("pointercancel", endDrag);
  document.getElementById("btn-move").addEventListener("click", function () { setMoving(!moving); });
  gridToggle("btn-grid-m", "grid-m");
  gridToggle("btn-grid-c", "grid-c");
  document.getElementById("btn-reset").addEventListener("click", function () {
      tiles.forEach(function (s, idx) { s.cx = BASE[idx].cx; s.cy = BASE[idx].cy; });
      placeC();
      save();
    });
  btnMagnet = document.getElementById("btn-magnet");
  btnMagnet.addEventListener("click", function () {
      magnetOn = !magnetOn;
      btnMagnet.setAttribute("aria-pressed", String(magnetOn));
      if (!magnetOn) { guideV.classList.add("off"); guideH.classList.add("off"); }
    });
}

export { drag };
export function set_drag(v) { drag = v; return v; }
