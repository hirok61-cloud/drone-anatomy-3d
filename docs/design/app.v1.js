// ===== アプリ本体: 描画・操作・UI =====
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const easeInOut = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const narrow = () => matchMedia('(max-width: 1100px)').matches;
const svgNS = 'http://www.w3.org/2000/svg';
const ICON = {
  eye: '<svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 10s3-5.5 8-5.5 8 5.5 8 5.5-3 5.5-8 5.5S2 10 2 10z"/><circle cx="10" cy="10" r="2.4"/></svg>',
  eyeOff: '<svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l14 14M8.6 8.7A2.4 2.4 0 0 0 11.3 11.4M6.2 6.3C3.6 7.9 2 10 2 10s3 5.5 8 5.5c1.5 0 2.8-.5 3.9-1.1M9 4.6C9.3 4.5 9.7 4.5 10 4.5c5 0 8 5.5 8 5.5s-.7 1.3-2 2.6"/></svg>',
};
const LIST_ORDER = ['frameTop', 'frameBottom', 'arm', 'armClamp', 'motorMount', 'standoff', 'screws', 'motor', 'bell', 'stator', 'winding', 'magnet', 'shaft', 'motorBase', 'prop', 'propNut', 'esc', 'fc', 'pdb', 'capacitor', 'buzzer', 'battery', 'cells', 'xt60', 'balance', 'strap', 'wiring', 'gps', 'rx', 'vtx', 'led', 'gimbal', 'camera', 'damper', 'landingGear'];
const SUB = { bell: 'motor', stator: 'motor', winding: 'motor', magnet: 'motor', shaft: 'motor', motorBase: 'motor', cells: 'battery', propNut: 'prop' };
const PER_MOTOR = new Set(['motor', 'prop', 'esc', 'arm', 'bell', 'stator', 'winding', 'magnet', 'shaft', 'motorBase', 'propNut', 'led', 'armClamp', 'motorMount']);

const S = { mode: 'normal', explode: 0, explodeT: 0, power: 0, flight: null, flightT: 0, labels: true, arrows: false, autoRotate: !reduceMotion, shadows: true,
  selected: null, selAll: false, hovered: null, isolated: null, quality: 'auto', qLevel: 2, lastInteract: performance.now(), tween: null, lastQChange: 0 };

const T0 = performance.now(); const TL = {}; const mark = k => { TL[k] = Math.round(performance.now() - T0); };
// ---------- レンダラー・シーン ----------
const canvas = $('#gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
let W = 1, H = 1, DPR = Math.min(window.devicePixelRatio || 1, 2);
renderer.setPixelRatio(DPR);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.localClippingEnabled = true; renderer.info.autoReset = false;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 40);
camera.position.set(0.78, 0.50, -0.82);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = 0.08; controls.minDistance = 0.10; controls.maxDistance = 3.2;
controls.maxPolarAngle = Math.PI * 0.68; controls.autoRotateSpeed = 0.45; controls.target.set(0, 0.0, 0);
controls.addEventListener('start', () => { S.lastInteract = performance.now(); S.tween = null; controls.autoRotate = false; });

mark('gl'); const M = makeMaterials(renderer.capabilities.getMaxAnisotropy()); mark('mat');
const D = buildDrone(M); mark('geo');
scene.add(D.root);
$('#loadMsg').textContent = '照明と材質を準備しています…';

// 環境光(スタジオ)
function makeStudioEnv() {
  const env = new THREE.Scene();
  const emit = (i, c = 0xffffff) => { const m = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }); m.color.set(c).multiplyScalar(i); return m; };
  const dome = new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16), new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true }));
  { const g = dome.geometry, pos = g.attributes.position, col = []; for (let i = 0; i < pos.count; i++) { const t = clamp(pos.getY(i) / 20 * 0.5 + 0.5, 0, 1); const v = 0.10 + 0.32 * t * t; col.push(v, v * 1.02, v * 1.06); } g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); }
  env.add(dome);
  const panel = (w, h, i, c, pos, look) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), emit(i, c)); p.position.copy(pos); p.lookAt(look || new THREE.Vector3()); env.add(p); };
  panel(9, 9, 2.6, 0xffffff, new THREE.Vector3(0, 9, 0));                  // 天井ソフトボックス
  panel(6, 3, 2.2, 0xfff1e0, new THREE.Vector3(7, 4, -6));                  // キー側(暖)
  panel(5, 2.5, 1.5, 0xdde8ff, new THREE.Vector3(-8, 3, 7));                // リム側(寒)
  panel(3, 6, 1.2, 0xffffff, new THREE.Vector3(-9, 1, -5));                 // 左の縦ストリップ
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), emit(0.12)); floor.rotation.x = -Math.PI / 2; floor.position.y = -1; env.add(floor);
  return env;
}
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(makeStudioEnv(), 0.04).texture; pmrem.dispose();
scene.environmentIntensity = 1.0;
const key = new THREE.DirectionalLight(0xfff3e4, 2.4); key.position.set(0.9, 1.5, -0.7); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048); { const c = key.shadow.camera; c.left = c.bottom = -0.75; c.right = c.top = 0.75; c.near = 0.2; c.far = 5; }
key.shadow.bias = -0.00012; key.shadow.normalBias = 0.0012; key.shadow.radius = 3;
scene.add(key, key.target);
const rim = new THREE.DirectionalLight(0xdbe6ff, 1.0); rim.position.set(-1.1, 0.7, 1.3); scene.add(rim);
const hemi = new THREE.HemisphereLight(0xffffff, 0x8f96a3, 0.3); scene.add(hemi);

