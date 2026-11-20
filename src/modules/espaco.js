// Espaço do palco: giro dos painéis e as 5 vistas ortogonais (Frente, Atrás, Esquerda, Direita, Topo).
// Só contas, sem DOM nem three.js: é usado pelo Rig, pelo cabeamento, pela composição e pelo 3D, e testado no Node.
//
// Palco em metros: X para a direita (0 = centro), Y para cima (0 = chão), Z para o público (a frente fica no Z = 0;
// recuo positivo vai para trás, Z negativo). Um painel sem giro é o retângulo mx..mx+w × my..my+h no Z = −recuo,
// virado para o público. O giro acontece em volta do pivô, nos eixos do palco: primeiro Z (gira no próprio plano),
// depois X (inclina para frente/trás), por fim Y (abre como lateral em V ou L) — R = Ry · Rx · Rz, a ordem "YXZ" do three.js.
// Eixos fixos do palco, e não os da peça: no LLC, girar pelo eixo da junta fazia a mesma tecla dar resultados diferentes.
//
// Regras de transformação (PLANO.md): árvore Palco → Grupo → Painel. Toda peça tem pin, posição e giro; girar não move
// o pin, trocar o pin não move a peça, mudar a medida cresce a partir do pin. Um painel dentro de um grupo guarda os
// valores relativos ao grupo (o grupo tem pin próprio gx, gy, recuo gz e giro rx, ry, rz); onde ele fica no palco é
// sempre calculado aqui: Palco × Grupo × Painel. mx/my são o canto do painel sem giro no espaço do pai (o "quadro"
// dele): o pin sai de mx/my + a fração do pivô, e é o pin que o cartão mostra e edita.

export var PROF = 0.09; // espessura desenhada do gabinete (m), a mesma do 3D

// pivô: onde o painel gira (fração da largura a partir da esquerda, fração da altura a partir de baixo)
export var PIVOS = {
  tl: [0, 1, "Canto de cima, à esquerda"], t: [0.5, 1, "Meio da borda de cima"], tr: [1, 1, "Canto de cima, à direita"],
  l: [0, 0.5, "Meio da borda esquerda"], c: [0.5, 0.5, "Centro"], r: [1, 0.5, "Meio da borda direita"],
  bl: [0, 0, "Canto de baixo, à esquerda"], b: [0.5, 0, "Meio da borda de baixo"], br: [1, 0, "Canto de baixo, à direita"]
};
export function limpaPivo(p) { return Object.prototype.hasOwnProperty.call(PIVOS, p) ? p : "b"; } // padrão: meio da borda de baixo

// ângulo em graus, entre −180 e 180, com centésimos de grau (guardado assim para não acumular erro de arredondamento)
export function limpaGiro(v) {
  v = Number(v);
  if (!isFinite(v)) return 0;
  v = Math.round((((v + 180) % 360 + 360) % 360 - 180) * 100) / 100;
  return v === -180 ? 180 : v === 0 ? 0 : v; // −0 vira 0
}

export function temGiro(t) { return !!(t.rx || t.ry || t.rz); } // giro próprio (relativo ao pai)

// ---- o pai (grupo) de uma peça: { O: pin do grupo no palco (Z para o público), M: giro do grupo } ou null ----
// Quem sabe dos grupos é o core: ele registra aqui como achar o pai. Os testes registram o deles.
var paiDe = function () { return null; };
export function definirPai(fn) { paiDe = typeof fn === "function" ? fn : function () { return null; }; }
export function pai(t) { return t && t.pn ? paiDe(t) : null; }
// o grupo como pai: pin (gx, gy, recuo gz) e giro
export function paiDeGrupo(g) { return { O: [g.gx || 0, g.gy || 0, -(g.gz || 0)], M: matriz({ rx: g.rx, ry: g.ry, rz: g.rz }) }; }

var RAD = Math.PI / 180;
function mul(A, B) {
  var C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) C[i][j] = A[i][0] * B[0][j] + A[i][1] * B[1][j] + A[i][2] * B[2][j];
  return C;
}
function limpo(v) { return Math.abs(v) < 1e-12 ? 0 : v; } // 90° exatos dão 0, não 6e-17

