import { tiles, FLOOR, svgM, el, gM, fmt, text, res, cabPath, selected, paineis, membrosPainel, pnome, sobrepoem, vistaM } from "./core.js";
import { corCab } from "./gabinetes.js";
import { editM, onDownM, toggleMselM, limparMselM, modoSelM, ignorarCliqueM } from "./rig-edicao.js";
import { select } from "./tabela.js";
import { VISTAS, afim, casco, caixaDe, encara, profundidadeNaVista, temGiro } from "./espaco.js";
import { avisar3D } from "./ponte3d.js";

let gridM, floorLine, eixoM, regua, boundsM, layerM, guideMV, guideMH, pnLayer;

// O Rig desenha o palco pela vista escolhida (Frente, Topo, Esquerda, Direita). Na tela: x = U da vista e
// y = FLOOR − V (V para cima). Na Frente sem giro é o desenho de sempre (x = metros, chão no FLOOR).
// Cada painel tem o contorno da caixa projetada e a frente (gabinetes, recortes, rótulos) com a afim da vista;
// visto de lado (a frente vira uma linha) fica só o contorno, com o número.
var faceM = {}, cascoM = {}, rotM = {}, ztM = {};

// legenda da vista, embaixo à esquerda: o que é a linha do zero e para onde fica o público
var LEGENDA = {
  frente: "chão · olhando do público",
  topo: "frente do palco (recuo 0) · para cima = fundo · olhando de cima",
  esq: "chão · olhando da esquerda · público →",
  dir: "chão · olhando da direita · ← público"
};

export function fitM() {
  var b = boundsM, temp = tiles.length ? caixaDe(tiles, vistaM) : null;
  // o 0 (centro do palco, ou a frente nas laterais) fica no meio: a área é simétrica em volta dele
  var meia = temp ? Math.max(14, Math.ceil(Math.max(-temp.u0, temp.u1)) + 1) : 14;
  var topY = temp ? FLOOR - temp.v1 : FLOOR, botY = temp ? FLOOR - temp.v0 : FLOOR;
  b.x0 = -meia; b.x1 = meia;
  b.y0 = Math.min(-0.5, Math.floor(topY) - 1); b.y1 = Math.max(10, Math.ceil(botY) + 1.5);
  // preenche a altura da área do desenho: com a tela larga, a proporção do palco deixaria uma faixa vazia embaixo.
  // A área cresce para cima (mais grade acima dos painéis), no zoom 100% (largura do SVG = largura da área, mín. 680 px)
  var st = svgM.parentNode, W = Math.max(st.clientWidth || 0, 680), H = parseFloat(getComputedStyle(st).maxHeight);
  if (st.clientWidth && isFinite(H) && H > 0) { var alto = (b.x1 - b.x0) * H / W; if (b.y1 - b.y0 < alto) b.y0 = b.y1 - alto; }
  svgM.setAttribute("viewBox", [b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0].join(" "));
  gridM.textContent = "";
  var gx0 = -meia + 1, gx1 = meia - 1;
  var gy0 = Math.min(0, Math.floor(topY), Math.ceil(b.y0)), gy1 = Math.max(FLOOR, Math.ceil(botY));
  var k;
  for (k = gx0; k <= gx1; k++) el("line", { x1: k, y1: gy0, x2: k, y2: gy1 }, gridM);
  for (k = gy0; k <= gy1; k++) el("line", { x1: gx0, y1: k, x2: gx1, y2: k }, gridM);
  floorLine.setAttribute("x1", gx0); floorLine.setAttribute("x2", gx1);
  eixoM.setAttribute("y1", gy0 - 0.5); eixoM.setAttribute("y2", gy1);
  // régua: metros a cada 5 m a partir do 0 (negativos à esquerda) e, na borda esquerda, a altura (ou o recuo, no Topo)
  regua.textContent = "";
  for (k = -Math.floor(gx1 / 5) * 5; k <= gx1; k += 5) text(regua, "tick", k, FLOOR + 0.8, 0.5, (k < 0 ? "−" + -k : k) + " m").setAttribute("text-anchor", "middle");
  for (k = 2; k <= FLOOR - gy0; k += 2) text(regua, "tick", gx0 - 0.15, FLOOR - k + 0.18, 0.45, k).setAttribute("text-anchor", "end");
  for (k = -2; k >= FLOOR - gy1; k -= 2) text(regua, "tick", gx0 - 0.15, FLOOR - k + 0.18, 0.45, "−" + -k).setAttribute("text-anchor", "end");
  tiles.forEach(placeM);
  reordenarM();
  desenharPaineis();
  statM();
}