const studio = new THREE.Group(); scene.add(studio);
let ground = null, backdrop = null;
function buildStudio(dark) {
  for (const o of [ground, backdrop]) if (o) { studio.remove(o); o.material.map.dispose(); o.material.dispose(); o.geometry.dispose(); }
  ground = new THREE.Mesh(new THREE.CircleGeometry(3.2, 96), M.ground(dark)); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.158; ground.receiveShadow = true; studio.add(ground);
  backdrop = new THREE.Mesh(new THREE.SphereGeometry(16, 48, 24), M.backdrop(dark)); studio.add(backdrop);
  scene.fog = new THREE.Fog(dark ? 0x13161b : 0xe3e6eb, 2.0, 7.5);
}

// ---------- ポストプロセス ----------
const rt = new THREE.WebGLRenderTarget(1, 1, { samples: 4, type: THREE.HalfFloatType });
const composer = new EffectComposer(renderer, rt);
const renderPass = new RenderPass(scene, camera);
const gtao = new GTAOPass(scene, camera, 1, 1);
gtao.output = GTAOPass.OUTPUT.Default;
gtao.updateGtaoMaterial({ radius: 0.022, distanceExponent: 1, thickness: 0.008, scale: 1.0, samples: 12, distanceFallOff: 1, screenSpaceRadius: false });
gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 4, radiusExponent: 1, rings: 2, samples: 12 });
gtao.blendIntensity = 0.85;
const outlineHov = new OutlinePass(new THREE.Vector2(1, 1), scene, camera);
outlineHov.edgeStrength = 2.5; outlineHov.edgeGlow = 0; outlineHov.edgeThickness = 1; outlineHov.pulsePeriod = 0;
const outlineSel = new OutlinePass(new THREE.Vector2(1, 1), scene, camera);
outlineSel.edgeStrength = 5; outlineSel.edgeGlow = 0.45; outlineSel.edgeThickness = 1.6; outlineSel.pulsePeriod = 0;
outlineSel.visibleEdgeColor.set('#ff7a3d'); outlineSel.hiddenEdgeColor.set('#7a3a1c');
const outputPass = new OutputPass();
for (const p of [renderPass, gtao, outlineHov, outlineSel, outputPass]) composer.addPass(p);

// ---------- 表示モード用の材質 ----------
const xrayMat = new THREE.ShaderMaterial({
  uniforms: { color: { value: new THREE.Color('#20304a') }, opacity: { value: 0.85 }, power: { value: 2.2 }, base: { value: 0.05 } },
  vertexShader: `#include <common>
    varying vec3 vN; varying vec3 vV;
    void main() {
      #include <beginnormal_vertex>
      #include <defaultnormal_vertex>
      #include <begin_vertex>
      #include <project_vertex>
      vN = normalize(transformedNormal); vV = normalize(-mvPosition.xyz);
    }`,
  fragmentShader: `uniform vec3 color; uniform float opacity; uniform float power; uniform float base;
    varying vec3 vN; varying vec3 vV;
    void main() { float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), power); gl_FragColor = vec4(color, clamp(base + f * opacity, 0.0, 1.0)); }`,
  transparent: true, depthWrite: false, side: THREE.DoubleSide,
});
const wireMat = new THREE.MeshBasicMaterial({ color: 0x2b3442, wireframe: true, transparent: true, opacity: 0.75, depthWrite: false });
const paperMat = new THREE.MeshBasicMaterial({ color: 0xf3f4f7, polygonOffset: true, polygonOffsetFactor: 1.5, polygonOffsetUnits: 2 });

for (const p of D.parts) for (const m of p.meshes) { m.userData.origMat = m.material; m.userData.castShadow = m.castShadow; }
const wireMats = new Set(D.wires.map(w => w.material));
for (const m of wireMats) m.transparent = true;
for (const pm of [M.propCCW, M.propCW, M.propHub]) pm.transparent = true;

// 断面用: M1モーターのベル/磁石とバッテリー外装だけ材質を複製してクリップ
const cut = { planeMotor: new THREE.Plane(), planeBat: new THREE.Plane(), list: [] };
{
  const mo = D.motors[0];
  for (const grp of [mo.bell, mo.mags]) grp.traverse(m => { if (m.isMesh) { const c = m.material.clone(); c.side = THREE.DoubleSide; m.material = c; m.userData.origMat = c; cut.list.push({ mat: c, plane: cut.planeMotor }); } });
  D.batPart.obj.traverse(m => { if (m.isMesh && m.userData.fine === D.batPart) { const c = m.material.clone(); c.side = THREE.DoubleSide; m.material = c; m.userData.origMat = c; cut.list.push({ mat: c, plane: cut.planeBat }); } });
}

