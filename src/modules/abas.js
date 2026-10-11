import { editM, setEditM, encerrarRecorte } from "./rig-edicao.js";
import { viewM, renderCabM } from "./rig-cabos.js";
import { viewC } from "./visor.js";
import { viewK, renderCabling } from "./cabeamento.js";
import { atualizarResumoProjeto } from "./projeto-ui.js";
import { renderEletrica } from "./eletrica.js";
import { renderComp } from "./composicao.js";

const TABS = ["p", "m", "c", "k", "n", "e", "r"];
let HINT, curTab;

export function showTab(which) {
    curTab = which;
    if (which !== "m" && editM) setEditM(false);
    if (which !== "m") encerrarRecorte();
    TABS.forEach(function (w) {
      document.getElementById("view-" + w).hidden = w !== which;
      document.getElementById("tab-" + w).setAttribute("aria-selected", String(w === which));
    });
    document.body.setAttribute("data-aba", which);
    try { localStorage.setItem("ledmap-aba", which); } catch (e) {}
    var tb = document.getElementById("tab-" + which);
    if (tb && tb.scrollIntoView) { try { tb.scrollIntoView({ block: "nearest", inline: "center" }); } catch (e) {} }
    if (which === "p") atualizarResumoProjeto();
    if (which !== "m") viewM.setLock(false);
    if (which !== "c") viewC.setLock(false);
    if (which !== "k") viewK.setLock(false);
    document.getElementById("hint").textContent = HINT[which] || "";
    if (which === "m") { viewM.apply(); renderCabM(); }
    if (which === "c") viewC.apply();
    if (which === "e") renderEletrica();
    if (which === "n") renderComp();
    if (which === "k") { renderCabling(); viewK.apply(); }
  }

export function init() {
  HINT = {
    k: "O cabeamento usa as posições do Canvas e não as altera. Escolha uma porta e toque ou arraste sobre os gabinetes, na ordem em que o cabo passa. Tocar no último gabinete da rota desfaz; tocar em um gabinete anterior corta a rota ali; tocar em um gabinete de outra porta seleciona essa porta. A carga de uma porta é a área do retângulo que envolve os gabinetes dela. O limite de pixels por porta depende dos bits e dos Hz, configurados em Sinal (por Screen ou para o projeto todo). O overclock arredonda para cima o número de gabinetes por porta. Com a traçagem ligada, use dois dedos para mover e dar zoom.",
    m: "O Rig mostra como os painéis ficam pendurados; o x = 0 é o centro do palco (linha tracejada). Projeto antigo? Clique direito no vazio → Centralizar no eixo 0. Toque num painel (ou numa linha da lista) para abrir o cartão dele: nome, tamanho, posição, recuo, Screen, Editar, Recortar, Duplicar, Espelhar e Duplicar espelhado (eixo X: o x troca de sinal, 3 m vira −3 m; eixo Y: de cabeça para baixo; no próprio eixo: inverte no lugar, e a cópia nasce ao lado), Selecionar vários e Excluir. Para arrastar os painéis, ligue Mover; desligado, arrastar só navega. Com Mover ligado, arrastar no vazio desenha um laço que seleciona vários, e arrastar um deles leva todos; o ímã encaixa nas bordas e centros dos outros painéis. Grupos aparecem como etiqueta (Grupo 1, Grupo 2…) e se movem juntos; toque na etiqueta para abrir o grupo e dar um nome. A cor indica o gabinete. Grade e cabos ficam em Visão; Enquadrar mostra todos os painéis.",
    c: "A aba Screen é o canvas de conteúdo, em pixels do processador. Toque num painel (ou numa linha da lista) para abrir o cartão: nome, posição X/Y em px, tamanho em metros, Screen (dá para criar uma nova ali), Editar, Duplicar, Selecionar vários e Excluir. Com vários selecionados, dá para colocar todos numa Screen de uma vez. Para arrastar, ligue Mover; desligado, arrastar só navega. Com Mover ligado, arrastar no vazio desenha um laço que seleciona vários, e arrastar um deles leva todos. Escolha uma screen nos chips para trabalhar só nela. Contorno vermelho tracejado indica painéis sobrepostos; painel fora do canvas ganha aviso e o botão Trazer para dentro. Clique direito no computador abre as ações; Enquadrar mostra tudo."
  };
  curTab = "m";
  TABS.forEach(function (w) {
      document.getElementById("tab-" + w).addEventListener("click", function () { showTab(w); });
    });
}

export { curTab };
