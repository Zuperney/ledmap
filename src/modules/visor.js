import { svgC } from "./core.js";
import { drag, set_drag } from "./canvas-edicao.js";

let viewC;

export function makeViewer(stage, svg, ids, onPinch, minW) {
    var zoom = 1, locked = false;
    var $ = function (id) { return document.getElementById(id); };
    var label = $(ids.label), btnLock = $(ids.lock);
    function baseW() { return Math.max(stage.clientWidth, minW || 1100); }
    function apply() {
      svg.style.width = Math.round(baseW() * zoom) + "px";
      label.textContent = Math.round(zoom * 100) + "%";
    }
    function clampZ(z) { return Math.min(4, Math.max(0.2, z)); }
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
    $(ids.zfit).addEventListener("click", function () {
      setZoom(stage.clientWidth / baseW());
      stage.scrollLeft = 0; stage.scrollTop = 0;
    });
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
    return { apply: apply, setLock: setLock };
  }

export function init() {
  viewC = makeViewer(svgC.parentNode, svgC,
    { label: "zoom-label", lock: "btn-lock", zin: "zoom-in", zout: "zoom-out", zfit: "zoom-fit" },
    function () { set_drag(null); });
}

export { viewC };
