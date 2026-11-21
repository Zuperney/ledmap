// Ferramentas de desenho do Palco: Painel (P) e Medir (M).
// - Painel: arrastar no desenho cria um painel na medida de gabinetes inteiros do gabinete escolhido na barra de cima
//   (na Frente ou na Atrás, onde o painel fica de frente para quem olha). O canto onde começou encaixa no passo e,
//   com o ímã, nos cantos dos outros painéis e no 0. Um clique no vazio abre a janela com mais opções.
// - Medir: arrastar de um ponto a outro mostra a distância no plano da vista e quanto anda em cada eixo do palco
//   (X, altura ou recuo). Encaixa nos cantos dos painéis e no 0; Shift deixa reto. A medida fica até o próximo
//   arrasto, trocar de ferramenta ou Esc.
import { svgM, FLOOR, vistaM, tiles, el, text, fmt } from "./core.js";
import { GABINETES, GAB, gabPadrao } from "./gabinetes.js";
import { casco, eixosDaVista, VISTAS } from "./espaco.js";
import { criarPainelEm, openAdd } from "./telas.js";
import { pmsg } from "./exportar.js";

function $(id) { return document.getElementById(id); }
function ferr() { return document.body.dataset.ferr || ""; }
function noPalco() { return document.body.getAttribute("data-aba") === "m" && !document.body.classList.contains("rig-3d"); }
function mundo(e) { var p = svgM.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; var w = p.matrixTransform(svgM.getScreenCTM().inverse()); return { u: w.x, v: FLOOR - w.y }; }
function pxPorM() { var b = svgM.viewBox.baseVal; return (svgM.getBoundingClientRect().width || 1) / (b.width || 1); }

// pontos de encaixe: os cantos de todos os painéis na vista e a origem
function encaixes() {
  var l = [{ u: 0, v: 0 }];
  tiles.forEach(function (t) { if (!t.oc) casco(t, vistaM).forEach(function (p) { l.push({ u: p[0], v: p[1] }); }); });
  return l;
}
// encaixa no ponto mais perto (até 12 px na tela); senão, no passo da grade (só a ferramenta Painel)
function encaixar(p, passo) {
  var lim = 12 / pxPorM(), melhor = null, dm = lim;
  encaixes().forEach(function (q) { var d = Math.hypot(q.u - p.u, q.v - p.v); if (d < dm) { dm = d; melhor = q; } });
  if (melhor) return { u: melhor.u, v: melhor.v, ima: true };
  return passo ? { u: Math.round(p.u / passo) * passo, v: Math.round(p.v / passo) * passo } : p;
}
function num(v) { v = Math.round(v * 1000) / 1000 || 0; return (v < 0 ? "−" : "") + fmt(Math.abs(v)); }

var camada = null, acao = null;
function limpar() { if (camada) camada.textContent = ""; }
function garantirCamada() { if (!camada || !camada.parentNode) camada = el("g", { "class": "desenho" }, svgM); svgM.appendChild(camada); return camada; }

// ---- Painel ----
function gabEscolhido() { var s = $("m-pcab"); return (s && GAB[s.value]) || gabPadrao(); }
function retangulo(a, b, g) {
  var du = b.u - a.u, dv = b.v - a.v;
  var cols = Math.max(1, Math.round(Math.abs(du) / g.mw)), rows = Math.max(1, Math.round(Math.abs(dv) / g.mh));
  var w = Math.round(cols * g.mw * 1000) / 1000, h = Math.round(rows * g.mh * 1000) / 1000;
  var u0 = du < 0 ? a.u - w : a.u, v0 = dv < 0 ? a.v - h : a.v;
  return { u0: u0, v0: v0, w: w, h: h, cols: cols, rows: rows };
}
function desenharRet(r) {
  var c = garantirCamada(); c.textContent = "";
  el("rect", { "class": "fantasma", x: r.u0, y: FLOOR - r.v0 - r.h, width: r.w, height: r.h }, c);
  text(c, "medida-t", r.u0 + r.w / 2, FLOOR - r.v0 - r.h - 0.2, 0.42, fmt(r.w) + " × " + fmt(r.h) + " m · " + r.cols + " × " + r.rows + " gab.").setAttribute("text-anchor", "middle");
}

