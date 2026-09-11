// ===== ドローン本体の手続き生成 (v2: 実機構造に沿った造形) =====
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const UP = V3(0, 1, 0);
const CW_COLOR = 0x3b7df7, CCW_COLOR = 0x14b8a6;
const DEG = THREE.MathUtils.degToRad;

function mesh(geo, mat, { cast = true, recv = true } = {}) { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = recv; return m; }
const cylGeo = (rt, rb, h, seg = 32, open = false) => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open);
const rboxGeo = (w, h, d, r, seg = 2) => new RoundedBoxGeometry(w, h, d, seg, r);
function tubeGeo(points, r, seg = 48, radial = 10) { return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5), seg, r, radial, false); }
function tubeBetween(a, b, r, mat, seg = 20, hseg = 1) { const d = V3().subVectors(b, a); const len = d.length(); const m = mesh(new THREE.CylinderGeometry(r, r, len, seg, hseg), mat); m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(UP, d.normalize()); return m; }
function at(obj, x, y, z) { obj.position.set(x, y, z); return obj; }
function nonIndexed(g) { return g.index ? g.toNonIndexed() : g; }
function merged(geos) { return mergeGeometries(geos.map(nonIndexed), false); }
function lathe(pts, seg = 48) { return new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), seg); }
// 機械部品用: 断面の辺ごとに旋盤して結合 → 角が硬く、円周は滑らか(LatheGeometryの法線平均化を避ける)
function hardLathe(pts, seg = 48) { const parts = []; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; if (a[0] === b[0] && a[1] === b[1]) continue; parts.push(new THREE.LatheGeometry([new THREE.Vector2(a[0], a[1]), new THREE.Vector2(b[0], b[1])], seg).toNonIndexed()); } return mergeGeometries(parts, false); }

function roundedRectPath(P, w, h, r, cx = 0, cy = 0) {
  const x = cx - w / 2, y = cy - h / 2;
  P.moveTo(x + r, y); P.lineTo(x + w - r, y); P.quadraticCurveTo(x + w, y, x + w, y + r); P.lineTo(x + w, y + h - r);
  P.quadraticCurveTo(x + w, y + h, x + w - r, y + h); P.lineTo(x + r, y + h); P.quadraticCurveTo(x, y + h, x, y + h - r);
  P.lineTo(x, y + r); P.quadraticCurveTo(x, y, x + r, y); return P;
}
function polyShape(pts) { const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]); s.closePath(); return s; }
// 板: shape座標 (x, s) は world (x, -z)。押し出しは +Y。材質配列 [表裏, 側面]
function plateGeometry(w, h, r, holes, thickness, cy = 0) {
  const s = roundedRectPath(new THREE.Shape(), w, h, r, 0, cy);
  for (const ho of holes) {
    const p = new THREE.Path();
    if (ho.r) p.absarc(ho.x, ho.s, ho.r, 0, Math.PI * 2, false); else roundedRectPath(p, ho.w, ho.h, ho.rr || 0.002, ho.x, ho.s);
    s.holes.push(p);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: thickness, bevelEnabled: true, bevelThickness: 0.0002, bevelSize: 0.0002, bevelSegments: 1, curveSegments: 14 });
  g.rotateX(-Math.PI / 2);
  return g;
}
function annularSector(rIn, rOut, angle, depth) {
  const s = new THREE.Shape();
  s.absarc(0, 0, rOut, -angle / 2, angle / 2, false); s.absarc(0, 0, rIn, angle / 2, -angle / 2, true);
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 8 });
  g.rotateX(-Math.PI / 2); g.translate(0, -depth / 2, 0);
  return g;
}

