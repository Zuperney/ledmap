/* Aba Projeto: dados do projeto atual e lista de projetos deste aparelho */
import { tiles, res, nf, groups, esc } from "./core.js";
import { ports, twoStep } from "./cabeamento.js";
import { pmsg } from "./exportar.js";
import { KEY_PEND } from "./telas.js";
import { listar, projetoAtivo, atualizarMeta, criarProjeto, duplicarProjeto, excluirProjeto, abrirProjeto, resumoDe } from "./projetos.js";

function resumoAtual() {
  var cab = 0, px = 0;
  tiles.forEach(function (t) { var q = res(t); cab += q.cols * q.rows; px += q.total; });
  return tiles.length + " telas · " + nf(cab) + " gabinetes · " + nf(px) + " px · " + groups.length + " screens · " + ports.length + " portas";
}

function quando(ms) {
  var d = new Date(ms || 0);
  return isNaN(d) ? "" : d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function desenharLista() {
  var box = document.getElementById("p-lista"), at = projetoAtivo();
  box.textContent = "";
  listar().forEach(function (p) {
    var row = document.createElement("div");
    row.className = "prow" + (at && p.id === at.id ? " cur" : "");
    var n = at && p.id === at.id ? tiles.length : resumoDe(p.id).telas;
    var meta = [p.cliente, p.local, p.data].filter(Boolean).join(" · ");
    row.innerHTML = '<span class="nm">' + esc(p.nome) + '<span class="sb">' + n + " telas" + (meta ? " · " + esc(meta) : "") + " · " + quando(p.atualizado) + "</span></span>";
    var b = function (txt) { var x = document.createElement("button"); x.className = "btn"; x.type = "button"; x.textContent = txt; row.appendChild(x); return x; };
    if (!(at && p.id === at.id)) b("Abrir").addEventListener("click", function () { abrirProjeto(p.id); });
    else { var s = document.createElement("span"); s.className = "pill"; s.textContent = "aberto"; row.appendChild(s); }
    b("Duplicar").addEventListener("click", function () { var id = duplicarProjeto(p.id); if (id) { pmsg("Projeto duplicado."); desenharLista(); } });
    var del = b("Excluir");
    twoStep(del, "Excluir", "Confirmar?", function () {
      var eraAtivo = at && p.id === at.id;
      if (listar().length <= 1) { pmsg("Mantenha pelo menos um projeto."); return; }
      var novo = excluirProjeto(p.id);
      if (eraAtivo) abrirProjeto(novo); else desenharLista();
    });
    box.appendChild(row);
  });
}

export function atualizarResumoProjeto() {
  var r = document.getElementById("p-resumo");
  if (r) r.textContent = resumoAtual();
  desenharLista();
}

export function init() {
  var at = projetoAtivo(), campos = { nome: "p-nome", cliente: "p-cliente", local: "p-local", data: "p-data" };
  Object.keys(campos).forEach(function (f) {
    var el = document.getElementById(campos[f]);
    el.value = at ? at[f] || "" : "";
    el.addEventListener("input", function () {
      var a = projetoAtivo(); if (!a) return;
      var v = el.value; if (f === "nome" && !v.trim()) return;
      var patch = {}; patch[f] = v; atualizarMeta(a.id, patch); desenharLista();
    });
  });
  document.getElementById("p-novo").addEventListener("click", function () {
    var nome = (window.prompt("Nome do novo projeto:", "") || "").trim();
    if (!nome) return;
    abrirProjeto(criarProjeto(nome, "vazio"));
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
      atualizarMeta(id, { cliente: meta.cliente || "", local: meta.local || "", data: meta.data || "" });
      try { localStorage.setItem(KEY_PEND, txt); } catch (e) { pmsg("Não consegui guardar o arquivo neste navegador."); return; }
      abrirProjeto(id);
    };
    rd.onerror = function () { pmsg("Não consegui ler o arquivo."); arq.value = ""; };
    rd.readAsText(f);
  });
  atualizarResumoProjeto();
}