// ---- Medir ----
function desenharMedida(a, b) {
  var c = garantirCamada(); c.textContent = "";
  var E = eixosDaVista(vistaM), du = b.u - a.u, dv = b.v - a.v, d = Math.hypot(du, dv);
  el("line", { "class": "medida", x1: a.u, y1: FLOOR - a.v, x2: b.u, y2: FLOOR - b.v }, c);
  [a, b].forEach(function (p) { el("circle", { "class": "medida-p", cx: p.u, cy: FLOOR - p.v, r: 0.08 }, c); });
  var partes = [];
  if (Math.abs(du) > 0.0005) partes.push("Δ" + E.h.nome + " " + num(du * E.h.k));
  if (Math.abs(dv) > 0.0005) partes.push("Δ" + E.v.nome + " " + num(dv * E.v.k));
  var t = text(c, "medida-t", (a.u + b.u) / 2, FLOOR - (a.v + b.v) / 2 - 0.25, 0.42, fmt(Math.round(d * 1000) / 1000) + " m" + (partes.length > 1 ? " · " + partes.join(" · ") : ""));
  t.setAttribute("text-anchor", "middle");
  $("m-medida").textContent = "Medida: " + fmt(Math.round(d * 1000) / 1000) + " m" + (partes.length ? " (" + partes.join(", ") + ")" : "") + " · " + VISTAS[vistaM].nome;
}

function inicio(e) {
  if (!noPalco() || e.button !== 0 || (ferr() !== "painel" && ferr() !== "medir")) return;
  if (document.querySelector(".stage.arrastavel")) return; // Espaço segurado: é o arrastar da vista
  var p = mundo(e), passo = Number($("m-snap").value) || 0.5;
  acao = { tipo: ferr(), a: encaixar(p, ferr() === "painel" ? passo : 0), sx: e.clientX, sy: e.clientY, moveu: false, alvo: e.target };
  try { svgM.setPointerCapture(e.pointerId); } catch (er) {}
  e.preventDefault(); e.stopPropagation();
}
function mover(e) {
  if (!acao) return;
  if (!acao.moveu && Math.hypot(e.clientX - acao.sx, e.clientY - acao.sy) < 5) return;
  acao.moveu = true;
  var p = mundo(e);
  if (acao.tipo === "medir") {
    var b = encaixar(p, 0);
    if (e.shiftKey) { if (Math.abs(b.u - acao.a.u) > Math.abs(b.v - acao.a.v)) b = { u: b.u, v: acao.a.v }; else b = { u: acao.a.u, v: b.v }; }
    acao.b = b; desenharMedida(acao.a, b);
  } else {
    acao.r = retangulo(acao.a, p, gabEscolhido()); desenharRet(acao.r);
  }
}
function fim() {
  var a = acao; acao = null;
  if (!a) return;
  if (a.tipo === "medir") return; // a medida fica à vista
  limpar();
  var naFrente = vistaM === "frente" || vistaM === "tras";
  if (!a.moveu) {
    if (!(a.alvo.closest && a.alvo.closest(".scr"))) openAdd(); // clique no vazio: a janela com mais opções
    return;
  }
  if (!naFrente) { pmsg("Desenhe o painel na Frente ou na Atrás (lá ele fica de frente). Nas outras vistas use a janela (clique no vazio)."); return; }
  var g = gabEscolhido(), r = a.r;
  if (!g || !r) return;
  // da vista para o palco: na Atrás o X da tela é espelhado
  var x0 = vistaM === "tras" ? -(r.u0 + r.w) : r.u0;
  var erro = criarPainelEm(r.w, r.h, x0, r.v0, g.id);
  if (erro) pmsg(erro);
}

export function preencherGabPainel() {
  var s = $("m-pcab");
  if (!s) return;
  var v = s.value; s.textContent = "";
  GABINETES.forEach(function (g) { var o = document.createElement("option"); o.value = g.id; o.textContent = g.nome + " · " + fmt(g.mw * 100) + "×" + fmt(g.mh * 100) + " cm"; s.appendChild(o); });
  s.value = GAB[v] ? v : ((gabPadrao() || {}).id || "");
}

export function init() {
  preencherGabPainel();
  svgM.addEventListener("pointerdown", inicio, true); // antes do laço e do arrasto de painel
  svgM.addEventListener("pointermove", mover);
  svgM.addEventListener("pointerup", fim);
  svgM.addEventListener("pointercancel", function () { acao = null; limpar(); });
  // trocar de ferramenta, de vista ou de aba apaga a medida; Esc também
  new MutationObserver(function () { if (ferr() !== "medir") { limpar(); $("m-medida").textContent = ""; } })
    .observe(document.body, { attributes: true, attributeFilter: ["data-ferr", "data-aba", "class"] });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && ferr() === "medir") { limpar(); $("m-medida").textContent = ""; } });
}
