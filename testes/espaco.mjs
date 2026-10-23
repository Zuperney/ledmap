// Bancada do espaço do palco (giro, vistas, quadros e migração das vistas antigas): node testes/espaco.mjs
import { matriz, aplicar, noMundo, afim, casco, caixa, deslocQuadro, trocarPivo, deVistaAntiga, limpaGiro, encara, profundidadeNaVista, extensao } from "../src/modules/espaco.js";

var falhas = 0;
function perto(a, b, msg) {
  var ok = Array.isArray(a) ? a.every(function (v, i) { return Math.abs(v - b[i]) < 1e-9; }) : Math.abs(a - b) < 1e-9;
  if (!ok) { falhas++; console.log("FALHOU:", msg, "→", JSON.stringify(a), "esperado", JSON.stringify(b)); }
}
function painel(o) { return Object.assign({ mx: 0, my: 0, w: 4, h: 2, z: 0, rx: 0, ry: 0, rz: 0, pv: "c" }, o); }

// giro: eixos e sentidos iguais aos do three.js (ordem YXZ)
perto(aplicar(matriz({ ry: 90 }), [0, 0, 1]), [1, 0, 0], "ry 90 leva a frente para +X (parede esquerda virada para a direita)");
perto(aplicar(matriz({ rx: -90 }), [0, 0, 1]), [0, 1, 0], "rx −90 vira a frente para cima (piso)");
perto(aplicar(matriz({ rx: 90 }), [0, 0, 1]), [0, -1, 0], "rx 90 vira a frente para baixo (teto)");
perto(aplicar(matriz({ rz: 90 }), [1, 0, 0]), [0, 1, 0], "rz 90 gira no plano, anti-horário de frente");
// ordem YXZ: inclinar (X) e depois abrir (Y) = a inclinação acompanha a abertura
var M = matriz({ rx: -30, ry: 90 });
perto(aplicar(M, [1, 0, 0]), [0, 0, -1], "com abertura de 90°, a largura do painel corre ao longo de −Z");

// sem giro, na Frente, a afim é o translate de antes
perto(afim(painel({ mx: 2, my: 1 }), "frente", 8), [1, 0, 0, 1, 2, 8 - 1 - 2], "afim sem giro = translate(mx, chão − my − h)");
// sem giro, no Topo: a frente vira uma linha (altura some), recuo para cima na tela
var top = afim(painel({ mx: 2, z: 1 }), "topo", 8);
perto([top[0], top[1], top[2], top[3]], [1, 0, 0, 0], "no Topo a altura do painel não aparece");
perto(top[5], 8 - 1, "no Topo o recuo 1 m fica 1 m acima da linha da frente"); // V = −Z = recuo
// caixa no Topo: de recuo a recuo + espessura
var cx = caixa(painel({ mx: 2, z: 1 }), "topo");
perto([cx.u0, cx.u1, cx.v0], [2, 6, 1], "caixa no Topo");

// pivô: o pivô não sai do lugar com o giro
var p = painel({ mx: 1, my: 0, pv: "bl", ry: 40 });
perto(noMundo(p, [1, 0, 0]), [1, 0, 0], "canto de baixo à esquerda fica parado com pivô bl");
// V: lateral girada pela borda direita continua encostada no painel do meio
var lat = painel({ mx: -6, my: 0, w: 4, pv: "br", ry: -30 });
perto(noMundo(lat, [-2, 0, 0]), [-2, 0, 0], "a borda que encosta no meio não abre fresta");

// trocar o pivô não tira o painel do lugar
var g = painel({ mx: 3, my: 1, z: 0.5, rx: 20, ry: -35, rz: 10, pv: "c" });
var antes = noMundo(g, [g.mx, g.my, -g.z]);
var n = trocarPivo(g, "tr"), g2 = Object.assign({}, g, n, { pv: "tr" });
perto(noMundo(g2, [g2.mx, g2.my, -g2.z]), antes, "trocar pivô mantém o canto no mesmo lugar");

// quadro: painéis com o mesmo giro, encostados no palco, ficam encostados no quadro
var a = painel({ mx: 0, ry: 90, pv: "bl" }), b = painel({ mx: 4, ry: 90, pv: "bl" });
// b gira em volta do próprio canto: para encostar em a no palco, o pivô de b fica onde a borda direita de a foi parar
var fimA = noMundo(a, [4, 0, 0]);
b.mx = fimA[0]; b.z = -fimA[2];
var qa = deslocQuadro(a), qb = deslocQuadro(b);
perto((b.mx + qb[0]) - (a.mx + qa[0]), 4, "no quadro do plano, b começa onde a termina");
perto((b.z || 0) - qb[2] - ((a.z || 0) - qa[2]), 0, "e na mesma profundidade");
perto(deslocQuadro(painel({ mx: 3, my: 2, z: 1 })), [0, 0, 0], "sem giro o quadro é o do Rig");

// vistas antigas → giro
var mig = deVistaAntiga({ mx: 1, my: 0, w: 2, h: 3, z: 0 }, { ori: "esq", ox: -10, oy: 0, oz: 0 });
var mt = Object.assign({ w: 2, h: 3 }, mig);
perto(noMundo(mt, [mt.mx, mt.my, -mt.z]), [-10, 0, -1], "parede esquerda: o canto do painel vai para o mesmo lugar que o 3D antigo punha");
perto(encara(mt, "dir"), 1, "parede esquerda encara a vista Direita");
var teto = Object.assign({ w: 4, h: 2 }, deVistaAntiga({ mx: 0, my: 0, w: 4, h: 2, z: 0 }, { ori: "teto", ox: 0, oy: 6, oz: 0 }));
perto(encara(teto, "topo"), -1, "teto fica de costas para o Topo (virado para baixo)");
perto(noMundo(teto, [teto.mx + 2, teto.my + 1, -teto.z])[1], 6, "teto na altura da vista antiga");

// extensão no palco: o "Painel 4" do layout de teste (22 × 7 m, giro X 90°, pivô no centro, my −0,5) é um teto a 3 m
var ext = extensao(painel({ mx: -11, my: -0.5, w: 22, h: 7, rx: 90 }));
perto([ext.x0, ext.x1, ext.y0, ext.y1, ext.r0, ext.r1], [-11, 11, 3, 3, -3.5, 3.5], "teto: X −11 a 11, altura 3, recuo −3,5 a 3,5");
var ext1 = extensao(painel({ mx: -11.02, my: 0, w: 10, h: 3, ry: 45 }));
perto([ext1.x0, ext1.x1, ext1.r0, ext1.r1], [-9.556, -2.484, -3.536, 3.536], "lateral a 45° em volta do centro");
var ext0 = extensao(painel({ mx: 2, my: 1, w: 4, h: 2, z: 0.5 }));
perto([ext0.x0, ext0.x1, ext0.y0, ext0.y1, ext0.r0, ext0.r1], [2, 6, 1, 3, 0.5, 0.5], "sem giro: o retângulo do Rig");

// ângulos
perto(limpaGiro(190), -170, "190° = −170°");
perto(limpaGiro(-180), 180, "−180° = 180°");
perto(limpaGiro(12.34), 12.3, "um décimo de grau");

// casco: retângulo na frente, faixa fina no topo
perto(casco(painel({}), "frente").length, 4, "casco de frente tem 4 pontos");
perto(profundidadeNaVista(painel({ z: 2 }), "frente") < profundidadeNaVista(painel({ z: 0 }), "frente") ? 1 : 0, 1, "recuado fica atrás na Frente");

console.log(falhas ? falhas + " falha(s)." : "Espaço: tudo certo.");
process.exitCode = falhas ? 1 : 0;
