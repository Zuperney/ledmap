import { res, tiles, groups, nf, bbox, el, text } from "./core.js";
import { cabNome, cabDe } from "./gabinetes.js";
import { histTick } from "./historico.js";
import { chave } from "./projetos.js";
import { makeViewer } from "./visor.js";
import { balancedChunks, snakePorTela, aglomerados, portasPorBloco, esquemaDe, ordemPortas } from "./auto-cabos.js";
import { SINAL_PADRAO, MAX_PORTAS_PADRAO, limpaSinal, limitePx, limpaMax } from "./sinal.js";

let sinal, sinalScreens, maxPortas, autoCfg, CSTORE, svgK, ports, routes, nextP, activePort, oc, traceOn, orderOn, cellEl, gK, paint, linesK, viewK, btnTrace, btnOrder, btnOc;

export function kmsg(t) { document.getElementById("k-msg").textContent = t || ""; }

export function cfgDe(t) { return (t.grp && sinalScreens[t.grp]) || sinal; }

export function limiteTela(t) { return limitePx(cfgDe(t)); }

// limite da rota: o menor entre as telas que ela atravessa (conservador)
export function limiteRota(route) {
    var m = Infinity;
    route.forEach(function (k) { m = Math.min(m, limiteTela(cellEl[k].t)); });
    return m === Infinity ? limitePx(sinal) : m;
  }

export function limiteTxt() {
    var seen = {}, vals = [];
    tiles.forEach(function (t) { var v = limiteTela(t); if (!seen[v]) { seen[v] = 1; vals.push(v); } });
    return vals.length > 1 ? nf(Math.min.apply(null, vals)) + " a " + nf(Math.max.apply(null, vals)) : nf(vals.length ? vals[0] : limitePx(sinal));
  }

// portas necessárias (mínimo por área) e em uso, por Screen
export function resumoScreens(groups) {
    var chaves = groups.map(function (g) { return { id: g.id, nome: g.name.trim() || "Sem nome" }; }).concat([{ id: "", nome: "Sem screen" }]);
    var pe = {};
    ports.forEach(function (p) { var r = routes[p.id] || []; if (r.length) { var g = cellEl[r[0]].t.grp || ""; pe[g] = (pe[g] || 0) + 1; } });
    return chaves.map(function (c) {
      var px = 0, n = 0, lim = 0;
      tiles.forEach(function (t) { if ((t.grp || "") === c.id) { px += res(t).total; n++; lim = limiteTela(t); } });
      return { id: c.id, nome: c.nome, telas: n, px: px, limite: lim, min: n ? Math.ceil(px / lim) : 0, usadas: pe[c.id] || 0 };
    }).filter(function (x) { return x.telas; });
  }

let sinalHook = null;
export function onSinal(fn) { sinalHook = fn; }

export function setSinal(grp, cfg) {
    if (!grp) sinal = limpaSinal(cfg);
    else if (cfg) sinalScreens[grp] = limpaSinal(cfg);
    else delete sinalScreens[grp];
    renderCabling();
    ksave();
  }

export function setMaxPortas(n) { maxPortas = limpaMax(n); renderCabling(); ksave(); }

export function autoState() { return autoCfg; }
function limpaAuto(c) {
    c = c || {};
    return {
      corner: ["bl", "br", "tl", "tr"].indexOf(c.corner) >= 0 ? c.corner : "bl",
      routing: c.routing === "zigzag" ? "zigzag" : "updown",
      estrategia: ["continuo", "linha", "coluna", "bloco"].indexOf(c.estrategia) >= 0 ? c.estrategia : "continuo",
      ordem: ["row", "row-serp", "col", "col-serp"].indexOf(c.ordem) >= 0 ? c.ordem : "row"
    };
  }

export function setAuto(c) { autoCfg = limpaAuto(c); ksave(); }

