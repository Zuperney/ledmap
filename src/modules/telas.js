import { GABINETES, GAB, gabPadrao } from "./gabinetes.js";
import { save, STORE, EXTRAS, BASE, res, nf, fmt, tiles, scaledPos, freeSpot, groups, gname, EXTRA_MAX, cleanExtra, set_EXTRAS, bbox, membrosPainel, novoPainel, painelById, pnome, paineis, set_paineis, vistaM, gravarVivo } from "./core.js";
import { caixa, caixaDe, limpaGiro, extensao, medidaNoPin } from "./espaco.js";
import { ksave, kflush, twoStep, routes } from "./cabeamento.js";
import { deleteLater } from "./tabela.js";
import { curTab } from "./abas.js";
import { pmsg } from "./exportar.js";
import { planoMisto, sugerirComplemento, descreverEixo } from "./misto.js";
import { formarGrupo } from "./grupos.js";

let KEY_REOPEN, KEY_PEND, addModal, aName, aW, aH, aPrev, aErr, editando = null;

export function commitAndReload(reopen, pending) {
    save(); ksave(); kflush();
    try {
      var chk = JSON.parse(localStorage.getItem(STORE) || "null");
      if (!chk || JSON.stringify(chk.extras) !== JSON.stringify(EXTRAS)) return false;
      if (reopen) localStorage.setItem(KEY_REOPEN, reopen);
      if (pending) localStorage.setItem(KEY_PEND, pending);
    } catch (e) { return false; }
    try { location.reload(); } catch (e) { return false; }
    return true;
  }

export function nextExtraId() {
    var m = 0;
    BASE.forEach(function (b) { m = Math.max(m, parseInt(b.id, 10) || 0); });
    return String(m + 1);
  }

function mult(v) { v = Number(v); return isFinite(v) && v > 0 && v <= 30; }

let aCab, aCab2, aMisto;
function misto() { return !!(aMisto && aMisto.checked && !editando); }
function planoAtual() {
  var gA = GAB[aCab.value], gB = GAB[aCab2.value];
  return gA && gB && mult(aW.value) && mult(aH.value) ? planoMisto(Number(aW.value), Number(aH.value), gA, gB, document.getElementById("a-posv").value, document.getElementById("a-posh").value) : null;
}

function updatePrev() {
    if (!GAB[aCab.value]) { aPrev.textContent = "A biblioteca está vazia: crie um gabinete primeiro."; return; }
    document.getElementById("a-misto-box").hidden = !misto();
    document.getElementById("a-cab-l").textContent = misto() ? "Gabinete principal" : "Gabinete";
    if (misto()) {
      if (!mult(aW.value) || !mult(aH.value)) { aPrev.textContent = "Informe largura e altura entre 0,1 e 30 m."; return; }
      var gA = GAB[aCab.value], gB = GAB[aCab2.value], p = planoAtual();
      if (!p) { aPrev.textContent = "Esses dois gabinetes não fecham " + fmt(Number(aW.value)) + " × " + fmt(Number(aH.value)) + " m. Troque o complemento (Sugerir complemento) ou a medida."; return; }
      aPrev.textContent = "Altura: " + descreverEixo(p.altura, gA.mh, gB.mh) + " · Largura: " + descreverEixo(p.largura, gA.mw, gB.mw) + " · " + p.total + " gabinetes (" + p.nA + " principais + " + p.nB + " de complemento)" +
        (p.blocos.length > 1 ? " · vira um grupo de " + p.blocos.length + " painéis, que funciona como um painel só" : " · fecha só com o principal: um painel comum");
      return;
    }
    if (!mult(aW.value) || !mult(aH.value)) { aPrev.textContent = "Informe largura e altura entre 0,1 e 30 m."; return; }
    var g = GAB[aCab.value], q = res({ w: Number(aW.value), h: Number(aH.value), kind: "imag", cab: aCab.value });
    aPrev.textContent = "Gabinete " + fmt(g.mw * 100) + " × " + fmt(g.mh * 100) + " cm · painel final " +fmt(q.cols * g.mw) + " × " + fmt(q.rows * g.mh) + " m · " + q.cols + " × " + q.rows + " gabinetes (" + (q.cols * q.rows) + ") · " + q.w + " × " + q.h + " px · " + nf(q.total) + " px no total";
  }

// espaço livre de w × h na vista (padrão Frente), olhando o contorno de todos os painéis nela (U para a direita, V para cima)
export function freeM(w, h, vista) {
    vista = vista || "frente";
    var cx = tiles.map(function (b) { return caixa(b, vista); });
    function hitAt(x, y) { return cx.some(function (b) { return x < b.u1 - 1e-6 && b.u0 < x + w - 1e-6 && y < b.v1 - 1e-6 && b.v0 < y + h - 1e-6; }); }
    var x, y;
    // o 0 fica no meio: procura o espaço livre mais perto dele, linha a linha a partir do chão
    function xs(lim) { var l = []; for (var k = -lim; k <= lim - w + 1e-9; k += 0.5) l.push(k); return l.sort(function (p, q) { return Math.abs(p + w / 2) - Math.abs(q + w / 2) || q - p; }); }
    var perto = xs(14), longe = xs(60);
    for (y = 0; y <= 8 - h + 1e-9; y += 0.5) for (var i = 0; i < perto.length; i++) if (!hitAt(perto[i], y)) return { x: perto[i], y: y };
    for (y = 0; y <= 30 - h + 1e-9; y += 0.5) for (var j = 0; j < longe.length; j++) if (!hitAt(longe[j], y)) return { x: longe[j], y: y };
    return null;
  }