// 線画用の重ねメッシュ(元メッシュの子として同じジオメトリを描く)
for (const p of D.parts) for (const m of p.meshes) {
  let wc;
  if (m.isInstancedMesh) { wc = new THREE.InstancedMesh(m.geometry, wireMat, m.count); wc.instanceMatrix = m.instanceMatrix; }
  else wc = new THREE.Mesh(m.geometry, wireMat);
  wc.visible = false; wc.userData.noPick = true; wc.renderOrder = 2; m.add(wc); m.userData.wireClone = wc;
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
function applyVisibility() {
  for (const p of D.parts) p.obj.visible = partVisible(p);
  const hiddenKeys = [...new Set(D.parts.filter(p => p.hidden).map(p => p.key))];
  const bar = $('#hiddenBar');
  if (hiddenKeys.length || S.isolated) {
    bar.hidden = false;
    $('#hiddenMsg').textContent = S.isolated ? `${PARTS[S.isolated].name} を単独表示中` : `非表示: ${hiddenKeys.map(k => PARTS[k].name).join('・')}`;
  } else bar.hidden = true;
  for (const row of $$('#partList .row')) row.classList.toggle('off', partsOf(row.dataset.key).some(p => p.hidden));
}
function keepReal(m) {
  const sel = S.selected; if (!sel) return false;
  const f = m.userData.fine, c = m.userData.coarse;
  if (S.selAll) { if (f.key === sel.key || (c && c.key === sel.key)) return true; return partsOf(sel.key).some(sp => isAnc(sp.obj, f.obj)); }
  return f === sel || c === sel || isAnc(sel.obj, f.obj);
}
function applyMode() {
  for (const p of D.parts) for (const m of p.meshes) {
    const real = S.mode === 'normal' || S.mode === 'cut' || keepReal(m);
    if (!real && S.mode === 'xray') { m.material = xrayMat; m.castShadow = false; }
    else if (!real && S.mode === 'wire') { m.material = paperMat; m.castShadow = false; }
    else { m.material = m.userData.origMat; m.castShadow = m.userData.castShadow && S.shadows; }
    if (m.userData.wireClone) m.userData.wireClone.visible = !real && S.mode === 'wire';
  }
  const cutOn = S.mode === 'cut';
  for (const c of cut.list) { c.mat.clippingPlanes = cutOn ? [c.plane] : null; c.mat.needsUpdate = true; }
  renderer.shadowMap.enabled = key.castShadow = S.shadows && S.mode !== 'xray' && S.mode !== 'wire';
}
function updateCutPlanes() {
  const mo = D.motors[0];
  const u = tmpV.set(1, 0, 0).applyQuaternion(mo.arm.getWorldQuaternion(tmpQ)).normalize();
  const c = mo.group.getWorldPosition(tmpV2);
  cut.planeMotor.setFromNormalAndCoplanarPoint(u.multiplyScalar(-1), c);
  const bx = tmpV.set(-1, 0, 0).applyQuaternion(D.root.getWorldQuaternion(tmpQ)).normalize();
  const bc = D.batPart.obj.getWorldPosition(tmpV2).add(tmpV.clone().multiplyScalar(-0.004));
  cut.planeBat.setFromNormalAndCoplanarPoint(bx, bc);
}

// ---------- 分解 ----------
function applyExplode() {
  const t = S.explodeT;
  for (const p of D.parts) p.obj.position.copy(p.home).addScaledVector(p.explode, t);
  const wo = 1 - smoothstep(0.03, 0.3, t);
  for (const m of wireMats) m.opacity = wo;
  for (const w of D.wires) w.visible = wo > 0.02;
}

// ---------- モーター・飛行デモ ----------
const RPM_MAX = 9000, HOVER_RPM = RPM_MAX * 0.5;
const body = { rx: 0, rz: 0, yaw: 0, px: 0, py: 0, pz: 0, v: new THREE.Vector3() };
const ARROW_NEUTRAL = { light: 0x30343c, dark: 0xf2f4f8 };
let arrowNeutral = ARROW_NEUTRAL.light;
function updateMotors(dt) {
  const f = S.flight ? FLIGHT[S.flight] : null;
  const k = (S.flight === 'pitch' || S.flight === 'roll') ? Math.cos(S.flightT) : 1;
  let sum = 0;
  D.motors.forEach((mo, i) => {
    const mult = f ? 1 + (f.mult[i] - 1) * k : 1;
    const target = RPM_MAX * S.power * mult;
    mo.rpm = (mo.rpm || 0) + (target - (mo.rpm || 0)) * (1 - Math.exp(-dt * 2.5));
    mo.angle = ((mo.angle || 0) + mo.dir * mo.rpm / 60 * Math.PI * 2 * dt) % (Math.PI * 2);
    mo.prop.rotation.y = mo.angle;
    mo.disc.material.opacity = smoothstep(900, 3200, mo.rpm) * 0.85;
    sum += mo.rpm;
    const th = D.arrows.thrust[i];
    th.visible = !!S.flight && partVisible(mo.part);
    if (th.visible) { th.userData.setLength(0.02 + 0.11 * mo.rpm / RPM_MAX); const rel = mo.rpm / Math.max(1, S.power * RPM_MAX); th.userData.mat.color.set(rel > 1.03 ? 0x22c55e : rel < 0.97 ? 0xf59e0b : arrowNeutral); }
    D.arrows.rot[i].visible = (S.arrows || S.flight === 'yaw') && partVisible(mo.part);
  });
  const po = 1 - smoothstep(1500, 3800, sum / 4) * 0.85;
  for (const pm of [M.propCCW, M.propCW, M.propHub]) pm.opacity = po;
}
function updateFlight(dt) {
  if (S.flight) S.flightT += dt;
  const t = S.flightT, A = THREE.MathUtils.degToRad(10);
  let rx = 0, rz = 0, px = 0, py = 0, pz = 0;
  switch (S.flight) {
    case 'hover': py = 0.003 * Math.sin(t * 1.4); break;
    case 'climb': py = 0.06 * (0.5 - 0.5 * Math.cos(t * 1.1)); break;
    case 'pitch': rx = -A * Math.cos(t); pz = -0.14 * (0.5 - 0.5 * Math.cos(t)); break;
    case 'roll': rz = -A * Math.cos(t); px = 0.14 * (0.5 - 0.5 * Math.cos(t)); break;
    case 'yaw': body.yaw -= THREE.MathUtils.degToRad(40) * dt; break;
  }
  if (S.flight !== 'yaw') { body.yaw = Math.atan2(Math.sin(body.yaw), Math.cos(body.yaw)); body.yaw += (0 - body.yaw) * (1 - Math.exp(-dt * 3)); }
  const k = 1 - Math.exp(-dt * 5);
  body.rx += (rx - body.rx) * k; body.rz += (rz - body.rz) * k;
  const ox = body.px, oy = body.py, oz = body.pz;
  body.px += (px - body.px) * k; body.py += (py - body.py) * k; body.pz += (pz - body.pz) * k;
  body.v.set(body.px - ox, body.py - oy, body.pz - oz).divideScalar(Math.max(dt, 1e-3));
  D.root.rotation.set(body.rx, body.yaw, body.rz, 'YXZ');
  D.root.position.set(body.px, body.py, body.pz);
  // 移動方向の矢印
  const mv = D.arrows.move, spd = body.v.length();
  if (S.flight && S.flight !== 'yaw' && S.flight !== 'hover' && spd > 0.004) {
    mv.visible = true;
    const dir = body.v.clone().normalize();
    const local = dir.clone().applyQuaternion(D.root.getWorldQuaternion(tmpQ).invert());
    mv.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), local);
    if (S.flight === 'climb') mv.position.set(0, 0.16, 0); else if (S.flight === 'pitch') mv.position.set(0, 0.05, -0.22 * Math.sign(-dir.z || 1)); else mv.position.set(0.22 * Math.sign(dir.x || 1), 0.05, 0);
    mv.userData.setLength(0.03 + 1.3 * spd);
  } else mv.visible = false;
  D.arrows.yaw.visible = S.flight === 'yaw';
}