// matriz de giro própria (3 × 3, linhas), no espaço do pai
export function matrizLocal(t) {
  var x = (t.rx || 0) * RAD, y = (t.ry || 0) * RAD, z = (t.rz || 0) * RAD;
  var cx = Math.cos(x), sx = Math.sin(x), cy = Math.cos(y), sy = Math.sin(y), cz = Math.cos(z), sz = Math.sin(z);
  var M = mul(mul([[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]], [[1, 0, 0], [0, cx, -sx], [0, sx, cx]]), [[cz, -sz, 0], [sz, cz, 0], [0, 0, 1]]);
  return M.map(function (l) { return l.map(limpo); });
}
// giro no palco: o do pai vezes o próprio
export function matriz(t) {
  var M = matrizLocal(t), p = pai(t);
  return p ? mul(p.M, M).map(function (l) { return l.map(limpo); }) : M;
}
var IDENT = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
// girado no palco (pelo giro próprio ou pelo do grupo)
export function girado(t) { var M = matriz(t); return !IDENT.every(function (l, i) { return l.every(function (v, j) { return Math.abs(M[i][j] - v) < 1e-9; }); }); }
export function aplicar(M, v) { return [M[0][0] * v[0] + M[0][1] * v[1] + M[0][2] * v[2], M[1][0] * v[0] + M[1][1] * v[1] + M[1][2] * v[2], M[2][0] * v[0] + M[2][1] * v[1] + M[2][2] * v[2]]; }
function aplicarT(M, v) { return [M[0][0] * v[0] + M[1][0] * v[1] + M[2][0] * v[2], M[0][1] * v[0] + M[1][1] * v[1] + M[2][1] * v[2], M[0][2] * v[0] + M[1][2] * v[1] + M[2][2] * v[2]]; }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }

// pin no espaço do pai (no quadro do painel: mx/my + fração do pivô, na face da frente)
export function pivoLocal(t) {
  var f = PIVOS[limpaPivo(t.pv)];
  return [t.mx + t.w * f[0], t.my + t.h * f[1], -(t.z || 0)];
}
// pin no palco (ele não se mexe quando o painel gira)
export function pivo(t) {
  var L = pivoLocal(t), p = pai(t);
  if (!p) return L;
  var d = aplicar(p.M, L);
  return [p.O[0] + d[0], p.O[1] + d[1], p.O[2] + d[2]];
}

// um ponto do painel sem giro (no quadro dele: mx..mx+w, my..my+h, Z = −recuo) → onde ele fica no palco.
// M (opcional) é o giro no palco, matriz(t).
export function noMundo(t, p, M) {
  M = M || matriz(t);
  var L = pivoLocal(t), P = pivo(t), d = aplicar(M, [p[0] - L[0], p[1] - L[1], p[2] - L[2]]);
  return [P[0] + d[0], P[1] + d[1], P[2] + d[2]];
}
// o mesmo sem o pai: onde o ponto fica no espaço do grupo
export function noPai(t, p) {
  var M = matrizLocal(t), L = pivoLocal(t), d = aplicar(M, [p[0] - L[0], p[1] - L[1], p[2] - L[2]]);
  return [L[0] + d[0], L[1] + d[1], L[2] + d[2]];
}

// para onde a frente do painel aponta
export function normal(t) { return aplicar(matriz(t), [0, 0, 1]); }

// ---- as 4 vistas: u = direita na tela, v = cima na tela, w = na direção de quem olha (a câmera fica em +w) ----
// "eixo" é o giro que se ajusta nessa vista (o que gira no plano da tela) e "sinal" converte o giro anti-horário na tela
export var VISTAS = {
  frente: { nome: "Frente", u: [1, 0, 0], v: [0, 1, 0], w: [0, 0, 1], eixo: "rz", sinal: 1, h: "X", vt: "altura" },
  // de trás (do fundo para o público): o X fica espelhado na tela, como num programa 3D (+ à esquerda)
  tras: { nome: "Atrás", u: [-1, 0, 0], v: [0, 1, 0], w: [0, 0, -1], eixo: "rz", sinal: -1, h: "X", vt: "altura" },
  topo: { nome: "Topo", u: [1, 0, 0], v: [0, 0, -1], w: [0, 1, 0], eixo: "ry", sinal: 1, h: "X", vt: "profundidade" },
  esq: { nome: "Esquerda", u: [0, 0, 1], v: [0, 1, 0], w: [-1, 0, 0], eixo: "rx", sinal: -1, h: "Z", vt: "altura" },
  dir: { nome: "Direita", u: [0, 0, -1], v: [0, 1, 0], w: [1, 0, 0], eixo: "rx", sinal: 1, h: "Z", vt: "altura" }
};
export var ORDEM_VISTAS = ["frente", "tras", "esq", "dir", "topo"];

