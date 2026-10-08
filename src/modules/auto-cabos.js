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

// ordem de numeração das portas, pela posição do bloco no canvas
export function ordenaPortas(portas, routing, corner) {
  var e = eixos(routing, corner);
  var pos = function (p) { return { a: Math.min.apply(null, p.map(function (c) { return c[e.prim]; })), b: Math.min.apply(null, p.map(function (c) { return c[e.sec]; })) }; };
  return portas.slice().sort(function (P, Q) {
    var a = pos(P), b = pos(Q), d = a.a - b.a;
    d = e.revPrim ? -d : d;
    if (d) return d;
    d = a.b - b.b;
    return e.revSec ? -d : d;
  });
}
