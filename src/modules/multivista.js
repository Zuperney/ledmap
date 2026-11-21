// Multiview do Palco: o desenho principal (o que edita) e mais 1 ou 3 vistas ao lado, ao vivo, só para olhar.
// O botão na barra lateral das vistas alterna 1 → 2 → 4 vistas (fica guardado no aparelho). As vistas de apoio
// acompanham cada mudança (arrastar, girar, cartão); tocar num painel nelas seleciona; o botão "Editar aqui" (ou duplo
// clique) troca: aquela vista vira a principal e a de antes vai para o apoio.
import { tiles, FLOOR, res, cabPath, selected, el, vistaM, fmt } from "./core.js";
import { corCab } from "./gabinetes.js";
import { afim, casco, caixaDe, encara, profundidadeNaVista, eixosDaVista, VISTAS } from "./espaco.js";
import { ouvirRig } from "./ponte3d.js";
import { irParaVista } from "./vistas.js";
import { select } from "./tabela.js";

function $(id) { return document.getElementById(id); }
var CHAVE = "ledmap-multiview", n = 1, caixas = [];
// as vistas de apoio, na ordem de preferência (a principal sai da lista)
var PREF = ["frente", "topo", "dir", "esq", "tras"];
function apoio() { return PREF.filter(function (v) { return v !== vistaM; }).slice(0, n - 1); }

// desenho de uma vista de apoio: chão e eixo com as cores do palco, contorno e frente de cada painel (sem textos)
function desenhar(svg, vista) {
  svg.textContent = "";
  var vis = tiles.filter(function (t) { return !t.oc; });
  if (!vis.length) { svg.setAttribute("viewBox", "-5 0 10 10"); return; }
  var c = caixaDe(vis, vista), pad = 0.8, E = eixosDaVista(vista);
  var x0 = Math.min(c.u0, 0) - pad, x1 = Math.max(c.u1, 0) + pad, yTop = FLOOR - Math.max(c.v1, 0) - pad, yBot = FLOOR - Math.min(c.v0, 0) + pad;
  svg.setAttribute("viewBox", [x0, yTop, x1 - x0, yBot - yTop].join(" "));
  el("line", { "class": "mv-eixo eixo-" + E.h.nome.toLowerCase(), x1: x0, y1: FLOOR, x2: x1, y2: FLOOR }, svg);
  el("line", { "class": "mv-eixo eixo-" + E.v.nome.toLowerCase(), x1: 0, y1: yTop, x2: 0, y2: yBot }, svg);
  vis.map(function (t) { return { t: t, d: profundidadeNaVista(t, vista) }; })
    .sort(function (a, b) { return a.d - b.d; })
    .forEach(function (o) {
      var t = o.t, e = encara(t, vista), q = res(t);
      var g = el("g", { "class": "mv-p" + (t.id === selected ? " sel" : ""), "data-id": t.id, style: "--cor:" + corCab(t) }, svg);
      el("polygon", { "class": "mv-c", points: casco(t, vista).map(function (p) { return p[0] + "," + (FLOOR - p[1]); }).join(" ") }, g);
      if (Math.abs(e) < 0.08) return; // de lado: só o contorno
      var f = el("g", { transform: "matrix(" + afim(t, vista, FLOOR).join(" ") + ")", opacity: e < 0 ? 0.45 : 1 }, g);
      el("rect", { "class": "mv-f", x: 0, y: 0, width: t.w, height: t.h }, f);
      el("path", { "class": "mv-g", d: cabPath(q.cols, q.rows, q.mw, q.mh) }, f);
    });
}

function montar() {
  var mw = document.querySelector("#view-m .mwrap");
  if (!mw) return;
  caixas.forEach(function (b) { b.el.remove(); });
  caixas = [];
  mw.classList.toggle("mv-2", n === 2);
  mw.classList.toggle("mv-4", n === 4);
  apoio().forEach(function (v) {
    var box = document.createElement("div"); box.className = "mv";
    var cab = document.createElement("div"); cab.className = "mv-t";
    var nome = document.createElement("b"); nome.textContent = VISTAS[v].nome;
    var bt = document.createElement("button"); bt.type = "button"; bt.className = "btn"; bt.textContent = "Editar aqui";
    bt.title = "Esta vista vira a principal (a de agora vem para cá)";
    bt.addEventListener("click", function () { irParaVista(v); });
    cab.appendChild(nome); cab.appendChild(bt);
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "mv-svg"); svg.setAttribute("role", "img"); svg.setAttribute("aria-label", "Vista " + VISTAS[v].nome + " (só para olhar)");
    svg.addEventListener("click", function (e) { var g = e.target.closest && e.target.closest(".mv-p"); if (g) select(g.getAttribute("data-id")); });
    svg.addEventListener("dblclick", function () { irParaVista(v); });
    box.appendChild(cab); box.appendChild(svg);
    mw.appendChild(box);
    caixas.push({ el: box, svg: svg, vista: v });
  });
  redesenhar();
  // o desenho principal mudou de tamanho: refaz a área e enquadra os painéis nele
  requestAnimationFrame(function () { window.dispatchEvent(new Event("resize")); var z = $("m-zfit"); if (z && !document.body.classList.contains("rig-3d")) z.click(); });
}

var quadro = 0;
function redesenhar() {
  if (quadro) return;
  quadro = requestAnimationFrame(function () { quadro = 0; caixas.forEach(function (b) { desenhar(b.svg, b.vista); }); });
}
function marcar() { caixas.forEach(function (b) { Array.prototype.forEach.call(b.svg.querySelectorAll(".mv-p"), function (g) { g.classList.toggle("sel", g.getAttribute("data-id") === selected); }); }); }

function atualizarBotao() {
  var b = $("m-multi");
  if (!b) return;
  b.setAttribute("aria-pressed", String(n > 1));
  b.querySelector(".k").textContent = n === 1 ? "1" : n;
  b.title = "Multiview: " + (n === 1 ? "só a vista principal" : n + " vistas lado a lado") + " · clique para " + (n === 1 ? "2" : n === 2 ? "4" : "1");
}
export function alternarMultiview() {
  n = n === 1 ? 2 : n === 2 ? 4 : 1;
  try { localStorage.setItem(CHAVE, String(n)); } catch (e) {}
  atualizarBotao(); montar();
}

export function init() {
  try { var s = Number(localStorage.getItem(CHAVE)); if (s === 2 || s === 4) n = s; } catch (e) {}
  var nav = $("m-vistas");
  if (nav) {
    var d = document.createElement("span"); d.className = "p-div"; nav.appendChild(d);
    var b = document.createElement("button"); b.type = "button"; b.className = "vbtn"; b.id = "m-multi";
    b.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3" y="4" width="8" height="7" rx="1"/><rect x="13" y="4" width="8" height="7" rx="1"/><rect x="3" y="13" width="8" height="7" rx="1"/><rect x="13" y="13" width="8" height="7" rx="1"/></svg><span class="k">1</span>';
    b.setAttribute("aria-label", "Multiview");
    b.addEventListener("click", alternarMultiview);
    nav.appendChild(b);
  }
  atualizarBotao();
  // a vista principal trocou: as de apoio se refazem (a de antes entra, a nova sai)
  var ultima = vistaM;
  ouvirRig(function (o) {
    if (o === "sel") { marcar(); return; }
    if (vistaM !== ultima) { ultima = vistaM; if (n > 1) montar(); return; }
    redesenhar();
  });
  if (n > 1) montar();
}