// valor no eixo do palco que a régua da vista mostra em cada direção da tela: X, altura (Y) ou recuo (Z, positivo
// para trás). Ex.: na Atrás, 2 m para a direita da tela é X = −2; na Esquerda, para a direita é o público (recuo −).
export function eixosDaVista(vista) {
  var V = VISTAS[vista];
  function eixo(d) {
    if (d[0]) return { nome: "X", k: d[0] };
    if (d[1]) return { nome: "Y", k: d[1] };
    return { nome: "Z", k: -d[2] }; // recuo = −Z
  }
  return { h: eixo(V.u), v: eixo(V.v) };
}
export function limpaVista(v) { return Object.prototype.hasOwnProperty.call(VISTAS, v) ? v : "frente"; }

// ponto do palco → (U, V) na vista, V para cima
export function projetar(vista, p) { var V = VISTAS[vista]; return [dot(V.u, p), dot(V.v, p)]; }
// deslocamento na vista (U, V) → deslocamento no palco
export function desprojetar(vista, du, dv) { var V = VISTAS[vista]; return [V.u[0] * du + V.v[0] * dv, V.u[1] * du + V.v[1] * dv, V.u[2] * du + V.v[2] * dv]; }

// A frente do painel desenhada na vista é uma transformação afim do retângulo do painel (x para a direita a partir da
// esquerda, y para baixo a partir de cima — o mesmo do desenho do Rig). Devolve a matrix(a b c d e f) do SVG, com y da
// tela = chao − V. Sem giro, na Frente, é o translate(mx, chao − my − h) de antes.
export function afim(t, vista, chao) {
  var M = matriz(t), V = VISTAS[vista];
  var o = noMundo(t, [t.mx, t.my + t.h, -(t.z || 0)], M), ex = aplicar(M, [1, 0, 0]), ey = aplicar(M, [0, -1, 0]);
  return [dot(V.u, ex), -dot(V.v, ex), dot(V.u, ey), -dot(V.v, ey), dot(V.u, o), chao - dot(V.v, o)];
}

// os 8 cantos da caixa do painel (frente e fundo, PROF de espessura), no palco
export function cantos(t, M) {
  M = M || matriz(t);
  var z0 = -(t.z || 0), out = [];
  [t.mx, t.mx + t.w].forEach(function (x) { [t.my, t.my + t.h].forEach(function (y) { [z0, z0 - PROF].forEach(function (z) { out.push(noMundo(t, [x, y, z], M)); }); }); });
  return out;
}

// onde a frente do painel fica no palco, com o giro: X (esquerda → direita), altura e recuo (positivo = para trás),
// de onde começa até onde termina. É o que o cartão e o CSV mostram em "No palco".
export function extensao(t) {
  var M = matriz(t), z = -(t.z || 0), e = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity, r0: Infinity, r1: -Infinity };
  [[t.mx, t.my], [t.mx + t.w, t.my], [t.mx, t.my + t.h], [t.mx + t.w, t.my + t.h]].forEach(function (c) {
    var p = noMundo(t, [c[0], c[1], z], M);
    e.x0 = Math.min(e.x0, p[0]); e.x1 = Math.max(e.x1, p[0]);
    e.y0 = Math.min(e.y0, p[1]); e.y1 = Math.max(e.y1, p[1]);
    e.r0 = Math.min(e.r0, -p[2]); e.r1 = Math.max(e.r1, -p[2]);
  });
  Object.keys(e).forEach(function (k) { e[k] = Math.round(e[k] * 1000) / 1000 || 0; });
  return e;
}

