import { tiles, res, gC, rowsEl, CW, CH, nf, svgC, active, groupMove, members, bbox, save, selected, BASE, freeSpot } from "./core.js";
import { occupied, guideV, guideH } from "./canvas.js";
import { updateBoxes, updateDetailStat } from "./screens.js";
import { updInsp } from "./gaveta.js";
import { select } from "./tabela.js";
import { tById, pmsg as pmsgC } from "./exportar.js";
import { renderCartaoC } from "./screen-cartao.js";
import { viewC } from "./visor.js";

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
    var out = tiles.length > 0 && (minX < 0 || minY < 0 || maxX > CW || maxY > CH);
    // o desenho sempre mostra o canvas do processador e, se houver, os painéis que estão fora dele
    var vx = Math.min(-64, tiles.length ? minX - 64 : 0), vy = Math.min(-150, tiles.length ? minY - 150 : 0);
    var vx1 = Math.max(CW + 64, tiles.length ? maxX + 64 : 0), vy1 = Math.max(CH + 140, tiles.length ? maxY + 140 : 0);
    svgC.setAttribute("viewBox", [vx, vy, vx1 - vx, vy1 - vy].join(" "));
    var nFora = tiles.filter(function (s) { var a = res(s); return s.cx < 0 || s.cy < 0 || s.cx + a.w > CW || s.cy + a.h > CH; }).length;
    var bt = document.getElementById("btn-dentro");
    if (bt) { bt.hidden = !nFora; bt.textContent = "Trazer para dentro (" + nFora + ")"; }
    if (!tiles.length) document.getElementById("stat-c").textContent = "Sem painéis · toque em + Painel";
    else document.getElementById("stat-c").innerHTML = "Área ocupada: <b>" + nf(maxX - minX) + " × " + nf(maxY - minY) + " px</b>" +
      (nBad ? ' · <span class="warn">' + nBad + " painéis sobrepostos</span>" : "") +
      (out ? ' · <span class="warn">' + nFora + (nFora === 1 ? " painel fora do canvas" : " painéis fora do canvas") + "</span>" : "");
    updateBoxes();
    updateDetailStat();
    updInsp();
  }

// leva para dentro do canvas os painéis que estão fora: o lugar livre mais perto, ou encostado na borda
export function trazerParaDentro() {
    var n = 0;
    tiles.forEach(function (s) {
      var a = res(s);
      if (!(s.cx < 0 || s.cy < 0 || s.cx + a.w > CW || s.cy + a.h > CH)) return;
      var outros = tiles.filter(function (o) { return o !== s; });
      var livre = freeSpot(a.w, a.h, outros);
      if (livre) { s.cx = livre.x; s.cy = livre.y; }
      else { s.cx = Math.min(Math.max(0, s.cx), Math.max(0, CW - a.w)); s.cy = Math.min(Math.max(0, s.cy), Math.max(0, CH - a.h)); }
      n++;
    });
    if (n) { save(); placeC(); }
    return n;
  }

function toWorld(e) {
    var p = svgC.createSVGPoint();
    p.x = e.clientX; p.y = e.clientY;
    return p.matrixTransform(svgC.getScreenCTM().inverse());
  }

function multiIds() { return Object.keys(multi); }

function paintMulti() {
    tiles.forEach(function (t) { gC[t.id].classList.toggle("msel", !!multi[t.id]); });
    renderCartaoC();
  }

export function clearMulti() { multi = {}; multiOn = false; paintMulti(); }

// seleção de vários na Screen (Shift/Ctrl + clique, ou "Selecionar vários" no cartão)
export function multiLista() { return multiIds(); }
export function modoSelC() { return multiOn; }
export function movendoC() { return moving; }
export function iniciarSelecaoC() {
    multiOn = true; multi = {};
    if (selected && tById[selected]) multi[selected] = 1;
    paintMulti();
  }
export function toggleMultiC(id) {
    if (!multiIds().length && selected && tById[selected] && selected !== id) multi[selected] = 1;
    if (multi[id]) delete multi[id]; else multi[id] = 1;
    paintMulti();
  }

