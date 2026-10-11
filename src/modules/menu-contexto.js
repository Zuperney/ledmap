// Menu do clique direito no Rig (computador e app de desktop): as ações do painel sem ir até o cartão.
// Sobre um painel: o que dá para fazer com ele (ou com a seleção, se ele estiver nela).
// No vazio: + Painel, Enquadrar, Mover, Grade, 3D. Atalhos: Ctrl+D duplica, F2 edita o painel selecionado.
import { selected, painelById, pnome, tiles } from "./core.js";
import { tById } from "./exportar.js";
import { select } from "./tabela.js";
import { openAdd, duplicarPainel, excluirPaineis } from "./telas.js";
import { mselLista, iniciarSelecao, desagrupar, editM } from "./rig-edicao.js";
import { abrirGrupo } from "./rig-cartao.js";

var menu = null;
function $(id) { return document.getElementById(id); }

function fechar() {
  if (!menu) return;
  menu.remove(); menu = null;
  document.removeEventListener("pointerdown", fora, true);
  document.removeEventListener("keydown", tecla, true);
  window.removeEventListener("resize", fechar);
  window.removeEventListener("scroll", fechar, true);
}
function fora(e) { if (menu && !menu.contains(e.target)) fechar(); }
function tecla(e) { if (e.key === "Escape") { e.stopPropagation(); fechar(); } }

// itens: { t: texto, fn, perigo, confirmar } ou "-" (separador). "confirmar": o 1º clique pede confirmação.
function abrir(x, y, itens) {
  fechar();
  menu = document.createElement("div");
  menu.className = "cmenu";
  menu.setAttribute("role", "menu");
  itens.forEach(function (it) {
    if (it === "-") { var s = document.createElement("div"); s.className = "cmsep"; menu.appendChild(s); return; }
    var b = document.createElement("button");
    b.type = "button"; b.className = "cmi" + (it.perigo ? " perigo" : ""); b.setAttribute("role", "menuitem");
    b.textContent = it.t;
    b.addEventListener("click", function () {
      if (it.confirmar && b.getAttribute("data-arm") !== "1") { b.setAttribute("data-arm", "1"); b.textContent = it.confirmar; return; }
      fechar(); it.fn();
    });
    menu.appendChild(b);
  });
  document.body.appendChild(menu);
  var w = menu.offsetWidth, h = menu.offsetHeight;
  menu.style.left = Math.max(4, Math.min(x, window.innerWidth - w - 4)) + "px";
  menu.style.top = Math.max(4, Math.min(y, window.innerHeight - h - 4)) + "px";
  setTimeout(function () {
    document.addEventListener("pointerdown", fora, true);
    document.addEventListener("keydown", tecla, true);
    window.addEventListener("resize", fechar);
    window.addEventListener("scroll", fechar, true);
  }, 0);
  var primeiro = menu.querySelector(".cmi");
  if (primeiro) primeiro.focus({ preventScroll: true });
}

function itensPainel(t) {
  var sel = mselLista();
  // painel dentro de uma seleção de vários: ações da seleção
  if (sel.length >= 2 && sel.indexOf(t.id) >= 0) {
    return [
      { t: "Agrupar (" + sel.length + ")", fn: function () { $("m-grp").click(); } },
      "-",
      { t: "Excluir " + sel.length + " painéis", perigo: true, confirmar: "Confirmar exclusão", fn: function () { excluirPaineis(sel); } }
    ];
  }
  var p = t.pn && painelById(t.pn), sel1 = function () { if (selected !== t.id) select(t.id); };
  var itens = [
    { t: "Editar…", fn: function () { sel1(); openAdd(t.id); } },
    { t: "Recortar gabinetes", fn: function () { sel1(); $("m-rec").click(); } },
    { t: p ? "Duplicar grupo" : "Duplicar", fn: function () { duplicarPainel(t.id); } },
    { t: "Ir até o painel", fn: function () { sel1(); $("mc-ir").click(); } },
    "-"
  ];
  if (p) {
    itens.push({ t: "Abrir " + pnome(p), fn: function () { sel1(); abrirGrupo(p.id); } });
    itens.push({ t: "Desagrupar", fn: function () { desagrupar(p.id); } });
  }
  if (tiles.length > 1) itens.push({ t: "Selecionar vários…", fn: function () { sel1(); iniciarSelecao(); } });
  itens.push("-", { t: "Excluir painel", perigo: true, confirmar: "Confirmar exclusão", fn: function () { excluirPaineis([t.id]); } });
  return itens;
}

function itensVazio() {
  return [
    { t: "+ Adicionar painel", fn: function () { openAdd(); } },
    { t: "Enquadrar tudo", fn: function () { $("m-zfit").click(); } },
    { t: editM ? "Desligar Mover" : "Ligar Mover", fn: function () { $("m-edit").click(); } },
    "-",
    { t: ($("btn-grid-m").getAttribute("aria-pressed") === "true" ? "Esconder" : "Mostrar") + " grade", fn: function () { $("btn-grid-m").click(); } },
    { t: "Vista 3D", fn: function () { $("m-3d").click(); } }
  ];
}

// painel sob o clique: a linha da lista ou o desenho do Rig (os dois guardam o número em data-id)
function idDoAlvo(alvo) {
  var el = alvo.closest && alvo.closest("#rows tr[data-id], #svg-m .scr[data-id]");
  return el ? el.getAttribute("data-id") : null;
}

export function init() {
  $("svg-m").addEventListener("contextmenu", function (e) {
    e.preventDefault();
    var id = idDoAlvo(e.target), t = id && tById[id];
    // o painel clicado fica selecionado (fora de uma seleção de vários), para ficar claro de quem é o menu
    if (t && selected !== t.id && mselLista().indexOf(t.id) < 0) select(t.id);
    abrir(e.clientX, e.clientY, t ? itensPainel(t) : itensVazio());
  });
  $("rows").addEventListener("contextmenu", function (e) {
    var id = idDoAlvo(e.target), t = id && tById[id];
    if (!t || document.body.getAttribute("data-aba") !== "m") return;
    e.preventDefault();
    abrir(e.clientX, e.clientY, itensPainel(t));
  });
  // atalhos de teclado do Rig (fora de campos de texto)
  document.addEventListener("keydown", function (e) {
    if (document.body.getAttribute("data-aba") !== "m" || /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName || "")) return;
    var t = selected && tById[selected];
    if (!t) return;
    if ((e.ctrlKey || e.metaKey) && String(e.key).toLowerCase() === "d") { e.preventDefault(); duplicarPainel(t.id); }
    else if (e.key === "F2") { e.preventDefault(); openAdd(t.id); }
  });
}