// ---------- 選択・ピック ----------
const ray = new THREE.Raycaster(); const ptr = new THREE.Vector2();
function pickAt(x, y) {
  ptr.set((x / W) * 2 - 1, -(y / H) * 2 + 1); ray.setFromCamera(ptr, camera);
  const hits = ray.intersectObjects(D.pick, false);
  const detail = S.mode === 'cut' || S.explodeT > 0.25;
  for (const h of hits) {
    const m = h.object; if (!effVisible(m)) continue;
    if (m.userData.wire && S.explodeT > 0.25) continue;
    if (m.material === xrayMat && h.face && false) continue;
    const fine = m.userData.fine; if (!fine) continue;
    return detail ? fine : (m.userData.coarse || fine);
  }
  return null;
}
function select(p, all = false) {
  S.selected = p; S.selAll = !!(p && all);
  outlineSel.selectedObjects = p ? (all ? partsOf(p.key).map(x => x.obj) : [p.obj]) : [];
  if (S.hovered === p) { S.hovered = null; outlineHov.selectedObjects = []; }
  applyMode();
  for (const row of $$('#partList .row')) row.classList.toggle('on', !!p && row.dataset.key === p.key);
  renderDetail();
  if (p && narrow()) $('#inspector').classList.add('open');
}
function focusOn(objs) {
  const box = new THREE.Box3(); for (const o of objs) box.expandByObject(o, true);
  if (box.isEmpty()) return;
  const sph = box.getBoundingSphere(new THREE.Sphere());
  const dist = clamp((sph.radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) * 1.25 + 0.02) * viewScale(), 0.12, 3.2);
  const dir = camera.position.clone().sub(controls.target); if (dir.lengthSq() < 1e-6) dir.set(0.6, 0.4, -0.6); dir.normalize();
  flyTo(sph.center.clone().addScaledVector(dir, dist), sph.center);
}
function flyTo(pos, target, dur = 900) {
  controls.autoRotate = false;
  if (reduceMotion) { camera.position.copy(pos); controls.target.copy(target); controls.update(); return; }
  S.tween = { t0: performance.now(), dur, p0: camera.position.clone(), p1: pos.clone(), q0: controls.target.clone(), q1: target.clone() };
}
function viewScale() { const a = W / H; return a < 1 ? Math.min(2.0, Math.pow(1 / a, 0.9)) : 1; }
const VIEWS = { iso: [[0.78, 0.50, -0.82], [0, 0, 0]], front: [[0, 0.18, -1.2], [0, 0, 0]], top: [[0.0, 1.3, -0.03], [0, 0, 0]], side: [[1.2, 0.14, 0.0], [0, 0, 0]] };
function setView(v) {
  if (v === 'inside') {
    const mo = D.motors[0];
    const c = mo.group.localToWorld(new THREE.Vector3(0, 0.02, 0));
    const u = new THREE.Vector3(1, 0, 0).applyQuaternion(mo.arm.getWorldQuaternion(new THREE.Quaternion()));
    const tan = new THREE.Vector3(u.z, 0, -u.x);
    const vs = viewScale(); flyTo(c.clone().addScaledVector(u, 0.17 * vs).addScaledVector(tan, 0.11 * vs).add(new THREE.Vector3(0, 0.05 * vs, 0)), c);
  } else { const [p, t] = VIEWS[v]; const tv = new THREE.Vector3(...t); const pv = new THREE.Vector3(...p).sub(tv).multiplyScalar(viewScale()).add(tv); flyTo(pv, tv); }
}