// quem está mais longe de quem olha é desenhado primeiro (fica atrás)
export function reordenarM() {
  tiles.map(function (t) { return { t: t, d: profundidadeNaVista(t, vistaM) }; })
    .sort(function (a, b) { return a.d - b.d; })
    .forEach(function (o) { layerM.appendChild(gM[o.t.id]); });
}

export function statM() {
  var bad = {}, nb = 0;
  tiles.forEach(function (a, i) {
    tiles.forEach(function (b, j) {
      if (j <= i) return;
      if (sobrepoem(a, b)) { bad[a.id] = bad[b.id] = true; }
    });
  });
  tiles.forEach(function (t) { if (bad[t.id]) nb++; gM[t.id].classList.toggle("overlap", !!bad[t.id]); });
  var vazio = document.getElementById("m-vazio");
  if (vazio) vazio.hidden = !!tiles.length;
  if (!tiles.length) { document.getElementById("stat-m").textContent = "Sem painéis"; return; }
  var c = caixaDe(tiles, vistaM), V = VISTAS[vistaM];
  document.getElementById("stat-m").innerHTML = "<b>" + V.nome + "</b> (" + LEGENDA[vistaM] + ") · conjunto <b>" + fmt(c.u1 - c.u0) + " m</b> de " + (V.h === "X" ? "largura" : "fundo") + " × <b>" + fmt(c.v1 - c.v0) + " m</b> de " + V.vt +
    (nb ? ' · <span class="warn">' + nb + " painéis sobrepostos</span>" : "");
}

// contorno tracejado de cada grupo de painel, com nome e medida do conjunto (na vista)
export function desenharPaineis() {
  if (!pnLayer) return;
  pnLayer.textContent = "";
  paineis.forEach(function (p) {
    var m = membrosPainel(p.id);
    if (!m.length) return;
    var c = caixaDe(m, vistaM), gabs = {};
    m.forEach(function (t) { gabs[t.cab] = 1; });
    var on = selected && m.some(function (t) { return t.id === selected; }), pad = 0.12;
    el("rect", { "class": "pnbox" + (on ? " active" : ""), x: c.u0 - pad, y: FLOOR - c.v1 - pad, width: c.u1 - c.u0 + pad * 2, height: c.v1 - c.v0 + pad * 2 }, pnLayer);
    text(pnLayer, "pnl" + (on ? " active" : ""), c.u0 - pad, FLOOR - c.v1 - pad - 0.15, 0.36, pnome(p) + " · " + fmt(c.u1 - c.u0) + " × " + fmt(c.v1 - c.v0) + " m · " + Object.keys(gabs).length + (Object.keys(gabs).length === 1 ? " gabinete" : " gabinetes"));
  });
}

// gabinetes recortados: a célula é apagada (cor do fundo) e fica só um contorno tracejado
var furosM = {};
export function desenharFurosM(t) {
  var gF = furosM[t.id];
  if (!gF) return;
  gF.textContent = "";
  var q = res(t);
  Object.keys(q.fora).forEach(function (k) {
    var p = k.split(":");
    el("rect", { "class": "furo", x: Number(p[0]) * q.mw, y: Number(p[1]) * q.mh, width: q.mw, height: q.mh }, gF);
  });
}

// põe o painel na vista atual: contorno, frente (afim) e rótulo de quando ele está de lado
export function placeM(t) {
  var g = gM[t.id], f = faceM[t.id];
  if (!g || !f) return;
  avisar3D(); // toda mudança de lugar, recuo ou giro passa por aqui
  var e = encara(t, vistaM), deLado = Math.abs(e) < 0.08;
  f.setAttribute("transform", "matrix(" + afim(t, vistaM, FLOOR).join(" ") + ")");
  f.style.display = deLado ? "none" : "";
  var pts = casco(t, vistaM);
  cascoM[t.id].setAttribute("points", pts.map(function (p) { return p[0] + "," + (FLOOR - p[1]); }).join(" "));
  var cx = 0, cy = 0;
  pts.forEach(function (p) { cx += p[0]; cy += FLOOR - p[1]; });
  rotM[t.id].setAttribute("x", cx / pts.length); rotM[t.id].setAttribute("y", cy / pts.length);
  var z = t.z || 0;
  // recuo só faz sentido como etiqueta num painel sem giro (girado, ele é posição no palco, mostrada no Topo)
  ztM[t.id].textContent = z && !temGiro(t) ? (z > 0 ? "recuo " : "avanço ") + fmt(Math.abs(z)) + " m" : "";
  var sem = !temGiro(t) && vistaM === "frente";
  g.classList.toggle("de-lado", deLado);
  g.classList.toggle("obliquo", !deLado && Math.abs(e) < 0.7); // muito de lado: os textos da frente ficariam tortos
  g.classList.toggle("costas", e < -0.08);
  g.classList.toggle("girado", temGiro(t));
  // recuo/avanço tracejado só faz sentido olhando de frente um painel sem giro
  g.classList.toggle("fundo", sem && (t.z || 0) > 0);
  g.classList.toggle("frente", sem && (t.z || 0) < 0);
}