// Distribui os gabinetes das telas do escopo ("*" = todas, "_" = sem Screen, ou id da Screen) em portas automáticas.
export function distribuirAuto(escopo) {
    var alvo = {}, cels = [];
    tiles.forEach(function (t) { if (escopo === "*" || (escopo === "_" ? !t.grp : t.grp === escopo)) alvo[t.id] = 1; });
    Object.keys(cellEl).forEach(function (k) {
      var c = cellEl[k], q = res(c.t);
      if (alvo[c.t.id]) cels.push({ key: k, t: c.t, x: c.t.cx + c.c * q.cw, y: c.t.cy + c.r * q.ch });
    });
    if (!cels.length) return { portas: 0, gabinetes: 0, aviso: "Não há gabinetes nesse escopo." };
    var grupos = {}, ordem = [];
    cels.forEach(function (c) {
      var k = (c.t.grp || "") + "|" + cabDe(c.t).id;
      if (!grupos[k]) { grupos[k] = []; ordem.push(k); }
      grupos[k].push(c);
    });
    var porScreen = {};
    ordem.forEach(function (k) {
      var g = grupos[k], t0 = g[0].t, q0 = res(t0), px = cabPx(t0), lim = limiteTela(t0), scr = t0.grp || "";
      var budget = Math.max(1, oc ? Math.ceil(lim / px) : Math.floor(lim / px));
      var lista = [];
      if (autoCfg.estrategia === "continuo") {
        lista = balancedChunks(snakePorTela(g, autoCfg.routing, autoCfg.corner), budget);
      } else {
        var vistos = {}, telasG = [];
        g.forEach(function (c) { if (!vistos[c.t.id]) { vistos[c.t.id] = 1; telasG.push({ id: c.t.id, x: c.t.cx, y: c.t.cy, w: q0.cw * res(c.t).cols, h: q0.ch * res(c.t).rows }); } });
        aglomerados(telasG).forEach(function (ag) {
          var ids = {}; ag.forEach(function (t) { ids[t.id] = 1; });
          var cs = g.filter(function (c) { return ids[c.t.id]; });
          var pb = portasPorBloco(cs, q0.cw, q0.ch, budget, autoCfg.estrategia, autoCfg.routing, autoCfg.corner);
          lista = lista.concat(pb || balancedChunks(snakePorTela(cs, autoCfg.routing, autoCfg.corner), budget));
        });
      }
      lista.forEach(function (ch) { (porScreen[scr] = porScreen[scr] || []).push(ch); });
    });
    var gi = {}, final = [];
    groups.forEach(function (g, i) { gi[g.id] = i; });
    var eixo = autoCfg.ordem.split("-")[0], serp = autoCfg.ordem.indexOf("serp") > 0;
    Object.keys(porScreen).sort(function (a, b) { return (a in gi ? gi[a] : 1e9) - (b in gi ? gi[b] : 1e9); }).forEach(function (g) {
      ordemPortas(porScreen[g], esquemaDe(eixo, serp, autoCfg.corner)).forEach(function (cs) { final.push({ grp: g, cells: cs }); });
    });
    // tira os gabinetes do escopo das rotas atuais e descarta portas que ficaram vazias
    ports.forEach(function (p) { routes[p.id] = (routes[p.id] || []).filter(function (k) { return !alvo[cellEl[k] && cellEl[k].t.id]; }); });
    ports = ports.filter(function (p) { if (routes[p.id].length) return true; delete routes[p.id]; return false; });
    if (!ports.length) nextP = 1;
    final.forEach(function (f) {
      var p = { id: "p" + nextP, n: nextP, name: "" };
      nextP++;
      ports.push(p);
      routes[p.id] = f.cells.map(function (c) { return c.key; });
    });
    setActivePort(final.length ? "p" + (nextP - final.length) : (ports.length ? ports[0].id : null));
    ksave();
    var estouro = resumoScreens(groups).filter(function (x) { return x.usadas > maxPortas; });
    return { portas: final.length, gabinetes: cels.length, aviso: estouro.length ? "Passou de " + maxPortas + " portas em: " + estouro.map(function (x) { return x.nome + " (" + x.usadas + ")"; }).join(", ") + "." : "" };
  }

