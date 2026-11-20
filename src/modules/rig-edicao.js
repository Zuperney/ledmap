import { svgM, rowsEl, tiles, fmt, selected, gM, save, FLOOR, mnum, pnome, membrosPainel, painelById, novoPainel, podarPaineis, res, existe, EXTRAS, vistaM, el, text, gravarVivo, INICIO, set_paineis } from "./core.js";
import { updInsp } from "./gaveta.js";
import { placeM, fitM, guideMV, guideMH, boundsM, statM, desenharPaineis, desenharFurosM, reordenarM, faceM } from "./rig.js";
import { VISTAS, caixa, caixaDe, desprojetar, projetar, pivo, encara, matrizEixo, matriz, multiplicar, noEspacoDe, pai, aplicar, transposta } from "./espaco.js";
import { cabOn, renderCabM, viewM } from "./rig-cabos.js";
import { tById, pmsg } from "./exportar.js";
import { select, atualizarTags } from "./tabela.js";
import { renderCartao, grupoAberto, membroAbertoId, aplicarVivoLista } from "./rig-cartao.js";
import { pinGrupo, girarGrupo, formarGrupo, soltarDoGrupo, pinNoPalco } from "./grupos.js";
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
    if (c) { var P = pinNoPalco(t); c.querySelector(".mpos").textContent = fmt(P[0]) + " , " + fmt(P[1]); } // o pin no palco
    updInsp();
  }

export function refreshM() {
    tiles.forEach(function (t) { rowM(t); });
    fitM();
    syncMPanel();
    if (cabOn) renderCabM();
  }

// o cartão do painel mostra a seleção; aqui só se avisa que ela mudou
export function syncMPanel() {
    syncGrupo();
    desenharPaineis();
    desenharAlca();
  }

// ---- alça de giro: com Mover ligado e um painel selecionado, girar em volta do pivô no plano da tela ----
// Gira em volta do pin, no eixo que aponta para quem olha (Frente → Z, Topo → Y, laterais → X), exato em qualquer
// vista e com qualquer giro anterior; o passo vem de "Passo do giro". Cada passo parte do giro do começo do arrasto
// (sem somar erro). Grupo selecionado: gira o grupo em volta do pin dele (os membros não mudam).
var alca = null, giro = null, RAIO = 1.1;
// a alça só aparece com a ferramenta Girar do Palco (com Selecionar, arrastar move sem a alça no caminho)
var alcaLigada = false;
export function setAlcaLigada(on) { alcaLigada = !!on; desenharAlca(); }
function anguloTela(e, px, py) { var w = toWorldM(e); return Math.atan2(-(w.y - py), w.x - px); }
export function desenharAlca() {
    if (!svgM) return;
    if (!alca) {
      alca = el("g", { "class": "alca" }, svgM);
      alca.linha = el("line", { "class": "alca-l" }, alca);
      alca.piv = el("circle", { "class": "alca-p", r: 0.12 }, alca);
      alca.bot = el("circle", { "class": "alca-b", r: 0.26 }, alca);
      alca.txt = text(alca, "alca-t", 0, 0, 0.34, "");
      alca.bot.addEventListener("pointerdown", iniciarGiro);
    }
    var t = selected && tById[selected], on = !!(editM && alcaLigada && t && !recorte && mselM.length < 2);
    alca.style.display = on ? "" : "none";
    if (!on) return;
    svgM.appendChild(alca); // por cima de tudo
    // grupo selecionado como um painel: a alça gira o grupo inteiro em volta do pin dele
    var pn = grupoAberto(), pg = pn && painelById(pn);
    var V = VISTAS[vistaM], P = projetar(vistaM, pg ? pinGrupo(pg) : pivo(t)), px = P[0], py = FLOOR - P[1];
    var a = giro ? giro.a : Math.PI / 2, bx = px + RAIO * Math.cos(a), by = py - RAIO * Math.sin(a);
    alca.piv.setAttribute("cx", px); alca.piv.setAttribute("cy", py);
    alca.bot.setAttribute("cx", bx); alca.bot.setAttribute("cy", by);
    alca.linha.setAttribute("x1", px); alca.linha.setAttribute("y1", py); alca.linha.setAttribute("x2", bx); alca.linha.setAttribute("y2", by);
    alca.txt.setAttribute("x", bx + 0.35); alca.txt.setAttribute("y", by);
    alca.txt.textContent = (pg ? "Grupo " : "Giro ") + (giro ? (giro.aplicado > 0 ? "+" : "") + fmt(giro.aplicado) + "°" : pg ? "↻" : V.eixo.slice(1).toUpperCase() + " " + fmt(t[V.eixo] || 0) + "°");
  }
