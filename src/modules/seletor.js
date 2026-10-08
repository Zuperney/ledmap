// Seletor próprio do Led Map: substitui o <select> nativo por botão + lista do app.
// O <select> original continua no DOM (escondido) como fonte da verdade: value, options, change, disabled.
// Código existente segue lendo/gravando sel.value e ouvindo "change" sem saber da troca.
var aberto = null;
var descValue = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
var celular = window.matchMedia ? window.matchMedia("(max-width: 640px), (pointer: coarse)") : { matches: false };

function textoDe(sel) {
  var o = sel.options[sel.selectedIndex];
  return o ? o.textContent : "";
}

function titulo(sel) {
  var lb = sel.closest("label"), t = sel.getAttribute("aria-label") || "";
  if (!t && lb) { t = Array.prototype.filter.call(lb.childNodes, function (n) { return n.nodeType === 3; }).map(function (n) { return n.textContent; }).join(" ").trim(); }
  return t;
}

function fechar(devolverFoco) {
  if (!aberto) return;
  var a = aberto;
  aberto = null;
  a.pop.remove();
  if (a.fundo) a.fundo.remove();
  document.removeEventListener("keydown", a.tecla, true);
  document.removeEventListener("pointerdown", a.fora, true);
  window.removeEventListener("resize", a.redim);
  a.btn.setAttribute("aria-expanded", "false");
  if (devolverFoco) a.btn.focus();
}

function posicionar(a) {
  var r = a.btn.getBoundingClientRect(), p = a.pop;
  if (celular.matches) return;
  p.style.minWidth = Math.max(r.width, 140) + "px";
  p.style.maxHeight = "min(320px, 60vh)";
  var h = p.offsetHeight, abaixo = window.innerHeight - r.bottom, acima = r.top;
  var top = abaixo >= Math.min(h, 220) || abaixo >= acima ? r.bottom + 4 : Math.max(8, r.top - h - 4);
  var left = Math.min(Math.max(8, r.left), Math.max(8, window.innerWidth - p.offsetWidth - 8));
  p.style.top = top + "px";
  p.style.left = left + "px";
}

function abrir(sel, btn) {
  if (aberto && aberto.sel === sel) { fechar(true); return; }
  fechar(false);
  var pop = document.createElement("div"), fundo = null;
  pop.className = "nsel-pop" + (celular.matches ? " folha" : "");
  pop.setAttribute("data-keep", "");
  pop.setAttribute("role", "listbox");
  pop.tabIndex = -1;
  var t = titulo(sel);
  if (celular.matches) {
    fundo = document.createElement("div");
    fundo.className = "nsel-fundo";
    document.body.appendChild(fundo);
    if (t) { var h = document.createElement("div"); h.className = "nsel-tit"; h.textContent = t; pop.appendChild(h); }
  }
  var itens = [], atual = sel.selectedIndex;
  Array.prototype.forEach.call(sel.options, function (o, i) {
    var d = document.createElement("div");
    d.className = "nsel-op" + (i === sel.selectedIndex ? " sel" : "") + (o.disabled ? " off" : "");
    d.setAttribute("role", "option");
    d.setAttribute("aria-selected", String(i === sel.selectedIndex));
    d.textContent = o.textContent;
    d.addEventListener("click", function (e) { e.stopPropagation(); if (!o.disabled) escolher(i); });
    pop.appendChild(d);
    itens.push(d);
  });
  function marcar(i) {
    atual = i;
    itens.forEach(function (d, k) { d.classList.toggle("foco", k === i); });
    if (itens[i]) itens[i].scrollIntoView({ block: "nearest" });
  }
  function escolher(i) {
    var mudou = sel.selectedIndex !== i;
    sel.selectedIndex = i;
    fechar(true);
    atualizar(sel);
    if (mudou) sel.dispatchEvent(new Event("change", { bubbles: true }));
  }
  function proximo(i, dir) {
    for (var k = i + dir; k >= 0 && k < itens.length; k += dir) if (!sel.options[k].disabled) return k;
    return i;
  }
  var a = {
    sel: sel, btn: btn, pop: pop, fundo: fundo,
    tecla: function (e) {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); fechar(true); }
      else if (e.key === "ArrowDown") { e.preventDefault(); marcar(proximo(atual, 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); marcar(proximo(atual, -1)); }
      else if (e.key === "Home") { e.preventDefault(); marcar(proximo(-1, 1)); }
      else if (e.key === "End") { e.preventDefault(); marcar(proximo(itens.length, -1)); }
      else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); if (atual >= 0) escolher(atual); }
      else if (e.key === "Tab") fechar(false);
    },
    fora: function (e) { if (!pop.contains(e.target) && !btn.contains(e.target)) fechar(false); },
    redim: function () { fechar(false); }
  };
  aberto = a;
  pop.addEventListener("click", function (e) { e.stopPropagation(); });
  document.body.appendChild(pop);
  btn.setAttribute("aria-expanded", "true");
  document.addEventListener("keydown", a.tecla, true);
  document.addEventListener("pointerdown", a.fora, true);
  window.addEventListener("resize", a.redim);
  marcar(Math.max(0, sel.selectedIndex));
  posicionar(a);
  pop.focus({ preventScroll: true });
}

function atualizar(sel) {
  var b = sel._nsel;
  if (!b) return;
  b.firstChild.textContent = textoDe(sel) || " ";
  b.disabled = sel.disabled;
  var t = sel.getAttribute("aria-label");
  if (t) b.setAttribute("aria-label", t + ": " + textoDe(sel));
}

export function melhorar(sel) {
  if (sel._nsel || sel.multiple) return;
  var btn = document.createElement("button");
  btn.type = "button";
  btn.className = "nsel";
  btn.setAttribute("aria-haspopup", "listbox");
  btn.setAttribute("aria-expanded", "false");
  var txt = document.createElement("span");
  btn.appendChild(txt);
  sel._nsel = btn;
  sel.classList.add("nsel-src");
  sel.tabIndex = -1;
  sel.setAttribute("aria-hidden", "true");
  sel.parentNode.insertBefore(btn, sel);
  btn.addEventListener("click", function (e) { e.stopPropagation(); abrir(sel, btn); });
  // quem muda sel.value por código continua funcionando: o rótulo acompanha
  Object.defineProperty(sel, "value", {
    configurable: true,
    get: function () { return descValue.get.call(sel); },
    set: function (v) { descValue.set.call(sel, v); atualizar(sel); }
  });
  new MutationObserver(function () { atualizar(sel); }).observe(sel, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["disabled", "aria-label"] });
  atualizar(sel);
}

export function melhorarTodos(raiz) {
  Array.prototype.forEach.call((raiz || document).querySelectorAll("select"), melhorar);
}

export function init() {
  melhorarTodos(document);
  new MutationObserver(function (muts) {
    muts.forEach(function (m) {
      Array.prototype.forEach.call(m.addedNodes, function (n) {
        if (n.nodeType !== 1) return;
        if (n.tagName === "SELECT") melhorar(n); else if (n.querySelectorAll) melhorarTodos(n);
      });
    });
  }).observe(document.body, { childList: true, subtree: true });
}
