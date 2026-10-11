import { GABINETES, GAB, gabPadrao } from "./gabinetes.js";
import { save, STORE, EXTRAS, BASE, res, nf, fmt, tiles, scaledPos, freeSpot, groups, gname, EXTRA_MAX, cleanExtra, set_EXTRAS, bbox, membrosPainel, novoPainel, painelById, pnome, paineis, set_paineis } from "./core.js";
import { ksave, twoStep, routes } from "./cabeamento.js";
import { deleteLater } from "./tabela.js";
import { curTab } from "./abas.js";
import { pmsg } from "./exportar.js";

let KEY_REOPEN, KEY_PEND, addModal, aName, aW, aH, aPrev, aErr, editando = null;

export function commitAndReload(reopen, pending) {
    save(); ksave();
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

let aCab;

function updatePrev() {
    if (!GAB[aCab.value]) { aPrev.textContent = "A biblioteca está vazia: crie um gabinete primeiro."; return; }
    if (!mult(aW.value) || !mult(aH.value)) { aPrev.textContent = "Informe largura e altura entre 0,1 e 30 m."; return; }
    var g = GAB[aCab.value], q = res({ w: Number(aW.value), h: Number(aH.value), kind: "imag", cab: aCab.value });
    aPrev.textContent = "Gabinete " + fmt(g.mw * 100) + " × " + fmt(g.mh * 100) + " cm · painel final " +fmt(q.cols * g.mw) + " × " + fmt(q.rows * g.mh) + " m · " + q.cols + " × " + q.rows + " gabinetes (" + (q.cols * q.rows) + ") · " + q.w + " × " + q.h + " px · " + nf(q.total) + " px no total";
  }

export function freeM(w, h) {
    function hitAt(x, y) { return tiles.some(function (b) { return x < b.mx + b.w && b.mx < x + w && y < b.my + b.h && b.my < y + h; }); }
    var x, y;
    for (y = 0; y <= 8 - h + 1e-9; y += 0.5) for (x = 0; x <= 28 - w + 1e-9; x += 0.5) if (!hitAt(x, y)) return { x: x, y: y };
    for (y = 0; y <= 30 - h + 1e-9; y += 0.5) for (x = 0; x <= 60 - w + 1e-9; x += 0.5) if (!hitAt(x, y)) return { x: x, y: y };
    return null;
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
  preencherCabs((gabPadrao() || {}).id);
  [aCab, aW, aH].forEach(function (n) { n.addEventListener("input", updatePrev); });
  document.getElementById("add-open").addEventListener("click", function () { openAdd(); });
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
      if (EXTRAS.length >= EXTRA_MAX) { aErr.textContent = "Limite de " + EXTRA_MAX + " painéis."; return; }
      if (!mult(aW.value) || !mult(aH.value)) { aErr.textContent = "Informe largura e altura válidas (até 30 m)."; return; }
      var id = nextExtraId();
      if (Number(id) > 999) { aErr.textContent = "Numeração esgotada."; return; }
      var w = Number(aW.value), h = Number(aH.value);
      var fm = freeM(w, h);
      if (!fm) { aErr.textContent = "Sem espaço livre na montagem."; return; }
      var fc = freeC({ w: w, h: h, kind: "imag", cab: aCab.value, mx: fm.x, my: fm.y });
      var c = cleanExtra({ id: id, name: aName.value, kind: "imag", cab: aCab.value, w: w, h: h, mx: fm.x, my: fm.y, cx: fc.x, cy: fc.y, grp: "" });
      if (!c) { aErr.textContent = "Dimensões ou posição fora do limite (até 30 m de largura e altura)."; return; }
      EXTRAS.push(c);
      if (!commitAndReload(curTab + ":" + id)) {
        EXTRAS.pop();
        aErr.textContent = "Não consegui salvar neste navegador, então o painel não foi adicionado.";
      }
    });
}

