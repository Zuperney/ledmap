// Distribuição automática de cabos de sinal (portada do motor do LLC):
// serpentina tela a tela, cortada em blocos de tamanho equilibrado.
// Células: { x, y } = posição no canvas (px), t = tela. Canto: bl | br | tl | tr. Sentido: updown (coluna a coluna) | zigzag (linha a linha).

// divide em N pedaços contíguos o mais iguais possível, com N = mínimo para respeitar o orçamento
export function balancedChunks(arr, budget) {
  var L = arr.length;
  if (!L) return [];
  var n = Math.max(1, Math.ceil(L / Math.max(1, budget))), base = Math.floor(L / n), extra = L - base * n, out = [], i = 0;
  for (var k = 0; k < n; k++) {
    var size = base + (extra > 0 ? 1 : 0);
    if (extra > 0) extra--;
    out.push(arr.slice(i, i + size));
    i += size;
  }
  return out;
}

// área (px) do retângulo que envolve as células: é o que o processador reserva para a porta.
// Cada célula: { x, y, w, h } no canvas.
export function areaRet(cells) {
  if (!cells.length) return 0;
  var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  cells.forEach(function (c) { x0 = Math.min(x0, c.x); y0 = Math.min(y0, c.y); x1 = Math.max(x1, c.x + c.w); y1 = Math.max(y1, c.y + c.h); });
  return (x1 - x0) * (y1 - y0);
}

// cabe numa porta? Com overclock, aceita passar do limite se sem a última célula ainda cabia.
export function cabeNaPorta(cells, lim, oc) {
  if (areaRet(cells) <= lim) return true;
  return !!oc && cells.length > 1 && areaRet(cells.slice(0, -1)) < lim;
}

// corta a sequência (já em serpentina) em pedaços contíguos cujo retângulo cabe na porta,
// com o menor número de portas e tamanhos o mais iguais possível
export function cortarPorArea(seq, lim, oc) {
  if (!seq.length) return [];
  var gulosa = [], cur = [];
  seq.forEach(function (c) {
    if (cur.length && !cabeNaPorta(cur.concat([c]), lim, oc)) { gulosa.push(cur); cur = []; }
    cur.push(c);
  });
  if (cur.length) gulosa.push(cur);
  for (var n = gulosa.length; n <= Math.min(seq.length, gulosa.length * 2); n++) {
    var pedacos = balancedChunks(seq, Math.ceil(seq.length / n));
    if (pedacos.length === n && pedacos.every(function (p) { return cabeNaPorta(p, lim, oc); })) return pedacos;
  }
  return gulosa;
}

function eixos(routing, corner) {
  var rightStart = corner === "br" || corner === "tr", bottomStart = corner === "bl" || corner === "br";
  var prim = routing === "zigzag" ? "y" : "x", sec = prim === "x" ? "y" : "x";
  return { prim: prim, sec: sec, revPrim: prim === "x" ? rightStart : bottomStart, revSec: sec === "x" ? rightStart : bottomStart };
}

export function snake(cells, routing, corner) {
  var e = eixos(routing, corner), lanes = {};
  cells.forEach(function (c) { (lanes[c[e.prim]] = lanes[c[e.prim]] || []).push(c); });
  var keys = Object.keys(lanes).map(Number).sort(function (a, b) { return a - b; });
  if (e.revPrim) keys.reverse();
  var out = [];
  keys.forEach(function (k, i) {
    var lane = lanes[k].sort(function (a, b) { return a[e.sec] - b[e.sec]; });
    var asc = (i % 2 === 0) !== e.revSec;
    out.push.apply(out, asc ? lane : lane.reverse());
  });
  return out;
}