// contorno do painel na vista (casco convexo da caixa projetada), em (U, V)
export function casco(t, vista) {
  var p = cantos(t).map(function (c) { return projetar(vista, c); }).sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
  function cruz(o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); }
  var baixo = [], cima = [];
  p.forEach(function (q) { while (baixo.length >= 2 && cruz(baixo[baixo.length - 2], baixo[baixo.length - 1], q) <= 1e-12) baixo.pop(); baixo.push(q); });
  p.slice().reverse().forEach(function (q) { while (cima.length >= 2 && cruz(cima[cima.length - 2], cima[cima.length - 1], q) <= 1e-12) cima.pop(); cima.push(q); });
  return baixo.slice(0, -1).concat(cima.slice(0, -1));
}

// retângulo que envolve o painel na vista: u0..u1 × v0..v1 (V para cima)
export function caixa(t, vista) {
  var u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
  cantos(t).forEach(function (c) { var p = projetar(vista, c); u0 = Math.min(u0, p[0]); u1 = Math.max(u1, p[0]); v0 = Math.min(v0, p[1]); v1 = Math.max(v1, p[1]); });
  return { u0: u0, u1: u1, v0: v0, v1: v1 };
}
export function caixaDe(lista, vista) {
  var b = { u0: Infinity, u1: -Infinity, v0: Infinity, v1: -Infinity };
  lista.forEach(function (t) { var c = caixa(t, vista); b.u0 = Math.min(b.u0, c.u0); b.u1 = Math.max(b.u1, c.u1); b.v0 = Math.min(b.v0, c.v0); b.v1 = Math.max(b.v1, c.v1); });
  return b;
}

// distância até quem olha (maior = mais perto): desenhar do menor para o maior
export function profundidadeNaVista(t, vista) {
  return dot(VISTAS[vista].w, noMundo(t, [t.mx + t.w / 2, t.my + t.h / 2, -(t.z || 0)]));
}
// quanto a frente do painel encara a vista: 1 de frente, 0 de lado (só a borda), −1 de costas
export function encara(t, vista) { return dot(VISTAS[vista].w, normal(t)); }

// ---- planos (para o cabeamento e a composição) ----
// Painéis com o mesmo giro ficam em planos paralelos: girando o palco ao contrário, eles voltam a ser retângulos de
// frente, como os painéis sem giro. No quadro do plano, a posição é a do painel sem giro mais um deslocamento
// (R⁻¹·P − P, P = pivô); sem giro o deslocamento é zero e tudo fica como antes.
// a chave é o giro no palco (painéis de grupos com o mesmo giro final caem no mesmo plano)
export function chaveGiro(t) {
  if (!girado(t)) return "0|0|0";
  return matriz(t).map(function (l) { return l.map(function (v) { return Math.round(v * 1e5) / 1e5 || 0; }).join(","); }).join(";");
}
// deslocamento do quadro do plano: Mᵀ·P (pin no palco girado de volta) − pin no quadro do painel.
// Sem giro e sem grupo é zero; num grupo sem giro é o pin do grupo.
export function deslocQuadro(t) {
  var P = pivo(t), L = pivoLocal(t), q = aplicarT(matriz(t), P);
  return [limpo(q[0] - L[0]), limpo(q[1] - L[1]), limpo(q[2] - L[2])];
}

