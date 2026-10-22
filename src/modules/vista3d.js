// Vista 3D (só para olhar): desenhada a partir dos dados do Rig — posição, tamanho, recuo, giro e recortes.
// Não tem dados próprios: editar continua no Rig (cartão, alça, arrastar). Carregada sob demanda (three.js à parte).
// A frente de cada painel recebe a imagem da Montagem (entrada) com o test card escolhido, como o UV map do disguise.
// Aparece embutida no Rig (a vista "3D" do seletor ou a miniatura do mosaico), acompanha as edições ao vivo
// e seleciona o painel tocado (o cartão abre ao lado).
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { tiles, res, selected } from "./core.js";
import { imagemMontagem, PRESETS } from "./composicao.js";
import { projetoAtivo } from "./projetos.js";
import { saveFile, pmsg } from "./exportar.js";
import { select } from "./tabela.js";
import { PROF, pivo, normal } from "./espaco.js";

var noRig = null;

function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }

// leva o painel sem giro (coordenadas do palco: x = mx…, y = my…, z = −recuo, frente para +Z) ao lugar dele:
// gira em volta do pivô, ordem YXZ (a mesma de espaco.js)
var GRAU = Math.PI / 180;
function matrizPainel(t) {
  var P = pivo(t), R = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler((t.rx || 0) * GRAU, (t.ry || 0) * GRAU, (t.rz || 0) * GRAU, "YXZ"));
  return new THREE.Matrix4().makeTranslation(P[0], P[1], P[2]).multiply(R).multiply(new THREE.Matrix4().makeTranslation(-P[0], -P[1], -P[2]));
}

// textura da frente de um painel: o recorte dele na imagem da Montagem, com os gabinetes recortados transparentes
function texturaPainel(img, t) {
  var r = img.rects[t.id], q = res(t);
  if (!r) return null;
  var w = Math.max(2, Math.round(r.w)), h = Math.max(2, Math.round(r.h)), cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  var ctx = cv.getContext("2d");
  ctx.drawImage(img.canvas, r.x, r.y, r.w, r.h, 0, 0, w, h);
  Object.keys(q.fora).forEach(function (k) {
    var p = k.split(":"), cw = w / q.cols, ch = h / q.rows;
    ctx.clearRect(Math.floor(Number(p[0]) * cw), Math.floor(Number(p[1]) * ch), Math.ceil(cw), Math.ceil(ch));
  });
  var tx = new THREE.CanvasTexture(cv);
  tx.colorSpace = THREE.SRGBColorSpace;
  tx.anisotropy = 4;
  return tx;
}

// embutida no Rig: ocupa o lugar do desenho 2D; acompanha as edições e seleciona pelo toque
export function abrir3DNoRig(alvo) {
  if (noRig) return true;
  noRig = criar(alvo, { aoFechar: function () { noRig = null; } });
  return !!noRig;
}
export function fechar3DNoRig() { if (noRig) noRig.fechar(); }
// algo mudou no Rig (posição, recuo, giro, pivô): a cena embutida se refaz (agrupado, para não refazer a cada passo)
export function atualizar3D() { if (noRig) noRig.atualizar(); }
// a seleção mudou: o painel selecionado fica destacado
export function marcarSel3D() { if (noRig) noRig.marcarSel(); }

