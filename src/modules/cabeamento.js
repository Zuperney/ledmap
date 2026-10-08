import { res, tiles, nf, bbox, el, text } from "./core.js";
import { cabNome } from "./gabinetes.js";
import { histTick } from "./historico.js";
import { chave } from "./projetos.js";
import { makeViewer } from "./visor.js";

let LIMIT, CSTORE, svgK, ports, routes, nextP, activePort, oc, traceOn, orderOn, cellEl, gK, paint, linesK, viewK, btnTrace, btnOrder, btnOc;

function kmsg(t) { document.getElementById("k-msg").textContent = t || ""; }

function cabPx(t) { var q = res(t); return q.cw * q.ch; }

export function ksave() {
    histTick();
    try { localStorage.setItem(CSTORE, JSON.stringify({ ports: ports, routes: routes, nextP: nextP, oc: oc })); } catch (e) {}
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
    var load = routeLoad(route);
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
      var name = cabNome(t);
      if (seenP[name]) return;
      seenP[name] = 1;
      var px = cabPx(t), f = Math.floor(LIMIT / px), cc = Math.ceil(LIMIT / px);
      out.push(name + ": " + nf(px) + " px por gabinete, " + f + " gab por porta" + (cc !== f ? " (" + cc + " com overclock)" : ""));
    });
    return "Limite de " + nf(LIMIT) + " px por porta. " + out.join(" · ");
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
    document.getElementById("k-stat").innerHTML = "<b>" + totalCab + "</b> gabinetes · <b>" + assigned + "</b> com porta · <b>" + (totalCab - assigned) + "</b> sem porta · mínimo de <b>" + Math.ceil(totalPx / LIMIT) + "</b> portas";
    renderPorts();
  }

function renderPorts() {
    var box = document.getElementById("ports");
    box.textContent = "";
    ports.forEach(function (p) {
      var route = routes[p.id], st = portState(route);
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
    var load = routeLoad(route), add = cabPx(cellEl[key].t);
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
  LIMIT = 655360;
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

export { cellEl, ports, routes, LIMIT, oc, nextP, activePort, viewK };
export function set_ports(v) { ports = v; return v; }
export function set_routes(v) { routes = v; return v; }
export function set_nextP(v) { nextP = v; return v; }
export function set_oc(v) { oc = v; return v; }
export function set_activePort(v) { activePort = v; return v; }
