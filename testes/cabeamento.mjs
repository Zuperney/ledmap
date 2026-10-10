// Bancada de testes do cabeamento automático (npm run testar): compara o algoritmo antigo (serpentina + corte por área)
// com o planejador em formas variadas. "minimo" = menor número possível de portas (área e regra do xadrez).
import * as A from "../src/modules/auto-cabos.js";

const LIM = 655360;
// gabinete 50×50 cm, 128×128 px (40 por porta em retângulo cheio) e 50×100 cm, 128×256 px (20 por porta)
const G50 = { mw: 0.5, mh: 0.5, rx: 128, ry: 128 }, G100 = { mw: 0.5, mh: 1, rx: 128, ry: 256 };

// painel: x0, y0 em metros (y de cima para baixo), cols × rows; fora(c, r) = true tira o gabinete
function painel(id, g, x0, y0, cols, rows, fora, z) {
  const out = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (fora && fora(c, r, cols, rows)) continue;
    const x = +(x0 + c * g.mw).toFixed(4), y = +(y0 + r * g.mh).toFixed(4);
    out.push({ key: id + ":" + c + ":" + r, t: { id }, x, y, z: z || 0, w: g.mw, h: g.mh, ax: Math.round(x / g.mw * g.rx), ay: Math.round(y / g.mh * g.ry), aw: g.rx, ah: g.ry });
  }
  return out;
}

const rnd = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(42);
const furosAleatorios = new Set();
for (let i = 0; i < 24 * 8; i++) if (rnd() < 0.15) furosAleatorios.add(i);

const CASOS = [
  ["Retângulo 8×3 m (50×50)", painel("1", G50, 0, 0, 16, 6)],
  ["Retângulo grande 12×4 m (50×50)", painel("1", G50, 0, 0, 24, 8)],
  ["Anel do usuário (50×100, vão à esquerda)", painel("1", G100, 0, 0, 16, 3, (c, r) => r === 1 && c >= 1 && c <= 8)],
  ["Anel do usuário (50×100, vão à direita)", painel("3", G100, 0, 0, 16, 3, (c, r) => r === 1 && c >= 7 && c <= 14)],
  ["Moldura 10×6 m, borda de 1 gabinete", painel("1", G50, 0, 0, 20, 12, (c, r, C, R) => c > 0 && r > 0 && c < C - 1 && r < R - 1)],
  ["Triângulo 3×3 m", painel("1", G50, 0, 0, 6, 6, (c, r) => c > r)],
  ["Triângulo grande 8×8 m", painel("1", G50, 0, 0, 16, 16, (c, r) => c > r)],
  ["L 6×4 m", painel("1", G50, 0, 0, 12, 8, (c, r) => c >= 4 && r < 4)],
  ["T 8×4 m", painel("1", G50, 0, 0, 16, 8, (c, r) => r >= 2 && (c < 6 || c >= 10))],
  ["Escada 6×3 m", painel("1", G50, 0, 0, 12, 6, (c, r) => c > 2 * r + 1)],
  ["Furos aleatórios 12×4 m (15%)", painel("1", G50, 0, 0, 24, 8, (c, r) => furosAleatorios.has(r * 24 + c))],
  ["Dois painéis encostados (lado a lado)", [...painel("1", G50, 0, 0, 8, 4), ...painel("2", G50, 4, 0, 8, 4)]],
  ["Dois painéis com vão de 0,5 m (salto 0)", [...painel("1", G50, 0, 0, 8, 4), ...painel("2", G50, 4.5, 0, 8, 4)]],
  ["Dois painéis com vão de 0,5 m (salto 1 m)", [...painel("1", G50, 0, 0, 8, 4), ...painel("2", G50, 4.5, 0, 8, 4)], 1],
  ["Coluna fina 0,5×6 m + faixa 6×0,5 m (L de painéis)", [...painel("1", G50, 0, 0, 1, 12), ...painel("2", G50, 0.5, 5.5, 11, 1)]],
  ["Seu layout: 2 anéis + fundo 3×3 + laterais (50×100)", [...painel("1", G100, 0, 0, 16, 3, (c, r) => r === 1 && c >= 1 && c <= 8), ...painel("5", G100, 8, 0, 6, 3), ...painel("3", G100, 11, 0, 16, 3, (c, r) => r === 1 && c >= 7 && c <= 14)]],
  ["Seu layout com overclock", [...painel("1", G100, 0, 0, 16, 3, (c, r) => r === 1 && c >= 1 && c <= 8), ...painel("5", G100, 8, 0, 6, 3), ...painel("3", G100, 11, 0, 16, 3, (c, r) => r === 1 && c >= 7 && c <= 14)], 0, true],
  ["Losango 6×6 m", painel("1", G50, 0, 0, 12, 12, (c, r) => Math.abs(c - 5.5) + Math.abs(r - 5.5) > 6)],
  ["Tela enorme 30×10 m (1200 gab)", painel("1", G50, 0, 0, 60, 20)],
  ["Tela enorme com vão central 30×10 m", painel("1", G50, 0, 0, 60, 20, (c, r) => c >= 20 && c < 40 && r >= 5 && r < 15)],
  // miolo 4×1 recortado do painel e montado 0,5 m atrás, como painel separado no mesmo lugar da vista frontal
  ["Miolo recuado 0,5 m (8×3,5 + 4×1 atrás), salto 0", [...painel("1", G50, 0, 0, 16, 7, (c, r) => c >= 4 && c < 12 && r >= 3 && r < 5), ...painel("2", G50, 2, 1.5, 8, 2, null, 0.5)]],
  ["Miolo recuado 0,5 m, salto 0,5 m", [...painel("1", G50, 0, 0, 16, 7, (c, r) => c >= 4 && c < 12 && r >= 3 && r < 5), ...painel("2", G50, 2, 1.5, 8, 2, null, 0.5)], 0.5],
];

