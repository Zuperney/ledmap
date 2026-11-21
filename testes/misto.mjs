// Painel misto (dois gabinetes numa medida): node testes/misto.mjs
import { combinacoes, planoMisto, sugerirComplemento, mesmoPitch } from "../src/modules/misto.js";

var falhas = 0;
function igual(a, b, msg) {
  var ok = JSON.stringify(a) === JSON.stringify(b);
  if (!ok) { falhas++; console.log("FALHOU:", msg, "→", JSON.stringify(a), "esperado", JSON.stringify(b)); }
}
function blocos(p) { return p.blocos.map(function (b) { return [b.papel, b.cab, b.x, b.y, b.w, b.h].join(" "); }); }

var G100 = { id: "a", mw: 0.5, mh: 1, rx: 128, ry: 256 }, G50 = { id: "b", mw: 0.5, mh: 0.5, rx: 128, ry: 128 };

// o caso do usuário: 3,5 m de altura = 3 × 1 m + 1 × 0,5 m (largura 4 m em gabinetes de 0,5)
var p = planoMisto(4, 3.5, G100, G50, "baixo", "dir");
igual([p.altura, p.largura, p.total], [{ n: 3, m: 1 }, { n: 8, m: 0 }, 32], "3,5 m: 3 de 1 m e 1 de 0,5 m, 32 gabinetes");
igual(blocos(p), ["principal a 0 0.5 4 3", "faixa b 0 0 4 0.5"], "faixa de menores embaixo");
igual(blocos(planoMisto(4, 3.5, G100, G50, "cima", "dir")), ["principal a 0 0 4 3", "faixa b 0 3 4 0.5"], "faixa de menores em cima");

// fecha só com o principal: nenhum complemento
igual(planoMisto(4, 3, G100, G50, "baixo", "dir").nB, 0, "3 m fecha só com o de 1 m");
// menos gabinetes vence "menos tipos": 3,5 m não vira 7 × 0,5
igual(planoMisto(0.5, 3.5, G100, G50).total, 4, "menos gabinetes: 3 + 1, não 7");

// mistura nas duas direções: 3,5 × 2,5 com 1 × 1 e 0,5 × 0,5
var A = { id: "A", mw: 1, mh: 1, rx: 100, ry: 100 }, B = { id: "B", mw: 0.5, mh: 0.5, rx: 50, ry: 50 };
var p2 = planoMisto(3.5, 2.5, A, B, "baixo", "dir");
igual([p2.nA, p2.nB, p2.total], [6, 11, 17], "3,5 × 2,5: 6 grandes e 11 pequenos");
igual(blocos(p2), ["principal a 0 0.5 3 2", "faixa b 0 0 3 0.5", "coluna b 3 0.5 0.5 2", "canto b 3 0 0.5 0.5"], "bloco, faixa, coluna e canto");
igual(blocos(planoMisto(3.5, 2.5, A, B, "cima", "esq")), ["principal a 0.5 0 3 2", "faixa b 0.5 2 3 0.5", "coluna b 0 0 0.5 2", "canto b 0 2 0.5 0.5"], "menores em cima e à esquerda");

// não fecha
igual(planoMisto(2.6, 1, A, { mw: 0.75, mh: 1 }), null, "2,6 m não fecha com 1 m e 0,75 m");
igual(combinacoes(3.5, 1, 0.5).map(function (c) { return c.n + "+" + c.m; }), ["3+1", "2+3", "1+5", "0+7"], "todas as formas de 3,5 m");

// sugestão: só com o mesmo pitch, e o que fecha com menos gabinetes
var outro = { id: "c", mw: 0.5, mh: 0.5, rx: 84, ry: 84 }; // pitch diferente
igual(mesmoPitch(G100, G50), true, "50×100 e 50×50 de 3,9 mm têm o mesmo pitch");
igual(mesmoPitch(G100, outro), false, "5,9 mm não combina com 3,9 mm");
var s = sugerirComplemento(4, 3.5, G100, [G100, outro, G50]);
igual(s && s.g.id, "b", "sugere o 50×50 do mesmo pitch");

console.log(falhas ? falhas + " falha(s)." : "Painel misto: tudo certo.");
process.exitCode = falhas ? 1 : 0;
