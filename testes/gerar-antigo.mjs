// Gera um projeto no formato de antes das regras de transformação (pin no centro, grupo com o giro "derretido" nos
// membros) e as extensões esperadas no palco: serve para conferir a migração no navegador.
// node testes/gerar-antigo.mjs > public/__teste-antigo.json
import { matrizLocal, deMatriz, multiplicar, matrizEixo, extensao } from "../src/modules/espaco.js";

function ex(o) { return Object.assign({ tipo: "imag", gabinete: "", recortes: [], profundidade: 0, giroX: 0, giroY: 0, giroZ: 0, pivo: "c" }, o); }
var extras = [
  ex({ id: "1", nome: "Frente", largura: 4, altura: 2, mx: -6, my: 0 }),
  ex({ id: "2", nome: "Teto", largura: 3, altura: 3, mx: -1.5, my: 1, giroX: 90 }),
  ex({ id: "3", nome: "Lateral A", largura: 2, altura: 2, mx: 3, my: 0.5, pivo: "c" }),
  ex({ id: "4", nome: "Lateral B", largura: 2, altura: 2, mx: 5, my: 0.5, pivo: "c" })
];
// grupo antigo: 3 e 4 girados juntos 45° em Y em volta do centro deles (valores no palco, como o app antigo gravava)
var Rg = matrizEixo([0, 1, 0], 45), C = [5, 1.5, 0];
[2, 3].forEach(function (i) {
  var e = extras[i], t = { mx: e.mx, my: e.my, w: e.largura, h: e.altura, z: 0, rx: 0, ry: 0, rz: 0, pv: "c" };
  var P = [t.mx + t.w / 2, t.my + t.h / 2, 0], d = [P[0] - C[0], P[1] - C[1], P[2] - C[2]];
  var Rd = [Rg[0][0] * d[0] + Rg[0][1] * d[1] + Rg[0][2] * d[2], Rg[1][0] * d[0] + Rg[1][1] * d[1] + Rg[1][2] * d[2], Rg[2][0] * d[0] + Rg[2][1] * d[1] + Rg[2][2] * d[2]];
  var P2 = [C[0] + Rd[0], C[1] + Rd[1], C[2] + Rd[2]], g = deMatriz(multiplicar(Rg, matrizLocal(t)));
  e.mx = Math.round((P2[0] - t.w / 2) * 1000) / 1000; e.my = Math.round((P2[1] - t.h / 2) * 1000) / 1000; e.profundidade = Math.round(-P2[2] * 1000) / 1000;
  e.giroX = g.rx; e.giroY = g.ry; e.giroZ = g.rz;
});
var esperado = {};
extras.forEach(function (e) {
  var x = extensao({ mx: e.mx, my: e.my, w: e.largura, h: e.altura, z: e.profundidade, rx: e.giroX, ry: e.giroY, rz: e.giroZ, pv: e.pivo });
  esperado[e.id] = [x.x0, x.x1, x.y0, x.y1, x.r0, x.r1];
});
var proj = {
  tipo: "ledmap", versao: 2, exportadoEm: "2026-10-29T00:00:00.000Z",
  projeto: { nome: "Teste migração", cliente: "", local: "", data: "", obs: "" },
  telas: extras.map(function (e, i) { return { id: e.id, nome: e.nome, x: i * 600, y: 0, screen: "", painel: i >= 2 ? "a1" : "", mx: e.mx, my: e.my }; }),
  paineis: [{ id: "a1", nome: "Laterais", giroX: 0, giroY: 45, giroZ: 0 }],
  vistaAtual: "frente", extras: extras, screens: [], proximaScreen: 1,
  cabeamento: { portas: [{ id: "p1", n: 1, nome: "Porta 1" }], rotas: { p1: [] }, proximaPorta: 2 },
  __esperado: esperado
};
console.log(JSON.stringify(proj, null, 2));