export function sinalState() { return { sinal: sinal, sinalScreens: sinalScreens, maxPortas: maxPortas }; }

export function loadSinal(sn, ss, mp) {
    sinal = limpaSinal(sn);
    sinalScreens = {};
    if (ss && typeof ss === "object") Object.keys(ss).forEach(function (k) { sinalScreens[k] = limpaSinal(ss[k]); });
    maxPortas = limpaMax(mp);
  }

function cabPx(t) { var q = res(t); return q.cw * q.ch; }

export function ksave() {
    histTick();
    try { localStorage.setItem(CSTORE, JSON.stringify({ ports: ports, routes: routes, nextP: nextP, oc: oc, sinal: sinal, sinalScreens: sinalScreens, maxPortas: maxPortas, auto: autoCfg })); } catch (e) {}
  }

export function portById(id) { for (var i = 0; i < ports.length; i++) if (ports[i].id === id) return ports[i]; return null; }

export function pname(p) { return p.name.trim() || "Porta " + p.n; }

export function pcolor(p) { return "hsl(" + Math.round((p.n * 137.508) % 360) + ", 72%, 48%)"; }

export function owners() {
    var o = {};
    ports.forEach(function (p) { (routes[p.id] || []).forEach(function (k, i) { o[k] = { pid: p.id, i: i }; }); });
    return o;
  }

function routeLoad(route) { return route.reduce(function (a, k) { return a + cabPx(cellEl[k].t); }, 0); }

export function portState(route) {
    if (!route.length) return { cls: "", txt: "Vazia", load: 0 };
    var load = routeLoad(route), LIMIT = limiteRota(route);
    var lastPx = cabPx(cellEl[route[route.length - 1]].t);
    if (load <= LIMIT) return { cls: "ok", txt: "OK", load: load };
    if (load - lastPx < LIMIT) return oc ? { cls: "oc", txt: "OC", load: load } : { cls: "bad", txt: "Excede, cabe com OC", load: load };
    return { cls: "bad", txt: "Excedido", load: load };
  }

function center(k) {
    var c = cellEl[k], q = res(c.t);
    return [c.t.cx + (c.c + 0.5) * q.cw, c.t.cy + (c.r + 0.5) * q.ch];
  }

function capsText() {
    var seenP = {}, out = [];
    tiles.forEach(function (t) {
      var name = cabNome(t), LIMIT = limiteTela(t), kk = name + "|" + LIMIT;
      if (seenP[kk]) return;
      seenP[kk] = 1;
      var px = cabPx(t), f = Math.floor(LIMIT / px), cc = Math.ceil(LIMIT / px);
      out.push(name + ": " + nf(px) + " px por gabinete, " + f + " gab por porta" + (cc !== f ? " (" + cc + " com overclock)" : ""));
    });
    return "Limite de " + limiteTxt() + " px por porta. " + out.join(" · ");
  }