// painel novo de frente para quem olha a vista atual. Frente e Topo: sem giro, no chão, perto do centro.
// Esquerda/Direita: virado para essa lateral (giro Y de −90° ou 90°), fora do conjunto, no espaço livre dessa vista.
function posNova(w, h) {
    if (vistaM !== "esq" && vistaM !== "dir") { var f = freeM(w, h); return f && { mx: f.x, my: f.y, z: 0, ry: 0 }; }
    var l = freeM(w, h, vistaM);
    if (!l) return null;
    var tudo = tiles.length ? caixaDe(tiles, "frente") : { u0: 0, u1: 0 };
    var esq = vistaM === "esq", X = esq ? tudo.u0 - 1 : tudo.u1 + 1, Zc = (esq ? 1 : -1) * (l.x + w / 2);
    return { mx: X - w / 2, my: l.y, z: -Zc, ry: esq ? -90 : 90, pv: "b" };
  }

export function freeC(t) {
    var q = res(t), p = scaledPos(t), all = tiles.concat(BASE);
    var hit = all.some(function (o) { var b = res(o); return p.x < o.cx + b.w && o.cx < p.x + q.w && p.y < o.cy + b.h && o.cy < p.y + q.h; });
    return hit ? (freeSpot(q.w, q.h, all) || freeSpot(q.w, q.h, BASE) || p) : p;
  }

// sem id: adicionar painel; com id: editar nome, tamanho e gabinete de um painel que já existe
export function openAdd(id) {
    var e = typeof id === "string" ? EXTRAS.filter(function (x) { return x.id === id; })[0] : null;
    editando = e ? e.id : null;
    document.getElementById("add-title").textContent = e ? "Editar painel " + e.id : "Adicionar painel";
    document.getElementById("a-ok").textContent = e ? "Salvar" : "Adicionar";
    aName.value = e ? e.name : "Painel " + nextExtraId();
    document.getElementById("a-misto-fld").hidden = !!e; // misto só ao criar
    if (e) aMisto.checked = false;
    if (e) { aW.value = e.w; aH.value = e.h; preencherCabs(e.cab); }
    document.getElementById("a-z-fld").hidden = !e;
    document.getElementById("a-z").value = e && e.z ? e.z : "";
    aErr.textContent = "";
    updatePrev();
    addModal.hidden = false;
    aName.focus();
  }

function closeAdd() { addModal.hidden = true; }

// lista de gabinetes do modal de painel; chamada de novo quando a biblioteca muda
export function preencherCabs(valor) {
    if (!aCab) return;
    var v = valor || aCab.value;
    aCab.textContent = "";
    GABINETES.forEach(function (g) {
      var o = document.createElement("option"); o.value = g.id;
      o.textContent = g.nome + " · " + g.rx + "×" + g.ry + " px · " + Math.round(g.mw * 1000) / 10 + "×" + Math.round(g.mh * 1000) / 10 + " cm";
      aCab.appendChild(o);
    });
    var pd = gabPadrao();
    aCab.value = GAB[v] ? v : (pd ? pd.id : "");
    if (aCab2) {
      var v2 = aCab2.value;
      aCab2.textContent = "";
      Array.prototype.forEach.call(aCab.options, function (o) { aCab2.appendChild(o.cloneNode(true)); });
      aCab2.value = GAB[v2] ? v2 : aCab.value;
    }
    if (!addModal.hidden) updatePrev();
  }

// exclui painéis (e as rotas de cabo que passam por eles) e recarrega
export function excluirPaineis(ids) {
    if (!ids.length) return;
    var prevEx = EXTRAS;
    set_EXTRAS(EXTRAS.filter(function (e) { return ids.indexOf(e.id) < 0; }));
    Object.keys(routes).forEach(function (pid) {
      routes[pid] = routes[pid].filter(function (k) { return ids.indexOf(k.split(":")[0]) < 0; });
    });
    if (!commitAndReload(curTab, "")) { set_EXTRAS(prevEx); pmsg("Não consegui salvar a exclusão neste navegador."); }
  }

