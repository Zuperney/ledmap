import { svgM, rowsEl, tiles, fmt, selected, gM, save, FLOOR, mnum, BASE, pnome, membrosPainel, novoPainel, podarPaineis, res, existe, EXTRAS } from "./core.js";
import { updInsp } from "./gaveta.js";
import { placeM, fitM, guideMV, guideMH, boundsM, statM, desenharPaineis, desenharFurosM } from "./rig.js";
import { cabOn, renderCabM, viewM } from "./rig-cabos.js";
import { tById, pmsg } from "./exportar.js";
import { select, atualizarTags } from "./tabela.js";
import { renderCartao } from "./rig-cartao.js";
import { best } from "./canvas-edicao.js";
import { twoStep, routes } from "./cabeamento.js";
import { curTab } from "./abas.js";
import { excluirPaineis, openAdd, duplicarPainel, commitAndReload } from "./telas.js";

let editM, dragM, magnetM, btnMagM;

function toWorldM(e) {
    var pt = svgM.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    return pt.matrixTransform(svgM.getScreenCTM().inverse());
  }

function rowM(t) {
    var c = rowsEl.children[tiles.indexOf(t)];
    if (c) c.querySelector(".mpos").textContent = fmt(t.mx) + " , " + fmt(t.my);
    updInsp();
  }

export function refreshM() {
    tiles.forEach(function (t) { placeM(t); rowM(t); });
    fitM();
    syncMPanel();
    if (cabOn) renderCabM();
  }

// o cartão do painel mostra a seleção; aqui só se avisa que ela mudou
export function syncMPanel() {
    syncGrupo();
    desenharPaineis();
  }

// multisseleção do Rig (Shift ou Ctrl + clique, ou o modo de seleção do botão Grupo, que serve no celular)
var mselM = [], modoSel = false;

export function modoSelM() { return modoSel; }

export function sairModoSel() { modoSel = false; mselM = []; marcarMsel(); }

export function mselLista() { return mselM.slice(); }

// "Selecionar vários" (no cartão): cada toque marca ou desmarca um painel; o painel aberto já entra
export function iniciarSelecao() {
    modoSel = true;
    mselM = selected && tById[selected] ? [selected] : [];
    marcarMsel();
  }

export function desagrupar(pn) {
    if (!pn) return;
    membrosPainel(pn).forEach(function (o) { o.pn = ""; });
    podarPaineis();
    pmsg("Grupo desfeito.");
    save(); refreshM(); atualizarTags();
  }

function marcarMsel() {
    tiles.forEach(function (t) { gM[t.id].classList.toggle("msel", mselM.indexOf(t.id) >= 0); });
    syncGrupo();
  }

export function toggleMselM(id) {
    if (!mselM.length && selected && selected !== id) mselM.push(selected);
    var i = mselM.indexOf(id);
    if (i >= 0) mselM.splice(i, 1); else mselM.push(id);
    marcarMsel();
  }

export function limparMselM() { if (mselM.length) { mselM = []; marcarMsel(); } }

// painéis que o botão Excluir apaga: a multisseleção ou o painel selecionado
export function selecaoM() { return mselM.length ? mselM.slice() : (selected && tById[selected] ? [selected] : []); }

function syncGrupo() { renderCartao(); }

function clicarGrupo() {
    if (mselM.length < 2) return;
    var p = novoPainel();
    mselM.forEach(function (id) { if (tById[id]) tById[id].pn = p.id; });
    podarPaineis();
    pmsg(pnome(p) + " criado com " + mselM.length + " painéis. Com Mover ligado, o grupo se move junto.");
    var primeiro = mselM[0];
    modoSel = false; mselM = [];
    marcarMsel(); save(); refreshM(); atualizarTags();
    select(primeiro);
  }

// ---- Recortar: tirar ou devolver gabinetes de um painel (triângulo, escada, vão...) ----
// Cada toque alterna o gabinete; arrastando, repete a mesma ação nos gabinetes por onde passa.
// Ao desligar (ou sair de Editar) grava e recarrega: cabeamento, elétrica e composição passam a ignorar os recortados.
var recorte = false, pintar = null, mudou = false;

function celulaEm(t, e) {
    var w = toWorldM(e), q = res(t), topo = FLOOR - t.my - t.h;
    var c = Math.floor((w.x - t.mx) / q.mw), r = Math.floor((w.y - topo) / q.mh);
    return c >= 0 && r >= 0 && c < q.cols && r < q.rows ? { c: c, r: r, q: q } : null;
  }

