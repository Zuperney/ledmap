import { tiles, active, gC, gM, groups, members, gname, bbox, nf, groupById, el, nextG, save, groupMove, set_active, set_nextG, set_groupMove, set_groups } from "./core.js";
import { boxes } from "./canvas.js";
import { refreshSelects } from "./tabela.js";

let chipsEl, detailEl, nameInput, btnGroupMove, btnDel, armTimer;

export function applyFocus() {
    tiles.forEach(function (t) {
      var dim = active !== null && t.grp !== active;
      gC[t.id].classList.toggle("dim", dim);
      gM[t.id].classList.toggle("dim", dim);
    });
  }

export function renderChips() {
    chipsEl.textContent = "";
    if (!groups.length) {
      var p = document.createElement("p");
      p.className = "empty";
      p.textContent = "Nenhuma screen ainda. Crie uma e atribua painéis na coluna Screen da tabela.";
      chipsEl.appendChild(p);
      return;
    }
    function chip(label, pressed, onClick) {
      var b = document.createElement("button");
      b.className = "chip";
      b.setAttribute("aria-pressed", String(pressed));
      b.textContent = label;
      b.addEventListener("click", onClick);
      chipsEl.appendChild(b);
    }
    chip("Todas", active === null, function () { setActive(null); });
    groups.forEach(function (g) {
      var n = members(g.id).length;
      chip(gname(g) + " · " + n + (n === 1 ? " painel" : " painéis"), active === g.id, function () { setActive(active === g.id ? null : g.id); });
    });
  }

export function updateDetailStat() {
    var st = document.getElementById("screen-stat");
    if (active === null) { st.textContent = ""; return; }
    var mem = members(active);
    if (!mem.length) { st.textContent = "Vazia. Atribua painéis na coluna Screen da tabela."; return; }
    var b = bbox(mem);
    st.textContent = mem.length + (mem.length === 1 ? " painel" : " painéis") + " · " + nf(b.w) + " × " + nf(b.h) + " px";
  }

function disarm() {
    clearTimeout(armTimer);
    btnDel.removeAttribute("data-arm");
    btnDel.textContent = "Excluir screen";
  }

export function setActive(id) {
    set_active(id);
    disarm();
    var g = id === null ? null : groupById(id);
    detailEl.hidden = !g;
    if (g) nameInput.value = g.name;
    applyFocus(); renderChips(); updateBoxes(); updateDetailStat();
  }

export function updateBoxes() {
    boxes.textContent = "";
    groups.forEach(function (g) {
      var mem = members(g.id);
      if (!mem.length) return;
      var b = bbox(mem), pad = 24;
      var st = active === g.id ? " active" : (active !== null ? " dim" : "");
      el("rect", { "class": "gbox" + st, x: b.x - pad, y: b.y - pad, width: b.w + 2 * pad, height: b.h + 2 * pad }, boxes);
      var t = el("text", { "class": "gbl" + st, x: b.x - pad, y: b.y - pad - 22, "font-size": 64 }, boxes);
      t.textContent = gname(g);
    });
  }

export function init() {
  chipsEl = document.getElementById("chips");
  detailEl = document.getElementById("detail");
  nameInput = document.getElementById("screen-name");
  btnGroupMove = document.getElementById("btn-group-move");
  btnDel = document.getElementById("btn-del-screen");
  armTimer = null;
  document.getElementById("btn-new-screen").addEventListener("click", function () {
      var g = { id: "g" + nextG, name: "Screen " + nextG };
      (set_nextG(nextG + 1), nextG - 1);
      groups.push(g);
      refreshSelects();
      setActive(g.id);
      save();
    });
  nameInput.addEventListener("input", function () {
      var g = groupById(active);
      if (!g) return;
      g.name = nameInput.value;
      renderChips(); refreshSelects(); updateBoxes(); save();
    });
  btnGroupMove.addEventListener("click", function () {
      set_groupMove(!groupMove);
      btnGroupMove.setAttribute("aria-pressed", String(groupMove));
    });
  btnDel.addEventListener("click", function () {
      if (btnDel.getAttribute("data-arm") !== "1") {
        btnDel.setAttribute("data-arm", "1");
        btnDel.textContent = "Confirmar exclusão";
        armTimer = setTimeout(disarm, 3500);
        return;
      }
      var id = active;
      tiles.forEach(function (t) { if (t.grp === id) t.grp = ""; });
      set_groups(groups.filter(function (g) { return g.id !== id; }));
      refreshSelects();
      setActive(null);
      save();
    });
}

