// Palco no estilo dos programas de desenho: ferramentas à esquerda, opções da ferramenta em cima, estúdio
// (Propriedades e Camadas) à direita, estado embaixo. É só a casca: as ferramentas acionam o que já existia
// (o "Mover", a alça de giro, o Recortar, o + Painel) e o cartão do painel vira a aba Propriedades.
// Ferramentas: Selecionar (V) arrasta painéis · Navegar (H) arrastar só move a vista · Girar (R) mostra a alça ·
// Painel (P) desenha um painel arrastando (clique no vazio abre a janela) · Medir (M) mede entre dois pontos ·
// Recortar (C) recorta o painel selecionado (ver desenhar.js). Vistas: 1 a 5 (Frente, Atrás, Esquerda,
// Direita, Topo), 0 liga/desliga o 3D. Enquadrar: F.
import { tiles, selected, paineis, membrosPainel, pnome, fmt, gravarVivo, save, EXTRAS } from "./core.js";
import { placeM } from "./rig.js";
import { commitAndReload } from "./telas.js";
import { curTab } from "./abas.js";
import { corCab } from "./gabinetes.js";
import { setEditM, setAlcaLigada } from "./rig-edicao.js";
import { select } from "./tabela.js";
import { abrirGrupo, abrirMembro } from "./rig-cartao.js";
import { irParaVista, alternar3D } from "./vistas.js";
import { ouvirRig } from "./ponte3d.js";
import { pmsg } from "./exportar.js";

function $(id) { return document.getElementById(id); }

var NOMES = { selecionar: "Selecionar", navegar: "Navegar", girar: "Girar", painel: "Painel", medir: "Medir" };
var CHAVE = "ledmap-ferramenta"; // preferência do aparelho
var ferramenta = "selecionar";

function no3D() { return document.body.classList.contains("rig-3d"); }
function noPalco() { return document.body.getAttribute("data-aba") === "m"; }

// liga a ferramenta: Selecionar e Girar ligam o arrasto ("Mover"), Navegar desliga; a alça só no Girar
export function usar(f) {
  if (!NOMES[f]) return;
  ferramenta = f;
  try { localStorage.setItem(CHAVE, f); } catch (e) {}
  aplicar();
}

function aplicar() {
  var em3 = no3D();
  if (noPalco() && !em3) setEditM(ferramenta === "selecionar" || ferramenta === "girar"); // Painel e Medir desenham: sem arrasto de painel
  document.body.dataset.ferr = em3 ? "" : ferramenta;
  document.body.classList.toggle("p-desenho", !em3 && (ferramenta === "painel" || ferramenta === "medir"));
  setAlcaLigada(ferramenta === "girar");
  document.querySelectorAll("#m-tools .ptool[data-tool]").forEach(function (b) {
    b.setAttribute("aria-pressed", String(b.getAttribute("data-tool") === ferramenta));
    b.disabled = em3; // no 3D, mover e girar são pelo cartão
  });
  document.body.classList.toggle("p-navegar", !em3 && ferramenta === "navegar"); // cursor de mãozinha no desenho
  var ctx = em3 ? "3d" : ferramenta;
  $("m-ferr").textContent = em3 ? "Vista 3D" : NOMES[ferramenta];
  document.querySelectorAll("#m-ctx .p-grp").forEach(function (g) {
    g.hidden = (g.getAttribute("data-ctx") || "").split(" ").indexOf(ctx) < 0;
  });
}

// Recortar: precisa de um painel selecionado; o botão acompanha o modo
function recortar() {
  if (!selected) { pmsg("Selecione um painel para recortar os gabinetes dele."); return; }
  $("m-rec").click();
}

// ---- estúdio ----
function aba(qual) {
  ["prop", "cam"].forEach(function (k) {
    $("m-ab-" + k).setAttribute("aria-selected", String(k === qual));
    $("m-pane-" + k).hidden = k !== qual;
  });
  if (qual === "cam") camadas();
}