function aplicarRecorte(t, cel, tirar) {
    var k = cel.c + ":" + cel.r, off = Array.isArray(t.off) ? t.off.slice() : [];
    if (tirar === !existe(cel.q, cel.c, cel.r)) return; // já está como o gesto quer
    if (tirar) {
      if (cel.q.n <= 1) { pmsg("O painel precisa de pelo menos um gabinete."); return; }
      off.push(k);
    } else off = off.filter(function (x) { return x !== k; });
    t.off = off;
    EXTRAS.forEach(function (x) { if (x.id === t.id) x.off = off.slice(); });
    desenharFurosM(t);
    mudou = true;
  }

function concluirRecorte() {
    // rotas de cabo não podem passar por gabinete que não existe mais
    Object.keys(routes).forEach(function (pid) {
      routes[pid] = routes[pid].filter(function (k) {
        var p = k.split(":"), t = tById[p[0]];
        return !t || existe(res(t), +p[1], +p[2]);
      });
    });
    try { localStorage.setItem("ledmap-msg", "Recorte salvo."); } catch (e) {}
    if (!commitAndReload((curTab || "m") + (selected ? ":" + selected : ""))) { try { localStorage.removeItem("ledmap-msg"); } catch (e) {} pmsg("Não consegui salvar o recorte neste navegador."); }
  }

function setRecorte(on) {
    recorte = on;
    var b = document.getElementById("m-rec");
    b.setAttribute("aria-pressed", String(on));
    tiles.forEach(function (t) { gM[t.id].classList.toggle("recorte", on); });
    if (on) { mudou = false; pmsg("Toque nos gabinetes para tirar ou devolver; arraste para vários. Toque em Recortar de novo para salvar."); }
    else if (mudou) { mudou = false; concluirRecorte(); }
  }

// sair da aba Rig (ou do projeto) com o Recortar ligado grava o recorte
export function encerrarRecorte() { if (recorte) setRecorte(false); }

export function setEditM(on) {
    editM = on;
    document.getElementById("m-edit").setAttribute("aria-pressed", String(on));
    document.getElementById("m-edit-panel").hidden = !on;
    tiles.forEach(function (t) { gM[t.id].classList.toggle("edit", on); });
    viewM.setLock(on);
    if (!on) { dragM = null; guideMV.classList.add("off"); guideMH.classList.add("off"); }
    syncMPanel();
  }

export function onDownM(e, t) {
    if (recorte) {
      var cel = celulaEm(t, e);
      if (!cel) return;
      if (selected !== t.id) select(t.id);
      pintar = { t: t, tirar: existe(cel.q, cel.c, cel.r) };
      aplicarRecorte(t, cel, pintar.tirar);
      gM[t.id].setPointerCapture(e.pointerId);
      e.preventDefault();
      return;
    }
    if (!editM || e.shiftKey || e.ctrlKey || e.metaKey) return;
    // arrastar um painel que está numa seleção de vários leva a seleção inteira (e os grupos dela)
    var naSel = mselM.length >= 2 && mselM.indexOf(t.id) >= 0;
    if (modoSel && !naSel) return; // no modo de selecionar, tocar marca/desmarca (o clique cuida disso)
    if (!naSel) { limparMselM(); select(t.id); }
    var conj = {};
    (naSel ? mselM.map(function (id) { return tById[id]; }).filter(Boolean) : [t]).forEach(function (o) {
      (o.pn ? membrosPainel(o.pn) : [o]).forEach(function (m) { conj[m.id] = m; });
    });
    conj[t.id] = t;
    var lista = Object.keys(conj).map(function (k) { return conj[k]; });
    var x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    lista.forEach(function (o) { x0 = Math.min(x0, o.mx); x1 = Math.max(x1, o.mx + o.w); y0 = Math.min(y0, o.my); y1 = Math.max(y1, o.my + o.h); });
    var w = toWorldM(e);
    dragM = { t: t, x0: t.mx, y0: t.my, wx: w.x, wy: w.y, sx: e.clientX, sy: e.clientY, moveu: false,
      outros: lista.filter(function (o) { return o !== t; }).map(function (o) { return { t: o, x0: o.mx, y0: o.my }; }),
      ids: lista.map(function (o) { return o.id; }),
      // contorno do conjunto em relação ao painel puxado: o ímã encaixa o conjunto, não só o painel
      ox: x0 - t.mx, oy: y0 - t.my, bw: x1 - x0, bh: y1 - y0 };
    gM[t.id].setPointerCapture(e.pointerId);
    e.preventDefault();
  }

