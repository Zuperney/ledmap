/* Projetos: índice, projeto ativo e chaves de armazenamento por projeto.
   Cada projeto guarda seus dados em localStorage sob o prefixo ledmap-p-<id>-. Trocar de projeto = recarregar a página. */
const IDX = "ledmap-projetos";
const ACT = "ledmap-ativo";

/* Modelo "Exemplo": o rig de IMAGs, Upstage e peças do C usado no desenvolvimento. */
const EXEMPLO = {
  groups: [{ id: "g1", name: "IMAGs" }, { id: "g2", name: "Upstage" }, { id: "g3", name: "Cs" }],
  nextG: 4,
  extras: [
    { id: "1", name: "IMAG esquerda",       kind: "imag", w: 4,   h: 6, mx: 0,    my: 0,   cx: 0,    cy: 784,  grp: "g1" },
    { id: "2", name: "C esquerdo · base",   kind: "c",    w: 8.5, h: 1, mx: 5,    my: 0,   cx: 800,  cy: 1536, grp: "g3" },
    { id: "3", name: "C esquerdo · coluna", kind: "c",    w: 1.5, h: 5, mx: 5,    my: 1,   cx: 800,  cy: 256,  grp: "g3" },
    { id: "4", name: "C esquerdo · teto",   kind: "c",    w: 7,   h: 1, mx: 5,    my: 6,   cx: 800,  cy: 0,    grp: "g3" },
    { id: "5", name: "Upstage",             kind: "up",   w: 12,  h: 4, mx: 7.5,  my: 1.5, cx: 1968, cy: 560,  grp: "g2" },
    { id: "6", name: "C direito · base",    kind: "c",    w: 8.5, h: 1, mx: 13.5, my: 0,   cx: 2976, cy: 1536, grp: "g3" },
    { id: "7", name: "C direito · coluna",  kind: "c",    w: 1.5, h: 5, mx: 20.5, my: 1,   cx: 4768, cy: 256,  grp: "g3" },
    { id: "8", name: "C direito · teto",    kind: "c",    w: 7,   h: 1, mx: 15,   my: 6,   cx: 3360, cy: 0,    grp: "g3" },
    { id: "9", name: "IMAG direita",        kind: "imag", w: 4,   h: 6, mx: 23,   my: 0,   cx: 5280, cy: 784,  grp: "g1" }
  ]
};
/* ids do formato antigo (v1) → ids atuais */
export const ID_V1 = { "1": "1", "2a": "2", "2b": "3", "2c": "4", "3": "5", "4a": "6", "4b": "7", "4c": "8", "5": "9" };
export const TELAS_V1 = EXEMPLO.extras;

let indice = [], ativoId = "";

function ler(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
function gravar(k, v) { try { localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v)); return true; } catch (e) { return false; } }
function k(id, base) { return "ledmap-p-" + id + "-" + base; }
function novoId() {
  var n = 1;
  indice.forEach(function (p) { n = Math.max(n, parseInt(String(p.id).slice(1), 10) + 1 || 1); });
  return "p" + n;
}
function salvarIndice() { gravar(IDX, indice); }

function iniciar() {
  var l = ler(IDX);
  indice = Array.isArray(l) ? l.filter(function (p) { return p && typeof p.id === "string" && /^p\d+$/.test(p.id); }) : [];
  if (!indice.length) {
    var id = "p1";
    indice = [{ id: id, nome: "Exemplo: IMAGs, Upstage e Cs", cliente: "", local: "", data: "", criado: Date.now(), atualizado: Date.now() }];
    gravar(k(id, "config"), { extras: EXEMPLO.extras, groups: EXEMPLO.groups, nextG: EXEMPLO.nextG });
    salvarIndice();
    gravar(ACT, id);
  }
  var a = ""; try { a = localStorage.getItem(ACT) || ""; } catch (e) {}
  ativoId = indice.some(function (p) { return p.id === a; }) ? a : indice[0].id;
}
iniciar();

export function chave(base) { return k(ativoId, base); }
export function listar() { return indice.slice(); }
export function projetoAtivo() { return indice.filter(function (p) { return p.id === ativoId; })[0]; }
export function tocar() { var p = projetoAtivo(); if (p) { p.atualizado = Date.now(); salvarIndice(); } }
export function atualizarMeta(id, patch) {
  indice.forEach(function (p) { if (p.id === id) for (var f in patch) p[f] = String(patch[f]).slice(0, 80); });
  salvarIndice();
}
export function abrirProjeto(id) { gravar(ACT, id); location.reload(); }
export function criarProjeto(nome, modelo) {
  var id = novoId();
  indice.push({ id: id, nome: (nome || "").trim().slice(0, 80) || "Projeto " + id.slice(1), cliente: "", local: "", data: "", criado: Date.now(), atualizado: Date.now() });
  if (modelo === "exemplo") gravar(k(id, "config"), { extras: EXEMPLO.extras, groups: EXEMPLO.groups, nextG: EXEMPLO.nextG });
  salvarIndice();
  return id;
}
export function duplicarProjeto(id) {
  var src = indice.filter(function (p) { return p.id === id; })[0];
  if (!src) return null;
  var nid = novoId();
  indice.push(Object.assign({}, src, { id: nid, nome: (src.nome + " (cópia)").slice(0, 80), criado: Date.now(), atualizado: Date.now() }));
  ["config", "cabos"].forEach(function (b) { var v = null; try { v = localStorage.getItem(k(id, b)); } catch (e) {} if (v) gravar(k(nid, b), v); });
  salvarIndice();
  return nid;
}
export function excluirProjeto(id) {
  indice = indice.filter(function (p) { return p.id !== id; });
  ["config", "cabos"].forEach(function (b) { try { localStorage.removeItem(k(id, b)); } catch (e) {} });
  if (!indice.length) { indice = []; }
  salvarIndice();
  if (id === ativoId) { ativoId = indice.length ? indice[0].id : ""; gravar(ACT, ativoId); }
  return ativoId;
}
export function resumoDe(id) {
  var c = ler(k(id, "config")), n = c && Array.isArray(c.extras) ? c.extras.length : 0;
  return { telas: n };
}
export function ativoIdAtual() { return ativoId; }
