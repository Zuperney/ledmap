// Vista 3D (só para olhar): desenhada a partir dos dados do Rig — posição, tamanho, profundidade e recortes.
// Não tem dados próprios: editar continua no Rig 2D. Carregada sob demanda (o three.js fica num pedaço à parte).
// A frente de cada painel recebe a imagem da Montagem (entrada) com o test card escolhido, como o UV map do disguise.
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { tiles, res } from "./core.js";
import { imagemMontagem, PRESETS } from "./composicao.js";
import { projetoAtivo } from "./projetos.js";
import { saveFile, pmsg } from "./exportar.js";

var PROF = 0.09; // espessura do gabinete desenhada (m)
var aberta = null;

function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }

// limites do conjunto em metros (x, y do chão para cima, z para frente)
function limites() {
  var b = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity, z0: Infinity, z1: -Infinity };
  tiles.forEach(function (t) {
    var q = res(t);
    b.x0 = Math.min(b.x0, t.mx); b.x1 = Math.max(b.x1, t.mx + q.cols * q.mw);
    b.y0 = Math.min(b.y0, t.my); b.y1 = Math.max(b.y1, t.my + q.rows * q.mh);
    b.z0 = Math.min(b.z0, -(t.z || 0) - PROF); b.z1 = Math.max(b.z1, -(t.z || 0));
  });
  return b;
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