export function init() {
  KEY_REOPEN = "mapa-telas-led-reopen";
  KEY_PEND = "mapa-telas-led-pending";
  deleteLater.forEach(function (pair) {
      twoStep(pair[0], "Excluir", "Confirmar?", function () { excluirPaineis([pair[1]]); });
    });
  addModal = document.getElementById("add-modal");
  aName = document.getElementById("a-name");
  aW = document.getElementById("a-w");
  aH = document.getElementById("a-h");
  aPrev = document.getElementById("a-prev");
  aErr = document.getElementById("a-err");
  aCab = document.getElementById("a-cab");
  aCab2 = document.getElementById("a-cab2");
  aMisto = document.getElementById("a-misto");
  preencherCabs((gabPadrao() || {}).id);
  [aCab, aW, aH, aCab2, document.getElementById("a-posv"), document.getElementById("a-posh")].forEach(function (n) { n.addEventListener("input", updatePrev); });
  aMisto.addEventListener("change", function () { if (aMisto.checked && aCab2.value === aCab.value) sugerir(true); updatePrev(); });
  document.getElementById("a-sugerir").addEventListener("click", function () { sugerir(false); });
  document.getElementById("add-open2").addEventListener("click", function () { openAdd(); });
  document.getElementById("add-open3").addEventListener("click", function () { openAdd(); });
  document.getElementById("a-cancel").addEventListener("click", closeAdd);
  addModal.addEventListener("click", function (e) { if (e.target === addModal) closeAdd(); });
  document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      closeAdd();
      document.getElementById("img-modal").hidden = true;
    });
  document.getElementById("a-ok").addEventListener("click", function () {
      aErr.textContent = "";
      if (!GAB[aCab.value]) { aErr.textContent = "Escolha um gabinete (a biblioteca está vazia: crie um em Criar ou editar gabinetes)."; return; }
      if (editando) { salvarEdicao(); return; }
      if (misto()) { criarMisto(); return; }
      if (EXTRAS.length >= EXTRA_MAX) { aErr.textContent = "Limite de " + EXTRA_MAX + " painéis."; return; }
      if (!mult(aW.value) || !mult(aH.value)) { aErr.textContent = "Informe largura e altura válidas (até 30 m)."; return; }
      var id = nextExtraId();
      if (Number(id) > 999) { aErr.textContent = "Numeração esgotada."; return; }
      var w = Number(aW.value), h = Number(aH.value);
      var fm = posNova(w, h);
      if (!fm) { aErr.textContent = "Sem espaço livre na montagem."; return; }
      var fc = freeC({ w: w, h: h, kind: "imag", cab: aCab.value, mx: fm.mx, my: fm.my });
      var c = cleanExtra({ id: id, name: aName.value, kind: "imag", cab: aCab.value, w: w, h: h, mx: fm.mx, my: fm.my, z: fm.z, ry: fm.ry, pv: fm.pv, cx: fc.x, cy: fc.y, grp: "" });
      if (!c) { aErr.textContent = "Dimensões ou posição fora do limite (até 30 m de largura e altura)."; return; }
      EXTRAS.push(c);
      if (!commitAndReload(curTab + ":" + id)) {
        EXTRAS.pop();
        aErr.textContent = "Não consegui salvar neste navegador, então o painel não foi adicionado.";
      }
    });
}

// cria um painel desenhado no Palco (ferramenta Painel): w × h em gabinetes inteiros, canto de baixo à esquerda em
// (mx, my), de frente para o público, pin no meio de baixo. Devolve "" ou o motivo de não ter criado.
export function criarPainelEm(w, h, mx, my, cab) {
    if (!GAB[cab]) return "Escolha um gabinete.";
    if (EXTRAS.length >= EXTRA_MAX) return "Limite de " + EXTRA_MAX + " painéis.";
    var id = nextExtraId();
    if (Number(id) > 999) return "Numeração esgotada.";
    var fc = freeC({ w: w, h: h, kind: "imag", cab: cab, mx: mx, my: my });
    var c = cleanExtra({ id: id, name: "Painel " + id, kind: "imag", cab: cab, w: w, h: h, mx: Math.round(mx * 1000) / 1000, my: Math.round(my * 1000) / 1000, z: 0, pv: "b", cx: fc.x, cy: fc.y, grp: "" });
    if (!c) return "Medida ou posição fora do limite (até 30 m de painel).";
    EXTRAS.push(c);
    try { localStorage.setItem("ledmap-msg", "Painel " + id + ": " + fmt(w) + " × " + fmt(h) + " m."); } catch (e) {}
    if (!commitAndReload(curTab + ":" + id)) { EXTRAS.pop(); return "Não consegui salvar neste navegador."; }
    return "";
  }

// sugere o complemento do painel misto (mesmo pitch, menos gabinetes no total)
function sugerir(quieto) {
    var gA = GAB[aCab.value];
    if (!gA || !mult(aW.value) || !mult(aH.value)) return;
    var s = sugerirComplemento(Number(aW.value), Number(aH.value), gA, GABINETES, document.getElementById("a-posv").value, document.getElementById("a-posh").value);
    if (s) { aCab2.value = s.g.id; aErr.textContent = ""; }
    else if (!quieto) aErr.textContent = "Nenhum gabinete da biblioteca com o mesmo pitch fecha essa medida junto com o principal.";
    updatePrev();
  }

