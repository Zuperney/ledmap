// Vistas de montagem do Rig: além da Frente, planos 2D travados para montagens que não ficam de frente para o público —
// paredes laterais (borda de campo), fundo, teto, piso. Cada vista tem orientação e posição no palco;
// o Rig mostra uma por vez (‹ Frente ›) e o 3D junta todas no lugar certo.
import { tiles, EXTRAS, selected, save, planos, set_planos, set_vistaM, vistaM, planoById, todosPlanos, noPlano, ORI, painelById, membrosPainel, horizontal } from "./core.js";
import { fitM } from "./rig.js";
import { renderCabM, viewM } from "./rig-cabos.js";
import { limparMselM, refreshM } from "./rig-edicao.js";
import { select } from "./tabela.js";
import { tById, pmsg } from "./exportar.js";
import { abrirMenu } from "./menu-contexto.js";

function $(id) { return document.getElementById(id); }
function r2(v) { return Math.round(v * 100) / 100; }

// posição sugerida para uma vista nova, conforme a orientação (o usuário ajusta)
var PADRAO = { frente: [0, 0, -6], esq: [-10, 0, 0], dir: [10, 0, 0], tras: [0, 0, -10], teto: [0, 6, 0], piso: [0, 0, 0] };

export function nomeVista(id) { var p = planoById(id || ""); return p ? p.nome : "Frente"; }

export function atualizarNav() {
  var p = planoById(vistaM) || planoById(""), n = todosPlanos().length;
  $("m-vista").textContent = p.nome + " ▾";
  $("m-vista").title = "Vista de montagem: " + p.nome + (p.id ? " (" + ORI[p.ori].curto + ")" : "") + ". Toque para trocar, criar ou editar vistas";
  $("m-vant").disabled = $("m-vprox").disabled = n < 2;
  document.body.classList.toggle("vista-horizontal", horizontal(vistaM));
}

// mostra outra vista no Rig; com manterSel, o painel selecionado continua (ele já está nessa vista)
export function irParaVista(id, manterSel) {
  set_vistaM(id);
  limparMselM();
  if (!manterSel && selected && tById[selected] && !noPlano(tById[selected])) select(null);
  atualizarNav(); fitM(); renderCabM(); save();
  if (viewM) viewM.enquadrar();
}

function passo(d) {
  var l = todosPlanos(), i = l.findIndex(function (p) { return p.id === vistaM; });
  irParaVista(l[(i + d + l.length) % l.length].id);
}

// leva painéis (e os grupos deles) para outra vista; se cairiam em cima de alguém lá, vão para a direita do que já existe
export function moverParaVista(ids, dest) {
  if (!planoById(dest || "")) return;
  var set = {};
  ids.forEach(function (id) { var t = tById[id]; if (!t) return; (t.pn && painelById(t.pn) ? membrosPainel(t.pn) : [t]).forEach(function (m) { set[m.id] = m; }); });
  var S = Object.keys(set).map(function (k) { return set[k]; });
  if (!S.length) return;
  var la = tiles.filter(function (o) { return (o.pl || "") === (dest || "") && !set[o.id]; });
  var bate = S.some(function (a) { return la.some(function (b) { return a.mx < b.mx + b.w && b.mx < a.mx + a.w && a.my < b.my + b.h && b.my < a.my + a.h; }); });
  var dx = 0;
  if (bate) dx = Math.max.apply(null, la.map(function (b) { return b.mx + b.w; })) + 0.5 - Math.min.apply(null, S.map(function (a) { return a.mx; }));
  S.forEach(function (t) {
    t.pl = dest || ""; t.mx = r2(t.mx + dx);
    EXTRAS.forEach(function (x) { if (x.id === t.id) x.pl = t.pl; });
  });
  irParaVista(dest || "", true);
  refreshM();
  pmsg((S.length === 1 ? "Painel " + S[0].id + " foi" : S.length + " painéis foram") + " para a vista " + nomeVista(dest) + ".");
}

// ---- janela de criar / editar vista ----
var editando = null; // id da vista em edição, ou null para nova
function abrirJanela(id) {
  editando = id || null;
  var p = id ? planoById(id) : null;
  $("v-title").textContent = p ? "Editar vista" : "Nova vista de montagem";
  $("v-nome").value = p ? p.nome : "Vista " + (planos.length + 2);
  $("v-ori").value = p ? p.ori : "esq";
  var d = p ? [p.ox, p.oy, p.oz] : PADRAO.esq;
  $("v-x").value = d[0]; $("v-y").value = d[1]; $("v-z").value = d[2];
  $("v-err").textContent = "";
  $("v-ok").textContent = p ? "Salvar" : "Criar";
  $("vista-modal").hidden = false;
  $("v-nome").focus();
}
function fecharJanela() { $("vista-modal").hidden = true; editando = null; }