export function abrir3D() {
  if (aberta) return;
  if (!tiles.length) { pmsg("Adicione painéis para ver em 3D."); return; }

  var box = el("div", "v3d"), barra = el("div", "v3d-bar"), palco = el("div", "v3d-palco");
  barra.appendChild(el("b", "v3d-tit", "Vista 3D"));
  var sel = el("select"); sel.setAttribute("aria-label", "O que aparece nos painéis");
  Object.keys(PRESETS).forEach(function (k) { var o = el("option", null, PRESETS[k]); o.value = k; sel.appendChild(o); });
  sel.value = "cores";
  barra.appendChild(sel);
  var bFrente = el("button", "btn", "Frente"), b34 = el("button", "btn", "3/4"), bTopo = el("button", "btn", "Topo"), bFoto = el("button", "btn", "Foto (PNG)"), bFechar = el("button", "btn", "Fechar");
  [bFrente, b34, bTopo, bFoto, bFechar].forEach(function (b) { b.type = "button"; barra.appendChild(b); });
  barra.appendChild(el("span", "v3d-dica", "Arraste para girar · pinça ou roda para aproximar · dois dedos ou botão direito para mover · toque no cubo para escolher a vista"));
  box.appendChild(barra); box.appendChild(palco);
  document.body.appendChild(box);
  document.body.classList.add("com-3d");

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: (window.devicePixelRatio || 1) < 2, preserveDrawingBuffer: true });
  } catch (e) {
    box.remove(); document.body.classList.remove("com-3d");
    pmsg("Este aparelho não conseguiu abrir o 3D (WebGL indisponível).");
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); // DPR 3 desenharia 9× mais pixels
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  palco.appendChild(renderer.domElement);

  var scene = new THREE.Scene();
  // tema claro: os gabinetes escuros se destacam do fundo e os contornos mostram onde cada um termina
  scene.background = new THREE.Color(0xeef1f4);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a96a3, 1.25));
  var sol = new THREE.DirectionalLight(0xffffff, 1.2); sol.position.set(4, 8, 10); scene.add(sol);

  var L = limites(), cx = (L.x0 + L.x1) / 2, cy = (L.y0 + L.y1) / 2, larg = L.x1 - L.x0, alt = L.y1 - L.y0;
  var lado = Math.ceil(Math.max(larg, alt, Math.abs(L.z0) + 2) + 6);
  var grade = new THREE.GridHelper(lado * 2, lado * 2, 0x9aa5b1, 0xd3d9df);
  grade.position.set(cx, 0, (L.z0 + L.z1) / 2);
  scene.add(grade);
  // eixo 0 do Rig (centro do palco), no chão
  var eixo = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0.002, -lado), new THREE.Vector3(0, 0.002, lado)]), new THREE.LineBasicMaterial({ color: 0x2f7de1, transparent: true, opacity: 0.6 }));
  scene.add(eixo);

  // gabinetes: uma caixa por gabinete existente, todas num único objeto (uma chamada de desenho)
  var n = tiles.reduce(function (a, t) { return a + res(t).n; }, 0);
  var caixas = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x3b434d, roughness: 0.85, metalness: 0.1 }), Math.max(1, n));
  var m = new THREE.Matrix4(), pos = new THREE.Vector3(), rot = new THREE.Quaternion(), esc = new THREE.Vector3(), i = 0;
  tiles.forEach(function (t) {
    var q = res(t), z = -(t.z || 0);
    for (var r = 0; r < q.rows; r++) for (var c = 0; c < q.cols; c++) {
      if (q.fora[c + ":" + r]) continue;
      pos.set(t.mx + (c + 0.5) * q.mw, t.my + (q.rows - 1 - r + 0.5) * q.mh, z - PROF / 2);
      esc.set(q.mw * 0.992, q.mh * 0.992, PROF);
      caixas.setMatrixAt(i++, m.compose(pos, rot, esc));
    }
  });
  caixas.count = i;
  caixas.instanceMatrix.needsUpdate = true;
  scene.add(caixas);

  // contorno de cada gabinete (as 12 arestas da caixa): deixa claro onde cada um começa e termina
  var arestas = [];
  tiles.forEach(function (t) {
    var q = res(t), z1 = -(t.z || 0) + 0.003, z0 = -(t.z || 0) - PROF;
    for (var r = 0; r < q.rows; r++) for (var c = 0; c < q.cols; c++) {
      if (q.fora[c + ":" + r]) continue;
      var x0 = t.mx + c * q.mw, x1 = x0 + q.mw, y0 = t.my + (q.rows - 1 - r) * q.mh, y1 = y0 + q.mh;
      [z0, z1].forEach(function (z) { arestas.push(x0, y0, z, x1, y0, z, x1, y0, z, x1, y1, z, x1, y1, z, x0, y1, z, x0, y1, z, x0, y0, z); });
      [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].forEach(function (v) { arestas.push(v[0], v[1], z0, v[0], v[1], z1); });
    }
  });
  var gArestas = new THREE.BufferGeometry();
  gArestas.setAttribute("position", new THREE.Float32BufferAttribute(arestas, 3));
  var linhas = new THREE.LineSegments(gArestas, new THREE.LineBasicMaterial({ color: 0x141a21, transparent: true, opacity: 0.45 }));
  scene.add(linhas);

  // frentes: um plano por painel com a imagem da Montagem
  var frentes = [];
  function montarFrentes() {
    frentes.forEach(function (f) { scene.remove(f); f.geometry.dispose(); if (f.material.map) f.material.map.dispose(); f.material.dispose(); });
    frentes = [];
    var img = imagemMontagem(sel.value, 4096);
    tiles.forEach(function (t) {
      var q = res(t), w = q.cols * q.mw, h = q.rows * q.mh, tx = img && texturaPainel(img, t);
      var mat = new THREE.MeshBasicMaterial({ map: tx, color: tx ? 0xffffff : 0x445566, transparent: true, alphaTest: 0.5 });
      var pl = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      pl.position.set(t.mx + w / 2, t.my + h / 2, -(t.z || 0) + 0.002);
      scene.add(pl); frentes.push(pl);
    });
    pedir();
  }

  var camera = new THREE.PerspectiveCamera(40, 1, 0.05, 500);
  var controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(cx, cy, -0.3);
  controls.maxPolarAngle = Math.PI * 0.495; // não passa para baixo do chão

  function distEnquadrar() {
    return Math.max(larg / (2 * Math.tan(THREE.MathUtils.degToRad(20)) * Math.max(0.6, camera.aspect)), alt / (2 * Math.tan(THREE.MathUtils.degToRad(20)))) * 1.25 + 1;
  }
  function vista(tipo, instantaneo) {
    controls.target.set(cx, cy, -0.3);
    var d = tipo === "frente" ? new THREE.Vector3(0, 0, 1) : tipo === "topo" ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(-0.55, 0.25, 0.85);
    girarPara(d, distEnquadrar(), instantaneo);
  }

  // gira a câmera em volta do alvo até a direção pedida (animado, ~0,35 s); dist opcional
  var anim = null;
  function girarPara(dir, dist, instantaneo) {
    dir = dir.clone().normalize();
    if (dir.y > 0.999) dir.set(0, 1, 0.002).normalize(); // olhar reto de cima trava a órbita
    var rel = camera.position.clone().sub(controls.target), r0 = rel.length() || 1, r1 = dist || r0, a = rel.lengthSq() ? rel.normalize() : dir.clone();
    var q = new THREE.Quaternion().setFromUnitVectors(a, dir), id = new THREE.Quaternion(), t0 = performance.now();
    if (anim) cancelAnimationFrame(anim);
    (function passo() {
      var k = instantaneo ? 1 : Math.min(1, (performance.now() - t0) / 350), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      var d = a.clone().applyQuaternion(id.clone().slerp(q, e)).multiplyScalar(r0 + (r1 - r0) * e);
      camera.position.copy(controls.target).add(d);
      controls.update(); pedir();
      anim = k < 1 && aberta ? requestAnimationFrame(passo) : null;
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
  var toque = null;
  renderer.domElement.addEventListener("pointerdown", function (e) { toque = { x: e.clientX, y: e.clientY }; });
  renderer.domElement.addEventListener("pointerup", function (e) {
    if (!toque || Math.hypot(e.clientX - toque.x, e.clientY - toque.y) > 4) { toque = null; return; }
    toque = null;
    var p = noCubo(e);
    if (!p) return;
    // face, aresta ou canto: cada eixo perto da borda do cubo entra na direção
    var d = new THREE.Vector3(Math.abs(p.x) > 0.3 ? Math.sign(p.x) : 0, Math.abs(p.y) > 0.3 ? Math.sign(p.y) : 0, Math.abs(p.z) > 0.3 ? Math.sign(p.z) : 0);
    if (d.y < 0) d.y = 0; // por baixo do chão não dá
    if (d.lengthSq() > 0) girarPara(d);
  });
  renderer.domElement.addEventListener("pointermove", function (e) { if (!e.buttons) renderer.domElement.style.cursor = noCubo(e) ? "pointer" : ""; });

  var pendente = false;
  function pedir() {
    if (pendente) return;
    pendente = true;
    requestAnimationFrame(function () { pendente = false; if (aberta) { renderer.render(scene, camera); desenharCubo(); } });
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
    aberta = null;
    ro.disconnect(); controls.dispose();
    frentes.forEach(function (f) { f.geometry.dispose(); if (f.material.map) f.material.map.dispose(); f.material.dispose(); });
    caixas.geometry.dispose(); caixas.material.dispose(); grade.geometry.dispose(); grade.material.dispose();
    linhas.geometry.dispose(); linhas.material.dispose(); eixo.geometry.dispose(); eixo.material.dispose();
    cubo.geometry.dispose(); cubo.material.forEach(function (m) { if (m.map) m.map.dispose(); m.dispose(); });
    bordaCubo.geometry.dispose(); bordaCubo.material.dispose();
    if (anim) cancelAnimationFrame(anim);
    renderer.dispose();
    document.removeEventListener("keydown", tecla, true);
    box.remove(); document.body.classList.remove("com-3d");
  }
  function tecla(e) { if (e.key === "Escape") { e.stopImmediatePropagation(); fechar(); } }
  document.addEventListener("keydown", tecla, true);

  sel.addEventListener("change", montarFrentes);
  bFrente.addEventListener("click", function () { vista("frente"); });
  b34.addEventListener("click", function () { vista("34"); });
  bTopo.addEventListener("click", function () { vista("topo"); });
  bFechar.addEventListener("click", fechar);
  bFoto.addEventListener("click", function () {
    renderer.render(scene, camera); // a foto sai sem o cubo
    renderer.domElement.toBlob(function (bl) {
      if (!bl) { pmsg("Não consegui gerar a imagem."); return; }
      var nome = ((projetoAtivo() || {}).nome || "ledmap").replace(/[^\w\-]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
      saveFile(nome + "-3d.png", bl);
    }, "image/png");
  });

  aberta = { fechar: fechar };
  medir();
  montarFrentes();
  vista("34", true);
}
