// Testes obrigatórios das regras de transformação (PLANO.md): node testes/transformacoes.mjs
// Nenhuma mudança em posição, pin ou giro entra sem passar por aqui.
import { matriz, matrizLocal, noMundo, pivo, trocarPivo, medidaNoPin, cantoDoPin, definirPai, paiDeGrupo, agrupar, noPalco, noEspacoDe, trocarPinGrupo, migrarGrupoAntigo, extensao, deMatriz, matrizDe, matrizEixo, multiplicar, limpaGiro } from "../src/modules/espaco.js";

var falhas = 0, MM = 0.0006; // meio milímetro e um pouco: as posições são gravadas em mm
function perto(a, b, msg, tol) {
  tol = tol || 1e-9;
  var ok = Array.isArray(a) ? a.length === b.length && a.every(function (v, i) { return Math.abs(v - b[i]) < tol; }) : Math.abs(a - b) < tol;
  if (!ok) { falhas++; console.log("FALHOU:", msg, "→", JSON.stringify(a), "esperado", JSON.stringify(b)); }
}
function painel(o) { return Object.assign({ mx: 0, my: 0, w: 3, h: 2, z: 0, rx: 0, ry: 0, rz: 0, pv: "b" }, o); }
// as 4 quinas da face da frente no palco
function quinas(t) { var z = -(t.z || 0); return [[t.mx, t.my], [t.mx + t.w, t.my], [t.mx, t.my + t.h], [t.mx + t.w, t.my + t.h]].map(function (c) { return noMundo(t, [c[0], c[1], z]); }); }
function quinasIguais(a, b, msg, tol) { a.forEach(function (q, i) { perto(q, b[i], msg + " (quina " + (i + 1) + ")", tol); }); }
function mm(v) { return Math.round(v * 1000) / 1000; }

// grupos dos testes: o pai sai do campo "grupo" do painel
var grupos = {};
definirPai(function (t) { var g = grupos[t.pn]; return g ? paiDeGrupo(g) : null; });

// ---- caso do teto (o problema da outra vez) ----
var teto = painel({ w: 3, h: 3, my: 0 });
var c = cantoDoPin(teto, 0, 2.5); teto.mx = c.mx; teto.my = c.my; // sobe o pin para 2,5 m
teto.rx = 90; // inclina até a face ficar virada para o piso
quinas(teto).forEach(function (q, i) { perto(q[1], 2.5, "teto: quina " + (i + 1) + " a 2,5 m do chão"); });
perto(pivo(teto)[1], 2.5, "teto: o campo de altura (o pin) continua 2,5");
perto(matriz(teto)[1][2] * -1, 1, "teto: face virada para o piso"); // normal (0,0,1) → (0,−1,0)
var e = extensao(teto);
perto([e.y0, e.y1], [2.5, 2.5], "teto: No palco, altura de 2,5 a 2,5");

// ---- girar 360° em qualquer eixo volta ao início ----
var g0 = painel({ mx: 1, my: 0.5, z: 0.3, rx: 10, ry: -20, rz: 5 }), q0 = quinas(g0);
["rx", "ry", "rz"].forEach(function (k) {
  var g = Object.assign({}, g0); g[k] = limpaGiro(g[k] + 360);
  quinasIguais(quinas(g), q0, "360° em " + k);
});
// girar 360° pela alça (matriz do eixo da vista, em passos de 15°, sempre a partir do começo do arrasto)
var ini = matriz(g0), giro = Object.assign({}, g0);
for (var a = 15; a <= 360; a += 15) { var d = deMatriz(multiplicar(matrizEixo([0, 0, 1], a), ini)); giro.rx = d.rx; giro.ry = d.ry; giro.rz = d.rz; }
quinasIguais(quinas(giro), q0, "alça: 360° em passos de 15° volta ao início", 1e-6);

// ---- girar não muda a posição do pin ----
["tl", "t", "tr", "l", "c", "r", "bl", "b", "br"].forEach(function (pv) {
  var t = painel({ mx: -2, my: 1, z: 0.5, pv: pv }), P = pivo(t);
  t.rx = 33; t.ry = -71; t.rz = 12;
  perto(pivo(t), P, "girar não move o pin (" + pv + ")");
});

// ---- trocar o pin não move nenhum canto da peça ----
var tp = painel({ mx: 3, my: 1, z: 0.5, rx: 20, ry: -35, rz: 10, pv: "c" }), qp = quinas(tp);
["tl", "b", "br", "c"].forEach(function (pv) {
  var n = trocarPivo(tp, pv), t2 = Object.assign({}, tp, n, { pv: pv });
  quinasIguais(quinas(t2), qp, "trocar o pin para " + pv + " não move a peça");
});

