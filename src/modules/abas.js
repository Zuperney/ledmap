import { editM, setEditM, encerrarRecorte } from "./rig-edicao.js";
import { viewM, renderCabM } from "./rig-cabos.js";
import { viewC } from "./visor.js";
import { viewK, renderCabling } from "./cabeamento.js";
import { atualizarResumoProjeto } from "./projeto-ui.js";
import { renderEletrica } from "./eletrica.js";
import { renderComp } from "./composicao.js";

const TABS = ["p", "m", "c", "k", "n", "e", "r"];
// Endereçamento: uma aba com três modos (Screen = mapa de pixels, Cabeamento, Composição); cada modo é uma das vistas
// de antes, escolhido pela barra de modos no topo dela. A aba abre no último modo usado.
const MODOS = ["c", "k", "n"], NOME_MODO = { c: "Screen", k: "Cabeamento", n: "Composição" };
var modoEnd = "c";
let HINT, curTab;

export function showTab(which) {
    curTab = which;
    if (which !== "m" && editM) setEditM(false);
    if (which !== "m") encerrarRecorte();
    TABS.forEach(function (w) {
      document.getElementById("view-" + w).hidden = w !== which;
      document.getElementById("tab-" + w).setAttribute("aria-selected", String(w === which));
    });
    var noEnd = MODOS.indexOf(which) >= 0;
    if (noEnd) { modoEnd = which; try { localStorage.setItem("ledmap-modo-end", which); } catch (e) {} }
    document.getElementById("tab-x").setAttribute("aria-selected", String(noEnd));
    document.querySelectorAll(".modos button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-modo") === which)); });
    document.body.setAttribute("data-aba", which);
    try { localStorage.setItem("ledmap-aba", which); } catch (e) {}
    var tb = document.getElementById(noEnd ? "tab-x" : "tab-" + which);
    if (tb && tb.scrollIntoView) { try { tb.scrollIntoView({ block: "nearest", inline: "center" }); } catch (e) {} }
    if (which === "p") atualizarResumoProjeto();
    if (which !== "m") viewM.setLock(false);
    if (which !== "c") viewC.setLock(false);
    if (which !== "k") viewK.setLock(false);
    document.getElementById("hint").textContent = HINT[which] || "";
    if (which === "m") { viewM.apply(); renderCabM(); }
    if (which === "c") viewC.apply();
    if (which === "e") renderEletrica();
    if (which === "n") { renderComp(); requestAnimationFrame(function () { requestAnimationFrame(renderComp); }); } // de novo depois que a área tem a altura final
    if (which === "k") { renderCabling(); viewK.apply(); }
  }

export function init() {
  HINT = {
    k: "O cabeamento usa as posições do Canvas e não as altera. Escolha uma porta e toque ou arraste sobre os gabinetes, na ordem em que o cabo passa. Tocar no último gabinete da rota desfaz; tocar em um gabinete anterior corta a rota ali; tocar em um gabinete de outra porta seleciona essa porta. A carga de uma porta é a área do retângulo que envolve os gabinetes dela. O limite de pixels por porta depende dos bits e dos Hz, configurados em Sinal (por Screen ou para o projeto todo). O overclock arredonda para cima o número de gabinetes por porta. Com a traçagem ligada, use dois dedos para mover e dar zoom.",
    m: "O Palco é onde você monta o palco do evento, em metros. A origem 0,0 fica no centro do palco, no chão: X vermelho (direita +), Y verde (altura) e Z azul (recuo, + para trás). Vistas na barra da direita: Frente, Atrás, Esquerda, Direita e Topo (teclas 1 a 5), 3D (tecla 0: abre na vista atual; no 3D os ícones levam a câmera e o gizmo move e gira o selecionado, G, R e L) e Multiview (2 ou 4 vistas lado a lado). Ferramentas: Selecionar (V) arrasta, Navegar (H) move a vista, Girar (R) mostra a alça, Painel (P) desenha arrastando, Medir (M) mede, Recortar (C). Os campos de posição são sempre o pin do painel (padrão: meio da borda de baixo): girar não move o pin e a medida cresce a partir dele. Grupo é um painel só, com pin e giro próprios. Camadas: ocultar, travar e ordem. Nos campos, a rodinha muda o valor e o clique longo abre a régua de escalas.",
    c: "A aba Screen é o canvas de conteúdo, em pixels do processador. Toque num painel (ou numa linha da lista) para abrir o cartão: nome, posição X/Y em px, tamanho em metros, Screen (dá para criar uma nova ali), Editar, Duplicar, Selecionar vários e Excluir. Com vários selecionados, dá para colocar todos numa Screen de uma vez. Para arrastar, ligue Mover; desligado, arrastar só navega. Com Mover ligado, arrastar no vazio desenha um laço que seleciona vários, e arrastar um deles leva todos. Escolha uma screen nos chips para trabalhar só nela. Contorno vermelho tracejado indica painéis sobrepostos; painel fora do canvas ganha aviso e o botão Trazer para dentro. Clique direito no computador abre as ações; Enquadrar mostra tudo."
  };
  curTab = "m";
  TABS.forEach(function (w) {
      document.getElementById("tab-" + w).addEventListener("click", function () { showTab(w); });
    });
  try { var mm = localStorage.getItem("ledmap-modo-end"); if (MODOS.indexOf(mm) >= 0) modoEnd = mm; } catch (e) {}
  document.getElementById("tab-x").addEventListener("click", function () { showTab(modoEnd); });
  // a barra de modos no topo de cada modo
  MODOS.forEach(function (w) {
    var topo = document.querySelector("#view-" + w + " .of-topo");
    if (!topo) return;
    var seg = document.createElement("div"); seg.className = "seg modos"; seg.setAttribute("role", "group"); seg.setAttribute("aria-label", "Modo do Endereçamento");
    MODOS.forEach(function (m) {
      var b = document.createElement("button"); b.type = "button"; b.className = "btn"; b.textContent = NOME_MODO[m]; b.setAttribute("data-modo", m);
      b.addEventListener("click", function () { showTab(m); });
      seg.appendChild(b);
    });
    topo.insertBefore(seg, topo.firstChild);
  });
}

export { curTab };
