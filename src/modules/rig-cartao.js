// Cartão do Rig: tocar num painel (no desenho ou na lista) mostra o que dá para fazer com ele.
// Três formas: um painel · vários selecionados · um grupo. Tocar num painel que está num grupo seleciona o grupo,
// que se comporta como um painel só (centro, giro, medidas); duplo clique (ou tocar nele na lista) edita só aquele painel.
// Editar aqui é direto: nome, X/Y, recuo e Screen; tamanho e gabinete abrem o modal (Editar).
import { tiles, selected, res, fmt, nf, EXTRAS, save, groups, gname, painelById, pnome, membrosPainel, mnum, vistaM, gravarVivo } from "./core.js";
import { PIVOS, limpaGiro, limpaPivo, trocarPivo, caixaDe, temGiro, pivo, pivoLocal, extensao, matriz, matrizDe, medidaNoPin, cantoDoPin, noEspacoDe, pai } from "./espaco.js";
import { caixaGrupo, porGrupo, girarGrupoPara, trocarPinDoGrupo, extensaoGrupo, pinNoPalco, giroNoPalco } from "./grupos.js";
import { placeM, reordenarM, statM, desenharPaineis } from "./rig.js";
import { cabOn, renderCabM } from "./rig-cabos.js";
import { cabNome } from "./gabinetes.js";
import { tById, pmsg } from "./exportar.js";
import { select, atualizarTags } from "./tabela.js";
import { applyFocus, renderChips, updateBoxes, updateDetailStat } from "./screens.js";
import { duplicarPainel, excluirPaineis, editarPainel } from "./telas.js";
import { menuEspelho } from "./menu-contexto.js";
import { viewM } from "./rig-cabos.js";
import { twoStep } from "./cabeamento.js";
import { mselLista, modoSelM, iniciarSelecao, sairModoSel, desagrupar, refreshM, desenharAlca } from "./rig-edicao.js";
import { FLOOR } from "./core.js";

var grupoFoco = null; // id do grupo aberto no cartão
var membroAberto = null; // painel de um grupo aberto para editar sozinho (duplo clique)
function $(id) { return document.getElementById(id); }

export function abrirGrupo(pn) { grupoFoco = painelById(pn) ? pn : null; membroAberto = null; refPalco = false; renderCartao(); }
export function grupoAberto() { return grupoFoco; }
export function membroAbertoId() { return membroAberto; }
// entra no grupo: seleciona e edita só este painel
export function abrirMembro(id) { membroAberto = id; grupoFoco = null; select(id); renderCartao(); }

// retângulo (unidades do desenho do Rig, na vista atual) de uma lista de painéis, para o "Ir até"
function caixaRig(lista) {
  var c = caixaDe(lista, vistaM);
  return { x: c.u0, y: FLOOR - c.v1, w: c.u1 - c.u0, h: c.v1 - c.v0 };
}

// Os campos de posição são sempre o pin (regra 3 do PLANO.md): X, altura e recuo do pin no espaço do pai (no palco
// para painel solto; no grupo para membro). Membro aberto sozinho tem o botão "no grupo / no palco", que troca o que os
// campos mostram e editam (no palco, o app converte para o grupo).
var refPalco = false;
function r3(v) { return Math.round(v * 1000) / 1000 || 0; }
export function posCampos(t) {
  if (refPalco && pai(t)) { var W = pinNoPalco(t); return [r3(W[0]), r3(W[1]), r3(W[2])]; }
  var L = pivoLocal(t);
  return [r3(L[0]), r3(L[1]), r3(-L[2])];
}
function giroCampos(t) { return refPalco && pai(t) ? giroNoPalco(t) : { rx: t.rx || 0, ry: t.ry || 0, rz: t.rz || 0 }; }
// leva o pin para (x, altura, recuo) do que os campos mostram; o giro fica
function porPin(t, x, y, recuo) {
  if (refPalco && pai(t)) {
    var n = noEspacoDe(pai(t), t, [x, y, -recuo], matriz(t));
    t.mx = mnum(n.mx); t.my = mnum(n.my); t.z = mnum(n.z) || 0;
    return;
  }
  var c = cantoDoPin(t, x, y);
  t.mx = mnum(c.mx); t.my = mnum(c.my); t.z = mnum(recuo) || 0;
}
// giro novo do que os campos mostram; o pin fica
function porGiro(t, g) {
  if (refPalco && pai(t)) { var n = noEspacoDe(pai(t), t, pivo(t), matrizDe(g.rx, g.ry, g.rz)); g = { rx: n.rx, ry: n.ry, rz: n.rz }; }
  t.rx = g.rx; t.ry = g.ry; t.rz = g.rz;
}
function faixa(a, b) { return Math.abs(a - b) < 0.0005 ? fmt(a) : fmt(a) + " a " + fmt(b); }

