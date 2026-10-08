import { tiles, rowsEl, groups, gname, save, selected, gM, gC, res, esc, fmt, PITCH, nf, set_selected } from "./core.js";
import { applyFocus, renderChips, updateBoxes, updateDetailStat } from "./screens.js";
import { syncInsp } from "./gaveta.js";
import { syncMPanel } from "./rig-edicao.js";

let deleteLater;

export function refreshSelects() {
    tiles.forEach(function (t, idx) {
      var cell = rowsEl.children[idx].querySelector(".gsel");
      cell.textContent = "";
      var sel = document.createElement("select");
      sel.setAttribute("aria-label", "Screen da tela " + t.id);
      var o0 = document.createElement("option");
      o0.value = ""; o0.textContent = "—";
      sel.appendChild(o0);
      groups.forEach(function (g) {
        var o = document.createElement("option");
        o.value = g.id; o.textContent = gname(g);
        sel.appendChild(o);
      });
      sel.value = t.grp || "";
      sel.addEventListener("click", function (e) { e.stopPropagation(); });
      sel.addEventListener("change", function () {
        t.grp = sel.value;
        applyFocus(); renderChips(); updateBoxes(); updateDetailStat(); save();
      });
      cell.appendChild(sel);
    });
    syncInsp();
  }

export function select(id) {
    set_selected(id);
    tiles.forEach(function (s) {
      gM[s.id].classList.toggle("sel", s.id === id);
      gC[s.id].classList.toggle("sel", s.id === id);
    });
    Array.prototype.forEach.call(rowsEl.children, function (tr) {
      tr.classList.toggle("sel", tr.getAttribute("data-id") === id);
    });
    syncMPanel();
    syncInsp();
  }

export function init() {
  deleteLater = [];
  tiles.forEach(function (s) {
      var q = res(s);
      var tr = document.createElement("tr");
      tr.setAttribute("data-id", s.id);
      tr.innerHTML = '<td><span class="n">' + s.id + '</span></td><td>' + esc(s.name) + (s.extra ? ' <button class="xdel" type="button">Excluir</button>' : '') +
        '</td><td class="gsel"></td><td class="r">' + fmt(s.w) + ' × ' + fmt(s.h) + '</td><td class="r">' + q.cols + ' × ' + q.rows +
        '</td><td>' + PITCH[s.kind].name + '</td><td class="r">' + q.w + ' × ' + q.h +
        '</td><td class="r">' + nf(q.total) + '</td><td class="r mpos">' + fmt(s.mx) + ' , ' + fmt(s.my) +
        '</td><td class="r cpos"></td>';
      tr.addEventListener("click", function () { select(selected === s.id ? null : s.id); });
      var xb = tr.querySelector(".xdel");
      if (xb) {
        xb.addEventListener("click", function (e) { e.stopPropagation(); });
        deleteLater.push([xb, s.id]);
      }
      rowsEl.appendChild(tr);
    });
  document.getElementById("total-cab").textContent = tiles.reduce(function (a, s) { var q = res(s); return a + q.cols * q.rows; }, 0) + " gabinetes";
  document.getElementById("total").textContent = nf(tiles.reduce(function (a, s) { return a + res(s).total; }, 0));
}

export { deleteLater };
