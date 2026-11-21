// Blocos no mapa de pixels, na Screen (contas em blocos.js): o cartão do painel mostra os blocos com o lugar de cada um
// no canvas (X, Y editáveis) e os botões Dividir em blocos…, Empilhar, Lado a lado e Juntar. A janela de dividir pede
// quantos gabinetes (colunas e linhas) cada bloco tem — o técnico decide; "Sugerir" calcula pelo limite de pixels de uma
// porta de cabo. Mudar blocos grava e recarrega (como o recorte): Screen, cabeamento e composição se refazem.
import { tiles, res, EXTRAS, blocosDe, nf, selected } from "./core.js";
import { limpaBlocos, lerTamanhos, sugerirColunas, arranjar, deslocar } from "./blocos.js";
import { limiteTela } from "./cabeamento.js";
import { commitAndReload } from "./telas.js";
import { curTab } from "./abas.js";
import { pmsg } from "./exportar.js";

function $(id) { return document.getElementById(id); }
function painel(id) { return tiles.filter(function (t) { return t.id === id; })[0]; }

// grava os blocos novos do painel (ou nenhum) e recarrega
function gravar(t, bl, msg) {
  var i = EXTRAS.findIndex(function (x) { return x.id === t.id; });
  if (i < 0) return;
  var antes = EXTRAS[i].bl;
  EXTRAS[i].bl = bl ? limpaBlocos(bl, res(t)) : null;
  try { localStorage.setItem("ledmap-msg", msg); } catch (e) {}
  if (!commitAndReload(curTab + ":" + t.id)) { EXTRAS[i].bl = antes; try { localStorage.removeItem("ledmap-msg"); } catch (e) {} pmsg("Não consegui salvar neste navegador."); }
}

export function renderBlocos(t) {
  var box = $("cc-blocos");
  if (!box) return;
  var bls = blocosDe(t), q = res(t), lista = $("cc-bl-lista");
  $("cc-bl-info").textContent = bls.length > 1 ? bls.length + " blocos" : "um bloco só (o painel inteiro)";
  ["cc-bl-pilha", "cc-bl-lado", "cc-bl-juntar"].forEach(function (id) { $(id).hidden = bls.length < 2; });
  $("cc-bl-dividir").textContent = bls.length > 1 ? "Redividir…" : "Dividir em blocos…";
  lista.textContent = "";
  if (bls.length < 2) return;
  bls.forEach(function (b, bi) {
    var l = document.createElement("div"); l.className = "cc-bl";
    var n = document.createElement("b"); n.textContent = t.id + "·" + (bi + 1);
    var md = document.createElement("span"); md.className = "md"; md.textContent = (b.c1 - b.c0) + "×" + (b.r1 - b.r0) + " gab · " + nf(b.w) + "×" + nf(b.h) + " px";
    l.appendChild(n); l.appendChild(md);
    ["x", "y"].forEach(function (k) {
      var lab = document.createElement("label"), inp = document.createElement("input");
      lab.textContent = k.toUpperCase() + " ";
      inp.type = "number"; inp.step = "1"; inp.inputMode = "numeric"; inp.value = b[k];
      inp.setAttribute("aria-label", "Bloco " + (bi + 1) + ": " + k.toUpperCase() + " no canvas (px)");
      inp.addEventListener("change", function () {
        var v = Math.round(Number(inp.value));
        if (!isFinite(v)) return;
        var x = k === "x" ? v : b.x, y = k === "y" ? v : b.y, bl = JSON.parse(JSON.stringify(t.bl));
        bl.d[bi] = deslocar(b, x, y);
        gravar(t, bl, "Bloco " + t.id + "·" + (bi + 1) + " em " + x + ", " + y + ".");
      });
      lab.appendChild(inp); l.appendChild(lab);
    });
    lista.appendChild(l);
  });
}

