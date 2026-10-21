// Espaço do palco: giro dos painéis e as 4 vistas ortogonais (Frente, Topo, Esquerda, Direita).
// Só contas, sem DOM nem three.js: é usado pelo Rig, pelo cabeamento, pela composição e pelo 3D, e testado no Node.
//
// Palco em metros: X para a direita (0 = centro), Y para cima (0 = chão), Z para o público (a frente fica no Z = 0;
// recuo positivo vai para trás, Z negativo). Um painel sem giro é o retângulo mx..mx+w × my..my+h no Z = −recuo,
// virado para o público. O giro acontece em volta do pivô, nos eixos do palco: primeiro Z (gira no próprio plano),
// depois X (inclina para frente/trás), por fim Y (abre como lateral em V ou L) — R = Ry · Rx · Rz, a ordem "YXZ" do three.js.
// Eixos fixos do palco, e não os da peça: no LLC, girar pelo eixo da junta fazia a mesma tecla dar resultados diferentes.

export var PROF = 0.09; // espessura desenhada do gabinete (m), a mesma do 3D

// pivô: onde o painel gira (fração da largura a partir da esquerda, fração da altura a partir de baixo)
export var PIVOS = {
  tl: [0, 1, "Canto de cima, à esquerda"], t: [0.5, 1, "Meio da borda de cima"], tr: [1, 1, "Canto de cima, à direita"],
  l: [0, 0.5, "Meio da borda esquerda"], c: [0.5, 0.5, "Centro"], r: [1, 0.5, "Meio da borda direita"],
  bl: [0, 0, "Canto de baixo, à esquerda"], b: [0.5, 0, "Meio da borda de baixo"], br: [1, 0, "Canto de baixo, à direita"]
};
export function limpaPivo(p) { return Object.prototype.hasOwnProperty.call(PIVOS, p) ? p : "c"; }

// ângulo em graus, entre −180 e 180, com um décimo de grau (guardado assim para não acumular erro de arredondamento)
export function limpaGiro(v) {
  v = Number(v);
  if (!isFinite(v)) return 0;
  v = Math.round((((v + 180) % 360 + 360) % 360 - 180) * 10) / 10;
  return v === -180 ? 180 : v === 0 ? 0 : v; // −0 vira 0
}

export function temGiro(t) { return !!(t.rx || t.ry || t.rz); }

var RAD = Math.PI / 180;
function mul(A, B) {
  var C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) C[i][j] = A[i][0] * B[0][j] + A[i][1] * B[1][j] + A[i][2] * B[2][j];
  return C;
}
function limpo(v) { return Math.abs(v) < 1e-12 ? 0 : v; } // 90° exatos dão 0, não 6e-17

// matriz de giro do painel (3 × 3, linhas)
export function matriz(t) {
  var x = (t.rx || 0) * RAD, y = (t.ry || 0) * RAD, z = (t.rz || 0) * RAD;
  var cx = Math.cos(x), sx = Math.sin(x), cy = Math.cos(y), sy = Math.sin(y), cz = Math.cos(z), sz = Math.sin(z);
  var M = mul(mul([[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]], [[1, 0, 0], [0, cx, -sx], [0, sx, cx]]), [[cz, -sz, 0], [sz, cz, 0], [0, 0, 1]]);
  return M.map(function (l) { return l.map(limpo); });
}
export function aplicar(M, v) { return [M[0][0] * v[0] + M[0][1] * v[1] + M[0][2] * v[2], M[1][0] * v[0] + M[1][1] * v[1] + M[1][2] * v[2], M[2][0] * v[0] + M[2][1] * v[1] + M[2][2] * v[2]]; }
function aplicarT(M, v) { return [M[0][0] * v[0] + M[1][0] * v[1] + M[2][0] * v[2], M[0][1] * v[0] + M[1][1] * v[1] + M[2][1] * v[2], M[0][2] * v[0] + M[1][2] * v[1] + M[2][2] * v[2]]; }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }

// pivô no palco (ele não se mexe quando o painel gira)
export function pivo(t) {
  var f = PIVOS[limpaPivo(t.pv)];
  return [t.mx + t.w * f[0], t.my + t.h * f[1], -(t.z || 0)];
}

// um ponto do painel sem giro (coordenadas do palco) → onde ele fica com o giro
export function noMundo(t, p, M) {
  M = M || matriz(t);
  var P = pivo(t), d = aplicar(M, [p[0] - P[0], p[1] - P[1], p[2] - P[2]]);
  return [P[0] + d[0], P[1] + d[1], P[2] + d[2]];
}

// para onde a frente do painel aponta
export function normal(t) { return aplicar(matriz(t), [0, 0, 1]); }

// ---- as 4 vistas: u = direita na tela, v = cima na tela, w = na direção de quem olha (a câmera fica em +w) ----
// "eixo" é o giro que se ajusta nessa vista (o que gira no plano da tela) e "sinal" converte o giro anti-horário na tela
export var VISTAS = {
  frente: { nome: "Frente", u: [1, 0, 0], v: [0, 1, 0], w: [0, 0, 1], eixo: "rz", sinal: 1, h: "X", vt: "altura" },
  topo: { nome: "Topo", u: [1, 0, 0], v: [0, 0, -1], w: [0, 1, 0], eixo: "ry", sinal: 1, h: "X", vt: "profundidade" },
  esq: { nome: "Esquerda", u: [0, 0, 1], v: [0, 1, 0], w: [-1, 0, 0], eixo: "rx", sinal: -1, h: "Z", vt: "altura" },
  dir: { nome: "Direita", u: [0, 0, -1], v: [0, 1, 0], w: [1, 0, 0], eixo: "rx", sinal: 1, h: "Z", vt: "altura" }
};
export var ORDEM_VISTAS = ["frente", "topo", "esq", "dir"];
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
export function chaveGiro(t) { return (t.rx || 0) + "|" + (t.ry || 0) + "|" + (t.rz || 0); }
export function deslocQuadro(t) {
  if (!temGiro(t)) return [0, 0, 0];
  var P = pivo(t), q = aplicarT(matriz(t), P);
  return [q[0] - P[0], q[1] - P[1], q[2] - P[2]];
}

// trocar o pivô sem o painel sair do lugar: devolve o mx, my e recuo novos
export function trocarPivo(t, pv) {
  var M = matriz(t), P = pivo(t), P2 = pivo({ mx: t.mx, my: t.my, w: t.w, h: t.h, z: t.z, pv: pv });
  var d = [P[0] - P2[0], P[1] - P2[1], P[2] - P2[2]], Rd = aplicar(M, d);
  return { mx: t.mx + d[0] - Rd[0], my: t.my + d[1] - Rd[1], z: (t.z || 0) - (d[2] - Rd[2]) };
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
