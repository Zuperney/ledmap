// Vistas do Rig: Frente, Topo, Esquerda e Direita, ortogonais (ver espaco.js), e 3D. Todos os painéis aparecem em todas;
// cada vista 2D mostra e edita um plano do palco: Frente (X e altura, giro Z), Topo (X e recuo, giro Y),
// Esquerda/Direita (fundo e altura, giro X). A 3D mostra a montagem no espaço, no lugar do desenho, e acompanha
// as edições do cartão; tocar num painel abre o cartão dele. Navegação ‹ Frente ›: as setas passam pelas 5.
// "Todas as vistas" (Visão ▾): a escolhida fica grande e as outras quatro numa coluna à esquerda, ao vivo; tocar num
// painel numa miniatura o seleciona, tocar no título da miniatura a traz para o lugar da grande.
import { save, set_vistaM, vistaM, selected } from "./core.js";
import { fitM } from "./rig.js";
import { renderCabM, viewM } from "./rig-cabos.js";
import { syncMPanel, setEditM, editM } from "./rig-edicao.js";
import { VISTAS, ORDEM_VISTAS } from "./espaco.js";
import { abrirMenu } from "./menu-contexto.js";
import { registrar3D, ouvirRig } from "./ponte3d.js";
import { pmsg } from "./exportar.js";
import { select } from "./tabela.js";
import { desenharMini, marcarMini } from "./mini.js";

function $(id) { return document.getElementById(id); }

var DICA = {
  frente: "olhando do público: move em X e altura, a alça gira em Z (no próprio plano)",
  topo: "olhando de cima: move em X e recuo, a alça gira em Y (abre em V ou L)",
  esq: "olhando da esquerda: move em fundo e altura, a alça gira em X (inclina)",
  dir: "olhando da direita: move em fundo e altura, a alça gira em X (inclina)",
  "3d": "a montagem no espaço: toque num painel e ajuste posição e giro no cartão"
};
var TODAS = ORDEM_VISTAS.concat(["3d"]);
var CHAVE_3D = "ledmap-rig-3d"; // a vista 3D continua aberta depois das recargas (adicionar, excluir painel…)
var CHAVE_MOSAICO = "ledmap-mosaico"; // preferência do aparelho
var em3D = false, mosaico = false;

export function nomeVista(id) { return id === "3d" ? "3D" : VISTAS[id] ? VISTAS[id].nome : "Frente"; }
function atual() { return em3D ? "3d" : vistaM; }

export function atualizarNav() {
  $("m-vista").textContent = nomeVista(atual()) + " ▾";
  $("m-vista").title = "Vista " + nomeVista(atual()) + ": " + DICA[atual()] + ". Toque para trocar";
  $("m-edit").disabled = em3D; // mover e girar com a alça são do 2D; no 3D, o cartão
  var b = $("m-mosaico");
  if (b) b.setAttribute("aria-pressed", String(mosaico));
}

function guardar(chave, on) { try { if (on) localStorage.setItem(chave, "1"); else localStorage.removeItem(chave); } catch (e) {} }
function guardar3D(on) { try { if (on) sessionStorage.setItem(CHAVE_3D, "1"); else sessionStorage.removeItem(CHAVE_3D); } catch (e) {} }

// ---- onde o 3D fica: na área principal (vista 3D), numa miniatura (mosaico) ou fechado ----
var alvo3D = null, seq3D = 0;
function posicionar3D() {
  var alvo = em3D ? $("svg-m").closest(".stagebox") : mosaico ? celula3D : null;
  if (alvo === alvo3D) return;
  alvo3D = alvo;
  var n = ++seq3D;
  if (!alvo) registrar3D(null);
  // o three.js fica num pedaço à parte: só baixa quando o 3D aparece em algum lugar
  import("./vista3d.js").then(function (m) {
    if (n !== seq3D) return; // mudou de novo enquanto baixava
    m.fechar3DNoRig();
    if (!alvo) return;
    if (!m.abrir3DNoRig(alvo)) { alvo3D = null; if (em3D) { em3D = false; document.body.classList.remove("rig-3d"); guardar3D(false); irParaVista("frente"); } return; }
    registrar3D({ atualizar: m.atualizar3D, marcarSel: m.marcarSel3D });
  }).catch(function () { if (alvo) pmsg("Não consegui carregar a Vista 3D. Confira a conexão e tente de novo."); });
}

