// Blocos no mapa de pixels: node testes/blocos.mjs
import { limpaBlocos, listaBlocos, pxGabinete, lerTamanhos, sugerirColunas, arranjar } from "../src/modules/blocos.js";

var falhas = 0;
function igual(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) { falhas++; console.log("FALHOU:", msg, "→", JSON.stringify(a), "esperado", JSON.stringify(b)); } }

// borda de campo: 220 gabinetes de 0,5 m (110 m) × 2 linhas, 128 px por gabinete
var q = { cols: 220, rows: 2, cw: 128, ch: 128, w: 220 * 128, h: 256 };
igual(lerTamanhos("60", 220), [60, 60, 60, 40], "60 por bloco: 60 + 60 + 60 + 40");
igual(lerTamanhos("100, 120", 220), [100, 120], "lista que fecha o total");
igual(lerTamanhos("100, 100", 220), null, "lista que não fecha");
igual(limpaBlocos({ cols: [220], rows: [2] }, q), null, "um bloco só não é divisão");
var bl = limpaBlocos({ cols: [60, 60, 60, 40], rows: [2] }, q);
igual(bl.d.length, 4, "4 blocos, deslocamento zero");

// lado a lado: o lugar natural; o gabinete 61 (c = 60) cai no bloco 2
var l = listaBlocos(q, 0, 0, bl);
igual(l.map(function (b) { return [b.c0, b.c1, b.x, b.y, b.w]; }), [[0, 60, 0, 0, 7680], [60, 120, 7680, 0, 7680], [120, 180, 15360, 0, 7680], [180, 220, 23040, 0, 5120]], "blocos lado a lado");
igual(pxGabinete(l, q, 60, 1), [7680, 128], "gabinete 61 da 2ª linha");

// empilhados: cada bloco embaixo do anterior, alinhado à esquerda
bl.d = arranjar(q, 0, 0, bl, "pilha");
l = listaBlocos(q, 0, 0, bl);
igual(l.map(function (b) { return [b.x, b.y]; }), [[0, 0], [0, 256], [0, 512], [0, 768]], "blocos empilhados");
igual(pxGabinete(l, q, 60, 0), [0, 256], "o 1º gabinete do bloco 2 vai para o começo da 2ª faixa");
igual(pxGabinete(l, q, 219, 1), [39 * 128, 768 + 128], "o último gabinete");

// sugestão pelo limite da porta: 655.360 px, gabinete 128 × 128, blocos de 2 linhas → 20 colunas
igual(sugerirColunas(q, 2, 655360), 20, "20 colunas de 2 linhas cabem numa porta");
igual(sugerirColunas(q, 2, 10), 1, "no mínimo 1");

console.log(falhas ? falhas + " falha(s)." : "Blocos: tudo certo.");
process.exitCode = falhas ? 1 : 0;