// depois de arrastar (ou laçar), o clique que o navegador dispara em seguida não deve mexer na seleção
var ignorarAte = 0;
export function ignorarCliqueM() { return performance.now() < ignorarAte; }

function endDragM() {
    pintar = null;
    var was = dragM && dragM.moveu;
    if (was) ignorarAte = performance.now() + 350;
    dragM = null;
    guideMV.classList.add("off");
    guideMH.classList.add("off");
    if (was) { save(); fitM(); }
  }

// ---- laço: com Mover ligado, arrastar no vazio desenha um retângulo e seleciona os painéis que ele toca ----
var laco = null, lacoEl = null;
function iniciarLaco(e) {
    var w = toWorldM(e);
    laco = { x: w.x, y: w.y, sx: e.clientX, sy: e.clientY };
    if (!lacoEl) { lacoEl = document.createElementNS("http://www.w3.org/2000/svg", "rect"); lacoEl.setAttribute("class", "laco"); }
    lacoEl.setAttribute("width", 0); lacoEl.setAttribute("height", 0);
    svgM.appendChild(lacoEl);
    svgM.setPointerCapture(e.pointerId);
  }
function moverLaco(e) {
    var w = toWorldM(e);
    lacoEl.setAttribute("x", Math.min(laco.x, w.x)); lacoEl.setAttribute("y", Math.min(laco.y, w.y));
    lacoEl.setAttribute("width", Math.abs(w.x - laco.x)); lacoEl.setAttribute("height", Math.abs(w.y - laco.y));
    laco.w = w;
  }
function fecharLaco(e) {
    var l = laco; laco = null;
    if (lacoEl && lacoEl.parentNode) lacoEl.parentNode.removeChild(lacoEl);
    if (!l || !l.w || Math.hypot(e.clientX - l.sx, e.clientY - l.sy) < 6) return;
    ignorarAte = performance.now() + 350;
    var x0 = Math.min(l.x, l.w.x), x1 = Math.max(l.x, l.w.x), y0 = Math.min(l.y, l.w.y), y1 = Math.max(l.y, l.w.y);
    var ids = tiles.filter(function (t) { var ty = FLOOR - t.my - t.h; return t.mx < x1 && t.mx + t.w > x0 && ty < y1 && ty + t.h > y0; }).map(function (t) { return t.id; });
    if (ids.length >= 2) { modoSel = false; mselM = ids; marcarMsel(); }
    else if (ids.length === 1) { limparMselM(); select(ids[0]); }
  }