// ---- matriz ↔ ângulos ----
// matriz → ângulos (graus) na mesma ordem YXZ: M = Ry·Rx·Rz → M[1][2] = −sen x, M[0][2]/M[2][2] = tg y, M[1][0]/M[1][1] = tg z
export function deMatriz(M) {
  var sx = Math.max(-1, Math.min(1, -M[1][2])), x = Math.asin(sx), y, z;
  if (Math.abs(sx) < 0.999999) { y = Math.atan2(M[0][2], M[2][2]); z = Math.atan2(M[1][0], M[1][1]); }
  else { y = Math.atan2(-M[2][0], M[0][0]); z = 0; } // inclinado a ±90°: Y e Z giram no mesmo eixo, fica tudo no Y
  return { rx: limpaGiro(x / RAD), ry: limpaGiro(y / RAD), rz: limpaGiro(z / RAD) };
}
export function matrizDe(rx, ry, rz) { return matriz({ rx: rx, ry: ry, rz: rz }); }
export function transposta(M) { return [[M[0][0], M[1][0], M[2][0]], [M[0][1], M[1][1], M[2][1]], [M[0][2], M[1][2], M[2][2]]]; }
export function multiplicar(A, B) { return mul(A, B).map(function (l) { return l.map(limpo); }); }
// giro em volta de um eixo do palco (vetor unitário), em graus
export function matrizEixo(eixo, graus) {
  var a = graus * RAD, c = Math.cos(a), s = Math.sin(a), t = 1 - c, x = eixo[0], y = eixo[1], z = eixo[2];
  return [[t * x * x + c, t * x * y - s * z, t * x * z + s * y], [t * x * y + s * z, t * y * y + c, t * y * z - s * x], [t * x * z - s * y, t * y * z + s * x, t * z * z + c]].map(function (l) { return l.map(limpo); });
}

// ---- pin e medida (sempre no espaço do pai: o pai não muda nada aqui) ----
// trocar o pivô sem o painel sair do lugar: devolve o mx, my e recuo novos
export function trocarPivo(t, pv) {
  var M = matrizLocal(t), P = pivoLocal(t), P2 = pivoLocal({ mx: t.mx, my: t.my, w: t.w, h: t.h, z: t.z, pv: pv });
  var d = [P[0] - P2[0], P[1] - P2[1], P[2] - P2[2]], Rd = aplicar(M, d);
  return { mx: t.mx + d[0] - Rd[0], my: t.my + d[1] - Rd[1], z: (t.z || 0) - (d[2] - Rd[2]) };
}
// mudar largura ou altura a partir do pin: o pin fica onde está (mx/my novos para a medida w × h)
export function medidaNoPin(t, w, h) {
  var f = PIVOS[limpaPivo(t.pv)];
  return { mx: t.mx + (t.w - w) * f[0], my: t.my + (t.h - h) * f[1] };
}
// pôr o pin num ponto do espaço do pai: mx/my do quadro para o pin em (x, y)
export function cantoDoPin(t, x, y) {
  var f = PIVOS[limpaPivo(t.pv)];
  return { mx: x - t.w * f[0], my: y - t.h * f[1] };
}

