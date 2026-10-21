// Vistas do Rig: Frente, Topo, Esquerda e Direita, ortogonais (ver espaco.js), e 3D. Todos os painéis aparecem em todas;
// cada vista 2D mostra e edita um plano do palco: Frente (X e altura, giro Z), Topo (X e recuo, giro Y),
// Esquerda/Direita (fundo e altura, giro X). A 3D mostra a montagem no espaço, no lugar do desenho, e acompanha
// as edições do cartão; tocar num painel abre o cartão dele. Navegação ‹ Frente ›: as setas passam pelas 5.
import { save, set_vistaM, vistaM } from "./core.js";
import { fitM } from "./rig.js";
import { renderCabM, viewM } from "./rig-cabos.js";
import { syncMPanel, setEditM, editM } from "./rig-edicao.js";
import { VISTAS, ORDEM_VISTAS } from "./espaco.js";
import { abrirMenu } from "./menu-contexto.js";
import { registrar3D } from "./ponte3d.js";
import { pmsg } from "./exportar.js";

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
var em3D = false;

export function nomeVista(id) { return id === "3d" ? "3D" : VISTAS[id] ? VISTAS[id].nome : "Frente"; }
function atual() { return em3D ? "3d" : vistaM; }

export function atualizarNav() {
  $("m-vista").textContent = nomeVista(atual()) + " ▾";
  $("m-vista").title = "Vista " + nomeVista(atual()) + ": " + DICA[atual()] + ". Toque para trocar";
  $("m-edit").disabled = em3D; // mover e girar com a alça são do 2D; no 3D, o cartão
}

function guardar3D(on) { try { if (on) sessionStorage.setItem(CHAVE_3D, "1"); else sessionStorage.removeItem(CHAVE_3D); } catch (e) {} }

function entrar3D() {
  if (em3D) return;
  em3D = true;
  if (editM) setEditM(false);
  document.body.classList.add("rig-3d");
  guardar3D(true);
  atualizarNav();
  // o three.js fica num pedaço à parte: só baixa quando a vista 3D abre
  import("./vista3d.js").then(function (m) {
    if (!em3D) return; // saiu antes de terminar de baixar
    if (!m.abrir3DNoRig($("svg-m").closest(".stagebox"))) { sair3D(); irParaVista("frente"); return; }
    registrar3D({ atualizar: m.atualizar3D, marcarSel: m.marcarSel3D, fechar: m.fechar3DNoRig });
  }).catch(function () { pmsg("Não consegui carregar a Vista 3D. Confira a conexão e tente de novo."); sair3D(); atualizarNav(); });
}

function sair3D() {
  if (!em3D) return;
  em3D = false;
  document.body.classList.remove("rig-3d");
  guardar3D(false);
  import("./vista3d.js").then(function (m) { m.fechar3DNoRig(); }).catch(function () {});
  registrar3D(null);
}

export function irParaVista(id) {
  if (id === "3d") { entrar3D(); return; }
  sair3D();
  set_vistaM(id);
  atualizarNav(); fitM(); syncMPanel(); renderCabM(); save();
  if (viewM) viewM.enquadrar();
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

export function init() {
  $("m-vant").addEventListener("click", function () { passo(-1); });
  $("m-vprox").addEventListener("click", function () { passo(1); });
  $("m-vista").addEventListener("click", function () { var r = this.getBoundingClientRect(); abrirMenu(r.left, r.bottom + 4, itensVistas()); });
  atualizarNav();
  var volta = false;
  try { volta = sessionStorage.getItem(CHAVE_3D) === "1"; } catch (e) {}
  if (volta) entrar3D();
}
