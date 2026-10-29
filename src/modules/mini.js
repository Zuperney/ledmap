// Miniatura de uma vista 2D (mosaico "Todas as vistas"): só para olhar e selecionar. Desenha cada painel com o
// contorno da caixa e a frente projetada (grade de gabinetes), como o Rig, sem textos nem edição.
import { tiles, FLOOR, res, cabPath, selected, el } from "./core.js";
import { corCab } from "./gabinetes.js";
import { afim, casco, caixaDe, encara, profundidadeNaVista } from "./espaco.js";

export function desenharMini(svg, vista) {
  svg.textContent = "";
  if (!tiles.length) { svg.setAttribute("viewBox", "-5 0 10 10"); return; }
  var c = caixaDe(tiles, vista), pad = 0.8;
  var x0 = c.u0 - pad, y0 = FLOOR - c.v1 - pad, w = c.u1 - c.u0 + pad * 2, h = Math.max(c.v1 - c.v0, 0.5) + pad * 2;
  svg.setAttribute("viewBox", [x0, y0, w, Math.max(h, FLOOR - y0 + 0.3)].join(" "));
  el("line", { "class": "mini-chao", x1: x0, y1: FLOOR, x2: x0 + w, y2: FLOOR }, svg);
  tiles.map(function (t) { return { t: t, d: profundidadeNaVista(t, vista) }; })
    .sort(function (a, b) { return a.d - b.d; })
    .forEach(function (o) {
      var t = o.t, e = encara(t, vista), q = res(t);
      var g = el("g", { "class": "mini-p" + (t.id === selected ? " sel" : ""), "data-id": t.id, style: "--cor:" + corCab(t) }, svg);
      el("polygon", { "class": "mini-c", points: casco(t, vista).map(function (p) { return p[0] + "," + (FLOOR - p[1]); }).join(" ") }, g);
      if (Math.abs(e) < 0.08) return; // de lado: só o contorno
      var f = el("g", { transform: "matrix(" + afim(t, vista, FLOOR).join(" ") + ")", opacity: e < 0 ? 0.45 : 1 }, g);
      el("rect", { "class": "mini-f", x: 0, y: 0, width: t.w, height: t.h }, f);
      el("path", { "class": "mini-g", d: cabPath(q.cols, q.rows, q.mw, q.mh) }, f);
    });
}

// só a seleção mudou: troca a marca sem redesenhar
export function marcarMini(svg) {
  Array.prototype.forEach.call(svg.querySelectorAll(".mini-p"), function (g) { g.classList.toggle("sel", g.getAttribute("data-id") === selected); });
}