// cria o painel misto: um painel por bloco (principal, faixa, coluna, canto), todos num grupo com o nome do painel,
// pin no meio de baixo. Na Screen os blocos ficam lado a lado como na montagem.
function criarMisto() {
    var w = Number(aW.value), h = Number(aH.value), gA = GAB[aCab.value], gB = GAB[aCab2.value];
    if (!mult(aW.value) || !mult(aH.value)) { aErr.textContent = "Informe largura e altura válidas (até 30 m)."; return; }
    var p = planoAtual();
    if (!p) { aErr.textContent = "Esses dois gabinetes não fecham a medida: troque o complemento ou a medida."; return; }
    if (EXTRAS.length + p.blocos.length > EXTRA_MAX) { aErr.textContent = "Limite de " + EXTRA_MAX + " painéis."; return; }
    var base = Number(nextExtraId());
    if (base + p.blocos.length - 1 > 999) { aErr.textContent = "Numeração esgotada."; return; }
    var fm = posNova(w, h);
    if (!fm) { aErr.textContent = "Sem espaço livre na montagem."; return; }
    var nome = (aName.value.trim() || "Painel " + base).slice(0, 40), fc = freeC({ w: w, h: h, kind: "imag", cab: gA.id, mx: fm.mx, my: fm.my });
    var kx = gA.rx / gA.mw, ky = gA.ry / gA.mh; // px por metro (o complemento tem o mesmo pitch)
    var NOME = { principal: "", faixa: " · faixa", coluna: " · coluna", canto: " · canto" };
    var antesEx = EXTRAS.length, antesT = tiles.length, antesP = paineis.slice(), novos = [];
    var falhou = p.blocos.some(function (b, i) {
      var g = b.cab === "a" ? gA : gB, nid = String(base + i);
      var c = cleanExtra({ id: nid, name: (nome + NOME[b.papel]).slice(0, 40), kind: "imag", cab: g.id, w: b.w, h: b.h, mx: r3(fm.mx + b.x), my: r3(fm.my + b.y), z: fm.z, pv: "b",
        cx: Math.round(fc.x + b.x * kx), cy: Math.round(fc.y + (h - b.y - b.h) * ky), grp: "" });
      if (!c) return true;
      EXTRAS.push(c);
      var t = Object.assign({}, c, { pn: "" });
      tiles.push(t); novos.push(t);
      return false;
    });
    var desfaz = function () { EXTRAS.length = antesEx; tiles.length = antesT; set_paineis(antesP); };
    if (falhou) { desfaz(); aErr.textContent = "Dimensões ou posição fora do limite."; return; }
    if (novos.length > 1) {
      var g = novoPainel(); g.name = nome;
      formarGrupo(g, novos); // pin no meio de baixo da caixa: nada se move
      if (fm.ry) g.ry = fm.ry; // vista lateral: o grupo nasce virado para ela
    } else if (fm.ry) { novos[0].ry = fm.ry; gravarVivo(novos); }
    try { localStorage.setItem("ledmap-msg", nome + ": painel misto com " + p.total + " gabinetes" + (novos.length > 1 ? " em " + novos.length + " partes (um grupo)." : ".")); } catch (e) {}
    if (!commitAndReload(curTab + ":" + base)) { try { localStorage.removeItem("ledmap-msg"); } catch (e) {} desfaz(); aErr.textContent = "Não consegui salvar neste navegador."; }
  }

// grava nome, tamanho e gabinete; a posição (Rig e Screen), a Screen e o grupo ficam como estão.
// Se a grade de gabinetes muda, as rotas de cabo que passavam por este painel saem (as células mudaram).
function salvarEdicao() {
    if (!mult(aW.value) || !mult(aH.value)) { aErr.textContent = "Informe largura e altura válidas (até 30 m)."; return; }
    var i = EXTRAS.findIndex(function (x) { return x.id === editando; });
    if (i < 0) { closeAdd(); return; }
    var antes = EXTRAS[i], t = tiles.filter(function (x) { return x.id === editando; })[0] || antes;
    var np = medidaNoPin(t, Number(aW.value), Number(aH.value)); // a medida cresce a partir do pin
    // recortes: com outro gabinete a grade é outra, então saem; mudando só o tamanho, ficam os que ainda cabem
    var c = cleanExtra(Object.assign({}, antes, { name: aName.value, cab: aCab.value, w: Number(aW.value), h: Number(aH.value), mx: np.mx, my: np.my, cx: t.cx, cy: t.cy, off: antes.cab !== aCab.value ? [] : antes.off, z: document.getElementById("a-z").value }));
    if (!c) { aErr.textContent = "Dimensões fora do limite (até 30 m de largura e altura)."; return; }
    var qa = res(antes), qn = res(c), mudouGrade = antes.cab !== c.cab || qa.cols !== qn.cols || qa.rows !== qn.rows;
    EXTRAS[i] = c;
    var pos0 = [t.mx, t.my]; t.mx = c.mx; t.my = c.my; // a medida cresce a partir do pin (mpos sai dos tiles)
    var tirou = 0;
    if (mudouGrade) Object.keys(routes).forEach(function (pid) { var n0 = routes[pid].length; routes[pid] = routes[pid].filter(function (k) { return k.split(":")[0] !== c.id; }); tirou += n0 - routes[pid].length; });
    try { localStorage.setItem("ledmap-msg", tirou ? "Painel " + c.id + " atualizado. As rotas de cabo dele foram limpas: refaça o cabeamento." : "Painel " + c.id + " atualizado."); } catch (e) {}
    if (!commitAndReload(curTab + ":" + c.id)) { EXTRAS[i] = antes; t.mx = pos0[0]; t.my = pos0[1]; try { localStorage.removeItem("ledmap-msg"); } catch (e) {} aErr.textContent = "Não consegui salvar neste navegador."; }
  }

