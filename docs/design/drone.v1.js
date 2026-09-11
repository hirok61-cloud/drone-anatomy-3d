// ===== ドローン本体の手続き生成 =====
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const UP = V3(0, 1, 0);
const CW_COLOR = 0x3b7df7, CCW_COLOR = 0x14b8a6;

function mesh(geo, mat, { cast = true, recv = true } = {}) { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = recv; return m; }
const cylGeo = (rt, rb, h, seg = 32, open = false) => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open);
const rboxGeo = (w, h, d, r, seg = 3) => new RoundedBoxGeometry(w, h, d, seg, r);
function tubeGeo(points, r, seg = 48, radial = 8) { return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5), seg, r, radial, false); }
function tubeBetween(a, b, r, mat, seg = 20) { const d = V3().subVectors(b, a); const len = d.length(); const m = mesh(cylGeo(r, r, len, seg), mat); m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(UP, d.normalize()); return m; }
function at(obj, x, y, z) { obj.position.set(x, y, z); return obj; }
function nonIndexed(g) { return g.index ? g.toNonIndexed() : g; }
function merged(geos) { return mergeGeometries(geos.map(nonIndexed), false); }

function roundedRectPath(P, w, h, r, cx = 0, cy = 0) {
  const x = cx - w / 2, y = cy - h / 2;
  P.moveTo(x + r, y); P.lineTo(x + w - r, y); P.quadraticCurveTo(x + w, y, x + w, y + r); P.lineTo(x + w, y + h - r);
  P.quadraticCurveTo(x + w, y + h, x + w - r, y + h); P.lineTo(x + r, y + h); P.quadraticCurveTo(x, y + h, x, y + h - r);
  P.lineTo(x, y + r); P.quadraticCurveTo(x, y, x + r, y); return P;
}
// 板: shape座標 (x, s) は world (x, -z) に対応。押し出しは +Y。
function plateGeometry(w, h, r, holes, thickness, cy = 0) {
  const s = roundedRectPath(new THREE.Shape(), w, h, r, 0, cy);
  for (const ho of holes) {
    const p = new THREE.Path();
    if (ho.r) p.absarc(ho.x, ho.s, ho.r, 0, Math.PI * 2, false); else roundedRectPath(p, ho.w, ho.h, ho.rr || 0.002, ho.x, ho.s);
    s.holes.push(p);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: thickness, bevelEnabled: true, bevelThickness: 0.0004, bevelSize: 0.0004, bevelSegments: 2, curveSegments: 14 });
  g.rotateX(-Math.PI / 2);
  return g;
}
function annularSector(rIn, rOut, angle, depth) {
  const s = new THREE.Shape();
  s.absarc(0, 0, rOut, -angle / 2, angle / 2, false);
  s.absarc(0, 0, rIn, angle / 2, -angle / 2, true);
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 6 });
  g.rotateX(-Math.PI / 2); g.translate(0, -depth / 2, 0);
  return g;
}

