// Cálculo elétrico (funções puras), portado do LED Lab Core.
// Dimensiona SEMPRE pelo consumo máximo. O app entrega corrente e kVA; a proteção é dimensionada pelo eletricista do quadro.
var SQRT3 = Math.sqrt(3);

export var FASE_V = 220; // tensão de cada circuito de gabinete (F+N a 220 V)

// div = divisor de corrente (I = S / div); ph = nº de fases; g = grupo de tensão
export var VOLT = {
  "220_bi":   { div: 220,         label: "Bifásico (F+F)",      ph: 2, g: "220" },
  "220_tri":  { div: 220 * SQRT3, label: "Trifásico (F+F+F)",   ph: 3, g: "220" },
  "380_mono": { div: 220,         label: "Monofásico (F+N)",    ph: 1, g: "380" },
  "380_bi":   { div: 440,         label: "Bifásico (F+F+N)",    ph: 2, g: "380" },
  "380_tri":  { div: 380 * SQRT3, label: "Trifásico (F+F+F+N)", ph: 3, g: "380" }
};

export function voltNome(vk) { var v = VOLT[vk] || VOLT["220_tri"]; return v.g + " V · " + v.label; }

// fase do cabo n (1 em diante): rodízio que reinicia a cada Screen
export function phaseOf(n, vc) {
  if (!vc || !(n >= 1)) return null;
  if (vc.ph === 3) { var seq = vc.g === "220" ? ["RS", "ST", "TR"] : ["R", "S", "T"]; return seq[(n - 1) % 3]; }
  if (vc.ph === 2 && vc.g === "380") return ["R", "S"][(n - 1) % 2];
  return null;
}

// corrente somada por fase (o par RS soma em R e em S)
export function phaseBalance(cabos, vc) {
  var letras = ["R", "S", "T"].slice(0, vc && vc.ph === 3 ? 3 : vc && vc.ph === 2 && vc.g === "380" ? 2 : 0);
  if (!letras.length) return [];
  var acc = {};
  letras.forEach(function (f) { acc[f] = { fase: f, cabos: 0, A: 0 }; });
  cabos.forEach(function (c) {
    var f = phaseOf(c.n, vc);
    if (!f) return;
    f.split("").forEach(function (l) { acc[l].cabos += 1; acc[l].A += c.A || 0; });
  });
  return letras.map(function (f) { return { fase: f, cabos: acc[f].cabos, A: Math.round(acc[f].A * 10) / 10 }; });
}

// regra dos 80% (carga contínua): acima de 80% atenção, acima de 100% estouro
export function acTone(pct) { return pct > 100 ? "over" : pct > 80 ? "warn" : "ok"; }

export function ampCab(g) { return g.pw / (FASE_V * g.fp); }

// consumo típico por gabinete: preto + (máx − preto) × brilho × conteúdo
export function typicalPerTile(pw, pb, brilho, conteudo) {
  var max = Math.max(0, Number(pw) || 0);
  if (max <= 0) return 0;
  var black = Number(pb) || 0;
  if (black <= 0 || black >= max) black = max * 0.15;
  var c01 = function (n) { return Math.min(1, Math.max(0, Number(n))); };
  return black + (max - black) * c01(brilho) * c01(conteudo);
}

// divide a sequência de células em cabos contíguos e equilibrados, nenhum acima do limite (A)
export function dividirPorAmp(cels, limiteA) {
  var L = cels.length;
  if (!L) return [];
  var total = cels.reduce(function (a, c) { return a + c.a; }, 0);
  for (var n = Math.max(1, Math.ceil(total / Math.max(limiteA, 0.1) - 1e-9)); n <= L; n++) {
    var base = Math.floor(L / n), extra = L - base * n, out = [], i = 0, ok = true;
    for (var k = 0; k < n; k++) {
      var size = base + (k < extra ? 1 : 0), seg = cels.slice(i, i + size);
      i += size;
      if (seg.reduce(function (a, c) { return a + c.a; }, 0) > limiteA + 1e-9 && seg.length > 1) ok = false;
      out.push(seg);
    }
    if (ok) return out;
  }
  return cels.map(function (c) { return [c]; });
}
