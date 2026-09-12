// ===== 描画エンジン: レンダラー・照明・ポスト処理・状態・共通ユーティリティ =====
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const easeInOut = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.platform));
const narrow = () => matchMedia('(max-width: 1100px)').matches;
const compact = () => matchMedia('(max-width: 760px)').matches;
const T0 = performance.now(); const TL = {}; const mark = k => { TL[k] = Math.round(performance.now() - T0); };

const S = {
  mode: 'normal', explode: 0, explodeT: 0, power: 0, flight: null, flightT: 0, depth: 'simple', tab: 'see',
  view: 'iso', labels: true, arrows: false, air: false, autoRotate: !reduceMotion, shadows: true, slow: false, ts: 1, logTs: 0, tsTarget: 1,
  selected: null, selAll: false, hovered: null, isolated: null, quality: 'auto', qLevel: 3, lastInteract: performance.now(), lastSelect: -1e9,
  camSpring: null, camInertia: null, sticks: false, tilt: false, theater: null, overlay: null, question: null, use: null, scale: false, price: false, whatif: null, labelOnly: null, labelsSuppressed: false, expert: null, alive: true, big: false, lang: 'ja', lesson: null,
  aoDirty: true, shadowDirty: true, csDirty: true, envMul: 1, exposureMul: 1,
};

// ---------- レンダラー・シーン ----------
const canvas = $('#gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', stencil: false });
let W = 1, H = 1, DPR = 1;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;
renderer.localClippingEnabled = true; renderer.info.autoReset = false;
renderer.transmissionResolutionScale = 0.5;
const HF = renderer.extensions.has('EXT_color_buffer_half_float') || renderer.extensions.has('EXT_color_buffer_float');
const RT_TYPE = HF ? THREE.HalfFloatType : THREE.UnsignedByteType;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 0.02, 40);
camera.position.set(0.78, 0.50, -0.82);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = 0.08; controls.minDistance = 0.10; controls.maxDistance = 3.2; controls.zoomSpeed = 0.8;
controls.maxPolarAngle = Math.PI * 0.68; controls.autoRotateSpeed = 0.45; controls.target.set(0, 0.0, 0);
controls.addEventListener('start', () => { S.lastInteract = performance.now(); onCamInterrupt(); controls.autoRotate = false; if (typeof theater !== 'undefined' && theater.active) theater.cam = false; });
controls.addEventListener('change', () => { S.aoDirty = true; });

mark('gl');
const M = makeMaterials(renderer.capabilities.getMaxAnisotropy()); mark('mat');
const D = buildDrone(M); mark('geo');
scene.add(D.root);
if (D.personGroup) scene.add(D.personGroup);

// ---------- 環境マップ (羽根付きパネルのスタジオ) ----------
function makeStudioEnv() {
  const env = new THREE.Scene();
  const panel = (w, h, i, c, pos, feather = 0.18) => {
    const g = new THREE.PlaneGeometry(w, h, 12, 12), col = [];
    for (let k = 0; k < g.attributes.position.count; k++) { const u = Math.abs(g.attributes.position.getX(k)) / (w / 2), v = Math.abs(g.attributes.position.getY(k)) / (h / 2); const f = 1 - smoothstep(1 - feather, 1, Math.max(u, v)); col.push(f, f, f); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const m = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }); m.color.set(c).multiplyScalar(i);
    const p = new THREE.Mesh(g, m); p.position.copy(pos); p.lookAt(0, 0, 0); env.add(p);
  };
  panel(4, 4, 1.4, 0xffffff, new THREE.Vector3(0, 8, 0));
  panel(5, 3.5, 3.0, 0xfff1e0, new THREE.Vector3(5.6, 5.6, -4.3));
  panel(10, 0.7, 4.0, 0xffffff, new THREE.Vector3(0, 7.5, 1.5), 0.35);
  panel(3, 2, 4.0, 0xdfe9ff, new THREE.Vector3(-4.8, 4.2, 6.4));
  panel(7, 5, 0.015, 0xffffff, new THREE.Vector3(-8, 0.5, -2));
  const dome = new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16), new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true }));
  { const g = dome.geometry, pos = g.attributes.position, col = []; for (let i = 0; i < pos.count; i++) { const t = clamp(pos.getY(i) / 20, -1, 1); const v = t >= 0 ? lerp(0.18, 0.30, t) : lerp(0.18, 0.06, -t); col.push(v, v * 1.03, v * 1.08); } g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); }
  env.add(dome);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(8, 48), new THREE.MeshBasicMaterial({ vertexColors: true }));
  { const g = floor.geometry, pos = g.attributes.position, col = []; for (let i = 0; i < pos.count; i++) { const r = Math.hypot(pos.getX(i), pos.getY(i)) / 8; const v = lerp(0.24, 0.07, r); col.push(v, v, v); } g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); }
  floor.rotation.x = -Math.PI / 2; floor.position.y = -1; env.add(floor);
  return env;
}
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(makeStudioEnv(), 0.035).texture; pmrem.dispose();
scene.environmentIntensity = 1.0;

// ---------- 照明 ----------
const key = new THREE.DirectionalLight(0xfff6ea, 3.2); key.position.set(1.05, 1.05, -0.8); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048); { const c = key.shadow.camera; c.left = c.bottom = -0.5; c.right = c.top = 0.5; c.near = 1.0; c.far = 3.0; }
key.shadow.bias = -0.00005; key.shadow.normalBias = 0.0006;
scene.add(key, key.target);
const rim = new THREE.DirectionalLight(0xe4ecff, 1.4); rim.position.set(-0.9, 0.8, 1.2); scene.add(rim);
const kick = new THREE.DirectionalLight(0xdde8ff, 0.5); kick.position.set(0.8, 0.3, 1.1); scene.add(kick);
for (const mo of D.motors) for (const o of [mo.mags]) o.castShadow = false;