function iniciarGiro(e) {
    var t = selected && tById[selected];
    if (!t) return;
    e.stopPropagation(); e.preventDefault();
    var pn = grupoAberto(), pg = pn && painelById(pn);
    var P = projetar(vistaM, pg ? pinGrupo(pg) : pivo(t)), px = P[0], py = FLOOR - P[1], a = anguloTela(e, px, py), V = VISTAS[vistaM];
    giro = { t: t, px: px, py: py, ult: a, acc: 0, a: a, grupo: pg ? pn : null, w: V.w, aplicado: 0 };
    // guarda o giro do começo; cada passo gira a partir daqui (um arredondamento só, sem acumular erro)
    if (pg) giro.gIni = { rx: pg.rx, ry: pg.ry, rz: pg.rz };
    else giro.Mini = matriz(t);
    alca.bot.setPointerCapture(e.pointerId);
  }
function moverGiro(e) {
    var a = anguloTela(e, giro.px, giro.py), d = a - giro.ult;
    if (d > Math.PI) d -= 2 * Math.PI; else if (d < -Math.PI) d += 2 * Math.PI;
    giro.ult = a; giro.acc += d; giro.a = a;
    var passo = Number(document.getElementById("m-gpasso").value) || 5;
    // gira em volta do eixo de quem olha: anti-horário na tela = positivo
    var g = Math.round(giro.acc * 180 / Math.PI / passo) * passo;
    if (g !== giro.aplicado) {
      var Rd = matrizEixo(giro.w, g), lista;
      if (giro.grupo) lista = girarGrupo(giro.grupo, Rd, giro.gIni);
      else {
        // giro no palco = Rd · giro do começo; o painel guarda o relativo ao pai (o pin fica)
        var t = giro.t, n = noEspacoDe(pai(t), t, pivo(t), multiplicar(Rd, giro.Mini));
        t.rx = n.rx; t.ry = n.ry; t.rz = n.rz;
        lista = [t];
      }
      giro.aplicado = g;
      lista.forEach(placeM); reordenarM(); statM(); desenharPaineis(); renderCartao();
      if (cabOn) renderCabM();
    }
    desenharAlca();
  }