// duplica o painel; se ele estiver num grupo, duplica o grupo inteiro (mesma arrumação, grupo novo "… cópia").
// A cópia vai para o primeiro espaço livre no Rig e na Screen; Screen, gabinete e tamanho são os mesmos.
export function duplicarPainel(id) {
    var t = tiles.filter(function (x) { return x.id === id; })[0];
    if (!t) return;
    var orig = t.pn && painelById(t.pn), mem = orig ? membrosPainel(t.pn) : [t];
    if (EXTRAS.length + mem.length > EXTRA_MAX) { pmsg("Limite de " + EXTRA_MAX + " painéis."); return; }
    var base = Number(nextExtraId());
    if (base + mem.length - 1 > 999) { pmsg("Numeração esgotada."); return; }
    // o espaço que o conjunto ocupa no palco (com giro e grupo): a cópia anda até um lugar livre
    var fr = faixa(mem, true), x0 = fr.x0, y0 = fr.y0;
    var fm = freeM(fr.x1 - fr.x0, fr.y1 - fr.y0);
    if (!fm) { pmsg("Sem espaço livre na montagem para a cópia."); return; }
    var cb = bbox(mem), fc = freeSpot(cb.w, cb.h, tiles.concat(BASE)) || { x: cb.x, y: cb.y };
    var dx = fm.x - x0, dy = fm.y - y0, dcx = fc.x - cb.x, dcy = fc.y - cb.y;
    var antesEx = EXTRAS.length, antesT = tiles.length, antesP = paineis.slice(), novoG = null;
    // grupo: a cópia é um grupo novo com o mesmo giro e o pin deslocado; os membros copiam os valores relativos
    if (orig) { novoG = novoPainel(); Object.assign(novoG, { gx: r3((orig.gx || 0) + dx), gy: r3((orig.gy || 0) + dy), gz: orig.gz || 0, rx: orig.rx || 0, ry: orig.ry || 0, rz: orig.rz || 0, pv: orig.pv }); novoG.name = (pnome(orig) + " cópia").slice(0, 40); }
    var falhou = mem.some(function (m, i) {
      var nid = String(base + i), mx = orig ? m.mx : r3(m.mx + dx), my = orig ? m.my : r3(m.my + dy);
      var c = cleanExtra({ id: nid, name: (m.name + " cópia").slice(0, 40), kind: m.kind, cab: m.cab, w: m.w, h: m.h, mx: mx, my: my, cx: m.cx + dcx, cy: m.cy + dcy, grp: m.grp || "", off: m.off, z: m.z, rx: m.rx, ry: m.ry, rz: m.rz, pv: m.pv });
      if (!c) return true;
      EXTRAS.push(c);
      // entra também em tiles para o save() gravar a posição exata e o grupo antes de recarregar
      tiles.push(Object.assign({}, c, { mx: mx, my: my, pn: novoG ? novoG.id : "" }));
      return false;
    });
    var desfaz = function (msg) { EXTRAS.length = antesEx; tiles.length = antesT; set_paineis(antesP); pmsg(msg); };
    if (falhou) { desfaz("Não foi possível duplicar."); return; }
    try { localStorage.setItem("ledmap-msg", orig ? pnome(orig) + " duplicado: " + mem.length + " painéis em " + pnome(novoG) + "." : "Painel " + t.id + " duplicado."); } catch (e) {}
    if (!commitAndReload(curTab + ":" + base)) { try { localStorage.removeItem("ledmap-msg"); } catch (e) {} desfaz("Não consegui salvar neste navegador."); }
  }

