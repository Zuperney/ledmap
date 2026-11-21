// Blocos no mapa de pixels (Etapa 5): um painel pode ser quebrado em blocos só na Screen (o canvas do processador).
// No Palco, no cabeamento físico e na elétrica ele continua um painel só. Ex.: uma borda de campo de 110 m, um painel
// só na montagem, dobrada em várias linhas no canvas para caber na saída do processador.
// O técnico decide quantos gabinetes cada bloco tem; o app pode sugerir pelo limite de pixels de uma porta de cabo.
// Formato (guardado no painel, em "bl"): { cols: [n1, n2…], rows: [m1, m2…], d: [[dx, dy]…] } — larguras das colunas de
// blocos e alturas das linhas de blocos, em gabinetes, e o deslocamento de cada bloco (px) a partir do lugar natural
// dele (t.cx + c0·cw), na ordem linha a linha. Só contas: testado no Node.

function inteiros(l, max) {
  if (!Array.isArray(l) || !l.length || l.length > 400) return null;
  var out = [];
  for (var i = 0; i < l.length; i++) { var v = Math.round(Number(l[i])); if (!isFinite(v) || v < 1 || v > max) return null; out.push(v); }
  return out;
}
function soma(l) { return l.reduce(function (a, v) { return a + v; }, 0); }

// valida os blocos de um painel com q = res(t) (cols × rows de gabinetes); null = sem blocos (um bloco só)
export function limpaBlocos(b, q) {
  if (!b || typeof b !== "object" || !q) return null;
  var cols = inteiros(b.cols, q.cols), rows = inteiros(b.rows, q.rows);
  if (!cols || !rows || soma(cols) !== q.cols || soma(rows) !== q.rows || cols.length * rows.length < 2) return null;
  var n = cols.length * rows.length, d = [];
  for (var i = 0; i < n; i++) {
    var p = Array.isArray(b.d) && Array.isArray(b.d[i]) ? b.d[i] : [0, 0], dx = Math.round(Number(p[0])), dy = Math.round(Number(p[1]));
    d.push([isFinite(dx) && Math.abs(dx) <= 40000 ? dx : 0, isFinite(dy) && Math.abs(dy) <= 40000 ? dy : 0]);
  }
  return { cols: cols, rows: rows, d: d };
}

// os blocos com o lugar no canvas: { i, c0, c1, r0, r1, x, y, w, h, nx, ny } (c1 e r1 exclusivos; nx, ny = lugar natural)
export function listaBlocos(q, cx, cy, bl) {
  if (!bl) return [{ i: 0, c0: 0, c1: q.cols, r0: 0, r1: q.rows, x: cx, y: cy, w: q.w, h: q.h, nx: cx, ny: cy }];
  var out = [], r0 = 0, i = 0;
  bl.rows.forEach(function (rh) {
    var c0 = 0;
    bl.cols.forEach(function (cw) {
      var nx = cx + c0 * q.cw, ny = cy + r0 * q.ch, d = bl.d[i] || [0, 0];
      out.push({ i: i, c0: c0, c1: c0 + cw, r0: r0, r1: r0 + rh, x: nx + d[0], y: ny + d[1], w: cw * q.cw, h: rh * q.ch, nx: nx, ny: ny });
      c0 += cw; i++;
    });
    r0 += rh;
  });
  return out;
}

// onde fica o gabinete (c, r) no canvas
export function pxGabinete(lista, q, c, r) {
  for (var k = 0; k < lista.length; k++) {
    var b = lista[k];
    if (c >= b.c0 && c < b.c1 && r >= b.r0 && r < b.r1) return [b.x + (c - b.c0) * q.cw, b.y + (r - b.r0) * q.ch];
  }
  return [lista[0].x + c * q.cw, lista[0].y + r * q.ch];
}

// "32, 32, 30" ou só "32" (repete até fechar o total; o último fica com o resto)
export function lerTamanhos(txt, total) {
  var l = String(txt || "").split(/[\s,;+]+/).filter(Boolean).map(Number);
  if (!l.length || l.some(function (v) { return !isFinite(v) || v < 1 || Math.round(v) !== v; })) return null;
  if (l.length === 1) { var out = [], rem = total; while (rem > 0) { out.push(Math.min(l[0], rem)); rem -= l[0]; } return out; }
  return soma(l) === total ? l : null;
}

// sugestão: quantas colunas de gabinetes cabem numa porta com a altura de bloco dada (linhas), pelo limite de pixels
// (o retângulo do bloco inteiro tem de caber: colunas × linhas × px de um gabinete ≤ limite)
export function sugerirColunas(q, linhasPorBloco, limitePx) {
  var porGab = q.cw * q.ch, k = Math.floor(limitePx / (porGab * Math.max(1, linhasPorBloco)));
  return Math.max(1, Math.min(q.cols, k));
}

// arranjo dos blocos no canvas, a partir dos lugares naturais: "lado" (como no painel), "pilha" (um embaixo do outro,
// alinhados à esquerda do painel, na ordem). Devolve d (deslocamentos) para o formato.
export function arranjar(q, cx, cy, bl, modo) {
  var lista = listaBlocos(q, cx, cy, { cols: bl.cols, rows: bl.rows, d: [] });
  if (modo !== "pilha") return lista.map(function () { return [0, 0]; });
  var y = cy;
  return lista.map(function (b) { var d = [cx - b.nx, y - b.ny]; y += b.h; return d; });
}

// bloco cuja posição foi editada (x, y absolutos no canvas): o deslocamento novo
export function deslocar(b, x, y) { return [Math.round(x - b.nx), Math.round(y - b.ny)]; }
