// Painel misto: uma medida montada com dois gabinetes (ex.: 3,5 m de altura = 3 × 1 m + 1 × 0,5 m).
// Vira um grupo de até 4 painéis comuns (bloco principal, faixa de menores na altura, coluna de menores na largura e
// o canto), então cabeamento, composição e 3D continuam funcionando como sempre. Só contas: testado no Node.
// Escolhas do usuário (PLANO.md): os menores ficam onde o técnico escolher (padrão embaixo e à direita), a mistura
// vale na altura e na largura, e a sugestão prefere menos gabinetes.

var EPS = 1e-6;
function inteiro(v) { return Math.abs(v - Math.round(v)) < 1e-6; }

// todas as formas de fechar a medida L com lados a e b: n·a + m·b = L (n, m ≥ 0)
export function combinacoes(L, a, b) {
  var out = [];
  for (var n = Math.floor(L / a + EPS); n >= 0; n--) {
    var resto = L - n * a;
    if (resto < -EPS) continue;
    if (Math.abs(resto) < EPS) { out.push({ n: n, m: 0 }); continue; }
    var m = resto / b;
    if (inteiro(m)) out.push({ n: n, m: Math.round(m) });
  }
  return out;
}

// O plano: blocos { papel, cab ("a" ou "b"), x, y, w, h } com x e y a partir do canto de baixo à esquerda do painel
// inteiro, e o total de gabinetes. A = gabinete principal, B = complemento ({ mw, mh } em metros).
// posV: "baixo" | "cima" (onde fica a faixa de menores); posH: "dir" | "esq" (onde fica a coluna de menores).
// Entre todas as combinações que fecham, fica a de menos gabinetes (empate: mais gabinetes principais).
export function planoMisto(W, H, A, B, posV, posH) {
  var melhor = null;
  combinacoes(H, A.mh, B.mh).forEach(function (ch) {
    combinacoes(W, A.mw, B.mw).forEach(function (cw) {
      var mainW = cw.n * A.mw, mainH = ch.n * A.mh, colW = cw.m * B.mw, rowH = ch.m * B.mh;
      // a faixa (menores na altura) corre por baixo/cima do bloco principal: a largura dele tem de fechar em B;
      // a coluna (menores na largura) corre ao lado: a altura dele tem de fechar em B
      if (rowH > EPS && mainW > EPS && !inteiro(mainW / B.mw)) return;
      if (colW > EPS && mainH > EPS && !inteiro(mainH / B.mh)) return;
      var nA = cw.n * ch.n;
      var nB = (rowH > EPS ? Math.round(mainW / B.mw) * ch.m : 0) + (colW > EPS ? cw.m * Math.round(mainH / B.mh) : 0) + cw.m * ch.m;
      var total = nA + nB;
      if (!melhor || total < melhor.total || (total === melhor.total && nA > melhor.nA)) melhor = { total: total, nA: nA, nB: nB, ch: ch, cw: cw, mainW: mainW, mainH: mainH, colW: colW, rowH: rowH };
    });
  });
  if (!melhor) return null;
  var p = melhor, cima = posV === "cima", esq = posH === "esq";
  // onde começa cada parte: o bloco principal de um lado, os menores do outro
  var xMain = esq ? p.colW : 0, xCol = esq ? 0 : p.mainW, yMain = cima ? 0 : p.rowH, yRow = cima ? p.mainH : 0;
  var blocos = [];
  function bloco(papel, cab, x, y, w, h) { if (w > EPS && h > EPS) blocos.push({ papel: papel, cab: cab, x: r(x), y: r(y), w: r(w), h: r(h) }); }
  bloco("principal", "a", xMain, yMain, p.mainW, p.mainH);
  bloco("faixa", "b", xMain, yRow, p.mainW, p.rowH);
  bloco("coluna", "b", xCol, yMain, p.colW, p.mainH);
  bloco("canto", "b", xCol, yRow, p.colW, p.rowH);
  return { blocos: blocos, total: p.total, nA: p.nA, nB: p.nB, altura: p.ch, largura: p.cw, w: W, h: H };
}
function r(v) { return Math.round(v * 1000) / 1000; }

// pixel do gabinete por metro (para achar complementos com o mesmo pitch)
function pitch(g) { return [g.mw / g.rx, g.mh / g.ry]; }
export function mesmoPitch(a, b) {
  var pa = pitch(a), pb = pitch(b);
  return Math.abs(pa[0] - pb[0]) <= pa[0] * 0.01 && Math.abs(pa[1] - pb[1]) <= pa[1] * 0.01;
}

// complemento sugerido para o principal A na medida W × H: entre os gabinetes da lista com o mesmo pitch, o que fecha
// a medida com menos gabinetes no total. Devolve { g, plano } ou null.
export function sugerirComplemento(W, H, A, lista, posV, posH) {
  var melhor = null;
  lista.forEach(function (g) {
    if (g === A || g.id === A.id || !mesmoPitch(A, g)) return;
    var p = planoMisto(W, H, A, g, posV, posH);
    if (p && p.nB > 0 && (!melhor || p.total < melhor.plano.total)) melhor = { g: g, plano: p };
  });
  return melhor;
}

// texto do plano, ex.: "Altura: 3 × 1 m + 1 × 0,5 m · Largura: 8 × 0,5 m"
export function descreverEixo(c, a, b) {
  function f(v) { return String(Math.round(v * 1000) / 1000).replace(".", ","); }
  var p = [];
  if (c.n) p.push(c.n + " × " + f(a) + " m");
  if (c.m) p.push(c.m + " × " + f(b) + " m");
  return p.join(" + ");
}