// ---- mudar a medida não move o pin ----
["b", "c", "tl", "br"].forEach(function (pv) {
  var t = painel({ mx: 1, my: 2, w: 4, h: 2, rx: 15, ry: 40, pv: pv }), P = pivo(t), n = medidaNoPin(t, 6, 3.5);
  var t2 = Object.assign({}, t, n, { w: 6, h: 3.5 });
  perto(pivo(t2), P, "mudar a medida não move o pin (" + pv + ")");
});
// com o pin embaixo no meio, aumentar a altura cresce para cima e para os dois lados igualmente
var tb = painel({ mx: -1.5, my: 0, w: 3, h: 2 }), nb = medidaNoPin(tb, 5, 4);
perto([nb.mx, nb.my], [-2.5, 0], "pin embaixo: cresce para cima e para os lados");

// ---- girar ou mover o grupo não muda os valores relativos dos membros ----
var A = painel({ id: "A", mx: -4, my: 0, w: 4, h: 2, pv: "b" }), B = painel({ id: "B", mx: 0, my: 0, w: 4, h: 2, pv: "b", ry: -30 });
var ng = agrupar([A, B], "b"), G = { gx: ng.gx, gy: ng.gy, gz: ng.gz, rx: 0, ry: 0, rz: 0, pv: "b" };
var qA = quinas(A), qB = quinas(B);
[A, B].forEach(function (t, i) { Object.assign(t, ng.membros[i]); t.pn = "g1"; });
grupos.g1 = G;
quinasIguais(quinas(A), qA, "agrupar não move A");
quinasIguais(quinas(B), qB, "agrupar não move B");
var xs = qA.concat(qB).map(function (q) { return q[0]; });
perto([G.gx, G.gy], [(Math.min.apply(null, xs) + Math.max.apply(null, xs)) / 2, 0], "pin do grupo no meio de baixo da caixa", 1e-9);
var antesA = JSON.stringify([A.mx, A.my, A.z, A.rx, A.ry, A.rz]), antesB = JSON.stringify([B.mx, B.my, B.z, B.rx, B.ry, B.rz]);
function dist(p, q) { return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); }
var juntaAntes = noMundo(A, [A.mx + A.w, A.my, -A.z]), dAntes = dist(juntaAntes, noMundo(B, [B.mx, B.my, -B.z]));
G.gx += 2; G.gy += 1.5; G.gz += 0.4; G.rx = 90; G.ry = 15; // sobe, recua e vira teto
perto(JSON.stringify([A.mx, A.my, A.z, A.rx, A.ry, A.rz]) === antesA ? 1 : 0, 1, "girar/mover o grupo não muda os valores de A");
perto(JSON.stringify([B.mx, B.my, B.z, B.rx, B.ry, B.rz]) === antesB ? 1 : 0, 1, "girar/mover o grupo não muda os valores de B");
// a junta entre A e B continua encostada no grupo girado
var jA = noMundo(A, [A.mx + A.w, A.my, -A.z]), jB = noMundo(B, [B.mx, B.my, -B.z]);
perto(dist(jA, jB), dAntes, "a distância entre A e B não muda ao girar o grupo");
perto(dist(juntaAntes, jA) > 0.5 ? 1 : 0, 1, "e o grupo de fato se moveu");
// girar o grupo não move o pin do grupo
var pinG = [G.gx, G.gy, -G.gz];
perto(paiDeGrupo(G).O, pinG, "o pin do grupo não se move ao girar");

// ---- agrupar → desagrupar devolve os mesmos valores no palco ----
var qA2 = quinas(A), qB2 = quinas(B);
var sA = noPalco(A), sB = noPalco(B);
var A3 = Object.assign({}, A, sA, { pn: "" }), B3 = Object.assign({}, B, sB, { pn: "" });
quinasIguais(quinas(A3), qA2, "desagrupar não move A", 2e-4);
quinasIguais(quinas(B3), qB2, "desagrupar não move B", 2e-4);
// e de volta para o grupo pelos valores no palco
var vA = noEspacoDe(paiDeGrupo(G), A3, pivo(A3), matriz(A3));
perto([vA.mx, vA.my, vA.z], [A.mx, A.my, A.z], "voltar para o grupo devolve os valores relativos", 1e-6);

// ---- trocar o pin do grupo não move nada ----
var ntp = trocarPinGrupo(G, [A, B], "tl"), G2 = Object.assign({}, G, { gx: ntp.gx, gy: ntp.gy, gz: ntp.gz });
var A4 = Object.assign({}, A, ntp.membros[0], { pn: "g2" }), B4 = Object.assign({}, B, ntp.membros[1], { pn: "g2" });
grupos.g2 = G2;
quinasIguais(quinas(A4), qA2, "trocar o pin do grupo não move A");
quinasIguais(quinas(B4), qB2, "trocar o pin do grupo não move B");

