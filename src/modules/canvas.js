import { el, svgC, CW, CH, text, tiles, res, cabPath, fmt, gC, blocosDe } from "./core.js";
import { onDown } from "./canvas-edicao.js";
import { corCab } from "./gabinetes.js";
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
      var g0 = el("g", { "class": "scr edit", "data-id": s.id, style: "--cor:" + corCab(s) }, layerC);
      var rs0 = res(s), bls = blocosDe(s);
      gC[s.id] = g0;
      g0.addEventListener("pointerdown", function (e) { onDown(e, s); });
      // um desenho por bloco do mapa de pixels (sem divisão, o painel inteiro), no lugar dele em relação ao painel
      bls.forEach(function (b, bi) {
      var g = el("g", { transform: "translate(" + (b.x - s.cx) + " " + (b.y - s.cy) + ")" }, g0), bc = b.c1 - b.c0, br = b.r1 - b.r0;
      var rs = { w: b.w, h: b.h, cols: bc, rows: br, cw: rs0.cw, ch: rs0.ch, n: 0 };
      el("rect", { "class": "body", x: 0, y: 0, width: rs.w, height: rs.h }, g);
      el("path", { "class": "cab", d: cabPath(bc, br, rs.cw, rs.ch) }, g);
      Object.keys(rs0.fora).forEach(function (k) { var p = k.split(":"), c = Number(p[0]), r = Number(p[1]); if (c >= b.c0 && c < b.c1 && r >= b.r0 && r < b.r1) el("rect", { "class": "furo", x: (c - b.c0) * rs.cw, y: (r - b.r0) * rs.ch, width: rs.cw, height: rs.ch }, g); });
      for (var rr = b.r0; rr < b.r1; rr++) for (var cc = b.c0; cc < b.c1; cc++) if (!rs0.fora[cc + ":" + rr]) rs.n++;
      var gab = rs.n < bc * br ? rs.n + " gab." : bc + " × " + br + " gab.";
      var num = bls.length > 1 ? s.id + "·" + (bi + 1) : s.id;
      if (bls.length > 1) gab = "bloco " + (bi + 1) + "/" + bls.length + " · " + gab;
      if (rs.h >= 600 && rs.w >= 600) {
        el("circle", { "class": "badge", cx: rs.w / 2, cy: rs.h / 2 - 170, r: 125 }, g);
        text(g, "num", rs.w / 2, rs.h / 2 - 166, 170, num);
        text(g, "dim-t", rs.w / 2, rs.h / 2 + 55, 80, rs.w + " × " + rs.h + " px");
        text(g, "dim-t", rs.w / 2, rs.h / 2 + 165, 74, fmt(s.w) + " × " + fmt(s.h) + " m");
        text(g, "dim-t", rs.w / 2, rs.h / 2 + 265, 70, gab);
      } else if (rs.h >= 600) {
        el("circle", { "class": "badge", cx: rs.w / 2, cy: rs.h / 2 - 160, r: 110 }, g);
        text(g, "num", rs.w / 2, rs.h / 2 - 156, 140, num);
        text(g, "dim-t", rs.w / 2, rs.h / 2 + 50, 70, rs.w + "×" + rs.h);
        text(g, "dim-t", rs.w / 2, rs.h / 2 + 140, 60, (rs.n < rs.cols * rs.rows ? rs.n : rs.cols + "×" + rs.rows) + " gab");
      } else {
        el("circle", { "class": "badge", cx: 120, cy: rs.h / 2, r: 90 }, g);
        text(g, "num", 120, rs.h / 2 + 4, num.length > 3 ? 90 : 120, num);
        text(g, "dim-t", (rs.w + 240) / 2, rs.h / 2, 70, rs.w + " × " + rs.h + " px · " + (bls.length > 1 ? gab : fmt(s.w) + " × " + fmt(s.h) + " m · " + (rs.n < rs.cols * rs.rows ? rs.n : rs.cols + "×" + rs.rows) + " gab"));
      }
      });
    });
  boxes = el("g", {}, svgC);
  guideV = el("line", { "class": "guide off", x1: 0, y1: 0, x2: 0, y2: CH }, svgC);
  guideH = el("line", { "class": "guide off", x1: 0, y1: 0, x2: CW, y2: 0 }, svgC);
}

export { boxes, occupied, guideV, guideH };
