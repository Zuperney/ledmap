import { groups, gname } from "./core.js";
import { sinalState, setSinal, setMaxPortas, resumoScreens, limiteTxt, onSinal, autoState, setAuto, distribuirAuto, kmsg, twoStep } from "./cabeamento.js";
import { capSugerida, limitePx, limpaSinal } from "./sinal.js";
import { nf } from "./core.js";

let escopo = "";
const $ = function (id) { return document.getElementById(id); };

function cfgEscopo() { var st = sinalState(); return escopo ? (st.sinalScreens[escopo] || st.sinal) : st.sinal; }

function preencherAuto() {
    var sel = $("ka-escopo"), v = sel.value || "*";
    sel.textContent = "";
    [["*", "Todos os painéis"]].concat(groups.map(function (g) { return [g.id, gname(g)]; })).concat([["_", "Painéis sem Screen"]]).forEach(function (a) {
      var o = document.createElement("option"); o.value = a[0]; o.textContent = a[1]; sel.appendChild(o);
    });
    sel.value = Array.prototype.some.call(sel.options, function (o) { return o.value === v; }) ? v : "*";
    $("ka-canto").value = autoState().corner;
    $("ka-sentido").value = autoState().routing;
    $("ka-estrategia").value = autoState().estrategia;
    $("ka-ordem").value = autoState().ordem;
  }

function preencherEscopo() {
    var sel = $("ks-escopo"), v = escopo;
    sel.textContent = "";
    var o = document.createElement("option"); o.value = ""; o.textContent = "Padrão do projeto"; sel.appendChild(o);
    groups.forEach(function (g) { var x = document.createElement("option"); x.value = g.id; x.textContent = gname(g); sel.appendChild(x); });
    if (v && !groups.some(function (g) { return g.id === v; })) v = "";
    escopo = v; sel.value = v;
  }

export function atualizarSinal() {
    preencherEscopo();
    preencherAuto();
    var st = sinalState(), c = cfgEscopo(), tem = !!(escopo && st.sinalScreens[escopo]);
    if (document.activeElement !== $("ks-bits")) $("ks-bits").value = c.bits;
    if (document.activeElement !== $("ks-hz")) $("ks-hz").value = c.hz;
    if (document.activeElement !== $("ks-cap")) $("ks-cap").value = c.cap || "";
    $("ks-cap").placeholder = "auto: " + nf(capSugerida(c.bits));
    $("ks-padrao").hidden = !tem;
    var aviso = c.cap > 0 || c.bits === 8 || c.bits === 10 ? "" : " Para " + c.bits + " bits o valor é uma estimativa proporcional; confira no datasheet do processador e, se precisar, preencha o campo manualmente.";
    $("ks-info").textContent = (escopo && !tem ? "Esta Screen usa o padrão do projeto. " : "") + "Capacidade: " + nf(limitePx(c)) + " px por porta a " + c.hz + " Hz, " + c.bits + " bits." + aviso;
    $("ks-max").value = st.maxPortas;
    $("ks-res").textContent = limiteTxt() + " px/porta";
    var box = $("ks-lista"); box.textContent = "";
    resumoScreens(groups).forEach(function (x) {
      var d = document.createElement("div"), ruim = x.min > st.maxPortas || x.usadas > st.maxPortas;
      d.className = "srow" + (ruim ? " bad" : "");
      var a = document.createElement("span"); a.textContent = x.nome + " · " + nf(x.px) + " px";
      var b = document.createElement("b"); b.textContent = x.usadas + " em uso · mín. " + x.min + " de " + st.maxPortas + (ruim ? " ⚠" : "");
      d.appendChild(a); d.appendChild(b); box.appendChild(d);
    });
  }

function aplicar() {
    var c = limpaSinal({ bits: $("ks-bits").value, hz: $("ks-hz").value, cap: $("ks-cap").value });
    setSinal(escopo, c);
  }

export function init() {
  $("ks-escopo").addEventListener("change", function (e) { escopo = e.target.value; atualizarSinal(); });
  ["ks-bits", "ks-hz", "ks-cap"].forEach(function (id) { $(id).addEventListener("change", aplicar); });
  Array.prototype.forEach.call(document.querySelectorAll(".presets button"), function (b) {
      b.addEventListener("click", function (e) {
        e.preventDefault();
        var i = $(b.parentNode.getAttribute("data-for"));
        i.value = b.textContent;
        i.dispatchEvent(new Event("change", { bubbles: true }));
      });
    });
  $("ks-max").addEventListener("change", function (e) { setMaxPortas(e.target.value); });
  $("ks-padrao").addEventListener("click", function () { setSinal(escopo, null); });
  ["ka-canto", "ka-sentido", "ka-estrategia", "ka-ordem"].forEach(function (id) { $(id).addEventListener("change", function () { setAuto({ corner: $("ka-canto").value, routing: $("ka-sentido").value, estrategia: $("ka-estrategia").value, ordem: $("ka-ordem").value }); }); });
  twoStep($("ka-go"), "Distribuir", "Confirmar: substitui as rotas", function () {
      var r = distribuirAuto($("ka-escopo").value);
      kmsg(r.aviso && !r.portas ? r.aviso : r.portas + " portas criadas para " + r.gabinetes + " gabinetes." + (r.aviso ? " " + r.aviso : ""));
    });
  onSinal(atualizarSinal);
  atualizarSinal();
}
