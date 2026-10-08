// Regras de sinal: quantos pixels cabem numa porta (Gigabit) conforme bits e Hz.
// Base do LLC: 8 bits = 655.360 px, 10 bits = 327.680 px, ambos a 60 Hz.
// Outros bits: estimativa proporcional (655.360 × 8 / bits). Edite "px por porta" para o valor do seu processador.
export const SINAL_PADRAO = { bits: 8, hz: 60, cap: 0 };
export const MAX_PORTAS_PADRAO = 20;

export function capSugerida(bits) {
  if (bits === 8) return 655360;
  if (bits === 10) return 327680;
  return Math.round(655360 * 8 / bits);
}

function num(v, lo, hi, def) { v = Number(v); return isFinite(v) && v >= lo && v <= hi ? v : def; }

export function limpaSinal(c) {
  c = c && typeof c === "object" ? c : {};
  return { bits: Math.round(num(c.bits, 6, 16, 8)), hz: Math.round(num(c.hz, 24, 240, 60)), cap: Math.round(num(c.cap, 0, 10000000, 0)) };
}

export function limitePx(c) {
  c = limpaSinal(c);
  return Math.max(1, Math.floor((c.cap > 0 ? c.cap : capSugerida(c.bits)) * 60 / c.hz));
}

export function limpaMax(v) { return Math.round(num(v, 1, 256, MAX_PORTAS_PADRAO)); }
