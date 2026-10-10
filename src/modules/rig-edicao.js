import { svgM, rowsEl, tiles, fmt, selected, gM, save, FLOOR, mnum, BASE, pnome, membrosPainel, novoPainel, podarPaineis, res, existe, EXTRAS } from "./core.js";
import { updInsp } from "./gaveta.js";
import { placeM, fitM, guideMV, guideMH, boundsM, statM, desenharPaineis, desenharFurosM } from "./rig.js";
import { cabOn, renderCabM, viewM } from "./rig-cabos.js";
import { tById, pmsg } from "./exportar.js";
import { select } from "./tabela.js";
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

export function syncMPanel() {
    var t = selected && tById[selected];
    document.getElementById("m-who").textContent = t ? "Painel " + t.id + " · " + t.name : "Toque num painel para movê-lo";
    var ix = document.getElementById("m-x"), iy = document.getElementById("m-y");
    ix.disabled = iy.disabled = !t;
    ix.value = t ? t.mx : ""; iy.value = t ? t.my : "";
    document.getElementById("m-prop").disabled = !t;
    syncGrupo();
    desenharPaineis();
  }

// multisseleção do Rig (Shift ou Ctrl + clique, ou o modo de seleção do botão Grupo, que serve no celular)
var mselM = [], modoSel = false;

export function modoSelM() { return modoSel; }

function sairModoSel() { modoSel = false; mselM = []; marcarMsel(); }

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

function syncGrupo() {
    var b = document.getElementById("m-grp");
    if (!b) return;
    var del = document.getElementById("m-del");
    var dup = document.getElementById("m-dup"), ts = selected && tById[selected];
    if (dup) { dup.disabled = !ts; dup.textContent = ts && ts.pn ? "Duplicar grupo" : "Duplicar"; }
    if (del) { var n = selecaoM().length; del.disabled = !n; del.title = n > 1 ? "Excluir " + n + " painéis" : "Excluir o painel selecionado"; }
    var t = selected && tById[selected];
    b.setAttribute("aria-pressed", String(modoSel));
    b.disabled = tiles.length < 2;
    if (mselM.length >= 2) b.textContent = "Agrupar (" + mselM.length + ")";
    else if (modoSel) b.textContent = "Cancelar";
    else if (t && t.pn) b.textContent = "Desagrupar";
    else b.textContent = "Grupo";
  }

function clicarGrupo() {
    var t = selected && tById[selected];
    if (mselM.length >= 2) {
      var p = novoPainel();
      mselM.forEach(function (id) { if (tById[id]) tById[id].pn = p.id; });
      podarPaineis();
      pmsg(pnome(p) + " criado com " + mselM.length + " painéis. Em Editar, o grupo se move junto.");
      modoSel = false; mselM = [];
      marcarMsel(); save(); refreshM();
    } else if (modoSel) {
      sairModoSel();
    } else if (t && t.pn) {
      membrosPainel(t.pn).forEach(function (o) { o.pn = ""; });
      podarPaineis();
      pmsg("Grupo desfeito.");
      marcarMsel(); save(); refreshM();
    } else {
      // liga o modo de seleção: cada toque marca ou desmarca um painel
      modoSel = true;
      mselM = t ? [t.id] : [];
      marcarMsel();
      pmsg("Toque nos painéis do grupo e depois em Agrupar.");
    }
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

export function setEditM(on) {
    if (!on && recorte) setRecorte(false);
    editM = on;
    document.getElementById("m-edit").setAttribute("aria-pressed", String(on));
    document.getElementById("m-edit-panel").hidden = !on;
    tiles.forEach(function (t) { gM[t.id].classList.toggle("edit", on); });
    viewM.setLock(on);
    if (!on) { dragM = null; guideMV.classList.add("off"); guideMH.classList.add("off"); }
    syncMPanel();
  }

export function onDownM(e, t) {
    if (editM && recorte) {
      var cel = celulaEm(t, e);
      if (!cel) return;
      if (selected !== t.id) select(t.id);
      pintar = { t: t, tirar: existe(cel.q, cel.c, cel.r) };
      aplicarRecorte(t, cel, pintar.tirar);
      gM[t.id].setPointerCapture(e.pointerId);
      e.preventDefault();
      return;
    }
    if (!editM || modoSel || e.shiftKey || e.ctrlKey || e.metaKey) return;
    limparMselM();
    select(t.id);
    var w = toWorldM(e);
    var outros = membrosPainel(t.pn).filter(function (o) { return o !== t; }).map(function (o) { return { t: o, x0: o.mx, y0: o.my }; });
    dragM = { t: t, x0: t.mx, y0: t.my, wx: w.x, wy: w.y, outros: outros };
    gM[t.id].setPointerCapture(e.pointerId);
    e.preventDefault();
  }

function endDragM() {
    pintar = null;
    var was = !!dragM;
    dragM = null;
    guideMV.classList.add("off");
    guideMH.classList.add("off");
    if (was) { save(); fitM(); }
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
      if (!dragM) return;
      var t = dragM.t, step = Number(document.getElementById("m-snap").value) || 0.5;
      var w = toWorldM(e);
      var nx = Math.round((dragM.x0 + (w.x - dragM.wx)) / step) * step;
      var ny = Math.round((dragM.y0 - (w.y - dragM.wy)) / step) * step;
      var hx = null, hy = null;
      if (magnetM) {
        var T = 12 / ((svgM.getBoundingClientRect().width || 1) / (boundsM.x1 - boundsM.x0));
        var mxs = [{ v: nx, k: 0 }, { v: nx + t.w, k: 0 }, { v: nx + t.w / 2, k: 1 }];
        var mys = [{ v: ny, k: 0 }, { v: ny + t.h, k: 0 }, { v: ny + t.h / 2, k: 1 }];
        var txs = [], tys = [{ v: 0, k: 0 }];
        tiles.forEach(function (o) {
          if (o === t || (t.pn && o.pn === t.pn)) return;
          txs.push({ v: o.mx, k: 0 }, { v: o.mx + o.w, k: 0 }, { v: o.mx + o.w / 2, k: 1 });
          tys.push({ v: o.my, k: 0 }, { v: o.my + o.h, k: 0 }, { v: o.my + o.h / 2, k: 1 });
        });
        hx = best(mxs, txs, T); hy = best(mys, tys, T);
        if (hx) nx += hx.d;
        if (hy) ny += hy.d;
      }
      var b = boundsM;
      nx = Math.min(Math.max(nx, b.x0), b.x1 - t.w);
      ny = Math.min(Math.max(ny, FLOOR - b.y1), FLOOR - b.y0 - t.h);
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
  svgM.addEventListener("pointerup", endDragM);
  svgM.addEventListener("pointercancel", endDragM);
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
