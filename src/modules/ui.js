import { applyDrawer } from "./gaveta.js";
import { setMoving, placeC } from "./canvas-edicao.js";
import { refreshSelects, select } from "./tabela.js";
import { renderChips, applyFocus } from "./screens.js";
import { fitM } from "./rig.js";
import { showTab } from "./abas.js";
import { KEY_PEND, KEY_REOPEN } from "./telas.js";
import { loadText } from "./projeto.js";
import { tById, pmsg } from "./exportar.js";
import { histT, histUndo, histRedo, histCur, histSnap, histBtns, set_histUndo, set_histRedo, set_histCur } from "./historico.js";

function closeDD() { Array.prototype.forEach.call(document.querySelectorAll(".dd-m"), function (m) { m.hidden = true; }); }

function setFS(on) {
    document.body.classList.toggle("fs", on);
    ["fs-m","fs-c","fs-k"].forEach(function (id) { var b = document.getElementById(id); if (b) { b.textContent = on ? "✕" : "⤢"; b.setAttribute("aria-label", on ? "Sair da tela cheia" : "Tela cheia"); } });
    window.dispatchEvent(new Event("resize"));
  }

export function init() {
  Array.prototype.forEach.call(document.querySelectorAll(".dd"), function (dd) {
      var btn = dd.querySelector("button"), menu = dd.querySelector(".dd-m");
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var was = menu.hidden;
        closeDD();
        menu.hidden = !was;
        if (!menu.hidden) {
          menu.classList.remove("right");
          if (menu.getBoundingClientRect().right > window.innerWidth - 4) menu.classList.add("right");
        }
      });
      menu.addEventListener("click", function (e) { e.stopPropagation(); var keep = e.target.closest && e.target.closest("[data-keep]"); if (!keep && (!menu.classList.contains("keep") || e.target.id === "btn-reset")) menu.hidden = true; });
    });
  document.addEventListener("click", closeDD);
  document.getElementById("paste-open").addEventListener("click", function () {
      var pd = document.getElementById("paste");
      pd.hidden = !pd.hidden;
      if (!pd.hidden) { pd.open = true; try { pd.scrollIntoView({ block: "center" }); } catch (e) {} }
    });
  ["fs-m","fs-c","fs-k"].forEach(function (id) { document.getElementById(id).addEventListener("click", function () { setFS(!document.body.classList.contains("fs")); }); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && document.body.classList.contains("fs")) setFS(false); });
  applyDrawer();
  setMoving(true);
  refreshSelects();
  renderChips();
  applyFocus();
  placeC();
  fitM();
  var abaIni = "m"; try { abaIni = localStorage.getItem("ledmap-aba") || "m"; } catch (e) {}
  showTab(/^[pmckner]$/.test(abaIni) ? abaIni : "m");
  try {
      var pend = localStorage.getItem(KEY_PEND);
      if (pend) { localStorage.removeItem(KEY_PEND); loadText(pend); }
      var ro = localStorage.getItem(KEY_REOPEN);
      if (ro) {
        localStorage.removeItem(KEY_REOPEN);
        var pr = ro.split(":");
        if (/^[pmckner]$/.test(pr[0])) showTab(pr[0]);
        if (pr[1] && tById[pr[1]]) {
          select(pr[1]);
          if (!pend) pmsg("Painel " + pr[1] + " adicionado.");
        }
      }
    } catch (e) {}
  clearTimeout(histT);
  set_histUndo([]);
  set_histRedo([]);
  set_histCur(histSnap());
  histBtns();
}

