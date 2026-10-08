import { editM, setEditM } from "./rig-edicao.js";
import { viewM, renderCabM } from "./rig-cabos.js";
import { viewC } from "./visor.js";
import { viewK, renderCabling } from "./cabeamento.js";
import { atualizarResumoProjeto } from "./projeto-ui.js";

const TABS = ["p", "m", "c", "k", "n", "e", "r"];
let HINT, curTab;

export function showTab(which) {
    curTab = which;
    if (which !== "m" && editM) setEditM(false);
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
    if (which === "k") { renderCabling(); viewK.apply(); }
  }

export function init() {
  HINT = {
    k: "O cabeamento usa as posições do Canvas e não as altera. Escolha uma porta e toque ou arraste sobre os gabinetes, na ordem em que o cabo passa. Tocar no último gabinete da rota desfaz; tocar em um gabinete anterior corta a rota ali; tocar em um gabinete de outra porta seleciona essa porta. O limite de pixels por porta depende dos bits e dos Hz, configurados em Sinal (por Screen ou para o projeto todo). O overclock arredonda para cima o número de gabinetes por porta. Com a traçagem ligada, use dois dedos para mover e dar zoom.",
    m: "O Rig mostra como as telas ficam penduradas. Toque numa tela ou numa linha da tabela para destacar. Em Editar posições dá para arrastar as telas ou digitar X e Y. As linhas finas são os gabinetes.",
    c: "A aba Screen é o canvas de conteúdo, o espaço de conteúdo, em pixels do processador. As telas começam montadas como no desenho. Arraste para reorganizar. Escolha uma screen para trabalhar só nela: as outras ficam apagadas e travadas. Ajuste a vista, toque em “Travar rolagem” e arraste sem a tela se mexer. Contorno vermelho tracejado indica telas sobrepostas. O ímã alinha bordas e centros das outras telas. Zoom com + e −, ou pinça com a rolagem travada."
  };
  curTab = "m";
  TABS.forEach(function (w) {
      document.getElementById("tab-" + w).addEventListener("click", function () { showTab(w); });
    });
}

export { curTab };
