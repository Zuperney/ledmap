// Duplicar várias: o painel (ou o grupo inteiro) copiado N vezes de uma vez, em linha ou em grade, com espaço entre as
// cópias. O passo é o tamanho do conjunto no palco (com giro e grupo) mais o espaço; ex.: uma borda de campo feita de um
// trecho de 5 m copiado 21 vezes para a direita. As contas de onde cada cópia vai estão em deslocamentos().
import { selected } from "./core.js";
import { tById } from "./exportar.js";
import { pnome } from "./core.js";
import { duplicarEm, medidaNoPalco } from "./telas.js";
import { grupoAberto } from "./rig-cartao.js";
import { membrosPainel } from "./core.js";

function $(id) { return document.getElementById(id); }
function num(id, d) { var v = Number(String($(id).value).replace(",", ".")); return isFinite(v) ? v : d; }
function fmt(v) { return String(Math.round(v * 1000) / 1000).replace(".", ","); }

// deslocamentos [dx, dy, dRecuo] de cada cópia. m = { w, h, d } (tamanho no palco).
// linha: n cópias numa direção; grade: colunas para a direita × linhas para cima ou para trás (o original é a primeira).
export function deslocamentos(m, o) {
  var out = [];
  if (o.grade) {
    var sx = m.w + o.gx, sl = (o.gdir === "tras" ? m.d : m.h) + o.gy;
    for (var r = 0; r < o.rows; r++) for (var c = 0; c < o.cols; c++) {
      if (!r && !c) continue;
      out.push(o.gdir === "tras" ? [c * sx, 0, r * sl] : [c * sx, r * sl, 0]);
    }
    return out;
  }
  var P = { dir: [m.w + o.gap, 0, 0], esq: [-(m.w + o.gap), 0, 0], cima: [0, m.h + o.gap, 0], tras: [0, 0, m.d + o.gap], frente: [0, 0, -(m.d + o.gap)] }[o.dir] || [m.w + o.gap, 0, 0];
  for (var i = 1; i <= o.n; i++) out.push([P[0] * i, P[1] * i, P[2] * i]);
  return out;
}

var alvo = null, grade = false;
function opcoes() {
  return { grade: grade, n: Math.max(1, Math.min(99, Math.round(num("dup-n", 1)))), dir: $("dup-dir").value, gap: num("dup-gap", 0),
    cols: Math.max(1, Math.min(50, Math.round(num("dup-cols", 1)))), rows: Math.max(1, Math.min(50, Math.round(num("dup-rows", 1)))),
    gdir: $("dup-gdir").value, gx: num("dup-gx", 0), gy: num("dup-gy", 0) };
}
function prever() {
  var m = alvo && medidaNoPalco(alvo);
  if (!m) return;
  $("dup-linha").setAttribute("aria-pressed", String(!grade));
  $("dup-grade").setAttribute("aria-pressed", String(grade));
  $("dup-box-linha").hidden = grade;
  $("dup-box-grade").hidden = !grade;
  $("dup-juntar-fld").hidden = !!m.grupo; // grupo dentro de grupo não existe
  var o = opcoes(), d = deslocamentos(m, o), ult = d[d.length - 1] || [0, 0, 0];
  var fim = { w: m.w + Math.abs(grade ? ult[0] : (o.dir === "dir" || o.dir === "esq" ? ult[0] : 0)), h: m.h + (grade && o.gdir !== "tras" ? ult[1] : !grade && o.dir === "cima" ? ult[1] : 0) };
  $("dup-prev").textContent = d.length + " cópia(s) · " + (d.length + 1) * m.n + " painéis no total · o conjunto fica com " + fmt(fim.w) + " × " + fmt(fim.h) + " m" +
    (m.d > 0.005 || (grade && o.gdir === "tras") || o.dir === "tras" || o.dir === "frente" ? " (de frente)" : "");
}

export function abrirDuplicarVarias(id) {
  var t = id && tById[id];
  if (!t) return;
  alvo = id;
  var m = medidaNoPalco(id);
  $("dup-sub").textContent = (m.grupo ? pnome(m.grupo) + " (" + m.n + " painéis)" : t.name) + " · " + fmt(m.w) + " × " + fmt(m.h) + " m no palco" + (m.d > 0.005 ? " · fundo " + fmt(m.d) + " m" : "") + ". As cópias ficam iguais ao original (giro, pin e gabinete).";
  $("dup-err").textContent = "";
  prever();
  $("dup-modal").hidden = false;
  $("dup-n").focus();
}

export function init() {
  $("dup-linha").addEventListener("click", function () { grade = false; prever(); });
  $("dup-grade").addEventListener("click", function () { grade = true; prever(); });
  ["dup-n", "dup-dir", "dup-gap", "dup-cols", "dup-rows", "dup-gdir", "dup-gx", "dup-gy"].forEach(function (id) { $(id).addEventListener("input", prever); });
  $("dup-cancel").addEventListener("click", function () { $("dup-modal").hidden = true; });
  $("dup-modal").addEventListener("click", function (e) { if (e.target === $("dup-modal")) $("dup-modal").hidden = true; });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") $("dup-modal").hidden = true; });
  $("dup-ok").addEventListener("click", function () {
    var m = alvo && medidaNoPalco(alvo);
    if (!m) return;
    var o = opcoes();
    if (o.grade && o.cols * o.rows < 2) { $("dup-err").textContent = "A grade precisa de pelo menos 2 lugares (o original e uma cópia)."; return; }
    var erro = duplicarEm(alvo, deslocamentos(m, o), $("dup-juntar").checked && !m.grupo);
    if (erro) $("dup-err").textContent = erro;
  });
  $("m-dupv").addEventListener("click", function () { if (selected) abrirDuplicarVarias(selected); });
  $("mc-gdupv").addEventListener("click", function () { var m = membrosPainel(grupoAberto()); if (m.length) abrirDuplicarVarias(m[0].id); });
}
