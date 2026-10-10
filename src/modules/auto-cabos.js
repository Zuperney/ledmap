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

// Cada célula traz duas geometrias:
//   x, y, w, h     = montagem (Rig), em metros, y de cima para baixo: ordem do cabo e vizinhança física;
//   ax, ay, aw, ah = canvas do processador (Screen), em px: área reservada pela porta.

// área (px) do retângulo que envolve as células no canvas: é o que o processador reserva para a porta.
export function areaRet(cells) {
  if (!cells.length) return 0;
  var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  cells.forEach(function (c) { x0 = Math.min(x0, c.ax); y0 = Math.min(y0, c.ay); x1 = Math.max(x1, c.ax + c.aw); y1 = Math.max(y1, c.ay + c.ah); });
  return (x1 - x0) * (y1 - y0);
}

// dois retângulos encostam por um lado (não basta tocar a quina)
function encostam(a, b, eps) {
  var ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return (ox > eps && Math.abs(oy) <= eps) || (oy > eps && Math.abs(ox) <= eps);
}

// gabinetes vizinhos na montagem: o cabo passa de um para o outro sem atravessar o vão
export function vizinhos(a, b) { return encostam(a, b, 0.02); }

// quebra a sequência onde o próximo gabinete não encosta no anterior na montagem
export function trechosFisicos(seq) {
  var out = [], cur = [];
  seq.forEach(function (c) {
    if (cur.length && !vizinhos(cur[cur.length - 1], c)) { out.push(cur); cur = []; }
    cur.push(c);
  });
  if (cur.length) out.push(cur);
  return out;
}

// cabe numa porta? Com overclock, aceita passar do limite se sem a última célula ainda cabia.
export function cabeNaPorta(cells, lim, oc) {
  if (areaRet(cells) <= lim) return true;
  return !!oc && cells.length > 1 && areaRet(cells.slice(0, -1)) < lim;
}

// corta a sequência (já em serpentina) em portas: primeiro onde os gabinetes não se encostam na montagem,
// depois cada trecho em pedaços cujo retângulo no canvas cabe na porta
export function cortarPorArea(seq, lim, oc) {
  return trechosFisicos(seq).reduce(function (acc, t) { return acc.concat(cortarTrecho(t, lim, oc)); }, []);
}