function setEm3D(on) {
  em3D = on;
  if (on && editM) setEditM(false);
  document.body.classList.toggle("rig-3d", on);
  guardar3D(on);
}

export function irParaVista(id) {
  if (id === "3d") {
    if (!em3D) setEm3D(true);
  } else {
    if (em3D) setEm3D(false);
    set_vistaM(id);
    fitM(); syncMPanel(); renderCabM(); save();
    if (viewM) viewM.enquadrar();
  }
  atualizarNav();
  montarMosaico();
  posicionar3D();
}

function passo(d) {
  var i = TODAS.indexOf(atual());
  irParaVista(TODAS[(i + d + TODAS.length) % TODAS.length]);
}

export function itensVistas() {
  return TODAS.map(function (id) {
    return { t: (id === atual() ? "● " : "○ ") + nomeVista(id) + " · " + DICA[id], fn: function () { irParaVista(id); } };
  });
}

// ---- mosaico: faixa com as quatro vistas que não estão na área principal ----
var faixa = null, celula3D = null, minis = [];
function montarMosaico() {
  if (!faixa) {
    faixa = document.createElement("div");
    faixa.id = "m-mini";
    faixa.className = "mini-faixa";
    $("view-m").querySelector(".mwrap").prepend(faixa); // coluna à esquerda do desenho (embaixo, em tela estreita)
    faixa.addEventListener("click", function (e) {
      var tit = e.target.closest(".mini-t");
      if (tit) { irParaVista(tit.getAttribute("data-v")); return; }
      var p = e.target.closest(".mini-p");
      if (p) { var id = p.getAttribute("data-id"); select(id === selected ? null : id); }
    });
  }
  faixa.hidden = !mosaico;
  document.body.classList.toggle("rig-mosaico", mosaico);
  var celula3DAntes = celula3D;
  faixa.textContent = ""; minis = []; celula3D = null;
  if (!mosaico) return;
  TODAS.filter(function (id) { return id !== atual(); }).forEach(function (id) {
    var c = document.createElement("div"); c.className = "mini" + (id === "3d" ? " mini-3d" : "");
    var t = document.createElement("button"); t.type = "button"; t.className = "mini-t"; t.setAttribute("data-v", id);
    t.textContent = nomeVista(id) + " ⤢"; t.title = "Trazer " + nomeVista(id) + " para a área principal";
    c.appendChild(t);
    if (id === "3d") {
      // a célula do 3D é reaproveitada: refazer a faixa não fecha e reabre o 3D à toa
      celula3D = celula3DAntes && alvo3D === celula3DAntes ? celula3DAntes : document.createElement("div");
      celula3D.className = "mini-3d-palco";
      c.appendChild(celula3D);
    } else {
      var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("class", "mini-svg"); svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
      c.appendChild(svg);
      minis.push({ svg: svg, v: id });
      desenharMini(svg, id);
    }
    faixa.appendChild(c);
  });
}

// as miniaturas acompanham o Rig (agrupado num quadro)
var pedido = 0;
ouvirRig(function (tipo) {
  if (!mosaico || !minis.length) return;
  if (tipo === "sel") { minis.forEach(function (m) { marcarMini(m.svg); }); return; }
  if (pedido) return;
  pedido = requestAnimationFrame(function () { pedido = 0; minis.forEach(function (m) { desenharMini(m.svg, m.v); }); });
});

function alternarMosaico() {
  mosaico = !mosaico;
  guardar(CHAVE_MOSAICO, mosaico);
  atualizarNav(); montarMosaico(); posicionar3D();
}

export function init() {
  $("m-vant").addEventListener("click", function () { passo(-1); });
  $("m-vprox").addEventListener("click", function () { passo(1); });
  $("m-vista").addEventListener("click", function () { var r = this.getBoundingClientRect(); abrirMenu(r.left, r.bottom + 4, itensVistas()); });
  $("m-mosaico").addEventListener("click", alternarMosaico);
  try { mosaico = localStorage.getItem(CHAVE_MOSAICO) === "1"; } catch (e) {}
  var volta = false;
  try { volta = sessionStorage.getItem(CHAVE_3D) === "1"; } catch (e) {}
  if (volta) setEm3D(true);
  atualizarNav(); montarMosaico(); posicionar3D();
}
