// Campos numéricos do cartão do Rig: rodinha do mouse e régua de escalas (como o "virtual slider" do TouchDesigner).
// - Rodinha em cima do campo: muda o valor e aplica na hora (o desenho, o 3D e o cabeamento acompanham).
//   Passo normal 1 cm (ou 1°); Shift = 10 cm (15°); Alt = 1 mm (0,1°). Largura/altura andam de um gabinete
//   e só gravam quando a rodinha para (mudar o tamanho refaz o painel).
// - Clique longo (ou botão do meio): abre a régua — 1 m · 10 cm · 1 cm · 1 mm (giro: 45° · 15° · 1° · 0,1°).
//   Subir ou descer escolhe a escala; arrastar para os lados muda o valor, ao vivo. Soltar fecha.
// Os campos aplicam pelo evento "change" de sempre (os mesmos caminhos de digitar e dar Enter).
import { selected, res } from "./core.js";
import { tById } from "./exportar.js";

var ESCALAS = {
  m: [[1, "1 m"], [0.1, "10 cm"], [0.01, "1 cm"], [0.001, "1 mm"]],
  g: [[45, "45°"], [15, "15°"], [1, "1°"], [0.1, "0,1°"]]
};
// tipo de cada campo: m = metros, g = graus, w/h = tamanho (anda de gabinete em gabinete)
var CAMPOS = { "m-x": "m", "m-y": "m", "mc-z": "m", "mc-rx": "g", "mc-ry": "g", "mc-rz": "g", "mc-w": "w", "mc-h": "h" };
var LINHA = 30, PX_POR_PASSO = 8;

function num(inp) { var v = Number(String(inp.value || 0).replace(",", ".")); return isFinite(v) ? v : 0; }
function arred(v, passo) { var d = passo < 1 ? Math.round(-Math.log10(passo)) : 0; return Number(v.toFixed(Math.min(3, d + 1))); }

// aplica: os campos vivos na hora (agrupado por quadro); largura/altura quando a rodinha para
var quadro = 0, adiado = null;
function aplicar(inp, vivo) {
  if (vivo) {
    if (quadro) return;
    quadro = requestAnimationFrame(function () { quadro = 0; inp.dispatchEvent(new Event("change", { bubbles: true })); });
  } else {
    clearTimeout(adiado);
    adiado = setTimeout(function () { inp.dispatchEvent(new Event("change", { bubbles: true })); }, 700);
  }
}

function passoGabinete(tipo) {
  var t = selected && tById[selected];
  if (!t) return 0;
  var q = res(t);
  return tipo === "w" ? q.mw : q.mh;
}

function rodinha(inp, tipo, e) {
  e.preventDefault();
  var dir = e.deltaY < 0 ? 1 : -1, passo;
  if (tipo === "w" || tipo === "h") {
    passo = passoGabinete(tipo);
    if (!passo) return;
    inp.value = arred(Math.max(passo, num(inp) + dir * passo), 0.001);
    aplicar(inp, false);
    return;
  }
  passo = tipo === "g" ? (e.shiftKey ? 15 : e.altKey ? 0.1 : 1) : (e.shiftKey ? 0.1 : e.altKey ? 0.001 : 0.01);
  inp.value = arred(num(inp) + dir * passo, passo);
  aplicar(inp, true);
}

// ---- régua de escalas ----
var regua = null;
function abrirRegua(inp, tipo, e) {
  var esc = ESCALAS[tipo], el = document.createElement("div");
  el.className = "regua";
  var cab = document.createElement("div"); cab.className = "regua-v"; el.appendChild(cab);
  var linhas = esc.map(function (s) { var l = document.createElement("div"); l.className = "regua-l"; l.textContent = s[1]; el.appendChild(l); return l; });
  document.body.appendChild(el);
  var ini = 2; // começa em 1 cm (ou 1°)
  el.style.left = Math.max(4, e.clientX - 46) + "px";
  el.style.top = Math.max(4, e.clientY - LINHA * (ini + 1) - LINHA / 2) + "px";
  inp.blur();
  regua = { inp: inp, tipo: tipo, esc: esc, el: el, cab: cab, linhas: linhas, y0: e.clientY, ini: ini, linha: ini, x0: e.clientX, base: num(inp) };
  marcar();
}
function marcar() {
  var r = regua;
  r.linhas.forEach(function (l, i) { l.classList.toggle("on", i === r.linha); });
  r.cab.textContent = r.inp.value + (r.tipo === "g" ? "°" : " m");
}
function moverRegua(e) {
  var r = regua, l = Math.max(0, Math.min(r.esc.length - 1, r.ini + Math.round((e.clientY - r.y0) / LINHA)));
  if (l !== r.linha) { r.base = num(r.inp); r.x0 = e.clientX; r.linha = l; } // trocou de escala: continua do valor atual
  var passo = r.esc[l][0], v = arred(r.base + Math.round((e.clientX - r.x0) / PX_POR_PASSO) * passo, passo);
  if (String(v) !== String(r.inp.value)) { r.inp.value = v; aplicar(r.inp, true); }
  marcar();
}
function fecharRegua() { if (!regua) return; regua.el.remove(); regua = null; }

function ligar(inp, tipo) {
  inp.addEventListener("wheel", function (e) { rodinha(inp, tipo, e); }, { passive: false });
  if (!ESCALAS[tipo]) return; // largura/altura: só a rodinha
  inp.title = (inp.title ? inp.title + " · " : "") + "Rodinha muda o valor (Shift maior, Alt fino) · clique longo abre a régua de escalas";
  var espera = null, p0 = null;
  inp.addEventListener("pointerdown", function (e) {
    if (e.button === 1) { e.preventDefault(); inp.setPointerCapture(e.pointerId); abrirRegua(inp, tipo, e); return; } // botão do meio: na hora
    if (e.button !== 0) return;
    p0 = { x: e.clientX, y: e.clientY, id: e.pointerId };
    clearTimeout(espera);
    espera = setTimeout(function () { espera = null; try { inp.setPointerCapture(p0.id); } catch (er) {} abrirRegua(inp, tipo, { clientX: p0.x, clientY: p0.y }); }, 350);
  });
  inp.addEventListener("pointermove", function (e) {
    if (regua && regua.inp === inp) { moverRegua(e); return; }
    if (espera && p0 && Math.hypot(e.clientX - p0.x, e.clientY - p0.y) > 5) { clearTimeout(espera); espera = null; } // arrastou: é seleção de texto
  });
  function fim() { clearTimeout(espera); espera = null; if (regua && regua.inp === inp) fecharRegua(); }
  inp.addEventListener("pointerup", fim);
  inp.addEventListener("pointercancel", fim);
  inp.addEventListener("contextmenu", function (e) { if (regua) e.preventDefault(); }); // toque longo no celular
}

export function init() {
  Object.keys(CAMPOS).forEach(function (id) { var inp = document.getElementById(id); if (inp) ligar(inp, CAMPOS[id]); });
}