// Camadas: os grupos (com os painéis dentro) e depois os painéis soltos; tocar seleciona.
// Cada linha tem olho (ocultar no Palco), cadeado (travar no desenho) e ▲▼ (ordem: quem vem depois fica por cima
// quando dois painéis estão na mesma profundidade). No grupo, o olho e o cadeado valem para todos os membros.
var OLHO = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
var OLHO_X = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M2 12s4-7 10-7c2 0 3.8.8 5.3 1.8M22 12s-4 7-10 7c-2 0-3.8-.8-5.3-1.8"/><path d="M3 3l18 18"/></svg>';
var CAD = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="1"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
var CAD_A = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="1"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/></svg>';
function acoes(lista, ordem) {
  var oc = lista.every(function (t) { return t.oc; }), tv = lista.every(function (t) { return t.tv; });
  return '<span class="ac">' + (ordem ? '<button type="button" data-ac="sobe" title="Para frente (desenhado por cima)">▲</button><button type="button" data-ac="desce" title="Para trás (desenhado por baixo)">▼</button>' : "") +
    '<button type="button" data-ac="oc" aria-pressed="' + oc + '" title="' + (oc ? "Mostrar no Palco" : "Ocultar no Palco") + '">' + (oc ? OLHO_X : OLHO) + "</button>" +
    '<button type="button" data-ac="tv" aria-pressed="' + tv + '" title="' + (tv ? "Destravar" : "Travar: não pega toque nem arrasto no desenho") + '">' + (tv ? CAD : CAD_A) + "</button></span>";
}
function linhaPainel(t, cls) {
  var li = document.createElement("li");
  li.className = cls + (t.id === selected ? " sel" : "");
  li.setAttribute("data-id", t.id);
  li.style.setProperty("--cor", corCab(t));
  li.title = t.name + " · " + fmt(t.w) + " × " + fmt(t.h) + " m";
  li.innerHTML = '<span class="sw"></span><span class="n"></span><span class="nm"></span><span class="md"></span>' + acoes([t], true);
  li.classList.toggle("oculta", !!t.oc);
  li.querySelector(".n").textContent = t.id;
  li.querySelector(".nm").textContent = t.name;
  li.querySelector(".md").textContent = fmt(t.w) + "×" + fmt(t.h);
  return li;
}
function camadas() {
  var ul = $("m-camadas");
  if (!ul || $("m-pane-cam").hidden) return;
  ul.textContent = "";
  if (!tiles.length) { var v = document.createElement("li"); v.className = "md"; v.textContent = "Nenhum painel ainda: use a ferramenta Painel (P)."; ul.appendChild(v); return; }
  paineis.forEach(function (p) {
    var m = membrosPainel(p.id);
    if (!m.length) return;
    var g = document.createElement("li");
    g.className = "grp"; g.setAttribute("data-grupo", p.id);
    g.innerHTML = '<span class="sw" style="background:var(--muted)"></span><span class="nm"></span><span class="md"></span>' + acoes(m, false);
    g.classList.toggle("oculta", m.every(function (t) { return t.oc; }));
    g.querySelector(".nm").textContent = pnome(p);
    g.querySelector(".md").textContent = m.length + " painéis";
    ul.appendChild(g);
    m.forEach(function (t) { ul.appendChild(linhaPainel(t, "mem")); });
  });
  tiles.filter(function (t) { return !t.pn; }).forEach(function (t) { ul.appendChild(linhaPainel(t, "")); });
}

// olho, cadeado e ordem (ver acoes)
function acaoCamada(li, ac) {
  var g = li.getAttribute("data-grupo"), id = li.getAttribute("data-id");
  var lista = g ? membrosPainel(g) : tiles.filter(function (t) { return t.id === id; });
  if (!lista.length) return;
  if (ac === "oc" || ac === "tv") {
    var liga = !lista.every(function (t) { return t[ac]; });
    lista.forEach(function (t) { t[ac] = liga; placeM(t); });
    gravarVivo(lista); save(); camadas();
    pmsg(lista.length > 1 ? (liga ? (ac === "oc" ? "Grupo oculto no Palco." : "Grupo travado.") : (ac === "oc" ? "Grupo à vista." : "Grupo destravado.")) : (liga ? (ac === "oc" ? "Painel oculto no Palco (continua no cabeamento e na composição)." : "Painel travado: selecione pela lista.") : (ac === "oc" ? "Painel à vista." : "Painel destravado.")));
    return;
  }
  // ordem: troca de lugar com o vizinho na lista de painéis (a definição); recarrega para tudo seguir a ordem nova
  var i = EXTRAS.findIndex(function (x) { return x.id === id; }), j = ac === "sobe" ? i + 1 : i - 1;
  if (i < 0 || j < 0 || j >= EXTRAS.length) return;
  var tmp = EXTRAS[i]; EXTRAS[i] = EXTRAS[j]; EXTRAS[j] = tmp;
  try { localStorage.setItem("ledmap-msg", "Ordem das camadas atualizada."); } catch (e) {}
  if (!commitAndReload(curTab + ":" + id)) { EXTRAS[j] = EXTRAS[i]; EXTRAS[i] = tmp; pmsg("Não consegui salvar neste navegador."); }
}