// ---------- 背景球 (シェーダ) と 床 ----------
const backdropMat = new THREE.ShaderMaterial({
  uniforms: { top: { value: new THREE.Color() }, mid: { value: new THREE.Color() }, edge: { value: new THREE.Color() }, bottom: { value: new THREE.Color() }, spotDir: { value: new THREE.Vector3(0, 0, 1) } },
  vertexShader: `varying vec3 vDir; void main(){ vDir = normalize((modelMatrix * vec4(position,1.0)).xyz); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `uniform vec3 top, mid, edge, bottom, spotDir; varying vec3 vDir;
    void main(){ vec3 d = normalize(vDir); float y = d.y;
      vec3 c = y > 0.0 ? mix(edge, top, smoothstep(0.0, 0.9, y)) : mix(edge, bottom, smoothstep(0.0, 0.6, -y));
      float sp = smoothstep(0.45, 1.0, dot(d, spotDir)) * smoothstep(-0.25, 0.35, y);
      c = mix(c, mid, sp * 0.9);
      gl_FragColor = vec4(c, 1.0); }`,
  side: THREE.BackSide, depthWrite: false, fog: false,
});
const backdrop = new THREE.Mesh(new THREE.SphereGeometry(16, 48, 24), backdropMat); backdrop.renderOrder = -10; scene.add(backdrop);
const groundMat = new THREE.MeshPhysicalMaterial({ color: 0xe4e6ea, roughness: 0.75, metalness: 0, clearcoat: 0.25, clearcoatRoughness: 0.45, transparent: true, alphaMap: M.groundAlphaTex, depthWrite: true });
const gridU = { uGrid: { value: 0 }, uLine: { value: new THREE.Color(0x30343c) } };
groundMat.onBeforeCompile = sh => {
  sh.uniforms.uGrid = gridU.uGrid; sh.uniforms.uLine = gridU.uLine;
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp; uniform float uGrid; uniform vec3 uLine;\nfloat gridLine(vec2 p, float s){ vec2 q = abs(fract(p / s - 0.5) - 0.5) / fwidth(p / s); return 1.0 - min(min(q.x, q.y), 1.0); }')
    .replace('#include <color_fragment>', '#include <color_fragment>\n{ float r = length(vWp.xz); float fade = 1.0 - smoothstep(0.9, 1.8, r); float g = gridLine(vWp.xz, 0.05) * 0.04 + gridLine(vWp.xz, 0.25) * 0.10; diffuseColor.rgb = mix(diffuseColor.rgb, uLine, g * uGrid * fade); }');
};
const ground = new THREE.Mesh(new THREE.CircleGeometry(2.8, 96), groundMat); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.158; ground.receiveShadow = true; ground.renderOrder = -1; scene.add(ground);
// 床を広げる。scale は回転の前(ローカル軸)に効くので、円盤の面は x,y。(k,1,k) と書くと前後だけ伸びない楕円になる
const groundScale = (k) => ground.scale.set(k, k, 1);

// ---------- 接地影 (下から見た深度をぼかして床に貼る) ----------
const CS = { size: 1.4, res: 512, height: 0.55 };
const csRT = new THREE.WebGLRenderTarget(CS.res, CS.res), csRT2 = new THREE.WebGLRenderTarget(CS.res, CS.res);
const csCam = new THREE.OrthographicCamera(-CS.size / 2, CS.size / 2, CS.size / 2, -CS.size / 2, 0, CS.height); csCam.rotation.x = Math.PI / 2; csCam.position.y = -0.158 + 0.0005;
const csDepthMat = new THREE.MeshDepthMaterial({ depthPacking: THREE.BasicDepthPacking, blending: THREE.NoBlending });
csDepthMat.onBeforeCompile = sh => { sh.uniforms.darkness = { value: 1.6 }; sh.fragmentShader = 'uniform float darkness;\n' + sh.fragmentShader.replace('gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );', 'gl_FragColor = vec4( vec3( 0.0 ), ( 1.0 - fragCoordZ ) * darkness );'); };
const csPlane = new THREE.Mesh(new THREE.PlaneGeometry(CS.size, CS.size), new THREE.MeshBasicMaterial({ map: csRT.texture, transparent: true, opacity: 0.55, depthWrite: false })); csPlane.rotation.x = -Math.PI / 2; csPlane.position.y = -0.157; csPlane.renderOrder = 0; scene.add(csPlane);
const csBlurH = new THREE.ShaderMaterial(HorizontalBlurShader), csBlurV = new THREE.ShaderMaterial(VerticalBlurShader); csBlurH.depthTest = csBlurV.depthTest = false;
const csQuad = new FullScreenQuad(csBlurH);
function renderContactShadow() {
  const hidden = []; scene.traverse(o => { if ((o.isSprite || o.isPoints || o === ground || o === backdrop || o === csPlane || o.userData.noShadow) && o.visible) { o.visible = false; hidden.push(o); } });
  const oldBg = scene.background; scene.background = null; scene.overrideMaterial = csDepthMat;
  const prevC = renderer.getClearColor(new THREE.Color()), prevA = renderer.getClearAlpha();
  renderer.setRenderTarget(csRT); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(scene, csCam);   // 透明クリア: 影の無い所は床がそのまま見える
  scene.overrideMaterial = null; scene.background = oldBg; for (const o of hidden) o.visible = true;
  const blur = (amt) => { csBlurH.uniforms.tDiffuse.value = csRT.texture; csBlurH.uniforms.h.value = amt / CS.res; csQuad.material = csBlurH; renderer.setRenderTarget(csRT2); csQuad.render(renderer);
    csBlurV.uniforms.tDiffuse.value = csRT2.texture; csBlurV.uniforms.v.value = amt / CS.res; csQuad.material = csBlurV; renderer.setRenderTarget(csRT); csQuad.render(renderer); };
  blur(3.5); blur(1.2); renderer.setRenderTarget(null); renderer.setClearColor(prevC, prevA);
}

// ---------- ポスト処理 ----------
let sceneRT = null;
function makeSceneRT(samples) { if (sceneRT) sceneRT.dispose(); sceneRT = new THREE.WebGLRenderTarget(1, 1, { samples, type: RT_TYPE, depthTexture: new THREE.DepthTexture(1, 1) }); sceneRT.setSize(Math.max(1, W * DPR | 0), Math.max(1, H * DPR | 0)); }
makeSceneRT(4);
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: RT_TYPE, depthBuffer: false }));
const copyQuad = new FullScreenQuad(new THREE.ShaderMaterial(CopyShader));
class ScenePass extends Pass {
  constructor() { super(); this.needsSwap = false; this.particles = null; }
  render(renderer, writeBuffer, readBuffer) {
    renderer.setRenderTarget(sceneRT); renderer.clear(); renderer.render(scene, camera);
    copyQuad.material.uniforms.tDiffuse.value = sceneRT.texture; renderer.setRenderTarget(readBuffer); copyQuad.render(renderer);
    if (this.particles && this.particles.visible) { this.particles.material.uniforms.tDepth.value = sceneRT.depthTexture; renderer.autoClear = false; renderer.render(this.particles, camera); renderer.autoClear = true; }
  }
  setSize(w, h) { if (sceneRT) sceneRT.setSize(w, h); }
}
const scenePass = new ScenePass();
class GtaoLite extends GTAOPass {
  constructor(...a) { super(...a); this.needsSwap = false; this.every = 2; this._n = 0; this.ok = true; }
  overrideVisibility() { this._hid = []; this.scene.traverse(o => { if (o.visible && (o.isPoints || o.isLine || o.isSprite || o.userData.noAO)) { o.visible = false; this._hid.push(o); } }); }   // スプライト・ブラー円盤・LEDカバーはAOに入れない(自前のリストで確実に戻す)
  restoreVisibility() { if (this._hid) for (const o of this._hid) o.visible = true; this._hid = null; }
  render(renderer, writeBuffer, readBuffer) {
    const fresh = S.aoDirty || (++this._n % this.every === 0);
    try {
      if (fresh) {
        try { this.overrideVisibility(); this.renderOverride(renderer, this.normalMaterial, this.normalRenderTarget, 0x7777ff, 1.0); } finally { this.restoreVisibility(); }   // 例外でも必ず戻す(戻し損ねるとLED・気流・輪が消えたままになる)
        const u = this.gtaoMaterial.uniforms; u.cameraNear.value = this.camera.near; u.cameraFar.value = this.camera.far;
        u.cameraProjectionMatrix.value.copy(this.camera.projectionMatrix); u.cameraProjectionMatrixInverse.value.copy(this.camera.projectionMatrixInverse); u.cameraWorldMatrix.value.copy(this.camera.matrixWorld);
        this.renderPass(renderer, this.gtaoMaterial, this.gtaoRenderTarget, 0xffffff, 1.0);
        this.pdMaterial.uniforms.cameraProjectionMatrixInverse.value.copy(this.camera.projectionMatrixInverse);
        this.renderPass(renderer, this.pdMaterial, this.pdRenderTarget, 0xffffff, 1.0);
        S.aoDirty = false;
      }
      this.blendMaterial.uniforms.intensity.value = this.blendIntensity; this.blendMaterial.uniforms.tDiffuse.value = this.pdRenderTarget.texture;
      this.renderPass(renderer, this.blendMaterial, readBuffer);
    } catch (e) { if (this.ok) { console.warn('[drone3d] GtaoLite fallback', e); this.ok = false; } this.needsSwap = true; super.render(renderer, writeBuffer, readBuffer); }
  }
}
const gtao = new GtaoLite(scene, camera, 1, 1);
gtao.output = GTAOPass.OUTPUT.Default;
{ const _setSize = gtao.setSize.bind(gtao); gtao.setSize = (w, h) => _setSize(Math.max(1, Math.round(w / 2)), Math.max(1, Math.round(h / 2))); }
gtao.updateGtaoMaterial({ radius: 0.03, distanceExponent: 1.4, thickness: 0.012, scale: 1.15, samples: 12, distanceFallOff: 0.6, screenSpaceRadius: false });
gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 3, normalPhi: 4, radius: 3, radiusExponent: 1, rings: 2, samples: 10 });
gtao.blendIntensity = 0.65;
const outlineSel = new OutlinePass(new THREE.Vector2(1, 1), scene, camera);
outlineSel.edgeStrength = 4; outlineSel.edgeGlow = 0.35; outlineSel.edgeThickness = 1.0; outlineSel.pulsePeriod = 0;
outlineSel.visibleEdgeColor.set('#ff7a3d'); outlineSel.hiddenEdgeColor.set('#7a3a1c');
{ const _s = OutlinePass.prototype.setSize; outlineSel.setSize = (w, h) => _s.call(outlineSel, Math.max(1, w >> 1), Math.max(1, h >> 1)); }
const outputPass = new OutputPass();
const finishPass = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, vig: { value: 0.20 }, grain: { value: 1 / 255 }, t: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float vig, grain, t; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){ vec4 c = texture2D(tDiffuse, vUv); vec2 q = vUv - 0.5; c.rgb *= 1.0 - vig * smoothstep(0.30, 0.95, dot(q, q) * 2.0); c.rgb += (hash(gl_FragCoord.xy + t) - 0.5) * grain * 2.0; gl_FragColor = c; }`,
});
for (const p of [scenePass, gtao, outlineSel, outputPass, finishPass]) composer.addPass(p);