export function init() {
  editM = false;
  dragM = null;
  magnetM = true;
  document.getElementById("m-edit").addEventListener("click", function () { setEditM(!editM); });
  // a Vista 3D só é baixada quando alguém abre (three.js fica num pedaço à parte)
  document.getElementById("m-3d").addEventListener("click", function () {
    if (editM) setEditM(false);
    import("./vista3d.js").then(function (m) { m.abrir3D(); }).catch(function () { pmsg("Não consegui carregar a Vista 3D. Confira a conexão e tente de novo."); });
  });
  svgM.addEventListener("pointermove", function (e) {
      if (pintar) { var cel = celulaEm(pintar.t, e); if (cel) aplicarRecorte(pintar.t, cel, pintar.tirar); return; }
      if (laco) { moverLaco(e); return; }
      if (!dragM) return;
      if (!dragM.moveu) { if (Math.hypot(e.clientX - dragM.sx, e.clientY - dragM.sy) < 5) return; dragM.moveu = true; }
      var t = dragM.t, step = Number(document.getElementById("m-snap").value) || 0.5;
      var w = toWorldM(e);
      var nx = Math.round((dragM.x0 + (w.x - dragM.wx)) / step) * step;
      var ny = Math.round((dragM.y0 - (w.y - dragM.wy)) / step) * step;
      var hx = null, hy = null;
      if (magnetM) {
        // ímã reforçado: alcance de 20 px na tela e encaixe pelo contorno do conjunto que está sendo arrastado
        var T = 20 / ((svgM.getBoundingClientRect().width || 1) / (boundsM.x1 - boundsM.x0));
        var bx = nx + dragM.ox, by = ny + dragM.oy, bw = dragM.bw, bh = dragM.bh;
        var mxs = [{ v: bx, k: 0 }, { v: bx + bw, k: 0 }, { v: bx + bw / 2, k: 1 }];
        var mys = [{ v: by, k: 0 }, { v: by + bh, k: 0 }, { v: by + bh / 2, k: 1 }];
        var txs = [{ v: 0, k: 0 }], tys = [{ v: 0, k: 0 }];
        tiles.forEach(function (o) {
          if (dragM.ids.indexOf(o.id) >= 0) return;
          txs.push({ v: o.mx, k: 0 }, { v: o.mx + o.w, k: 0 }, { v: o.mx + o.w / 2, k: 1 });
          tys.push({ v: o.my, k: 0 }, { v: o.my + o.h, k: 0 }, { v: o.my + o.h / 2, k: 1 });
        });
        hx = best(mxs, txs, T); hy = best(mys, tys, T);
        if (hx) nx += hx.d;
        if (hy) ny += hy.d;
      }
      var b = boundsM;
      nx = Math.min(Math.max(nx, b.x0 - dragM.ox), b.x1 - dragM.ox - dragM.bw);
      ny = Math.min(Math.max(ny, FLOOR - b.y1 - dragM.oy), FLOOR - b.y0 - dragM.oy - dragM.bh);
      t.mx = Math.round(nx * 100) / 100; t.my = Math.round(ny * 100) / 100;
      var dx = t.mx - dragM.x0, dy = t.my - dragM.y0;
      dragM.outros.forEach(function (o) {
        o.t.mx = Math.round((o.x0 + dx) * 100) / 100; o.t.my = Math.round((o.y0 + dy) * 100) / 100;
        placeM(o.t); rowM(o.t);
      });
      if (dragM.outros.length) desenharPaineis();
      if (hx) { guideMV.setAttribute("x1", hx.line); guideMV.setAttribute("x2", hx.line); }
      if (hy) { guideMH.setAttribute("y1", FLOOR - hy.line); guideMH.setAttribute("y2", FLOOR - hy.line); }
      guideMV.classList.toggle("off", !hx);
      guideMH.classList.toggle("off", !hy);
      placeM(t); rowM(t); syncMPanel(); statM();
      if (cabOn) renderCabM();
    });
  svgM.addEventListener("pointerdown", function (e) {
    if (!editM || recorte || e.button === 2 || (e.target.closest && e.target.closest(".scr"))) return;
    iniciarLaco(e);
  });
  svgM.addEventListener("pointerup", function (e) { if (laco) { fecharLaco(e); return; } endDragM(); });
  svgM.addEventListener("pointercancel", function (e) { if (laco) { fecharLaco(e); return; } endDragM(); });
  ["m-x", "m-y"].forEach(function (id) {
      document.getElementById(id).addEventListener("change", function () {
        var t = selected && tById[selected];
        if (!t) return;
        var nx = mnum(document.getElementById("m-x").value), ny = mnum(document.getElementById("m-y").value);
        if (nx !== null && ny !== null) {
          var dx = nx - t.mx, dy = ny - t.my;
          membrosPainel(t.pn).forEach(function (o) { if (o !== t) { o.mx = mnum(o.mx + dx); o.my = mnum(o.my + dy); } });
          t.mx = nx; t.my = ny; save();
        }
        refreshM();
      });
    });
  document.getElementById("m-grp").addEventListener("click", clicarGrupo);
  // tocar no vazio do desenho tira a seleção (fora do modo de selecionar vários)
  svgM.addEventListener("click", function (e) {
    if (ignorarCliqueM()) return;
    if (e.target.closest && e.target.closest(".scr")) return;
    if (modoSel || recorte) return;
    limparMselM(); if (selected) select(null);
  });
  document.getElementById("m-rec").addEventListener("click", function () { setRecorte(!recorte); });
  document.getElementById("m-dup").addEventListener("click", function () { if (selected && tById[selected]) duplicarPainel(selected); });
  document.getElementById("m-prop").addEventListener("click", function () { if (selected && tById[selected]) openAdd(selected); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && modoSel) sairModoSel(); });
  syncGrupo();
  twoStep(document.getElementById("m-del"), "Excluir", "Confirmar?", function () { excluirPaineis(selecaoM()); });
  document.addEventListener("keydown", function (e) {
    if ((e.key !== "Delete" && e.key !== "Backspace") || document.body.getAttribute("data-aba") !== "m") return;
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName || "") || !selecaoM().length) return;
    e.preventDefault();
    document.getElementById("m-del").click();
  });
  btnMagM = document.getElementById("m-magnet");
  btnMagM.addEventListener("click", function () { magnetM = !magnetM; btnMagM.setAttribute("aria-pressed", String(magnetM)); });
  twoStep(document.getElementById("m-reset"), "Restaurar", "Confirmar?", function () {
      tiles.forEach(function (t, idx) { t.mx = BASE[idx].mx; t.my = BASE[idx].my; });
      save(); refreshM();
    });
}

export { editM };