// completa uma tela e só então passa para a próxima: no máximo 1 cabo cruza entre telas
export function snakePorTela(cells, routing, corner) {
  var by = {}, ordem = [];
  cells.forEach(function (c) { var k = c.t.id; if (!by[k]) { by[k] = []; ordem.push(k); } by[k].push(c); });
  if (ordem.length <= 1) return snake(cells, routing, corner);
  var e = eixos(routing, corner);
  var min = function (g, ax) { return g.reduce(function (m, c) { return Math.min(m, c[ax]); }, Infinity); };
  var grupos = ordem.map(function (k) { return by[k]; }).sort(function (a, b) {
    var p = min(a, e.prim) - min(b, e.prim);
    return (e.revPrim ? -p : p) || min(a, e.sec) - min(b, e.sec);
  });
  return grupos.reduce(function (acc, g) { return acc.concat(snake(g, routing, corner)); }, []);
}

// ---- estratégias por blocos (Linha, Coluna, Bloco): cada porta é um retângulo da grade, percorrido em serpentina ----

function range(n) { var a = []; for (var i = 0; i < n; i++) a.push(i); return a; }

// serpentina dentro de um bloco, começando no canto: "updown" = coluna a coluna (sobe e desce), "zigzag" = linha a linha
function bloco(bx, by, W, H, routing, corner) {
  var cols = range(W).map(function (i) { return bx + i; }), rows = range(H).map(function (i) { return by + i; }), out = [];
  if (corner === "br" || corner === "tr") cols.reverse();
  if (corner === "bl" || corner === "br") rows.reverse();
  if (routing === "zigzag") rows.forEach(function (r, ri) { (ri % 2 ? cols.slice().reverse() : cols).forEach(function (c) { out.push({ c: c, r: r }); }); });
  else cols.forEach(function (c, ci) { (ci % 2 ? rows.slice().reverse() : rows).forEach(function (r) { out.push({ c: c, r: r }); }); });
  return out;
}

function faixas(total, budget) { var out = [], rem = total; while (rem > budget) { out.push(budget); rem -= budget; } if (rem > 0) out.push(rem); return out; }

function portasGrade(cols, rows, budget, estrategia, routing, corner) {
  var ports = [], bx = 0, by = 0, w, h;
  if (estrategia === "linha") {
    faixas(cols, budget).forEach(function (fw) {
      h = Math.max(1, Math.floor(budget / fw));
      for (var y = 0; y < rows; y += h) ports.push(bloco(bx, y, Math.min(fw, cols - bx), Math.min(h, rows - y), routing, corner));
      bx += fw;
    });
  } else if (estrategia === "coluna") {
    faixas(rows, budget).forEach(function (fh) {
      w = Math.max(1, Math.floor(budget / fh));
      for (var x = 0; x < cols; x += w) ports.push(bloco(x, by, Math.min(w, cols - x), Math.min(fh, rows - by), routing, corner));
      by += fh;
    });
  } else {
    var bw = Math.max(1, Math.min(cols, Math.floor(Math.sqrt(budget))));
    var bh = Math.max(1, Math.min(rows, Math.floor(budget / bw)));
    bw = Math.max(1, Math.min(cols, Math.floor(budget / bh)));
    for (var y2 = 0; y2 < rows; y2 += bh) for (var x2 = 0; x2 < cols; x2 += bw) ports.push(bloco(x2, y2, Math.min(bw, cols - x2), Math.min(bh, rows - y2), routing, corner));
  }
  return ports;
}

// agrupa telas encostadas (mesma Screen e mesmo gabinete) num aglomerado: o bloco pode cruzar a emenda entre elas
export function aglomerados(telas) {
  var pai = telas.map(function (_, i) { return i; });
  var raiz = function (i) { while (pai[i] !== i) { pai[i] = pai[pai[i]]; i = pai[i]; } return i; };
  telas.forEach(function (a, i) {
    telas.forEach(function (b, j) {
      if (j <= i) return;
      var ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if ((ox > 0 && oy >= -1) || (oy > 0 && ox >= -1)) pai[raiz(i)] = raiz(j);
    });
  });
  var g = {};
  telas.forEach(function (t, i) { (g[raiz(i)] = g[raiz(i)] || []).push(t); });
  return Object.keys(g).map(function (k) { return g[k]; });
}