// ---------- 表示モード用の材質 / ティント ----------
const xrayMat = new THREE.ShaderMaterial({
  uniforms: { color: { value: new THREE.Color('#20304a') }, opacity: { value: 0.85 }, power: { value: 2.2 }, base: { value: 0.05 } },
  // 法線と位置は自前で組む。three r170 では #include <defaultnormal_vertex> 等のチャンクを並べても何も描かれなくなる（X線が丸ごと消えていた）
  vertexShader: `varying vec3 vN; varying vec3 vV;
    void main() {
      vec3 objN = normal; vec4 mv = vec4(position, 1.0);
      #ifdef USE_INSTANCING
        mv = instanceMatrix * mv; objN = mat3(instanceMatrix) * objN;
      #endif
      mv = modelViewMatrix * mv;
      vN = normalize(normalMatrix * objN); vV = normalize(-mv.xyz);
      gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `uniform vec3 color; uniform float opacity; uniform float power; uniform float base; varying vec3 vN; varying vec3 vV;
    void main() { float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), power); gl_FragColor = vec4(color, clamp(base + f * opacity, 0.0, 1.0)); }`,
  transparent: true, depthWrite: false, side: THREE.DoubleSide,
});
const wireMat = new THREE.MeshBasicMaterial({ color: 0x2b3442, wireframe: true, transparent: true, opacity: 0.75, depthWrite: false });
const paperMat = new THREE.MeshBasicMaterial({ color: 0xf3f4f7, polygonOffset: true, polygonOffsetFactor: 1.5, polygonOffsetUnits: 2 });
for (const p of D.parts) for (const m of p.meshes) { m.userData.origMat = m.material; m.userData.castShadow = m.castShadow; }
for (const p of D.parts) for (const m of p.meshes) {
  let wc; if (m.isInstancedMesh) { wc = new THREE.InstancedMesh(m.geometry, wireMat, m.count); wc.instanceMatrix = m.instanceMatrix; } else wc = new THREE.Mesh(m.geometry, Array.isArray(m.material) ? wireMat : wireMat);
  wc.visible = false; wc.userData.noPick = true; wc.userData.noPart = true; wc.userData.noShadow = true; wc.renderOrder = 2; m.add(wc); m.userData.wireClone = wc;
}
const wireMats = new Set(D.wires.map(w => w.material)); for (const m of wireMats) m.transparent = true;
function tintMat(m, orig) { const cacheKey = Array.isArray(orig) ? null : orig; if (cacheKey && m.userData.tintMat && m.userData.tintOf === orig) return m.userData.tintMat; if (Array.isArray(orig)) return null; const t = orig.clone(); m.userData.tintMat = t; m.userData.tintOf = orig; return t; }
// setTint: 部品に色をかぶせる (k=0 で解除)。プログラムを増やさず材質を遅延クローン
function setTint(part, color, k, opts) {
  for (const m of part.meshes) {
    const o = m.userData.origMat; if (Array.isArray(o) || !o.isMeshStandardMaterial) continue;
    if (k <= 0) { m.userData.tint = null; if (m.material === m.userData.tintMat) m.material = o; continue; }
    const t = tintMat(m, o); const lerpK = opts && opts.lerp != null ? opts.lerp : 0.65; t.color.copy(o.color).lerp(color, lerpK * k); t.emissive.copy(color); t.emissiveIntensity = opts && opts.emis != null ? opts.emis : (o.userData.flatTint ? 0.6 : 0.28) * k; if (o.map && !o.userData.flatTint && 'emissiveMap' in t) t.emissiveMap = o.map; /* 黒いテクスチャ(プロペラ)は模様を掛けると色が消えるので一様に光らせる。opts={lerp,emis} で塗り方を上書き */ m.userData.tint = t;
    if (m.material === o) m.material = t;
  }
}
const cut = { planeMotor: new THREE.Plane(), planeBat: new THREE.Plane(), far: new THREE.Plane(new THREE.Vector3(0, 1, 0), 1e3), list: [] };
{
  const mo = D.motors[0];
  for (const grp of [mo.bell, mo.mags]) grp.traverse(m => { if (m.isMesh && !m.userData.noPart) { const c = m.material.clone(); c.side = THREE.DoubleSide; c.clippingPlanes = [cut.far.clone()]; m.material = c; m.userData.origMat = c; cut.list.push({ mat: c, plane: cut.planeMotor }); } });
  D.batPart.obj.traverse(m => { if (m.isMesh && m.userData.fine === D.batPart) { const c = m.material.clone(); c.side = THREE.DoubleSide; c.clippingPlanes = [cut.far.clone()]; m.material = c; m.userData.origMat = c; cut.list.push({ mat: c, plane: cut.planeBat }); } });
}

// ---------- ユーティリティ ----------
const tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3(), tmpQ = new THREE.Quaternion();
function isAnc(a, b) { let o = b.parent; while (o) { if (o === a) return true; o = o.parent; } return false; }
function effVisible(o) { while (o) { if (o.visible === false) return false; o = o.parent; } return true; }
function partsOf(key) { return D.parts.filter(p => p.key === key); }
function partVisible(p) {
  if (p.hidden) return false;
  if (S.isolated) { const iso = partsOf(S.isolated); if (!iso.some(ip => ip === p || isAnc(ip.obj, p.obj) || isAnc(p.obj, ip.obj))) return false; }
  return true;
}
function applyVisibility() { for (const p of D.parts) p.obj.visible = partVisible(p); S.shadowDirty = S.csDirty = S.aoDirty = true; if (typeof onVisibilityChanged === 'function') onVisibilityChanged(); }
function keepReal(m) {
  const sel = S.selected; if (!sel) return false;
  const f = m.userData.fine, c = m.userData.coarse;
  if (S.selAll) { if (f.key === sel.key || (c && c.key === sel.key)) return true; return partsOf(sel.key).some(sp => isAnc(sp.obj, f.obj)); }
  return f === sel || c === sel || isAnc(sel.obj, f.obj);
}
// 設計図モード(パッケージ⑦): 線画の色と背景だけを差し替える
const isWireMode = () => S.mode === 'wire' || S.mode === 'blueprint';
const BLUEPRINT = { paper: '#1d3a6e', wire: '#dfe9ff', bg: ['#20416f', '#1b365e', '#12284a', '#0c1c36'], grid: 0xdfe9ff };
function applyBlueprint() {
  const on = S.mode === 'blueprint', T = THEME[themeDark ? 'dark' : 'light'];
  wireMat.color.set(on ? BLUEPRINT.wire : T.wire); paperMat.color.set(on ? BLUEPRINT.paper : T.paper);
  gridU.uLine.value.set(on ? BLUEPRINT.grid : T.grid);
  const bg = on ? BLUEPRINT.bg : T.bg;
  backdropMat.uniforms.top.value.set(bg[0]); backdropMat.uniforms.mid.value.set(bg[1]); backdropMat.uniforms.edge.value.set(bg[2]); backdropMat.uniforms.bottom.value.set(bg[3]);
  groundMat.color.set(on ? 0x16305c : T.ground);
}
function applyMode() {
  for (const p of D.parts) for (const m of p.meshes) {
    const real = S.mode === 'normal' || S.mode === 'cut' || keepReal(m);
    if (!real && S.mode === 'xray') { m.material = xrayMat; m.castShadow = false; }
    else if (!real && isWireMode()) { m.material = paperMat; m.castShadow = false; }
    else { m.material = m.userData.tint || (m.userData.papered ? wearPaper : m.userData.origMat); m.castShadow = m.userData.castShadow && S.shadows; }
    if (m.userData.wireClone) m.userData.wireClone.visible = !real && isWireMode();
  }
  const cutOn = S.mode === 'cut';
  for (const c of cut.list) { if (!cutOn) c.mat.clippingPlanes[0].copy(cut.far); }
  { const on = !isWireMode(); for (const p of D.parts) if (p.key === 'led') { const u = p.obj.userData; if (u.core) u.core.visible = on; if (u.halo) u.halo.visible = on; } }   // 線画/設計図ではLEDの光を消す
  renderer.shadowMap.enabled = key.castShadow = S.shadows && S.qLevel >= 1 && S.mode !== 'xray' && !isWireMode();
  gridU.uGrid.value = (S.mode === 'xray' || isWireMode()) ? 1 : 0;
  S.shadowDirty = S.csDirty = S.aoDirty = true;
}
function updateCutPlanes() {
  const mo = D.motors[0];
  const u = tmpV.set(1, 0, 0).applyQuaternion(mo.arm.getWorldQuaternion(tmpQ)).normalize();
  const c = mo.group.getWorldPosition(tmpV2);
  cut.planeMotor.setFromNormalAndCoplanarPoint(u.multiplyScalar(-1), c);
  const bx = tmpV.set(-1, 0, 0).applyQuaternion(D.root.getWorldQuaternion(tmpQ)).normalize();
  const bc = D.batPart.obj.getWorldPosition(tmpV2).add(tmpV.clone().multiplyScalar(-0.004));
  cut.planeBat.setFromNormalAndCoplanarPoint(bx, bc);
  for (const c of cut.list) c.mat.clippingPlanes[0].copy(c.plane);
}
// ---------- 分解 (+ アニメ合成) ----------
function applyExplode() {
  const t = S.explodeT;
  for (const p of D.parts) {
    p.obj.position.copy(p.home).addScaledVector(p.explode, t);
    if (p.anim) { p.obj.position.add(p.anim.pos); p.obj.quaternion.copy(p.homeQuat).multiply(p.anim.quat); } else if (p.animReset) { p.obj.quaternion.copy(p.homeQuat); p.animReset = false; }
  }
  const wo = 1 - smoothstep(0.03, 0.3, t);
  for (const m of wireMats) m.opacity = wo;
  for (const w of D.wires) w.visible = wo > 0.02;
}

// ---------- 時間伸縮 ----------
function setTimeScale(ts, tauIn) { S.tsTarget = ts; S.slow = ts < 0.99; S.tsTauIn = tauIn != null ? tauIn : 0.40;
  for (const x of $$('.tgl[data-t=slow]')) { x.classList.toggle('on', S.slow); x.setAttribute('aria-pressed', String(S.slow)); } }   // ボタンの見た目を1か所で合わせる
function stepTimeScale(dt) {
  const target = Math.log(S.tsTarget), tau = S.tsTarget < S.ts ? (S.tsTauIn || 0.40) : 0.40;
  S.logTs += (target - S.logTs) * (1 - Math.exp(-dt / tau)); if (Math.abs(target - S.logTs) < 0.002) S.logTs = target; S.ts = Math.exp(S.logTs);
}

// ---------- カメラ (臨界減衰ばね + 引き + 慣性引き継ぎ) ----------
const cam = { v: new THREE.Vector3(), tv: new THREE.Vector3(), last: new THREE.Vector3(), vel: new THREE.Vector3() };
function flyTo(pos, target, dur = 900, pull = true) {
  controls.autoRotate = false;
  controls.maxDistance = Math.max(camMax(), pos.distanceTo(target) * 1.02);   // 台本が指定した引きは OrbitControls の上限に切られないようにする
  if (reduceMotion) { camera.position.copy(pos); controls.target.copy(target); controls.update(); return; }
  const d0 = camera.position.distanceTo(controls.target), d1 = pos.distanceTo(target), dq = controls.target.distanceTo(target);
  const doPull = pull && (d0 / d1 < 0.7 || d0 / d1 > 1.6 || dq > 0.10);
  S.camSpring = { p1: pos.clone(), q1: target.clone(), t: 0, dur: dur / 1000, pull: doPull ? 0.25 * Math.max(d0, d1) : 0, omega: 6, omegaQ: 7.5 };
  S.camInertia = null;
}
function stepCamera(dt) {
  const sp = S.camSpring;
  if (sp) {
    sp.t += dt; const e = clamp(sp.t / sp.dur, 0, 1);
    // 注視点が80ms先行して動く
    const tq = sp.q1; const dq = tmpV.copy(tq).sub(controls.target);
    const wq = sp.omegaQ; cam.tv.addScaledVector(dq, wq * wq * dt).addScaledVector(cam.tv, -2 * wq * dt); controls.target.addScaledVector(cam.tv, dt);
    if (sp.t > 0.08) { const target = tmpV2.copy(sp.p1); if (sp.pull) { const dir = tmpV.copy(sp.p1).sub(sp.q1).normalize(); target.addScaledVector(dir, sp.pull * Math.sin(Math.PI * easeInOut(e))); }
      const dp = tmpV.copy(target).sub(camera.position); const w = sp.omega; cam.v.addScaledVector(dp, w * w * dt).addScaledVector(cam.v, -2 * w * dt); camera.position.addScaledVector(cam.v, dt); }
    cam.v.clampLength(0, 8); cam.tv.clampLength(0, 8);
    if (sp.t > sp.dur + 0.6 && cam.v.length() < 0.002 && cam.tv.length() < 0.002) { S.camSpring = null; cam.v.set(0, 0, 0); cam.tv.set(0, 0, 0); }
  } else if (S.camInertia) { const ci = S.camInertia; ci.t -= dt; if (ci.t <= 0) S.camInertia = null; else camera.position.addScaledVector(ci.v, dt * Math.exp(-(0.3 - ci.t) / 0.1)); }
  cam.vel.copy(camera.position).sub(cam.last).divideScalar(Math.max(dt, 1e-3)); cam.last.copy(camera.position);
  // 防護: 非有限値や暴走の復帰
  const p = camera.position, t = controls.target;
  if (!Number.isFinite(p.x + p.y + p.z + t.x + t.y + t.z)) { S.camSpring = null; S.camInertia = null; cam.v.set(0, 0, 0); cam.tv.set(0, 0, 0); t.set(0, 0, 0); p.set(0.78, 0.50, -0.82); }
  const inScene2 = (typeof whatif === 'object' && whatif.active) || (typeof theater === 'object' && theater.active) || (typeof descent === 'object' && descent.active);
  if (!S.camSpring && !S.camInertia && !inScene2 && controls.maxDistance > camMax()) controls.maxDistance = Math.max(camMax(), controls.maxDistance - (controls.maxDistance - camMax()) * (1 - Math.exp(-dt / 0.5)));   // 場面を抜けたら上限をゆっくり戻す(場面の最中に戻すと、引きが切られて画がじりじり寄る)
  { const inScene = (typeof whatif === 'object' && whatif.active) || (typeof theater === 'object' && theater.active) || (typeof descent === 'object' && descent.active); const tmax = inScene ? 14 : 3; if (t.length() > tmax) t.clampLength(0, tmax); }   /* 場面では機体が原点から離れる(目視外は9m先)。固定3mだと注視点が引き戻されて画が壊れる */
  const lim = Math.max(4, controls.maxDistance); const off = tmpV.copy(p).sub(t); if (off.length() > lim) p.copy(t).addScaledVector(off.normalize(), lim);   // 上限は画面の縦横比と台本の引きに合わせる(固定4mだと縦画面で場面が枠に入らない)
}
function onCamInterrupt() { if (S.camSpring) { S.camSpring = null; S.camInertia = { v: cam.v.clone().clampLength(0, 2), t: 0.3 }; cam.v.set(0, 0, 0); cam.tv.set(0, 0, 0); } }
// 画面下でシートやドックが覆っている高さ(CSSピクセル)
function bottomCover() {
  const H2 = window.innerHeight; let cov = 0;
  for (const sel of ['#dock', '#inspector.open', '#lesson.open', '#expert.open', '#noteCard', '#massBar', '#bigBand']) {
    if (sel === '#bigBand' && H2 <= 520) continue;   /* 横向きは高さが足りない。名前の帯は3Dに重ねて浮かせ、機体は小さくしない */
    const el = document.querySelector(sel); if (!el || el.hidden) continue;
    const r = el.getBoundingClientRect(); if (r.height < 4 || r.top > H2 - 8 || r.bottom < H2 * 0.6) continue;
    cov = Math.max(cov, H2 - r.top);
  }
  return Math.min(cov, H2 * 0.62);
}
// 画面上でタイトルバーや視点バーが覆っている高さ(CSSピクセル)。畳まれている(visibility hidden)ものは数えない
function topCover() {
  const H2 = window.innerHeight, bc = document.body.classList; let cov = 0;
  if (bc.contains('theater')) return 0;   /* 場面の再生中は上のバーを薄く畳んでいる。覆いとして数えると画が下がって機体が字幕の裏に入る */
  for (const sel of ['#topbar', '#viewCol']) {
    if (sel === '#viewCol' && bc.contains('sheet-open')) continue; if (sel === '#topbar' && bc.contains('sheet-tall')) continue;   /* 畳まれている途中でも畳んだ後の形で測る(transition 待ちにしない) */
    const el = document.querySelector(sel); if (!el || el.hidden) continue;
    const r = el.getBoundingClientRect(); if (r.height < 4 || r.top > H2 * 0.4) continue;
    cov = Math.max(cov, r.bottom);
  }
  return Math.min(cov, H2 * 0.3);
}
// 「帯が画面」の約束: シートやバーで機体の帯が狭まったぶんカメラを引き、帯の中に同じ画を同じ割合で収める(帯が広がれば寄る)
const bandK = () => narrow() ? 1 / (S.bandFrac || 1) : 1;
function applyBand(bf) {
  const old = S.bandFrac; S.bandFrac = bf; if (old == null || Math.abs(bf - old) < 0.02) return;
  if ((typeof theater !== 'undefined' && theater.active) || (typeof whatif !== 'undefined' && whatif.active) || (typeof descent !== 'undefined' && descent.active)) return;   /* 台本が組んだ画には触らない */
  const k = old / bf;
  if (S.camSpring) { const sp = S.camSpring; sp.p1.sub(sp.q1).multiplyScalar(k).add(sp.q1); controls.maxDistance = Math.max(controls.maxDistance, sp.p1.distanceTo(sp.q1) * 1.02); return; }
  const t = controls.target.clone(), p = camera.position.clone().sub(t).multiplyScalar(k).add(t);
  flyTo(p, t, 380, false);
}
function viewScale() { const a = W / H; return a < 1 ? Math.min(2.0, Math.pow(1 / a, 0.9)) : 1; }
function camMax() { return 3.2 * viewScale() * bandK(); }   // 縦長の画面ほど引かないと同じ画が入らない
function camHome() { if (camera.position.distanceTo(controls.target) > camMax() * 0.75) focusOn([D.root], { pull: true }); }   // 上限は stepCamera がゆっくり戻す(即座に下げると引きから瞬間移動する)   // 広い場面(人が近づく等)から戻ったら機体の枠に戻す
function focusOn(objs, opts = {}) {
  const box = new THREE.Box3(), tb = new THREE.Box3(), pts = [];   // 本体メッシュだけで枠を決める(気流・ゴースト・スプライトは除外)。各メッシュの8隅を集めて実投影で距離を決める
  for (const o of objs) { o.updateWorldMatrix(true, true); o.traverseVisible(c => { if (!c.isMesh || c.userData.noPart || !c.geometry) return; if (!c.geometry.boundingBox) c.geometry.computeBoundingBox(); const b = c.geometry.boundingBox; if (c.isInstancedMesh) { if (!c.boundingBox) c.computeBoundingBox(); tb.copy(c.boundingBox).applyMatrix4(c.matrixWorld); } else tb.copy(b).applyMatrix4(c.matrixWorld); box.union(tb); for (let i = 0; i < 8; i++) pts.push(new THREE.Vector3(i & 1 ? tb.max.x : tb.min.x, i & 2 ? tb.max.y : tb.min.y, i & 4 ? tb.max.z : tb.min.z)); }); } if (box.isEmpty()) return;
  const sph = box.getBoundingSphere(new THREE.Sphere());
  const dir = opts.dir ? opts.dir.clone() : camera.position.clone().sub(controls.target); if (dir.lengthSq() < 1e-6) dir.set(0.6, 0.4, -0.6); dir.normalize();
  // 箱の8隅を視野に収める距離(球ではなく実際の投影で決める)
  const fwd = dir.clone().negate(), right = new THREE.Vector3().crossVectors(fwd, camera.up).normalize(), up = new THREE.Vector3().crossVectors(right, fwd).normalize();
  const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / bandK(), tanH = tanV * bandK() * Math.max(0.6, camera.aspect); let need = 0.05; const rel = new THREE.Vector3();   /* 縦はシートに隠れない帯の高さで見る */
  for (const q of pts) { rel.copy(q).sub(sph.center); const t = rel.dot(dir); need = Math.max(need, Math.abs(rel.dot(right)) / tanH + t, Math.abs(rel.dot(up)) / tanV + t); }
  const dist = clamp((need * (opts.margin || 1.18) + 0.02) * viewScale(), 0.12, (opts.max || 3.2) * viewScale() * bandK());
  const dur = 600 + 500 * clamp((camera.position.distanceTo(sph.center.clone().addScaledVector(dir, dist)) + controls.target.distanceTo(sph.center)) / 0.6, 0, 1);
  flyTo(sph.center.clone().addScaledVector(dir, dist), sph.center, dur, opts.pull !== false);
}
const VIEWS = { iso: [[0.78, 0.50, -0.82], [0, 0, 0]], front: [[0, 0.18, -1.2], [0, 0, 0]], top: [[0.0, 1.3, -0.03], [0, 0, 0]], side: [[1.2, 0.14, 0.0], [0, 0, 0]] };
function setView(v) {
  if (v === 'inside') {
    const mo = D.motors[0]; const c = mo.group.localToWorld(new THREE.Vector3(0, 0.02, 0));
    const u = new THREE.Vector3(1, 0, 0).applyQuaternion(mo.arm.getWorldQuaternion(new THREE.Quaternion())); const tan = new THREE.Vector3(u.z, 0, -u.x); const vs = viewScale();
    flyTo(c.clone().addScaledVector(u, 0.19 * vs).addScaledVector(tan, 0.12 * vs).add(new THREE.Vector3(0, 0.015 * vs, 0)), c, 1100);
  } else { const [p, t] = VIEWS[v]; const tv = new THREE.Vector3(...t); const pv = new THREE.Vector3(...p).sub(tv).multiplyScalar(viewScale()).add(tv); flyTo(pv, tv, 800); }
}

// ---------- テーマ ----------
const THEME = {
  light: { exposure: 1.0, key: [0xfff6ea, 3.2], rim: [0xe4ecff, 1.2], kick: [0xdde8ff, 0.5], env: 1.0, ground: 0xe4e6ea, gcc: 0.25, halo: 0.05, bg: ['#f7f8fa', '#eef0f3', '#d9dde3', '#cfd4db'], vig: 0.20, cs: 0.40, xray: '#182238', wire: '#2b3442', paper: '#f3f4f7', grid: 0x30343c, hoverTint: 0x1b1f27 },
  dark: { exposure: 1.15, key: [0xfff8f2, 2.8], rim: [0xd6e4ff, 2.2], kick: [0xdde8ff, 0.9], env: 0.8, ground: 0x171a1f, gcc: 0.45, halo: 0.12, bg: ['#1c2129', '#262c36', '#0f1216', '#07080b'], vig: 0.28, cs: 0.70, xray: '#8fc9ff', wire: '#aab7cc', paper: '#1c2027', grid: 0xaab4c4, hoverTint: 0xffffff },
};
let themeDark = false, arrowNeutral = 0x30343c;
function isDark() { const cs = getComputedStyle(document.documentElement).colorScheme || ''; if (cs.includes('dark')) return true; if (cs.includes('light')) return false; return matchMedia('(prefers-color-scheme: dark)').matches; }
function applyTheme() {
  themeDark = isDark(); const T = THEME[themeDark ? 'dark' : 'light'];
  renderer.toneMappingExposure = T.exposure * S.exposureMul;
  key.color.set(T.key[0]); key.intensity = T.key[1]; rim.color.set(T.rim[0]); rim.intensity = T.rim[1]; kick.color.set(T.kick[0]); kick.intensity = T.kick[1];
  scene.environmentIntensity = T.env * S.envMul;
  groundMat.color.set(T.ground); groundMat.clearcoat = T.gcc; gridU.uLine.value.set(T.grid);
  backdropMat.uniforms.top.value.set(T.bg[0]); backdropMat.uniforms.mid.value.set(T.bg[1]); backdropMat.uniforms.edge.value.set(T.bg[2]); backdropMat.uniforms.bottom.value.set(T.bg[3]);
  finishPass.uniforms.vig.value = T.vig; csPlane.material.opacity = T.cs;
  xrayMat.uniforms.color.value.set(T.xray); xrayMat.uniforms.opacity.value = themeDark ? 0.75 : 0.72; xrayMat.uniforms.base.value = themeDark ? 0.02 : 0.025; xrayMat.uniforms.power.value = themeDark ? 2.2 : 2.0;   // 明るいテーマは重ねたときに中心が黒く潰れないよう薄く xrayMat.blending = themeDark ? THREE.AdditiveBlending : THREE.NormalBlending; xrayMat.needsUpdate = true;
  wireMat.color.set(T.wire); paperMat.color.set(T.paper);
  if (D.cgMarker) { const dark = themeDark; D.cgMarker.traverse(o => { if (!o.isMesh) return; const c = o.material.color.getHex(); if (c === 0x1b1f27 || c === 0x9aa3b0) o.material.color.set(dark ? 0x9aa3b0 : 0x1b1f27); }); }   // 重心の黒がダークの床に沈まないように
  arrowNeutral = themeDark ? 0xf2f4f8 : 0x30343c;
  D.parts.filter(p => p.key === 'led').forEach(p => { if (p.obj.userData.halo) p.obj.userData.halo.material.opacity = T.halo; });
  applyBlueprint();
  if (typeof onThemeChanged === 'function') onThemeChanged(themeDark);
  S.shadowDirty = S.csDirty = S.aoDirty = true;
}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

// ---------- 品質段階 / DPR ----------
const BUDGET = [1.1e6, 1.6e6, 2.5e6, 3.7e6];
function dprFor(level) { const raw = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(BUDGET[level] / Math.max(1, W * H))); return Math.max(1, Math.round(raw * 4) / 4); }
const Q = { msaa: true, direct: false, particles: 3000, ghosts: true };
function applyQuality(level) {
  S.qLevel = level; S.lastQChange = performance.now();
  const dpr = dprFor(level); if (dpr !== DPR) { DPR = dpr; renderer.setPixelRatio(DPR); composer.setPixelRatio(DPR); }
  const msaa = level >= 2 && DPR < 1.75 && !isMobile; if (msaa !== Q.msaa) { Q.msaa = msaa; makeSceneRT(msaa ? 4 : 0); }
  Q.direct = level === 0;
  gtao.enabled = level >= 2; gtao.every = level >= 3 ? 1 : 2;
  const sm = level >= 3 ? 2048 : 1024; if (key.shadow.mapSize.x !== sm) { key.shadow.mapSize.set(sm, sm); key.shadow.normalBias = sm >= 2048 ? 0.0006 : 0.0012; if (key.shadow.map) { key.shadow.map.dispose(); key.shadow.map = null; } }
  key.castShadow = S.shadows && level >= 1;
  outlineSel.enabled = level >= 2;
  Q.particles = [150, 300, 450, 600][level]; Q.ghosts = level >= 2;
  S.shadowDirty = S.csDirty = S.aoDirty = true;
  resize();
  if (typeof aliveQuality === 'function' && typeof alive === 'object') aliveQuality(level);
  if (typeof onQualityChanged === 'function') onQualityChanged(level);
}
function resize() {
  W = canvas.clientWidth || 1; H = canvas.clientHeight || 1;
  const dpr = dprFor(S.qLevel); if (dpr !== DPR) { DPR = dpr; renderer.setPixelRatio(DPR); composer.setPixelRatio(DPR); }
  renderer.setSize(W, H, false); composer.setSize(W, H);
  if (typeof fpv === 'object' && fpv.on) { camera.aspect = W / H; camera.clearViewOffset(); camera.updateProjectionMatrix(); S.bandFrac = 1; onResizedFpv(); if (typeof onResized === 'function') onResized(); S.aoDirty = true; return; }   /* カメラの映像は画面いっぱい。帯のずらしはしない */
  camera.aspect = narrow() ? W / H : (W - 384) / H;
  if (!narrow()) camera.setViewOffset(W - 384, H, 0, 0, W, H);   /* 右パネルの分だけ左に寄せる */
  else { const bc = bottomCover(), tc = topCover(), sh = (bc - tc) * 0.5; if (Math.abs(sh) > 12) camera.setViewOffset(W, H, 0, sh, W, H); else camera.clearViewOffset(); applyBand(clamp((H - bc - tc) / H, 0.3, 1)); }   /* 上のバーと下のシートの間の帯に機体が来るようずらし、帯の狭さぶん引く */
  if (!narrow()) S.bandFrac = 1;
  camera.updateProjectionMatrix();
  controls.maxDistance = Math.max(camMax(), camera.position.distanceTo(controls.target), S.camSpring ? S.camSpring.p1.distanceTo(S.camSpring.q1) * 1.02 : 0);   // 飛行中の目標も含める
  if (typeof onResized === 'function') onResized();
  S.aoDirty = true;
}
window.addEventListener('resize', resize);

// ---------- 計測 (p90) ----------
const perf = { ring: new Float32Array(120), i: 0, n: 0, cpu: 0, programs: 0, fps: 0 };
function perfPush(ms) { perf.ring[perf.i] = ms; perf.i = (perf.i + 1) % 120; perf.n = Math.min(120, perf.n + 1); }
function perfP90() { if (perf.n < 30) return 0; const a = Array.from(perf.ring.subarray(0, perf.n)).sort((x, y) => x - y); return a[Math.floor(a.length * 0.9)]; }

// ---------- 起動時ウォームアップ (RTを合わせて非同期コンパイル) ----------
async function warmCompile() {
  const warm = new THREE.Group(); warm.scale.setScalar(1e-4); warm.position.set(0, -50, 0); const q = new THREE.PlaneGeometry(0.01, 0.01);   // visible=false だと compileAsync が飛ばすので、極小にして遠くへ置く
  const depthOf = (o) => Object.assign(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }), o);
  warm.add(new THREE.Mesh(q, xrayMat), new THREE.Mesh(q, paperMat), new THREE.Mesh(q, wireMat), new THREE.Mesh(q, depthOf({ side: THREE.BackSide })), new THREE.Mesh(q, depthOf({ side: THREE.DoubleSide })), new THREE.InstancedMesh(q, depthOf({ side: THREE.BackSide }), 1));
  scene.add(warm);
  try { renderer.setRenderTarget(sceneRT); await renderer.compileAsync(scene, camera); } catch (e) { console.warn('compileAsync', e); }
  renderer.setRenderTarget(null); scene.remove(warm);
}