function salvarJanela() {
  var nome = $("v-nome").value.trim(), ori = $("v-ori").value;
  var num = function (id, lim) { var v = Number(String($(id).value).replace(",", ".")); return isFinite(v) && Math.abs(v) <= lim ? r2(v) : null; };
  var x = num("v-x", 200), y = num("v-y", 100), z = num("v-z", 200);
  if (!nome) { $("v-err").textContent = "Dê um nome para a vista."; return; }
  if (!ORI[ori]) { $("v-err").textContent = "Escolha a orientação."; return; }
  if (x === null || y === null || z === null) { $("v-err").textContent = "Posição fora do limite."; return; }
  if (editando) {
    var p = planoById(editando);
    p.nome = nome.slice(0, 40); p.ori = ori; p.ox = x; p.oy = y; p.oz = z;
    fecharJanela(); atualizarNav(); fitM(); save();
    pmsg("Vista " + p.nome + " atualizada.");
    return;
  }
  if (planos.length >= 30) { $("v-err").textContent = "Limite de 30 vistas."; return; }
  var n = planos.reduce(function (a, q) { return Math.max(a, Number(q.id.slice(1))); }, 0) + 1;
  planos.push({ id: "v" + n, nome: nome.slice(0, 40), ori: ori, ox: x, oy: y, oz: z });
  fecharJanela();
  irParaVista("v" + n);
  pmsg("Vista " + nome + " criada. Adicione painéis aqui (+ Painel) ou mova painéis de outra vista pelo cartão.");
}

function excluirVista(id) {
  var p = planoById(id);
  if (!id || !p) return;
  var ids = tiles.filter(function (t) { return t.pl === id; }).map(function (t) { return t.id; });
  if (ids.length) moverParaVista(ids, "");
  set_planos(planos.filter(function (q) { return q.id !== id; }));
  irParaVista("");
  pmsg("Vista " + p.nome + " excluída" + (ids.length ? "; os painéis dela voltaram para a Frente." : "."));
}

export function itensVistas() {
  var atual = planoById(vistaM);
  var itens = todosPlanos().map(function (p) {
    var n = tiles.filter(function (t) { return (t.pl || "") === p.id; }).length;
    return { t: (p.id === vistaM ? "● " : "○ ") + p.nome + " · " + (p.id ? ORI[p.ori].curto : "frente") + " · " + n + (n === 1 ? " painel" : " painéis"), fn: function () { irParaVista(p.id); } };
  });
  itens.push("-", { t: "+ Nova vista…", fn: function () { abrirJanela(); } });
  if (atual && atual.id) {
    itens.push({ t: "Editar " + atual.nome + "…", fn: function () { abrirJanela(atual.id); } });
    itens.push({ t: "Excluir " + atual.nome, perigo: true, confirmar: "Confirmar (os painéis voltam para a Frente)", fn: function () { excluirVista(atual.id); } });
  }
  return itens;
}

export { abrirJanela as novaVista };

export function init() {
  var sel = $("v-ori");
  Object.keys(ORI).forEach(function (k) { var o = document.createElement("option"); o.value = k; o.textContent = ORI[k].nome; sel.appendChild(o); });
  sel.addEventListener("change", function () {
    if (editando) return;
    var d = PADRAO[sel.value] || [0, 0, 0];
    $("v-x").value = d[0]; $("v-y").value = d[1]; $("v-z").value = d[2];
  });
  $("m-vant").addEventListener("click", function () { passo(-1); });
  $("m-vprox").addEventListener("click", function () { passo(1); });
  $("m-vista").addEventListener("click", function () { var r = this.getBoundingClientRect(); abrirMenu(r.left, r.bottom + 4, itensVistas()); });
  $("v-cancel").addEventListener("click", fecharJanela);
  $("v-ok").addEventListener("click", salvarJanela);
  $("vista-modal").addEventListener("click", function (e) { if (e.target === $("vista-modal")) fecharJanela(); });
  $("vista-modal").addEventListener("keydown", function (e) { if (e.key === "Escape") fecharJanela(); else if (e.key === "Enter" && e.target.tagName === "INPUT") salvarJanela(); });
  atualizarNav();
}