// Duplicar várias: cópias do painel (ou do grupo inteiro) deslocadas no palco por desl = [[dx, dy, dRecuo], …].
// Cada cópia é igual ao original (giro, pin, gabinete); grupo vira grupo novo com o pin deslocado e os membros com os
// mesmos valores relativos. Na Screen, cada cópia vai para o primeiro espaço livre. juntar: o original (solto) e as
// cópias viram um grupo só.
export function duplicarEm(id, desl, juntar) {
    var t = tiles.filter(function (x) { return x.id === id; })[0];
    if (!t || !desl.length) return "Nada para duplicar.";
    var orig = t.pn && painelById(t.pn), mem = orig ? membrosPainel(t.pn) : [t], total = mem.length * desl.length;
    if (EXTRAS.length + total > EXTRA_MAX) return "Limite de " + EXTRA_MAX + " painéis: dá para criar mais " + Math.max(0, Math.floor((EXTRA_MAX - EXTRAS.length) / mem.length)) + " cópia(s).";
    var base = Number(nextExtraId());
    if (base + total - 1 > 999) return "Numeração esgotada.";
    var antesEx = EXTRAS.length, antesT = tiles.length, antesP = paineis.slice(), copias = [], k = 0, cb = bbox(mem);
    var falhou = desl.some(function (d, ci) {
      var g = null;
      if (orig) { g = novoPainel(); Object.assign(g, { gx: r3((orig.gx || 0) + d[0]), gy: r3((orig.gy || 0) + d[1]), gz: r3((orig.gz || 0) + d[2]), rx: orig.rx || 0, ry: orig.ry || 0, rz: orig.rz || 0, pv: orig.pv }); g.name = (pnome(orig) + " " + (ci + 2)).slice(0, 40); }
      var fc = freeSpot(cb.w, cb.h, tiles.concat(BASE)) || { x: cb.x, y: cb.y };
      return mem.some(function (m) {
        var nid = String(base + k++), mx = orig ? m.mx : r3(m.mx + d[0]), my = orig ? m.my : r3(m.my + d[1]), z = orig ? (m.z || 0) : r3((m.z || 0) + d[2]);
        var c = cleanExtra({ id: nid, name: (m.name + " " + (ci + 2)).slice(0, 40), kind: m.kind, cab: m.cab, w: m.w, h: m.h, mx: mx, my: my, cx: m.cx + fc.x - cb.x, cy: m.cy + fc.y - cb.y, grp: m.grp || "", off: m.off, z: z, rx: m.rx, ry: m.ry, rz: m.rz, pv: m.pv });
        if (!c) return true;
        EXTRAS.push(c);
        var nt = Object.assign({}, c, { mx: mx, my: my, z: z, pn: g ? g.id : "" });
        tiles.push(nt); copias.push(nt);
        return false;
      });
    });
    if (falhou) { EXTRAS.length = antesEx; tiles.length = antesT; set_paineis(antesP); return "Alguma cópia ficaria fora do limite (até 200 m do centro)."; }
    if (juntar && !orig) { var gj = novoPainel(); gj.name = (t.name + " (conjunto)").slice(0, 40); formarGrupo(gj, [t].concat(copias)); }
    try { localStorage.setItem("ledmap-msg", (orig ? pnome(orig) : "Painel " + t.id) + ": " + desl.length + " cópia(s)" + (juntar && !orig ? ", tudo num grupo." : ".")); } catch (e) {}
    if (!commitAndReload(curTab + ":" + base)) { try { localStorage.removeItem("ledmap-msg"); } catch (e) {} EXTRAS.length = antesEx; tiles.length = antesT; set_paineis(antesP); return "Não consegui salvar neste navegador."; }
    return "";
  }
// tamanho do painel (ou do grupo) no palco: largura em X, altura e fundo (recuo), com giro e grupo
export function medidaNoPalco(id) {
    var t = tiles.filter(function (x) { return x.id === id; })[0];
    if (!t) return null;
    var mem = t.pn && painelById(t.pn) ? membrosPainel(t.pn) : [t], e = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity, r0: Infinity, r1: -Infinity };
    mem.forEach(function (m) { var x = extensao(m); e.x0 = Math.min(e.x0, x.x0); e.x1 = Math.max(e.x1, x.x1); e.y0 = Math.min(e.y0, x.y0); e.y1 = Math.max(e.y1, x.y1); e.r0 = Math.min(e.r0, x.r0); e.r1 = Math.max(e.r1, x.r1); });
    return { w: e.x1 - e.x0, h: e.y1 - e.y0, d: e.r1 - e.r0, grupo: mem.length > 1 ? (t.pn && painelById(t.pn)) : null, n: mem.length };
  }

// limpa as rotas de cabo que passam pelos painéis (as células deles mudaram)
function limparRotasDe(ids) {
    var tirou = 0;
    Object.keys(routes).forEach(function (pid) { var n0 = routes[pid].length; routes[pid] = routes[pid].filter(function (k) { return ids.indexOf(k.split(":")[0]) < 0; }); tirou += n0 - routes[pid].length; });
    return tirou;
  }

function gravarEAbrir(id, msg, desfaz) {
    try { localStorage.setItem("ledmap-msg", msg); } catch (e) {}
    if (!commitAndReload(curTab + ":" + id)) { try { localStorage.removeItem("ledmap-msg"); } catch (e) {} if (desfaz) desfaz(); pmsg("Não consegui salvar neste navegador."); }
  }

// edita campos de um painel direto do cartão (ex.: { w, h }); a posição, a Screen e o grupo ficam.
// Devolve "" ou o motivo de não ter aplicado.
export function editarPainel(id, campos) {
    var i = EXTRAS.findIndex(function (x) { return x.id === id; });
    if (i < 0) return "Painel não encontrado.";
    var antes = EXTRAS[i], t = tiles.filter(function (x) { return x.id === id; })[0] || antes;
    var c = cleanExtra(Object.assign({}, antes, { mx: t.mx, my: t.my, cx: t.cx, cy: t.cy }, campos));
    if (!c) return "Medida fora do limite (até 30 m).";
    var qa = res(antes), qn = res(c);
    // recortes que ficaram fora da grade nova (painel diminuiu) saem
    c.off = (c.off || []).filter(function (k) { var p = k.split(":"); return Number(p[0]) < qn.cols && Number(p[1]) < qn.rows; });
    var mudouGrade = antes.cab !== c.cab || qa.cols !== qn.cols || qa.rows !== qn.rows;
    if (!mudouGrade && c.w === antes.w && c.h === antes.h) return "";
    EXTRAS[i] = c;
    // a posição gravada (mpos) sai dos tiles: o canto novo (a medida cresce a partir do pin) vai para o painel também
    var pos0 = [t.mx, t.my]; t.mx = c.mx; t.my = c.my;
    var tirou = mudouGrade ? limparRotasDe([c.id]) : 0;
    gravarEAbrir(c.id, "Painel " + c.id + ": " + fmt(c.w) + " × " + fmt(c.h) + " m." + (tirou ? " As rotas de cabo dele foram limpas: refaça o cabeamento." : ""), function () { EXTRAS[i] = antes; t.mx = pos0[0]; t.my = pos0[1]; });
    return "";
  }