// ---- プロペラ翼(翼型・ねじり・後退角付き) ----
function propGeometry(dir) {
  const R = 0.152, r0 = 0.0105, pitch = 0.114, cmax = 0.027, nSpan = 40, nHalf = 12;
  const sec = [];
  for (let k = 0; k <= nHalf; k++) sec.push({ s: 0.5 * (1 - Math.cos(Math.PI * k / nHalf)), side: 1 });
  for (let k = nHalf - 1; k >= 1; k--) sec.push({ s: 0.5 * (1 - Math.cos(Math.PI * k / nHalf)), side: -1 });
  const nLoop = sec.length;
  const yt = s => 0.2969 * Math.sqrt(s) - 0.1260 * s - 0.3516 * s * s + 0.2843 * s ** 3 - 0.1015 * s ** 4;
  const chord = tau => tau < 0.35 ? 0.5 + 0.5 * (tau / 0.35) : Math.max(0.1, Math.sqrt(Math.max(0, 1 - Math.pow((tau - 0.35) / 0.66, 2))));
  const pos = [], uv = [], idx = [];
  for (let b = 0; b < 2; b++) {
    const rot = b * Math.PI, base = pos.length / 3;
    for (let i = 0; i <= nSpan; i++) {
      const tau = i / nSpan, r = r0 + (R - r0) * tau, c = cmax * chord(tau);
      const beta = Math.min(0.9, Math.atan(pitch / (2 * Math.PI * r)));
      const t = 0.15 - 0.10 * tau, m = 0.025 + 0.02 * tau;
      const sweep = -0.30 * c * tau * tau, droop = -0.003 * tau ** 3;
      const cb = Math.cos(beta), sb = Math.sin(beta);
      for (let j = 0; j <= nLoop; j++) {
        const p = sec[j % nLoop];
        const th = 5 * t * yt(p.s), cam = m * 4 * p.s * (1 - p.s);
        const xc = (p.s - 0.3) * c + sweep, yc = (p.side * th + cam) * c;
        let z = xc * cb + yc * sb; const y = -xc * sb + yc * cb + droop;
        if (dir < 0) z = -z;
        const X = r * Math.cos(rot) + z * Math.sin(rot), Z = -r * Math.sin(rot) + z * Math.cos(rot);
        pos.push(X, y, Z); uv.push(j / nLoop, tau);
      }
    }
    const W = nLoop + 1;
    for (let i = 0; i < nSpan; i++) for (let j = 0; j < nLoop; j++) {
      const a = base + i * W + j, b2 = a + 1, c2 = a + W, d = c2 + 1;
      if (dir > 0) idx.push(a, b2, c2, b2, d, c2); else idx.push(a, c2, b2, b2, c2, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

// ---- モーター(アウターランナー) ローカル: 軸=+Y, 原点=ベース底面 ----
function motorGeometries() {
  const teeth = [], coils = [], magnets = [];
  const tooth = new THREE.BoxGeometry(0.0055, 0.010, 0.0030).translate(0.01025, 0, 0);
  const shoe = annularSector(0.0125, 0.0136, THREE.MathUtils.degToRad(26), 0.010);
  // コイル: 歯の周りを回るスーパー楕円ヘリックス
  const pts = []; const turns = 4.5, n = 150;
  for (let i = 0; i <= n; i++) { const t = i / n, ph = 2 * Math.PI * turns * t; const sy = Math.sin(ph), cz = Math.cos(ph);
    pts.push(V3(0.0083 + 0.0042 * t, 0.0059 * Math.sign(sy) * Math.pow(Math.abs(sy), 0.5), 0.0024 * Math.sign(cz) * Math.pow(Math.abs(cz), 0.5))); }
  const coil = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 220, 0.00045, 6, false);
  for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; teeth.push(tooth.clone().rotateY(a), shoe.clone().rotateY(a)); coils.push(coil.clone().rotateY(a)); }
  const mag = annularSector(0.0138, 0.0157, THREE.MathUtils.degToRad(22.5), 0.011);
  for (let k = 0; k < 14; k++) magnets.push(mag.clone().rotateY(k * Math.PI * 2 / 14));
  return { teeth: merged(teeth), coils: merged(coils), magnets: merged(magnets), propCCW: propGeometry(1), propCW: propGeometry(-1),
    hub: new THREE.LatheGeometry([[0.0052, -0.005], [0.011, -0.005], [0.012, -0.004], [0.012, 0.004], [0.011, 0.005], [0.0052, 0.005]].map(p => new THREE.Vector2(p[0], p[1])), 40) };
}

function buildMotor(M, G, dir, reg) {
  const g = new THREE.Group(); g.name = 'motor';
  // ベース
  const base = new THREE.Group();
  base.add(at(mesh(cylGeo(0.0105, 0.0105, 0.004), M.aluDark), 0, 0.002, 0));
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; const arm = mesh(rboxGeo(0.021, 0.0032, 0.008, 0.0014), M.aluDark); arm.rotation.y = -a; at(arm, Math.cos(a) * 0.0115, 0.0016, -Math.sin(a) * 0.0115); base.add(arm);
    base.add(at(mesh(cylGeo(0.0016, 0.0016, 0.0004, 12), M.chip), Math.cos(a) * 0.0165, 0.0033, -Math.sin(a) * 0.0165)); }
  base.add(at(mesh(cylGeo(0.0052, 0.0052, 0.018), M.aluDark), 0, 0.013, 0));
  g.add(base); reg(base, 'motorBase', V3(0, 0, 0));
  // ステーター
  const stator = new THREE.Group();
  stator.add(at(mesh(cylGeo(0.0079, 0.0079, 0.010, 48), M.lamination), 0, 0.012, 0));
  stator.add(at(mesh(G.teeth, M.lamination), 0, 0.012, 0));
  g.add(stator); reg(stator, 'stator', V3(0, 0.035, 0));
  const coils = at(mesh(G.coils, M.copper), 0, 0.012, 0); g.add(coils); reg(coils, 'winding', V3(0, 0.035, 0));
  // 磁石
  const mags = at(mesh(G.magnets, M.magnet), 0, 0.012, 0); g.add(mags); reg(mags, 'magnet', V3(0, 0.07, 0));
  // ベル
  const bell = new THREE.Group();
  bell.add(at(mesh(cylGeo(0.0175, 0.0175, 0.024, 64, true), M.bellWall), 0, 0.0175, 0));
  const ring = (ri, ro, y, mat) => { const m = mesh(new THREE.RingGeometry(ri, ro, 64), mat); m.rotation.x = -Math.PI / 2; at(m, 0, y, 0); return m; };
  bell.add(ring(0.0157, 0.0175, 0.0056, M.bellSolid));
  bell.add(ring(0.0075, 0.0175, 0.0296, M.bellTop));
  bell.add(ring(0.0075, 0.0175, 0.0276, M.bellTop));
  bell.add(at(mesh(cylGeo(0.0065, 0.0075, 0.004), M.alu), 0, 0.0316, 0));
  g.add(bell); reg(bell, 'bell', V3(0, 0.10, 0));
  // シャフト
  const shaft = new THREE.Group();
  shaft.add(at(mesh(cylGeo(0.002, 0.002, 0.041, 16), M.steel), 0, 0.0165, 0));
  shaft.add(at(mesh(new THREE.TorusGeometry(0.0027, 0.0005, 6, 24), M.steel).rotateX(Math.PI / 2), 0, -0.003, 0));
  shaft.add(at(mesh(cylGeo(0.005, 0.005, 0.006, 24), M.alu), 0, 0.0365, 0));
  g.add(shaft); reg(shaft, 'shaft', V3(0, 0.14, 0));
  // プロペラ(回転グループ)
  const propG = new THREE.Group(); propG.name = 'prop'; at(propG, 0, 0.0435, 0);
  propG.add(mesh(dir > 0 ? G.propCCW : G.propCW, dir > 0 ? M.propCCW : M.propCW));
  propG.add(mesh(G.hub, M.propHub));
  const dirRing = mesh(new THREE.TorusGeometry(0.0108, 0.0008, 8, 48), new THREE.MeshStandardMaterial({ color: dir > 0 ? CCW_COLOR : CW_COLOR, roughness: 0.4 })); dirRing.rotation.x = Math.PI / 2; at(dirRing, 0, 0.0045, 0); propG.add(dirRing);
  const nut = new THREE.Group(); at(nut, 0, 0.005, 0);
  nut.add(at(mesh(cylGeo(0.0045, 0.0045, 0.0055, 6), M.aluOrange), 0, 0.00275, 0));
  nut.add(at(mesh(cylGeo(0.0028, 0.0038, 0.0025, 24), M.aluOrange), 0, 0.0068, 0));
  propG.add(nut); reg(nut, 'propNut', V3(0, 0.045, 0));
  g.add(propG); reg(propG, 'prop', V3(0, 0.17, 0));
  // 回転ブラーディスク
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.156, 64), M.propDisc.clone()); disc.rotation.x = -Math.PI / 2; at(disc, 0, 0.0435, 0); disc.renderOrder = 5; disc.userData.noPart = true; disc.userData.noPick = true; g.add(disc);
  return { group: g, prop: propG, disc, bell, mags, dir };
}