// grava nome, tamanho e gabinete; a posição (Rig e Screen), a Screen e o grupo ficam como estão.
// Se a grade de gabinetes muda, as rotas de cabo que passavam por este painel saem (as células mudaram).
function salvarEdicao() {
    if (!mult(aW.value) || !mult(aH.value)) { aErr.textContent = "Informe largura e altura válidas (até 30 m)."; return; }
    var i = EXTRAS.findIndex(function (x) { return x.id === editando; });
    if (i < 0) { closeAdd(); return; }
    var antes = EXTRAS[i], t = tiles.filter(function (x) { return x.id === editando; })[0] || antes;
    // recortes: com outro gabinete a grade é outra, então saem; mudando só o tamanho, ficam os que ainda cabem
    var c = cleanExtra(Object.assign({}, antes, { name: aName.value, cab: aCab.value, w: Number(aW.value), h: Number(aH.value), mx: t.mx, my: t.my, cx: t.cx, cy: t.cy, off: antes.cab !== aCab.value ? [] : antes.off, z: document.getElementById("a-z").value }));
    if (!c) { aErr.textContent = "Dimensões fora do limite (até 30 m de largura e altura)."; return; }
    var qa = res(antes), qn = res(c), mudouGrade = antes.cab !== c.cab || qa.cols !== qn.cols || qa.rows !== qn.rows;
    EXTRAS[i] = c;
    var tirou = 0;
    if (mudouGrade) Object.keys(routes).forEach(function (pid) { var n0 = routes[pid].length; routes[pid] = routes[pid].filter(function (k) { return k.split(":")[0] !== c.id; }); tirou += n0 - routes[pid].length; });
    try { localStorage.setItem("ledmap-msg", tirou ? "Painel " + c.id + " atualizado. As rotas de cabo dele foram limpas: refaça o cabeamento." : "Painel " + c.id + " atualizado."); } catch (e) {}
    if (!commitAndReload(curTab + ":" + c.id)) { EXTRAS[i] = antes; try { localStorage.removeItem("ledmap-msg"); } catch (e) {} aErr.textContent = "Não consegui salvar neste navegador."; }
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
    var x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    mem.forEach(function (m) { x0 = Math.min(x0, m.mx); x1 = Math.max(x1, m.mx + m.w); y0 = Math.min(y0, m.my); y1 = Math.max(y1, m.my + m.h); });
    var fm = freeM(x1 - x0, y1 - y0);
    if (!fm) { pmsg("Sem espaço livre na montagem para a cópia."); return; }
    var cb = bbox(mem), fc = freeSpot(cb.w, cb.h, tiles.concat(BASE)) || { x: cb.x, y: cb.y };
    var dx = fm.x - x0, dy = fm.y - y0, dcx = fc.x - cb.x, dcy = fc.y - cb.y;
    var antesEx = EXTRAS.length, antesT = tiles.length, antesP = paineis.slice(), novoG = null;
    if (orig) { novoG = novoPainel(); novoG.name = (pnome(orig) + " cópia").slice(0, 40); }
    var falhou = mem.some(function (m, i) {
      var nid = String(base + i), mx = Math.round((m.mx + dx) * 100) / 100, my = Math.round((m.my + dy) * 100) / 100;
      var c = cleanExtra({ id: nid, name: (m.name + " cópia").slice(0, 40), kind: m.kind, cab: m.cab, w: m.w, h: m.h, mx: mx, my: my, cx: m.cx + dcx, cy: m.cy + dcy, grp: m.grp || "", off: m.off, z: m.z });
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
    var tirou = mudouGrade ? limparRotasDe([c.id]) : 0;
    gravarEAbrir(c.id, "Painel " + c.id + ": " + fmt(c.w) + " × " + fmt(c.h) + " m." + (tirou ? " As rotas de cabo dele foram limpas: refaça o cabeamento." : ""), function () { EXTRAS[i] = antes; });
    return "";
  }

// ---- Espelhar ----
// recortes de um painel invertidos da esquerda para a direita (o triângulo vira para o outro lado)
function offEspelhado(t) {
    var q = res(t);
    return (t.off || []).map(function (k) { var p = k.split(":"); return (q.cols - 1 - Number(p[0])) + ":" + p[1]; });
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

function faixaX(lista, rig) {
    var x0 = Infinity, x1 = -Infinity;
    lista.forEach(function (t) { var a = rig ? t.mx : t.cx, w = rig ? t.w : res(t).w; x0 = Math.min(x0, a); x1 = Math.max(x1, a + w); });
    return { x0: x0, x1: x1 };
  }

// inverte o lado dos painéis em torno do centro deles (no Rig e no canvas), com os recortes
export function espelharPaineis(ids) {
    var S = comGrupos(ids);
    if (!S.length) return;
    var fr = faixaX(S, true), fc = faixaX(S, false), ax = (fr.x0 + fr.x1) / 2, acx = (fc.x0 + fc.x1) / 2, comRecorte = [];
    S.forEach(function (t) {
      t.mx = Math.round((2 * ax - (t.mx + t.w)) * 100) / 100;
      t.cx = Math.round(2 * acx - (t.cx + res(t).w));
      if ((t.off || []).length) {
        var off = offEspelhado(t);
        t.off = off;
        EXTRAS.forEach(function (x) { if (x.id === t.id) x.off = off.slice(); });
        comRecorte.push(t.id);
      }
    });
    var tirou = comRecorte.length ? limparRotasDe(comRecorte) : 0;
    gravarEAbrir(S[0].id, (S.length === 1 ? "Painel " + S[0].id + " espelhado." : S.length + " painéis espelhados.") + (tirou ? " As rotas de cabo dos recortados foram limpas." : ""));
  }

// cria a cópia simétrica do outro lado do palco: o eixo é o centro dos outros painéis
// (sem outros painéis, a cópia nasce encostada à direita). Grupos viram grupos novos "… espelhado".
export function duplicarEspelhado(ids) {
    var S = comGrupos(ids);
    if (!S.length) return;
    if (EXTRAS.length + S.length > EXTRA_MAX) { pmsg("Limite de " + EXTRA_MAX + " painéis."); return; }
    var base = Number(nextExtraId());
    if (base + S.length - 1 > 999) { pmsg("Numeração esgotada."); return; }
    var ids0 = S.map(function (t) { return t.id; }), outros = tiles.filter(function (t) { return ids0.indexOf(t.id) < 0; });
    var fr = faixaX(S, true), fc = faixaX(S, false);
    // eixo: o centro dos outros painéis; se a cópia cairia em cima do original (desenho simétrico) ou antes do zero,
    // ela vai para a direita de tudo, espelhada pela borda direita do desenho
    function eixo(rig, f) {
      if (!outros.length) return f.x1;
      var o = faixaX(outros, rig), e = (o.x0 + o.x1) / 2, n0 = 2 * e - f.x1, n1 = 2 * e - f.x0;
      if (n0 >= 0 && (n1 <= f.x0 || n0 >= f.x1)) return e;
      return Math.max(f.x1, o.x1);
    }
    var ax = eixo(true, fr), acx = eixo(false, fc);
    var antesEx = EXTRAS.length, antesT = tiles.length, antesP = paineis.slice(), novos = {};
    var falhou = S.some(function (m, i) {
      var nid = String(base + i), q = res(m);
      if (m.pn && painelById(m.pn) && !novos[m.pn]) { var g = novoPainel(); g.name = (pnome(painelById(m.pn)) + " espelhado").slice(0, 40); novos[m.pn] = g.id; }
      var mx = Math.round((2 * ax - (m.mx + m.w)) * 100) / 100, cx = Math.round(2 * acx - (m.cx + q.w));
      var c = cleanExtra({ id: nid, name: (m.name + " (espelho)").slice(0, 40), kind: m.kind, cab: m.cab, w: m.w, h: m.h, mx: mx, my: m.my, cx: cx, cy: m.cy, grp: m.grp || "", off: offEspelhado(m), z: m.z });
      if (!c) return true;
      EXTRAS.push(c);
      tiles.push(Object.assign({}, c, { mx: mx, my: m.my, pn: m.pn ? novos[m.pn] || "" : "" }));
      return false;
    });
    if (falhou) { EXTRAS.length = antesEx; tiles.length = antesT; set_paineis(antesP); pmsg("Não foi possível duplicar espelhado."); return; }
    gravarEAbrir(String(base), (S.length === 1 ? "Painel " + S[0].id + " duplicado espelhado." : S.length + " painéis duplicados espelhados."),
      function () { EXTRAS.length = antesEx; tiles.length = antesT; set_paineis(antesP); });
  }

export { KEY_PEND, KEY_REOPEN };
