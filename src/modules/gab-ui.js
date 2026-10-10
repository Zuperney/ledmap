// Biblioteca de gabinetes: lista, criar, editar, duplicar e excluir.
import { GABINETES, GAB, salvarGab, removerGab, novoIdGab, corGab, pitchMm, cabDe, limparGabs, restaurarFabrica } from "./gabinetes.js";
import { tiles, fmt, nf } from "./core.js";
import { twoStep } from "./cabeamento.js";
import { pmsg } from "./exportar.js";
import { preencherCabs, commitAndReload } from "./telas.js";
import { curTab } from "./abas.js";

var modal, atual = null, doAdd = false;
var CAMPOS = { marca: "g-marca", nome: "g-nome", rx: "g-rx", ry: "g-ry", mw: "g-mw", mh: "g-mh", peso: "g-peso", pw: "g-pw", pb: "g-pb", fp: "g-fp", conector: "g-con", amp: "g-amp" };

function $(id) { return document.getElementById(id); }
function emUso(id) { return tiles.some(function (t) { return cabDe(t).id === id; }); }

function vista(form) { $("gab-v-lista").hidden = form; $("gab-v-form").hidden = !form; }

function lista() {
  var box = $("gab-lista"), q = $("gab-busca").value.trim().toLowerCase();
  box.textContent = "";
  GABINETES.filter(function (g) { return !q || (g.nome + " " + g.marca).toLowerCase().indexOf(q) >= 0; }).forEach(function (g) {
    var b = document.createElement("button");
    b.type = "button"; b.className = "grow";
    var dot = document.createElement("i"); dot.style.background = corGab(g.id);
    var nm = document.createElement("span"); nm.className = "nm"; nm.textContent = g.nome;
    var sb = document.createElement("span"); sb.className = "sb";
    sb.textContent = g.rx + " × " + g.ry + " px · " + fmt(g.mw * 100) + " × " + fmt(g.mh * 100) + " cm · pitch " + fmt(pitchMm(g)) + " mm · " + nf(g.pw) + " W";
    nm.appendChild(sb);
    b.appendChild(dot); b.appendChild(nm);
    if (emUso(g.id)) { var u = document.createElement("span"); u.className = "pill"; u.textContent = "neste projeto"; b.appendChild(u); }
    b.addEventListener("click", function () { editar(g); });
    box.appendChild(b);
  });
  if (!box.children.length) { var p = document.createElement("p"); p.className = "empty"; p.textContent = GABINETES.length ? "Nenhum gabinete encontrado." : "A biblioteca está vazia. Crie um gabinete ou restaure os de fábrica."; box.appendChild(p); }
}

function lerForm() {
  var o = { id: atual ? atual.id : novoIdGab() };
  Object.keys(CAMPOS).forEach(function (k) { o[k] = $(CAMPOS[k]).value; });
  o.mw = Number(o.mw) / 1000; o.mh = Number(o.mh) / 1000;
  return o;
}

function prev() {
  var o = lerForm(), rx = Number(o.rx), ry = Number(o.ry);
  if (!(rx > 0 && ry > 0 && o.mw > 0 && o.mh > 0)) { $("g-prev").textContent = "Informe pixels e tamanho do gabinete."; return; }
  var txt = "Pitch " + fmt(Math.round(o.mw / rx * 100000) / 100) + " mm · " + nf(rx * ry) + " px por gabinete";
  if (Math.abs(o.mw / rx - o.mh / ry) > 0.00005) txt += " · pitch vertical " + fmt(Math.round(o.mh / ry * 100000) / 100) + " mm";
  if (atual && GAB[atual.id] && emUso(atual.id)) txt += ". Em uso neste projeto: mudar o tamanho ajusta os painéis que usam este gabinete.";
  $("g-prev").textContent = txt;
}