// células de um aglomerado -> portas retangulares. Se as telas não casam na grade do gabinete, devolve null (o chamador cai no modo contínuo).
export function portasPorBloco(cells, cw, ch, budget, estrategia, routing, corner) {
  var minX = Infinity, minY = Infinity, maxC = 0, maxR = 0, byPos = {};
  cells.forEach(function (c) { minX = Math.min(minX, c.x); minY = Math.min(minY, c.y); });
  for (var i = 0; i < cells.length; i++) {
    var gc = Math.round((cells[i].x - minX) / cw), gr = Math.round((cells[i].y - minY) / ch);
    if (Math.abs(cells[i].x - minX - gc * cw) > 1 || Math.abs(cells[i].y - minY - gr * ch) > 1 || byPos[gc + "," + gr]) return null;
    byPos[gc + "," + gr] = cells[i]; maxC = Math.max(maxC, gc); maxR = Math.max(maxR, gr);
  }
  return portasGrade(maxC + 1, maxR + 1, budget, estrategia, routing, corner)
    .map(function (p) { return p.map(function (g) { return byPos[g.c + "," + g.r]; }).filter(Boolean); })
    .filter(function (p) { return p.length; });
}

// ---- ordem das portas (onde entra o próximo cabo) ----
// esquema "eixo-d1-d2" (zigzag/raster) ou "eixo-d1-d2-serp" (sobe e desce / serpentina); eixo row = por linha, col = por coluna (empilhado)
export function esquemaDe(eixo, serp, corner) {
  var top = corner === "tl" || corner === "tr", left = corner === "bl" || corner === "tl";
  var d = eixo === "col" ? [left ? "lr" : "rl", top ? "tb" : "bt"] : [top ? "tb" : "bt", left ? "lr" : "rl"];
  return eixo + "-" + d[0] + "-" + d[1] + (serp ? "-serp" : "");
}

export function ordemPortas(portas, esquema) {
  var bb = function (p) { var y = Infinity, x = Infinity; p.forEach(function (c) { if (c.y < y) y = c.y; if (c.x < x) x = c.x; }); return { minY: y, minX: x }; };
  var t = (esquema || "row-tb-lr").split("-"), axis = t[0], d1 = t[1], d2 = t[2], serp = t[3] === "serp";
  if (serp) {
    var prim = axis === "col" ? "minX" : "minY", sec = axis === "col" ? "minY" : "minX";
    var primAsc = axis === "col" ? d1 === "lr" : d1 !== "bt", secAsc = axis === "col" ? d2 !== "bt" : d2 === "lr";
    var dec = portas.map(function (p) { var b = bb(p); return { p: p, a: b[prim], b: b[sec] }; });
    var lanes = dec.map(function (d) { return d.a; }).filter(function (v, i, a) { return a.indexOf(v) === i; }).sort(function (x, y) { return primAsc ? x - y : y - x; });
    dec.sort(function (A, B) {
      var ia = lanes.indexOf(A.a), ib = lanes.indexOf(B.a);
      if (ia !== ib) return ia - ib;
      return (A.b - B.b) * (secAsc ? 1 : -1) * (ia % 2 ? -1 : 1);
    });
    return dec.map(function (d) { return d.p; });
  }
  return portas.slice().sort(function (P, Q) {
    var a = bb(P), b = bb(Q);
    if (axis === "col") { var c = d1 === "lr" ? a.minX - b.minX : b.minX - a.minX; return c || (d2 === "bt" ? b.minY - a.minY : a.minY - b.minY); }
    var r = d1 === "bt" ? b.minY - a.minY : a.minY - b.minY;
    return r || (d2 === "lr" ? a.minX - b.minX : b.minX - a.minX);
  });
}