function criar(alvo, op) {
  var vivo = true, cheia = !!op.telaCheia;
  var box = el("div", "v3d" + (cheia ? "" : " v3d-rig")), barra = el("div", "v3d-bar"), palco = el("div", "v3d-palco");
  barra.appendChild(el("b", "v3d-tit", cheia ? "Vista 3D" : "3D"));
  var sel = el("select"); sel.setAttribute("aria-label", "O que aparece nos painéis");
  Object.keys(PRESETS).forEach(function (k) { var o = el("option", null, PRESETS[k]); o.value = k; sel.appendChild(o); });
  sel.value = "cores";
  barra.appendChild(sel);
  var bFrente = el("button", "btn", "Frente"), b34 = el("button", "btn", "3/4"), bTopo = el("button", "btn", "Topo"), bFoto = el("button", "btn", "Foto (PNG)");
  var botoes = [bFrente, b34, bTopo, bFoto], bFechar = null;
  if (cheia) { bFechar = el("button", "btn", "Fechar"); botoes.push(bFechar); }
  botoes.forEach(function (b) { b.type = "button"; barra.appendChild(b); });
  barra.appendChild(el("span", "v3d-dica", cheia ? "Arraste para girar · pinça ou roda para aproximar · dois dedos ou botão direito para mover · toque no cubo para escolher a vista"
    : "Toque num painel para editar no cartão · arraste para girar · pinça ou roda aproxima · botão direito move · cubo escolhe a vista"));
  box.appendChild(barra); box.appendChild(palco);
  alvo.appendChild(box);
  if (cheia) document.body.classList.add("com-3d");

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: (window.devicePixelRatio || 1) < 2, preserveDrawingBuffer: true });
  } catch (e) {
    box.remove(); if (cheia) document.body.classList.remove("com-3d");
    pmsg("Este aparelho não conseguiu abrir o 3D (WebGL indisponível).");
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); // DPR 3 desenharia 9× mais pixels
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  palco.appendChild(renderer.domElement);

  var scene = new THREE.Scene();
  // tema claro: os gabinetes escuros se destacam do fundo e os contornos mostram onde cada um termina
  scene.background = new THREE.Color(0xeef1f4);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a96a3, 1.25));
  var sol = new THREE.DirectionalLight(0xffffff, 1.2); sol.position.set(4, 8, 10); scene.add(sol);

  var camera = new THREE.PerspectiveCamera(40, 1, 0.05, 500);
  var controls = new OrbitControls(camera, renderer.domElement);

  // ---- a montagem (refeita quando o Rig muda): gabinetes, contornos, chão, eixo 0 e frentes ----
  var COR = new THREE.Color(0x3b434d), COR_SEL = new THREE.Color(0xe08a1e);
  var geo = new THREE.Group(), caixas = null, instIds = [], frentes = [];
  var L = null, cx = 0, cy = 0, cz = 0, larg = 1, alt = 1, temTeto = false;
  scene.add(geo);

  function limpar() {
    geo.children.slice().forEach(function (o) {
      geo.remove(o);
      if (o.geometry) o.geometry.dispose();
      (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) { if (!m) return; if (m.map) m.map.dispose(); m.dispose(); });
    });
    caixas = null; instIds = []; frentes = [];
  }

  function montar() {
    limpar();
    var matrizes = {};
    tiles.forEach(function (t) { matrizes[t.id] = matrizPainel(t); });
    // gabinetes: uma caixa por gabinete existente, todas num único objeto (uma chamada de desenho), já no lugar do palco
    var n = tiles.reduce(function (a, t) { return a + res(t).n; }, 0);
    caixas = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, metalness: 0.1 }), Math.max(1, n));
    var m = new THREE.Matrix4(), pos = new THREE.Vector3(), rot = new THREE.Quaternion(), esc = new THREE.Vector3(), i = 0;
    // contorno de cada gabinete (as 12 arestas da caixa): deixa claro onde cada um começa e termina
    var arestas = [], v3 = new THREE.Vector3();
    function aresta(mw, a, b) { v3.set(a[0], a[1], a[2]).applyMatrix4(mw); arestas.push(v3.x, v3.y, v3.z); v3.set(b[0], b[1], b[2]).applyMatrix4(mw); arestas.push(v3.x, v3.y, v3.z); }
    tiles.forEach(function (t) {
      var q = res(t), z = -(t.z || 0), mw = matrizes[t.id], z1 = z + 0.003, z0 = z - PROF;
      for (var r = 0; r < q.rows; r++) for (var c = 0; c < q.cols; c++) {
        if (q.fora[c + ":" + r]) continue;
        pos.set(t.mx + (c + 0.5) * q.mw, t.my + (q.rows - 1 - r + 0.5) * q.mh, z - PROF / 2);
        esc.set(q.mw * 0.992, q.mh * 0.992, PROF);
        instIds[i] = t.id;
        caixas.setMatrixAt(i++, m.compose(pos, rot, esc).premultiply(mw));
        var x0 = t.mx + c * q.mw, x1 = x0 + q.mw, y0 = t.my + (q.rows - 1 - r) * q.mh, y1 = y0 + q.mh;
        [z0, z1].forEach(function (zz) { aresta(mw, [x0, y0, zz], [x1, y0, zz]); aresta(mw, [x1, y0, zz], [x1, y1, zz]); aresta(mw, [x1, y1, zz], [x0, y1, zz]); aresta(mw, [x0, y1, zz], [x0, y0, zz]); });
        [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].forEach(function (v) { aresta(mw, [v[0], v[1], z0], [v[0], v[1], z1]); });
      }
    });
    caixas.count = i;
    caixas.instanceMatrix.needsUpdate = true;
    geo.add(caixas);
    pintarSel();
    var gArestas = new THREE.BufferGeometry();
    gArestas.setAttribute("position", new THREE.Float32BufferAttribute(arestas.length ? arestas : [0, 0, 0, 0, 0, 0], 3));
    geo.add(new THREE.LineSegments(gArestas, new THREE.LineBasicMaterial({ color: 0x141a21, transparent: true, opacity: 0.45 })));

    // limites do conjunto no palco (m): enquadramento e chão
    gArestas.computeBoundingBox();
    L = gArestas.boundingBox; cx = (L.min.x + L.max.x) / 2; cy = (L.min.y + L.max.y) / 2; cz = (L.min.z + L.max.z) / 2;
    larg = Math.max(L.max.x - L.min.x, (L.max.z - L.min.z) * 0.7); alt = L.max.y - L.min.y;
    var lado = Math.ceil(Math.max(L.max.x - L.min.x, L.max.z - L.min.z, alt) / 2 + 6);
    var grade = new THREE.GridHelper(lado * 2, lado * 2, 0x9aa5b1, 0xd3d9df);
    grade.position.set(Math.round(cx), 0, Math.round(cz));
    geo.add(grade);
    // eixo 0 do Rig (centro do palco), no chão
    geo.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0.002, cz - lado), new THREE.Vector3(0, 0.002, cz + lado)]), new THREE.LineBasicMaterial({ color: 0x2f7de1, transparent: true, opacity: 0.6 })));

    // frentes: um plano por painel com a imagem da Montagem, no lugar do painel (com o giro)
    var img = tiles.length ? imagemMontagem(sel.value, 4096) : null;
    tiles.forEach(function (t) {
      var q = res(t), w = q.cols * q.mw, h = q.rows * q.mh, tx = img && texturaPainel(img, t);
      var mat = new THREE.MeshBasicMaterial({ map: tx, color: tx ? 0xffffff : 0x445566, transparent: true, alphaTest: 0.5 });
      var pl = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      pl.matrixAutoUpdate = false;
      pl.matrix.copy(matrizes[t.id]).multiply(new THREE.Matrix4().makeTranslation(t.mx + w / 2, t.my + h / 2, -(t.z || 0) + 0.002));
      pl.userData.id = t.id;
      geo.add(pl); frentes.push(pl);
    });

    // não passa para baixo do chão; com painel virado para baixo (teto), dá para olhar de baixo para cima
    temTeto = tiles.some(function (t) { return normal(t)[1] < -0.5; });
    controls.maxPolarAngle = temTeto ? Math.PI * 0.97 : Math.PI * 0.495;
    pintarSel(); // de novo, agora com as frentes
  }

  // painel selecionado em destaque (só na embutida: lá o toque seleciona): os outros ficam esmaecidos e as caixas dele
  // (laterais e fundo, que a imagem da frente não cobre) ficam laranja
  var ESMAECIDO = new THREE.Color(0x8c8c8c), CHEIO = new THREE.Color(0xffffff);
  function pintarSel() {
    if (!caixas) return;
    var s = !cheia && selected;
    for (var k = 0; k < caixas.count; k++) caixas.setColorAt(k, s && instIds[k] === s ? COR_SEL : COR);
    if (caixas.instanceColor) caixas.instanceColor.needsUpdate = true;
    frentes.forEach(function (f) { if (f.material.map) f.material.color.copy(s && f.userData.id !== s ? ESMAECIDO : CHEIO); });
    pedir();
  }

  function distEnquadrar() {
    return Math.max(larg / (2 * Math.tan(THREE.MathUtils.degToRad(20)) * Math.max(0.6, camera.aspect)), alt / (2 * Math.tan(THREE.MathUtils.degToRad(20)))) * 1.25 + 1;
  }
  function vista(tipo, instantaneo) {
    controls.target.set(cx, cy, cz);
    var d = tipo === "frente" ? new THREE.Vector3(0, 0, 1) : tipo === "topo" ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(-0.55, 0.25, 0.85);
    girarPara(d, distEnquadrar(), instantaneo);
  }

  // gira a câmera em volta do alvo até a direção pedida (animado, ~0,35 s); dist opcional
  var anim = null;
  function girarPara(dir, dist, instantaneo) {
    dir = dir.clone().normalize();
    if (Math.abs(dir.y) > 0.999) dir.set(0, Math.sign(dir.y), 0.002).normalize(); // olhar reto de cima (ou de baixo) trava a órbita
    var rel = camera.position.clone().sub(controls.target), r0 = rel.length() || 1, r1 = dist || r0, a = rel.lengthSq() ? rel.normalize() : dir.clone();
    var q = new THREE.Quaternion().setFromUnitVectors(a, dir), id = new THREE.Quaternion(), t0 = performance.now();
    if (anim) cancelAnimationFrame(anim);
    (function passo() {
      var k = instantaneo ? 1 : Math.min(1, (performance.now() - t0) / 350), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      var d = a.clone().applyQuaternion(id.clone().slerp(q, e)).multiplyScalar(r0 + (r1 - r0) * e);
      camera.position.copy(controls.target).add(d);
      controls.update(); pedir();
      anim = k < 1 && vivo ? requestAnimationFrame(passo) : null;
    })();
  }

  // ---- cubo de vistas no canto (como nos programas de 3D): acompanha a câmera; tocar numa face, aresta ou canto gira até lá ----
  var CUBO = 112, MARG = 10;
  var cenaCubo = new THREE.Scene(), camCubo = new THREE.OrthographicCamera(-0.9, 0.9, 0.9, -0.9, 0.1, 10);
  function face(txt) {
    var cv = document.createElement("canvas"); cv.width = cv.height = 128;
    var x = cv.getContext("2d");
    x.fillStyle = "#f8fafc"; x.fillRect(0, 0, 128, 128);
    x.strokeStyle = "#8a96a3"; x.lineWidth = 6; x.strokeRect(3, 3, 122, 122);
    x.fillStyle = "#1f2933"; x.font = "800 " + (txt.length > 6 ? 22 : 28) + "px system-ui, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle";
    x.fillText(txt, 64, 66);
    var tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshBasicMaterial({ map: tx });
  }
  // ordem das faces do BoxGeometry: +x, −x, +y, −y, +z, −z
  var cubo = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), ["DIREITA", "ESQUERDA", "TOPO", "BAIXO", "FRENTE", "TRÁS"].map(face));
  var bordaCubo = new THREE.LineSegments(new THREE.EdgesGeometry(cubo.geometry), new THREE.LineBasicMaterial({ color: 0x5b6773 }));
  cenaCubo.add(cubo); cenaCubo.add(bordaCubo);
  function desenharCubo() {
    camCubo.position.copy(camera.position).sub(controls.target).normalize().multiplyScalar(3);
    camCubo.up.copy(camera.up); camCubo.lookAt(0, 0, 0);
    var w = palco.clientWidth || 300, h = palco.clientHeight || 300;
    renderer.setScissorTest(true);
    renderer.setScissor(w - CUBO - MARG, h - CUBO - MARG, CUBO, CUBO);
    renderer.setViewport(w - CUBO - MARG, h - CUBO - MARG, CUBO, CUBO);
    renderer.autoClear = false; renderer.clearDepth();
    renderer.render(cenaCubo, camCubo);
    renderer.autoClear = true;
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, w, h);
  }
  // ponto do cubo sob o dedo/mouse (ou null se fora dele)
  var ray = new THREE.Raycaster();
  function noCubo(e) {
    var r = renderer.domElement.getBoundingClientRect(), x = e.clientX - r.left - (r.width - CUBO - MARG), y = e.clientY - r.top - MARG;
    if (x < 0 || y < 0 || x > CUBO || y > CUBO) return null;
    ray.setFromCamera(new THREE.Vector2(x / CUBO * 2 - 1, -(y / CUBO * 2 - 1)), camCubo);
    var hit = ray.intersectObject(cubo)[0];
    return hit ? hit.point : null;
  }
  // painel sob o dedo/mouse (pelas caixas dos gabinetes ou pela frente), ou null
  function painelEm(e) {
    var r = renderer.domElement.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height * 2 - 1)), camera);
    var hit = ray.intersectObjects(frentes.concat(caixas ? [caixas] : []), false)[0];
    if (!hit) return null;
    return hit.object === caixas ? instIds[hit.instanceId] : hit.object.userData.id;
  }
  var toque = null;
  renderer.domElement.addEventListener("pointerdown", function (e) { toque = { x: e.clientX, y: e.clientY }; });
  renderer.domElement.addEventListener("pointerup", function (e) {
    if (!toque || Math.hypot(e.clientX - toque.x, e.clientY - toque.y) > 4) { toque = null; return; }
    toque = null;
    var p = noCubo(e);
    if (p) {
      // face, aresta ou canto: cada eixo perto da borda do cubo entra na direção
      var d = new THREE.Vector3(Math.abs(p.x) > 0.3 ? Math.sign(p.x) : 0, Math.abs(p.y) > 0.3 ? Math.sign(p.y) : 0, Math.abs(p.z) > 0.3 ? Math.sign(p.z) : 0);
      if (d.y < 0 && !temTeto) d.y = 0; // por baixo só faz sentido com teto
      if (d.lengthSq() > 0) girarPara(d);
      return;
    }
    if (cheia || e.button) return;
    var id = painelEm(e); // embutida: tocar num painel abre o cartão dele; no vazio, fecha
    select(id && id === selected ? null : id);
  });
  renderer.domElement.addEventListener("pointermove", function (e) { if (!e.buttons) renderer.domElement.style.cursor = noCubo(e) || (!cheia && painelEm(e)) ? "pointer" : ""; });

  var pendente = false;
  function pedir() {
    if (pendente) return;
    pendente = true;
    requestAnimationFrame(function () { pendente = false; if (vivo) { renderer.render(scene, camera); desenharCubo(); } });
  }
  controls.addEventListener("change", pedir);

  function medir() {
    var w = palco.clientWidth || 300, h = palco.clientHeight || 300;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = w + "px"; renderer.domElement.style.height = h + "px";
    camera.aspect = w / h; camera.updateProjectionMatrix(); pedir();
  }
  var ro = new ResizeObserver(medir); ro.observe(palco);

  function fechar() {
    if (!vivo) return;
    vivo = false;
    clearTimeout(refazer);
    ro.disconnect(); controls.dispose();
    limpar();
    cubo.geometry.dispose(); cubo.material.forEach(function (m) { if (m.map) m.map.dispose(); m.dispose(); });
    bordaCubo.geometry.dispose(); bordaCubo.material.dispose();
    if (anim) cancelAnimationFrame(anim);
    renderer.dispose();
    if (cheia) { document.removeEventListener("keydown", tecla, true); document.body.classList.remove("com-3d"); }
    box.remove();
    op.aoFechar();
  }
  function tecla(e) { if (e.key === "Escape") { e.stopImmediatePropagation(); fechar(); } }
  if (cheia) document.addEventListener("keydown", tecla, true);

  // edições em sequência (digitando um ângulo, arrastando no 2D) refazem a cena uma vez só, sem mexer na câmera
  var refazer = null;
  function atualizar() { clearTimeout(refazer); refazer = setTimeout(function () { if (vivo) montar(); }, 120); }

  sel.addEventListener("change", montar);
  bFrente.addEventListener("click", function () { vista("frente"); });
  b34.addEventListener("click", function () { vista("34"); });
  bTopo.addEventListener("click", function () { vista("topo"); });
  if (bFechar) bFechar.addEventListener("click", fechar);
  bFoto.addEventListener("click", function () {
    renderer.render(scene, camera); // a foto sai sem o cubo
    renderer.domElement.toBlob(function (bl) {
      if (!bl) { pmsg("Não consegui gerar a imagem."); return; }
      var nome = ((projetoAtivo() || {}).nome || "ledmap").replace(/[^\w\-]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
      saveFile(nome + "-3d.png", bl);
    }, "image/png");
  });

  medir();
  montar();
  vista("34", true);
  return { fechar: fechar, atualizar: atualizar, marcarSel: pintarSel };
}
