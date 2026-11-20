// Vistas do Palco: Frente, Atrás, Esquerda, Direita e Topo, ortogonais e travadas (ver espaco.js), e 3D. Todos os
// painéis aparecem em todas; cada vista 2D mostra e edita um plano do palco: Frente e Atrás (X e altura, giro Z),
// Esquerda/Direita (fundo e altura, giro X), Topo (X e recuo, giro Y). A 3D mostra a montagem no espaço, no lugar do
// desenho, e acompanha as edições do cartão; tocar num painel abre o cartão dele.
// Ficam na barra lateral à direita do desenho, como num programa 3D: as 5 vistas (teclas 1 a 5) e, separado, o 3D
// (tecla 0), que liga e desliga voltando para a última vista 2D.
import { save, set_vistaM, vistaM } from "./core.js";
import { fitM } from "./rig.js";
import { renderCabM, viewM } from "./rig-cabos.js";
import { syncMPanel, setEditM, editM } from "./rig-edicao.js";
import { VISTAS, ORDEM_VISTAS } from "./espaco.js";
import { registrar3D } from "./ponte3d.js";
import { pmsg } from "./exportar.js";
import { ICONES_VISTA } from "./icones-vista.js";

function $(id) { return document.getElementById(id); }

var DICA = {
  frente: "olhando do público: move em X e altura, a alça gira em Z (no próprio plano)",
  tras: "olhando do fundo para o público (X espelhado): move em X e altura, a alça gira em Z",
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
  // ícones de casinha (como no SketchUp): o da vista na tela fica marcado
  document.querySelectorAll("#m-vistas button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-v") === atual())); });
  $("m-edit").disabled = em3D; // mover e girar com a alça são do 2D; no 3D, o cartão
}

function guardar3D(on) { try { if (on) sessionStorage.setItem(CHAVE_3D, "1"); else sessionStorage.removeItem(CHAVE_3D); } catch (e) {} }

// ---- o 3D aparece no lugar do desenho; as opções dele vão para a barra de cima ----
var seq3D = 0, import3D = false;
function posicionar3D() {
  var palco = $("svg-m").closest(".stagebox"), quer = em3D, n = ++seq3D;
  if (!quer) registrar3D(null);
  // o three.js fica num pedaço à parte: só baixa quando o 3D abre
  if (!quer && !import3D) return;
  import("./vista3d.js").then(function (m) {
    import3D = true;
    if (n !== seq3D) return; // mudou de novo enquanto baixava
    if (!quer) { m.fechar3DNoRig(palco); return; }
    if (!m.abrir3DNoRig(palco, { barraEm: $("m-ctx3d") })) { setEm3D(false); irParaVista("frente"); return; }
    registrar3D({ atualizar: m.atualizar3D, marcarSel: m.marcarSel3D });
  }).catch(function () { if (quer) pmsg("Não consegui carregar a Vista 3D. Confira a conexão e tente de novo."); });
}

function setEm3D(on) {
  em3D = on;
  if (on && editM) setEditM(false);
  document.body.classList.toggle("rig-3d", on);
  guardar3D(on);
}

// o botão 3D: liga, ou desliga voltando para a última vista 2D
export function alternar3D() { irParaVista(em3D ? vistaM : "3d"); }

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
  posicionar3D();
}

export function itensVistas() {
  return TODAS.map(function (id) {
    return { t: (id === atual() ? "● " : "○ ") + nomeVista(id) + " · " + DICA[id], fn: function () { irParaVista(id); } };
  });
}

export function init() {
  var grupo = $("m-vistas");
  TODAS.forEach(function (id, i) {
    if (id === "3d") { var d = document.createElement("span"); d.className = "p-div"; grupo.appendChild(d); }
    var b = document.createElement("button"), tecla = id === "3d" ? "0" : String(i + 1);
    b.type = "button"; b.className = "vbtn" + (id === "3d" ? " v3d" : ""); b.setAttribute("data-v", id);
    b.innerHTML = ICONES_VISTA[id] + '<span class="k">' + tecla + "</span>";
    b.title = nomeVista(id) + " (" + tecla + "): " + DICA[id];
    b.setAttribute("aria-label", nomeVista(id));
    b.addEventListener("click", function () { if (id === "3d") alternar3D(); else irParaVista(id); });
    grupo.appendChild(b);
  });
  try { localStorage.removeItem("ledmap-mosaico"); } catch (e) {} // preferência das prévias, que saíram
  var volta = false;
  try { volta = sessionStorage.getItem(CHAVE_3D) === "1"; } catch (e) {}
  if (volta) setEm3D(true);
  atualizarNav(); posicionar3D();
}