// ---- 矢印ヘルパー ----
function arrowMesh(color, len = 0.08, r = 0.0035) {
  const mat = new THREE.MeshBasicMaterial({ color, toneMapped: false, transparent: true, opacity: 0.92 });
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(cylGeo(r, r, 1, 12), mat); shaft.position.y = 0.5; g.add(shaft);
  const head = new THREE.Mesh(new THREE.ConeGeometry(r * 2.6, r * 6, 16), mat); head.position.y = 1; g.add(head);
  g.userData.setLength = (L) => { shaft.scale.set(1, L, 1); shaft.position.y = L / 2; head.position.y = L + r * 3; };
  g.userData.setLength(len); g.userData.mat = mat;
  return g;
}
function rotationArc(dir, radius = 0.056) {
  const color = dir > 0 ? CCW_COLOR : CW_COLOR;
  const mat = new THREE.MeshBasicMaterial({ color, toneMapped: false, transparent: true, opacity: 0.95 });
  const g = new THREE.Group();
  const arcLen = Math.PI * 1.6;
  const torus = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.0022, 8, 64, arcLen), mat); torus.rotation.x = -Math.PI / 2; g.add(torus);
  const end = arcLen; const px = radius * Math.cos(end), pz = -radius * Math.sin(end);
  const tangent = V3(-Math.sin(end), 0, -Math.cos(end)).normalize();
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.0075, 0.018, 16), mat); cone.position.set(px, 0, pz); cone.quaternion.setFromUnitVectors(UP, tangent); g.add(cone);
  if (dir < 0) g.scale.z = -1;
  g.userData.mat = mat;
  return g;
}

