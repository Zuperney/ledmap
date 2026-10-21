// Vistas do Rig: Frente, Topo, Esquerda e Direita, ortogonais (ver espaco.js). Todos os painéis aparecem em todas;
// cada vista mostra e edita um plano do palco: Frente (X e altura, giro Z), Topo (X e recuo, giro Y),
// Esquerda/Direita (fundo e altura, giro X). Navegação ‹ Frente ›: as setas passam pelas 4; o nome abre a lista.
import { save, set_vistaM, vistaM } from "./core.js";
import { fitM } from "./rig.js";
import { renderCabM, viewM } from "./rig-cabos.js";
import { syncMPanel } from "./rig-edicao.js";
import { VISTAS, ORDEM_VISTAS } from "./espaco.js";
import { abrirMenu } from "./menu-contexto.js";

function $(id) { return document.getElementById(id); }

var DICA = {
  frente: "olhando do público: move em X e altura, a alça gira em Z (no próprio plano)",
  topo: "olhando de cima: move em X e recuo, a alça gira em Y (abre em V ou L)",
  esq: "olhando da esquerda: move em fundo e altura, a alça gira em X (inclina)",
  dir: "olhando da direita: move em fundo e altura, a alça gira em X (inclina)"
};

export function nomeVista(id) { return VISTAS[id] ? VISTAS[id].nome : "Frente"; }

export function atualizarNav() {
  $("m-vista").textContent = nomeVista(vistaM) + " ▾";
  $("m-vista").title = "Vista " + nomeVista(vistaM) + ": " + DICA[vistaM] + ". Toque para trocar";
}

export function irParaVista(id) {
  set_vistaM(id);
  atualizarNav(); fitM(); syncMPanel(); renderCabM(); save();
  if (viewM) viewM.enquadrar();
}

function passo(d) {
  var i = ORDEM_VISTAS.indexOf(vistaM);
  irParaVista(ORDEM_VISTAS[(i + d + ORDEM_VISTAS.length) % ORDEM_VISTAS.length]);
}

export function itensVistas() {
  return ORDEM_VISTAS.map(function (id) {
    return { t: (id === vistaM ? "● " : "○ ") + VISTAS[id].nome + " · " + DICA[id], fn: function () { irParaVista(id); } };
  });
}

export function init() {
  $("m-vant").addEventListener("click", function () { passo(-1); });
  $("m-vprox").addEventListener("click", function () { passo(1); });
  $("m-vista").addEventListener("click", function () { var r = this.getBoundingClientRect(); abrirMenu(r.left, r.bottom + 4, itensVistas()); });
  atualizarNav();
}
