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
  barra.appendChild(el("span", "v3d-dica", "Arraste para girar · pinça ou roda para aproximar · dois dedos ou botão direito para mover"));
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
  scene.background = new THREE.Color(0x0d1319);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x1a222b, 1.1));
  var sol = new THREE.DirectionalLight(0xffffff, 1.2); sol.position.set(4, 8, 10); scene.add(sol);

  var L = limites(), cx = (L.x0 + L.x1) / 2, cy = (L.y0 + L.y1) / 2, larg = L.x1 - L.x0, alt = L.y1 - L.y0;
  var lado = Math.ceil(Math.max(larg, alt, Math.abs(L.z0) + 2) + 6);
  var grade = new THREE.GridHelper(lado * 2, lado * 2, 0x3a4652, 0x222c36);
  grade.position.set(cx, 0, (L.z0 + L.z1) / 2);
  scene.add(grade);

  // gabinetes: uma caixa por gabinete existente, todas num único objeto (uma chamada de desenho)
  var n = tiles.reduce(function (a, t) { return a + res(t).n; }, 0);
  var caixas = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x2a3038, roughness: 0.85, metalness: 0.1 }), Math.max(1, n));
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

  function vista(tipo) {
    var dist = Math.max(larg / (2 * Math.tan(THREE.MathUtils.degToRad(20)) * Math.max(0.6, camera.aspect)), alt / (2 * Math.tan(THREE.MathUtils.degToRad(20)))) * 1.25 + 1;
    controls.target.set(cx, cy, -0.3);
    if (tipo === "frente") camera.position.set(cx, cy, dist);
    else if (tipo === "topo") camera.position.set(cx, cy + dist, 0.5);
    else camera.position.set(cx - dist * 0.55, cy + dist * 0.25, dist * 0.85);
    controls.update(); pedir();
  }

  var pendente = false;
  function pedir() {
    if (pendente) return;
    pendente = true;
    requestAnimationFrame(function () { pendente = false; if (aberta) renderer.render(scene, camera); });
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
    renderer.render(scene, camera);
    renderer.domElement.toBlob(function (bl) {
      if (!bl) { pmsg("Não consegui gerar a imagem."); return; }
      var nome = ((projetoAtivo() || {}).nome || "ledmap").replace(/[^\w\-]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
      saveFile(nome + "-3d.png", bl);
    }, "image/png");
  });

  aberta = { fechar: fechar };
  medir();
  montarFrentes();
  vista("34");
}