// ---- grupos ----
// valores de um painel no palco (sem o pai): o que ele vira ao sair do grupo. Nada se move.
export function noPalco(t) {
  if (!pai(t)) return { mx: t.mx, my: t.my, z: t.z || 0, rx: t.rx || 0, ry: t.ry || 0, rz: t.rz || 0 };
  var g = deMatriz(matriz(t)), P = pivo(t), c = cantoDoPin(t, P[0], P[1]);
  return { mx: c.mx, my: c.my, z: -P[2] || 0, rx: g.rx, ry: g.ry, rz: g.rz };
}
// o contrário: pin P e giro Mw no palco → valores relativos ao pai p ({ O, M }; sem pai, no palco)
export function noEspacoDe(p, t, P, Mw) {
  var Mt = p ? transposta(p.M) : IDENT, L = p ? aplicar(Mt, [P[0] - p.O[0], P[1] - p.O[1], P[2] - p.O[2]]) : P;
  var g = deMatriz(mul(Mt, Mw)), c = cantoDoPin(t, L[0], L[1]);
  return { mx: c.mx, my: c.my, z: -L[2] || 0, rx: g.rx, ry: g.ry, rz: g.rz };
}
// caixa de painéis no espaço do pai deles (os cantos da face da frente): lo e hi nos 3 eixos, e as medidas
export function caixaNoGrupo(lista) {
  var lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  lista.forEach(function (t) {
    var z = -(t.z || 0);
    [[t.mx, t.my], [t.mx + t.w, t.my], [t.mx, t.my + t.h], [t.mx + t.w, t.my + t.h]].forEach(function (c) {
      var q = noPai(t, [c[0], c[1], z]);
      for (var k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], q[k]); hi[k] = Math.max(hi[k], q[k]); }
    });
  });
  return { lo: lo, hi: hi, w: hi[0] - lo[0], h: hi[1] - lo[1], d: hi[2] - lo[2] };
}
// ponto da caixa pelo pivô (fração da largura e da altura), na face da frente (o Z mais perto do público)
export function pontoCaixa(cx, pv) {
  var f = PIVOS[limpaPivo(pv)];
  return [cx.lo[0] + cx.w * f[0], cx.lo[1] + cx.h * f[1], cx.hi[2]];
}
// agrupar painéis soltos (valores no palco): grupo sem giro com o pin no ponto pv da caixa deles; os membros passam
// a valores relativos ao pin. Nada se move.
export function agrupar(lista, pv) {
  var O = pontoCaixa(caixaNoGrupo(lista), pv);
  return { gx: O[0], gy: O[1], gz: -O[2] || 0, rx: 0, ry: 0, rz: 0, pv: limpaPivo(pv),
    membros: lista.map(function (t) { return { mx: t.mx - O[0], my: t.my - O[1], z: (t.z || 0) + O[2] }; }) };
}
// trocar o pin do grupo (outro ponto da caixa dos membros) sem nada sair do lugar
export function trocarPinGrupo(g, lista, pv) {
  var q = pontoCaixa(caixaNoGrupo(lista), pv), d = aplicar(paiDeGrupo(g).M, q);
  return { gx: (g.gx || 0) + d[0], gy: (g.gy || 0) + d[1], gz: (g.gz || 0) - d[2], pv: limpaPivo(pv),
    membros: lista.map(function (t) { return { mx: t.mx - q[0], my: t.my - q[1], z: (t.z || 0) + q[2] }; }) };
}
// grupo de projeto antigo: o giro do grupo estava "derretido" nos membros (valores no palco) e o grupo só guardava
// o giro. Passa a ter pin (meio de baixo da caixa no quadro do grupo) e membros relativos. Nada se move.
export function migrarGrupoAntigo(g, lista) {
  var Mg = matrizDe(g.rx || 0, g.ry || 0, g.rz || 0), Mt = transposta(Mg), lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  lista.forEach(function (t) {
    var z = -(t.z || 0);
    [[t.mx, t.my], [t.mx + t.w, t.my], [t.mx, t.my + t.h], [t.mx + t.w, t.my + t.h]].forEach(function (c) {
      var q = aplicar(Mt, noPai(t, [c[0], c[1], z]));
      for (var k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], q[k]); hi[k] = Math.max(hi[k], q[k]); }
    });
  });
  var Q = [(lo[0] + hi[0]) / 2, lo[1], hi[2]], O = aplicar(Mg, Q), p = { O: O, M: Mg };
  return { gx: O[0], gy: O[1], gz: -O[2] || 0, pv: "b",
    membros: lista.map(function (t) { return noEspacoDe(p, t, pivoLocal(t), matrizLocal(t)); }) };
}

// ---- projetos antigos: as vistas de montagem (paredes, fundo, teto, piso) viram giro por painel ----
// Cada vista era um plano posto no palco (origem ox, oy, oz) e girado em 90°; o painel guardava a posição dentro dele.
// O painel passa a ter o giro da vista e pivô no centro, com o centro no mesmo lugar do palco.
var GIRO_VISTA = { frente: [0, 0, 0], esq: [0, 90, 0], dir: [0, -90, 0], tras: [0, 180, 0], teto: [90, 0, 0], piso: [-90, 0, 0] };
export function deVistaAntiga(t, vistaAntiga) {
  var g = GIRO_VISTA[vistaAntiga.ori] || [0, 0, 0], n = { rx: g[0], ry: g[1], rz: g[2] };
  var c = aplicar(matriz(n), [t.mx + t.w / 2, t.my + t.h / 2, -(t.z || 0)]);
  var C = [(vistaAntiga.ox || 0) + c[0], (vistaAntiga.oy || 0) + c[1], (vistaAntiga.oz || 0) + c[2]];
  return { mx: C[0] - t.w / 2, my: C[1] - t.h / 2, z: -C[2], rx: n.rx, ry: n.ry, rz: n.rz, pv: "c" };
}