// recuo, giro e pivô mudam só o desenho e a geometria: redesenha sem recarregar a página
function aplicarVivo(t) {
  placeM(t); reordenarM(); statM(); desenharPaineis(); desenharAlca();
  if (cabOn) renderCabM();
  gravarVivo([t]); save(); renderCartao();
}
// o mesmo para vários painéis (o grupo)
export function aplicarVivoLista(lista) {
  lista.forEach(placeM); reordenarM(); statM(); desenharPaineis(); desenharAlca();
  if (cabOn) renderCabM();
  gravarVivo(lista); save(); renderCartao();
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
  if (membroAberto && membroAberto !== selected) membroAberto = null;
  // painel de um grupo: o grupo é o que fica selecionado (a não ser que o painel tenha sido aberto sozinho)
  if (!varios && t && t.pn && painelById(t.pn) && membroAberto !== t.id) grupoFoco = t.pn;
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
  if (temGiro(t)) tags.appendChild(chip("girado · zerar", "", function () { t.rx = t.ry = t.rz = 0; aplicarVivo(t); }));
  if (q.n < q.cols * q.rows) tags.appendChild(chip("recortado"));
  $("mc-info").textContent = fmt(t.w) + " × " + fmt(t.h) + " m · " + cabNome(t) + " · " + (q.n < q.cols * q.rows ? q.n + " gab." : q.cols + " × " + q.rows + " = " + q.n + " gab.") + " · " + nf(q.w) + " × " + nf(q.h) + " px";
  if (document.activeElement !== $("mc-w")) $("mc-w").value = t.w;
  if (document.activeElement !== $("mc-h")) $("mc-h").value = t.h;
  // a posição é sempre a do pin (ele não sai do lugar quando o painel gira nem quando muda de medida)
  var noGrupo = !!pai(t), loc = noGrupo && !refPalco, P = posCampos(t), G = giroCampos(t);
  $("mc-ref").hidden = !noGrupo;
  $("mc-ref").setAttribute("aria-pressed", String(refPalco));
  $("mc-ref").textContent = refPalco ? "Valores: no palco" : "Valores: no grupo";
  $("m-x-l").textContent = loc ? "Pin X no grupo (m)" : "Pin X (m)";
  $("m-y-l").textContent = loc ? "Pin altura no grupo (m)" : "Pin altura (m)";
  $("mc-z-l").textContent = loc ? "Pin recuo no grupo (m)" : "Pin recuo (m)";
  if (document.activeElement !== $("m-x")) $("m-x").value = P[0];
  if (document.activeElement !== $("m-y")) $("m-y").value = P[1];
  if (document.activeElement !== $("mc-z")) $("mc-z").value = P[2] || "";
  var e = extensao(t), W = pinNoPalco(t), gp = giroNoPalco(t);
  $("mc-palco").textContent = "No palco: X " + faixa(e.x0, e.x1) + " · altura " + faixa(e.y0, e.y1) + " · recuo " + faixa(e.r0, e.r1) + " m" +
    (noGrupo ? " · pin " + fmt(W[0]) + ", " + fmt(W[1]) + ", " + fmt(W[2]) + " · giro " + fmt(gp.rx) + "° / " + fmt(gp.ry) + "° / " + fmt(gp.rz) + "°" : "");
  opcoesScreen($("mc-scr"), t.grp);
  ["rx", "ry", "rz"].forEach(function (k) { if (document.activeElement !== $("mc-" + k)) $("mc-" + k).value = G[k] || ""; });
  $("mc-pv").value = limpaPivo(t.pv);
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

// cartão do grupo: o grupo como um painel só (medidas e centro no quadro dele, giro do grupo, onde fica no palco)
function cartaoGrupo(p) {
  var m = membrosPainel(p.id), gabs = {}, ng = 0, cx = caixaGrupo(p.id), e = extensaoGrupo(p.id);
  m.forEach(function (t) { gabs[t.cab] = 1; ng += res(t).n; });
  var nome = $("mc-gnome");
  nome.placeholder = pnome({ id: p.id, name: "" });
  if (document.activeElement !== nome) nome.value = p.name || "";
  $("mc-ginfo").textContent = m.length + " painéis · " + fmt(cx.w) + " × " + fmt(cx.h) + (cx.d > 0.005 ? " × " + fmt(cx.d) : "") + " m · " + ng + " gab. · " + Object.keys(gabs).length + (Object.keys(gabs).length === 1 ? " gabinete" : " gabinetes");
  $("mc-gpalco").textContent = "No palco: X " + faixa(e.x0, e.x1) + " · altura " + faixa(e.y0, e.y1) + " · recuo " + faixa(e.r0, e.r1) + " m";
  var v = { "mc-gx": p.gx || 0, "mc-gy": p.gy || 0, "mc-gz": p.gz || 0, "mc-grx": p.rx || 0, "mc-gry": p.ry || 0, "mc-grz": p.rz || 0 };
  $("mc-gpv").value = limpaPivo(p.pv);
  Object.keys(v).forEach(function (id) { if (document.activeElement !== $(id)) $(id).value = Math.round(v[id] * 1000) / 1000 || (id.indexOf("mc-gr") === 0 || id === "mc-gz" ? "" : 0); });
  var box = $("mc-gmembros"); box.textContent = "";
  m.forEach(function (t) { box.appendChild(chip(t.id + " · " + t.name, "", function () { abrirMembro(t.id); })); });
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
  // tamanho do painel direto no cartão (a grade de gabinetes acompanha; grava e recarrega)
  ["mc-w", "mc-h"].forEach(function (id) {
    $(id).addEventListener("change", function () {
      var t = selected && tById[selected];
      if (!t) return;
      var w = mnum($("mc-w").value), h = mnum($("mc-h").value);
      if (!(w > 0) || !(h > 0)) { pmsg("Informe largura e altura maiores que zero."); renderCartao(); return; }
      var n = medidaNoPin(t, w, h); // cresce a partir do pin: o pin fica onde está
      var erro = editarPainel(t.id, { w: w, h: h, mx: mnum(n.mx), my: mnum(n.my) });
      if (erro) { pmsg(erro); renderCartao(); }
    });
  });
  // Espelhar / Duplicar espelhado abrem as opções: eixo X, eixo Y ou no próprio eixo
  function esp(btn, dup, ids) { if (ids.length) menuEspelho(btn, ids, dup); }
  $("m-esp").addEventListener("click", function () { esp(this, false, selected ? [selected] : []); });
  $("m-desp").addEventListener("click", function () { esp(this, true, selected ? [selected] : []); });
  $("mc-gesp").addEventListener("click", function () { esp(this, false, membrosPainel(grupoFoco).slice(0, 1).map(function (m) { return m.id; })); });
  $("mc-gdesp").addEventListener("click", function () { esp(this, true, membrosPainel(grupoFoco).slice(0, 1).map(function (m) { return m.id; })); });
  $("mc-vesp").addEventListener("click", function () { esp(this, false, mselLista()); });
  $("mc-vdesp").addEventListener("click", function () { esp(this, true, mselLista()); });
  // recuo, giro e pivô: direto, sem recarregar
  // pin (X, altura, recuo): só este painel anda; o giro fica
  ["m-x", "m-y", "mc-z"].forEach(function (id) {
    $(id).addEventListener("change", function () {
      var t = selected && tById[selected];
      if (!t) return;
      var x = mnum(String($("m-x").value).replace(",", ".")), y = mnum(String($("m-y").value).replace(",", ".")), r = mnum(String($("mc-z").value || 0).replace(",", "."));
      if (x === null || y === null || r === null || Math.abs(r) > 200) { pmsg("Posição fora do limite (até 200 m)."); renderCartao(); return; }
      var P = posCampos(t);
      if (x === P[0] && y === P[1] && r === P[2]) return;
      porPin(t, x, y, r);
      aplicarVivo(t);
    });
  });
  // giro em volta do pin: o pin fica
  ["rx", "ry", "rz"].forEach(function (k) {
    $("mc-" + k).addEventListener("change", function () {
      var t = selected && tById[selected];
      if (!t) return;
      var G = giroCampos(t), g = { rx: G.rx, ry: G.ry, rz: G.rz };
      g[k] = limpaGiro(String($("mc-" + k).value || 0).replace(",", "."));
      if (g[k] === (G[k] || 0)) { renderCartao(); return; }
      porGiro(t, g);
      aplicarVivo(t);
    });
  });
  $("mc-ref").addEventListener("click", function () { refPalco = !refPalco; renderCartao(); });
  var spv = $("mc-pv");
  Object.keys(PIVOS).forEach(function (k) { var o = document.createElement("option"); o.value = k; o.textContent = PIVOS[k][2]; spv.appendChild(o); });
  spv.addEventListener("change", function () {
    var t = selected && tById[selected];
    if (!t) return;
    var n = trocarPivo(t, spv.value); // o painel fica onde está; só o ponto de giro muda
    t.mx = mnum(n.mx); t.my = mnum(n.my); t.z = mnum(n.z) || 0; t.pv = limpaPivo(spv.value);
    aplicarVivo(t);
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
  // grupo como um painel: o pin do grupo e o giro dele em volta do pin; os membros não mudam (sem recarregar)
  ["mc-gx", "mc-gy", "mc-gz"].forEach(function (id) {
    $(id).addEventListener("change", function () {
      var p = painelById(grupoFoco);
      if (!p) return;
      var x = mnum(String($("mc-gx").value).replace(",", ".")), y = mnum(String($("mc-gy").value).replace(",", ".")), r = mnum(String($("mc-gz").value || 0).replace(",", "."));
      if (x === null || y === null || r === null) { renderCartao(); return; }
      aplicarVivoLista(porGrupo(p.id, x, y, r));
    });
  });
  ["mc-grx", "mc-gry", "mc-grz"].forEach(function (id) {
    $(id).addEventListener("change", function () {
      var p = painelById(grupoFoco);
      if (!p) return;
      var n = { rx: limpaGiro(String($("mc-grx").value || 0).replace(",", ".")), ry: limpaGiro(String($("mc-gry").value || 0).replace(",", ".")), rz: limpaGiro(String($("mc-grz").value || 0).replace(",", ".")) };
      if (n.rx === (p.rx || 0) && n.ry === (p.ry || 0) && n.rz === (p.rz || 0)) { renderCartao(); return; }
      aplicarVivoLista(girarGrupoPara(p.id, n));
    });
  });
  var gpv = $("mc-gpv");
  Object.keys(PIVOS).forEach(function (k) { var o = document.createElement("option"); o.value = k; o.textContent = PIVOS[k][2]; gpv.appendChild(o); });
  gpv.addEventListener("change", function () { var p = painelById(grupoFoco); if (p) aplicarVivoLista(trocarPinDoGrupo(p.id, gpv.value)); });
  $("mc-gdes").addEventListener("click", function () { var pn = grupoFoco; grupoFoco = null; desagrupar(pn); });
  $("mc-gdup").addEventListener("click", function () { var m = membrosPainel(grupoFoco); if (m.length) duplicarPainel(m[0].id); });
  twoStep($("mc-gdel"), "Excluir grupo", "Confirmar?", function () { var m = membrosPainel(grupoFoco); if (m.length) excluirPaineis(m.map(function (t) { return t.id; })); });
  $("mc-gir").addEventListener("click", function () { var m = membrosPainel(grupoFoco); if (m.length) viewM.enquadrar(caixaRig(m)); });
  twoStep($("mc-vdel"), "Excluir", "Confirmar?", function () { var ids = mselLista(); if (ids.length) excluirPaineis(ids); });
}

