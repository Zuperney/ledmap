import { ID_V1, TELAS_V1, projetoAtivo } from "./projetos.js";
import { tiles, EXTRAS, groups, nextG, cleanExtras, mnum, save, set_EXTRAS, set_groups, set_nextG } from "./core.js";
import { LIMIT, oc, nextP, ports, routes, cellEl, activePort, applyOc, setActivePort, ksave, set_ports, set_routes, set_nextP, set_oc, set_activePort } from "./cabeamento.js";
import { commitAndReload } from "./telas.js";
import { tById, pmsg, saveFile } from "./exportar.js";
import { refreshM } from "./rig-edicao.js";
import { setActive } from "./screens.js";
import { refreshSelects } from "./tabela.js";
import { placeC } from "./canvas-edicao.js";
import { renderCabM } from "./rig-cabos.js";

let fileIn;

export function buildProject() {
    return {
      tipo: "ledmap",
      versao: 2,
      exportadoEm: new Date().toISOString(),
      projeto: (function () { var a = projetoAtivo() || {}; return { nome: a.nome || "", cliente: a.cliente || "", local: a.local || "", data: a.data || "" }; })(),
      telas: tiles.map(function (t) { return { id: t.id, nome: t.name, x: t.cx, y: t.cy, screen: t.grp || "", mx: t.mx, my: t.my }; }),
      extras: EXTRAS.map(function (e) { return { id: e.id, nome: e.name, tipo: e.kind, largura: e.w, altura: e.h, mx: e.mx, my: e.my, cx: e.cx, cy: e.cy }; }),
      screens: groups.map(function (g) { return { id: g.id, nome: g.name }; }),
      proximaScreen: nextG,
      cabeamento: {
        limitePorPorta: LIMIT,
        overclock: oc,
        proximaPorta: nextP,
        portas: ports.map(function (pt) { return { id: pt.id, n: pt.n, nome: pt.name }; }),
        rotas: routes
      }
    };
  }

function whole(v, lo, hi) {
    var n = Number(v);
    return isFinite(n) && n >= lo && n <= hi ? Math.round(n) : null;
  }

function idNum(id) { return parseInt(id.slice(1), 10) || 0; }

/* formato antigo (v1): as telas fixas tinham ids como "2a"; agora todas são telas comuns, numeradas */
function converterV1(o) {
    var extras = TELAS_V1.map(function (b) { return { id: b.id, nome: b.name, tipo: b.kind, largura: b.w, altura: b.h, mx: b.mx, my: b.my, cx: b.cx, cy: b.cy }; });
    var emap = {}, nid = 10;
    (Array.isArray(o.extras) ? o.extras : []).forEach(function (e) {
      if (!e || typeof e !== "object") return;
      var id = String(nid++); emap[String(e.id)] = id;
      extras.push(Object.assign({}, e, { id: id }));
    });
    function rid(old) { old = String(old); return ID_V1[old] || emap[old] || null; }
    var telas = [];
    (Array.isArray(o.telas) ? o.telas : []).forEach(function (t) { var id = t && rid(t.id); if (id) telas.push(Object.assign({}, t, { id: id })); });
    var cab = o.cabeamento && typeof o.cabeamento === "object" ? o.cabeamento : {}, rotas = {};
    Object.keys(cab.rotas || {}).forEach(function (pid) {
      rotas[pid] = (Array.isArray(cab.rotas[pid]) ? cab.rotas[pid] : []).map(function (k) {
        if (typeof k !== "string") return k;
        var i = k.indexOf(":"), n = i > 0 ? rid(k.slice(0, i)) : null;
        return n ? n + k.slice(i) : "";
      }).filter(Boolean);
    });
    return Object.assign({}, o, { tipo: "ledmap", versao: 2, extras: extras, telas: telas, cabeamento: Object.assign({}, cab, { rotas: rotas }) });
  }

