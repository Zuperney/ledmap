// Grupo como um painel só (regras de transformação no PLANO.md): o grupo tem pin próprio (gx, gy, recuo gz, num dos
// 9 pontos da caixa dos membros) e giro (rx, ry, rz) em volta do pin. Os membros guardam valores relativos ao grupo:
// mover ou girar o grupo muda só o grupo; agrupar e desagrupar não movem nada. Contas em espaco.js.
import { painelById, membrosPainel, gravarVivo, mnum } from "./core.js";
import { matriz, matrizDe, multiplicar, deMatriz, extensao, caixaNoGrupo, agrupar, trocarPinGrupo, noPalco, pai, pivo, PIVOS, limpaPivo, aplicar } from "./espaco.js";

export function rotGrupo(p) { return matrizDe(p.rx || 0, p.ry || 0, p.rz || 0); }
// pin do grupo no palco (Z para o público)
export function pinGrupo(p) { return [p.gx || 0, p.gy || 0, -(p.gz || 0)]; }

// { w, h, d, centro, lo, hi }: a caixa dos membros no espaço do grupo (medidas que não mudam ao girar o grupo) e o
// centro dela no palco
export function caixaGrupo(pn) {
  var p = painelById(pn), m = membrosPainel(pn);
  if (!p || !m.length) return null;
  var cx = caixaNoGrupo(m), c = aplicar(rotGrupo(p), [(cx.lo[0] + cx.hi[0]) / 2, (cx.lo[1] + cx.hi[1]) / 2, (cx.lo[2] + cx.hi[2]) / 2]), O = pinGrupo(p);
  cx.centro = [O[0] + c[0], O[1] + c[1], O[2] + c[2]];
  return cx;
}

// desloca o grupo no palco: d = [dx, dy, dZ] (Z para o público; o recuo é o contrário). Os membros não mudam.
export function moverGrupo(pn, d) {
  var p = painelById(pn);
  if (!p) return [];
  p.gx = mnum((p.gx || 0) + d[0]); p.gy = mnum((p.gy || 0) + d[1]); p.gz = mnum((p.gz || 0) - d[2]) || 0;
  return membrosPainel(pn);
}
// põe o pin do grupo num ponto do palco
export function porGrupo(pn, x, y, recuo) {
  var p = painelById(pn);
  if (!p) return [];
  p.gx = mnum(x); p.gy = mnum(y); p.gz = mnum(recuo) || 0;
  return membrosPainel(pn);
}

// giro do grupo (em volta do pin dele): ângulos novos, ou a matriz Rd (eixos do palco) aplicada sobre um giro de
// partida (o do começo do arrasto, para não somar erro). Os membros não mudam.
export function girarGrupoPara(pn, g) {
  var p = painelById(pn);
  if (!p) return [];
  p.rx = g.rx; p.ry = g.ry; p.rz = g.rz;
  return membrosPainel(pn);
}
export function girarGrupo(pn, Rd, ini) {
  var p = painelById(pn);
  if (!p) return [];
  return girarGrupoPara(pn, deMatriz(multiplicar(Rd, ini ? matrizDe(ini.rx || 0, ini.ry || 0, ini.rz || 0) : rotGrupo(p))));
}

// trocar o pin do grupo (outro ponto da caixa) sem nada sair do lugar
export function trocarPinDoGrupo(pn, pv) {
  var p = painelById(pn), m = membrosPainel(pn);
  if (!p || !m.length) return [];
  var n = trocarPinGrupo(p, m, pv);
  p.gx = mnum(n.gx); p.gy = mnum(n.gy); p.gz = mnum(n.gz) || 0; p.pv = n.pv;
  m.forEach(function (t, i) { t.mx = mnum(n.membros[i].mx); t.my = mnum(n.membros[i].my); t.z = mnum(n.membros[i].z) || 0; });
  gravarVivo(m);
  return m;
}

// tira um painel do grupo: ele fica com os valores no palco (nada se move). Não mexe na lista de grupos.
export function soltarDoGrupo(t) {
  if (!t.pn) return;
  var n = noPalco(t);
  t.mx = mnum(n.mx); t.my = mnum(n.my); t.z = mnum(n.z) || 0; t.rx = n.rx; t.ry = n.ry; t.rz = n.rz;
  t.pn = "";
}

// põe painéis soltos (ou de outros grupos, que saem deles antes) no grupo p, com o pin no meio de baixo da caixa
export function formarGrupo(p, lista) {
  lista.forEach(soltarDoGrupo);
  var n = agrupar(lista, "b");
  p.gx = mnum(n.gx); p.gy = mnum(n.gy); p.gz = mnum(n.gz) || 0; p.rx = 0; p.ry = 0; p.rz = 0; p.pv = n.pv;
  lista.forEach(function (t, i) { t.mx = mnum(n.membros[i].mx); t.my = mnum(n.membros[i].my); t.z = mnum(n.membros[i].z) || 0; t.pn = p.id; });
  gravarVivo(lista);
}

// onde o grupo fica no palco: X, altura e recuo de onde começa até onde termina (a soma dos painéis)
export function extensaoGrupo(pn) {
  var e = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity, r0: Infinity, r1: -Infinity };
  membrosPainel(pn).forEach(function (t) {
    var x = extensao(t);
    e.x0 = Math.min(e.x0, x.x0); e.x1 = Math.max(e.x1, x.x1); e.y0 = Math.min(e.y0, x.y0); e.y1 = Math.max(e.y1, x.y1); e.r0 = Math.min(e.r0, x.r0); e.r1 = Math.max(e.r1, x.r1);
  });
  return e;
}

// pin de um painel no palco (com o grupo) e o giro final dele: para a linha "No palco" do cartão
export function pinNoPalco(t) { var P = pivo(t); return [P[0], P[1], -P[2] || 0]; }
export function giroNoPalco(t) { return pai(t) ? deMatriz(matriz(t)) : { rx: t.rx || 0, ry: t.ry || 0, rz: t.rz || 0 }; }
export { PIVOS, limpaPivo };