function editar(g, copia) {
  atual = g && !copia ? g : null;
  var base = g || { marca: "", nome: "", rx: 128, ry: 128, mw: 0.5, mh: 0.5, peso: 8, pw: 200, pb: 40, fp: 0.9, conector: "PowerCON TRUE1", amp: 16 };
  Object.keys(CAMPOS).forEach(function (k) {
    var v = base[k];
    if (k === "mw" || k === "mh") v = Math.round(v * 10000) / 10;
    if (k === "nome" && copia) v = (v + " (cópia)").slice(0, 60);
    $(CAMPOS[k]).value = v == null ? "" : v;
  });
  $("gab-tit").textContent = atual ? "Editar gabinete" : "Novo gabinete";
  $("g-del").hidden = !atual; $("g-dup").hidden = !atual;
  $("g-err").textContent = "";
  prev();
  vista(true);
  $("g-nome").focus();
}

function salvar() {
  var o = lerForm(), eraUsado = atual && emUso(atual.id);
  var s = salvarGab(o);
  if (!s) { $("g-err").textContent = "Preencha nome, pixels (1 a 4096) e tamanho (50 a 5000 mm)."; return; }
  if (eraUsado) {
    // painéis deste projeto mudam: recarrega para redesenhar tudo com o gabinete novo
    if (!commitAndReload(curTab)) $("g-err").textContent = "Não consegui salvar neste navegador.";
    return;
  }
  preencherCabs(doAdd ? s.id : null);
  pmsg("Gabinete salvo: " + s.nome + ".");
  if (doAdd) { fechar(); return; }
  atual = null; vista(false); lista();
}

export function abrirGabinetes(vindoDoAdd) {
  doAdd = !!vindoDoAdd;
  $("gab-busca").value = "";
  vista(false); lista();
  modal.hidden = false;
}

function fechar() { modal.hidden = true; atual = null; }

export function init() {
  modal = $("gab-modal");
  $("gab-open").addEventListener("click", function () { abrirGabinetes(false); });
  $("a-gabs").addEventListener("click", function () { abrirGabinetes(true); });
  $("gab-fechar").addEventListener("click", fechar);
  $("gab-novo").addEventListener("click", function () { editar(null); });
  $("gab-busca").addEventListener("input", lista);
  $("g-voltar").addEventListener("click", function () { atual = null; vista(false); lista(); });
  $("g-ok").addEventListener("click", salvar);
  $("g-dup").addEventListener("click", function () { if (atual) editar(atual, true); });
  twoStep($("g-del"), "Excluir", "Confirmar?", function () {
    if (!atual) return;
    if (emUso(atual.id)) { $("g-err").textContent = "Este gabinete está em uso neste projeto. Troque o gabinete desses painéis antes de excluir."; return; }
    if (!removerGab(atual.id)) return;
    pmsg("Gabinete excluído.");
    preencherCabs(null);
    atual = null; vista(false); lista();
  });
  twoStep($("gab-limpar"), "Limpar biblioteca", "Confirmar?", function () {
    var manter = {};
    tiles.forEach(function (t) { manter[cabDe(t).id] = 1; });
    var n = limparGabs(manter);
    preencherCabs(null); lista();
    pmsg(n ? n + (n === 1 ? " gabinete removido" : " gabinetes removidos") + " da biblioteca" + (Object.keys(manter).length ? ". Ficaram os usados neste projeto." : ".") : "Nada para limpar: todos os gabinetes estão em uso neste projeto.");
  });
  $("gab-fabrica").addEventListener("click", function () {
    var n = restaurarFabrica();
    preencherCabs(null); lista();
    pmsg(n ? n + (n === 1 ? " gabinete de fábrica voltou" : " gabinetes de fábrica voltaram") + " para a biblioteca." : "Os gabinetes de fábrica já estão todos na biblioteca.");
  });
  Object.keys(CAMPOS).forEach(function (k) { $(CAMPOS[k]).addEventListener("input", prev); });
  modal.addEventListener("click", function (e) { if (e.target === modal) fechar(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !modal.hidden) { e.stopImmediatePropagation(); fechar(); } }, true);
}