export function applyProject(o) {
    if (o && typeof o === "object" && o.tipo === "mapa-telas-led") o = converterV1(o);
    if (!o || typeof o !== "object" || o.tipo !== "ledmap") throw new Error("Este arquivo não é um projeto do Led Map.");
    if (Array.isArray(o.extras)) {
      var ne = cleanExtras(o.extras.map(function (x) {
        return x && typeof x === "object" ? { id: x.id, name: x.nome, kind: x.tipo, w: x.largura, h: x.altura, mx: x.mx, my: x.my, cx: x.cx, cy: x.cy, grp: "" } : null;
      }));
      var sig = function (l) { return JSON.stringify(l.map(function (e) { return [e.id, e.name, e.kind, e.w, e.h, e.mx, e.my, e.cx, e.cy]; })); };
      if (sig(ne) !== sig(EXTRAS)) {
        var prevEx = EXTRAS;
        set_EXTRAS(ne);
        if (!commitAndReload("c", JSON.stringify(o))) { set_EXTRAS(prevEx); throw new Error("Não consegui criar as telas extras neste navegador."); }
        return "recarregando para criar as telas extras…";
      }
    }
    var ng = [], gseen = {};
    (Array.isArray(o.screens) ? o.screens : []).forEach(function (g) {
      if (g && typeof g.id === "string" && /^g\d{1,6}$/.test(g.id) && typeof g.nome === "string" && !gseen[g.id]) {
        gseen[g.id] = 1;
        ng.push({ id: g.id, name: g.nome.slice(0, 40) });
      }
    });
    var nt = {}, count = 0;
    (Array.isArray(o.telas) ? o.telas : []).forEach(function (t) {
      if (!t || typeof t.id !== "string" || !tById[t.id]) return;
      var x = whole(t.x, -20000, 20000), y = whole(t.y, -20000, 20000);
      if (x === null || y === null) return;
      nt[t.id] = { x: x, y: y, grp: (typeof t.screen === "string" && gseen[t.screen]) ? t.screen : "", mx: mnum(t.mx), my: mnum(t.my) };
      count++;
    });
    if (!count && tiles.length) throw new Error("Nenhuma tela reconhecida no arquivo.");
    var cab = (o.cabeamento && typeof o.cabeamento === "object") ? o.cabeamento : {};
    var np = [], pseen = {};
    (Array.isArray(cab.portas) ? cab.portas : []).forEach(function (pt) {
      if (pt && typeof pt.id === "string" && /^p\d{1,6}$/.test(pt.id) && !pseen[pt.id] && typeof pt.nome === "string" && Number(pt.n) >= 1) {
        pseen[pt.id] = 1;
        np.push({ id: pt.id, n: Math.floor(Number(pt.n)), name: pt.nome.slice(0, 24) });
      }
    });
    var nr = {}, used = {}, nCab = 0;
    np.forEach(function (pt) {
      var r = (cab.rotas && Array.isArray(cab.rotas[pt.id])) ? cab.rotas[pt.id] : [];
      nr[pt.id] = r.filter(function (k) {
        if (typeof k !== "string" || !cellEl[k] || used[k]) return false;
        used[k] = 1;
        return true;
      });
      nCab += nr[pt.id].length;
    });

    tiles.forEach(function (t) {
      var n = nt[t.id];
      if (n) {
        t.cx = n.x; t.cy = n.y; t.grp = n.grp;
        if (n.mx !== null && n.my !== null) { t.mx = n.mx; t.my = n.my; }
      }
    });
    refreshM();
    set_groups(ng);
    set_nextG(Math.max(Number(o.proximaScreen) || 1, ng.reduce(function (a, g) { return Math.max(a, idNum(g.id)); }, 0) + 1));
    set_ports(np);
    set_routes(nr);
    set_nextP(Math.max(Number(cab.proximaPorta) || 1, np.reduce(function (a, pt) { return Math.max(a, idNum(pt.id), pt.n); }, 0) + 1));
    if (!ports.length) {
      ports.push({ id: "p" + nextP, n: nextP, name: "Porta " + nextP });
      routes["p" + nextP] = [];
      (set_nextP(nextP + 1), nextP - 1);
    }
    set_oc(!!cab.overclock);
    set_activePort(ports[0].id);
    setActive(null);
    refreshSelects();
    placeC();
    save();
    applyOc();
    setActivePort(activePort);
    ksave();
    renderCabM();
    return "Telas: " + count + " · screens: " + ng.length + " · portas: " + np.length + " · gabinetes cabeados: " + nCab + ".";
  }

export function loadText(txt) {
    var o;
    try { o = JSON.parse(txt); } catch (e) { pmsg("O texto não é um JSON válido."); return; }
    try { pmsg("Projeto carregado: " + applyProject(o)); } catch (e) { pmsg(e.message); }
  }

export function init() {
  document.getElementById("proj-export").addEventListener("click", function () {
      saveFile(((projetoAtivo() || {}).nome || "ledmap").replace(/[^\w\-]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() + ".json", JSON.stringify(buildProject(), null, 2));
    });
  fileIn = document.getElementById("proj-file");
  document.getElementById("proj-import").addEventListener("click", function () { fileIn.click(); });
  fileIn.addEventListener("change", function () {
      var f = fileIn.files && fileIn.files[0];
      if (!f) return;
      if (f.size > 5 * 1024 * 1024) { pmsg("Arquivo grande demais para ser um projeto."); fileIn.value = ""; return; }
      var rd = new FileReader();
      rd.onload = function () { loadText(String(rd.result)); fileIn.value = ""; };
      rd.onerror = function () { pmsg("Não consegui ler o arquivo."); fileIn.value = ""; };
      rd.readAsText(f);
    });
  document.getElementById("json-fill").addEventListener("click", function () {
      document.getElementById("json-text").value = JSON.stringify(buildProject(), null, 2);
      pmsg("JSON atual na caixa de texto. Selecione tudo para copiar.");
    });
  document.getElementById("json-load").addEventListener("click", function () {
      loadText(document.getElementById("json-text").value);
    });
}

