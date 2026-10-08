import { selected, groups, gname, save, res, fmt, tiles } from "./core.js";
import { tById } from "./exportar.js";
import { applyFocus, renderChips, updateBoxes, updateDetailStat } from "./screens.js";
import { refreshSelects } from "./tabela.js";
import { duplicateSel } from "./historico.js";

let drawerEl, dToggle, dState, DH;

export function applyDrawer() {
    document.documentElement.style.setProperty("--dh", DH[dState]);
    dToggle.textContent = (dState === 2 ? "▼ " : "▲ ") + "Telas";
    dToggle.setAttribute("aria-expanded", String(dState > 0));
  }

export function syncInsp() {
    var box = document.getElementById("insp"), t = selected && tById[selected];
    box.textContent = "";
    box.hidden = !t;
    document.getElementById("d-sum").hidden = !!t;
    if (!t) return;
    var n = document.createElement("span"); n.className = "n"; n.textContent = t.id;
    var nm = document.createElement("span"); nm.className = "nm"; nm.textContent = t.name;
    var info = document.createElement("span"); info.className = "info"; info.id = "insp-info";
    var sel = document.createElement("select");
    sel.setAttribute("aria-label", "Screen da tela " + t.id);
    var o0 = document.createElement("option"); o0.value = ""; o0.textContent = "— screen —"; sel.appendChild(o0);
    groups.forEach(function (g) { var o = document.createElement("option"); o.value = g.id; o.textContent = gname(g); sel.appendChild(o); });
    sel.value = t.grp || "";
    sel.addEventListener("change", function () {
      t.grp = sel.value;
      applyFocus(); renderChips(); updateBoxes(); updateDetailStat(); save(); refreshSelects();
    });
    var dup = document.createElement("button"); dup.className = "btn"; dup.textContent = "Duplicar"; dup.title = "Duplicar esta tela";
    dup.addEventListener("click", duplicateSel);
    box.appendChild(n); box.appendChild(nm); box.appendChild(info); box.appendChild(sel); box.appendChild(dup);
    updInsp();
  }

export function updInsp() {
    var t = selected && tById[selected], info = document.getElementById("insp-info");
    if (!t || !info) return;
    var q = res(t);
    info.textContent = fmt(t.w) + "×" + fmt(t.h) + " m · " + q.w + "×" + q.h + " px · " + q.cols + "×" + q.rows + " gab · Rig " + fmt(t.mx) + "," + fmt(t.my) + " · Canvas " + t.cx + "," + t.cy;
  }

export function init() {
  drawerEl = document.getElementById("drawer");
  dToggle = document.getElementById("d-toggle");
  dState = 0;
  DH = ["28px", "34dvh", "74dvh"];
  dToggle.addEventListener("click", function () { dState = (dState + 1) % 3; applyDrawer(); });
  document.getElementById("d-sum").textContent = tiles.length + " telas · " + document.getElementById("total-cab").textContent + " · " + document.getElementById("total").textContent + " px";
}

