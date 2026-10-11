// Cartão da aba Screen: tocar num painel do canvas mostra o que importa no processador —
// posição em px, resolução, Screen — e as ações do painel. Mesma lógica do cartão do Rig.
// Vários selecionados: colocar todos numa Screen de uma vez, ou excluir.
import { tiles, selected, res, nf, fmt, groups, gname, painelById, pnome, EXTRAS, save, CW, CH, nextG, set_nextG } from "./core.js";
import { cabNome } from "./gabinetes.js";
import { tById, pmsg } from "./exportar.js";
import { select, refreshSelects } from "./tabela.js";
import { applyFocus, renderChips, updateBoxes, updateDetailStat } from "./screens.js";
import { placeC, multiLista, modoSelC, iniciarSelecaoC, clearMulti } from "./canvas-edicao.js";
import { openAdd, duplicarPainel, excluirPaineis } from "./telas.js";
import { viewC, caixaPx } from "./visor.js";
import { twoStep } from "./cabeamento.js";

function $(id) { return document.getElementById(id); }

function chip(txt, cls) { var b = document.createElement("span"); b.className = "mc-chip" + (cls ? " " + cls : ""); b.textContent = txt; return b; }

// opções de Screen, com atalho para criar uma nova ali mesmo
function opcoesScreen(sel, valor) {
  sel.textContent = "";
  [["", "— sem screen —"]].concat(groups.map(function (g) { return [g.id, gname(g)]; }), [["__nova", "+ Nova screen"]]).forEach(function (o) {
    var e = document.createElement("option"); e.value = o[0]; e.textContent = o[1]; sel.appendChild(o[0] === "__nova" ? e : e);
  });
  sel.value = valor || "";
}

function novaScreen() {
  var g = { id: "g" + nextG, name: "Screen " + nextG };
  set_nextG(nextG + 1);
  groups.push(g);
  return g.id;
}

// põe os painéis numa Screen ("__nova" cria uma) e atualiza a lista, as caixas e o resumo
export function colocarNaScreen(ids, valor) {
  var gid = valor === "__nova" ? novaScreen() : valor;
  ids.forEach(function (id) { if (tById[id]) tById[id].grp = gid; });
  refreshSelects(); applyFocus(); renderChips(); updateBoxes(); updateDetailStat(); save();
  return gid;
}

export function renderCartaoC() {
  var card = $("c-card");
  if (!card) return;
  var ids = multiLista(), varios = ids.length >= 2 || modoSelC(), t = selected && tById[selected];
  var modo = varios ? "varios" : t ? "um" : "";
  card.hidden = !modo;
  $("cc-um").hidden = modo !== "um";
  $("cc-varios").hidden = modo !== "varios";
  if (modo === "um") {
    var q = res(t), fora = t.cx < 0 || t.cy < 0 || t.cx + q.w > CW || t.cy + q.h > CH;
    $("cc-n").textContent = t.id;
    if (document.activeElement !== $("cc-nome")) $("cc-nome").value = t.name;
    var tags = $("cc-tags"); tags.textContent = "";
    var g = t.grp && groups.filter(function (o) { return o.id === t.grp; })[0];
    tags.appendChild(chip(g ? gname(g) : "sem screen", g ? "grupo" : ""));
    var p = t.pn && painelById(t.pn);
    if (p) tags.appendChild(chip(pnome(p)));
    if (fora) tags.appendChild(chip("fora do canvas", "fora"));
    $("cc-info").textContent = nf(q.w) + " × " + nf(q.h) + " px · " + cabNome(t) + " · " + q.n + " gab. · " + fmt(t.w) + " × " + fmt(t.h) + " m";
    if (document.activeElement !== $("cc-x")) $("cc-x").value = t.cx;
    if (document.activeElement !== $("cc-y")) $("cc-y").value = t.cy;
    opcoesScreen($("cc-scr"), t.grp);
    $("cc-dup").textContent = p ? "Duplicar grupo" : "Duplicar";
    $("cc-sel").hidden = tiles.length < 2;
  } else if (modo === "varios") {
    var n = ids.length;
    $("cc-vtit").textContent = n >= 2 ? n + " painéis selecionados" : "Selecionar vários";
    $("cc-vinfo").textContent = n ? ids.map(function (id) { return tById[id] ? tById[id].name : id; }).join(", ") : "Toque nos painéis para marcar ou desmarcar.";
    opcoesScreen($("cc-vscr"), "");
    $("cc-vscr").disabled = !n;
    $("cc-vdel").textContent = n ? "Excluir (" + n + ")" : "Excluir";
    $("cc-vdel").disabled = !n;
  }
}

export function init() {
  $("cc-fechar").addEventListener("click", function () { select(null); });
  $("cc-vfechar").addEventListener("click", clearMulti);
  $("cc-vcancel").addEventListener("click", clearMulti);
  $("cc-sel").addEventListener("click", iniciarSelecaoC);
  $("cc-editar").addEventListener("click", function () { if (selected) openAdd(selected); });
  $("cc-dup").addEventListener("click", function () { if (selected) duplicarPainel(selected); });
  twoStep($("cc-del"), "Excluir", "Confirmar?", function () { if (selected) excluirPaineis([selected]); });
  twoStep($("cc-vdel"), "Excluir", "Confirmar?", function () { var ids = multiLista(); if (ids.length) excluirPaineis(ids); });
  $("cc-ir").addEventListener("click", function () { var t = selected && tById[selected]; if (t) viewC.enquadrar(caixaPx([t])); });

  $("cc-nome").addEventListener("change", function () {
    var t = selected && tById[selected];
    if (!t) return;
    var v = $("cc-nome").value.trim().slice(0, 40) || "Painel " + t.id;
    t.name = v;
    EXTRAS.forEach(function (x) { if (x.id === t.id) x.name = v; });
    var row = document.querySelector('#rows tr[data-id="' + t.id + '"] .pnm');
    if (row) row.textContent = v;
    save(); renderCartaoC();
  });
  // posição no canvas (px inteiros)
  ["cc-x", "cc-y"].forEach(function (id) {
    $(id).addEventListener("change", function () {
      var t = selected && tById[selected];
      if (!t) return;
      var x = Math.round(Number($("cc-x").value)), y = Math.round(Number($("cc-y").value));
      if (!isFinite(x) || !isFinite(y) || Math.abs(x) > 20000 || Math.abs(y) > 20000) { renderCartaoC(); return; }
      t.cx = x; t.cy = y;
      placeC(); save(); renderCartaoC();
    });
  });
  $("cc-scr").addEventListener("change", function () {
    var t = selected && tById[selected];
    if (!t) return;
    var gid = colocarNaScreen([t.id], $("cc-scr").value);
    if ($("cc-scr").value === "__nova") pmsg("Screen nova criada com o painel " + t.id + ". Dê um nome a ela na seção Screens.");
    renderCartaoC();
    return gid;
  });
  $("cc-vscr").addEventListener("change", function () {
    var ids = multiLista(), v = $("cc-vscr").value;
    if (!ids.length) return;
    colocarNaScreen(ids, v);
    pmsg(ids.length + " painéis colocados " + (v ? "na screen." : "fora de screen."));
    clearMulti();
  });
}