// ---- janela de dividir ----
var alvo = null;
function opcoes() {
  var t = painel(alvo), q = res(t);
  return { t: t, q: q, cols: lerTamanhos($("bl-cols").value, q.cols), rows: lerTamanhos($("bl-rows").value || String(q.rows), q.rows), modo: $("bl-modo").value };
}
function prever() {
  var o = opcoes(), lim = limiteTela(o.t), porGab = o.q.cw * o.q.ch;
  if (!o.cols || !o.rows) { $("bl-prev").textContent = "Use um número (gabinetes por bloco) ou uma lista que some " + o.q.cols + " colunas e " + o.q.rows + " linhas (ex.: 32, 32, 30)."; return; }
  var n = o.cols.length * o.rows.length, maior = Math.max.apply(null, o.cols) * Math.max.apply(null, o.rows) * porGab;
  $("bl-prev").textContent = (n < 2 ? "Um bloco só: nada para dividir." : n + " blocos · colunas " + o.cols.join(" + ") + " · linhas " + o.rows.join(" + ")) +
    " · o maior bloco tem " + nf(maior) + " px" + (maior > lim ? " (passa do limite de uma porta, " + nf(lim) + " px: vai precisar de mais de uma porta)" : " (cabe numa porta de " + nf(lim) + " px)");
}
export function abrirDividir(id) {
  var t = painel(id);
  if (!t) return;
  alvo = id;
  var q = res(t);
  $("bl-sub").textContent = t.name + " · " + q.cols + " × " + q.rows + " gabinetes · " + nf(q.w) + " × " + nf(q.h) + " px. No Palco e no cabeamento ele continua um painel só.";
  $("bl-cols").value = t.bl ? t.bl.cols.join(", ") : String(sugerirColunas(q, q.rows, limiteTela(t)));
  $("bl-rows").value = t.bl ? t.bl.rows.join(", ") : String(q.rows);
  $("bl-err").textContent = "";
  prever();
  $("bl-modal").hidden = false;
}

export function init() {
  if (!$("cc-blocos")) return;
  $("cc-bl-dividir").addEventListener("click", function () { var t = painel(selected); if (t) abrirDividir(t.id); });
  $("cc-bl-pilha").addEventListener("click", function () { var t = painel(selected); if (t && t.bl) { var bl = JSON.parse(JSON.stringify(t.bl)); bl.d = arranjar(res(t), t.cx, t.cy, bl, "pilha"); gravar(t, bl, "Blocos de " + t.name + " empilhados."); } });
  $("cc-bl-lado").addEventListener("click", function () { var t = painel(selected); if (t && t.bl) { var bl = JSON.parse(JSON.stringify(t.bl)); bl.d = arranjar(res(t), t.cx, t.cy, bl, "lado"); gravar(t, bl, "Blocos de " + t.name + " lado a lado."); } });
  $("cc-bl-juntar").addEventListener("click", function () { var t = painel(selected); if (t && t.bl) gravar(t, null, t.name + " voltou a ser um bloco só no mapa."); });
  ["bl-cols", "bl-rows", "bl-modo"].forEach(function (id) { $(id).addEventListener("input", prever); });
  $("bl-sugerir").addEventListener("click", function () {
    var o = opcoes(), linhas = o.rows ? Math.max.apply(null, o.rows) : o.q.rows;
    $("bl-cols").value = String(sugerirColunas(o.q, linhas, limiteTela(o.t)));
    prever();
  });
  $("bl-cancel").addEventListener("click", function () { $("bl-modal").hidden = true; });
  $("bl-modal").addEventListener("click", function (e) { if (e.target === $("bl-modal")) $("bl-modal").hidden = true; });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") $("bl-modal").hidden = true; });
  $("bl-ok").addEventListener("click", function () {
    var o = opcoes();
    if (!o.cols || !o.rows) { $("bl-err").textContent = "As colunas e as linhas dos blocos precisam fechar o painel."; return; }
    if (o.cols.length * o.rows.length < 2) { $("bl-err").textContent = "Com esses números fica um bloco só."; return; }
    var bl = { cols: o.cols, rows: o.rows, d: [] };
    bl.d = arranjar(o.q, o.t.cx, o.t.cy, bl, o.modo);
    gravar(o.t, bl, o.t.name + ": " + o.cols.length * o.rows.length + " blocos no mapa de pixels.");
  });
}