// ---------- ラベル ----------
const labelEls = D.parts.filter(p => p.label || p.labelObj).map(p => {
  const el = document.createElement('button'); el.className = 'lbl'; el.textContent = PARTS[p.key].name; el.type = 'button';
  el.addEventListener('click', () => select(p, true)); $('#labels').appendChild(el);
  const line = document.createElementNS(svgNS, 'line'), dot = document.createElementNS(svgNS, 'circle'); dot.setAttribute('r', '3');
  $('#leaders').append(line, dot);
  return { p, el, line, dot, w: 0, h: 0, x: 0, y: 0, ax: 0, ay: 0, show: false };
});
function updateLabels() {
  const camDist = camera.position.distanceTo(controls.target);
  for (const L of labelEls) {
    const p = L.p; let show = S.labels && partVisible(p) && effVisible(p.obj);
    if (show) {
      const a = L.p.labelObj ? L.p.labelObj.getWorldPosition(tmpV) : L.p.obj.localToWorld(tmpV.copy(L.p.label));
      const depth = a.distanceTo(camera.position) - camDist;
      const pr = tmpV2.copy(a).project(camera);
      if (pr.z > 1) show = false; else {
        L.ax = (pr.x + 1) / 2 * W; L.ay = (1 - pr.y) / 2 * H;
        let dx = L.ax - W / 2, dy = L.ay - H / 2; const len = Math.hypot(dx, dy);
        if (len < 24) { dx = 0; dy = -1; } else { dx /= len; dy /= len; }
        const off = 58 + 46 * Math.abs(dx);
        const rightLim = narrow() ? W - 70 : W - 344 - 40 - 60;
        L.x = clamp(L.ax + dx * off, 70, rightLim); L.y = clamp(L.ay + dy * off, 80, H - 120);
        L.dim = depth > 0.07;
        if (!L.w) { L.w = L.el.offsetWidth; L.h = L.el.offsetHeight; }
      }
    }
    L.show = show;
  }
  // 重なりの簡易解消
  const vis = labelEls.filter(L => L.show);
  for (let it = 0; it < 3; it++) for (let i = 0; i < vis.length; i++) for (let j = i + 1; j < vis.length; j++) {
    const a = vis[i], b = vis[j]; const ox = (a.w + b.w) / 2 + 8 - Math.abs(a.x - b.x), oy = (a.h + b.h) / 2 + 6 - Math.abs(a.y - b.y);
    if (ox > 0 && oy > 0) { const s = a.y < b.y ? -1 : 1; a.y += s * oy / 2; b.y -= s * oy / 2; }
  }
  for (const L of labelEls) {
    L.el.style.display = L.show ? '' : 'none'; L.line.style.display = L.dot.style.display = L.show ? '' : 'none';
    if (!L.show) continue;
    L.el.style.transform = `translate(${L.x.toFixed(1)}px, ${L.y.toFixed(1)}px) translate(-50%,-50%)`;
    L.el.classList.toggle('dim', L.dim); L.el.classList.toggle('on', !!S.selected && S.selected.key === L.p.key);
    let vx = L.ax - L.x, vy = L.ay - L.y; const vl = Math.hypot(vx, vy) || 1; vx /= vl; vy /= vl;
    const t = Math.min(L.w / 2 / Math.max(1e-3, Math.abs(vx)), L.h / 2 / Math.max(1e-3, Math.abs(vy)));
    L.line.setAttribute('x1', (L.x + vx * t).toFixed(1)); L.line.setAttribute('y1', (L.y + vy * t).toFixed(1));
    L.line.setAttribute('x2', L.ax.toFixed(1)); L.line.setAttribute('y2', L.ay.toFixed(1));
    L.dot.setAttribute('cx', L.ax.toFixed(1)); L.dot.setAttribute('cy', L.ay.toFixed(1));
    L.line.classList.toggle('dim', L.dim); L.dot.classList.toggle('dim', L.dim);
  }
}