// ---- espelhar duas vezes devolve o original (o pin espelhado no plano x = a, giro (rx, −ry, −rz), pin do outro lado) ----
var PV_H = { tl: "tr", tr: "tl", l: "r", r: "l", bl: "br", br: "bl" };
function espelharX(t, a) { var pv = PV_H[t.pv] || t.pv; return Object.assign({}, t, { mx: 2 * a - (t.mx + t.w), rx: t.rx, ry: limpaGiro(-t.ry), rz: limpaGiro(-t.rz), pv: pv }); }
var te = painel({ mx: 1.2, my: 0.4, rx: 12, ry: 33, rz: -8, pv: "bl" }), qe = quinas(te);
var te1 = espelharX(te, 0.5), te2 = espelharX(te1, 0.5);
quinasIguais(quinas(te2), qe, "espelhar duas vezes volta ao original");
// e o espelho é de fato o reflexo: cada quina vai para x' = 2a − x
var qe1 = quinas(te1), refl = qe.map(function (q) { return [1 - q[0], q[1], q[2]]; });
refl.forEach(function (r) { perto(qe1.some(function (q) { return Math.abs(q[0] - r[0]) < 1e-9 && Math.abs(q[1] - r[1]) < 1e-9 && Math.abs(q[2] - r[2]) < 1e-9; }) ? 1 : 0, 1, "o espelho é o reflexo no plano"); });

// ---- salvar → abrir devolve os mesmos números (mm e centésimos de grau) ----
var ts = painel({ mx: 1.2345, my: 0.5, z: 0.25, rx: 12.345, ry: -0.004, rz: 179.999 });
var gravado = JSON.parse(JSON.stringify({ mx: mm(ts.mx), my: mm(ts.my), z: mm(ts.z), rx: limpaGiro(ts.rx), ry: limpaGiro(ts.ry), rz: limpaGiro(ts.rz) }));
var aberto = { mx: mm(gravado.mx), my: mm(gravado.my), z: mm(gravado.z), rx: limpaGiro(gravado.rx), ry: limpaGiro(gravado.ry), rz: limpaGiro(gravado.rz) };
perto([aberto.mx, aberto.my, aberto.z, aberto.rx, aberto.ry, aberto.rz], [gravado.mx, gravado.my, gravado.z, gravado.rx, gravado.ry, gravado.rz], "salvar e abrir de novo não muda nada");

// ---- projeto antigo aberto: grupo com o giro "derretido" nos membros ----
// dois painéis lado a lado, girados juntos 90° em Y e 20° em X no jeito antigo (valores no palco)
var C1 = painel({ id: "C1", mx: -4, my: 1, w: 4, h: 2, pv: "c" }), C2 = painel({ id: "C2", mx: 0, my: 1, w: 4, h: 2, pv: "c" });
var Rg = multiplicar(matrizEixo([0, 1, 0], 90), matrizEixo([1, 0, 0], 20)), gAnt = deMatriz(Rg);
[C1, C2].forEach(function (t) { var d = deMatriz(multiplicar(Rg, matrizLocal(t))); t.rx = d.rx; t.ry = d.ry; t.rz = d.rz; });
var qC1 = quinas(C1), qC2 = quinas(C2);
var mig = migrarGrupoAntigo({ rx: gAnt.rx, ry: gAnt.ry, rz: gAnt.rz }, [C1, C2]);
grupos.g3 = { gx: mig.gx, gy: mig.gy, gz: mig.gz, rx: gAnt.rx, ry: gAnt.ry, rz: gAnt.rz, pv: mig.pv };
var C1n = Object.assign({}, C1, mig.membros[0], { pn: "g3" }), C2n = Object.assign({}, C2, mig.membros[1], { pn: "g3" });
quinasIguais(quinas(C1n), qC1, "projeto antigo: C1 fica no mesmo lugar", 2e-4);
quinasIguais(quinas(C2n), qC2, "projeto antigo: C2 fica no mesmo lugar", 2e-4);
perto([C1n.rx, C1n.ry, C1n.rz, C2n.rx, C2n.ry, C2n.rz], [0, 0, 0, 0, 0, 0], "projeto antigo: o giro volta a ser do grupo", 0.006);
// pin antigo no centro → meio de baixo, sem mover
var pc = painel({ mx: -11, my: -0.5, w: 22, h: 7, rx: 90, pv: "c" }), qpc = quinas(pc), npc = trocarPivo(pc, "b");
quinasIguais(quinas(Object.assign({}, pc, npc, { pv: "b" })), qpc, "pin antigo no centro vira meio de baixo sem mover");

console.log(falhas ? falhas + " falha(s)." : "Transformações: tudo certo.");
process.exitCode = falhas ? 1 : 0;