export function renderCabling() {
    var bb = bbox(tiles);
    svgK.setAttribute("viewBox", [bb.x - 100, bb.y - 100, bb.w + 200, bb.h + 200].join(" "));
    tiles.forEach(function (t) { gK[t.id].setAttribute("transform", "translate(" + t.cx + " " + t.cy + ")"); });
    var o = owners(), assigned = 0;
    Object.keys(cellEl).forEach(function (k) {
      var c = cellEl[k], own = o[k];
      if (own) {
        assigned++;
        c.rect.style.fill = pcolor(portById(own.pid));
        c.rect.style.fillOpacity = "0.42";
        c.num.textContent = orderOn ? String(own.i + 1) : "";
        c.rect.classList.toggle("act", own.pid === activePort);
      } else {
        c.rect.style.fill = "";
        c.rect.style.fillOpacity = "";
        c.num.textContent = "";
        c.rect.classList.remove("act");
      }
    });
    linesK.textContent = "";
    ports.forEach(function (p) {
      var route = routes[p.id];
      if (!route.length) return;
      var pts = route.map(center);
      var col = pcolor(p), act = p.id === activePort;
      el("polyline", { "class": "kline" + (act ? " act" : ""), points: pts.map(function (a) { return a[0] + "," + a[1]; }).join(" "), stroke: col }, linesK);
      var q0 = res(cellEl[route[0]].t);
      el("circle", { "class": "kdot", cx: pts[0][0], cy: pts[0][1], r: q0.u * 0.22, fill: col }, linesK);
      if (route.length > 1) {
        var ql = res(cellEl[route[route.length - 1]].t), last = pts[pts.length - 1];
        el("circle", { "class": "kend", cx: last[0], cy: last[1], r: ql.u * 0.2, stroke: col }, linesK);
      }
      var tg = el("text", { "class": "ktag", x: pts[0][0] + q0.u * 0.3, y: pts[0][1] - q0.u * 0.3, "font-size": q0.u * 0.5, "stroke-width": q0.u * 0.15 }, linesK);
      tg.textContent = pname(p).slice(0, 8);
    });
    var totalCab = Object.keys(cellEl).length;
    var totalPx = tiles.reduce(function (a, t) { return a + res(t).total; }, 0);
    document.getElementById("k-stat").innerHTML = "<b>" + totalCab + "</b> gabinetes · <b>" + assigned + "</b> com porta · <b>" + (totalCab - assigned) + "</b> sem porta · mínimo de <b>" + resumoScreens(groups).reduce(function (a, x) { return a + x.min; }, 0) + "</b> portas";
    renderPorts();
    if (sinalHook) sinalHook();
  }

function renderPorts() {
    var box = document.getElementById("ports");
    box.textContent = "";
    ports.forEach(function (p) {
      var route = routes[p.id], st = portState(route), LIMIT = limiteRota(route);
      var b = document.createElement("button");
      b.className = "port";
      b.setAttribute("aria-pressed", String(p.id === activePort));
      var sw = document.createElement("span"); sw.className = "sw"; sw.style.background = pcolor(p);
      var nm = document.createElement("span"); nm.className = "nm"; nm.textContent = pname(p);
      var pill = document.createElement("span"); pill.className = "pill " + st.cls; pill.textContent = st.txt;
      var mt = document.createElement("span"); mt.className = "mt";
      mt.textContent = route.length + (route.length === 1 ? " gabinete" : " gabinetes") + " · " + nf(st.load) + " / " + nf(LIMIT) + " px";
      var bar = document.createElement("span"); bar.className = "bar";
      var fill = document.createElement("i");
      fill.style.width = Math.min(100, st.load / LIMIT * 100) + "%";
      fill.style.background = st.cls === "bad" ? "var(--bad)" : pcolor(p);
      bar.appendChild(fill);
      b.appendChild(sw); b.appendChild(nm); b.appendChild(pill); b.appendChild(mt); b.appendChild(bar);
      b.addEventListener("click", function () { setActivePort(p.id); });
      box.appendChild(b);
    });
  }

export function setActivePort(id) {
    activePort = id;
    var p = portById(id);
    document.getElementById("k-detail").hidden = !p;
    if (p) document.getElementById("k-name").value = p.name;
    kmsg("");
    renderCabling();
  }

function tryAppend(key) {
    var route = routes[activePort];
    var load = routeLoad(route), add = cabPx(cellEl[key].t), LIMIT = Math.min(limiteRota(route.concat([key])), 1e12);
    var ok = oc ? load < LIMIT : load + add <= LIMIT;
    if (!ok) {
      if (!oc && load < LIMIT) kmsg("Porta cheia: " + nf(load) + " de " + nf(LIMIT) + " px. Ative o overclock para encaixar mais um gabinete.");
      else if (oc) kmsg("Porta cheia, mesmo com overclock. Use outra porta.");
      else kmsg("Porta cheia. Use outra porta.");
      return false;
    }
    route.push(key);
    kmsg("");
    renderCabling();
    ksave();
    return true;
  }

