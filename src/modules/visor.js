import { svgC, tiles, res } from "./core.js";

// retângulo em px (canvas) que envolve os painéis
export function caixaPx(lista) {
  var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  lista.forEach(function (t) { var q = res(t); x0 = Math.min(x0, t.cx); y0 = Math.min(y0, t.cy); x1 = Math.max(x1, t.cx + q.w); y1 = Math.max(y1, t.cy + q.h); });
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
import { drag, set_drag } from "./canvas-edicao.js";

let viewC;

// conteudo(): retângulo (unidades do svg) que o Enquadrar deve mostrar inteiro; sem ele, volta à largura da vista
export function makeViewer(stage, svg, ids, onPinch, minW, conteudo) {
    var zoom = 1, locked = false;
    var $ = function (id) { return document.getElementById(id); };
    var label = $(ids.label), btnLock = $(ids.lock);
    function baseW() { return Math.max(stage.clientWidth, minW || 1100); }
    function apply() {
      svg.style.width = Math.round(baseW() * zoom) + "px";
      label.textContent = Math.round(zoom * 100) + "%";
    }
    function clampZ(z) { return Math.min(16, Math.max(0.2, z)); }
    function anchor(cx, cy) {
      var rect = stage.getBoundingClientRect(), box = svg.getBoundingClientRect();
      var ax = cx == null ? rect.width / 2 : cx - rect.left;
      var ay = cy == null ? rect.height / 2 : cy - rect.top;
      return { ax: ax, ay: ay, fx: (stage.scrollLeft + ax) / (box.width || 1), fy: (stage.scrollTop + ay) / (box.height || 1) };
    }
    function put(fx, fy, ax, ay) {
      var nb = svg.getBoundingClientRect();
      stage.scrollLeft = fx * nb.width - ax;
      stage.scrollTop = fy * nb.height - ay;
    }
    function setZoom(z, cx, cy) {
      var a = anchor(cx, cy);
      zoom = clampZ(z);
      apply();
      put(a.fx, a.fy, a.ax, a.ay);
    }
    function setLock(on) {
      locked = on;
      btnLock.setAttribute("aria-pressed", String(on));
      btnLock.textContent = on ? "Travado" : "Travar";
      stage.classList.toggle("locked", on);
      document.documentElement.classList.toggle("lock", on);
    }
    btnLock.addEventListener("click", function () { setLock(!locked); });
    $(ids.zin).addEventListener("click", function () { setZoom(zoom * 1.25); });
    $(ids.zout).addEventListener("click", function () { setZoom(zoom / 1.25); });
    function enquadrar() {
      var c = conteudo && conteudo(), vb = svg.viewBox.baseVal;
      if (!c || !(c.w > 0) || !(c.h > 0) || !vb || !vb.width) { setZoom(stage.clientWidth / baseW()); stage.scrollLeft = 0; stage.scrollTop = 0; return; }
      var m = Math.max(c.w, c.h) * 0.06, W = stage.clientWidth || 300;
      var maxH = parseFloat(getComputedStyle(stage).maxHeight), H = isFinite(maxH) && maxH > 0 ? Math.min(maxH, window.innerHeight * 0.85) : window.innerHeight * 0.6;
      c = { x: c.x - m, y: c.y - m, w: c.w + 2 * m, h: c.h + 2 * m };
      zoom = clampZ(Math.min(W * vb.width / (baseW() * c.w), H * vb.width / (baseW() * c.h)));
      apply();
      var ppu = baseW() * zoom / vb.width;
      stage.scrollLeft = Math.max(0, (c.x - vb.x) * ppu - (W - c.w * ppu) / 2);
      stage.scrollTop = Math.max(0, (c.y - vb.y) * ppu - (Math.min(H, stage.clientHeight || H) - c.h * ppu) / 2);
    }
    $(ids.zfit).addEventListener("click", enquadrar);
    window.addEventListener("resize", apply);
    stage.addEventListener("wheel", function (e) {
      if (locked) { e.preventDefault(); return; }
      if (!e.ctrlKey) return;
      e.preventDefault();
      setZoom(zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX, e.clientY);
    }, { passive: false });

    var ptrs = {}, pinch = null;
    function keys() { return Object.keys(ptrs); }
    function pdist() {
      var k = keys();
      return k.length < 2 ? 0 : Math.hypot(ptrs[k[0]].x - ptrs[k[1]].x, ptrs[k[0]].y - ptrs[k[1]].y);
    }
    function mid() {
      var k = keys();
      return { x: (ptrs[k[0]].x + ptrs[k[1]].x) / 2, y: (ptrs[k[0]].y + ptrs[k[1]].y) / 2 };
    }
    stage.addEventListener("pointerdown", function (e) {
      ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
      if (keys().length === 2) {
        var m = mid(), a = anchor(m.x, m.y);
        pinch = { d: pdist(), z: zoom, fx: a.fx, fy: a.fy };
        if (onPinch) onPinch();
      }
    });
    stage.addEventListener("pointermove", function (e) {
      if (!ptrs[e.pointerId]) return;
      ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
      if (pinch && pinch.d > 0 && keys().length >= 2) {
        var m = mid(), rect = stage.getBoundingClientRect();
        zoom = clampZ(pinch.z * pdist() / pinch.d);
        apply();
        put(pinch.fx, pinch.fy, m.x - rect.left, m.y - rect.top);
      }
    });
    function pend(e) { delete ptrs[e.pointerId]; if (keys().length < 2) pinch = null; }
    stage.addEventListener("pointerup", pend);
    stage.addEventListener("pointercancel", pend);
    return { apply: apply, setLock: setLock, enquadrar: enquadrar };
  }

export function init() {
  viewC = makeViewer(svgC.parentNode, svgC,
    { label: "zoom-label", lock: "btn-lock", zin: "zoom-in", zout: "zoom-out", zfit: "zoom-fit" },
    function () { set_drag(null); }, undefined,
    function () { return tiles.length ? caixaPx(tiles) : null; });
}

export { viewC };