// a grade do Palco (e das abas no mesmo molde: Screen, Cabeamento, Composição) ocupa a janela até embaixo; o
// cabeçalho do app fica em cima e, onde aparece, a gaveta de painéis embaixo
function medirAltura() {
  var v = document.querySelector(".view.palco:not([hidden]), .view.oficina:not([hidden])");
  if (!v || window.innerWidth < 900) return;
  var topo = v.getBoundingClientRect().top + window.scrollY, dr = document.getElementById("drawer");
  // com a gaveta à vista, o espaço reservado para ela embaixo da página (o padding do .wrap)
  var gaveta = dr && getComputedStyle(dr).display !== "none" ? parseFloat(getComputedStyle(document.querySelector(".wrap")).paddingBottom) || dr.offsetHeight : 0;
  document.documentElement.style.setProperty("--palco-alto", Math.max(420, window.innerHeight - topo - 16 - gaveta) + "px");
}

export function init() {
  try { var f = localStorage.getItem(CHAVE); if (NOMES[f]) ferramenta = f; } catch (e) {}
  document.querySelectorAll("#m-tools .ptool[data-tool]").forEach(function (b) {
    b.addEventListener("click", function () { usar(b.getAttribute("data-tool")); });
  });
  $("m-tool-rec").addEventListener("click", recortar);
  // o Recortar do cartão e o da barra mostram o mesmo estado
  new MutationObserver(function () { $("m-tool-rec").setAttribute("aria-pressed", $("m-rec").getAttribute("aria-pressed") || "false"); })
    .observe($("m-rec"), { attributes: true, attributeFilter: ["aria-pressed"] });
  $("m-ab-prop").addEventListener("click", function () { aba("prop"); });
  $("m-ab-cam").addEventListener("click", function () { aba("cam"); });
  $("m-camadas").addEventListener("click", function (e) {
    var li = e.target.closest("li");
    if (!li) return;
    var bt = e.target.closest("button[data-ac]");
    if (bt) { e.stopPropagation(); acaoCamada(li, bt.getAttribute("data-ac")); return; }
    var g = li.getAttribute("data-grupo");
    if (g) { var m = membrosPainel(g); if (m.length) select(m[0].id); abrirGrupo(g); aba("prop"); return; }
    var id = li.getAttribute("data-id");
    if (id) { if (li.classList.contains("mem")) abrirMembro(id); else select(id === selected ? null : id); } // painel de grupo: edita só ele
  });
  $("m-ajuda").addEventListener("click", function () {
    var on = !document.body.classList.contains("p-ajuda");
    document.body.classList.toggle("p-ajuda", on);
    this.setAttribute("aria-pressed", String(on));
  });
  ouvirRig(function () { camadas(); });

  // trocar de aba (o app desliga o "Mover" ao sair do Palco) ou entrar/sair do 3D: reaplica a ferramenta
  new MutationObserver(function () { aplicar(); medirAltura(); requestAnimationFrame(medirAltura); })
    .observe(document.body, { attributes: true, attributeFilter: ["data-aba", "class"] });
  window.addEventListener("resize", medirAltura);

  // atalhos (fora dos campos; Ctrl/Cmd ficam para desfazer, duplicar etc.)
  document.addEventListener("keydown", function (e) {
    if (!noPalco() || e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName || "") || e.target.isContentEditable) return;
    var k = e.key.toLowerCase(), f = { v: "selecionar", h: "navegar", r: "girar", p: "painel", m: "medir" }[k];
    if (f && !no3D()) { e.preventDefault(); usar(f); return; }
    if (k === "c" && !no3D()) { e.preventDefault(); recortar(); return; }
    if (k === "f") { e.preventDefault(); $("m-zfit").click(); return; }
    if (e.key === "0") { e.preventDefault(); alternar3D(); return; }
    var n = "12345".indexOf(e.key);
    if (n >= 0) { e.preventDefault(); irParaVista(["frente", "tras", "esq", "dir", "topo"][n]); }
  });
  aplicar();
  medirAltura();
}
