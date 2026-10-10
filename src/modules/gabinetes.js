// Biblioteca de gabinetes: global (vale para todos os projetos deste aparelho) e editável.
// A semente veio do LED Lab Core. Cada projeto guarda também a definição dos gabinetes que usa,
// para não perder nada ao abrir em outro aparelho ou depois de uma exclusão aqui.
// rx/ry = pixels do gabinete, mw/mh = tamanho em metros, peso em kg, pw = potência máx. em W,
// pb = consumo no preto (W), fp = fator de potência, conector/amp = conector de energia e corrente nominal (A).
// Confira sempre no datasheet do fabricante antes de dimensionar um evento real.
const SEMENTE = [
  { id: "1",  marca: "ROE",         nome: "ROE CB5 Outdoor",       rx: 104, ry: 208, mw: 0.6,   mh: 1.2,   peso: 13.5, pw: 650, pb: 98, fp: 0.9, conector: "PowerCON TRUE1", amp: 16 },
  { id: "2",  marca: "Absen",       nome: "Absen A2.9 Pro",        rx: 256, ry: 144, mw: 0.745, mh: 0.419, peso: 6.2,  pw: 250, pb: 50, fp: 0.85, conector: "PowerCON TRUE1", amp: 16 },
  { id: "3",  marca: "Unilumin",    nome: "Unilumin Upanel 2.6",   rx: 192, ry: 192, mw: 0.5,   mh: 0.5,   peso: 8.0,  pw: 200, pb: 42, fp: 0.9, conector: "PowerCON TRUE1", amp: 16 },
  { id: "4",  marca: "ROE",         nome: "ROE Black Pearl BP2",   rx: 176, ry: 176, mw: 0.5,   mh: 0.5,   peso: 9.35, pw: 190, pb: 30, fp: 0.9, conector: "PowerCON TRUE1", amp: 16 },
  { id: "5",  marca: "Absen",       nome: "Absen PL3.9 Pro",       rx: 128, ry: 128, mw: 0.5,   mh: 0.5,   peso: 8.4,  pw: 200, pb: 30, fp: 0.92, conector: "PowerCON Azul/Branco", amp: 20 },
  { id: "6",  marca: "INFiLED",     nome: "INFiLED ER5.9",         rx: 84,  ry: 84,  mw: 0.5,   mh: 0.5,   peso: 11.0, pw: 600, pb: 90, fp: 0.9, conector: "PowerCON Azul/Branco", amp: 20 },
  { id: "7",  marca: "Absen",       nome: "Absen Polaris PL2.5",   rx: 200, ry: 200, mw: 0.5,   mh: 0.5,   peso: 8.5,  pw: 280, pb: 45, fp: 0.9, conector: "PowerCON TRUE1", amp: 16 },
  { id: "8",  marca: "Unilumin",    nome: "Unilumin Uslim II 2.6", rx: 192, ry: 192, mw: 0.5,   mh: 0.5,   peso: 6.8,  pw: 220, pb: 40, fp: 0.9, conector: "PowerCON TRUE1", amp: 16 },
  { id: "9",  marca: "INFiLED",     nome: "INFiLED AL4",           rx: 128, ry: 128, mw: 0.5,   mh: 0.5,   peso: 9.5,  pw: 400, pb: 60, fp: 0.9, conector: "PowerCON Azul/Branco", amp: 20 },
  { id: "10", marca: "Leyard",      nome: "Leyard TWS II 2.5",     rx: 192, ry: 108, mw: 0.48,  mh: 0.27,  peso: 7.2,  pw: 210, pb: 38, fp: 0.92, conector: "PowerCON TRUE1", amp: 16 },
  { id: "11", marca: "Samsung",     nome: "Samsung IF025 2.5",     rx: 192, ry: 192, mw: 0.48,  mh: 0.48,  peso: 12.0, pw: 200, pb: 42, fp: 0.95, conector: "PowerCON TRUE1", amp: 16 },
  { id: "12", marca: "LianTronics", nome: "LianTronics VD3.9",     rx: 128, ry: 128, mw: 0.5,   mh: 0.5,   peso: 8.8,  pw: 350, pb: 55, fp: 0.9, conector: "PowerCON Azul/Branco", amp: 20 },
  { id: "13", marca: "Desay",       nome: "Desay S3 3.0",          rx: 168, ry: 168, mw: 0.5,   mh: 0.5,   peso: 7.0,  pw: 230, pb: 45, fp: 0.9, conector: "PowerCON TRUE1", amp: 16 },
  { id: "14", marca: "Absen",       nome: "Absen AX3.9 Pro",       rx: 128, ry: 128, mw: 0.5,   mh: 0.5,   peso: 8.9,  pw: 330, pb: 50, fp: 0.92, conector: "PowerCON Azul/Branco", amp: 20 },
  { id: "15", marca: "ROE",         nome: "ROE Ruby RB2.3",        rx: 216, ry: 216, mw: 0.5,   mh: 0.5,   peso: 8.16, pw: 180, pb: 27, fp: 0.9, conector: "PowerCON TRUE1", amp: 16 },
  { id: "16", marca: "Unilumin",    nome: "Unilumin UpadIV 3.9",   rx: 128, ry: 128, mw: 0.5,   mh: 0.5,   peso: 9.0,  pw: 360, pb: 55, fp: 0.9, conector: "PowerCON Azul/Branco", amp: 20 }
];
const LSTORE = "ledmap-gabinetes";

