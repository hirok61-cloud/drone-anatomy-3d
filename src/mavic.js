// ===== DJI Mavic 4 Pro の手続き生成 =====
// 寸法は実寸(m)・等倍。公式値: 展開 328.7×390.5×135.2mm・折りたたみ 257.6×124.8×103.4mm（プロペラなし）。
// プロペラは販売店の表記で直径10.5インチ。形は公式の真上・正面・斜めの製品写真と、取説の各部名称・背面図から読んだ推定値。
// 機首=−Z、右=+X。脚の先と後ろのゴム足(y=−0.041)が床に来るよう、入れ物ごと下げる。
function mavicMaterials(M) {
  const phy = (o) => new THREE.MeshPhysicalMaterial(o), std = (o) => new THREE.MeshStandardMaterial(o);
  const decal = (c) => std({ map: canvasTex(c, { wrap: false }), roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const decalT = (c) => std({ map: canvasTex(c, { wrap: false }), roughness: 0.6, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });   // 背景が透ける印字
  const sans = '-apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif';
  const propCanvas = (dir) => pd6bCanvas(256, 1024, (g, w, h) => {
    g.fillStyle = '#18191c'; g.fillRect(0, 0, w, h);   /* 黒い羽根の先がオレンジ（公式写真） */
    g.fillStyle = 'rgba(255,255,255,0.04)'; for (let y = 0; y < h; y += 6) g.fillRect(0, y, w, 1);
    g.fillStyle = '#f0821e'; g.fillRect(0, 0, w, h * 0.038);   /* キャンバスの上端＝羽根の先（CanvasTexture は上下が反転して v=1 が上端） */
    g.fillStyle = dir > 0 ? '#9aa0a8' : '#18191c'; g.beginPath(); g.arc(w * 0.5, h * 0.12, w * 0.10, 0, Math.PI * 2); g.fill();   /* 根元の印（取付の組み合わせ・図の例） */
  });
  const propMat = (dir) => Object.assign(phy({ map: canvasTex(propCanvas(dir), { wrap: false }), roughness: 0.55, metalness: 0, clearcoat: 0.3, clearcoatRoughness: 0.4, side: THREE.DoubleSide }), { userData: { flatTint: true } });
  const regLabel = pd6bCanvas(512, 96, (g, w, h) => { g.fillStyle = '#f4f4f2'; g.fillRect(0, 0, w, h); g.fillStyle = '#17181b'; g.font = 'bold 60px "SF Mono", Menlo, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('JU 1234 5678', w / 2, h / 2 + 2); });
  const hasselblad = pd6bCanvas(512, 72, (g, w, h) => { g.fillStyle = '#121418'; g.fillRect(0, 0, w, h); g.fillStyle = '#c9ccd2'; g.font = `500 46px ${sans}`; g.textAlign = 'center'; g.textBaseline = 'middle'; if ('letterSpacing' in g) g.letterSpacing = '9px'; g.fillText('HASSELBLAD', w / 2, h / 2 + 2); });
  const djiLogo = pd6bCanvas(256, 112, (g, w, h) => { g.fillStyle = '#8c9097'; g.font = `italic 700 92px ${sans}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('dji', w / 2, h / 2 + 4); });
  const brand = pd6bCanvas(512, 72, (g, w, h) => { g.fillStyle = '#b9bdc4'; g.font = `500 50px ${sans}`; g.textAlign = 'center'; g.textBaseline = 'middle'; if ('letterSpacing' in g) g.letterSpacing = '4px'; g.fillText('MAVIC 4 PRO', w / 2, h / 2 + 2); });
  return {
    shell: phy({ color: 0x63666c, metalness: 0.08, roughness: 0.58, clearcoat: 0.18, clearcoatRoughness: 0.5 }),   /* 艶を抑えた中間のグレー（製品写真） */
    belly: phy({ color: 0x25272b, metalness: 0.05, roughness: 0.72 }),
    shellDark: phy({ color: 0x232529, metalness: 0.1, roughness: 0.52, clearcoat: 0.3, clearcoatRoughness: 0.4 }),
    shellLight: phy({ color: 0x5a5e66, metalness: 0.2, roughness: 0.38, clearcoat: 0.5, clearcoatRoughness: 0.25 }),
    glass: phy({ color: 0x07090d, roughness: 0.05, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, iridescence: 0.6, iridescenceIOR: 1.3 }),
    lensRing: phy({ color: 0x1d1f23, metalness: 0.8, roughness: 0.3 }),
    goldRing: phy({ color: 0xb08d57, metalness: 1, roughness: 0.3 }),
    bezel: phy({ color: 0x121418, metalness: 0.2, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08 }),
    lensBack: new THREE.MeshBasicMaterial({ color: 0x020305 }),
    window: phy({ color: 0x060708, metalness: 0.3, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.06 }),
    lensClear: phy({ color: 0x0b1020, metalness: 0, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.03, iridescence: 0.5, iridescenceIOR: 1.35, transparent: true, opacity: 0.26, depthWrite: false, envMapIntensity: 0.6 }),
    iris: phy({ color: 0x8d929c, metalness: 0.7, roughness: 0.32, side: THREE.DoubleSide }),
    hasselblad: decal(hasselblad),
    propCCW: propMat(1), propCW: propMat(-1),
    regLabel: decal(regLabel), brand: decalT(brand), djiLogo: decalT(djiLogo),
    fovMain: new THREE.MeshBasicMaterial({ color: 0xef6a2d, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }),
    fovMid: new THREE.MeshBasicMaterial({ color: 0x3b7df7, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }),
    fovTele: new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }),
    sense: new THREE.MeshBasicMaterial({ color: 0x14b8a6, transparent: true, opacity: 0.10, depthWrite: false, side: THREE.DoubleSide }),
    senseLine: new THREE.MeshBasicMaterial({ color: 0x14b8a6, transparent: true, opacity: 0.55 }),
    lidarBeam: new THREE.MeshBasicMaterial({ color: 0xef6a2d, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }),
    irBeam: new THREE.MeshBasicMaterial({ color: 0xa06cf5, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }),
  };
}

function buildMavic(M) {
  const K = MAVIC_K, LEG_Y = -0.051;   // 脚の先と後ろのゴム足の高さ（胴の中心から）
  const root = new THREE.Group(); root.name = 'drone';
  const sg = new THREE.Group(); sg.name = 'mavic'; sg.scale.setScalar(K); sg.position.y = -0.158 - LEG_Y * K; root.add(sg);
  const parts = [], pick = [], wires = [], motors = [], legs = [];
  const G = motorGeometries(), X = mavicMaterials(M);
  const idxCount = {};
  function reg(obj, key, explode, opts = {}) {
    const idx = (idxCount[key] = (idxCount[key] || 0) + 1) - 1;
    const p = { key, idx, obj, home: obj.position.clone(), homeQuat: obj.quaternion.clone(), explode: explode.clone(), meshes: [], coarse: !!opts.coarse, label: opts.label || null, hidden: false, anim: null };
    obj.userData.part = p;
    obj.traverse(m => { if (m.isMesh && !m.userData.noPart) { p.meshes.push(m); if (!m.userData.fine) m.userData.fine = p; if (opts.coarse) m.userData.coarse = p; if (!m.userData.noPick) pick.push(m); } });
    parts.push(p); return p;
  }
  const noPart = (o) => { o.traverse(c => { c.userData.noPart = true; c.userData.noPick = true; c.userData.noAO = true; c.castShadow = false; }); return o; };
  const plane = (w, h, mat) => mesh(new THREE.PlaneGeometry(w, h), mat, { cast: false });

  // ---------- 胴 (断面をつないだ流線形。寸法は公式の真上・正面の写真から読んだ値) ----------
  // 断面は [z, 半幅, 上端, 下端, 上の丸み, 下の丸み]。丸みは超楕円の指数(2=楕円・大きいほど角ばる)
  // 前は頭(ジンバル)を抱える幅広の面、腰で少し細り、後ろはバッテリーの下で広がって丸く閉じる
  const UPPER = [
    [-0.1010, 0.016, 0.026, 0.000, 2.2, 2.2], [-0.0975, 0.033, 0.0300, -0.012, 2.3, 2.4], [-0.0920, 0.0395, 0.0330, -0.022, 2.4, 2.4],
    [-0.0800, 0.0430, 0.0350, -0.034, 2.5, 2.4], [-0.0600, 0.0440, 0.0358, -0.0385, 2.6, 2.5], [-0.0400, 0.0415, 0.0362, -0.0400, 2.6, 2.5],
    [-0.0270, 0.0395, 0.0365, -0.0400, 2.6, 2.5], [-0.0215, 0.0385, 0.0366, 0.0010, 2.6, 6.0], [0.0000, 0.0370, 0.0368, 0.0020, 2.6, 8.0],
    [0.0300, 0.0390, 0.0375, 0.0020, 2.6, 8.0], [0.0520, 0.0430, 0.0378, 0.0020, 2.6, 8.0], [0.0760, 0.0420, 0.0368, 0.0020, 2.6, 8.0],
    [0.0900, 0.0380, 0.0340, 0.0020, 2.5, 8.0], [0.0980, 0.0300, 0.0285, 0.0025, 2.4, 6.0], [0.1020, 0.0160, 0.0185, 0.0040, 2.3, 4.0], [0.1032, 0.0040, 0.0100, 0.0060, 2.2, 2.2],
  ];
  const BATT = [
    [-0.0272, 0.0273, 0.0005, -0.032, 6, 2.2], [-0.024, 0.0356, 0.0015, -0.039, 8, 2.3], [0, 0.0359, 0.0015, -0.04, 8, 2.4],
    [0.052, 0.0414, 0.0015, -0.04, 8, 2.4], [0.076, 0.0405, 0.0015, -0.04, 8, 2.4], [0.09, 0.0369, 0.0015, -0.039, 8, 2.4],
    [0.098, 0.0297, 0.0015, -0.035, 8, 2.3], [0.102, 0.0175, 0.0005, -0.026, 6, 2.2], [0.1032, 0.0049, -0.003, -0.018, 2.4, 2.2],
  ];
  // 断面の補間（Catmull-Rom）。部品を胴の面に置くときにも使う
  const crs = (S, u) => { const n = S.length - 1, i = Math.min(n - 1, Math.max(0, Math.floor(u))), t = u - i;
    const p0 = S[Math.max(0, i - 1)], p1 = S[i], p2 = S[i + 1], p3 = S[Math.min(n, i + 2)];
    return p1.map((_, k) => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t * t + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t * t * t)); };
  const secAt = (S, z) => { for (let i = 0; i < S.length - 1; i++) if (z <= S[i + 1][0]) { const t = (z - S[i][0]) / (S[i + 1][0] - S[i][0]); return crs(S, i + clamp(t, 0, 1)); } return S[S.length - 1].slice(); };
  // 超楕円の断面の輪郭上の点（a: 0=右, π/2=上）
  const ring = (sec, a) => { const [, w, top, bot, nt, nb] = sec, c = Math.cos(a), s = Math.sin(a), mid = (top + bot) / 2;
    const n = s >= 0 ? nt : nb, x = w * Math.sign(c) * Math.abs(c) ** (2 / n), y = s >= 0 ? mid + (top - mid) * Math.abs(s) ** (2 / n) : mid - (mid - bot) * Math.abs(s) ** (2 / n); return [x, y]; };
  function loftGeo(S, sub = 6, around = 64) {
    const rings = [], N = (S.length - 1) * sub;
    for (let k = 0; k <= N; k++) rings.push(crs(S, k / sub));
    const pos = [], idx = [];
    for (const r of rings) for (let j = 0; j < around; j++) { const [x, y] = ring(r, j / around * Math.PI * 2); pos.push(x, y, r[0]); }
    const R = rings.length;
    for (let k = 0; k < R - 1; k++) for (let j = 0; j < around; j++) { const a = k * around + j, b = k * around + (j + 1) % around, c = a + around, d = b + around; idx.push(a, b, c, b, d, c); }
    const cap = (k, flip) => { const r = rings[k], ci = pos.length / 3; pos.push(0, (r[2] + r[3]) / 2, r[0] + (flip ? 0.0006 : -0.0006)); for (let j = 0; j < around; j++) { const a = k * around + j, b = k * around + (j + 1) % around; if (flip) idx.push(ci, a, b); else idx.push(ci, b, a); } };
    cap(0, false); cap(R - 1, true);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
  }
  // 胴の表面の点（z と角度で指定）と、その向き
  const onBody = (S, z, a, lift = 0) => { const s = secAt(S, z), [x, y] = ring(s, a), [x2, y2] = ring(s, a + 0.01), nx = y2 - y, ny = -(x2 - x), l = Math.hypot(nx, ny) || 1; return { p: V3(x + nx / l * lift, y + ny / l * lift, z), n: V3(nx / l, ny / l, 0) }; };

  const bodyG = new THREE.Group();
  bodyG.add(mesh(loftGeo(UPPER), X.shell));
  // 上面: 前の魚眼2基の台・中央の魚眼・dji のロゴ・後ろの排気口
  { const vent = new THREE.Group(), vz = 0.084, s = secAt(UPPER, vz);
    vent.add(at(mesh(rboxGeo(0.036, 0.004, 0.012, 0.0018), X.shellDark), 0, s[2] - 0.0012, vz));
    for (let k = 0; k < 9; k++) vent.add(at(mesh(new THREE.BoxGeometry(0.0016, 0.0022, 0.009), X.shell), -0.0144 + k * 0.0036, s[2] + 0.0004, vz));
    bodyG.add(vent); }
  { const t = plane(0.016, 0.0072, X.djiLogo); t.rotation.x = -Math.PI / 2; at(t, 0, secAt(UPPER, 0.052)[2] + 0.0004, 0.052); bodyG.add(t); }
  // 下面の前: 下向きの魚眼の間に3D赤外線の窓、その後ろに細長い窓
  bodyG.add(at(mesh(rboxGeo(0.010, 0.002, 0.004, 0.0009), X.shellDark), 0, -0.0402, -0.050));
  // 底のセンサー板（黒・ひだ付き）。バッテリーはこの板と胴の上側の間に後ろから差し込む
  const plate = new THREE.Group();
  plate.add(at(mesh(rboxGeo(0.048, 0.0066, 0.122, 0.0028, 3), X.belly), 0, -0.0432, 0.031));
  for (let k = 0; k < 14; k++) for (const s of [-1, 1]) plate.add(at(mesh(new THREE.BoxGeometry(0.010, 0.0012, 0.0024), X.shellDark), s * 0.0165, -0.0468, -0.012 + k * 0.0066));
  for (const s of [-1, 1]) plate.add(at(mesh(cylGeo(0.0038, 0.0042, 0.0016, 16), M.rubber), s * 0.022, -0.0499, 0.078));   // 後ろの足（ゴム）
  bodyG.add(plate);
  sg.add(bodyG); reg(bodyG, 'body', V3(0, 0, 0), { label: V3(-0.03, 0.036, 0.02) });
  const rm = plane(0.030, 0.0058, X.regLabel); rm.rotation.y = -Math.PI / 2; { const q = onBody(UPPER, 0.040, Math.PI * 0.98, 0.0004); at(rm, q.p.x, 0.016, 0.040); } sg.add(rm); reg(rm, 'regMark', V3(-0.04, 0, 0));
  // 後面の上: USB-C と microSD（バッテリーの上・排気口の下）
  const ports = new THREE.Group();
  ports.add(at(mesh(rboxGeo(0.010, 0.0034, 0.002, 0.0012), M.chip), -0.008, 0.012, 0.1022));
  ports.add(at(mesh(rboxGeo(0.012, 0.0022, 0.002, 0.0008), M.chip), 0.008, 0.012, 0.1022));
  sg.add(ports); reg(ports, 'ports', V3(0, 0.02, 0.05), { label: V3(0, 0.012, 0.103) });

  // ---------- バッテリー (胴の下半分・後ろへ抜く) ----------
  const bat = new THREE.Group();
  const shell = mesh(loftGeo(BATT), X.shell); bat.add(shell);
  const cells = mesh(merged(Array.from({ length: 4 }, (_, k) => new THREE.BoxGeometry(0.0128, 0.024, 0.100).translate(-0.0201 + k * 0.0134, -0.0180, 0.038))), M.cell); bat.add(cells);
  const bled = new THREE.Group();   // 後面: 電源ボタンと残量LED 4つ（取説）
  bled.add(at(mesh(rboxGeo(0.0085, 0.0040, 0.0016, 0.0014), M.plasticGray), -0.0055, -0.0170, 0.1028));
  for (let k = 0; k < 4; k++) bled.add(at(mesh(new THREE.CylinderGeometry(0.0007, 0.0007, 0.001, 10).rotateX(Math.PI / 2), k < 3 ? M.ledGreen : M.chip), 0.0018 + k * 0.0026, -0.0170, 0.1024));
  bat.add(bled);
  const buckle = new THREE.Group();   // 左右のバックル（後ろ下の側面）
  for (const s of [-1, 1]) { const q = onBody(BATT, 0.070, s > 0 ? -0.35 : Math.PI + 0.35, 0.0006); const b = mesh(rboxGeo(0.0026, 0.010, 0.016, 0.0011), X.shellDark); at(b, q.p.x, q.p.y, 0.070); b.rotation.z = s * 0.35; buckle.add(b); }
  bat.add(buckle);
  sg.add(bat);
  reg(cells, 'cells', V3(0, 0, 0)); reg(bled, 'batteryLed', V3(0, 0, 0.02)); reg(buckle, 'batteryBuckle', V3(0, 0, 0));
  const batPart = reg(bat, 'battery', V3(0, -0.06, 0.12), { coarse: true, label: V3(0.03, -0.016, 0.06) }); batPart.shell = shell;

  // ---------- 内部の電装 ----------
  const fc = at(mesh(rboxGeo(0.050, 0.006, 0.058, 0.002), M.aluBrushDark), 0, 0.016, -0.050); sg.add(fc); reg(fc, 'fc', V3(0, 0.10, -0.06), { label: V3(0, 0.004, 0) });
  const esc = at(mesh(rboxGeo(0.058, 0.005, 0.050, 0.002), [M.pcbEdge, M.pcbEdge, M.pcbPDB, M.pcbEdge, M.pcbEdge, M.pcbEdge]), 0, 0.010, 0.040); sg.add(esc); reg(esc, 'esc', V3(0, 0.08, 0.07));
  const gnss = at(mesh(rboxGeo(0.026, 0.004, 0.026, 0.002), M.gpsBody), 0, 0.030, -0.018); sg.add(gnss); reg(gnss, 'gnss', V3(0, 0.14, -0.04), { label: V3(0, 0.003, 0) });
  const rid = at(mesh(rboxGeo(0.016, 0.004, 0.012, 0.001), M.plasticGray), 0.018, 0.022, 0.080); sg.add(rid); reg(rid, 'remoteId', V3(0.05, 0.06, 0.06));

  // ---------- 下面: 3D赤外線・補助ライト ----------
  const ir = new THREE.Group(); at(ir, 0, -0.0398, -0.066);
  { const chev = new THREE.Shape(); chev.moveTo(-0.008, 0.002); chev.lineTo(0, -0.002); chev.lineTo(0.008, 0.002); chev.lineTo(0.008, -0.002); chev.lineTo(0, -0.006); chev.lineTo(-0.008, -0.002); chev.closePath();
    const cg = new THREE.ExtrudeGeometry(chev, { depth: 0.0016, bevelEnabled: false }); cg.rotateX(Math.PI / 2); ir.add(mesh(cg, X.glass)); }
  ir.add(at(mesh(rboxGeo(0.009, 0.0016, 0.0036, 0.0008), X.glass), 0, -0.0004, 0.010));
  sg.add(ir); reg(ir, 'ir3d', V3(0, -0.04, 0), { label: V3(0, -0.002, 0) });
  const aux = new THREE.Group(); at(aux, 0, -0.0466, 0.006);
  aux.add(mesh(cylGeo(0.0046, 0.0046, 0.0016, 20), M.ledCover)); aux.add(at(mesh(cylGeo(0.0030, 0.0030, 0.0008, 16), M.ledWhite), 0, -0.0006, 0));
  sg.add(aux); reg(aux, 'auxLight', V3(0, -0.04, 0.02));
  // 魚眼センサー 6基（上: 前の左右と中央 / 下: 前の左右と中央）。上の前2基は小さな台に載り、前・横・上をまたいで見る
  const VIS = [
    [0.0270, null, -0.066, 0.35, 0.80, -0.48, 'up'], [-0.0270, null, -0.066, -0.35, 0.80, -0.48, 'up'], [0, null, 0.012, 0, 0.92, 0.40, 'up'],
    [0.0235, null, -0.074, 0.18, -0.92, -0.35, 'dn'], [-0.0235, null, -0.074, -0.18, -0.92, -0.35, 'dn'], [0, -0.0466, 0.020, 0, -0.95, 0.30, 'plate'],
  ];
  VIS.forEach(([x, y, z, nx, ny, nz, where], i) => {
    const v = new THREE.Group(); const yy = where === 'plate' ? y : (() => { const s = secAt(UPPER, z), a = Math.acos(clamp(x / s[1] * 0.98, -1, 1)); return ring(s, where === 'up' ? a : -a)[1]; })();
    at(v, x, yy, z); const n = V3(nx, ny, nz).normalize(); v.quaternion.setFromUnitVectors(UP, n);
    if (where === 'up' && i < 2) v.add(at(mesh(cylGeo(0.0072, 0.0090, 0.0040, 24), X.shell), 0, -0.0010, 0));   // 台
    v.add(at(mesh(cylGeo(0.0056, 0.0060, 0.0026, 24), X.shellDark), 0, 0.0008, 0));
    const dome = mesh(new THREE.SphereGeometry(0.0042, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), X.glass); dome.scale.y = 0.62; at(dome, 0, 0.0020, 0); v.add(dome);
    sg.add(v); reg(v, 'vision', n.clone().multiplyScalar(0.05), { label: i === 0 ? V3(0, 0.006, 0) : null });
  });

  // ---------- インフィニティジンバルと3眼カメラ ----------
  // 頭は直径約61mmの球＋円筒（公式写真から）。胴の前面に半分埋まり、上と左右を暗色の腕(ヨーク)が抱える。
  // 前面は上に大きなHasselbladのレンズ、下に2つ（向かって左＝機体の右が70mm・右が168mm。公式のセンサー図の並び）。
  // チルトが外・ロールが内なので、ロールはいつもレンズの光軸まわり（＝ダッチアングル・縦撮り）。軸の順番は写真からの推定。
  const HC = V3(0, -0.0135, -0.1145), HR = 0.033;
  const gim = new THREE.Group(); gim.position.copy(HC);
  const pan = new THREE.Group(); gim.add(pan);
  const yoke = new THREE.Group(); pan.add(yoke);
  for (const s of [-1, 1]) {   // 左右のチルト軸の蓋（頭の丸みに沿う）
    yoke.add(at(mesh(new THREE.SphereGeometry(1, 40, 12, 0, Math.PI * 2, 0, 0.42).rotateZ(-s * Math.PI / 2).scale(HR + 0.0016, HR + 0.0016, HR + 0.0016), X.shellDark), 0, 0.0005, 0.0015));   // 左右のチルト軸の蓋（頭の丸みに沿ったふくらみ）
    yoke.add(at(mesh(cylGeo(0.0052, 0.0052, 0.0010, 28).rotateZ(Math.PI / 2), X.shell), s * (HR + 0.0016), 0.0005, 0.0015));
  }
  yoke.add(at(mesh(rboxGeo(0.052, 0.014, 0.026, 0.006, 3), X.shellDark), 0, 0.024, 0.020));   // 頭の上の首（胴の前面の下にもぐる）
  const tilt = new THREE.Group(); pan.add(tilt);
  tilt.add(mesh(lathe([[0.0005, -HR], [0.013, -0.0308], [0.0228, -0.0240], [0.0290, -0.0157], [0.0325, -0.0060], [HR, 0.0], [HR, 0.0212], [0.0322, 0.0230]], 64).rotateX(-Math.PI / 2), X.shellDark));   // 後ろは球・前は円筒
  tilt.add(mesh(new THREE.TorusGeometry(HR - 0.0002, 0.0007, 8, 64), X.shell).translateZ(-0.0050));   // 前寄りの細い明るい帯
  const roll = new THREE.Group(); tilt.add(roll);
  const head = new THREE.Group(); roll.add(head);
  const FZ = -0.0276;   // 前面の位置
  head.add(at(mesh(cylGeo(0.0320, 0.0320, 0.0052, 64).rotateX(Math.PI / 2), X.bezel), 0, 0, FZ + 0.0026));   // 前面（ロールで回る）
  { const t = plane(0.0276, 0.0037, X.hasselblad); t.rotation.y = Math.PI; at(t, 0, 0.0258, FZ - 0.00005); t.userData.noPick = true; head.add(t); }   // 写真では前面の上の縁に HASSELBLAD
  head.add(at(mesh(rboxGeo(0.0284, 0.0247, 0.0016, 0.0054, 3), X.window), 0, 0.0087, FZ - 0.0006));     // 主レンズの角窓
  head.add(at(mesh(rboxGeo(0.0433, 0.0182, 0.0016, 0.0081, 3), X.window), 0, -0.0132, FZ - 0.0006));    // 下の2眼の窓（8の字）
  const lensAt = (r, x, y, glowCol, ringMat, glassMat) => { const g = new THREE.Group(); at(g, x, y, FZ - 0.0017);
    g.add(mesh(cylGeo(r + 0.0018, r + 0.0018, 0.0028, 40, true).rotateX(Math.PI / 2), X.lensRing));
    g.add(at(mesh(new THREE.TorusGeometry(r + 0.0011, 0.00055, 8, 40), ringMat || X.lensRing), 0, 0, -0.0014));
    g.add(at(mesh(new THREE.CircleGeometry(r + 0.0002, 32).rotateY(Math.PI), X.lensBack), 0, 0, 0.0010));   // 奥の暗がり
    const gl = mesh(new THREE.SphereGeometry(r, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), glassMat || M.lens); gl.scale.y = 0.32; gl.rotation.x = -Math.PI / 2; at(gl, 0, 0, -0.0011); g.add(gl);
    const glow = at(mesh(new THREE.TorusGeometry(r + 0.0021, 0.0006, 8, 48), new THREE.MeshBasicMaterial({ color: glowCol, toneMapped: false })), 0, 0, -0.0017); glow.visible = false; glow.renderOrder = 9; g.add(glow); g.userData.glow = glow;
    head.add(g); return g; };
  const camMain = lensAt(0.0091, 0, 0.0087, 0xef6a2d, null, X.lensClear), camMid = lensAt(0.0060, 0.0106, -0.0132, 0x3b7df7), camTele = lensAt(0.0065, -0.0106, -0.0132, 0x22c55e);
  // 絞り（Hasselbladのみ f/2.0〜f/11・公式）。半透明のガラス越しに、開口が狭まるのが見える
  const iris = mesh(new THREE.RingGeometry(0.0086, 0.0092, 48).rotateY(Math.PI), X.iris); at(iris, 0, 0, 0.0002); iris.renderOrder = 2; camMain.add(iris); iris.userData.r = 0.0092;
  for (const c of [camMain, camMid, camTele]) noPart(c.userData.glow);
  reg(camMain, 'camMain', V3(0, 0.004, -0.04), { label: V3(0, 0, -0.004) }); reg(camMid, 'camMid', V3(0.006, -0.004, -0.05), { label: V3(0, 0, -0.004) }); reg(camTele, 'camTele', V3(-0.006, -0.004, -0.05), { label: V3(0, 0, -0.004) });
  sg.add(gim); reg(gim, 'gimbal', V3(0, -0.01, -0.09), { coarse: true, label: V3(0.036, 0.004, 0.0) });

  // ---------- アーム ×4 ----------
  // 前アームは胴の前寄り・低い位置から前へ約20°振って伸び、先にモーターと長い脚（アンテナ入り）。
  // 後アームは胴の後ろ上から斜め上へ約14°上がり、後ろのモーターは胴より高い（公式写真・取説の背面図）。
  // 着地は前の脚2本と、胴の後ろ下のゴム足。たたむと後アームは上の段で前へ、前アームは下の段で後ろへ重なる
  const bladeGeo = (dir) => { const g = propGeometry(dir, [0]); g.scale(0.877, 0.8, 0.877); return g; };
  const fullGeo = (dir) => { const g = propGeometry(dir); g.scale(0.877, 0.8, 0.877); return g; };
  const PG = { bCCW: bladeGeo(1), bCW: bladeGeo(-1), fCCW: fullGeo(1), fCW: fullGeo(-1) };
  const ARMS = [   // 並びは M1前右 M2後右 M3後左 M4前左（550クラスと同じ）。motor はモーター台(ポッド)の中心
    { id: 'M1', front: true, sx: 1, hinge: V3(0.045, -0.004, -0.054), motor: V3(0.175, -0.002, -0.100), dir: 1 },
    { id: 'M2', front: false, sx: 1, hinge: V3(0.038, 0.027, 0.066), motor: V3(0.154, 0.055, 0.1625), dir: -1 },
    { id: 'M3', front: false, sx: -1, hinge: V3(-0.038, 0.027, 0.066), motor: V3(-0.154, 0.055, 0.1625), dir: 1 },
    { id: 'M4', front: true, sx: -1, hinge: V3(-0.045, -0.004, -0.054), motor: V3(-0.175, -0.002, -0.100), dir: -1 },
  ];
  const POD_F = [[0, -0.009], [0.0115, -0.0090], [0.0160, -0.0062], [0.0168, -0.0010], [0.0166, 0.0062], [0.0150, 0.0090], [0, 0.0090]];
  const POD_R = [[0, -0.0105], [0.0090, -0.0100], [0.0140, -0.0068], [0.0160, -0.0010], [0.0160, 0.0060], [0.0145, 0.0080], [0, 0.0080]];
  const folds = [];
  ARMS.forEach((A, k) => {
    const d = V3().subVectors(A.motor, A.hinge), len = Math.hypot(d.x, d.z), yaw = Math.atan2(-d.z, d.x), rise = Math.atan2(d.y, len);
    const ag = new THREE.Group(); ag.position.copy(A.hinge); ag.rotation.y = yaw; sg.add(ag);
    const fg = new THREE.Group(); ag.add(fg);        // 畳むときに回る入れ物
    const arm = new THREE.Group();
    const r0 = A.front ? 0.0068 : 0.0064, r1 = A.front ? 0.0053 : 0.0050, L = Math.hypot(len, d.y) - 0.010;
    const bg = new THREE.CylinderGeometry(r1, r0, L, 28, 1).rotateZ(-Math.PI / 2).scale(1, 0.88, 1).translate(L / 2 + 0.002, 0, 0).rotateZ(rise);
    arm.add(mesh(bg, X.shell));
    arm.add(at(mesh(new THREE.SphereGeometry(1, 28, 16).scale(0.014, 0.0088, 0.0102), X.shell), 0.001, 0, 0));   // 付け根の膨らみ（胴に溶け込む）
    const pod = mesh(lathe(A.front ? POD_F : POD_R, 40), X.shell); at(pod, len, d.y, 0); arm.add(pod);
    // 前アーム: 脚の付け根も同じ部品
    fg.add(arm); reg(arm, A.front ? 'frontArm' : 'rearArm', V3(0.05, 0, 0), { label: (A.front && k === 0) || (!A.front && k === 1) ? V3(len * 0.55, d.y * 0.55 + 0.008, 0) : null });
    // ポッドの上の飾りの向きを機体に合わせる入れ物（腕の振りを打ち消す）
    const wg = new THREE.Group(); at(wg, len, d.y, 0); wg.rotation.y = -yaw; fg.add(wg);
    // モーター
    const podTop = A.front ? 0.0090 : 0.0080;
    const mg = new THREE.Group(); mg.name = 'motor'; at(mg, len, d.y + podTop, 0); fg.add(mg);
    const core = new THREE.Group(); core.scale.set(0.95, 0.62, 0.95); mg.add(core);
    const base = new THREE.Group(); base.add(mesh(cylGeo(0.0105, 0.0105, 0.004).translate(0, 0.002, 0), M.aluDark)); base.add(mesh(hardLathe([[0.0046, 0.004], [0.0052, 0.004], [0.0052, 0.022], [0.0046, 0.022], [0.0046, 0.004]], 32), M.aluDark)); core.add(base); reg(base, 'motorBase', V3(0, 0, 0));
    const stator = at(mesh(G.teeth, M.lamination), 0, 0.013, 0); stator.castShadow = false; core.add(stator); reg(stator, 'stator', V3(0, 0.04, 0));
    const coils = at(mesh(G.coils, M.copper), 0, 0.013, 0); coils.castShadow = false; core.add(coils); reg(coils, 'winding', V3(0, 0.04, 0));
    const mags = at(mesh(G.magnets, M.magnet), 0, 0.013, 0); mags.castShadow = false; core.add(mags); reg(mags, 'magnet', V3(0, 0.10, 0));
    const bell = new THREE.Group(); bell.add(at(mesh(G.bellWall, M.bell), 0, 0.005, 0)); bell.add(at(mesh(G.bellTop, A.dir > 0 ? M.bellTopCCW : M.bellTopCW), 0, 0.0295, 0)); core.add(bell); reg(bell, 'bell', V3(0, 0.10, 0));
    const shaft = new THREE.Group(); shaft.add(at(mesh(cylGeo(0.002, 0.002, 0.036, 16), M.steel), 0, 0.016, 0)); shaft.add(at(mesh(G.bearing, M.steel), 0, 0.005, 0)); core.add(shaft); reg(shaft, 'shaft', V3(0, 0.10, 0));
    // プロペラ(クイックリリース・羽根は根元で折れる)
    const PY = 0.024;
    const propG = new THREE.Group(); propG.name = 'prop'; at(propG, 0, PY, 0); mg.add(propG);
    const hubCap = mesh(cylGeo(0.0085, 0.0095, 0.006, 32), X.shellDark); propG.add(hubCap);
    const blades = [], hinges = [];
    for (const s of [1, -1]) {
      const hg = new THREE.Group(); at(hg, s * 0.011, 0, 0);
      const bl = mesh(A.dir > 0 ? PG.bCCW : PG.bCW, A.dir > 0 ? X.propCCW : X.propCW); if (s < 0) bl.rotation.y = Math.PI; bl.position.x = s > 0 ? -0.011 : 0.011;
      hg.add(bl); propG.add(hg); blades.push(bl); hinges.push({ g: hg, s });
    }
    const ghosts = [0, 1].map(() => { const gm = (A.dir > 0 ? X.propCCW : X.propCW).clone(); gm.transparent = true; gm.opacity = 0.35; gm.depthWrite = false;
      const gh = new THREE.Mesh(A.dir > 0 ? PG.fCCW : PG.fCW, gm); gh.visible = false; gh.userData.noPart = true; gh.userData.noPick = true; propG.add(gh); return gh; });
    reg(propG, 'prop', V3(0.04, 0.09, 0), { label: k === 3 ? V3(0.09, 0.004, 0) : null });
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.135, 64), (A.dir > 0 ? M.propDiscCCW : M.propDiscCW).clone()); disc.rotation.x = -Math.PI / 2; disc.userData.noAO = true; at(disc, 0, PY, 0);
    disc.renderOrder = 5; disc.userData.noPart = true; disc.userData.noPick = true; mg.add(disc);
    const mp = reg(mg, 'motor', V3(0.04, 0.06, 0), { coarse: true, label: k === 0 ? V3(0, 0.02, 0) : null });
    // 前アーム: 長い脚(アンテナ入り)とフロントLED。右前だけLiDARの窓 / 後アーム(右): ステータスインジケーター
    if (A.front) {
      const lg = new THREE.Group(); at(lg, len, d.y, 0); lg.rotation.y = -yaw;   // 機体の向きにそろえる（脚の幅は前後方向）
      const top = -0.0085, tipY = LEG_Y - A.motor.y + 0.0026, H = top - tipY;
      const legShape = polyShape([[-0.0075, 0], [0.0085, 0], [0.0042, -H], [-0.0018, -H]]);
      const lgeo = new THREE.ExtrudeGeometry(legShape, { depth: 0.0044, bevelEnabled: true, bevelThickness: 0.0011, bevelSize: 0.0011, bevelSegments: 2, curveSegments: 4 });
      lgeo.translate(0, 0, -0.0022); lgeo.rotateY(-Math.PI / 2);   // 形は z(前後)×y、厚みは x
      const splay = new THREE.Group(); at(splay, A.sx * 0.0035, top, 0.0005); splay.rotation.z = A.sx * 0.09; lg.add(splay);   // 先は少し外へ開く
      splay.add(mesh(lgeo, X.shell));
      splay.add(at(mesh(new THREE.SphereGeometry(0.0026, 14, 10), M.rubber), 0, -H, 0.0012));
      fg.add(lg); reg(lg, 'landingGear', V3(0, -0.03, 0), { label: k === 0 ? V3(A.sx * 0.006, -0.026, 0) : null }); legs.push({ group: lg, sx: A.sx, pivots: [] });
      const led = new THREE.Group(); at(led, A.sx * 0.0068, -0.0030, -0.0158); wg.add(led);
      led.add(mesh(rboxGeo(0.0046, 0.0034, 0.0024, 0.0011), M.ledCover)); led.add(at(mesh(new THREE.BoxGeometry(0.0034, 0.0024, 0.0010), M.ledGreen), 0, 0, -0.0006));
      const core2 = new THREE.Sprite(M.glowCore(0x18ff4a)); core2.scale.set(0.008, 0.008, 1); core2.position.z = -0.003; core2.renderOrder = 6; led.add(core2);
      const halo = new THREE.Sprite(M.glowHalo(0x18ff4a)); halo.scale.set(0.020, 0.020, 1); halo.position.z = -0.004; halo.renderOrder = 6; led.add(halo);
      reg(led, 'led', V3(0, -0.01, -0.03), { label: k === 0 ? V3(0, 0, -0.004) : null }); led.userData.halo = halo; led.userData.core = core2; halo.userData.baseColor = halo.material.color.clone();
      if (A.sx > 0) {   // 前向きLiDAR: 右前アームの先、フロントLEDの内側（公式の製品写真・取説の各部名称）
        const lidar = new THREE.Group(); at(lidar, -0.0035, -0.0028, -0.0160); wg.add(lidar);
        lidar.add(mesh(rboxGeo(0.0090, 0.0060, 0.0024, 0.0016), X.shellDark));
        lidar.add(at(mesh(rboxGeo(0.0072, 0.0044, 0.0012, 0.0012), X.glass), 0, 0, -0.0010));
        reg(lidar, 'lidar', V3(0, 0, -0.04), { label: V3(0, 0, -0.004) });
      }
    } else if (k === 1) {
      const st = new THREE.Group(); at(st, 0.004, -0.0082, -0.008); st.rotation.x = 0.5; wg.add(st);
      st.add(mesh(rboxGeo(0.0070, 0.0024, 0.0050, 0.0010), M.ledCover)); const lamp = at(mesh(new THREE.BoxGeometry(0.0052, 0.0008, 0.0036), M.ledGreen), 0, -0.0010, 0); st.add(lamp);
      const sp = reg(st, 'statusLed', V3(0.02, -0.03, 0), { label: V3(0, -0.004, 0) }); sp.lamp = lamp;
    }
    if (k === 3) {   // 左前アームの前面に「MAVIC 4 PRO」（公式写真）
      const t = plane(0.042, 0.0058, X.brand); const mid = len * 0.56, rr = 0.0059, th = 0.55;
      t.rotation.x = th; at(t, mid, Math.sin(rise) * mid - Math.sin(th) * rr * 0.9, Math.cos(th) * rr + 0.0003); t.userData.noPick = true; arm.add(t);
    }
    const ua = new THREE.Group(); ua.position.set(0, PY, 0); ua.scale.setScalar(1 / K); mg.add(ua);
    const mo = { group: mg, prop: propG, propMesh: blades[0], blades, hinges, ghosts, disc, bell, mags, shaft, adapter: hubCap, dir: A.dir, arm: ag, id: A.id, u: V3(A.motor.x, 0, A.motor.z), part: mp, arrowAnchor: ua, front: A.front, sx: A.sx, fold: fg, yaw };
    // 前アームの畳み方: 下へ振り下ろして後ろへ半回転（畳むとモーターが下・脚が上。取説の背面図）。回転軸は「今の向き＋畳んだ向き」の二等分
    let flip = null;
    if (A.front) { const d0 = V3(d.x, 0, d.z).normalize(), dT = V3(A.sx * 0.10, 0, 1).normalize(), ax = d0.clone().add(dT).normalize().applyAxisAngle(UP, -yaw);
      const test = V3(1, 0, 0).applyAxisAngle(ax, Math.PI / 2); flip = { axis: ax, sign: test.y < 0 ? 1 : -1 }; }
    motors.push(mo); folds.push({ fg, front: A.front, sx: A.sx, yaw, len, rise, flip });
  });

  // ---------- 説明用の重ね絵 (画角・検知範囲。部品には数えない) ----------
  const fovG = new THREE.Group(); fovG.visible = false; head.add(fovG);
  const frustum = (fovDeg, len, mat) => { const dg = Math.tan(THREE.MathUtils.degToRad(fovDeg / 2)) * len, a = dg * 0.8, b = dg * 0.6;   /* 公式のFOVを対角とみなし、4:3 の枠にする */
    const g = new THREE.ConeGeometry(Math.hypot(a, b), len, 4, 1, true); g.rotateY(Math.PI / 4); g.scale(a / Math.hypot(a, b) * Math.SQRT2, 1, b / Math.hypot(a, b) * Math.SQRT2); g.rotateX(Math.PI / 2); g.translate(0, 0, -len / 2 - 0.003);
    const m = new THREE.Mesh(g, mat); m.renderOrder = 7; return m; };
  const cones = { main: frustum(72, 0.95, X.fovMain), mid: frustum(35, 1.15, X.fovMid), tele: frustum(15, 1.35, X.fovTele) };
  cones.main.position.copy(camMain.position); cones.mid.position.copy(camMid.position); cones.tele.position.copy(camTele.position);
  fovG.add(cones.main, cones.mid, cones.tele); fovG.userData.cones = cones; noPart(fovG);
  const senseG = new THREE.Group(); senseG.visible = false; sg.add(senseG);
  { const S2 = 0.022;   // 実際の測定範囲(m)を 1/45 にした概念図
    const lobe = (dir, r) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2.4), X.sense); m.quaternion.setFromUnitVectors(UP, dir.clone().normalize()); m.renderOrder = 7; return m; };
    senseG.add(lobe(V3(0, 0, -1), 24 * S2), lobe(V3(0, 0, 1), 22 * S2), lobe(V3(1, 0, 0), 21 * S2), lobe(V3(-1, 0, 0), 21 * S2), lobe(V3(0, 1, 0), 18 * S2), lobe(V3(0, -1, 0), 17 * S2 * 0.25));
    const beam = new THREE.Mesh(new THREE.ConeGeometry(Math.tan(Math.PI / 6) * 25 * S2, 25 * S2, 4, 1, true), X.lidarBeam); beam.rotation.y = Math.PI / 4;   /* 視野は上下・左右とも60°（公式） */ beam.rotation.x = -Math.PI / 2; beam.position.set(0.1745, -0.0048, -0.1185 - 25 * S2 / 2);   /* 右前アームの先から前へ */ beam.renderOrder = 8; senseG.add(beam);
    const irb = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.075, 24, 1, true), X.irBeam); irb.position.set(0, -0.040 - 0.0375, -0.066); irb.renderOrder = 8; senseG.add(irb);
    noPart(senseG); }

  // ---------- 矢印 ----------
  const arrows = { thrust: [], rot: [], move: null, yaw: null };
  motors.forEach(mo => {
    const th = arrowMesh(0xffffff, 0.06, 0.0035); th.position.set(0, 0.012, 0); th.visible = false; mo.arrowAnchor.add(th); arrows.thrust.push(th);
    const rot = rotationArc(mo.dir, 0.05); rot.position.set(0, 0.012, 0); rot.visible = false; mo.arrowAnchor.add(rot); arrows.rot.push(rot);
  });
  const move = arrowMesh(0xef6a2d, 0.14, 0.005); move.visible = false; root.add(move); arrows.move = move;
  const yaw = rotationArc(-1, 0.22); yaw.position.set(0, -0.02, 0); yaw.visible = false; root.add(yaw); arrows.yaw = yaw;
  const cgMarker = new THREE.Group(); cgMarker.visible = false; root.add(cgMarker);

  return { root, sg, halfSpan: 0.31, focusMin: 0.26, parts, pick, wires, motors, legs, arrows, batPart, G, cgMarker, personGroup: null, folds, gimbalParts: { pan, roll, tilt, head, yoke, iris, lens: { main: camMain, mid: camMid, tele: camTele } }, fovG, senseG,
    rotor: { R: 0.1334 * K, y0: 0.024 }, moveR: 0.26, moveY: 0.05, rpmScale: 1.1 };
}