// menor número de portas e tamanhos o mais iguais possível
function cortarTrecho(seq, lim, oc) {
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

// agrupa painéis encostados (mesma Screen e mesmo gabinete) num aglomerado: o bloco pode cruzar a emenda entre eles.
// Precisam encostar na montagem (x, y, w, h em m) e no canvas (k: x, y, w, h em px).
export function aglomerados(telas) {
  var pai = telas.map(function (_, i) { return i; });
  var raiz = function (i) { while (pai[i] !== i) { pai[i] = pai[pai[i]]; i = pai[i]; } return i; };
  telas.forEach(function (a, i) {
    telas.forEach(function (b, j) {
      if (j <= i) return;
      if (encostam(a, b, 0.02) && (!a.k || encostam(a.k, b.k, 1))) pai[raiz(i)] = raiz(j);
    });
  });
  var g = {};
  telas.forEach(function (t, i) { (g[raiz(i)] = g[raiz(i)] || []).push(t); });
  return Object.keys(g).map(function (k) { return g[k]; });
}

// células de um aglomerado -> portas retangulares. Se as telas não casam na grade do gabinete, devolve null (o chamador cai no modo contínuo).
export function portasPorBloco(cells, cw, ch, budget, estrategia, routing, corner) {
  var minX = Infinity, minY = Infinity, maxC = 0, maxR = 0, byPos = {}, tol = Math.min(cw, ch) * 0.05;
  cells.forEach(function (c) { minX = Math.min(minX, c.x); minY = Math.min(minY, c.y); });
  for (var i = 0; i < cells.length; i++) {
    var gc = Math.round((cells[i].x - minX) / cw), gr = Math.round((cells[i].y - minY) / ch);
    if (Math.abs(cells[i].x - minX - gc * cw) > tol || Math.abs(cells[i].y - minY - gr * ch) > tol || byPos[gc + "," + gr]) return null;
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

// ======================================================================================
// Planejador do modo Contínuo (formas livres: recortes, anéis, L, T, escadas, painéis encostados)
// Para cada região de gabinetes ligados testa vários percursos (serpentinas nas 8 combinações de
// sentido e canto, e caminhadas que contornam vãos), corta cada um por área e fica com o melhor:
// menos portas → menos portas pequenas → menos saltos → menos trocas de painel → mais equilíbrio.
// opts: { routing, corner } = preferência do usuário (vence empates); salto = vão máximo (m) que um
//       cabo pode atravessar na mesma linha/coluna (0 = só gabinetes que se encostam).
// ======================================================================================

var EPS = 0.02;

function chaveXY(x, y) { return Math.round(x * 100) + "|" + Math.round(y * 100); }

// vizinhos de cada célula: os que encostam (lado com lado) e, se salto > 0, os alinhados depois de um vão curto
function grafo(cells, salto) {
  var mapa = {}, viz = cells.map(function () { return []; });
  cells.forEach(function (c, i) { mapa[chaveXY(c.x, c.y)] = i; });
  cells.forEach(function (c, i) {
    [[c.w, 0], [-c.w, 0], [0, c.h], [0, -c.h]].forEach(function (d) {
      var j = mapa[chaveXY(c.x + d[0], c.y + d[1])];
      if (j !== undefined) viz[i].push({ j: j, salto: 0 });
    });
  });
  if (salto > EPS) {
    var porLinha = {}, porColuna = {};
    cells.forEach(function (c, i) {
      (porLinha[Math.round(c.y * 100)] = porLinha[Math.round(c.y * 100)] || []).push(i);
      (porColuna[Math.round(c.x * 100)] = porColuna[Math.round(c.x * 100)] || []).push(i);
    });
    var liga = function (lista, eixo, tam) {
      lista.sort(function (a, b) { return cells[a][eixo] - cells[b][eixo]; });
      for (var k = 1; k < lista.length; k++) {
        var a = cells[lista[k - 1]], b = cells[lista[k]], vao = b[eixo] - (a[eixo] + a[tam]);
        if (vao > EPS && vao <= salto + EPS) { viz[lista[k - 1]].push({ j: lista[k], salto: vao }); viz[lista[k]].push({ j: lista[k - 1], salto: vao }); }
      }
    };
    Object.keys(porLinha).forEach(function (k) { liga(porLinha[k], "x", "w"); });
    Object.keys(porColuna).forEach(function (k) { liga(porColuna[k], "y", "h"); });
  }
  return viz;
}

function componentes(cells, viz) {
  var comp = cells.map(function () { return -1; }), out = [];
  cells.forEach(function (_, s) {
    if (comp[s] >= 0) return;
    var fila = [s], lista = [];
    comp[s] = out.length;
    while (fila.length) {
      var i = fila.pop(); lista.push(i);
      viz[i].forEach(function (v) { if (comp[v.j] < 0) { comp[v.j] = out.length; fila.push(v.j); } });
    }
    out.push(lista);
  });
  return out;
}

// caminhada que prefere o vizinho com menos saídas livres (contorna vãos e não deixa ilhas para trás),
// desempatando por seguir reto e depois pelo eixo pedido. Quando trava, recomeça do canto livre mais próximo.
function caminhada(idx, cells, viz, inicio, eixoPref) {
  var livre = {}, n = 0;
  idx.forEach(function (i) { livre[i] = true; n++; });
  var saidas = function (i) { return viz[i].reduce(function (a, v) { return a + (livre[v.j] && !v.salto ? 1 : 0); }, 0); };
  var path = [], cur = inicio, dir = null;
  while (n > 0) {
    if (cur === null) {
      var ult = path.length ? cells[path[path.length - 1]] : null, m = null;
      idx.forEach(function (i) {
        if (!livre[i]) return;
        var s = saidas(i), d = ult ? Math.abs(cells[i].x - ult.x) + Math.abs(cells[i].y - ult.y) : 0;
        if (!m || s < m.s || (s === m.s && d < m.d)) m = { i: i, s: s, d: d };
      });
      cur = m.i; dir = null;
    }
    livre[cur] = false; n--; path.push(cur);
    var c = cells[cur], cand = viz[cur].filter(function (v) { return livre[v.j]; });
    if (!cand.length) { cur = null; continue; }
    cand.sort(function (A, B) {
      if (!!A.salto !== !!B.salto) return A.salto ? 1 : -1;
      var sa = saidas(A.j), sb = saidas(B.j);
      if (sa !== sb) return sa - sb;
      var da = Math.sign(cells[A.j].x - c.x) + "," + Math.sign(cells[A.j].y - c.y), db = Math.sign(cells[B.j].x - c.x) + "," + Math.sign(cells[B.j].y - c.y);
      if (dir && (da === dir) !== (db === dir)) return da === dir ? -1 : 1;
      var ea = cells[A.j][eixoPref] !== c[eixoPref] ? 1 : 0, eb = cells[B.j][eixoPref] !== c[eixoPref] ? 1 : 0;
      return ea - eb;
    });
    var prox = cand[0].j;
    dir = Math.sign(cells[prox].x - c.x) + "," + Math.sign(cells[prox].y - c.y);
    cur = prox;
  }
  return path;
}

// quebra um percurso onde dois gabinetes seguidos não são vizinhos (nem por salto permitido)
function trechosPorGrafo(path, viz) {
  var out = [], cur = [];
  path.forEach(function (i) {
    if (cur.length && !viz[cur[cur.length - 1]].some(function (v) { return v.j === i; })) { out.push(cur); cur = []; }
    cur.push(i);
  });
  if (cur.length) out.push(cur);
  return out;
}

export function limitePequena(cap) { return Math.max(2, Math.min(4, Math.floor(cap / 4))); }

function avaliar(chunks, cap, cells, viz) {
  var pequenas = 0, saltos = 0, trocas = 0, tam = chunks.map(function (c) { return c.length; });
  var media = tam.reduce(function (a, b) { return a + b; }, 0) / Math.max(1, chunks.length), desvio = 0;
  chunks.forEach(function (ch) {
    if (ch.length < limitePequena(cap)) pequenas++;
    for (var k = 1; k < ch.length; k++) {
      var v = viz[ch[k - 1]].filter(function (x) { return x.j === ch[k]; })[0];
      if (v && v.salto) saltos++;
      if (cells[ch[k]].t && cells[ch[k - 1]].t && cells[ch[k]].t.id !== cells[ch[k - 1]].t.id) trocas++;
    }
    desvio += Math.abs(ch.length - media);
  });
  return [chunks.length, pequenas, saltos, trocas, desvio];
}

function antes(a, b) { for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i]; return false; }

// caminho que passa por todas as células do conjunto, uma vez cada (busca em profundidade com Warnsdorff
// e orçamento de passos). null se não achar: o chamador usa a caminhada, que aceita recomeços.
function caminhoCompleto(idx, cells, viz) {
  var dentro = {}, n = idx.length;
  idx.forEach(function (i) { dentro[i] = true; });
  var deg = function (i, usado) { return viz[i].reduce(function (a, v) { return a + (dentro[v.j] && !v.salto && !usado[v.j] ? 1 : 0); }, 0); };
  var inicios = idx.slice().sort(function (a, b) { return deg(a, {}) - deg(b, {}); }).slice(0, 4), orc;
  function dfs(cur, usado, path) {
    if (path.length === n) return path;
    if (--orc < 0) return null;
    var cand = viz[cur].filter(function (v) { return dentro[v.j] && !v.salto && !usado[v.j]; }).map(function (v) { return v.j; });
    cand.sort(function (a, b) { return deg(a, usado) - deg(b, usado); });
    for (var k = 0; k < cand.length; k++) {
      usado[cand[k]] = true; path.push(cand[k]);
      var r = dfs(cand[k], usado, path);
      if (r) return r;
      usado[cand[k]] = false; path.pop();
    }
    return null;
  }
  for (var s = 0; s < inicios.length; s++) {
    orc = 4000;
    var u = {}; u[inicios[s]] = true;
    var r = dfs(inicios[s], u, [inicios[s]]);
    if (r) return r;
  }
  return null;
}

// divide a região em faixas de colunas (eixo "x") ou de linhas ("y") cujo retângulo cabe na porta.
// equil = faixas de tamanhos parecidos; senão, cada faixa pega o máximo que cabe.
function faixasLivres(idx, cells, viz, lim, oc, eixo, equil) {
  var lanes = {}, keys;
  idx.forEach(function (i) { var k = Math.round(cells[i][eixo] * 100); (lanes[k] = lanes[k] || []).push(i); });
  keys = Object.keys(lanes).map(Number).sort(function (a, b) { return a - b; });
  var cabe = function (a, b) { var cs = []; for (var k = a; k <= b; k++) lanes[keys[k]].forEach(function (i) { cs.push(cells[i]); }); return areaRet(cs) <= lim; };
  var cortes = [], a = 0;
  while (a < keys.length) { var b = a; while (b + 1 < keys.length && cabe(a, b + 1)) b++; cortes.push([a, b]); a = b + 1; }
  if (equil && cortes.length > 1) {
    // mesmo número de faixas, larguras repartidas por igual, se todas couberem
    var n = cortes.length, base = Math.floor(keys.length / n), extra = keys.length - base * n, eq = [], p = 0;
    for (var f = 0; f < n; f++) { var w = base + (f < extra ? 1 : 0); eq.push([p, p + w - 1]); p += w; }
    if (eq.every(function (c) { return cabe(c[0], c[1]); })) cortes = eq;
  }
  var chunks = [];
  cortes.forEach(function (c) {
    var faixa = [];
    for (var k = c[0]; k <= c[1]; k++) faixa = faixa.concat(lanes[keys[k]]);
    // dentro da faixa, cada pedaço ligado vira uma porta (ou mais, se o caminho precisar recomeçar)
    var dentro = {}; faixa.forEach(function (i) { dentro[i] = true; });
    var sub = faixa.map(function (i) { return cells[i]; }), vizF = faixa.map(function (i) { return viz[i].filter(function (v) { return dentro[v.j]; }); });
    var mapa = {}; faixa.forEach(function (i, k) { mapa[i] = k; });
    var vizL = vizF.map(function (l) { return l.map(function (v) { return { j: mapa[v.j], salto: v.salto }; }); });
    componentes(sub, vizL).forEach(function (comp) {
      var glob = comp.map(function (k) { return faixa[k]; });
      var path = caminhoCompleto(glob, cells, viz) || caminhada(glob, cells, viz, glob[0], eixo === "x" ? "y" : "x");
      trechosPorGrafo(path, viz).forEach(function (tr) {
        var volta = new Map(tr.map(function (i) { return [cells[i], i]; }));
        cortarTrecho(tr.map(function (i) { return cells[i]; }), lim, oc).forEach(function (ch) { chunks.push(ch.map(function (cc) { return volta.get(cc); })); });
      });
    });
  });
  return chunks;
}

// com overclock o corte pode passar um gabinete do limite; mas um plano sem overclock às vezes sai
// melhor (cortes mais limpos). Testa os dois e fica com o de menos portas; overclock nunca piora.
export function planejar(cells, lim, oc, opts) {
  if (!oc) return planejarCom(cells, lim, false, opts);
  var a = planejarCom(cells, lim, true, opts), b = planejarCom(cells, lim, false, opts);
  return b.length < a.length ? b : a;
}

function planejarCom(cells, lim, oc, opts) {
  opts = opts || {};
  if (!cells.length) return [];
  var viz = grafo(cells, Number(opts.salto) || 0), cap = Math.max(1, Math.floor(lim / (cells[0].aw * cells[0].ah)));
  var resultado = [];
  componentes(cells, viz).forEach(function (idx) {
    var sub = idx.map(function (i) { return cells[i]; }), pos = new Map();
    sub.forEach(function (c, k) { pos.set(c, idx[k]); });
    var candidatos = [];
    // 1) serpentinas: a preferência do usuário primeiro (vence empate), depois as outras 7
    var c0 = opts.corner || "bl", r0 = opts.routing || "updown";
    [r0, r0 === "zigzag" ? "updown" : "zigzag"].forEach(function (ro) {
      [c0].concat(["bl", "br", "tl", "tr"].filter(function (k) { return k !== c0; })).forEach(function (co) {
        candidatos.push(snakePorTela(sub, ro, co).map(function (c) { return pos.get(c); }));
      });
    });
    // 2) caminhadas a partir dos cantos da região e das pontas (células com 1 vizinho)
    var inicios = {}, x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    idx.forEach(function (i) { var c = cells[i]; x0 = Math.min(x0, c.x); x1 = Math.max(x1, c.x); y0 = Math.min(y0, c.y); y1 = Math.max(y1, c.y); });
    [[x0, y1], [x1, y1], [x0, y0], [x1, y0]].forEach(function (p) {
      var m = null;
      idx.forEach(function (i) { var d = Math.abs(cells[i].x - p[0]) + Math.abs(cells[i].y - p[1]); if (!m || d < m.d) m = { i: i, d: d }; });
      inicios[m.i] = 1;
    });
    idx.filter(function (i) { return viz[i].filter(function (v) { return !v.salto; }).length <= 1; }).slice(0, 6).forEach(function (i) { inicios[i] = 1; });
    Object.keys(inicios).forEach(function (s) { ["x", "y"].forEach(function (e) { candidatos.push(caminhada(idx, cells, viz, Number(s), e)); }); });
    var best = null;
    var considerar = function (chunks) {
      var nota = avaliar(chunks, cap, cells, viz);
      if (!best || antes(nota, best.nota)) best = { nota: nota, chunks: chunks };
    };
    var cortarCaminho = function (path) {
      var chunks = [];
      trechosPorGrafo(path, viz).forEach(function (tr) {
        cortarTrecho(tr.map(function (i) { return cells[i]; }), lim, oc).forEach(function (ch) { chunks.push(ch.map(function (c) { return pos.get(c); })); });
      });
      return chunks;
    };
    candidatos.forEach(function (path) {
      considerar(cortarCaminho(path));
      // percurso fechado (a ponta encosta no começo): o ponto de partida decide onde caem os cortes; testa vários
      var L = path.length;
      if (L > 3 && viz[path[L - 1]].some(function (v) { return v.j === path[0] && !v.salto; })) {
        var passo = Math.max(1, Math.floor(L / 48));
        for (var s = passo; s < L; s += passo) considerar(cortarCaminho(path.slice(s).concat(path.slice(0, s))));
      }
    });
    // 3) faixas de colunas (ou linhas) que cabem na porta, com um caminho contínuo dentro de cada uma
    ["x", "y"].forEach(function (eixo) { [false, true].forEach(function (equil) { considerar(faixasLivres(idx, cells, viz, lim, oc, eixo, equil)); }); });
    best.chunks.forEach(function (ch) { resultado.push(ch.map(function (i) { return cells[i]; })); });
  });
  return resultado;
}

// diagnóstico de uma rota pronta: saltos (gabinetes seguidos que não se encostam) e se é pequena
export function diagnostico(cellsRota, cap) {
  var saltos = 0;
  for (var k = 1; k < cellsRota.length; k++) if (!encostam(cellsRota[k - 1], cellsRota[k], EPS)) saltos++;
  return { saltos: saltos, pequena: cellsRota.length > 0 && cellsRota.length < limitePequena(cap) };
}