function medir(nome, chunks, cells) {
  const total = cells.length, vistos = new Map();
  let ruim = 0, pequenas = 0, saltos = 0, maior = 0, menor = Infinity;
  const cap = Math.floor(LIM / (cells[0].aw * cells[0].ah));
  for (const ch of chunks) {
    for (const c of ch) vistos.set(c.key, (vistos.get(c.key) || 0) + 1);
    if (A.areaRet(ch) > LIM) ruim++;
    const d = A.diagnostico(ch, cap);
    if (d.pequena) pequenas++;
    saltos += d.saltos;
    maior = Math.max(maior, ch.length); menor = Math.min(menor, ch.length);
  }
  const cobre = vistos.size === total && [...vistos.values()].every(v => v === 1);
  return { nome, portas: chunks.length, pequenas, saltos, menor, maior, ok: cobre && !ruim ? "ok" : (!cobre ? "FALTA/REPETE" : ruim + " ACIMA DO LIMITE") };
}

const linhas = [];
// mínimo de portas: por área e, em cada região ligada, pela "regra do xadrez" (um cabo entre vizinhos alterna as cores)
function piso(cells) {
  const mapa = new Map(cells.map((c, i) => [Math.round(c.x * 100) + "|" + Math.round(c.y * 100), i])), visto = new Set();
  let total = 0;
  for (let s = 0; s < cells.length; s++) {
    if (visto.has(s)) continue;
    const fila = [s], comp = []; visto.add(s);
    while (fila.length) { const i = fila.pop(), c = cells[i]; comp.push(c);
      for (const [dx, dy] of [[c.w, 0], [-c.w, 0], [0, c.h], [0, -c.h]]) { const j = mapa.get(Math.round((c.x + dx) * 100) + "|" + Math.round((c.y + dy) * 100)); if (j !== undefined && !visto.has(j)) { visto.add(j); fila.push(j); } } }
    let pretas = 0; for (const c of comp) if ((Math.round(c.x / c.w) + Math.round(c.y / c.h)) % 2 === 0) pretas++;
    total += Math.max(Math.ceil(comp.reduce((a, c) => a + c.aw * c.ah, 0) / LIM), Math.abs(comp.length - 2 * pretas));
  }
  return total;
}
for (const [nome, cells, salto, oc] of CASOS) {
  const antigo = A.cortarPorArea(A.snakePorTela(cells, "updown", "bl"), LIM, !!oc);
  const t0 = performance.now();
  const novo = A.planejar(cells, LIM, !!oc, { routing: "updown", corner: "bl", salto: salto || 0 });
  const ms = Math.round(performance.now() - t0);
  const a = medir("antigo", antigo, cells), n = medir("novo", novo, cells);
  linhas.push({ caso: nome, gab: cells.length, minimo: piso(cells), antigo: `${a.portas} (${a.pequenas} peq, ${a.saltos} saltos) ${a.ok}`, novo: `${n.portas} (${n.pequenas} peq, ${n.saltos} saltos, ${n.menor}–${n.maior} gab) ${n.ok}`, ms });
}
console.table(linhas);
