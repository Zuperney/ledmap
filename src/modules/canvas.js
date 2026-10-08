import { el, svgC, CW, CH, text, tiles, res, cabPath, fmt, gC } from "./core.js";
import { onDown } from "./canvas-edicao.js";
let i;

let gridC, occupied, layerC, boxes, guideV, guideH;

export function init() {
  gridC = el("g", { "class": "grid", id: "grid-c" }, svgC);
  for (i = 0; i <= CW; i += 256) el("line", { x1: i, y1: 0, x2: i, y2: CH }, gridC);
  for (i = 0; i <= CH; i += 256) el("line", { x1: 0, y1: i, x2: CW, y2: i }, gridC);
  el("rect", { "class": "frame", x: 0, y: 0, width: CW, height: CH }, svgC);
  for (i = 0; i <= CW; i += 1024) text(svgC, "tick", i, -50, 80, i === 0 ? "0" : String(i)).setAttribute("text-anchor", i === 0 ? "start" : "middle");
  occupied = el("rect", { "class": "occupied", x: 0, y: 0, width: 0, height: 0 }, svgC);
  layerC = el("g", {}, svgC);
  tiles.forEach(function (s) {
      var g = el("g", { "class": "scr edit " + s.kind }, layerC);
      var rs = res(s);
      el("rect", { "class": "body", x: 0, y: 0, width: rs.w, height: rs.h }, g);
      el("path", { "class": "cab", d: cabPath(rs.cols, rs.rows, rs.px, rs.px) }, g);
      var gab = rs.cols + " × " + rs.rows + " gab.";
      if (rs.h >= 600 && rs.w >= 600) {
        el("circle", { "class": "badge", cx: rs.w / 2, cy: rs.h / 2 - 170, r: 125 }, g);
        text(g, "num", rs.w / 2, rs.h / 2 - 166, 170, s.id);
        text(g, "dim-t", rs.w / 2, rs.h / 2 + 55, 80, rs.w + " × " + rs.h + " px");
        text(g, "dim-t", rs.w / 2, rs.h / 2 + 165, 74, fmt(s.w) + " × " + fmt(s.h) + " m");
        text(g, "dim-t", rs.w / 2, rs.h / 2 + 265, 70, gab);
      } else if (rs.h >= 600) {
        el("circle", { "class": "badge", cx: rs.w / 2, cy: rs.h / 2 - 160, r: 110 }, g);
        text(g, "num", rs.w / 2, rs.h / 2 - 156, 140, s.id);
        text(g, "dim-t", rs.w / 2, rs.h / 2 + 50, 70, rs.w + "×" + rs.h);
        text(g, "dim-t", rs.w / 2, rs.h / 2 + 140, 60, rs.cols + "×" + rs.rows + " gab");
      } else {
        el("circle", { "class": "badge", cx: 120, cy: rs.h / 2, r: 90 }, g);
        text(g, "num", 120, rs.h / 2 + 4, 120, s.id);
        text(g, "dim-t", (rs.w + 240) / 2, rs.h / 2, 70, rs.w + " × " + rs.h + " px · " + fmt(s.w) + " × " + fmt(s.h) + " m · " + rs.cols + "×" + rs.rows + " gab");
      }
      gC[s.id] = g;
      g.addEventListener("pointerdown", function (e) { onDown(e, s); });
    });
  boxes = el("g", {}, svgC);
  guideV = el("line", { "class": "guide off", x1: 0, y1: 0, x2: 0, y2: CH }, svgC);
  guideH = el("line", { "class": "guide off", x1: 0, y1: 0, x2: CW, y2: 0 }, svgC);
}

export { boxes, occupied, guideV, guideH };