// ---------- 部品一覧・解説カード ----------
function motorTable(cls = '') {
  return `<div class="mtab ${cls}">${MOTOR_INFO.map(m => `<div class="${m.dir.toLowerCase()}"><b>${m.id} ${m.dir}</b>${m.pos}</div>`).join('')}</div>`;
}
function buildList() {
  const list = $('#partList'); let html = '';
  for (const g of GROUPS) {
    const keys = LIST_ORDER.filter(k => PARTS[k].group === g.id);
    html += `<div class="grp" style="--c:${g.color}"><i></i>${g.name}</div>`;
    for (const k of keys) { const d = PARTS[k]; html += `<div class="row${SUB[k] ? ' sub' : ''}" data-key="${k}" tabindex="0" role="button"><span class="nm">${d.name}</span><span class="cnt">${d.count > 1 ? '×' + d.count : ''}</span><button class="eye" aria-label="${d.name}の表示切替" title="表示/非表示">${ICON.eye}</button></div>`; }
  }
  list.innerHTML = html;
  $('#partCount').textContent = `${LIST_ORDER.length} 種類`;
  list.addEventListener('click', e => {
    const row = e.target.closest('.row'); if (!row) return;
    const key = row.dataset.key;
    if (e.target.closest('.eye')) { toggleHidden(key); return; }
    const ps = partsOf(key); select(ps[0], true);
  });
  list.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { const row = e.target.closest('.row'); if (row) { e.preventDefault(); select(partsOf(row.dataset.key)[0], true); } } });
}
function toggleHidden(key) {
  const ps = partsOf(key); const h = !ps.some(p => p.hidden); for (const p of ps) p.hidden = h;
  const row = $(`#partList .row[data-key="${key}"]`); if (row) row.querySelector('.eye').innerHTML = h ? ICON.eyeOff : ICON.eye;
  applyVisibility(); renderDetail();
}
function renderDetail() {
  const box = $('#detail'); const p = S.selected;
  if (!p) { box.hidden = true; box.innerHTML = ''; return; }
  const d = PARTS[p.key], g = GROUPS.find(x => x.id === d.group);
  const inst = PER_MOTOR.has(p.key) && !S.selAll ? ` · ${MOTOR_INFO[p.idx].id}（${MOTOR_INFO[p.idx].pos}・${MOTOR_INFO[p.idx].dir}）` : '';
  const hidden = partsOf(p.key).some(x => x.hidden);
  let h = `<div class="d-group" style="--c:${g.color}"><i></i>${g.name}</div><h3>${d.name}</h3><p class="d-en">${d.en}${d.count > 1 ? ` · ×${d.count}` : ''}${inst}</p>`;
  h += `<div class="d-actions"><button id="dFocus" class="primary">注目</button><button id="dIsolate">${S.isolated === p.key ? '単独表示を解除' : '単独表示'}</button><button id="dHide">${hidden ? '表示する' : '非表示'}</button><button id="dBack">閉じる</button></div>`;
  h += `<section><h4>役割</h4><p>${d.role}</p></section>`;
  if (p.key === 'motor' || p.key === 'prop' || p.key === 'esc') h += `<section><h4>配置と回転方向（上から見て）</h4>${motorTable()}</section>`;
  if (d.structure) h += `<section><h4>構造</h4><ul>${d.structure.map(s => `<li>${s}</li>`).join('')}</ul></section>`;
  if (d.spec) h += `<section><h4>仕様例</h4><dl class="spec">${d.spec.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl></section>`;
  if (d.check) h += `<section class="check"><h4>点検ポイント</h4><ul>${d.check.map(s => `<li>${s}</li>`).join('')}</ul></section>`;
  if (d.tip) h += `<div class="tipbox"><b>Note</b>${d.tip}</div>`;
  box.innerHTML = h; box.hidden = false; box.scrollTop = 0;
  $('#dFocus').onclick = () => focusOn(S.selAll ? partsOf(p.key).map(x => x.obj) : [p.obj]);
  $('#dIsolate').onclick = () => { S.isolated = S.isolated === p.key ? null : p.key; applyVisibility(); renderDetail(); if (S.isolated) focusOn(partsOf(p.key).map(x => x.obj)); };
  $('#dHide').onclick = () => toggleHidden(p.key);
  $('#dBack').onclick = () => select(null);
}
let noteTimer = 0;
function renderFlightNote(force) {
  const box = $('#flightNote');
  if (!S.flight) { box.hidden = true; return; }
  const f = FLIGHT[S.flight];
  const tab = D.motors.map((mo, i) => { const pct = Math.round(mo.rpm / HOVER_RPM * 100); const cls = pct > 103 ? 'up' : pct < 97 ? 'down' : ''; return `<div class="${cls}"><b>${MOTOR_INFO[i].id} ${pct}%</b>${MOTOR_INFO[i].pos} · ${MOTOR_INFO[i].dir}</div>`; }).join('');
  if (force || box.hidden) { box.innerHTML = `<h3>${f.name}</h3><p>${f.note}</p><div class="mtab" id="fnTab">${tab}</div>`; box.hidden = false; }
  else $('#fnTab').innerHTML = tab;
}