export function init() {
  gridM = el("g", { "class": "grid", id: "grid-m" }, svgM);
  floorLine = el("line", { "class": "floor", x1: -13, y1: FLOOR, x2: 13, y2: FLOOR }, svgM);
  eixoM = el("line", { "class": "eixo0", x1: 0, y1: -0.5, x2: 0, y2: FLOOR }, svgM);
  regua = el("g", {}, svgM);
  boundsM = { x0: -14, x1: 14, y0: -0.5, y1: 10 };
  layerM = el("g", {}, svgM);
  tiles.forEach(function (s) {
    var g = el("g", { "class": "scr", "data-id": s.id, style: "--cor:" + corCab(s) }, layerM);
    cascoM[s.id] = el("polygon", { "class": "casco" }, g);
    var f = el("g", { "class": "face" }, g);
    faceM[s.id] = f;
    var rs = res(s), tall = s.h >= 3;
    el("rect", { "class": "body", x: 0, y: 0, width: s.w, height: s.h }, f);
    el("path", { "class": "cab", d: cabPath(rs.cols, rs.rows, rs.mw, rs.mh) }, f);
    furosM[s.id] = el("g", { "class": "furos" }, f);
    desenharFurosM(s);
    ztM[s.id] = text(f, "ztag", s.w - 0.08, 0.32, 0.26, "");
    ztM[s.id].setAttribute("text-anchor", "end");
    var r = tall ? 0.6 : (s.w < 2 ? 0.45 : 0.38);
    var fs = tall ? 0.85 : (s.w < 2 ? 0.6 : 0.5);
    var bx = s.w / 2, by = s.h / 2;
    if (s.w >= 3 && tall) by = s.h / 2 - 0.7;
    if (s.w >= 3 && !tall) bx = 0.6;
    el("circle", { "class": "badge", cx: bx, cy: by, r: r }, f);
    text(f, "num", bx, by + 0.03, fs, s.id);
    if (s.w >= 3 && tall) {
      text(f, "dim-t", s.w / 2, s.h / 2 + 0.3, 0.5, fmt(s.w) + " × " + fmt(s.h) + " m");
      text(f, "dim-t", s.w / 2, s.h / 2 + 0.95, 0.42, rs.w + " × " + rs.h + " px");
      text(f, "dim-t", s.w / 2, s.h / 2 + 1.5, 0.42, (rs.n < rs.cols * rs.rows ? rs.n + " gab. (recortado)" : rs.cols + " × " + rs.rows + " gab."));
    } else if (s.w >= 3) {
      var lbl = fmt(s.w) + " × " + fmt(s.h) + " m · " + rs.w + "×" + rs.h;
      text(f, "dim-t", (s.w + 1.1) / 2, s.h / 2, Math.min(0.45, (s.w - 1.3) / (lbl.length * 0.62)), lbl);
    }
    rotM[s.id] = text(g, "lado-t", 0, 0, 0.42, s.id);
    gM[s.id] = g;
    g.addEventListener("click", function (e) {
      if (ignorarCliqueM()) return; // acabou de arrastar ou laçar
      if (e.shiftKey || e.ctrlKey || e.metaKey || modoSelM()) { toggleMselM(s.id); return; }
      if (!editM) { limparMselM(); select(selected === s.id ? null : s.id); }
    });
    g.addEventListener("pointerdown", function (e) { onDownM(e, s); });
  });
  tiles.forEach(placeM);
  reordenarM();
  pnLayer = el("g", { "class": "pnlayer" }, svgM);
  // a janela mudou de largura (ou a coluna das miniaturas/cartão abriu): refaz a área para continuar preenchendo
  var larg = 0, espera = null;
  new ResizeObserver(function () {
    var w = svgM.parentNode.clientWidth;
    if (!w || Math.abs(w - larg) < 2) return;
    larg = w; clearTimeout(espera); espera = setTimeout(fitM, 80);
  }).observe(svgM.parentNode);
  guideMV = el("line", { "class": "guide off", x1: 0, y1: -100, x2: 0, y2: 100 }, svgM);
  guideMH = el("line", { "class": "guide off", x1: -100, y1: 0, x2: 100, y2: 0 }, svgM);
}

export { boundsM, guideMV, guideMH, faceM };
