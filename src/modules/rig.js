import { tiles, FLOOR, svgM, el, gM, fmt, text, res, cabPath, selected } from "./core.js";
import { editM, onDownM } from "./rig-edicao.js";
import { select } from "./tabela.js";
let i;

let gridM, floorLine, boundsM, layerM, guideMV, guideMH;

export function fitM() {
    var minX = Infinity, maxX = -Infinity, topY = Infinity, botY = -Infinity;
    tiles.forEach(function (t) {
      minX = Math.min(minX, t.mx); maxX = Math.max(maxX, t.mx + t.w);
      topY = Math.min(topY, FLOOR - t.my - t.h); botY = Math.max(botY, FLOOR - t.my);
    });
    var b = boundsM;
    b.x0 = Math.min(-1, Math.floor(minX) - 1); b.x1 = Math.max(28, Math.ceil(maxX) + 1);
    b.y0 = Math.min(-0.5, Math.floor(topY) - 1); b.y1 = Math.max(10, Math.ceil(botY) + 1.5);
    svgM.setAttribute("viewBox", [b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0].join(" "));
    gridM.textContent = "";
    var gx0 = Math.min(-1, Math.floor(minX)), gx1 = Math.max(28, Math.ceil(maxX));
    var gy0 = Math.min(0, Math.floor(topY)), gy1 = Math.max(FLOOR, Math.ceil(botY));
    var k;
    for (k = gx0; k <= gx1; k++) el("line", { x1: k, y1: gy0, x2: k, y2: gy1 }, gridM);
    for (k = gy0; k <= gy1; k++) el("line", { x1: gx0, y1: k, x2: gx1, y2: k }, gridM);
    floorLine.setAttribute("x1", gx0); floorLine.setAttribute("x2", gx1);
    statM();
  }

export function statM() {
    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    tiles.forEach(function (t) {
      minX = Math.min(minX, t.mx); maxX = Math.max(maxX, t.mx + t.w);
      minY = Math.min(minY, t.my); maxY = Math.max(maxY, t.my + t.h);
    });
    var bad = {}, nb = 0, e = 0.001;
    tiles.forEach(function (a, i) {
      tiles.forEach(function (b, j) {
        if (j <= i) return;
        if (a.mx < b.mx + b.w - e && b.mx < a.mx + a.w - e && a.my < b.my + b.h - e && b.my < a.my + a.h - e) { bad[a.id] = bad[b.id] = true; }
      });
    });
    tiles.forEach(function (t) { if (bad[t.id]) nb++; gM[t.id].classList.toggle("overlap", !!bad[t.id]); });
    if (!tiles.length) { document.getElementById("stat-m").textContent = "Sem telas · ⋮ → + Adicionar tela"; return; }
    document.getElementById("stat-m").innerHTML = "Conjunto: <b>" + fmt(maxX - minX) + " m</b> de largura × <b>" + fmt(maxY - minY) + " m</b> de altura" +
      (nb ? ' · <span class="warn">' + nb + " telas sobrepostas</span>" : "");
  }

export function placeM(t) { gM[t.id].setAttribute("transform", "translate(" + t.mx + " " + (FLOOR - t.my - t.h) + ")"); }

export function init() {
  gridM = el("g", { "class": "grid", id: "grid-m" }, svgM);
  floorLine = el("line", { "class": "floor", x1: -1, y1: FLOOR, x2: 28, y2: FLOOR }, svgM);
  boundsM = { x0: -1, x1: 28, y0: -0.5, y1: 10 };
  for (i = 0; i <= 25; i += 5) text(svgM, "tick", i, FLOOR + 0.8, 0.5, i + " m").setAttribute("text-anchor", "middle");
  [2, 4, 6, 8].forEach(function (v) { text(svgM, "tick", -0.85, FLOOR - v + 0.18, 0.45, v); });
  layerM = el("g", {}, svgM);
  tiles.forEach(function (s) {
      var g = el("g", { "class": "scr " + s.kind, transform: "translate(" + s.mx + " " + (FLOOR - s.my - s.h) + ")" }, layerM);
      var rs = res(s), tall = s.h >= 3;
      el("rect", { "class": "body", x: 0, y: 0, width: s.w, height: s.h }, g);
      el("path", { "class": "cab", d: cabPath(rs.cols, rs.rows, 0.5, 0.5) }, g);
      var r = tall ? 0.6 : (s.w < 2 ? 0.45 : 0.38);
      var fs = tall ? 0.85 : (s.w < 2 ? 0.6 : 0.5);
      var bx = s.w / 2, by = s.h / 2;
      if (s.w >= 3 && tall) by = s.h / 2 - 0.7;
      if (s.w >= 3 && !tall) bx = 0.6;
      el("circle", { "class": "badge", cx: bx, cy: by, r: r }, g);
      text(g, "num", bx, by + 0.03, fs, s.id);
      if (s.w >= 3 && tall) {
        text(g, "dim-t", s.w / 2, s.h / 2 + 0.3, 0.5, fmt(s.w) + " × " + fmt(s.h) + " m");
        text(g, "dim-t", s.w / 2, s.h / 2 + 0.95, 0.42, rs.w + " × " + rs.h + " px");
        text(g, "dim-t", s.w / 2, s.h / 2 + 1.5, 0.42, rs.cols + " × " + rs.rows + " gab.");
      } else if (s.w >= 3) {
        text(g, "dim-t", (s.w + 1) / 2, s.h / 2, 0.45, fmt(s.w) + " × " + fmt(s.h) + " m · " + rs.w + "×" + rs.h);
      }
      gM[s.id] = g;
      g.addEventListener("click", function () { if (!editM) select(selected === s.id ? null : s.id); });
      g.addEventListener("pointerdown", function (e) { onDownM(e, s); });
    });
  guideMV = el("line", { "class": "guide off", x1: 0, y1: -100, x2: 0, y2: 100 }, svgM);
  guideMH = el("line", { "class": "guide off", x1: -100, y1: 0, x2: 100, y2: 0 }, svgM);
}

export { boundsM, guideMV, guideMH };