// ---- プロペラ翼 ----
function propGeometry(dir, blades = [0, 1]) {
  const R = 0.152, r0 = 0.0105, pitch = 0.114, cmax = 0.027, nSpan = 44, nHalf = 12;
  const sec = [];
  for (let k = 0; k <= nHalf; k++) sec.push({ s: 0.5 * (1 - Math.cos(Math.PI * k / nHalf)), side: 1 });
  for (let k = nHalf - 1; k >= 1; k--) sec.push({ s: 0.5 * (1 - Math.cos(Math.PI * k / nHalf)), side: -1 });
  const nLoop = sec.length;
  const yt = s => 0.2969 * Math.sqrt(s) - 0.1260 * s - 0.3516 * s * s + 0.2843 * s ** 3 - 0.1015 * s ** 4;
  const chord = tau => tau < 0.35 ? 0.5 + 0.5 * (tau / 0.35) : Math.max(0.04, Math.sqrt(Math.max(0, 1 - Math.pow((tau - 0.35) / 0.66, 2))));
  const pos = [], uv = [], idx = [];
  for (const b of blades) {
    const rot = b * Math.PI, base = pos.length / 3;
    for (let i = 0; i <= nSpan; i++) {
      const tau = i / nSpan, r = r0 + (R - r0) * tau, c = cmax * chord(tau);
      const beta = Math.min(0.9, Math.atan(pitch / (2 * Math.PI * r)));
      const t = (tau < 0.08 ? 0.35 - 2.5 * tau : 0.15 - 0.10 * tau), m = 0.025 + 0.02 * tau;
      const sweep = -0.30 * c * tau * tau, droop = -0.003 * tau ** 3;
      const cb = Math.cos(beta), sb = Math.sin(beta);
      for (let j = 0; j <= nLoop; j++) {
        const p = sec[j % nLoop];
        const th = 5 * t * yt(p.s), cam = m * 4 * p.s * (1 - p.s);
        const xc = (p.s - 0.3) * c + sweep, yc = (p.side * th + cam) * c;
        let z = xc * cb + yc * sb; const y = -xc * sb + yc * cb + droop;
        if (dir < 0) z = -z;
        const X = r * Math.cos(rot) + z * Math.sin(rot), Z = -r * Math.sin(rot) + z * Math.cos(rot);
        pos.push(X, y, Z); uv.push(b + j / nLoop, tau);
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

// ---- モーター内部の共有ジオメトリ (2814 12N14P) ----
function motorGeometries() {
  const H = 0.014, teeth = [], coils = [], magnets = [];
  const tooth = new THREE.BoxGeometry(0.0055, H, 0.0030).translate(0.01025, 0, 0);
  const shoe = annularSector(0.0125, 0.0140, DEG(26), H);
  // 巻線: 歯を囲む角丸リング(Y-Z面)を径方向(X)に押し出す
  const outer = roundedRectPath(new THREE.Shape(), 0.0030 + 0.0032, H + 0.0032, 0.0018, 0, 0);
  outer.holes.push(roundedRectPath(new THREE.Path(), 0.0030, H, 0.0004, 0, 0));
  const coil = new THREE.ExtrudeGeometry(outer, { depth: 0.0044, bevelEnabled: true, bevelSize: 0.0006, bevelThickness: 0.0006, bevelSegments: 3, curveSegments: 6 });
  coil.rotateY(Math.PI / 2); coil.translate(0.0079, 0, 0);
  for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; teeth.push(tooth.clone().rotateY(a), shoe.clone().rotateY(a)); coils.push(coil.clone().rotateY(a)); }
  teeth.push(cylGeo(0.0079, 0.0079, H, 48));
  const mag = annularSector(0.0143, 0.0160, DEG(22.5), 0.015);
  for (let k = 0; k < 14; k++) magnets.push(mag.clone().rotateY(k * Math.PI * 2 / 14));
  // ベル: 肉厚のある缶 (壁1.5・天板は別・下端C0.5)
  const bellWall = hardLathe([[0.0160, 0.0], [0.0170, 0.0], [0.0175, 0.0005], [0.0175, 0.0245], [0.0160, 0.0245], [0.0160, 0.0]], 64);
  // 天面: 環 (r 7.5〜17.5) に6つの窓
  const top = new THREE.Shape(); top.absarc(0, 0, 0.0175, 0, Math.PI * 2, false);
  const inner = new THREE.Path(); inner.absarc(0, 0, 0.0075, 0, Math.PI * 2, true); top.holes.push(inner);
  for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + Math.PI / 6, hw = DEG(15); const w = new THREE.Path(); w.absarc(0, 0, 0.0155, a - hw, a + hw, false); w.absarc(0, 0, 0.0095, a + hw, a - hw, true); top.holes.push(w); }
  const bellTop = new THREE.ExtrudeGeometry(top, { depth: 0.002, bevelEnabled: false, curveSegments: 10 }); bellTop.rotateX(-Math.PI / 2);
  // ベアリング 684ZZ (4×9×4) とCクリップ
  const bearing = hardLathe([[0.0021, 0], [0.0045, 0], [0.0045, 0.004], [0.0021, 0.004], [0.0021, 0]], 32);
  const clip = annularSector(0.0016, 0.0032, DEG(300), 0.0006);
  // ハブ (内径6.4・二面幅)
  const hub = hardLathe([[0.0032, -0.0045], [0.011, -0.0045], [0.0125, -0.003], [0.0125, 0.003], [0.011, 0.0045], [0.0032, 0.0045]], 40);
  // ネジ頭 ISO7380 M3 ボタン (mm→m)
  const screwHead = hardLathe([[0, 0], [0.0024, 0], [0.00285, 0.0006], [0.00285, 0.0012], [0.0024, 0.00165], [0.0011, 0.00165], [0.0011, 0.0007], [0, 0.0007]], 24);
  const smallHead = hardLathe([[0, 0], [0.0018, 0], [0.0022, 0.0005], [0.0022, 0.001], [0.0018, 0.0013], [0.0008, 0.0013], [0.0008, 0.0005], [0, 0.0005]], 20);
  return { teeth: merged(teeth), coils: merged(coils), magnets: merged(magnets), bellWall, bellTop, bearing, clip, hub, screwHead, smallHead,
    propCCW: propGeometry(1), propCW: propGeometry(-1), bladeCCW: propGeometry(1, [0]), bladeCW: propGeometry(-1, [0]) };
}

function buildMotor(M, G, dir, reg) {
  const g = new THREE.Group(); g.name = 'motor';
  // ベース (十字の腕 + ベアリング筒)
  const base = new THREE.Group();
  const baseParts = [cylGeo(0.0105, 0.0105, 0.004).translate(0, 0.002, 0)];
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; baseParts.push(rboxGeo(0.021, 0.0032, 0.008, 0.0014).rotateY(-a).translate(Math.cos(a) * 0.0115, 0.0016, -Math.sin(a) * 0.0115)); }
  baseParts.push(hardLathe([[0.0046, 0.004], [0.0052, 0.004], [0.0052, 0.022], [0.0046, 0.022], [0.0046, 0.004]], 32));
  base.add(mesh(merged(baseParts), M.aluDark));
  g.add(base); reg(base, 'motorBase', V3(0, 0, 0));
  // ステーター (積層鉄心 + 歯 + シュー)
  const stator = at(mesh(G.teeth, M.lamination), 0, 0.013, 0); stator.castShadow = false; g.add(stator); reg(stator, 'stator', V3(0, 0.04, 0));
  const coils = at(mesh(G.coils, M.copper), 0, 0.013, 0); coils.castShadow = false; g.add(coils); reg(coils, 'winding', V3(0, 0.04, 0));
  // 磁石 (ベルと一体で分解)
  const mags = at(mesh(G.magnets, M.magnet), 0, 0.013, 0); mags.castShadow = false; g.add(mags); reg(mags, 'magnet', V3(0, 0.10, 0));
  // ベル
  const bell = new THREE.Group();
  bell.add(at(mesh(G.bellWall, M.bell), 0, 0.005, 0));
  bell.add(at(mesh(G.bellTop, dir > 0 ? M.bellTopCCW : M.bellTopCW), 0, 0.0295, 0));
  bell.add(at(mesh(cylGeo(0.0065, 0.0075, 0.0035), M.alu), 0, 0.0333, 0));
  g.add(bell); reg(bell, 'bell', V3(0, 0.10, 0));
  // シャフト + ベアリング2個 + Cクリップ
  const shaft = new THREE.Group();
  shaft.add(at(mesh(cylGeo(0.002, 0.002, 0.040, 16), M.steel), 0, 0.016, 0));
  shaft.add(at(mesh(G.bearing, M.steel), 0, 0.005, 0)); shaft.add(at(mesh(G.bearing, M.steel), 0, 0.017, 0));
  g.add(shaft); reg(shaft, 'shaft', V3(0, 0.10, 0));
  const clip = at(mesh(G.clip, M.steel), 0, -0.0025, 0); g.add(clip); reg(clip, 'shaft', V3(0, -0.02, 0));
  // プロペラアダプター (座 + M6スタッド)
  const adapter = new THREE.Group(); at(adapter, 0, 0.035, 0);
  adapter.add(at(mesh(cylGeo(0.007, 0.007, 0.003, 32), M.alu), 0, 0.0015, 0));
  adapter.add(at(mesh(cylGeo(0.003, 0.003, 0.017, 24), M.steelBlack), 0, 0.0115, 0));
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; adapter.add(at(mesh(G.smallHead, M.steelBlack), Math.cos(a) * 0.0055, 0.003, Math.sin(a) * 0.0055)); }
  g.add(adapter); reg(adapter, 'propAdapter', V3(0, 0.12, 0));
  // プロペラ(回転グループ): ハブ ±4.5mm, y=0.043
  const propG = new THREE.Group(); propG.name = 'prop'; at(propG, 0, 0.043, 0);
  const propMesh = mesh(dir > 0 ? G.propCCW : G.propCW, dir > 0 ? M.propCCW : M.propCW); propG.add(propMesh);
  propG.add(mesh(G.hub, M.propHub));
  // 残像用のゴースト翼 ×2 (ブラー帯域でだけ表示)
  const ghosts = [0, 1].map(() => { const gm = (dir > 0 ? M.propCCW : M.propCW).clone(); gm.transparent = true; gm.opacity = 0.35; gm.depthWrite = false;
    const gh = new THREE.Mesh(dir > 0 ? G.propCCW : G.propCW, gm); gh.visible = false; gh.userData.noPart = true; gh.userData.noPick = true; propG.add(gh); return gh; });
  g.add(propG);
  // ワッシャー + ナット (ナットは回転方向で色分け)
  const washer = mesh(new THREE.RingGeometry(0.0032, 0.006, 32), M.steel); washer.rotation.x = -Math.PI / 2; at(washer, 0, 0.0046, 0); washer.material = M.steel; propG.add(washer);
  const nut = new THREE.Group(); at(nut, 0, 0.0055, 0);
  const nutMat = new THREE.MeshPhysicalMaterial({ color: dir > 0 ? CCW_COLOR : CW_COLOR, metalness: 0.75, roughness: 0.40, anisotropy: 0.4 });
  nut.add(at(mesh(cylGeo(0.00577, 0.00577, 0.005, 6), nutMat), 0, 0.0025, 0));
  nut.add(at(mesh(cylGeo(0.0045, 0.0045, 0.0015, 24), M.plasticWhite), 0, 0.00575, 0));
  propG.add(nut); reg(nut, 'propNut', V3(0, 0.045, 0));
  reg(propG, 'prop', V3(0, 0.17, 0));
  // 回転ブラーディスク
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.156, 64), (dir > 0 ? M.propDiscCCW : M.propDiscCW).clone()); disc.rotation.x = -Math.PI / 2; disc.userData.noAO = true; at(disc, 0, 0.043, 0);
  disc.renderOrder = 5; disc.userData.noPart = true; disc.userData.noPick = true; g.add(disc);
  return { group: g, prop: propG, propMesh, ghosts, disc, bell, mags, shaft, adapter, dir, nutMat };
}

// ---- 矢印ヘルパー ----
function arrowMesh(color, len = 0.08, r = 0.0035) {
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.92 });
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(cylGeo(r, r, 1, 12), mat); shaft.position.y = 0.5; g.add(shaft);
  const head = new THREE.Mesh(new THREE.ConeGeometry(r * 2.6, r * 6, 16), mat); head.position.y = 1; g.add(head);
  g.userData.setLength = (L) => { shaft.scale.set(1, L, 1); shaft.position.y = L / 2; head.position.y = L + r * 3; };
  g.userData.setLength(len); g.userData.mat = mat; g.traverse(o => { o.userData.noPart = true; o.userData.noPick = true; });
  return g;
}
function rotationArc(dir, radius = 0.056) {
  const color = dir > 0 ? CCW_COLOR : CW_COLOR;
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 });
  const g = new THREE.Group(); const arcLen = Math.PI * 1.6;
  const torus = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.0022, 8, 64, arcLen), mat); torus.rotation.x = -Math.PI / 2; g.add(torus);
  const end = arcLen; const px = radius * Math.cos(end), pz = -radius * Math.sin(end);
  const tangent = V3(-Math.sin(end), 0, -Math.cos(end)).normalize();
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.0075, 0.018, 16), mat); cone.position.set(px, 0, pz); cone.quaternion.setFromUnitVectors(UP, tangent); g.add(cone);
  if (dir < 0) g.scale.z = -1;
  g.userData.mat = mat; g.traverse(o => { o.userData.noPart = true; o.userData.noPick = true; });
  return g;
}