function num(v, lo, hi, d) { v = Number(v); return isFinite(v) && v >= lo && v <= hi ? v : d; }

// valida um gabinete; null se faltar o essencial (id, nome, pixels e tamanho)
export function limpaGab(g) {
  if (!g || typeof g !== "object") return null;
  var id = String(g.id == null ? "" : g.id);
  if (!/^[\w-]{1,24}$/.test(id)) return null;
  var nome = typeof g.nome === "string" ? g.nome.trim().slice(0, 60) : "";
  var rx = Math.round(num(g.rx, 1, 4096, 0)), ry = Math.round(num(g.ry, 1, 4096, 0));
  var mw = num(g.mw, 0.05, 5, 0), mh = num(g.mh, 0.05, 5, 0);
  if (!nome || !rx || !ry || !mw || !mh) return null;
  return {
    id: id, marca: typeof g.marca === "string" ? g.marca.trim().slice(0, 40) : "", nome: nome,
    rx: rx, ry: ry, mw: Math.round(mw * 10000) / 10000, mh: Math.round(mh * 10000) / 10000,
    peso: num(g.peso, 0, 500, 0), pw: num(g.pw, 0, 10000, 0), pb: num(g.pb, 0, 10000, 0), fp: num(g.fp, 0.3, 1, 0.9),
    conector: typeof g.conector === "string" ? g.conector.trim().slice(0, 40) : "", amp: num(g.amp, 1, 125, 16)
  };
}

function carregar() {
  try {
    var l = JSON.parse(localStorage.getItem(LSTORE) || "null");
    if (Array.isArray(l)) return l.map(limpaGab).filter(Boolean); // lista vazia vale: a biblioteca pode ter sido limpa
  } catch (e) {}
  return SEMENTE.map(function (g) { return Object.assign({}, g); });
}

export const GABINETES = carregar();
export const GAB = {};
function reindexar() { Object.keys(GAB).forEach(function (k) { delete GAB[k]; }); GABINETES.forEach(function (g) { GAB[g.id] = g; }); }
reindexar();

function gravar() { try { localStorage.setItem(LSTORE, JSON.stringify(GABINETES)); return true; } catch (e) { return false; } }

// cria ou atualiza (mesmo id); devolve o gabinete salvo ou null
export function salvarGab(g) {
  var c = limpaGab(g);
  if (!c) return null;
  var i = GABINETES.findIndex(function (x) { return x.id === c.id; });
  if (i >= 0) GABINETES[i] = c; else GABINETES.push(c);
  reindexar(); gravar();
  return c;
}

export function removerGab(id) {
  var i = GABINETES.findIndex(function (x) { return x.id === id; });
  if (i < 0) return false;
  GABINETES.splice(i, 1);
  reindexar(); gravar();
  return true;
}

// tira da biblioteca todos os gabinetes fora de "manter" (os usados no projeto aberto); devolve quantos saíram
export function limparGabs(manter) {
  var antes = GABINETES.length, fica = GABINETES.filter(function (g) { return manter[g.id]; });
  GABINETES.length = 0;
  fica.forEach(function (g) { GABINETES.push(g); });
  reindexar(); gravar();
  return antes - fica.length;
}

// devolve os gabinetes de fábrica que faltam (os que você editou ficam como estão); devolve quantos voltaram
export function restaurarFabrica() {
  var n = 0;
  SEMENTE.forEach(function (g) { if (!GAB[g.id]) { GABINETES.push(Object.assign({}, g)); n++; } });
  if (n) { reindexar(); gravar(); }
  return n;
}

export function novoIdGab() { return "u" + Date.now().toString(36); }

// gabinetes que um projeto traz e a biblioteca deste aparelho não tem: entram na biblioteca
export function garantirGabs(lista) {
  var n = 0;
  (Array.isArray(lista) ? lista : []).forEach(function (g) {
    var c = limpaGab(g);
    if (c && !GAB[c.id]) { GABINETES.push(c); n++; }
  });
  if (n) { reindexar(); gravar(); }
  return n;
}

// Gabinete padrão por tipo de painel (projetos antigos e painéis sem gabinete escolhido).
export const CAB_PADRAO = { imag: "6", up: "6", c: "5" };

// com a biblioteca vazia, um painel sem gabinete conhecido usa a semente (e o projeto passa a guardá-la)
export function gabPadrao() { return GAB["5"] || GABINETES[0] || SEMENTE[4]; }
export function cabDe(t) { return GAB[t.cab] || GAB[CAB_PADRAO[t.kind]] || gabPadrao(); }
export function cabNome(t) { return cabDe(t).nome; }

// Cor fixa por modelo de gabinete (pelo id, não pela posição na lista): num painel misto dá para ver onde o gabinete muda.
export function corGab(id) {
  var s = String(id), h = 0;
  if (/^\d+$/.test(s)) h = Number(s) - 1;
  else for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997;
  return "hsl(" + Math.round((h * 137.508 + 205) % 360) + ", 68%, 50%)";
}
export function corCab(t) { return corGab(cabDe(t).id); }

export function pitchMm(g) { return Math.round(g.mw / g.rx * 100000) / 100; }
