// Grupo como um painel só: o grupo tem giro próprio (rx, ry, rz) e uma caixa no quadro dele, cujo centro é o pivô.
// Mover o grupo desloca todos os painéis; girar o grupo gira cada painel em volta desse centro (o giro de cada um
// soma o do grupo). Contas em espaco.js (girarConjunto, caixaConjunto).
import { painelById, membrosPainel, gravarVivo, mnum } from "./core.js";
import { matrizDe, multiplicar, girarConjunto, caixaConjunto, deMatriz, extensao } from "./espaco.js";

export function rotGrupo(p) { return matrizDe(p.rx || 0, p.ry || 0, p.rz || 0); }

// { centro, w, h, d }: a caixa no quadro do grupo (w × h × profundidade) e o centro dela no palco
export function caixaGrupo(pn) {
  var p = painelById(pn), m = membrosPainel(pn);
  return p && m.length ? caixaConjunto(m, rotGrupo(p)) : null;
}

// desloca o grupo no palco: d = [dx, dy, dZ] (Z para o público; o recuo é o contrário)
export function moverGrupo(pn, d) {
  var m = membrosPainel(pn);
  m.forEach(function (t) { t.mx = mnum(t.mx + d[0]); t.my = mnum(t.my + d[1]); t.z = mnum((t.z || 0) - d[2]) || 0; });
  gravarVivo(m);
  return m;
}

// gira o grupo pela matriz Rd (eixos do palco) em volta do centro da caixa dele
export function girarGrupo(pn, Rd) {
  var p = painelById(pn), m = membrosPainel(pn), cx = caixaGrupo(pn);
  if (!p || !cx) return [];
  girarConjunto(m, Rd, cx.centro).forEach(function (n, i) {
    var t = m[i];
    t.mx = mnum(n.mx); t.my = mnum(n.my); t.z = mnum(n.z) || 0; t.rx = n.rx; t.ry = n.ry; t.rz = n.rz;
  });
  var g = deMatriz(multiplicar(Rd, rotGrupo(p)));
  p.rx = g.rx; p.ry = g.ry; p.rz = g.rz;
  gravarVivo(m);
  return m;
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
