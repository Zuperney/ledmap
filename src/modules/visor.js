import { svgC, tiles, res, blocosDe } from "./core.js";

// retângulo em px (canvas) que envolve os painéis
export function caixaPx(lista) {
  var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  lista.forEach(function (t) { blocosDe(t).forEach(function (b) { x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h); }); }); // com os blocos
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
import { drag, set_drag } from "./canvas-edicao.js";

let viewC;

// conteudo(): retângulo (unidades do svg) que o Enquadrar deve mostrar inteiro; sem ele, volta à largura da vista
// opcoes.arrastarEsq(): se arrastar com o botão esquerdo move a vista (no Palco, a ferramenta Navegar)
export function makeViewer(stage, svg, ids, onPinch, minW, conteudo, opcoes) {
    var zoom = 1, locked = false;
    var $ = function (id) { return document.getElementById(id); };
    var label = $(ids.label), btnLock = $(ids.lock);
    function baseW() { return Math.max(stage.clientWidth, minW || 1100); }
    function apply() {
      svg.style.width = Math.round(baseW() * zoom) + "px";
      label.textContent = Math.round(zoom * 100) + "%";
    }
    function clampZ(z) { return Math.min(16, Math.max(0.2, z)); }
    function anchor(cx, cy) {
      var rect = stage.getBoundingClientRect(), box = svg.getBoundingClientRect();
      var ax = cx == null ? rect.width / 2 : cx - rect.left;
      var ay = cy == null ? rect.height / 2 : cy - rect.top;
      return { ax: ax, ay: ay, fx: (stage.scrollLeft + ax) / (box.width || 1), fy: (stage.scrollTop + ay) / (box.height || 1) };
    }
    function put(fx, fy, ax, ay) {
      var nb = svg.getBoundingClientRect();
      stage.scrollLeft = fx * nb.width - ax;
      stage.scrollTop = fy * nb.height - ay;
    }
    function setZoom(z, cx, cy) {
      var a = anchor(cx, cy);
      zoom = clampZ(z);
      apply();
      put(a.fx, a.fy, a.ax, a.ay);
    }
    function setLock(on) {
      locked = on;
      btnLock.setAttribute("aria-pressed", String(on));
      btnLock.textContent = on ? "Travado" : "Travar";
      stage.classList.toggle("locked", on);
      document.documentElement.classList.toggle("lock", on);
    }
    btnLock.addEventListener("click", function () { setLock(!locked); });
    $(ids.zin).addEventListener("click", function () { setZoom(zoom * 1.25); });
    $(ids.zout).addEventListener("click", function () { setZoom(zoom / 1.25); });
    function enquadrar(alvo) {
      var c = alvo && typeof alvo.w === "number" ? alvo : (conteudo && conteudo()), vb = svg.viewBox.baseVal;
      if (!c || !(c.w > 0) || !(c.h > 0) || !vb || !vb.width) { setZoom(stage.clientWidth / baseW()); stage.scrollLeft = 0; stage.scrollTop = 0; return; }
      var m = Math.max(c.w, c.h) * 0.06, W = stage.clientWidth || 300;
      var maxH = parseFloat(getComputedStyle(stage).maxHeight), H = isFinite(maxH) && maxH > 0 ? Math.min(maxH, window.innerHeight * 0.85) : (stage.clientHeight || window.innerHeight * 0.6);
      c = { x: c.x - m, y: c.y - m, w: c.w + 2 * m, h: c.h + 2 * m };
      zoom = clampZ(Math.min(W * vb.width / (baseW() * c.w), H * vb.width / (baseW() * c.h)));
      apply();
      var ppu = baseW() * zoom / vb.width;
      stage.scrollLeft = Math.max(0, (c.x - vb.x) * ppu - (W - c.w * ppu) / 2);
      stage.scrollTop = Math.max(0, (c.y - vb.y) * ppu - (Math.min(H, stage.clientHeight || H) - c.h * ppu) / 2);
    }
    $(ids.zfit).addEventListener("click", enquadrar);
    window.addEventListener("resize", apply);
    stage.addEventListener("wheel", function (e) {
      if (locked) { e.preventDefault(); return; }
      if (!e.ctrlKey) return;
      e.preventDefault();
      setZoom(zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX, e.clientY);
    }, { passive: false });

    var ptrs = {}, pinch = null;
    function keys() { return Object.keys(ptrs); }
    function pdist() {
      var k = keys();
      return k.length < 2 ? 0 : Math.hypot(ptrs[k[0]].x - ptrs[k[1]].x, ptrs[k[0]].y - ptrs[k[1]].y);
    }
    function mid() {
      var k = keys();
      return { x: (ptrs[k[0]].x + ptrs[k[1]].x) / 2, y: (ptrs[k[0]].y + ptrs[k[1]].y) / 2 };
    }
    stage.addEventListener("pointerdown", function (e) {
      ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
      if (keys().length === 2) {
        var m = mid(), a = anchor(m.x, m.y);
        pinch = { d: pdist(), z: zoom, fx: a.fx, fy: a.fy };
        if (onPinch) onPinch();
      }
    });
    stage.addEventListener("pointermove", function (e) {
      if (!ptrs[e.pointerId]) return;
      ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
      if (pinch && pinch.d > 0 && keys().length >= 2) {
        var m = mid(), rect = stage.getBoundingClientRect();
        zoom = clampZ(pinch.z * pdist() / pinch.d);
        apply();
        put(pinch.fx, pinch.fy, m.x - rect.left, m.y - rect.top);
      }
    });
    function pend(e) { delete ptrs[e.pointerId]; if (keys().length < 2) pinch = null; }
    stage.addEventListener("pointerup", pend);
    stage.addEventListener("pointercancel", pend);

    // ---- arrastar a vista com o mouse (como nos programas de desenho) ----
    // Botão do meio ou Espaço segurado: sempre. Botão esquerdo: só quando arrastarEsq() diz (a ferramenta Navegar do Palco).
    // Um toque sem arrastar continua sendo clique (seleciona); depois de arrastar, o clique que vem em seguida é ignorado.
    // No dedo fica a rolagem nativa. A vista anda pela rolagem da área (com o zoom em que o desenho cabe, não sobra para onde ir).
    var pan = null, espaco = false, semCliqueAte = 0;
    function digitando(e) { var t = e.target; return t && (/^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName || "") || t.isContentEditable); }
    document.addEventListener("keydown", function (e) {
      if (e.code !== "Space" || digitando(e) || !stage.offsetParent) return;
      e.preventDefault(); // sem rolar a página nem apertar o botão em foco
      if (!espaco) { espaco = true; stage.classList.add("arrastavel"); }
    });
    document.addEventListener("keyup", function (e) { if (e.code === "Space") { espaco = false; stage.classList.remove("arrastavel"); } });
    stage.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "touch") return;
      var meio = e.button === 1, esq = e.button === 0 && (espaco || (!locked && opcoes && opcoes.arrastarEsq && opcoes.arrastarEsq()));
      if (!meio && !esq) return;
      pan = { x: e.clientX, y: e.clientY, sl: stage.scrollLeft, st: stage.scrollTop, moveu: false, id: e.pointerId };
      // meio e Espaço não chegam às ferramentas (nada de mover painel ou laçar por baixo)
      if (meio || espaco) { e.preventDefault(); e.stopPropagation(); }
    }, true);
    stage.addEventListener("pointermove", function (e) {
      if (!pan || e.pointerId !== pan.id) return;
      var dx = e.clientX - pan.x, dy = e.clientY - pan.y;
      if (!pan.moveu) { if (Math.hypot(dx, dy) < 4) return; pan.moveu = true; stage.classList.add("arrastando"); try { stage.setPointerCapture(pan.id); } catch (er) {} }
      stage.scrollLeft = pan.sl - dx; stage.scrollTop = pan.st - dy;
      e.stopPropagation();
    }, true);
    function fimPan(e) {
      if (!pan || (e && e.pointerId !== pan.id)) return;
      if (pan.moveu) semCliqueAte = performance.now() + 300;
      pan = null; stage.classList.remove("arrastando");
    }
    stage.addEventListener("pointerup", fimPan, true);
    stage.addEventListener("pointercancel", fimPan, true);
    stage.addEventListener("click", function (e) { if (performance.now() < semCliqueAte) { e.stopPropagation(); e.preventDefault(); } }, true);
    stage.addEventListener("auxclick", function (e) { if (e.button === 1) e.preventDefault(); }); // sem a rolagem automática do meio

    return { apply: apply, setLock: setLock, enquadrar: enquadrar };
  }

export function init() {
  viewC = makeViewer(svgC.parentNode, svgC,
    { label: "zoom-label", lock: "btn-lock", zin: "zoom-in", zout: "zoom-out", zfit: "zoom-fit" },
    function () { set_drag(null); }, undefined,
    function () { return tiles.length ? caixaPx(tiles) : null; });
}

export { viewC };
