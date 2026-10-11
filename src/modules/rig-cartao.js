// Cartão do Rig: tocar num painel (no desenho ou na lista) mostra o que dá para fazer com ele.
// Três formas: um painel · vários selecionados · um grupo (aberto pela etiqueta do grupo).
// Editar aqui é direto: nome, X/Y, recuo e Screen; tamanho e gabinete abrem o modal (Editar).
import { tiles, selected, res, fmt, nf, EXTRAS, save, groups, gname, painelById, pnome, membrosPainel, mnum } from "./core.js";
import { cabNome } from "./gabinetes.js";
import { tById, pmsg } from "./exportar.js";
import { select, atualizarTags } from "./tabela.js";
import { applyFocus, renderChips, updateBoxes, updateDetailStat } from "./screens.js";
import { commitAndReload, duplicarPainel, excluirPaineis } from "./telas.js";
import { viewM } from "./rig-cabos.js";
import { twoStep } from "./cabeamento.js";
import { mselLista, modoSelM, iniciarSelecao, sairModoSel, desagrupar, refreshM } from "./rig-edicao.js";
import { FLOOR } from "./core.js";
import { curTab } from "./abas.js";

var grupoFoco = null; // id do grupo aberto no cartão (pela etiqueta)
function $(id) { return document.getElementById(id); }

export function abrirGrupo(pn) { grupoFoco = painelById(pn) ? pn : null; renderCartao(); }

