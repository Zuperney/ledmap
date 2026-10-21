import { cellEl, ports, routes, pcolor, pname } from "./cabeamento.js";
import { FLOOR, el, text, svgM, res, tiles, vistaM } from "./core.js";
import { makeViewer } from "./visor.js";
import { afim, encara, noMundo, projetar, caixaDe } from "./espaco.js";

let viewM, cabOn, ovlM, btnCab;

// centro do gabinete na vista atual (unidades do desenho do Rig)
function centroM(k) {
    var c = cellEl[k], t = c.t, q = res(t);
    var p = projetar(vistaM, noMundo(t, [t.mx + (c.c + 0.5) * q.mw, t.my + t.h - (c.r + 0.5) * q.mh, -(t.z || 0)]));
    return [p[0], FLOOR - p[1]];
  }

export function renderCabM() {
    ovlM.textContent = "";
    var box = document.getElementById("m-ports");
    box.textContent = "";
    box.hidden = !cabOn;
    if (!cabOn) return;
    // a cor dos gabinetes vai na frente de cada painel (com a afim da vista); painel visto de lado não mostra cabo
    var visivel = {}, mat = {};
    tiles.forEach(function (t) { visivel[t.id] = Math.abs(encara(t, vistaM)) >= 0.08; if (visivel[t.id]) mat[t.id] = "matrix(" + afim(t, vistaM, FLOOR).join(" ") + ")"; });
    ports.forEach(function (p) {
      var route = routes[p.id], col = pcolor(p);
      var chip = document.createElement("span"), dot = document.createElement("i");
      dot.style.background = col;
      chip.appendChild(dot);
      chip.appendChild(document.createTextNode(pname(p) + " · " + route.length + (route.length === 1 ? " gabinete" : " gabinetes")));
      box.appendChild(chip);
      route = route.filter(function (k) { return cellEl[k] && visivel[cellEl[k].t.id]; });
      if (!route.length) return;
      var pts = route.map(centroM);
      route.forEach(function (k) {
        var c = cellEl[k], q = res(c.t);
        el("rect", { "class": "ovc", x: c.c * q.mw, y: c.r * q.mh, width: q.mw, height: q.mh, fill: col, transform: mat[c.t.id] }, ovlM);
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
    { label: "m-zlabel", lock: "m-lock", zin: "m-zin", zout: "m-zout", zfit: "m-zfit" }, null, 680,
    function () {
      if (!tiles.length) return null;
      var c = caixaDe(tiles, vistaM), y0 = FLOOR - c.v1, y1 = FLOOR - c.v0;
      return { x: c.u0, y: y0, w: c.u1 - c.u0, h: Math.max(y1, FLOOR) - y0 }; // inclui o chão (a frente, no Topo)
    });
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