// ---------- UI配線 ----------
function segSet(seg, attr, val) { for (const b of $$('button', seg)) { const on = b.dataset[attr] === String(val); b.classList.toggle('on', on); if (b.getAttribute('role') === 'tab') b.setAttribute('aria-selected', on); } }
$('#modeSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; setMode(b.dataset.mode); });
function setMode(m) { S.mode = m; segSet($('#modeSeg'), 'mode', m); applyMode(); if (m === 'cut') setView('inside'); }
const explodeEl = $('#explode');
explodeEl.addEventListener('input', () => { S.explode = explodeEl.value / 100; S.explodeT = S.explode; $('#explodeVal').textContent = explodeEl.value + '%'; explodePullBack(); });
function explodePullBack() {
  if (S.explode < 0.35 || S.explodedCam) return; S.explodedCam = true;
  const dir = camera.position.clone().sub(controls.target); const d = dir.length(); if (d > 1.45) return;
  flyTo(controls.target.clone().addScaledVector(dir.normalize(), 1.55), controls.target.clone(), 1100);
}
function setExplode(v) { S.explode = v; explodeEl.value = Math.round(v * 100); $('#explodeVal').textContent = Math.round(v * 100) + '%'; explodePullBack(); }
$('#powerSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; setPower(parseFloat(b.dataset.p)); });
function setPower(p) { S.power = p; segSet($('#powerSeg'), 'p', p); }
$('#flightChips').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; setFlight(S.flight === b.dataset.f ? null : b.dataset.f); });
function setFlight(f) {
  S.flight = f; S.flightT = 0; for (const b of $$('#flightChips button')) b.classList.toggle('on', b.dataset.f === f);
  if (f && S.power === 0) setPower(0.5);
  if (f) { controls.autoRotate = false; }
  renderFlightNote(true);
}
document.addEventListener('click', e => {
  const b = e.target.closest('.tgl'); if (!b) return;
  const t = b.dataset.t; b.classList.toggle('on');
  const on = b.classList.contains('on');
  if (t === 'labels') { S.labels = on; S.labelsTouched = true; } else if (t === 'arrows') S.arrows = on; else if (t === 'autorotate') { S.autoRotate = on; if (!on) controls.autoRotate = false; }
  else if (t === 'shadows') { S.shadows = on; applyMode(); }
});
$('#viewSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; segSet($('#viewSeg'), 'v', b.dataset.v); setView(b.dataset.v); });
$('#fsBtn').addEventListener('click', () => { const el = document.documentElement; if (document.fullscreenElement) document.exitFullscreen(); else if (el.requestFullscreen) el.requestFullscreen(); else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen(); });
$('#settingsBtn').addEventListener('click', e => { e.stopPropagation(); $('#settings').hidden = !$('#settings').hidden; });
document.addEventListener('click', e => { if (!e.target.closest('#settings') && !e.target.closest('#settingsBtn')) $('#settings').hidden = true; });
$('#qualitySeg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; segSet($('#qualitySeg'), 'q', b.dataset.q); S.quality = b.dataset.q; if (b.dataset.q !== 'auto') applyQuality(parseInt(b.dataset.q, 10)); });
$('#themeSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; segSet($('#themeSeg'), 'th', b.dataset.th); if (b.dataset.th === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = b.dataset.th; applyTheme(); });
$('#envSlider').addEventListener('input', e => { scene.environmentIntensity = e.target.value / 100; });
$('#showAll').addEventListener('click', () => { for (const p of D.parts) p.hidden = false; S.isolated = null; for (const b of $$('#partList .eye')) b.innerHTML = ICON.eye; applyVisibility(); renderDetail(); });
$('#inspToggle').addEventListener('click', () => $('#inspector').classList.add('open'));
$('#inspClose').addEventListener('click', () => $('#inspector').classList.remove('open'));
// シート(モバイル)のドラッグ: 1:1追従 + 速度で確定
{
  const insp = $('#inspector'), grab = $('.grabber'); let drag = null;
  grab.addEventListener('pointerdown', e => { drag = { y0: e.clientY, hist: [[e.clientY, performance.now()]] }; grab.setPointerCapture(e.pointerId); insp.classList.add('dragging'); });
  grab.addEventListener('pointermove', e => { if (!drag) return; const dy = Math.max(0, e.clientY - drag.y0); insp.style.transform = `translateY(${dy}px)`; drag.hist.push([e.clientY, performance.now()]); if (drag.hist.length > 6) drag.hist.shift(); });
  const end = e => { if (!drag) return; const dy = Math.max(0, e.clientY - drag.y0); const h0 = drag.hist[0], h1 = drag.hist[drag.hist.length - 1]; const v = (h1[0] - h0[0]) / Math.max(1, h1[1] - h0[1]);
    insp.classList.remove('dragging'); insp.style.transform = ''; if (v > 0.5 || dy > insp.offsetHeight * 0.4) insp.classList.remove('open'); drag = null; };
  grab.addEventListener('pointerup', end); grab.addEventListener('pointercancel', end);
}
// キーボード
document.addEventListener('keydown', e => {
  if (e.target.matches('input, textarea, select')) return;
  const k = e.key.toLowerCase();
  if (k === '1') setMode('normal'); else if (k === '2') setMode('xray'); else if (k === '3') setMode('wire'); else if (k === '4') setMode('cut');
  else if (k === 'e') setExplode(S.explode > 0.5 ? 0 : 1);
  else if (k === 'l') { const b = $('.tgl[data-t=labels]'); b.click(); }
  else if (k === 'a') { const b = $('.tgl[data-t=arrows]'); b.click(); }
  else if (k === ' ') { e.preventDefault(); setPower(S.power === 0 ? 0.5 : 0); }
  else if (k === 'r') { segSet($('#viewSeg'), 'v', 'iso'); setView('iso'); }
  else if (k === 'f' && S.selected) focusOn(S.selAll ? partsOf(S.selected.key).map(x => x.obj) : [S.selected.obj]);
  else if (k === 'h' && S.selected) toggleHidden(S.selected.key);
  else if (k === 'escape') { if (S.flight) setFlight(null); else if (S.selected) select(null); else $('#inspector').classList.remove('open'); }
});
// ピック
let pDown = null, hoverAt = null;
canvas.addEventListener('pointerdown', e => { pDown = { x: e.clientX, y: e.clientY, t: performance.now() }; $('#hint').classList.add('gone'); });
canvas.addEventListener('pointerup', e => {
  if (!pDown) return; const moved = Math.hypot(e.clientX - pDown.x, e.clientY - pDown.y), dt = performance.now() - pDown.t; pDown = null;
  if (moved < 6 && dt < 700) { const p = pickAt(e.clientX, e.clientY); if (p) select(p, false); else if (S.selected) select(null); }
});
canvas.addEventListener('dblclick', e => { const p = pickAt(e.clientX, e.clientY); if (p) focusOn([p.obj]); });
canvas.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') hoverAt = { x: e.clientX, y: e.clientY }; });
canvas.addEventListener('pointerleave', () => { hoverAt = null; S.hovered = null; outlineHov.selectedObjects = []; canvas.classList.remove('pick'); });
setTimeout(() => $('#hint').classList.add('gone'), 9000);

// ---------- テーマ・品質・リサイズ ----------
function isDark() { const cs = getComputedStyle(document.documentElement).colorScheme || ''; if (cs.includes('dark')) return true; if (cs.includes('light')) return false; return matchMedia('(prefers-color-scheme: dark)').matches; }
function applyTheme() {
  const dark = isDark(); buildStudio(dark);
  xrayMat.uniforms.color.value.set(dark ? '#8fc9ff' : '#20304a'); xrayMat.uniforms.opacity.value = dark ? 0.75 : 0.85; xrayMat.uniforms.base.value = dark ? 0.02 : 0.05;
  xrayMat.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending; xrayMat.needsUpdate = true;
  wireMat.color.set(dark ? '#aab7cc' : '#2b3442'); paperMat.color.set(dark ? '#1c2027' : '#f3f4f7');
  outlineHov.visibleEdgeColor.set(dark ? '#ffffff' : '#1b1f27'); outlineHov.hiddenEdgeColor.set(dark ? '#334' : '#99a');
  arrowNeutral = dark ? ARROW_NEUTRAL.dark : ARROW_NEUTRAL.light;
}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
function applyQuality(level) {
  S.qLevel = level; S.lastQChange = performance.now();
  gtao.enabled = level >= 2;
  const dpr = Math.min(window.devicePixelRatio || 1, level >= 1 ? 2 : 1.25);
  if (dpr !== DPR) { DPR = dpr; renderer.setPixelRatio(DPR); composer.setPixelRatio(DPR); resize(); }
  const sm = level >= 1 ? 2048 : 1024;
  if (key.shadow.mapSize.x !== sm) { key.shadow.mapSize.set(sm, sm); if (key.shadow.map) { key.shadow.map.dispose(); key.shadow.map = null; } }
}
function syncLabelsDefault() { if (S.labelsTouched) return; S.labels = !narrow(); $('.tgl[data-t=labels]').classList.toggle('on', S.labels); }
function resize() {
  W = canvas.clientWidth || 1; H = canvas.clientHeight || 1; syncLabelsDefault();
  renderer.setSize(W, H, false); composer.setSize(W, H);
  if (!narrow()) { const inspW = 344 + 40; camera.aspect = (W - inspW) / H; camera.setViewOffset(W - inspW, H, 0, 0, W, H); }
  else { camera.clearViewOffset(); camera.aspect = W / H; }
  camera.updateProjectionMatrix();
  $('#leaders').setAttribute('viewBox', `0 0 ${W} ${H}`);
  for (const L of labelEls) L.w = 0;
}
window.addEventListener('resize', resize);

// ---------- メインループ ----------
let last = performance.now(), ema = 16, perfT = 0, fpsAcc = 0, fpsN = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  ema = ema * 0.9 + (dt * 1000) * 0.1; fpsAcc += dt; fpsN++;
  if (S.tween) { const T = S.tween, k = easeInOut(Math.min(1, (now - T.t0) / T.dur)); camera.position.lerpVectors(T.p0, T.p1, k); controls.target.lerpVectors(T.q0, T.q1, k); if (k >= 1) S.tween = null; }
  const idle = now - S.lastInteract > 5000;
  controls.autoRotate = S.autoRotate && !S.tween && idle && !S.flight && !reduceMotion;
  controls.update();
  S.explodeT += (S.explode - S.explodeT) * (1 - Math.exp(-dt * 9)); if (Math.abs(S.explode - S.explodeT) < 0.0005) S.explodeT = S.explode;
  if (S.explode < 0.05) S.explodedCam = false;
  applyExplode(); updateMotors(dt); updateFlight(dt);
  if (S.mode === 'cut') updateCutPlanes();
  if (hoverAt) { const p = pickAt(hoverAt.x, hoverAt.y); hoverAt = null; if (p !== S.hovered) { S.hovered = p; outlineHov.selectedObjects = p && p !== S.selected ? [p.obj] : []; canvas.classList.toggle('pick', !!p); } }
  renderer.info.reset(); composer.render();
  updateLabels();
  if (S.flight) { noteTimer += dt; if (noteTimer > 0.25) { noteTimer = 0; renderFlightNote(false); } }
  perfT += dt;
  if (perfT > 1.5) {
    perfT = 0; const fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0;
    $('#perfInfo').textContent = `${fps.toFixed(0)} fps · ${renderer.info.render.calls} draw · ${(renderer.info.render.triangles / 1000).toFixed(0)}k tri · AO ${gtao.enabled ? 'on' : 'off'} · ${DPR}× · 起動 ${TL.first || '-'}ms`;
    if (S.quality === 'auto' && now - S.lastQChange > 4000) {
      if (ema > 30 && S.qLevel > 0) applyQuality(S.qLevel - 1);
      else if (ema < 12 && S.qLevel < 2 && !S.steppedUp) { S.steppedUp = true; applyQuality(S.qLevel + 1); }
    }
  }
}

// ---------- 起動 ----------
buildList(); applyTheme(); resize(); applyMode(); applyVisibility(); mark('setup');
{ const vs = viewScale(); if (vs > 1) camera.position.multiplyScalar(vs); }
$('#loadMsg').textContent = 'シェーダーをコンパイルしています…';
const startLoop = () => { mark('compile');
  let t = performance.now(); renderer.render(scene, camera); TL.r1 = Math.round(performance.now() - t);
  t = performance.now(); gtao.enabled = false; composer.render(); TL.r2 = Math.round(performance.now() - t);
  t = performance.now(); gtao.enabled = S.qLevel >= 2; composer.render(); TL.r3 = Math.round(performance.now() - t);
  t = performance.now(); outlineSel.selectedObjects = [D.parts[0].obj]; composer.render(); outlineSel.selectedObjects = []; TL.r4 = Math.round(performance.now() - t);
  requestAnimationFrame(frame); requestAnimationFrame(() => requestAnimationFrame(() => { mark('first'); $('#loading').classList.add('gone'); window.__droneReady = true; console.log('[drone3d] timeline ms', JSON.stringify(TL)); })); };
if (renderer.compileAsync) renderer.compileAsync(scene, camera).then(startLoop, startLoop); else startLoop();
