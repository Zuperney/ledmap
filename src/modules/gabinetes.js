// Biblioteca de gabinetes (semente herdada do LED Lab Core).
// rx/ry = pixels do gabinete, mw/mh = tamanho em metros, peso em kg, pw = potência máx. em W.
// Confira sempre no datasheet do fabricante antes de dimensionar um evento real.
export const GABINETES = [
  { id: "1",  marca: "ROE",         nome: "ROE CB5 Outdoor",       rx: 104, ry: 208, mw: 0.6,   mh: 1.2,   peso: 13.5, pw: 650 },
  { id: "2",  marca: "Absen",       nome: "Absen A2.9 Pro",        rx: 256, ry: 144, mw: 0.745, mh: 0.419, peso: 6.2,  pw: 250 },
  { id: "3",  marca: "Unilumin",    nome: "Unilumin Upanel 2.6",   rx: 192, ry: 192, mw: 0.5,   mh: 0.5,   peso: 8.0,  pw: 200 },
  { id: "4",  marca: "ROE",         nome: "ROE Black Pearl BP2",   rx: 176, ry: 176, mw: 0.5,   mh: 0.5,   peso: 9.35, pw: 190 },
  { id: "5",  marca: "Absen",       nome: "Absen PL3.9 Pro",       rx: 128, ry: 128, mw: 0.5,   mh: 0.5,   peso: 8.4,  pw: 200 },
  { id: "6",  marca: "INFiLED",     nome: "INFiLED ER5.9",         rx: 84,  ry: 84,  mw: 0.5,   mh: 0.5,   peso: 11.0, pw: 600 },
  { id: "7",  marca: "Absen",       nome: "Absen Polaris PL2.5",   rx: 200, ry: 200, mw: 0.5,   mh: 0.5,   peso: 8.5,  pw: 280 },
  { id: "8",  marca: "Unilumin",    nome: "Unilumin Uslim II 2.6", rx: 192, ry: 192, mw: 0.5,   mh: 0.5,   peso: 6.8,  pw: 220 },
  { id: "9",  marca: "INFiLED",     nome: "INFiLED AL4",           rx: 128, ry: 128, mw: 0.5,   mh: 0.5,   peso: 9.5,  pw: 400 },
  { id: "10", marca: "Leyard",      nome: "Leyard TWS II 2.5",     rx: 192, ry: 108, mw: 0.48,  mh: 0.27,  peso: 7.2,  pw: 210 },
  { id: "11", marca: "Samsung",     nome: "Samsung IF025 2.5",     rx: 192, ry: 192, mw: 0.48,  mh: 0.48,  peso: 12.0, pw: 200 },
  { id: "12", marca: "LianTronics", nome: "LianTronics VD3.9",     rx: 128, ry: 128, mw: 0.5,   mh: 0.5,   peso: 8.8,  pw: 350 },
  { id: "13", marca: "Desay",       nome: "Desay S3 3.0",          rx: 168, ry: 168, mw: 0.5,   mh: 0.5,   peso: 7.0,  pw: 230 },
  { id: "14", marca: "Absen",       nome: "Absen AX3.9 Pro",       rx: 128, ry: 128, mw: 0.5,   mh: 0.5,   peso: 8.9,  pw: 330 },
  { id: "15", marca: "ROE",         nome: "ROE Ruby RB2.3",        rx: 216, ry: 216, mw: 0.5,   mh: 0.5,   peso: 8.16, pw: 180 },
  { id: "16", marca: "Unilumin",    nome: "Unilumin UpadIV 3.9",   rx: 128, ry: 128, mw: 0.5,   mh: 0.5,   peso: 9.0,  pw: 360 }
];

export const GAB = {};
GABINETES.forEach(function (g) { GAB[g.id] = g; });

// Gabinete padrão por tipo de tela (projetos antigos e telas sem gabinete escolhido).
export const CAB_PADRAO = { imag: "6", up: "6", c: "5" };

export function cabDe(t) { return GAB[t.cab] || GAB[CAB_PADRAO[t.kind]] || GAB["6"]; }
export function cabNome(t) { return cabDe(t).nome; }
