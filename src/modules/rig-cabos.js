import { cellEl, ports, routes, pcolor, pname } from "./cabeamento.js";
import { FLOOR, el, text, svgM, res } from "./core.js";
import { makeViewer } from "./visor.js";

let viewM, cabOn, ovlM, btnCab;

function cellM(k) {
    var c = cellEl[k], t = c.t, q = res(t);
    return { x: t.mx + c.c * q.mw, y: FLOOR - t.my - t.h + c.r * q.mh, w: q.mw, h: q.mh };
  }

export function renderCabM() {
    ovlM.textContent = "";
    var box = document.getElementById("m-ports");
    box.textContent = "";
    box.hidden = !cabOn;
    if (!cabOn) return;
    ports.forEach(function (p) {
      var route = routes[p.id], col = pcolor(p);
      var chip = document.createElement("span"), dot = document.createElement("i");
      dot.style.background = col;
      chip.appendChild(dot);
      chip.appendChild(document.createTextNode(pname(p) + " · " + route.length + (route.length === 1 ? " gabinete" : " gabinetes")));
      box.appendChild(chip);
      if (!route.length) return;
      var pts = route.map(function (k) { var c = cellM(k); return [c.x + c.w / 2, c.y + c.h / 2]; });
      route.forEach(function (k) {
        var c = cellM(k);
        el("rect", { "class": "ovc", x: c.x, y: c.y, width: c.w, height: c.h, fill: col }, ovlM);
      });
      el("polyline", { "class": "kline act", points: pts.map(function (a) { return a[0] + "," + a[1]; }).join(" "), stroke: col }, ovlM);
      el("circle", { "class": "kdot", cx: pts[0][0], cy: pts[0][1], r: 0.12, fill: col }, ovlM);
      if (pts.length > 1) el("circle", { "class": "kend", cx: pts[pts.length - 1][0], cy: pts[pts.length - 1][1], r: 0.1, stroke: col }, ovlM);
      route.forEach(function (k, i) { text(ovlM, "cnum", pts[i][0], pts[i][1], 0.17, String(i + 1)); });
      var tg = el("text", { "class": "ktag", x: pts[0][0] + 0.15, y: pts[0][1] - 0.15, "font-size": 0.3, "stroke-width": 0.08 }, ovlM);
      tg.textContent = pname(p).slice(0, 8);
    });
  }

export function init() {
  viewM = makeViewer(svgM.parentNode, svgM,
    { label: "m-zlabel", lock: "m-lock", zin: "m-zin", zout: "m-zout", zfit: "m-zfit" }, null, 680);
  cabOn = false;
  ovlM = el("g", {}, svgM);
  btnCab = document.getElementById("m-cab");
  btnCab.addEventListener("click", function () {
      cabOn = !cabOn;
      btnCab.setAttribute("aria-pressed", String(cabOn));
      renderCabM();
    });
}

export { viewM, cabOn };