// ---- Espelhar ----
// O Rig tem o x = 0 no centro do palco: espelhar no eixo X troca o sinal do x (3 m → −3 m).
// modo "x": do outro lado do eixo 0 · "y": de cabeça para baixo · "proprio": inverte em torno do próprio centro.
// recortes invertidos: "h" da esquerda para a direita, "v" de cima para baixo
function offEspelhado(t, dir) {
    var q = res(t);
    return (t.off || []).map(function (k) {
      var p = k.split(":"), c = Number(p[0]), r = Number(p[1]);
      return dir === "v" ? c + ":" + (q.rows - 1 - r) : (q.cols - 1 - c) + ":" + r;
    });
  }

// giro e pivô espelhados: no eixo X (esquerda ↔ direita) o Y e o Z trocam de sinal e o pivô troca de lado;
// no eixo Y (de cabeça para baixo) o X e o Z trocam de sinal e o pivô troca cima ↔ baixo
var PV_H = { tl: "tr", tr: "tl", l: "r", r: "l", bl: "br", br: "bl" }, PV_V = { tl: "bl", bl: "tl", t: "b", b: "t", tr: "br", br: "tr" };
function giroEspelhado(t, v) {
    var pv = t.pv || "b";
    return v ? { rx: limpaGiro(-(t.rx || 0)), ry: t.ry || 0, rz: limpaGiro(-(t.rz || 0)), pv: PV_V[pv] || pv }
      : { rx: t.rx || 0, ry: limpaGiro(-(t.ry || 0)), rz: limpaGiro(-(t.rz || 0)), pv: PV_H[pv] || pv };
  }

// os painéis e, se algum estiver num grupo, o grupo inteiro
function comGrupos(ids) {
    var set = {};
    ids.forEach(function (id) {
      var t = tiles.filter(function (x) { return x.id === id; })[0];
      if (!t) return;
      (t.pn && painelById(t.pn) ? membrosPainel(t.pn) : [t]).forEach(function (m) { set[m.id] = m; });
    });
    return Object.keys(set).map(function (k) { return set[k]; });
  }

// contorno de uma lista: no Rig, onde ela fica no palco em metros (com giro e grupo; y do chão para cima),
// no canvas em px (y para baixo)
function faixa(lista, rig) {
    var x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    lista.forEach(function (t) {
      if (rig) { var e = extensao(t); x0 = Math.min(x0, e.x0); x1 = Math.max(x1, e.x1); y0 = Math.min(y0, e.y0); y1 = Math.max(y1, e.y1); return; }
      var q = res(t);
      x0 = Math.min(x0, t.cx); x1 = Math.max(x1, t.cx + q.w); y0 = Math.min(y0, t.cy); y1 = Math.max(y1, t.cy + q.h);
    });
    return { x0: x0, x1: x1, y0: y0, y1: y1 };
  }

function r2(v) { return Math.round(v * 1000) / 1000; }
function r3(v) { return Math.round(v * 1000) / 1000 || 0; }

// Espelhar respeita a árvore (regra 14 do PLANO.md). Painel solto: o pin vai para o outro lado do plano (x = a ou
// altura = a) e o giro e o pin trocam de lado. Grupo: o mesmo com o pin e o giro do grupo, e os membros espelham no
// espaço do grupo em volta do pin dele (plano 0). Espelhar duas vezes volta ao original.
function espelharPeca(t, v, a) { // devolve { mx, my } do quadro espelhado (painel solto: plano a; membro: plano 0)
    return v ? { mx: t.mx, my: r2(2 * a - (t.my + t.h)) } : { mx: r2(2 * a - (t.mx + t.w)), my: t.my };
  }
function grupoEspelhado(g, v, a) {
    var e = giroEspelhado(g, v);
    return v ? { gx: g.gx || 0, gy: r3(2 * a - (g.gy || 0)), gz: g.gz || 0, rx: e.rx, ry: e.ry, rz: e.rz, pv: e.pv }
      : { gx: r3(2 * a - (g.gx || 0)), gy: g.gy || 0, gz: g.gz || 0, rx: e.rx, ry: e.ry, rz: e.rz, pv: e.pv };
  }

var NOME_MODO = { x: "no eixo X", y: "no eixo Y", proprio: "no próprio eixo" };