export function onDown(e, s) {
    if (e.button === 2) return; // clique direito: o menu cuida
    if (e.shiftKey || e.ctrlKey || e.metaKey) { toggleMultiC(s.id); e.preventDefault(); return; }
    var inMulti = multiIds().length > 1 && multi[s.id];
    // no modo de selecionar: tocar marca/desmarca; com Mover ligado, arrastar um marcado leva todos
    if (multiOn && !(moving && inMulti)) { toggleMultiC(s.id); e.preventDefault(); return; }
    if (!inMulti && multiIds().length) { multi = {}; paintMulti(); }
    if (!inMulti) select(s.id);
    if (!moving) return;
    var w = toWorld(e);
    var mem = inMulti ? tiles.filter(function (t) { return multi[t.id]; }) : (active !== null && groupMove && s.grp === active) ? members(active) : [s];
    var bb = bbox(mem);
    drag = {
      mem: mem.map(function (m) { return { s: m, x0: m.cx, y0: m.cy }; }),
      bx: bb.x, by: bb.y, bw: bb.w, bh: bb.h, wx: w.x, wy: w.y,
      sx: e.clientX, sy: e.clientY, moveu: false, toque: multiOn ? s.id : null
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
      // ímã reforçado: 20 px na tela, medido pela largura real do desenho (que cresce com painéis fora do canvas)
      var T = 20 / ((svgC.getBoundingClientRect().width || 1) / ((svgC.viewBox.baseVal && svgC.viewBox.baseVal.width) || 6272));
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
    var d = drag, was = !!(d && d.moveu);
    drag = null;
    guideV.classList.add("off");
    guideH.classList.add("off");
    if (was) { ignorarAteC = performance.now() + 350; save(); }
    else if (d && d.toque) toggleMultiC(d.toque); // tocou sem arrastar, no modo de selecionar: marca/desmarca
  }

var ignorarAteC = 0;

// ---- laço: com Mover ligado, arrastar no vazio seleciona os painéis que o retângulo toca ----
var laco = null, lacoEl = null;
function iniciarLaco(e) {
    var w = toWorld(e);
    laco = { x: w.x, y: w.y, sx: e.clientX, sy: e.clientY };
    if (!lacoEl) { lacoEl = document.createElementNS("http://www.w3.org/2000/svg", "rect"); lacoEl.setAttribute("class", "laco"); }
    lacoEl.setAttribute("width", 0); lacoEl.setAttribute("height", 0);
    svgC.appendChild(lacoEl);
    svgC.setPointerCapture(e.pointerId);
  }
function moverLaco(e) {
    var w = toWorld(e);
    lacoEl.setAttribute("x", Math.min(laco.x, w.x)); lacoEl.setAttribute("y", Math.min(laco.y, w.y));
    lacoEl.setAttribute("width", Math.abs(w.x - laco.x)); lacoEl.setAttribute("height", Math.abs(w.y - laco.y));
    laco.w = w;
  }
function fecharLaco(e) {
    var l = laco; laco = null;
    if (lacoEl && lacoEl.parentNode) lacoEl.parentNode.removeChild(lacoEl);
    if (!l || !l.w || Math.hypot(e.clientX - l.sx, e.clientY - l.sy) < 6) return;
    ignorarAteC = performance.now() + 350;
    var x0 = Math.min(l.x, l.w.x), x1 = Math.max(l.x, l.w.x), y0 = Math.min(l.y, l.w.y), y1 = Math.max(l.y, l.w.y);
    var ids = tiles.filter(function (t) { var q = res(t); return t.cx < x1 && t.cx + q.w > x0 && t.cy < y1 && t.cy + q.h > y0; }).map(function (t) { return t.id; });
    if (ids.length >= 2) { multi = {}; ids.forEach(function (id) { multi[id] = 1; }); multiOn = false; paintMulti(); }
    else if (ids.length === 1) { if (multiIds().length) clearMulti(); select(ids[0]); }
  }

// Mover (desligado por padrão): desligado, tocar seleciona e arrastar só navega; ligado, arrasta painéis
export function setMoving(on) {
    moving = on;
    document.getElementById("btn-move").setAttribute("aria-pressed", String(on));
    document.getElementById("c-edit-panel").hidden = !on;
    if (viewC) viewC.setLock(on);
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
  moving = false;
  drag = null;
  multi = {};
  multiOn = false;
  document.getElementById("btn-dentro").addEventListener("click", function () {
      var n = trazerParaDentro();
      if (n) pmsgC(n === 1 ? "1 painel trazido para dentro do canvas." : n + " painéis trazidos para dentro do canvas.");
    });
  // tocar no vazio do canvas tira a seleção (fora do modo de selecionar vários)
  svgC.addEventListener("click", function (e) {
    if (performance.now() < ignorarAteC) return;
    if (e.target.closest && e.target.closest(".scr")) return;
    if (multiOn) return;
    if (multiIds().length) clearMulti();
    if (selected) select(null);
  });
  magnetOn = true;
  svgC.addEventListener("pointerdown", function (e) {
    if (!moving || e.button === 2 || (e.target.closest && e.target.closest(".scr"))) return;
    iniciarLaco(e);
  });
  svgC.addEventListener("pointermove", function (e) {
      if (laco) { moverLaco(e); return; }
      if (!drag) return;
      if (!drag.moveu) { if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 5) return; drag.moveu = true; }
      var step = Number(document.getElementById("snap").value) || 1;
      var w = toWorld(e);
      var nx = Math.round((drag.bx + (w.x - drag.wx)) / step) * step;
      var ny = Math.round((drag.by + (w.y - drag.wy)) / step) * step;
      var m = magnet({ x: nx, y: ny, w: drag.bw, h: drag.bh }, drag.mem.map(function (o) { return o.s; }));
      var dx = m.x - drag.bx, dy = m.y - drag.by;
      drag.mem.forEach(function (o) { o.s.cx = o.x0 + dx; o.s.cy = o.y0 + dy; });
      placeC();
    });
  svgC.addEventListener("pointerup", function (e) { if (laco) { fecharLaco(e); return; } endDrag(); });
  svgC.addEventListener("pointercancel", function (e) { if (laco) { fecharLaco(e); return; } endDrag(); });
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