// ---- 全体組み立て ----
function buildDrone(M) {
  const root = new THREE.Group(); root.name = 'drone';
  const parts = [], pick = [], wires = [], motors = [];
  const G = motorGeometries();
  const idxCount = {};
  function reg(obj, key, explode, opts = {}) {
    const idx = (idxCount[key] = (idxCount[key] || 0) + 1) - 1;
    const p = { key, idx, obj, home: obj.position.clone(), explode: explode.clone(), meshes: [], coarse: !!opts.coarse, label: opts.label || null, hidden: false };
    obj.userData.part = p;
    obj.traverse(m => { if (m.isMesh && !m.userData.noPart) { p.meshes.push(m); if (!m.userData.fine) m.userData.fine = p; if (opts.coarse) m.userData.coarse = p; if (!m.userData.noPick) pick.push(m); } });
    parts.push(p); return p;
  }
  const rw = (m) => { wires.push(m); m.userData.wire = true; return m; };

  // --- プレート ---
  const bottomHoles = [
    { w: 0.024, h: 0.0045, rr: 0.002, x: 0.0255, s: 0.038 }, { w: 0.024, h: 0.0045, rr: 0.002, x: -0.0255, s: 0.038 },
    { w: 0.024, h: 0.0045, rr: 0.002, x: 0.0255, s: -0.033 }, { w: 0.024, h: 0.0045, rr: 0.002, x: -0.0255, s: -0.033 },
    { r: 0.0045, x: 0.016, s: 0.072 }, { r: 0.006, x: -0.05, s: 0.08 }, { r: 0.006, x: 0.05, s: 0.08 },
  ];
  const bottom = mesh(plateGeometry(0.150, 0.170, 0.018, bottomHoles, 0.0025, 0.010), M.carbonPlate);
  root.add(bottom); reg(bottom, 'frameBottom', V3(0, -0.03, 0), { label: V3(-0.07, 0.0, -0.06) });
  const topHoles = [{ w: 0.044, h: 0.044, rr: 0.006, x: 0, s: 0 }, { r: 0.0035, x: -0.03, s: -0.036 }, { r: 0.005, x: 0.052, s: 0.052 }, { r: 0.005, x: -0.052, s: 0.052 }, { r: 0.005, x: 0.052, s: -0.052 }, { r: 0.005, x: -0.052, s: -0.052 }];
  const top = at(mesh(plateGeometry(0.150, 0.150, 0.018, topHoles, 0.002), M.carbonPlate), 0, 0.0375, 0);
  root.add(top); reg(top, 'frameTop', V3(0, 0.10, 0), { label: V3(0.05, 0.004, -0.045) });
  // スタンドオフ
  const standoffs = new THREE.Group();
  const soPos = [[0.062, 0.025], [-0.062, 0.025], [0.062, -0.025], [-0.062, -0.025], [0.030, 0.062], [-0.030, 0.062], [0.030, -0.062], [-0.030, -0.062]];
  for (const [x, z] of soPos) standoffs.add(at(mesh(cylGeo(0.0028, 0.0028, 0.035, 6), M.aluOrange), x, 0.020, z));
  root.add(standoffs); reg(standoffs, 'standoff', V3(0, 0.05, 0));

  // --- アーム ×4 ---
  const ARMS = [
    { id: 'M1', u: V3(1, 0, -1).normalize(), dir: 1, led: M.ledGreen },
    { id: 'M2', u: V3(1, 0, 1).normalize(), dir: -1, led: M.ledWhite },
    { id: 'M3', u: V3(-1, 0, 1).normalize(), dir: 1, led: M.ledWhite },
    { id: 'M4', u: V3(-1, 0, -1).normalize(), dir: -1, led: M.ledRed },
  ];
  const screwList = []; // {p: Vector3(world of root), flip: bool}
  ARMS.forEach((A, k) => {
    const ag = new THREE.Group(); ag.name = 'arm' + A.id; ag.rotation.y = Math.atan2(-A.u.z, A.u.x); root.add(ag);
    const clamp = at(mesh(rboxGeo(0.030, 0.020, 0.022, 0.003), M.aluOrange), 0.055, 0.020, 0); ag.add(clamp); reg(clamp, 'armClamp', V3(0.06, 0, 0));
    const tube = mesh(cylGeo(0.008, 0.008, 0.241, 40), M.carbonArm); tube.rotation.z = -Math.PI / 2; at(tube, 0.1655, 0.020, 0); ag.add(tube);
    reg(tube, 'arm', V3(0.12, 0, 0), { label: k === 1 ? V3(0.0, 0.008, 0.0) : null });
    // ESC
    const esc = new THREE.Group(); at(esc, 0.105, 0.0311, 0);
    esc.add(mesh(rboxGeo(0.032, 0.0062, 0.015, 0.002), M.heatShrink));
    const lbl = mesh(new THREE.PlaneGeometry(0.027, 0.0105), M.escLabel, { cast: false }); lbl.rotation.x = -Math.PI / 2; lbl.rotation.z = 0; at(lbl, 0, 0.00325, 0); esc.add(lbl);
    ag.add(esc); reg(esc, 'esc', V3(0.06, 0.05, 0), { label: k === 2 ? V3(0, 0.004, 0) : null });
    // モーターマウント + LED
    const mount = new THREE.Group(); at(mount, 0.275, 0, 0);
    mount.add(at(mesh(rboxGeo(0.034, 0.022, 0.026, 0.003), M.aluDark), 0, 0.020, 0));
    mount.add(at(mesh(cylGeo(0.017, 0.017, 0.003, 40), M.aluDark), 0, 0.0325, 0));
    ag.add(mount); reg(mount, 'motorMount', V3(0.12, 0.02, 0));
    const led = at(mesh(rboxGeo(0.006, 0.005, 0.012, 0.0015), A.led), 0.294, 0.014, 0); ag.add(led);
    const glow = new THREE.Sprite(M.glow(A.led.emissive.getHex())); glow.scale.set(0.045, 0.045, 1); glow.position.set(0.004, 0, 0); glow.renderOrder = 6; led.add(glow);
    reg(led, 'led', V3(0.14, 0.02, 0), { label: k === 0 ? V3(0.004, 0, 0) : null });
    // モーター
    const mo = buildMotor(M, G, A.dir, reg); mo.group.rotation.y = Math.PI / 4; at(mo.group, 0.275, 0.034, 0); ag.add(mo.group);
    const mp = reg(mo.group, 'motor', V3(0.12, 0.075, 0), { coarse: true, label: k === 0 ? V3(0, 0.02, 0) : null });
    mo.part = mp; mo.arm = ag; mo.id = A.id; mo.u = A.u; motors.push(mo);
    // プロペラ用ラベルは M4 のディスク上の固定点
    if (k === 3) { const anchor = new THREE.Object3D(); at(anchor, 0.10, 0.045, 0); mo.group.add(anchor); mp.propAnchor = anchor; }
    // 配線: 相線 3本
    const wg = new THREE.Group();
    for (let i = -1; i <= 1; i++) { const z = i * 0.0028; wg.add(rw(mesh(tubeGeo([V3(0.121, 0.0322, z), V3(0.150, 0.0295, z), V3(0.200, 0.0293, z), V3(0.245, 0.0300, z), V3(0.262, 0.0350, z * 0.6)], 0.0012, 40), M.wireBlack))); }
    // 電源線(赤/黒)と信号線
    wg.add(rw(mesh(tubeGeo([V3(0.089, 0.0318, 0.0025), V3(0.070, 0.0300, 0.0025), V3(0.048, 0.0250, 0.0022), V3(0.031, 0.0140, 0.002), V3(0.022, 0.0088, 0.002)], 0.0017, 40), M.wireRed)));
    wg.add(rw(mesh(tubeGeo([V3(0.089, 0.0318, -0.0025), V3(0.070, 0.0300, -0.0025), V3(0.048, 0.0250, -0.0022), V3(0.031, 0.0140, -0.002), V3(0.022, 0.0088, -0.002)], 0.0017, 40), M.wireBlack)));
    wg.add(rw(mesh(tubeGeo([V3(0.089, 0.0330, 0), V3(0.060, 0.0300, 0), V3(0.036, 0.0240, 0), V3(0.026, 0.0205, 0)], 0.0007, 30), M.wireWhite)));
    for (const x of [0.16, 0.235]) { const zt = mesh(new THREE.TorusGeometry(0.0093, 0.0006, 6, 32), M.plasticBlack); zt.rotation.y = Math.PI / 2; at(zt, x, 0.0205, 0); wg.add(zt); }
    ag.add(wg); reg(wg, 'wiring', V3(0.06, 0.02, 0));
    // ネジ位置(root座標): クランプ上下・モーターマウント
    for (const d of [0.047, 0.063]) { screwList.push({ p: V3(A.u.x * d, 0.0395, A.u.z * d), flip: false }); screwList.push({ p: V3(A.u.x * d, -0.0005, A.u.z * d), flip: true }); }
    for (let q = 0; q < 4; q++) { const a = q * Math.PI / 2 + Math.PI / 4 + ag.rotation.y + Math.PI / 4; screwList.push({ p: V3(A.u.x * 0.275 + Math.cos(a) * 0.0165, 0.034 + 0.0033, A.u.z * 0.275 - Math.sin(a) * 0.0165), flip: false }); }
  });
  for (const [x, z] of soPos) { screwList.push({ p: V3(x, 0.0395, z), flip: false }); screwList.push({ p: V3(x, -0.0005, z), flip: true }); }

  // --- FCスタック ---
  const pcbMats = (top) => [M.pcbEdge, M.pcbEdge, top, M.pcbEdge, M.pcbEdge, M.pcbEdge];
  const pdb = new THREE.Group();
  pdb.add(at(mesh(new THREE.BoxGeometry(0.036, 0.0016, 0.036), pcbMats(M.pcbPDB)), 0, 0.0073, 0));
  for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) pdb.add(at(mesh(cylGeo(0.0025, 0.0025, 0.004, 12), M.plasticBlack), x * 0.01525, 0.0045, z * 0.01525));
  root.add(pdb); reg(pdb, 'pdb', V3(0, 0.025, 0));
  const cap = new THREE.Group(); at(cap, 0.028, 0.0125, 0.0);
  const capBody = mesh(cylGeo(0.005, 0.005, 0.016, 24), M.plasticBlack); capBody.rotation.z = Math.PI / 2; cap.add(capBody);
  const capStripe = mesh(cylGeo(0.00505, 0.00505, 0.004, 24), M.plasticGray); capStripe.rotation.z = Math.PI / 2; at(capStripe, -0.005, 0, 0); cap.add(capStripe);
  cap.add(rw(mesh(tubeGeo([V3(-0.008, 0, 0.002), V3(-0.012, -0.003, 0.002), V3(-0.014, -0.0055, 0.004)], 0.0008, 12), M.wireRed)));
  cap.add(rw(mesh(tubeGeo([V3(-0.008, 0, -0.002), V3(-0.012, -0.003, -0.002), V3(-0.014, -0.0055, -0.004)], 0.0008, 12), M.wireBlack)));
  root.add(cap); reg(cap, 'capacitor', V3(0.02, 0.025, 0));
  const fc = new THREE.Group();
  fc.add(at(mesh(new THREE.BoxGeometry(0.036, 0.0016, 0.036), pcbMats(M.pcbFC)), 0, 0.0189, 0));
  for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { fc.add(at(mesh(cylGeo(0.0025, 0.0025, 0.010, 12), M.plasticBlack), x * 0.01525, 0.0131, z * 0.01525)); const gr = mesh(new THREE.TorusGeometry(0.0024, 0.0009, 8, 20), M.rubber); gr.rotation.x = Math.PI / 2; at(gr, x * 0.01525, 0.0192, z * 0.01525); fc.add(gr); }
  fc.add(at(mesh(new THREE.BoxGeometry(0.010, 0.0012, 0.010), M.chip), 0.004, 0.0203, 0.003));
  fc.add(at(mesh(new THREE.BoxGeometry(0.003, 0.0009, 0.003), M.chip), -0.008, 0.0202, -0.006));
  fc.add(at(mesh(new THREE.BoxGeometry(0.002, 0.0008, 0.002), M.chip), -0.010, 0.0201, 0.006));
  fc.add(at(mesh(rboxGeo(0.009, 0.0032, 0.007, 0.001), M.steel), 0.0155, 0.0213, 0.009));
  for (const [x, z, ry] of [[-0.016, -0.004, Math.PI / 2], [-0.016, 0.006, Math.PI / 2], [0.004, -0.0165, 0], [-0.006, -0.0165, 0]]) { const c = mesh(new THREE.BoxGeometry(0.0075, 0.0035, 0.003), M.connector); c.rotation.y = ry; at(c, x, 0.0215, z); fc.add(c); }
  fc.add(at(mesh(new THREE.BoxGeometry(0.0012, 0.0006, 0.0012), M.ledBlue), 0.012, 0.02, -0.013));
  fc.add(at(mesh(new THREE.BoxGeometry(0.0012, 0.0006, 0.0012), M.ledGreen), 0.014, 0.02, -0.013));
  root.add(fc); reg(fc, 'fc', V3(0, 0.055, 0), { label: V3(0, 0.02, 0) });
  const buzzer = new THREE.Group(); at(buzzer, -0.011, 0.0227, 0.011);
  buzzer.add(mesh(cylGeo(0.006, 0.006, 0.006, 24), M.plasticBlack)); buzzer.add(at(mesh(cylGeo(0.0015, 0.0015, 0.0004, 12), M.chip), 0, 0.003, 0));
  root.add(buzzer); reg(buzzer, 'buzzer', V3(0, 0.075, 0));

  // --- 受信機 ---
  const rx = new THREE.Group();
  rx.add(at(mesh(rboxGeo(0.030, 0.008, 0.018, 0.0015), M.heatShrink), 0, 0.010, 0.050));
  for (const sx of [1, -1]) {
    rx.add(rw(mesh(tubeGeo([V3(sx * 0.006, 0.010, 0.059), V3(sx * 0.010, 0.008, 0.070), V3(sx * 0.014, 0.006, 0.076)], 0.0012, 20), M.wireBlack)));
    rx.add(tubeBetween(V3(sx * 0.014, 0.006, 0.076), V3(sx * 0.046, -0.022, 0.116), 0.0016, M.antennaWhite));
  }
  root.add(rx); reg(rx, 'rx', V3(0, 0, 0.08), { label: V3(0.04, -0.018, 0.11) });
  // --- 映像送信機 ---
  const vtx = new THREE.Group(); at(vtx, 0.040, 0.040, 0.046);
  vtx.add(at(mesh(rboxGeo(0.024, 0.006, 0.024, 0.002), M.heatShrink), 0, 0.003, 0));
  vtx.add(at(mesh(cylGeo(0.0032, 0.0032, 0.009, 16), M.alu), 0, 0.0105, 0));
  vtx.add(at(mesh(cylGeo(0.0025, 0.0025, 0.040, 16), M.plasticBlack), 0, 0.034, 0));
  const mush = mesh(new THREE.SphereGeometry(0.0085, 32, 20), M.plasticBlack); mush.scale.set(1, 0.62, 1); at(mush, 0, 0.056, 0); vtx.add(mush);
  const mushRing = mesh(new THREE.TorusGeometry(0.0062, 0.0008, 8, 32), M.aluOrange); mushRing.rotation.x = Math.PI / 2; at(mushRing, 0, 0.0525, 0); vtx.add(mushRing);
  root.add(vtx); reg(vtx, 'vtx', V3(0.03, 0.14, 0), { label: V3(0, 0.06, 0) });
  // --- GNSS ---
  const gps = new THREE.Group(); at(gps, -0.035, 0.040, 0.046);
  gps.add(at(mesh(rboxGeo(0.016, 0.006, 0.016, 0.002), M.aluDark), 0, 0.003, 0));
  gps.add(at(mesh(cylGeo(0.004, 0.004, 0.090, 24), M.carbonMast), 0, 0.051, 0));
  const puck = mesh(new THREE.LatheGeometry([[0, 0], [0.028, 0], [0.030, 0.002], [0.030, 0.010], [0.028, 0.013], [0.020, 0.0155], [0, 0.016]].map(p => new THREE.Vector2(p[0], p[1])), 64), M.gpsBody); at(puck, 0, 0.096, 0); gps.add(puck);
  const gtop = mesh(new THREE.CircleGeometry(0.019, 48), M.gpsTop, { cast: false }); gtop.rotation.x = -Math.PI / 2; at(gtop, 0, 0.1122, 0); gps.add(gtop);
  root.add(gps); reg(gps, 'gps', V3(0, 0.16, 0), { label: V3(0, 0.105, 0) });
  const gpsCable = rw(mesh(tubeGeo([V3(-0.030, 0.134, 0.046), V3(-0.030, 0.10, 0.046), V3(-0.030, 0.060, 0.045), V3(-0.030, 0.041, 0.036), V3(-0.024, 0.030, 0.026), V3(-0.018, 0.0215, 0.012)], 0.0014, 48), M.wireBlack));
  root.add(gpsCable); reg(gpsCable, 'wiring', V3(0, 0.0, 0));

  // --- バッテリー ---
  const bat = new THREE.Group(); at(bat, 0, -0.0235, 0.005);
  const shellMat = M.batteryShell.clone();
  const shell = mesh(rboxGeo(0.048, 0.045, 0.135, 0.004), shellMat); bat.add(shell);
  const lblTop = mesh(new THREE.PlaneGeometry(0.040, 0.100), M.batteryLabel, { cast: false }); lblTop.rotation.x = -Math.PI / 2; lblTop.rotation.z = Math.PI / 2; at(lblTop, 0, 0.02255, 0); bat.add(lblTop);
  const lblSide = mesh(new THREE.PlaneGeometry(0.100, 0.036), M.batteryLabel, { cast: false }); lblSide.rotation.y = Math.PI / 2; at(lblSide, 0.02405, 0, 0); bat.add(lblSide);
  const lblSide2 = mesh(new THREE.PlaneGeometry(0.100, 0.036), M.batteryLabel, { cast: false }); lblSide2.rotation.y = -Math.PI / 2; at(lblSide2, -0.02405, 0, 0); bat.add(lblSide2);
  const cells = new THREE.Group();
  for (let k = 0; k < 6; k++) cells.add(at(mesh(new THREE.BoxGeometry(0.0062, 0.040, 0.128), k % 2 ? M.cell : M.cell), -0.0175 + k * 0.007, 0, 0));
  bat.add(cells);
  root.add(bat);
  reg(cells, 'cells', V3(0, 0, 0));
  const batPart = reg(bat, 'battery', V3(0, -0.10, 0), { coarse: true, label: V3(0.024, 0.0, -0.05) }); batPart.shellMat = shellMat; batPart.shell = shell;
  // ストラップ ×2
  for (const z of [0.043, -0.033]) {
    const s = roundedRectPath(new THREE.Shape(), 0.054, 0.0525, 0.006, 0, -0.0215);
    s.holes.push(roundedRectPath(new THREE.Path(), 0.0505, 0.049, 0.0045, 0, -0.0215));
    const strap = mesh(new THREE.ExtrudeGeometry(s, { depth: 0.020, bevelEnabled: false, curveSegments: 8 }), M.strap); at(strap, 0, 0, z - 0.010);
    root.add(strap); reg(strap, 'strap', V3(0, -0.12, 0));
  }
  // XT60 + リード
  const xt = new THREE.Group();
  xt.add(at(mesh(rboxGeo(0.016, 0.009, 0.016, 0.001), M.xt60), 0.018, -0.016, -0.075));
  xt.add(rw(mesh(tubeGeo([V3(0.0155, -0.028, -0.0625), V3(0.0155, -0.026, -0.068), V3(0.0155, -0.019, -0.070), V3(0.0155, -0.016, -0.067)], 0.0019, 24), M.wireRed)));
  xt.add(rw(mesh(tubeGeo([V3(0.0205, -0.028, -0.0625), V3(0.0205, -0.026, -0.068), V3(0.0205, -0.019, -0.070), V3(0.0205, -0.016, -0.067)], 0.0019, 24), M.wireBlack)));
  root.add(xt); reg(xt, 'xt60', V3(0, -0.10, -0.02));
  const pig = new THREE.Group();
  pig.add(rw(mesh(tubeGeo([V3(0.0155, -0.016, -0.083), V3(0.0155, -0.010, -0.086), V3(0.0155, 0.002, -0.080), V3(0.0155, 0.0075, -0.055), V3(0.0150, 0.009, -0.020)], 0.0019, 40), M.wireRed)));
  pig.add(rw(mesh(tubeGeo([V3(0.0205, -0.016, -0.083), V3(0.0205, -0.010, -0.086), V3(0.0205, 0.002, -0.080), V3(0.0205, 0.0075, -0.055), V3(0.0110, 0.009, -0.018)], 0.0019, 40), M.wireBlack)));
  root.add(pig); reg(pig, 'wiring', V3(0, 0, 0));
  // バランスリード
  const bal = new THREE.Group();
  const balCols = [0x141416, 0x6b3a1e, 0xc2201e, 0xe8642a, 0xe0b000, 0x2a9d3a, 0x2a6be0];
  balCols.forEach((c, i) => bal.add(rw(mesh(tubeGeo([V3(-0.013 + i * 0.0012, -0.031, -0.0625), V3(-0.013 + i * 0.0012, -0.034, -0.068), V3(-0.013 + i * 0.0012, -0.037, -0.072)], 0.0005, 12), new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 })))));
  bal.add(at(mesh(new THREE.BoxGeometry(0.011, 0.005, 0.006), M.connector), -0.0094, -0.037, -0.0755));
  root.add(bal); reg(bal, 'balance', V3(0, -0.10, -0.01));

  // --- ジンバル + カメラ ---
  const gim = new THREE.Group(); at(gim, 0, 0, -0.085);
  gim.add(at(mesh(rboxGeo(0.050, 0.002, 0.040, 0.002), M.carbonPlate), 0, -0.011, 0));
  const yawM = mesh(cylGeo(0.014, 0.014, 0.016, 40), M.aluDark); at(yawM, 0, -0.021, 0); gim.add(yawM);
  gim.add(at(mesh(new THREE.TorusGeometry(0.0138, 0.0008, 8, 48).rotateX(Math.PI / 2), M.alu), 0, -0.029, 0));
  gim.add(at(mesh(rboxGeo(0.012, 0.005, 0.050, 0.0015), M.aluDark), 0, -0.0315, 0.024));
  gim.add(at(mesh(rboxGeo(0.012, 0.056, 0.005, 0.0015), M.aluDark), 0, -0.057, 0.048));
  const rollM = mesh(cylGeo(0.012, 0.012, 0.014, 40), M.aluDark); rollM.rotation.x = Math.PI / 2; at(rollM, 0, -0.085, 0.036); gim.add(rollM);
  gim.add(at(mesh(rboxGeo(0.040, 0.012, 0.005, 0.0015), M.aluDark), 0.017, -0.085, 0.0265));
  gim.add(at(mesh(rboxGeo(0.005, 0.012, 0.028, 0.0015), M.aluDark), 0.0345, -0.085, 0.010));
  const pitchM = mesh(cylGeo(0.011, 0.011, 0.012, 40), M.aluDark); pitchM.rotation.z = Math.PI / 2; at(pitchM, 0.024, -0.085, 0); gim.add(pitchM);
  gim.add(rw(mesh(tubeGeo([V3(0, -0.013, 0.012), V3(0.004, -0.02, 0.03), V3(0.004, -0.05, 0.044), V3(0.008, -0.075, 0.040), V3(0.030, -0.079, 0.026), V3(0.036, -0.079, 0.012)], 0.0012, 40), M.wireBlack)));
  root.add(gim); reg(gim, 'gimbal', V3(0, -0.20, -0.06), { label: V3(0.02, -0.05, 0.04) });
  const cam = new THREE.Group(); at(cam, 0, -0.085, -0.085);
  cam.add(mesh(rboxGeo(0.036, 0.030, 0.034, 0.003), M.plasticBlack));
  const lensRing = mesh(cylGeo(0.0105, 0.0105, 0.010, 40), M.lensRing); lensRing.rotation.x = Math.PI / 2; at(lensRing, 0, 0.001, -0.021); cam.add(lensRing);
  const lensGlass = mesh(cylGeo(0.0088, 0.0088, 0.002, 40), M.lens); lensGlass.rotation.x = Math.PI / 2; at(lensGlass, 0, 0.001, -0.0255); cam.add(lensGlass);
  cam.add(at(mesh(new THREE.SphereGeometry(0.0045, 24, 16), M.chip), 0, 0.001, -0.022));
  cam.add(at(mesh(new THREE.BoxGeometry(0.0012, 0.0006, 0.0012), M.ledRed), 0.012, 0.0153, 0.008));
  root.add(cam); reg(cam, 'camera', V3(0, -0.24, -0.10), { label: V3(0, -0.012, -0.02) });
  const dampers = new THREE.Group();
  for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) dampers.add(at(mesh(new THREE.SphereGeometry(0.0055, 24, 16), M.rubber), x * 0.018, -0.005, -0.085 + z * 0.012));
  root.add(dampers); reg(dampers, 'damper', V3(0, -0.10, -0.04));
  for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) screwList.push({ p: V3(x * 0.018, -0.0125, -0.085 + z * 0.012), flip: true });

  // --- 降着装置 ---
  for (const sx of [1, -1]) {
    const lg = new THREE.Group();
    for (const sz of [1, -1]) {
      lg.add(at(mesh(rboxGeo(0.016, 0.010, 0.016, 0.002), M.aluDark), sx * 0.055, -0.006, sz * 0.045));
      lg.add(tubeBetween(V3(sx * 0.055, -0.006, sz * 0.045), V3(sx * 0.112, -0.148, sz * 0.088), 0.005, M.carbonLeg));
      lg.add(at(mesh(new THREE.SphereGeometry(0.0085, 24, 16), M.aluDark), sx * 0.112, -0.148, sz * 0.088));
      for (const dz of [-0.005, 0.005]) screwList.push({ p: V3(sx * 0.055, -0.0115, sz * 0.045 + dz), flip: true });
    }
    const skid = mesh(cylGeo(0.006, 0.006, 0.27, 24), M.carbonLeg); skid.rotation.x = Math.PI / 2; at(skid, sx * 0.112, -0.150, 0); lg.add(skid);
    for (const sz of [1, -1]) { const cap = mesh(new THREE.CapsuleGeometry(0.0068, 0.014, 6, 16), M.rubber); cap.rotation.x = Math.PI / 2; at(cap, sx * 0.112, -0.150, sz * 0.138); lg.add(cap); }
    root.add(lg); reg(lg, 'landingGear', V3(sx * 0.08, -0.14, 0), { label: sx > 0 ? V3(0.112, -0.15, 0.10) : null });
  }

  // --- ネジ(インスタンス) ---
  const headGeo = cylGeo(0.0017, 0.0017, 0.0015, 16); const sockGeo = cylGeo(0.0008, 0.0008, 0.0003, 6);
  const heads = new THREE.InstancedMesh(headGeo, M.steel, screwList.length); const socks = new THREE.InstancedMesh(sockGeo, M.chip, screwList.length);
  heads.castShadow = true; heads.receiveShadow = true;
  const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), s1 = V3(1, 1, 1), tmp = V3();
  screwList.forEach((sc, i) => {
    q.setFromAxisAngle(V3(1, 0, 0), sc.flip ? Math.PI : 0);
    tmp.copy(sc.p).y += sc.flip ? -0.00075 : 0.00075; mtx.compose(tmp, q, s1); heads.setMatrixAt(i, mtx);
    tmp.y += sc.flip ? -0.0008 : 0.0008; mtx.compose(tmp, q, s1); socks.setMatrixAt(i, mtx);
  });
  socks.userData.noPick = true;
  const screws = new THREE.Group(); screws.add(heads, socks); root.add(screws); reg(screws, 'screws', V3(0, 0, 0));

  // --- 矢印(推力・回転方向) ---
  const arrows = { thrust: [], rot: [], move: null, yaw: null };
  motors.forEach(mo => {
    const th = arrowMesh(0xffffff, 0.06, 0.0035); th.position.set(0, 0.05, 0); th.visible = false; mo.group.add(th); arrows.thrust.push(th);
    const rot = rotationArc(mo.dir); rot.position.set(0, 0.058, 0); rot.visible = false; mo.group.add(rot); arrows.rot.push(rot);
  });
  const move = arrowMesh(0xef6a2d, 0.14, 0.005); move.visible = false; root.add(move); arrows.move = move;
  const yaw = rotationArc(-1, 0.20); yaw.position.set(0, 0.16, 0); yaw.visible = false; root.add(yaw); arrows.yaw = yaw;

  // 部品ラベル用アンカー(プロペラはM4ディスク上の点)
  const propPart = parts.find(p => p.key === 'prop' && p.idx === 3);
  if (propPart) propPart.labelObj = motors[3].part.propAnchor;

  return { root, parts, pick, wires, motors, arrows, batPart };
}