// ---- 全体組み立て ----
function buildDrone(M) {
  const root = new THREE.Group(); root.name = 'drone';
  const parts = [], pick = [], wires = [], motors = [], legs = [];
  const G = motorGeometries();
  const idxCount = {};
  function reg(obj, key, explode, opts = {}) {
    const idx = (idxCount[key] = (idxCount[key] || 0) + 1) - 1;
    const p = { key, idx, obj, home: obj.position.clone(), homeQuat: obj.quaternion.clone(), explode: explode.clone(), meshes: [], coarse: !!opts.coarse, label: opts.label || null, hidden: false, anim: null };
    obj.userData.part = p;
    obj.traverse(m => { if (m.isMesh && !m.userData.noPart) { p.meshes.push(m); if (!m.userData.fine) m.userData.fine = p; if (opts.coarse) m.userData.coarse = p; if (!m.userData.noPick) pick.push(m); } });
    parts.push(p); return p;
  }
  const rw = (m) => { wires.push(m); m.userData.wire = true; return m; };
  const decal = (w, h, mat) => { const d = mesh(new THREE.PlaneGeometry(w, h), mat, { cast: false }); d.rotation.x = -Math.PI / 2; return d; };

  // --- プレート ---
  const clampD = [0.052, 0.088], clampSide = 0.0085;
  const armU = [V3(1, 0, -1).normalize(), V3(1, 0, 1).normalize(), V3(-1, 0, 1).normalize(), V3(-1, 0, -1).normalize()];
  const boltHoles = [];
  for (const u of armU) { const n = V3(-u.z, 0, u.x); for (const d of clampD) for (const s of [-1, 1]) boltHoles.push({ r: 0.0017, x: u.x * d + n.x * s * clampSide, s: -(u.z * d + n.z * s * clampSide) }); }
  const bottomHoles = [
    { w: 0.024, h: 0.0045, rr: 0.002, x: 0.0255, s: 0.038 }, { w: 0.024, h: 0.0045, rr: 0.002, x: -0.0255, s: 0.038 },
    { w: 0.024, h: 0.0045, rr: 0.002, x: 0.0255, s: -0.033 }, { w: 0.024, h: 0.0045, rr: 0.002, x: -0.0255, s: -0.033 },
    { r: 0.0045, x: 0.016, s: 0.072 }, ...boltHoles,
  ];
  const bottom = mesh(plateGeometry(0.150, 0.170, 0.018, bottomHoles, 0.0025, 0.010), [M.carbonPlate, M.carbonEdge]);
  root.add(bottom); reg(bottom, 'frameBottom', V3(0, -0.03, 0), { label: V3(-0.07, 0.0, -0.06) });
  const fcHoles = [[1, 1], [-1, 1], [1, -1], [-1, -1]].map(([x, z]) => ({ r: 0.0016, x: x * 0.01525, s: z * 0.01525 }));
  const topHoles = [{ w: 0.044, h: 0.044, rr: 0.006, x: 0, s: 0 }, { r: 0.0035, x: -0.03, s: -0.036 }, ...boltHoles, ...fcHoles];
  const top = at(mesh(plateGeometry(0.150, 0.150, 0.018, topHoles, 0.002), [M.carbonPlate, M.carbonEdge]), 0, 0.0375, 0);
  root.add(top); reg(top, 'frameTop', V3(0, 0.10, 0), { label: V3(0.05, 0.004, -0.045) });
  // 登録記号ラベル (上板後方)
  const regMark = at(decal(0.060, 0.012, M.regLabel), 0, 0.0398, 0.058); regMark.rotateZ(Math.PI); root.add(regMark); reg(regMark, 'regMark', V3(0, 0.10, 0));
  // スタンドオフ (黒アルマイト)
  const standoffs = new THREE.Group();
  const soPos = [[0.062, 0.025], [-0.062, 0.025], [0.062, -0.025], [-0.062, -0.025], [0.030, 0.062], [-0.030, 0.062], [0.030, -0.062], [-0.030, -0.062]];
  standoffs.add(mesh(merged(soPos.map(([x, z]) => cylGeo(0.0028, 0.0028, 0.035, 6).translate(x, 0.020, z))), M.aluDark));
  root.add(standoffs); reg(standoffs, 'standoff', V3(0, 0.05, 0));

  // --- アーム ×4 ---
  const ARMS = [
    { id: 'M1', u: armU[0], dir: 1, led: M.ledGreen, glow: 0x18ff4a },
    { id: 'M2', u: armU[1], dir: -1, led: M.ledWhite, glow: 0xffffff },
    { id: 'M3', u: armU[2], dir: 1, led: M.ledWhite, glow: 0xffffff },
    { id: 'M4', u: armU[3], dir: -1, led: M.ledRed, glow: 0xff2a1a },
  ];
  const screwGroups = []; // {list:[{p, axis}], parent, explode}
  const rootScrews = { top: [], bottom: [], gimbal: [], legs: [] };
  // クランプ断面: 幅24 × 高35、天面に配線の切欠き(7×5)、管穴φ16.2
  const clampShape = polyShape([[-0.012, 0], [0.012, 0], [0.012, 0.035], [0.0035, 0.035], [0.0035, 0.030], [-0.0035, 0.030], [-0.0035, 0.035], [-0.012, 0.035]]);
  clampShape.holes.push(new THREE.Path().absarc(0, 0.0175, 0.0081, 0, Math.PI * 2, true));
  const clampGeo = new THREE.ExtrudeGeometry(clampShape, { depth: 0.050, bevelEnabled: true, bevelSize: 0.0005, bevelThickness: 0.0005, bevelSegments: 2, curveSegments: 16 }); clampGeo.rotateY(Math.PI / 2);
  // モーターマウント: 上下2ピース + プレート(中央穴) + 管端キャップ
  const mountLower = rboxGeo(0.034, 0.0108, 0.026, 0.002), mountUpper = rboxGeo(0.034, 0.0108, 0.026, 0.002);
  const mountPlate = hardLathe([[0.006, 0], [0.019, 0], [0.019, 0.003], [0.006, 0.003], [0.006, 0]], 48);
  ARMS.forEach((A, k) => {
    const ag = new THREE.Group(); ag.name = 'arm' + A.id; ag.rotation.y = Math.atan2(-A.u.z, A.u.x); root.add(ag);
    const clamp = at(mesh(clampGeo, M.aluDark), 0.045, 0.0025, 0); ag.add(clamp); reg(clamp, 'armClamp', V3(0.06, 0, 0));
    const tube = mesh(cylGeo(0.008, 0.008, 0.245, 40), M.carbonArm); tube.rotation.z = -Math.PI / 2; at(tube, 0.1675, 0.020, 0); ag.add(tube);
    reg(tube, 'arm', V3(0.12, 0, 0), { label: k === 1 ? V3(0.0, 0.008, 0.0) : null });
    // アーム番号デカール
    const num = decal(0.012, 0.007, M.armNum[k]); num.rotation.z = -Math.PI / 2; at(num, 0.160, 0.0283, 0); ag.add(num); num.userData.noPart = true; num.userData.noPick = true;
    // ESC 48×21×7.5 + 放熱板 + 結束バンド2本
    const esc = new THREE.Group(); at(esc, 0.125, 0.0318, 0);
    esc.add(mesh(rboxGeo(0.048, 0.0075, 0.021, 0.0025), M.heatShrink));
    esc.add(at(mesh(new THREE.BoxGeometry(0.030, 0.0008, 0.016), M.aluBrushDark), 0.004, 0.0040, 0));
    esc.add(at(decal(0.026, 0.010, M.escLabel), -0.009, 0.0039, 0));
    for (const s of [-1, 1]) { const solder = mesh(new THREE.BoxGeometry(0.004, 0.0008, 0.012), M.solder); at(solder, s * 0.0235, 0.0005, 0); esc.add(solder); }
    ag.add(esc); reg(esc, 'esc', V3(0.06, 0.05, 0), { label: k === 2 ? V3(0, 0.004, 0) : null });
    for (const x of [0.108, 0.142]) { const zt = mesh(new THREE.TorusGeometry(0.0125, 0.0007, 6, 40), M.plasticBlack); zt.rotation.y = Math.PI / 2; zt.scale.set(1, 1.15, 1); at(zt, x - 0.125, -0.0118, 0); esc.add(zt);
      const head = at(mesh(rboxGeo(0.0045, 0.0025, 0.0035, 0.0005), M.plasticBlack), x - 0.125, -0.0118 + 0.0144, 0); esc.add(head); }
    // モーターマウント + LED
    const mount = new THREE.Group(); at(mount, 0.275, 0, 0);
    mount.add(at(mesh(mountLower, M.aluDark), 0, 0.0144, 0)); mount.add(at(mesh(mountUpper, M.aluDark), 0, 0.0256, 0));
    mount.add(at(mesh(mountPlate, M.aluDark), 0, 0.031, 0));
    mount.add(at(mesh(cylGeo(0.0082, 0.0082, 0.002, 24), M.plasticBlack), 0.018, 0.020, 0).rotateZ(Math.PI / 2));
    ag.add(mount); reg(mount, 'motorMount', V3(0.12, 0.02, 0));
    const led = new THREE.Group(); at(led, 0.2925, 0.0135, 0);
    led.add(at(mesh(new THREE.BoxGeometry(0.003, 0.010, 0.014), M.pcbEdge), 0.0015, 0, 0));
    led.add(at(mesh(new THREE.BoxGeometry(0.0012, 0.004, 0.004), A.led), 0.0036, 0, 0));
    { const cv = mesh(rboxGeo(0.0028, 0.0085, 0.012, 0.0012), M.ledCover); cv.userData.noAO = true; led.add(at(cv, 0.0044, 0, 0)); }
    const core = new THREE.Sprite(M.glowCore(A.glow)); core.scale.set(0.009, 0.009, 1); core.position.set(0.006, 0, 0); core.renderOrder = 6; led.add(core);
    const halo = new THREE.Sprite(M.glowHalo(A.glow)); halo.scale.set(0.022, 0.022, 1); halo.position.set(0.009, 0, 0); halo.renderOrder = 6; led.add(halo);
    ag.add(led); reg(led, 'led', V3(0.14, 0.02, 0), { label: k === 0 ? V3(0.004, 0, 0) : null });
    led.userData.halo = halo; led.userData.core = core; halo.userData.baseColor = halo.material.color.clone();
    // モーター
    const mo = buildMotor(M, G, A.dir, reg); mo.group.rotation.y = Math.PI / 4; at(mo.group, 0.275, 0.034, 0); ag.add(mo.group);
    const mp = reg(mo.group, 'motor', V3(0.12, 0.075, 0), { coarse: true, label: k === 0 ? V3(0, 0.02, 0) : null });
    mo.part = mp; mo.arm = ag; mo.id = A.id; mo.u = A.u; motors.push(mo);
    if (k === 3) { const anchor = new THREE.Object3D(); at(anchor, 0.10, 0.045, 0); mo.group.add(anchor); mp.propAnchor = anchor; }
    // 配線: 相線3本(ねじり+たるみ) 結束バンド付き
    const wg = new THREE.Group();
    const phase = [];
    for (let i = 0; i < 3; i++) {
      const pts = []; for (let n = 0; n <= 12; n++) { const t = n / 12, x = 0.149 + (0.262 - 0.149) * t; const th = x / 0.05 * Math.PI * 2 + i * Math.PI * 2 / 3;
        const sag = -0.0008 * Math.sin(Math.PI * ((x - 0.149) / 0.045 % 1)); pts.push(V3(x, 0.0295 + 0.0028 * Math.sin(th) + sag + (t > 0.9 ? (t - 0.9) * 0.05 : 0), 0.0028 * Math.cos(th))); }
      phase.push(tubeGeo(pts, 0.0012, 64, 10));
    }
    wg.add(rw(mesh(merged(phase), M.wireBlack)));
    for (const x of [0.175, 0.205, 0.235]) { const zt = mesh(new THREE.TorusGeometry(0.0096, 0.0006, 6, 32), M.plasticBlack); zt.rotation.y = Math.PI / 2; at(zt, x, 0.0205, 0); wg.add(zt);
      wg.add(at(mesh(rboxGeo(0.0035, 0.0022, 0.003, 0.0005), M.plasticBlack), x, 0.0205 + 0.0106, 0)); }
    // 電源線(赤/黒): ESC → クランプ切欠き → PDB
    const pw = (z, mat) => rw(mesh(tubeGeo([V3(0.101, 0.0318, z), V3(0.096, 0.0325, z * 0.6), V3(0.070, 0.0325, z * 0.5), V3(0.045, 0.0325, z * 0.5), V3(0.036, 0.024, z), V3(0.028, 0.012, z), V3(0.022, 0.0088, z)], 0.0017, 48), mat));
    wg.add(pw(0.0022, M.wireRed)); wg.add(pw(-0.0022, M.wireBlack));
    // 信号線(白黒2本撚り) ESC → FC
    const sig = []; for (let i = 0; i < 2; i++) { const pts = []; for (let n = 0; n <= 10; n++) { const t = n / 10; const x = 0.101 - (0.101 - 0.026) * t; const th = t * Math.PI * 6 + i * Math.PI; const y = 0.0335 - (t > 0.6 ? (t - 0.6) / 0.4 * 0.013 : 0); pts.push(V3(x, y + 0.0007 * Math.sin(th), 0.0035 + 0.0007 * Math.cos(th))); } sig.push(tubeGeo(pts, 0.0005, 40, 8)); }
    wg.add(rw(mesh(sig[0], M.wireWhite))); wg.add(rw(mesh(sig[1], M.wireBlack)));
    wg.add(at(mesh(new THREE.BoxGeometry(0.004, 0.003, 0.0035), M.connector), 0.024, 0.0215, 0.0035));
    ag.add(wg); reg(wg, 'wiring', V3(0.06, 0.02, 0));
    // ネジ: マウント側面ボルト(横向き) + モーター固定ボルト → アーム内でインスタンス化
    const armScrews = [];
    for (const x of [0.268, 0.282]) for (const s of [-1, 1]) armScrews.push({ p: V3(x, 0.020, s * 0.0132), axis: V3(0, 0, s) });
    for (let q = 0; q < 4; q++) { const a = q * Math.PI / 2 + Math.PI / 2; armScrews.push({ p: V3(0.275 + Math.cos(a) * 0.0165, 0.034 + 0.0033, -Math.sin(a) * 0.0165), axis: V3(0, 1, 0) }); }
    screwGroups.push({ list: armScrews, parent: ag, explode: V3(0.12, 0.05, 0) });
    // プレート締結ボルト (root座標) — 管の両脇
    const n = V3(-A.u.z, 0, A.u.x);
    for (const d of clampD) for (const s of [-1, 1]) { const px = A.u.x * d + n.x * s * clampSide, pz = A.u.z * d + n.z * s * clampSide;
      rootScrews.top.push({ p: V3(px, 0.0395, pz), axis: V3(0, 1, 0) }); rootScrews.bottom.push({ p: V3(px, -0.0002, pz), axis: V3(0, -1, 0) }); }
  });
  for (const [x, z] of soPos) { rootScrews.top.push({ p: V3(x, 0.0395, z), axis: V3(0, 1, 0) }); rootScrews.bottom.push({ p: V3(x, -0.0002, z), axis: V3(0, -1, 0) }); }

  // --- FCスタック ---
  const pcbMats = (top) => [M.pcbEdge, M.pcbEdge, top, M.pcbEdge, M.pcbEdge, M.pcbEdge];
  const pdb = new THREE.Group();
  pdb.add(at(mesh(new THREE.BoxGeometry(0.036, 0.0016, 0.036), pcbMats(M.pcbPDB)), 0, 0.0073, 0));
  pdb.add(at(mesh(merged([[1, 1], [-1, 1], [1, -1], [-1, -1]].map(([x, z]) => cylGeo(0.0025, 0.0025, 0.004, 12).translate(x * 0.01525, 0.0045, z * 0.01525))), M.plasticBlack), 0, 0, 0));
  for (const u of armU) { const s = mesh(new THREE.BoxGeometry(0.005, 0.0008, 0.006), M.solder); at(s, u.x * 0.0225, 0.0085, u.z * 0.0225); s.rotation.y = Math.atan2(-u.z, u.x); pdb.add(s); }
  root.add(pdb); reg(pdb, 'pdb', V3(0, 0.025, 0));
  const cap = new THREE.Group(); at(cap, 0.030, 0.0125, 0.0);
  const capBody = mesh(cylGeo(0.0065, 0.0065, 0.025, 24), M.plasticBlack); capBody.rotation.z = Math.PI / 2; cap.add(capBody);
  const capStripe = mesh(cylGeo(0.00655, 0.00655, 0.005, 24), M.plasticGray); capStripe.rotation.z = Math.PI / 2; at(capStripe, -0.007, 0, 0); cap.add(capStripe);
  const capTop = mesh(cylGeo(0.0062, 0.0062, 0.0006, 24), M.alu); capTop.rotation.z = Math.PI / 2; at(capTop, 0.0128, 0, 0); cap.add(capTop);
  cap.add(rw(mesh(tubeGeo([V3(-0.012, 0, 0.002), V3(-0.016, -0.003, 0.002), V3(-0.018, -0.0055, 0.004)], 0.0008, 12), M.wireRed)));
  cap.add(rw(mesh(tubeGeo([V3(-0.012, 0, -0.002), V3(-0.016, -0.003, -0.002), V3(-0.018, -0.0055, -0.004)], 0.0008, 12), M.wireBlack)));
  root.add(cap); reg(cap, 'capacitor', V3(0.02, 0.025, 0));
  const fc = new THREE.Group();
  fc.add(at(mesh(new THREE.BoxGeometry(0.036, 0.0016, 0.036), pcbMats(M.pcbFC)), 0, 0.0189, 0));
  fc.add(mesh(merged([[1, 1], [-1, 1], [1, -1], [-1, -1]].map(([x, z]) => cylGeo(0.0025, 0.0025, 0.010, 12).translate(x * 0.01525, 0.0131, z * 0.01525))), M.plasticBlack));
  fc.add(mesh(merged([[1, 1], [-1, 1], [1, -1], [-1, -1]].map(([x, z]) => new THREE.TorusGeometry(0.0024, 0.0009, 8, 20).rotateX(Math.PI / 2).translate(x * 0.01525, 0.0192, z * 0.01525))), M.rubber));
  fc.add(mesh(merged([new THREE.BoxGeometry(0.010, 0.0012, 0.010).translate(0.004, 0.0203, 0.003), new THREE.BoxGeometry(0.003, 0.0009, 0.003).translate(-0.008, 0.0202, -0.006), new THREE.BoxGeometry(0.002, 0.0008, 0.002).translate(-0.010, 0.0201, 0.006)]), M.chip));
  fc.add(at(mesh(rboxGeo(0.009, 0.0032, 0.0075, 0.001), M.steel), 0.0155, 0.0213, 0.009));
  fc.add(at(mesh(new THREE.BoxGeometry(0.012, 0.002, 0.011), M.steel), 0.0135, 0.0207, -0.008));
  fc.add(mesh(merged([[-0.016, -0.004, Math.PI / 2], [-0.016, 0.006, Math.PI / 2], [0.004, -0.0165, 0], [-0.006, -0.0165, 0]].map(([x, z, ry]) => new THREE.BoxGeometry(0.0075, 0.0035, 0.003).rotateY(ry).translate(x, 0.0215, z))), M.connector));
  fc.add(at(mesh(new THREE.BoxGeometry(0.0012, 0.0006, 0.0012), M.ledBlue), 0.012, 0.02, -0.013));
  fc.add(at(mesh(new THREE.BoxGeometry(0.0012, 0.0006, 0.0012), M.ledGreen), 0.014, 0.02, -0.013));
  root.add(fc); reg(fc, 'fc', V3(0, 0.055, 0), { label: V3(0, 0.02, 0) });
  // ブザー: 板の縁(後方スタンドオフの外側)
  const buzzer = new THREE.Group(); at(buzzer, -0.050, 0.010, 0.062);
  buzzer.add(mesh(cylGeo(0.006, 0.006, 0.006, 24), M.plasticBlack)); buzzer.add(at(mesh(cylGeo(0.0015, 0.0015, 0.0004, 12), M.chip), 0, 0.003, 0));
  root.add(buzzer); reg(buzzer, 'buzzer', V3(-0.03, 0.05, 0.03));

  // --- 受信機 (TPUホルダー + V字アンテナ) ---
  const rx = new THREE.Group();
  rx.add(at(mesh(rboxGeo(0.030, 0.008, 0.018, 0.0015), M.heatShrink), 0, 0.010, 0.050));
  for (const sx of [1, -1]) {
    rx.add(at(mesh(rboxGeo(0.008, 0.012, 0.008, 0.001), M.tpu), sx * 0.030, 0.020, 0.062));
    rx.add(rw(mesh(tubeGeo([V3(sx * 0.010, 0.010, 0.059), V3(sx * 0.020, 0.012, 0.064), V3(sx * 0.030, 0.018, 0.062)], 0.0007, 24), M.wireBlack)));
    const tip = V3(sx * 0.030 + sx * 0.028, 0.020 + 0.028, 0.062 + 0.006);
    rx.add(tubeBetween(V3(sx * 0.030, 0.024, 0.062), tip, 0.00125, M.antennaWhite));
  }
  root.add(rx); reg(rx, 'rx', V3(0, 0, 0.08), { label: V3(0.058, 0.048, 0.068) });
  // --- 映像送信機 ---
  const vtx = new THREE.Group(); at(vtx, 0.040, 0.040, 0.046);
  vtx.add(at(mesh(rboxGeo(0.024, 0.006, 0.024, 0.002), M.heatShrink), 0, 0.003, 0));
  vtx.add(at(mesh(cylGeo(0.0032, 0.0032, 0.009, 16), M.alu), 0, 0.0105, 0));
  vtx.add(at(mesh(cylGeo(0.0025, 0.0025, 0.040, 16), M.plasticBlack), 0, 0.034, 0));
  const mush = mesh(new THREE.SphereGeometry(0.0085, 32, 20), M.plasticBlack); mush.scale.set(1, 0.62, 1); at(mush, 0, 0.056, 0); vtx.add(mush);
  root.add(vtx); reg(vtx, 'vtx', V3(0.03, 0.14, 0), { label: V3(0, 0.06, 0) });
  // --- テレメトリー無線機 (上板後方左) ---
  const tele = new THREE.Group(); at(tele, -0.045, 0.040, 0.020);
  tele.add(at(mesh(rboxGeo(0.040, 0.010, 0.025, 0.002), M.plasticBlack), 0, 0.005, 0));
  tele.add(at(mesh(cylGeo(0.003, 0.003, 0.006, 16), M.alu), -0.016, 0.013, 0));
  tele.add(at(mesh(cylGeo(0.004, 0.004, 0.090, 16), M.plasticBlack), -0.016, 0.061, 0));
  root.add(tele); reg(tele, 'telemetry', V3(-0.03, 0.14, 0));
  // --- リモートID (上板前右) ---
  const rid = new THREE.Group(); at(rid, 0.045, 0.040, -0.030);
  rid.add(at(mesh(rboxGeo(0.030, 0.010, 0.020, 0.002), M.plasticGray), 0, 0.005, 0));
  rid.add(at(mesh(cylGeo(0.0015, 0.0015, 0.030, 12), M.plasticBlack), 0.012, 0.025, 0));
  rid.add(at(mesh(new THREE.BoxGeometry(0.0015, 0.0008, 0.0015), M.ledBlue), -0.010, 0.0104, -0.006));
  root.add(rid); reg(rid, 'remoteId', V3(0.02, 0.12, -0.02), { label: V3(0, 0.03, 0) });
  // --- GNSS ---
  const gps = new THREE.Group(); at(gps, -0.035, 0.040, 0.046);
  gps.add(at(mesh(rboxGeo(0.016, 0.006, 0.016, 0.002), M.aluDark), 0, 0.003, 0));
  gps.add(at(mesh(cylGeo(0.004, 0.004, 0.090, 24), M.carbonMast), 0, 0.051, 0));
  const puck = mesh(lathe([[0, 0], [0.028, 0], [0.030, 0.002], [0.030, 0.0068], [0.0303, 0.007], [0.030, 0.0072], [0.030, 0.010], [0.028, 0.013], [0.020, 0.0155], [0, 0.016]], 64), M.gpsBody); at(puck, 0, 0.096, 0); gps.add(puck);
  const gtop = mesh(new THREE.CircleGeometry(0.019, 48), M.gpsTop, { cast: false }); gtop.rotation.x = -Math.PI / 2; at(gtop, 0, 0.1122, 0); gps.add(gtop);
  root.add(gps); reg(gps, 'gps', V3(0, 0.16, 0), { label: V3(0, 0.105, 0) });
  const gpsCable = rw(mesh(tubeGeo([V3(-0.030, 0.134, 0.046), V3(-0.030, 0.10, 0.046), V3(-0.030, 0.060, 0.045), V3(-0.030, 0.041, 0.036), V3(-0.024, 0.030, 0.026), V3(-0.018, 0.0215, 0.012)], 0.0014, 48), M.wireBlack));
  root.add(gpsCable); reg(gpsCable, 'wiring', V3(0, 0.0, 0));

  // --- バッテリー (155×49×45) + トレイ ---
  const tray = new THREE.Group();
  tray.add(mesh(plateGeometry(0.060, 0.170, 0.004, [{ w: 0.024, h: 0.0045, rr: 0.002, x: 0.0255, s: 0.038 }, { w: 0.024, h: 0.0045, rr: 0.002, x: -0.0255, s: 0.038 }, { w: 0.024, h: 0.0045, rr: 0.002, x: 0.0255, s: -0.033 }, { w: 0.024, h: 0.0045, rr: 0.002, x: -0.0255, s: -0.033 }], 0.002, -0.005), [M.carbonPlate, M.carbonEdge]).translateY(-0.004));
  tray.add(at(mesh(rboxGeo(0.050, 0.003, 0.150, 0.001), M.rubber), 0, -0.0055, 0.005));
  root.add(tray); reg(tray, 'batteryTray', V3(0, -0.06, 0));
  const bat = new THREE.Group(); at(bat, 0, -0.0295, 0.005);
  const shellMat = M.batteryShell.clone();
  const shell = mesh(rboxGeo(0.049, 0.045, 0.155, 0.003), shellMat); bat.add(shell);
  const lblTop = decal(0.040, 0.110, M.batteryLabel); lblTop.rotation.z = Math.PI / 2; at(lblTop, 0, -0.0223, 0); lblTop.rotation.x = Math.PI / 2; bat.add(lblTop);
  const lblSide = mesh(new THREE.PlaneGeometry(0.110, 0.036), M.batteryLabel, { cast: false }); lblSide.rotation.y = Math.PI / 2; at(lblSide, 0.0248, 0, 0); bat.add(lblSide);
  const lblSide2 = mesh(new THREE.PlaneGeometry(0.110, 0.036), M.batteryLabel, { cast: false }); lblSide2.rotation.y = -Math.PI / 2; at(lblSide2, -0.0248, 0, 0); bat.add(lblSide2);
  const cells = mesh(merged(Array.from({ length: 6 }, (_, k) => new THREE.BoxGeometry(0.0062, 0.040, 0.148).translate(-0.0175 + k * 0.007, 0, 0))), M.cell); bat.add(cells);
  root.add(bat);
  reg(cells, 'cells', V3(0, 0, 0));
  const batPart = reg(bat, 'battery', V3(0, -0.10, 0), { coarse: true, label: V3(0.024, 0.0, -0.05) }); batPart.shellMat = shellMat; batPart.shell = shell;
  // ストラップ ×2 (ラダーロック + 重なり片)
  for (const z of [0.043, -0.033]) {
    const s = roundedRectPath(new THREE.Shape(), 0.055, 0.061, 0.006, 0, -0.0255);
    s.holes.push(roundedRectPath(new THREE.Path(), 0.0515, 0.0575, 0.0045, 0, -0.0255));
    const strap = new THREE.Group();
    strap.add(at(mesh(new THREE.ExtrudeGeometry(s, { depth: 0.020, bevelEnabled: false, curveSegments: 8 }), M.strap), 0, 0, z - 0.010));
    strap.add(at(mesh(rboxGeo(0.006, 0.022, 0.025, 0.001), M.plasticBlack), 0.0295, -0.026, z));
    strap.add(at(mesh(new THREE.BoxGeometry(0.0015, 0.020, 0.020), M.strap), 0.0285, -0.040, z));
    root.add(strap); reg(strap, 'strap', V3(0, -0.12, 0));
  }
  // XT60 + バッテリーリード / ピグテール(グロメット付きで下板を通る)
  const xt = new THREE.Group();
  xt.add(at(mesh(rboxGeo(0.016, 0.009, 0.016, 0.001), M.xt60), 0.018, -0.022, -0.086));
  xt.add(rw(mesh(tubeGeo([V3(0.0155, -0.034, -0.0725), V3(0.0155, -0.032, -0.078), V3(0.0155, -0.025, -0.081), V3(0.0155, -0.022, -0.078)], 0.0022, 24), M.wireRed)));
  xt.add(rw(mesh(tubeGeo([V3(0.0205, -0.034, -0.0725), V3(0.0205, -0.032, -0.078), V3(0.0205, -0.025, -0.081), V3(0.0205, -0.022, -0.078)], 0.0022, 24), M.wireBlack)));
  root.add(xt); reg(xt, 'xt60', V3(0, -0.10, -0.02));
  const pig = new THREE.Group();
  pig.add(rw(mesh(tubeGeo([V3(0.0155, -0.022, -0.094), V3(0.0155, -0.016, -0.098), V3(0.0155, -0.004, -0.094), V3(0.0155, -0.002, -0.072), V3(0.0155, 0.004, -0.070), V3(0.0155, 0.0075, -0.050), V3(0.0150, 0.009, -0.020)], 0.0022, 48), M.wireRed)));
  pig.add(rw(mesh(tubeGeo([V3(0.0205, -0.022, -0.094), V3(0.0205, -0.016, -0.098), V3(0.0205, -0.004, -0.094), V3(0.0165, -0.002, -0.072), V3(0.0165, 0.004, -0.070), V3(0.0170, 0.0075, -0.050), V3(0.0110, 0.009, -0.018)], 0.0022, 48), M.wireBlack)));
  const grommet = mesh(new THREE.TorusGeometry(0.0045, 0.0013, 8, 24), M.rubber); grommet.rotation.x = Math.PI / 2; at(grommet, 0.016, 0.0012, -0.072); pig.add(grommet);
  root.add(pig); reg(pig, 'wiring', V3(0, 0, 0));
  // バランスリード (バッテリー上面に沿う, 頂点色1材質)
  const bal = new THREE.Group();
  const balCols = [0x141416, 0x6b3a1e, 0xc2201e, 0xe8642a, 0xe0b000, 0x2a9d3a, 0x2a6be0];
  const balGeos = balCols.map((c, i) => { const g = tubeGeo([V3(-0.013 + i * 0.0012, -0.034, -0.0725), V3(-0.013 + i * 0.0012, -0.030, -0.079), V3(-0.013 + i * 0.0012, -0.0085, -0.079), V3(-0.010 + i * 0.0012, -0.0075, -0.060)], 0.0005, 24, 6); const col = new THREE.Color(c); const n = g.attributes.position.count; const arr = new Float32Array(n * 3); for (let k = 0; k < n; k++) { arr[k * 3] = col.r; arr[k * 3 + 1] = col.g; arr[k * 3 + 2] = col.b; } g.setAttribute('color', new THREE.BufferAttribute(arr, 3)); return g; });
  bal.add(rw(mesh(merged(balGeos), M.wireVertex)));
  bal.add(at(mesh(new THREE.BoxGeometry(0.0175, 0.00575, 0.007), M.connector), -0.0095, -0.0075, -0.055));
  root.add(bal); reg(bal, 'balance', V3(0, -0.10, -0.01));

  // --- ジンバル + カメラ ---
  const gim = new THREE.Group(); at(gim, 0, 0, -0.085);
  gim.add(at(mesh(rboxGeo(0.050, 0.002, 0.040, 0.002), [M.carbonPlate, M.carbonEdge]), 0, -0.011, 0));
  // 腕: コの字断面 (18×6, ポケット14×3.5) を押し出し
  const cShape = polyShape([[-0.009, 0], [0.009, 0], [0.009, 0.006], [0.007, 0.006], [0.007, 0.0025], [-0.007, 0.0025], [-0.007, 0.006], [-0.009, 0.006]]);
  const armGeo = (len) => { const g = new THREE.ExtrudeGeometry(cShape, { depth: len, bevelEnabled: true, bevelSize: 0.0004, bevelThickness: 0.0004, bevelSegments: 2 }); return g; };
  const boss = (r) => hardLathe([[0, 0], [r + 0.0015, 0], [r + 0.0015, 0.004], [0, 0.004]], 32);
  const yawM = mesh(cylGeo(0.014, 0.014, 0.016, 40), M.aluDark); at(yawM, 0, -0.021, 0); gim.add(yawM);
  gim.add(at(mesh(cylGeo(0.006, 0.006, 0.004, 24), M.plasticBlack), 0, -0.011, 0));
  gim.add(at(mesh(boss(0.014).rotateX(Math.PI), M.aluDark), 0, -0.029, 0));
  const a1 = mesh(armGeo(0.050), M.aluDark); a1.rotation.x = -Math.PI / 2; a1.rotation.z = Math.PI; at(a1, 0, -0.030, -0.001); gim.add(a1);
  const a2 = mesh(armGeo(0.056), M.aluDark); a2.rotation.z = -Math.PI / 2; a2.rotation.y = Math.PI / 2; at(a2, 0.003, -0.029, 0.048); gim.add(a2);
  const rollM = mesh(cylGeo(0.012, 0.012, 0.014, 40), M.aluDark); rollM.rotation.x = Math.PI / 2; at(rollM, 0, -0.085, 0.036); gim.add(rollM);
  const a3 = mesh(armGeo(0.040), M.aluDark); a3.rotation.z = Math.PI / 2; a3.rotation.y = -Math.PI / 2; at(a3, -0.003, -0.079, 0.0265); gim.add(a3);
  const a4 = mesh(armGeo(0.030), M.aluDark); a4.rotation.x = -Math.PI / 2; a4.rotation.z = -Math.PI / 2; at(a4, 0.0375, -0.085, 0.024); gim.add(a4);
  const pitchM = mesh(cylGeo(0.011, 0.011, 0.012, 40), M.aluDark); pitchM.rotation.z = Math.PI / 2; at(pitchM, 0.024, -0.085, 0); gim.add(pitchM);
  gim.add(rw(mesh(tubeGeo([V3(0, -0.013, 0.012), V3(0.004, -0.02, 0.03), V3(0.004, -0.05, 0.044), V3(0.008, -0.075, 0.040), V3(0.030, -0.079, 0.026), V3(0.036, -0.079, 0.012)], 0.0012, 40), M.wireBlack)));
  root.add(gim); reg(gim, 'gimbal', V3(0, -0.20, -0.06), { label: V3(0.02, -0.05, 0.04) });
  const cam = new THREE.Group(); at(cam, 0, -0.085, -0.085);
  cam.add(mesh(rboxGeo(0.036, 0.030, 0.034, 0.003), M.plasticBlack));
  const lensRing = mesh(cylGeo(0.0105, 0.0105, 0.010, 40), M.lensRing); lensRing.rotation.x = Math.PI / 2; at(lensRing, 0, 0.001, -0.021); cam.add(lensRing);
  const lensGlass = mesh(new THREE.SphereGeometry(0.0088, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), M.lens); lensGlass.scale.set(1, 0.28, 1); lensGlass.rotation.x = -Math.PI / 2; at(lensGlass, 0, 0.001, -0.0255); cam.add(lensGlass);
  cam.add(at(mesh(new THREE.SphereGeometry(0.0045, 24, 16), M.chip), 0, 0.001, -0.022));
  cam.add(at(mesh(new THREE.BoxGeometry(0.0012, 0.0006, 0.0012), M.ledRed), 0.012, 0.0153, 0.008));
  root.add(cam); reg(cam, 'camera', V3(0, -0.24, -0.10), { label: V3(0, -0.012, -0.02) });
  // 防振: 上板 + ゴムボール4個
  const dampers = new THREE.Group();
  dampers.add(at(mesh(rboxGeo(0.050, 0.002, 0.040, 0.002), [M.carbonPlate, M.carbonEdge]), 0, -0.001, -0.085));
  dampers.add(at(mesh(merged([[1, 1], [-1, 1], [1, -1], [-1, -1]].map(([x, z]) => new THREE.SphereGeometry(0.0055, 24, 16).translate(x * 0.018, 0, z * 0.012))), M.damper), 0, -0.006, -0.085));
  root.add(dampers); reg(dampers, 'damper', V3(0, -0.10, -0.04));
  for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) rootScrews.gimbal.push({ p: V3(x * 0.018, -0.0122, -0.085 + z * 0.012), axis: V3(0, -1, 0) });

  // --- 降着装置 (脚はピボット付き / Tジョイント / EVAスリーブ) ---
  for (const sx of [1, -1]) {
    const lg = new THREE.Group();
    const legPivots = [];
    for (const sz of [1, -1]) {
      const top = V3(sx * 0.055, -0.006, sz * 0.045), bot = V3(sx * 0.112, -0.148, sz * 0.088);
      lg.add(at(mesh(rboxGeo(0.016, 0.0048, 0.016, 0.002), M.aluDark), top.x, -0.0026, top.z)); lg.add(at(mesh(rboxGeo(0.016, 0.0048, 0.016, 0.002), M.aluDark), top.x, -0.0080, top.z));
      for (const dz of [-0.006, 0.006]) rootScrews.legs.push({ p: V3(top.x + sx * 0.0082, -0.0053, top.z + dz), axis: V3(sx, 0, 0) });
      const pivot = new THREE.Group(); at(pivot, top.x, top.y, top.z);
      const leg = tubeBetween(V3(), V3().subVectors(bot, top), 0.005, M.carbonLeg, 20, 12); pivot.add(leg);
      const joint = mesh(merged([cylGeo(0.0085, 0.0085, 0.022, 24).rotateX(Math.PI / 2), cylGeo(0.0075, 0.0075, 0.014, 24).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, V3().subVectors(top, bot).normalize())).translate(0, 0.006, 0)]), M.plasticBlack);
      joint.position.copy(V3().subVectors(bot, top)); pivot.add(joint);
      lg.add(pivot); legPivots.push({ pivot, sx, sz, leg });
    }
    const skid = mesh(cylGeo(0.006, 0.006, 0.27, 24), M.carbonLeg); skid.rotation.x = Math.PI / 2; at(skid, sx * 0.112, -0.150, 0); lg.add(skid);
    for (const sz of [1, -1]) { const sleeve = mesh(cylGeo(0.0085, 0.0085, 0.110, 24), M.rubber); sleeve.rotation.x = Math.PI / 2; at(sleeve, sx * 0.112, -0.150, sz * 0.060); lg.add(sleeve); }
    for (const sz of [1, -1]) { const cap = mesh(new THREE.CapsuleGeometry(0.0068, 0.014, 6, 16), M.rubber); cap.rotation.x = Math.PI / 2; at(cap, sx * 0.112, -0.150, sz * 0.138); lg.add(cap); }
    root.add(lg); reg(lg, 'landingGear', V3(sx * 0.08, -0.14, 0), { label: sx > 0 ? V3(0.112, -0.15, 0.10) : null });
    legs.push({ group: lg, sx, pivots: legPivots });
  }

  // --- ネジ (InstancedMesh をグループ単位で分解に追従させる) ---
  const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), s1 = V3(1, 1, 1), tmp = V3();
  const makeScrews = (list, parent, explode) => {
    const heads = new THREE.InstancedMesh(G.screwHead, M.steelBlack, list.length); heads.castShadow = true; heads.receiveShadow = true;
    list.forEach((sc, i) => { q.setFromUnitVectors(UP, sc.axis.clone().normalize()); tmp.copy(sc.p); mtx.compose(tmp, q, s1); heads.setMatrixAt(i, mtx); });
    const grp = new THREE.Group(); grp.add(heads); parent.add(grp); reg(grp, 'screws', explode); return grp;
  };
  makeScrews(rootScrews.top, root, V3(0, 0.13, 0)); makeScrews(rootScrews.bottom, root, V3(0, -0.05, 0));
  makeScrews(rootScrews.gimbal, root, V3(0, -0.13, -0.04)); makeScrews(rootScrews.legs, root, V3(0, -0.10, 0));
  for (const sg of screwGroups) makeScrews(sg.list, sg.parent, sg.explode);

  // --- 矢印(推力・回転方向) ---
  const arrows = { thrust: [], rot: [], move: null, yaw: null };
  motors.forEach(mo => {
    const th = arrowMesh(0xffffff, 0.06, 0.0035); th.position.set(0, 0.055, 0); th.visible = false; mo.group.add(th); arrows.thrust.push(th);
    const rot = rotationArc(mo.dir); rot.position.set(0, 0.062, 0); rot.visible = false; mo.group.add(rot); arrows.rot.push(rot);
  });
  const move = arrowMesh(0xef6a2d, 0.14, 0.005); move.visible = false; root.add(move); arrows.move = move;
  const yaw = rotationArc(-1, 0.20); yaw.position.set(0, 0.16, 0); yaw.visible = false; root.add(yaw); arrows.yaw = yaw;

  // 重心マーカー(パッケージ⑥): 白黒4分割の球。重さモード中だけ出す
  const cgMarker = new THREE.Group(); cgMarker.visible = false;
  { const r = 0.012, segs = 20;
    for (const [phi0, col] of [[0, 0x1b1f27], [Math.PI / 2, 0xf2f4f7]]) {
      for (const off of [0, Math.PI]) {
        const g = new THREE.SphereGeometry(r, segs, 12, phi0 + off, Math.PI / 2);
        const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: col, toneMapped: false, depthTest: false }));
        m.renderOrder = 8; m.userData.noPart = m.userData.noPick = m.userData.noAO = m.userData.noShadow = true; cgMarker.add(m);   // 機体に隠れないよう手前に描く
      }
    }
  }
  { // 床への垂線: 重心の前後ずれを床の上で読めるように
    const plumb = new THREE.Mesh(new THREE.CylinderGeometry(0.0008, 0.0008, 1, 6), new THREE.MeshBasicMaterial({ color: 0x1b1f27, transparent: true, opacity: 0.45, depthTest: false, toneMapped: false }));
    plumb.userData.noPart = plumb.userData.noPick = plumb.userData.noAO = plumb.userData.noShadow = true; plumb.renderOrder = 8; cgMarker.add(plumb); cgMarker.userData.plumb = plumb;
  }
  root.add(cgMarker);

  const propPart = parts.find(p => p.key === 'prop' && p.idx === 3);
  if (propPart) propPart.labelObj = motors[3].part.propAnchor;

  return { root, parts, pick, wires, motors, legs, arrows, batPart, G, cgMarker, personGroup: buildPerson() };
}