function keyOf(target) {
    var n = target && target.closest ? target.closest("[data-key]") : null;
    return n ? n.getAttribute("data-key") : null;
  }

export function twoStep(btn, idle, confirmTxt, fn) {
    var t = null;
    function reset() { clearTimeout(t); btn.removeAttribute("data-arm"); btn.textContent = idle; }
    btn.addEventListener("click", function () {
      if (btn.getAttribute("data-arm") !== "1") {
        btn.setAttribute("data-arm", "1");
        btn.textContent = confirmTxt;
        t = setTimeout(reset, 3500);
        return;
      }
      reset();
      fn();
    });
  }

function applyTrace() {
    btnTrace.setAttribute("aria-pressed", String(traceOn));
    svgK.style.touchAction = traceOn ? "none" : "";
  }

export function applyOc() { btnOc.setAttribute("aria-pressed", String(oc)); }

export function init() {
  sinal = Object.assign({}, SINAL_PADRAO);
  sinalScreens = {};
  maxPortas = MAX_PORTAS_PADRAO;
  autoCfg = { corner: "bl", routing: "updown", estrategia: "continuo", ordem: "row" };
  CSTORE = chave("cabos");
  svgK = document.getElementById("svg-k");
  ports = [];
  routes = {};
  nextP = 1;
  activePort = null;
  oc = false;
  traceOn = true;
  orderOn = true;
  cellEl = {};
  gK = {};
  paint = null;
  try {
      var sk = JSON.parse(localStorage.getItem(CSTORE) || "null");
      if (sk) {
        if (Array.isArray(sk.ports)) ports = sk.ports.filter(function (p) { return p && typeof p.id === "string" && typeof p.name === "string" && Number(p.n) > 0; });
        nextP = Number(sk.nextP) || ports.length + 1;
        oc = !!sk.oc;
        loadSinal(sk.sinal, sk.sinalScreens, sk.maxPortas);
        autoCfg = limpaAuto(sk.auto);
        routes = (sk.routes && typeof sk.routes === "object") ? sk.routes : {};
      }
    } catch (e) {}
  tiles.forEach(function (t) {
      var q = res(t);
      var g = el("g", { "class": "kt " + t.kind }, svgK);
      el("rect", { "class": "kbody", x: 0, y: 0, width: q.w, height: q.h }, g);
      text(g, "klabel", q.w / 2, q.h / 2, Math.min(q.w, q.h) * 0.55, t.id);
      for (var r = 0; r < q.rows; r++) {
        for (var c = 0; c < q.cols; c++) {
          var key = t.id + ":" + c + ":" + r;
          var rect = el("rect", { "class": "cell", x: c * q.cw, y: r * q.ch, width: q.cw, height: q.ch, "data-key": key }, g);
          var num = text(g, "cnum", (c + 0.5) * q.cw, (r + 0.5) * q.ch, q.u * 0.34, "");
          cellEl[key] = { rect: rect, num: num, t: t, c: c, r: r };
        }
      }
      gK[t.id] = g;
    });
  linesK = el("g", {}, svgK);
  (function () {
      var seen = {};
      Object.keys(routes).forEach(function (pid) {
        if (!ports.some(function (p) { return p.id === pid; })) { delete routes[pid]; return; }
        routes[pid] = (Array.isArray(routes[pid]) ? routes[pid] : []).filter(function (k) {
          if (!cellEl[k] || seen[k]) return false;
          seen[k] = true;
          return true;
        });
      });
      if (!ports.length) { ports.push({ id: "p1", n: 1, name: "Porta 1" }); nextP = 2; }
      ports.forEach(function (p) { if (!routes[p.id]) routes[p.id] = []; });
      activePort = ports[0].id;
    })();
  document.getElementById("k-caps").textContent = capsText();
  svgK.addEventListener("pointerdown", function (e) {
      var key = keyOf(e.target);
      if (!key || (e.button && e.button > 0)) return;
      if (!activePort) { kmsg("Crie uma porta para começar o cabeamento."); return; }
      paint = { down: key, last: key, moved: false, added: false };
      if (!owners()[key]) paint.added = tryAppend(key);
    });
  svgK.addEventListener("pointermove", function (e) {
      if (!paint || !traceOn) return;
      var key = keyOf(document.elementFromPoint(e.clientX, e.clientY));
      if (!key || key === paint.last) return;
      paint.last = key;
      paint.moved = true;
      if (!owners()[key] && tryAppend(key)) paint.added = true;
    });
  svgK.addEventListener("pointerup", function () {
      var pt = paint;
      paint = null;
      if (!pt || pt.moved || pt.added) return;
      var own = owners()[pt.down];
      if (!own) return;
      if (own.pid !== activePort) { setActivePort(own.pid); return; }
      var route = routes[activePort];
      route.length = own.i === route.length - 1 ? own.i : own.i + 1;
      kmsg("");
      renderCabling();
      ksave();
    });
  svgK.addEventListener("pointercancel", function () { paint = null; });
  viewK = makeViewer(svgK.parentNode, svgK,
    { label: "k-zlabel", lock: "k-lock", zin: "k-zin", zout: "k-zout", zfit: "k-zfit" },
    function () { paint = null; });
  document.getElementById("k-new").addEventListener("click", function () {
      var p = { id: "p" + nextP, n: nextP, name: "Porta " + nextP };
      nextP++;
      ports.push(p);
      routes[p.id] = [];
      setActivePort(p.id);
      ksave();
    });
  document.getElementById("k-name").addEventListener("input", function (e) {
      var p = portById(activePort);
      if (!p) return;
      p.name = e.target.value;
      renderCabling();
      ksave();
    });
  document.getElementById("k-undo").addEventListener("click", function () {
      if (!activePort || !routes[activePort].length) return;
      routes[activePort].pop();
      kmsg("");
      renderCabling();
      ksave();
    });
  twoStep(document.getElementById("k-clear"), "Limpar rota", "Confirmar limpeza", function () {
      if (!activePort) return;
      routes[activePort] = [];
      kmsg("");
      renderCabling();
      ksave();
    });
  twoStep(document.getElementById("k-del"), "Excluir porta", "Confirmar exclusão", function () {
      if (!activePort) return;
      var id = activePort;
      ports = ports.filter(function (p) { return p.id !== id; });
      delete routes[id];
      setActivePort(ports.length ? ports[0].id : null);
      ksave();
    });
  twoStep(document.getElementById("k-clearall"), "Limpar tudo", "Confirmar limpar tudo", function () {
      ports.forEach(function (p) { routes[p.id] = []; });
      kmsg("");
      renderCabling();
      ksave();
    });
  btnTrace = document.getElementById("k-trace");
  btnTrace.addEventListener("click", function () { traceOn = !traceOn; applyTrace(); });
  btnOrder = document.getElementById("k-order");
  btnOrder.addEventListener("click", function () {
      orderOn = !orderOn;
      btnOrder.setAttribute("aria-pressed", String(orderOn));
      renderCabling();
    });
  btnOc = document.getElementById("k-oc");
  btnOc.addEventListener("click", function () { oc = !oc; applyOc(); renderCabling(); ksave(); });
  applyTrace();
  applyOc();
  setActivePort(activePort);
}

export { cellEl, ports, routes, oc, nextP, activePort, viewK };
export function set_ports(v) { ports = v; return v; }
export function set_routes(v) { routes = v; return v; }
export function set_nextP(v) { nextP = v; return v; }
export function set_oc(v) { oc = v; return v; }
export function set_activePort(v) { activePort = v; return v; }