// retângulo (unidades do desenho do Rig) de uma lista de painéis, para o "Ir até"
function caixaRig(lista) {
  var x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  lista.forEach(function (t) { x0 = Math.min(x0, t.mx); x1 = Math.max(x1, t.mx + t.w); y0 = Math.min(y0, FLOOR - t.my - t.h); y1 = Math.max(y1, FLOOR - t.my); });
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

function chip(txt, cls, onClick) {
  var b = document.createElement(onClick ? "button" : "span");
  b.className = "mc-chip" + (cls ? " " + cls : "");
  b.textContent = txt;
  if (onClick) { b.type = "button"; b.addEventListener("click", onClick); }
  return b;
}

function opcoesScreen(sel, valor) {
  sel.textContent = "";
  [["", "— sem screen —"]].concat(groups.map(function (g) { return [g.id, gname(g)]; })).forEach(function (o) {
    var e = document.createElement("option"); e.value = o[0]; e.textContent = o[1]; sel.appendChild(e);
  });
  sel.value = valor || "";
}

export function renderCartao() {
  var card = $("m-card");
  if (!card) return;
  var varios = mselLista().length >= 2 || modoSelM();
  var t = selected && tById[selected];
  if (grupoFoco && !painelById(grupoFoco)) grupoFoco = null;
  if (grupoFoco && t && t.pn !== grupoFoco) grupoFoco = null;
  var modo = varios ? "varios" : grupoFoco ? "grupo" : t ? "um" : "";
  card.hidden = !modo;
  $("mc-um").hidden = modo !== "um";
  $("mc-varios").hidden = modo !== "varios";
  $("mc-grupo").hidden = modo !== "grupo";
  if (modo === "um") cartaoUm(t);
  else if (modo === "varios") cartaoVarios();
  else if (modo === "grupo") cartaoGrupo(painelById(grupoFoco));
}

function cartaoUm(t) {
  var q = res(t);
  $("mc-n").textContent = t.id;
  if (document.activeElement !== $("mc-nome")) $("mc-nome").value = t.name;
  var tags = $("mc-tags"); tags.textContent = "";
  var p = t.pn && painelById(t.pn);
  if (p) tags.appendChild(chip(pnome(p) + " ›", "grupo", function () { abrirGrupo(p.id); }));
  if (t.z) tags.appendChild(chip((t.z > 0 ? "recuo " : "avanço ") + fmt(Math.abs(t.z)) + " m"));
  if (q.n < q.cols * q.rows) tags.appendChild(chip("recortado"));
  $("mc-info").textContent = fmt(t.w) + " × " + fmt(t.h) + " m · " + cabNome(t) + " · " + (q.n < q.cols * q.rows ? q.n + " gab." : q.cols + " × " + q.rows + " = " + q.n + " gab.") + " · " + nf(q.w) + " × " + nf(q.h) + " px";
  if (document.activeElement !== $("m-x")) $("m-x").value = t.mx;
  if (document.activeElement !== $("m-y")) $("m-y").value = t.my;
  if (document.activeElement !== $("mc-z")) $("mc-z").value = t.z || "";
  opcoesScreen($("mc-scr"), t.grp);
  $("m-dup").textContent = p ? "Duplicar grupo" : "Duplicar";
  $("mc-sel").hidden = tiles.length < 2;
}

function cartaoVarios() {
  var ids = mselLista(), n = ids.length;
  $("mc-vtit").textContent = n >= 2 ? n + " painéis selecionados" : "Selecionar vários";
  $("mc-vinfo").textContent = n >= 2 ? ids.map(function (id) { return tById[id] ? tById[id].name : id; }).join(", ") : "Toque nos painéis para marcar ou desmarcar.";
  $("m-grp").textContent = n >= 2 ? "Agrupar (" + n + ")" : "Agrupar";
  $("m-grp").disabled = n < 2;
  $("mc-vdel").textContent = n ? "Excluir (" + n + ")" : "Excluir";
  $("mc-vdel").disabled = !n;
}

function cartaoGrupo(p) {
  var m = membrosPainel(p.id), x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, gabs = {}, ng = 0;
  m.forEach(function (t) { x0 = Math.min(x0, t.mx); x1 = Math.max(x1, t.mx + t.w); y0 = Math.min(y0, t.my); y1 = Math.max(y1, t.my + t.h); gabs[t.cab] = 1; ng += res(t).n; });
  var nome = $("mc-gnome");
  nome.placeholder = pnome({ id: p.id, name: "" });
  if (document.activeElement !== nome) nome.value = p.name || "";
  $("mc-ginfo").textContent = m.length + " painéis · " + fmt(x1 - x0) + " × " + fmt(y1 - y0) + " m · " + ng + " gab. · " + Object.keys(gabs).length + (Object.keys(gabs).length === 1 ? " gabinete" : " gabinetes");
  var box = $("mc-gmembros"); box.textContent = "";
  m.forEach(function (t) { box.appendChild(chip(t.id + " · " + t.name, "", function () { grupoFoco = null; select(t.id); })); });
}

export function init() {
  $("mc-fechar").addEventListener("click", function () { select(null); });
  $("mc-gfechar").addEventListener("click", function () { grupoFoco = null; renderCartao(); });
  $("mc-vfechar").addEventListener("click", sairModoSel);
  $("mc-vcancel").addEventListener("click", sairModoSel);
  $("mc-sel").addEventListener("click", iniciarSelecao);

  // nome: grava direto (sem recarregar), a lista acompanha
  $("mc-nome").addEventListener("change", function () {
    var t = selected && tById[selected];
    if (!t) return;
    var v = $("mc-nome").value.trim().slice(0, 40) || "Painel " + t.id;
    t.name = v;
    EXTRAS.forEach(function (x) { if (x.id === t.id) x.name = v; });
    var row = document.querySelector('#rows tr[data-id="' + t.id + '"] .pnm');
    if (row) row.textContent = v;
    save(); renderCartao();
  });
  // recuo muda a ordem de desenho e o cabeamento: grava e recarrega
  $("mc-z").addEventListener("change", function () {
    var t = selected && tById[selected];
    if (!t) return;
    var v = mnum($("mc-z").value || 0);
    if (v === null || v === (t.z || 0)) return;
    t.z = v;
    EXTRAS.forEach(function (x) { if (x.id === t.id) x.z = v; });
    if (!commitAndReload(curTab + ":" + t.id)) pmsg("Não consegui salvar neste navegador.");
  });
  $("mc-scr").addEventListener("change", function () {
    var t = selected && tById[selected];
    if (!t) return;
    t.grp = $("mc-scr").value;
    applyFocus(); renderChips(); updateBoxes(); updateDetailStat(); save();
    var s = document.querySelector('#rows tr[data-id="' + t.id + '"] .gsel select');
    if (s) s.value = t.grp;
  });
  $("mc-ir").addEventListener("click", function () { var t = selected && tById[selected]; if (t) viewM.enquadrar(caixaRig([t])); });

  // grupo
  $("mc-gnome").addEventListener("change", function () {
    var p = painelById(grupoFoco);
    if (!p) return;
    p.name = $("mc-gnome").value.trim().slice(0, 40);
    save(); refreshM(); atualizarTags(); renderCartao();
  });
  $("mc-gdes").addEventListener("click", function () { var pn = grupoFoco; grupoFoco = null; desagrupar(pn); });
  $("mc-gdup").addEventListener("click", function () { var m = membrosPainel(grupoFoco); if (m.length) duplicarPainel(m[0].id); });
  twoStep($("mc-gdel"), "Excluir grupo", "Confirmar?", function () { var m = membrosPainel(grupoFoco); if (m.length) excluirPaineis(m.map(function (t) { return t.id; })); });
  $("mc-gir").addEventListener("click", function () { var m = membrosPainel(grupoFoco); if (m.length) viewM.enquadrar(caixaRig(m)); });
  twoStep($("mc-vdel"), "Excluir", "Confirmar?", function () { var ids = mselLista(); if (ids.length) excluirPaineis(ids); });
}

