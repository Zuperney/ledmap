/* Aba Projeto: cadastro do projeto atual (nome, dados, observações), resumo e exportar/importar.
   A troca de projeto fica num seletor compacto no topo. */
import { tiles, res, nf, fmt } from "./core.js";
import { twoStep } from "./cabeamento.js";
import { pmsg } from "./exportar.js";
import { KEY_PEND } from "./telas.js";
import { calcular } from "./eletrica.js";
import { listar, projetoAtivo, atualizarMeta, criarProjeto, duplicarProjeto, excluirProjeto, abrirProjeto } from "./projetos.js";

function bloco(titulo, valor) {
  var d = document.createElement("div"), t = document.createElement("span"), v = document.createElement("b");
  d.className = "ek"; t.className = "ek-t"; v.className = "ek-v";
  t.textContent = titulo; v.textContent = valor;
  d.appendChild(t); d.appendChild(v);
  return d;
}

function desenharResumo() {
  var box = document.getElementById("p-resumo");
  if (!box) return;
  var cab = 0, px = 0, kva = 0;
  tiles.forEach(function (t) { var q = res(t); cab += q.cols * q.rows; px += q.total; });
  try { kva = calcular().total.kVA; } catch (e) {}
  box.textContent = "";
  box.appendChild(bloco("Painéis", nf(tiles.length)));
  box.appendChild(bloco("Gabinetes", nf(cab)));
  box.appendChild(bloco("Pixels", nf(px)));
  box.appendChild(bloco("Pico", fmt(Math.round(kva * 10) / 10) + " kVA"));
}

function desenharSeletor() {
  var sel = document.getElementById("p-sel"), at = projetoAtivo();
  sel.textContent = "";
  listar().forEach(function (p) {
    var o = document.createElement("option");
    o.value = p.id; o.textContent = p.nome || "Sem nome";
    sel.appendChild(o);
  });
  if (at) sel.value = at.id;
}

export function atualizarResumoProjeto() {
  desenharResumo();
  desenharSeletor();
}

export function init() {
  var at = projetoAtivo(), campos = { nome: "p-nome", cliente: "p-cliente", local: "p-local", data: "p-data", obs: "p-obs" };
  Object.keys(campos).forEach(function (f) {
    var el = document.getElementById(campos[f]);
    el.value = at ? at[f] || "" : "";
    el.addEventListener("input", function () {
      var a = projetoAtivo(); if (!a) return;
      var v = el.value; if (f === "nome" && !v.trim()) return;
      var patch = {}; patch[f] = v; atualizarMeta(a.id, patch);
      if (f === "nome") desenharSeletor();
    });
  });
  document.getElementById("p-sel").addEventListener("change", function (e) {
    var a = projetoAtivo();
    if (e.target.value && (!a || e.target.value !== a.id)) abrirProjeto(e.target.value);
  });
  document.getElementById("p-novo").addEventListener("click", function () { abrirProjeto(criarProjeto("", "limpo")); });
  document.getElementById("p-dup").addEventListener("click", function () {
    var a = projetoAtivo(); if (!a) return;
    var id = duplicarProjeto(a.id);
    if (id) abrirProjeto(id);
  });
  twoStep(document.getElementById("p-del"), "Excluir", "Confirmar?", function () {
    var a = projetoAtivo(); if (!a) return;
    if (listar().length <= 1) { pmsg("Mantenha pelo menos um projeto."); return; }
    abrirProjeto(excluirProjeto(a.id));
  });
  var arq = document.createElement("input");
  arq.type = "file"; arq.accept = ".json,application/json"; arq.hidden = true; document.body.appendChild(arq);
  document.getElementById("p-importar").addEventListener("click", function () { arq.click(); });
  arq.addEventListener("change", function () {
    var f = arq.files && arq.files[0]; if (!f) return;
    if (f.size > 5 * 1024 * 1024) { pmsg("Arquivo grande demais para ser um projeto."); arq.value = ""; return; }
    var rd = new FileReader();
    rd.onload = function () {
      var txt = String(rd.result), o;
      try { o = JSON.parse(txt); } catch (e) { pmsg("O arquivo não é um JSON válido."); arq.value = ""; return; }
      if (!o || (o.tipo !== "ledmap" && o.tipo !== "mapa-telas-led")) { pmsg("Este arquivo não é um projeto do Led Map."); arq.value = ""; return; }
      var meta = o.projeto || {}, nome = (meta.nome || f.name.replace(/\.json$/i, "") || "Importado");
      var id = criarProjeto(nome, "vazio");
      atualizarMeta(id, { cliente: meta.cliente || "", local: meta.local || "", data: meta.data || "", obs: meta.obs || "" });
      try { localStorage.setItem(KEY_PEND, txt); } catch (e) { pmsg("Não consegui guardar o arquivo neste navegador."); return; }
      abrirProjeto(id);
    };
    rd.onerror = function () { pmsg("Não consegui ler o arquivo."); arq.value = ""; };
    rd.readAsText(f);
  });
  atualizarResumoProjeto();
}