function fimGiro() {
    if (!giro) return;
    if (!giro.grupo) gravarVivo([giro.t]); // o grupo grava com o save (lista de grupos)
    giro = null; ignorarAte = performance.now() + 350;
    save(); fitM(); desenharAlca();
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
    var m = membrosPainel(pn);
    m.forEach(soltarDoGrupo); // cada painel fica com os valores no palco: nada se move
    gravarVivo(m);
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
export function selecaoM() {
    if (mselM.length) return mselM.slice();
    var pn = grupoAberto(); // o grupo selecionado como um painel: excluir leva o grupo inteiro
    if (pn) return membrosPainel(pn).map(function (t) { return t.id; });
    return selected && tById[selected] ? [selected] : [];
  }

function syncGrupo() { renderCartao(); }

function clicarGrupo() {
    if (mselM.length < 2) return;
    var p = novoPainel();
    formarGrupo(p, mselM.map(function (id) { return tById[id]; }).filter(Boolean)); // pin no meio de baixo da caixa: nada se move
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

// gabinete sob o dedo: o ponto volta para o desenho da frente do painel (desfaz a afim da vista)
function celulaEm(t, e) {
    var f = faceM[t.id], m = f && f.style.display !== "none" && f.getScreenCTM();
    if (!m) return null;
    var pt = svgM.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    var p = pt.matrixTransform(m.inverse()), q = res(t);
    var c = Math.floor(p.x / q.mw), r = Math.floor(p.y / q.mh);
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
    // recortando, o cartão sai e o desenho fica com a largura toda; a barra fixa no topo diz o que fazer e conclui
    document.body.classList.toggle("recortando", on);
    document.getElementById("m-rec-barra").hidden = !on;
    if (on) {
      mudou = false;
      document.getElementById("m-rec-txt").textContent = "Recortando" + (selected ? " o painel " + selected : "") + ": toque nos gabinetes para tirar ou devolver; arraste para vários.";
    } else if (mudou) { mudou = false; concluirRecorte(); }
  }

// sair da aba Rig (ou do projeto) com o Recortar ligado grava o recorte
export function encerrarRecorte() { if (recorte) setRecorte(false); }

export function setEditM(on) {
    editM = on;
    document.getElementById("m-edit").setAttribute("aria-pressed", String(on));
    document.getElementById("m-edit-panel").hidden = !on;
    tiles.forEach(function (t) { gM[t.id].classList.toggle("edit", on); });
    viewM.setLock(on);
    if (!on) { dragM = null; giro = null; guideMV.classList.add("off"); guideMH.classList.add("off"); }
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
    // quem anda: grupos inteiros (só o pin do grupo muda) e painéis soltos ou abertos sozinhos (no espaço do pai)
    var conj = {}, grs = {};
    (naSel ? mselM.map(function (id) { return tById[id]; }).filter(Boolean) : [t]).forEach(function (o) {
      if (o.pn && painelById(o.pn) && membroAbertoId() !== o.id) { grs[o.pn] = painelById(o.pn); membrosPainel(o.pn).forEach(function (m) { conj[m.id] = m; }); }
      else conj[o.id] = o;
    });
    var lista = Object.keys(conj).map(function (k) { return conj[k]; });
    var w = toWorldM(e);
    // arrastar move no plano da vista (Frente: X e altura; Topo: X e recuo; laterais: Z e altura);
    // o ímã e o passo valem para o contorno do conjunto na vista, não só para o painel puxado
    dragM = { t: t, wx: w.x, wy: w.y, sx: e.clientX, sy: e.clientY, moveu: false,
      todos: lista.filter(function (o) { return !(o.pn && grs[o.pn]); }).map(function (o) { var p = pai(o); return { t: o, x0: o.mx, y0: o.my, z0: o.z || 0, Mt: p ? transposta(p.M) : null }; }),
      grupos: Object.keys(grs).map(function (k) { var g = grs[k]; return { g: g, x0: g.gx || 0, y0: g.gy || 0, z0: g.gz || 0 }; }),
      lista: lista,
      ids: lista.map(function (o) { return o.id; }),
      cx: caixaDe(lista, vistaM) };
    gM[t.id].setPointerCapture(e.pointerId);
    e.preventDefault();
  }

// depois de arrastar (ou laçar), o clique que o navegador dispara em seguida não deve mexer na seleção
var ignorarAte = 0;
export function ignorarCliqueM() { return performance.now() < ignorarAte; }

function endDragM() {
    pintar = null;
    var was = dragM && dragM.moveu;
    if (was) { ignorarAte = performance.now() + 350; gravarVivo(dragM.lista); } // no Topo e nas laterais o recuo muda
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
    var ids = tiles.filter(function (t) { var c = caixa(t, vistaM); return c.u0 < x1 && c.u1 > x0 && FLOOR - c.v1 < y1 && FLOOR - c.v0 > y0; }).map(function (t) { return t.id; });
    if (ids.length >= 2) { modoSel = false; mselM = ids; marcarMsel(); }
    else if (ids.length === 1) { limparMselM(); select(ids[0]); }
  }

export function init() {
  editM = false;
  dragM = null;
  magnetM = true;
  document.getElementById("m-edit").addEventListener("click", function () { setEditM(!editM); });
  svgM.addEventListener("pointermove", function (e) {
      if (pintar) { var cel = celulaEm(pintar.t, e); if (cel) aplicarRecorte(pintar.t, cel, pintar.tirar); return; }
      if (giro) { moverGiro(e); return; }
      if (laco) { moverLaco(e); return; }
      if (!dragM) return;
      if (!dragM.moveu) { if (Math.hypot(e.clientX - dragM.sx, e.clientY - dragM.sy) < 5) return; dragM.moveu = true; }
      var step = Number(document.getElementById("m-snap").value) || 0.5;
      var w = toWorldM(e), c = dragM.cx, bw = c.u1 - c.u0, bh = c.v1 - c.v0;
      // canto do contorno do conjunto na vista (U para a direita, V para cima), no passo
      var nu = Math.round((c.u0 + (w.x - dragM.wx)) / step) * step;
      var nv = Math.round((c.v0 - (w.y - dragM.wy)) / step) * step;
      var hx = null, hy = null;
      if (magnetM) {
        // ímã reforçado: alcance de 20 px na tela, encaixe pelo contorno do conjunto nas bordas e centros dos outros e no 0
        var T = 20 / ((svgM.getBoundingClientRect().width || 1) / (boundsM.x1 - boundsM.x0));
        var mxs = [{ v: nu, k: 0 }, { v: nu + bw, k: 0 }, { v: nu + bw / 2, k: 1 }];
        var mys = [{ v: nv, k: 0 }, { v: nv + bh, k: 0 }, { v: nv + bh / 2, k: 1 }];
        var txs = [{ v: 0, k: 0 }], tys = [{ v: 0, k: 0 }];
        tiles.forEach(function (o) {
          if (dragM.ids.indexOf(o.id) >= 0) return;
          var b = caixa(o, vistaM);
          txs.push({ v: b.u0, k: 0 }, { v: b.u1, k: 0 }, { v: (b.u0 + b.u1) / 2, k: 1 });
          tys.push({ v: b.v0, k: 0 }, { v: b.v1, k: 0 }, { v: (b.v0 + b.v1) / 2, k: 1 });
        });
        hx = best(mxs, txs, T); hy = best(mys, tys, T);
        if (hx) nu += hx.d;
        if (hy) nv += hy.d;
      }
      var d = desprojetar(vistaM, nu - c.u0, nv - c.v0); // deslocamento no palco
      dragM.grupos.forEach(function (o) {
        o.g.gx = mnum(o.x0 + d[0]); o.g.gy = mnum(o.y0 + d[1]); o.g.gz = mnum(o.z0 - d[2]) || 0; // recuo é para trás (−Z)
      });
      dragM.todos.forEach(function (o) {
        var dl = o.Mt ? aplicar(o.Mt, d) : d; // membro aberto sozinho: o deslocamento no espaço do grupo
        o.t.mx = mnum(o.x0 + dl[0]);
        o.t.my = mnum(o.y0 + dl[1]);
        o.t.z = mnum(o.z0 - dl[2]) || 0;
      });
      dragM.lista.forEach(function (o) { placeM(o); rowM(o); });
      if (hx) { guideMV.setAttribute("x1", hx.line); guideMV.setAttribute("x2", hx.line); }
      if (hy) { guideMH.setAttribute("y1", FLOOR - hy.line); guideMH.setAttribute("y2", FLOOR - hy.line); }
      guideMV.classList.toggle("off", !hx);
      guideMH.classList.toggle("off", !hy);
      if (d[2]) reordenarM();
      syncMPanel(); statM();
      if (cabOn) renderCabM();
    });
  svgM.addEventListener("pointerdown", function (e) {
    if (!editM || recorte || giro || e.button === 2 || (e.target.closest && e.target.closest(".scr, .alca"))) return;
    iniciarLaco(e);
  });
  svgM.addEventListener("pointerup", function (e) { if (giro) { fimGiro(); return; } if (laco) { fecharLaco(e); return; } endDragM(); });
  svgM.addEventListener("pointercancel", function (e) { if (giro) { fimGiro(); return; } if (laco) { fecharLaco(e); return; } endDragM(); });
  document.getElementById("m-grp").addEventListener("click", clicarGrupo);
  // tocar no vazio do desenho tira a seleção (fora do modo de selecionar vários)
  svgM.addEventListener("click", function (e) {
    if (ignorarCliqueM()) return;
    if (e.target.closest && e.target.closest(".scr")) return;
    if (modoSel || recorte) return;
    limparMselM(); if (selected) select(null);
  });
  document.getElementById("m-rec").addEventListener("click", function () { setRecorte(!recorte); });
  document.getElementById("m-rec-ok").addEventListener("click", function () { setRecorte(false); });
  // Esc conclui o recorte e para aí (sem também sair da tela cheia)
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && recorte) { e.preventDefault(); e.stopImmediatePropagation(); setRecorte(false); } }, true);
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
      // volta posição, recuo, giro, pin e grupos ao que estava quando o projeto abriu
      tiles.forEach(function (t) { var o = INICIO.t[t.id]; if (o) Object.keys(o).forEach(function (k) { t[k] = o[k]; }); });
      set_paineis(INICIO.p.map(function (p) { return Object.assign({}, p); }));
      tiles.forEach(function (t) { if (t.pn && !painelById(t.pn)) t.pn = ""; });
      gravarVivo(tiles); save(); refreshM(); atualizarTags();
    });
}

export { editM };