// ---- 大きさの目安になる人型 (パッケージ⑥。身長1.70m、機体の右 0.9m) ----
function buildPerson() {
  // 建築模型のスケールフィギュア: 身長1.70m・8頭身。頭→首→肩幅のある胴→テーパーした手足→関節球→足。
  // 手足はピボット付きの子グループにして、歩行(walk)と機体の方を向く(face)ができる。
  const g = new THREE.Group(); g.visible = false; g.position.set(-0.50, -0.158, -0.48);
  const mat = new THREE.MeshPhysicalMaterial({ color: 0x8e97a7, roughness: 0.52, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.45, sheen: 0.4, sheenRoughness: 0.6, sheenColor: new THREE.Color(0xdde3ee) });
  const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);
  const bone = (a, b, r1, r2, seg = 20) => { const A = V(a), B = V(b), len = A.distanceTo(B); const geo = new THREE.CylinderGeometry(r2, r1, len, seg, 1, false); geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize())); const m = A.clone().add(B).multiplyScalar(0.5); geo.translate(m.x, m.y, m.z); return geo; };
  const ball = (p, r, sx = 1, sy = 1, sz = 1) => { const geo = new THREE.SphereGeometry(r, 24, 16); geo.scale(sx, sy, sz); geo.translate(p[0], p[1], p[2]); return geo; };
  const meshOf = (geos, pivot) => { const geo = mergeGeometries(geos.map(x => x.toNonIndexed()), false); if (pivot) geo.translate(-pivot[0], -pivot[1], -pivot[2]); /* 元の滑らかな法線を保つ(再計算するとフラットになる) */ const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; m.userData.noPick = true; return m; };
  // 胴: 肩幅0.40・胸・腰のくびれ・骨盤。旋盤形を奥行き0.62に潰す
  const torso = new THREE.LatheGeometry([[0.06, 0.80], [0.165, 0.86], [0.175, 0.96], [0.14, 1.06], [0.135, 1.16], [0.16, 1.27], [0.20, 1.37], [0.195, 1.42], [0.10, 1.455], [0.0, 1.46]].map(q => new THREE.Vector2(q[0], q[1])), 40);
  torso.scale(1, 1, 0.62);
  const bodyGeos = [torso,
    bone([0, 1.44, 0], [0, 1.51, 0.012], 0.046, 0.040),                 // 首
    ball([0, 1.59, 0.012], 0.096, 0.92, 1.12, 1.0),                    // 頭 (top ≒ 1.70)
    ball([-0.185, 1.395, 0], 0.062, 1, 0.9, 0.8), ball([0.185, 1.395, 0], 0.062, 1, 0.9, 0.8),   // 肩
    ball([-0.095, 0.845, 0], 0.078, 1, 0.9, 0.85), ball([0.095, 0.845, 0], 0.078, 1, 0.9, 0.85), // 骨盤
  ];
  g.add(meshOf(bodyGeos));
  const limbs = {};
  for (const s of [-1, 1]) {
    // 腕: 肩→肘(やや後ろ・外)→手首(やや前)。肩をピボットに
    const sh = [s * 0.205, 1.395, 0], el = [s * 0.245, 1.11, -0.025], wr = [s * 0.235, 0.855, 0.045];
    const arm = meshOf([bone(sh, el, 0.052, 0.044), ball(el, 0.046), bone(el, wr, 0.044, 0.034), ball(wr, 0.036), ball([wr[0], wr[1] - 0.075, wr[2] + 0.01], 0.045, 0.7, 1.25, 0.5)], sh);
    arm.position.set(sh[0], sh[1], sh[2]); g.add(arm); limbs[s < 0 ? 'armL' : 'armR'] = arm;
    // 脚: 股→膝→足首、足は前(−z)へ
    const hp = [s * 0.095, 0.845, 0], kn = [s * 0.10, 0.47, 0.01], an = [s * 0.10, 0.095, 0];
    const foot = rboxGeo(0.095, 0.065, 0.25, 0.028); foot.translate(an[0], 0.033, an[2] - 0.06);
    const leg = meshOf([bone(hp, kn, 0.088, 0.066), ball(kn, 0.066), bone(kn, an, 0.064, 0.046), ball(an, 0.046), foot], hp);
    leg.position.set(hp[0], hp[1], hp[2]); g.add(leg); limbs[s < 0 ? 'legL' : 'legR'] = leg;
  }
  // 立ち姿: 腕を少し外へ、頭は真っすぐ
  limbs.armL.rotation.z = 0.08; limbs.armR.rotation.z = -0.08;
  g.userData.limbs = limbs;
  g.userData.walk = (t, amp = 1) => {   // 歩行: 脚±26°・腕は逆位相±16°、t は秒
    const w = 2 * Math.PI * 1.6 * t, a = 0.45 * amp, b = 0.28 * amp;
    limbs.legL.rotation.x = a * Math.sin(w); limbs.legR.rotation.x = -a * Math.sin(w);
    limbs.armL.rotation.x = -b * Math.sin(w); limbs.armR.rotation.x = b * Math.sin(w);
  };
  g.userData.rest = () => { for (const k of ['legL', 'legR', 'armL', 'armR']) limbs[k].rotation.x = 0; };
  g.userData.face = (x, z) => { g.rotation.y = Math.atan2(-(x - g.position.x), -(z - g.position.z)); };   // 足先(−z)を目標へ
  g.userData.face(0, 0);
  return g;
}

// ---- 用途モードの追加部品 (半透明の概念シルエット) ----
function buildGhost(def, mat) {
  let geo;
  if (def.shape === 'box') geo = rboxGeo(def.size[0], def.size[1], def.size[2], Math.min(def.size[0], def.size[1], def.size[2]) * 0.12);
  else if (def.shape === 'cyl') geo = cylGeo(def.size[0], def.size[0], def.size[1], 32);
  else if (def.shape === 'ring') { geo = new THREE.TorusGeometry(def.size[0], def.size[1], 8, 64); geo.rotateX(Math.PI / 2); }
  const m = new THREE.Mesh(geo, mat); m.position.set(def.pos[0], def.pos[1], def.pos[2]); m.userData.ghost = def; m.userData.noPart = true; m.castShadow = false;
  return m;
}