// inverte os painéis: no Rig conforme o modo; na Screen, em torno do centro do próprio conjunto (a ordem fica espelhada)
export function espelharPaineis(ids, modo) {
    modo = NOME_MODO[modo] ? modo : "proprio";
    var S = comGrupos(ids);
    if (!S.length) return;
    var fr = faixa(S, true), fc = faixa(S, false), v = modo === "y", comRecorte = [], feitos = {};
    // plano do espelho no palco: o eixo 0 (X), ou o meio do próprio conjunto
    var a = modo === "x" ? 0 : v ? (fr.y0 + fr.y1) / 2 : (fr.x0 + fr.x1) / 2;
    S.forEach(function (t) {
      var q = res(t), g = t.pn && painelById(t.pn);
      if (g && !feitos[g.id]) { feitos[g.id] = 1; Object.assign(g, grupoEspelhado(g, v, a)); }
      Object.assign(t, espelharPeca(t, v, g ? 0 : a), giroEspelhado(t, v));
      if (v) t.cy = Math.round(fc.y0 + fc.y1 - (t.cy + q.h));
      else t.cx = Math.round(fc.x0 + fc.x1 - (t.cx + q.w));
      if ((t.off || []).length) {
        var off = offEspelhado(t, v ? "v" : "h");
        t.off = off;
        EXTRAS.forEach(function (x) { if (x.id === t.id) x.off = off.slice(); });
        comRecorte.push(t.id);
      }
    });
    gravarVivo(S); // o giro e o pivô espelhados vão para a definição
    var tirou = comRecorte.length ? limparRotasDe(comRecorte) : 0;
    gravarEAbrir(S[0].id, (S.length === 1 ? "Painel " + S[0].id + " espelhado " : S.length + " painéis espelhados ") + NOME_MODO[modo] + "." + (tirou ? " As rotas de cabo dos recortados foram limpas." : ""));
  }

// cópia espelhada. Rig: "x" do outro lado do eixo 0; "y" em cima do conjunto, de cabeça para baixo;
// "proprio" encostada à direita. Screen: depois de tudo (à direita, ou embaixo no "y"), sem cair em cima de ninguém.
// Grupos viram grupos novos "… espelhado".
export function duplicarEspelhado(ids, modo) {
    modo = NOME_MODO[modo] ? modo : "proprio";
    var S = comGrupos(ids);
    if (!S.length) return;
    if (EXTRAS.length + S.length > EXTRA_MAX) { pmsg("Limite de " + EXTRA_MAX + " painéis."); return; }
    var base = Number(nextExtraId());
    if (base + S.length - 1 > 999) { pmsg("Numeração esgotada."); return; }
    var fr = faixa(S, true), tudo = faixa(tiles, false), v = modo === "y";
    if (modo === "x" && fr.x0 < 0 && fr.x1 > 0) { pmsg("O conjunto passa pelo eixo 0: a cópia no eixo X cairia em cima dele. Use No próprio eixo."); return; }
    // plano do espelho: o eixo 0, ou a borda do conjunto (a cópia fica encostada à direita, ou em cima no "y")
    var a = modo === "x" ? 0 : v ? fr.y1 : fr.x1;
    var antesEx = EXTRAS.length, antesT = tiles.length, antesP = paineis.slice(), novos = {};
    var falhou = S.some(function (m, i) {
      var nid = String(base + i), q = res(m), cx = m.cx, cy = m.cy, og = m.pn && painelById(m.pn);
      if (og && !novos[m.pn]) { var g = novoPainel(); Object.assign(g, grupoEspelhado(og, v, a)); g.name = (pnome(og) + " espelhado").slice(0, 40); novos[m.pn] = g.id; }
      var pe = espelharPeca(m, v, og ? 0 : a), mx = pe.mx, my = pe.my;
      if (v) cy = Math.round(2 * tudo.y1 - (m.cy + q.h));
      else cx = Math.round(2 * tudo.x1 - (m.cx + q.w));
      var c = cleanExtra(Object.assign({ id: nid, name: (m.name + " (espelho)").slice(0, 40), kind: m.kind, cab: m.cab, w: m.w, h: m.h, mx: mx, my: my, cx: cx, cy: cy, grp: m.grp || "", off: offEspelhado(m, v ? "v" : "h"), z: m.z }, giroEspelhado(m, v)));
      if (!c) return true;
      EXTRAS.push(c);
      tiles.push(Object.assign({}, c, { mx: mx, my: my, pn: m.pn ? novos[m.pn] || "" : "" }));
      return false;
    });
    if (falhou) { EXTRAS.length = antesEx; tiles.length = antesT; set_paineis(antesP); pmsg("Não foi possível duplicar espelhado (posição fora do limite)."); return; }
    gravarEAbrir(String(base), (S.length === 1 ? "Painel " + S[0].id + " duplicado espelhado " : S.length + " painéis duplicados espelhados ") + NOME_MODO[modo] + ".",
      function () { EXTRAS.length = antesEx; tiles.length = antesT; set_paineis(antesP); });
  }

// leva o desenho do Rig para o centro: o meio do conjunto fica no x = 0 (projetos feitos antes do eixo no centro)
export function centralizarRig() {
    var aqui = tiles.slice();
    if (!aqui.length) return;
    var f = faixa(aqui, true), d = -Math.round((f.x0 + f.x1) / 2 * 2) / 2;
    if (!d) { pmsg("O desenho já está centralizado no eixo 0."); return; }
    // painel solto anda; grupo anda pelo pin dele (os membros são relativos ao grupo)
    function andar(k) { aqui.forEach(function (t) { if (!t.pn) t.mx = r2(t.mx + k); }); paineis.forEach(function (p) { p.gx = r3((p.gx || 0) + k); }); }
    andar(d);
    try { localStorage.setItem("ledmap-msg", "Palco centralizado no eixo 0."); } catch (e) {}
    if (!commitAndReload(curTab)) { andar(-d); pmsg("Não consegui salvar neste navegador."); }
  }

export { KEY_PEND, KEY_REOPEN };
