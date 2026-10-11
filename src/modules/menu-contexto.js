// Menu do clique direito no Rig (computador e app de desktop): as ações do painel sem ir até o cartão.
// Sobre um painel: o que dá para fazer com ele (ou com a seleção, se ele estiver nela).
// No vazio: + Painel, Enquadrar, Mover, Grade, 3D. Atalhos: Ctrl+D duplica, F2 edita o painel selecionado.
import { selected, painelById, pnome, tiles, groups, gname } from "./core.js";
import { multiLista, iniciarSelecaoC, movendoC } from "./canvas-edicao.js";
import { colocarNaScreen } from "./screen-cartao.js";
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

// painel sob o clique: a linha da lista, o desenho do Rig ou o canvas da Screen (todos guardam o número em data-id)
function idDoAlvo(alvo) {
  var el = alvo.closest && alvo.closest("#rows tr[data-id], #svg-m .scr[data-id], #svg-c .scr[data-id]");
  return el ? el.getAttribute("data-id") : null;
}

// ---- aba Screen ----
function itensScreenDestino(ids) {
  var itens = groups.map(function (g) {
    return { t: "Colocar em " + gname(g), fn: function () { colocarNaScreen(ids, g.id); } };
  });
  itens.push({ t: "Colocar numa screen nova", fn: function () { colocarNaScreen(ids, "__nova"); } });
  itens.push({ t: "Tirar da screen", fn: function () { colocarNaScreen(ids, ""); } });
  return itens;
}

function itensPainelC(t) {
  var sel = multiLista();
  if (sel.length >= 2 && sel.indexOf(t.id) >= 0) {
    return itensScreenDestino(sel).concat(["-", { t: "Excluir " + sel.length + " painéis", perigo: true, confirmar: "Confirmar exclusão", fn: function () { excluirPaineis(sel); } }]);
  }
  var p = t.pn && painelById(t.pn), sel1 = function () { if (selected !== t.id) select(t.id); };
  return [
    { t: "Editar…", fn: function () { sel1(); openAdd(t.id); } },
    { t: p ? "Duplicar grupo" : "Duplicar", fn: function () { duplicarPainel(t.id); } },
    { t: "Ir até o painel", fn: function () { sel1(); $("cc-ir").click(); } },
    "-"
  ].concat(itensScreenDestino([t.id]), ["-",
    tiles.length > 1 ? { t: "Selecionar vários…", fn: function () { sel1(); iniciarSelecaoC(); } } : null,
    { t: "Excluir painel", perigo: true, confirmar: "Confirmar exclusão", fn: function () { excluirPaineis([t.id]); } }
  ]).filter(Boolean);
}

function itensVazioC() {
  var itens = [
    { t: "+ Adicionar painel", fn: function () { openAdd(); } },
    { t: "Enquadrar tudo", fn: function () { $("zoom-fit").click(); } },
    { t: movendoC() ? "Desligar Mover" : "Ligar Mover", fn: function () { $("btn-move").click(); } },
    { t: "Nova screen", fn: function () { $("btn-new-screen").click(); } },
    "-",
    { t: ($("btn-grid-c").getAttribute("aria-pressed") === "true" ? "Esconder" : "Mostrar") + " grade", fn: function () { $("btn-grid-c").click(); } }
  ];
  if (!$("btn-dentro").hidden) itens.push({ t: $("btn-dentro").textContent, fn: function () { $("btn-dentro").click(); } });
  return itens;
}

export function init() {
  $("svg-m").addEventListener("contextmenu", function (e) {
    e.preventDefault();
    var id = idDoAlvo(e.target), t = id && tById[id];
    // o painel clicado fica selecionado (fora de uma seleção de vários), para ficar claro de quem é o menu
    if (t && selected !== t.id && mselLista().indexOf(t.id) < 0) select(t.id);
    abrir(e.clientX, e.clientY, t ? itensPainel(t) : itensVazio());
  });
  $("svg-c").addEventListener("contextmenu", function (e) {
    e.preventDefault();
    var id = idDoAlvo(e.target), t = id && tById[id];
    if (t && selected !== t.id && multiLista().indexOf(t.id) < 0) select(t.id);
    abrir(e.clientX, e.clientY, t ? itensPainelC(t) : itensVazioC());
  });
  $("rows").addEventListener("contextmenu", function (e) {
    var id = idDoAlvo(e.target), t = id && tById[id], aba = document.body.getAttribute("data-aba");
    if (!t || (aba !== "m" && aba !== "c")) return;
    e.preventDefault();
    if (selected !== t.id) select(t.id);
    abrir(e.clientX, e.clientY, aba === "c" ? itensPainelC(t) : itensPainel(t));
  });
  // atalhos de teclado do Rig e da Screen (fora de campos de texto)
  document.addEventListener("keydown", function (e) {
    var aba = document.body.getAttribute("data-aba");
    if ((aba !== "m" && aba !== "c") || /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName || "")) return;
    // Delete na Screen: como no Rig, o 1º toque arma o botão Excluir do cartão e o 2º confirma
    if (aba === "c" && (e.key === "Delete" || e.key === "Backspace") && (multiLista().length || selected)) {
      e.preventDefault();
      $(multiLista().length >= 2 ? "cc-vdel" : "cc-del").click();
      return;
    }
    var t = selected && tById[selected];
    if (!t) return;
    if ((e.ctrlKey || e.metaKey) && String(e.key).toLowerCase() === "d") { e.preventDefault(); duplicarPainel(t.id); }
    else if (e.key === "F2") { e.preventDefault(); openAdd(t.id); }
  });
}
