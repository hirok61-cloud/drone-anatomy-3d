// ===== DJI Matrice 4 シリーズ（4T／4E）の手続き生成 =====
// 寸法は DJI 公式の3Dモデル（M4T_v2.stp）を実測した値（mm）。描く形はコードで組んだ簡略形で、CADのデータそのものは使っていない。
// 公式値: 展開 約307.0×387.5×149.5mm（プロペラを除く）・対角ホイールベース 438.8mm・プロペラ 10.8インチ。CADの全幅387.5mmは公式と一致する。
// CADの座標（x=右・y=上・z=後ろ、mm）を m4P() で舞台の m に直す。原点は CAD の (0, 25, 25)＝4つのモーターの中心付近。
// 機首=−Z、右=+X。脚4本の先（CAD y=−54.6）が床に来るよう、入れ物ごと下げる。
const M4_O = [0, 25, 25];
const m4P = (x, y, z) => V3(x / 1000, (y - M4_O[1]) / 1000, (z - M4_O[2]) / 1000);
const m4mm = (v) => v / 1000;
// ジンバル前面の窓の位置（頭の前面の中心からの mm。x=機体の右+・y=上+）。4T は CAD の実測、4E は取説の図と公式写真から（推定）
const M4_FACE = {
  t: { thermal: [13.5, 16.2], mid: [-12.4, 15.6], tele: [7.6, -4.3], wide: [-15.5, -4.6], laser: [7.8, -23.3], nir: [-15.9, -23.9] },
  e: { tele: [13.5, 14.5], mid: [-12.5, 18.5], laser: [16.5, -9.5], wide: [-6.5, -8.5] },
};
function m4Materials(M) {
  const phy = (o) => new THREE.MeshPhysicalMaterial(o), std = (o) => new THREE.MeshStandardMaterial(o);
  const decal = (c) => std({ map: canvasTex(c, { wrap: false }), roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const decalT = (c) => std({ map: canvasTex(c, { wrap: false }), roughness: 0.6, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const sans = '-apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif';
  const propCanvas = (mark) => pd6bCanvas(256, 1024, (g, w, h) => {
    g.fillStyle = '#1a1a1a'; g.fillRect(0, 0, w, h);   /* 黒い羽根の先の約2割がオレンジ（公式写真） */
    g.fillStyle = 'rgba(255,255,255,0.04)'; for (let y = 0; y < h; y += 6) g.fillRect(0, y, w, 1);
    g.fillStyle = '#e06e2c'; g.fillRect(0, h * 0.905, w, h * 0.095);
  });
  const propMat = () => Object.assign(phy({ map: canvasTex(propCanvas(), { wrap: false }), roughness: 0.55, metalness: 0, clearcoat: 0.3, clearcoatRoughness: 0.4, side: THREE.DoubleSide }), { userData: { flatTint: true } });
  const regLabel = pd6bCanvas(512, 96, (g, w, h) => { g.fillStyle = '#f4f4f2'; g.fillRect(0, 0, w, h); g.fillStyle = '#17181b'; g.font = 'bold 60px "SF Mono", Menlo, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('JU 1234 5678', w / 2, h / 2 + 2); });
  const djiLogo = pd6bCanvas(256, 112, (g, w, h) => { g.fillStyle = '#f0f0f0'; g.font = `italic 700 92px ${sans}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('dji', w / 2, h / 2 + 4); });
  const brand = pd6bCanvas(512, 72, (g, w, h) => { g.fillStyle = '#f0f0f0'; g.font = `500 50px ${sans}`; g.textAlign = 'center'; g.textBaseline = 'middle'; if ('letterSpacing' in g) g.letterSpacing = '3px'; g.fillText('Matrice 4', w / 2, h / 2 + 2); });
  return {
    shell: phy({ color: 0xb2b4b7, metalness: 0.04, roughness: 0.64, clearcoat: 0.12, clearcoatRoughness: 0.6 }),   /* 明るめの冷たいグレー・細かいシボのつや消し（公式写真） */
    lid: phy({ color: 0xb6b8bb, metalness: 0.04, roughness: 0.58, clearcoat: 0.2, clearcoatRoughness: 0.5 }),
    arm: phy({ color: 0xa6a8ab, metalness: 0.04, roughness: 0.62, clearcoat: 0.1, clearcoatRoughness: 0.6 }),
    sink: phy({ color: 0x3d4044, metalness: 0.45, roughness: 0.42 }),   /* 底の放熱板（暗い金属色） */
    cap: phy({ color: 0xcfd1d3, metalness: 0.03, roughness: 0.6 }),
    dark: phy({ color: 0x2b2d31, metalness: 0.12, roughness: 0.55 }),
    gimbal: phy({ color: 0x666a6f, metalness: 0.3, roughness: 0.42, clearcoat: 0.3, clearcoatRoughness: 0.35 }),   /* カメラ頭は胴より暗い半つやのグレー */
    gimbalDark: phy({ color: 0x3a3d42, metalness: 0.3, roughness: 0.45 }),
    bell: phy({ color: 0x1c1d1f, metalness: 0.35, roughness: 0.38, clearcoat: 0.4, clearcoatRoughness: 0.3 }),
    glass: phy({ color: 0x07090d, roughness: 0.05, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, iridescence: 0.6, iridescenceIOR: 1.3 }),
    irGlass: phy({ color: 0x14181a, roughness: 0.12, metalness: 0.5, clearcoat: 1, clearcoatRoughness: 0.05, iridescence: 0.9, iridescenceIOR: 1.6, iridescenceThicknessRange: [300, 600] }),   /* ゲルマニウム窓（緑〜灰に光る） */
    milky: phy({ color: 0xe4e7ea, roughness: 0.32, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.15 }),   /* レーザー・NIR の乳白の窓 */
    window: phy({ color: 0x0a0c0f, metalness: 0.3, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.06 }),
    lensRing: phy({ color: 0x1d1f23, metalness: 0.8, roughness: 0.3 }),
    lensBack: new THREE.MeshBasicMaterial({ color: 0x020305 }),
    orange: std({ color: 0xf07a2a, roughness: 0.5 }),
    prop: propMat(), propDot: std({ color: 0xf2f2f2, roughness: 0.5 }),
    regLabel: decal(regLabel), brand: decalT(brand), djiLogo: decalT(djiLogo),
    protector: phy({ color: 0x8e9196, roughness: 0.55, clearcoat: 0.2 }),
    fov: { wide: 0xef6a2d, mid: 0x3b7df7, tele: 0x22c55e, ir: 0xe5484d },
    sense: new THREE.MeshBasicMaterial({ color: 0x14b8a6, transparent: true, opacity: 0.10, depthWrite: false, side: THREE.DoubleSide }),
    beam: new THREE.MeshBasicMaterial({ color: 0xff3b30, transparent: true, opacity: 0.85, toneMapped: false }),
    nirBeam: new THREE.MeshBasicMaterial({ color: 0xb06cf5, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }),
    spotBeam: new THREE.MeshBasicMaterial({ color: 0xfff1c2, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.FrontSide }),   /* 内側から（カメラの映像で）見えないよう表だけ */
  };
}

function buildM4(M) {
  const K = M4_K, P = m4P, mm = m4mm, LEG_Y = (-54.6 - M4_O[1]) / 1000;
  const root = new THREE.Group(); root.name = 'drone';
  const sg = new THREE.Group(); sg.name = 'matrice4'; sg.scale.setScalar(K); sg.position.y = -0.158 - LEG_Y * K; root.add(sg);
  const parts = [], pick = [], wires = [], motors = [], legs = [];
  const G = motorGeometries(), X = m4Materials(M);
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
  const atP = (o, x, y, z) => { o.position.copy(P(x, y, z)); return o; };
  const box = (w, h, d, r, mat, x, y, z) => atP(mesh(rboxGeo(mm(w), mm(h), mm(d), mm(r)), mat), x, y, z);

  // ---------- 胴の断面（CADの実測。[z, 半幅, 上端, 下端, 上の丸み, 下の丸み]・mm）----------
  // 上ぶた: 平らな天面の帽子形。前端は丸い「眉」になり、カメラの上にかぶさる。前寄りは下へ伸びてジンバルの左右の頬になる
  const LID = [
    [-136, 9, 57, 51, 2.2, 2.2], [-133, 22, 60.5, 46, 2.5, 2.4], [-128, 29.5, 62.8, 41, 2.9, 3.2], [-121, 35.5, 64.6, 37, 3.3, 4.5],
    [-112, 39, 66.2, 35, 3.6, 6], [-98, 41, 68, 35, 3.4, 7], [-84, 42.2, 69.8, 36, 3.2, 7], [-70, 43, 72, 40, 3, 7],
    [-56, 44, 73.2, 44, 3, 7], [-40, 44.1, 73, 45, 3, 7], [-20, 42.6, 71.8, 45.5, 3, 7], [0, 40.6, 70.6, 46.5, 3, 7],
    [20, 38.4, 70, 47.5, 3, 7], [40, 36.6, 69.6, 49, 3, 7], [58, 37.3, 69, 50, 3, 7], [70, 38, 66.5, 49, 2.7, 6],
    [79, 36, 63.5, 46, 2.7, 4.5], [86, 29, 60.5, 45, 2.7, 3.4], [90, 19, 57.5, 47, 2.5, 2.6], [92.5, 6, 54, 50, 2.2, 2.2],
  ];
  // 下胴: 上ぶたの下に収まり、後ろからバッテリーが入る。底は放熱板
  const LOW = [
    [-62, 28, 46, 14, 4, 3], [-52, 40, 47, 7, 4, 3], [-46, 44, 47, 4, 4, 3], [-40, 44.3, 47, -16, 4, 3.2], [-34, 43.8, 47, -21, 4, 3.4], [-10, 41.5, 47, -22, 4, 3.6],
    [10, 39.3, 48, -22, 4, 3.6], [30, 37.2, 49, -23, 4, 3.6], [50, 36.8, 50, -24.5, 4, 3.6], [66, 37.4, 50, -25, 4, 3.6],
    [80, 36.4, 47, -23, 4, 3.4], [90, 32, 44, -18.5, 3.6, 3], [96, 25, 41, -12, 3, 2.6], [100, 14, 35, -2, 2.4, 2.4],
  ];
  const toM = (S) => S.map(([z, w, t, b, nt, nb]) => [(z - M4_O[2]) / 1000, w / 1000, (t - M4_O[1]) / 1000, (b - M4_O[1]) / 1000, nt, nb]);
  const SL = toM(LID), SW = toM(LOW);
  const crs = (S, u) => { const n = S.length - 1, i = Math.min(n - 1, Math.max(0, Math.floor(u))), t = u - i;
    const p0 = S[Math.max(0, i - 1)], p1 = S[i], p2 = S[i + 1], p3 = S[Math.min(n, i + 2)];
    return p1.map((_, k) => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t * t + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t * t * t)); };
  const secAt = (S, z) => { for (let i = 0; i < S.length - 1; i++) if (z <= S[i + 1][0]) { const t = (z - S[i][0]) / (S[i + 1][0] - S[i][0]); return crs(S, i + clamp(t, 0, 1)); } return S[S.length - 1].slice(); };
  const ring = (sec, a) => { const [, w, top, bot, nt, nb] = sec, c = Math.cos(a), s = Math.sin(a), mid = (top + bot) / 2;
    const n = s >= 0 ? nt : nb, x = w * Math.sign(c) * Math.abs(c) ** (2 / n), y = s >= 0 ? mid + (top - mid) * Math.abs(s) ** (2 / n) : mid - (mid - bot) * Math.abs(s) ** (2 / n); return [x, y]; };
  function loftGeo(S, sub = 6, around = 72) {
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
  const lidTop = (zmm) => secAt(SL, (zmm - M4_O[2]) / 1000)[2] * 1000 + M4_O[1];   // その z の上ぶたの天面（CAD の mm）

  const bodyG = new THREE.Group();
  bodyG.add(mesh(loftGeo(SL), X.lid));
  bodyG.add(mesh(loftGeo(SW), X.shell));
  // 底の放熱板（縦の溝）と下胴の側面の通気スリット
  const sink = new THREE.Group();
  sink.add(box(50, 3.4, 128, 1.2, X.sink, 0, -23.8, 26));
  for (let k = 0; k < 13; k++) sink.add(box(1.4, 1.2, 120, 0.4, X.dark, -18 + k * 3, -25.6, 26));
  bodyG.add(sink);
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) { const v = box(1.6, 12, 3.2, 0.7, X.dark, s * 37.6, -3, 52 + k * 7); bodyG.add(v); }
  // 上ぶたの前寄り: 左右の小さなオレンジの目印（用途は公表されていない・公式写真）
  for (const s of [-1, 1]) { const o = box(1, 4, 12, 0.5, X.orange, s * 44.4, 47.5, -52); bodyG.add(o); }
  // 後面の下: 六角メッシュの吸気口
  for (const s of [-1, 1]) { const v = box(14, 12, 1.2, 1.5, X.dark, s * 20, -12, 93.6); v.rotation.x = 0.35; bodyG.add(v); }
  sg.add(bodyG); reg(bodyG, 'body', V3(0, 0, 0), { label: P(-36, 72, 10) });

  // ---------- 上面: E-Port → セルラードングル収納部 → GNSS → ビーコン（取説の各部名称・CAD）----------
  const ep = new THREE.Group(); ep.add(box(13, 3.2, 18, 3, X.dark, 0, lidTop(-57) + 0.8, -57));
  for (const s of [-1, 1]) ep.add(atP(mesh(cylGeo(mm(3), mm(3.4), mm(1.6), 16), X.dark), s * 19.5, lidTop(-50) + 0.4, -50));   // アクセサリーの手締めねじの座
  sg.add(ep); reg(ep, 'ePort', V3(0, 0.05, 0), { label: P(0, lidTop(-57) + 3, -57) });
  const dongle = new THREE.Group(); dongle.add(box(33, 2.2, 57, 6, X.lid, 0, lidTop(-3) + 0.4, -3));
  { const t = plane(mm(17), mm(7.4), X.djiLogo); t.rotation.x = -Math.PI / 2; atP(t, 0, lidTop(8) + 1.6, 8); t.userData.noPick = true; dongle.add(t); }
  sg.add(dongle); reg(dongle, 'dongleBay', V3(0, 0.05, 0));
  const gnss = new THREE.Group();   // 上ぶたから約24mm立つ円筒（上端 y=97・CAD）
  gnss.add(atP(mesh(lathe([[0, 0], [mm(21.2), 0], [mm(21.2), mm(2)], [mm(20.4), mm(4)], [mm(19.6), mm(20)], [mm(19.2), mm(23)], [mm(17), mm(25.2)], [0, mm(25.6)]].map(([r, y]) => [r, y]), 64), X.lid), 0, 71.4, 45));
  gnss.add(atP(mesh(new THREE.TorusGeometry(mm(21.3), mm(0.9), 8, 64).rotateX(Math.PI / 2), X.shell), 0, 72, 45));
  sg.add(gnss); reg(gnss, 'gnss', V3(0, 0.08, 0), { label: P(0, 97, 45) });
  // GNSS の左右の斜めの排気スリット
  for (const s of [-1, 1]) for (let k = 0; k < 7; k++) { const z = 37 + k * 4, sl = box(9, 1.4, 1.6, 0.5, X.dark, s * 29.5, lidTop(z) - 4.5, z); sl.rotation.z = s * 0.55; bodyG.add(sl); }
  const beacon = new THREE.Group(); at(beacon, 0, 0, 0);
  beacon.add(atP(mesh(cylGeo(mm(6.4), mm(7), mm(1.6), 24), X.dark), 0, 61.4, 76)); beacon.add(atP(mesh(cylGeo(mm(4.6), mm(4.6), mm(1.8), 20), M.ledCover), 0, 62.4, 76));
  beacon.children.forEach(c => { c.rotation.x = -0.42; });
  sg.add(beacon); reg(beacon, 'beacon', V3(0, 0.05, 0.03));

  // ---------- 後面: バッテリー（後ろから差し込む）・ポート ----------
  const bat = new THREE.Group();
  const cellsBox = mesh(rboxGeo(mm(54), mm(52), mm(128), mm(4)), M.cell); atP(cellsBox, 0, 27, 22); bat.add(cellsBox);
  const shell = new THREE.Group(); bat.add(shell);
  shell.add(box(57, 54, 10, 7, X.cap, 0, 26, 94.5));   // 後端キャップ（胴より明るいグレー）
  shell.add(box(52, 49, 2, 6, X.cap, 0, 26, 99.6));
  const bled = new THREE.Group();   // 電源ボタン（左寄り）と残量LED 4つ（右・CAD）
  bled.add(box(12, 8, 2.2, 2.6, M.plasticGray, -9, 31, 100.6));
  for (let k = 0; k < 4; k++) bled.add(atP(mesh(rboxGeo(mm(1.6), mm(4), mm(1), mm(0.6)), k < 3 ? M.ledGreen : M.chip), 3 + k * 3.2, 32, 100.7));
  bat.add(bled);
  const buckle = new THREE.Group();
  for (const s of [-1, 1]) { const b = box(5, 10, 18, 2, X.dark, s * 28.6, 32, 81); for (let k = 0; k < 4; k++) b.add(at(mesh(new THREE.BoxGeometry(mm(1), mm(8), mm(1)), X.gimbalDark), s * mm(2.6), 0, mm(-6 + k * 4))); buckle.add(b); }
  bat.add(buckle);
  sg.add(bat);
  reg(cellsBox, 'cells', V3(0, 0, 0)); reg(bled, 'batteryLed', V3(0, 0, 0.02)); reg(buckle, 'batteryBuckle', V3(0, 0, 0));
  const batPart = reg(bat, 'battery', V3(0, 0.02, 0.16), { coarse: true, label: P(20, 45, 96) }); batPart.shell = shell;
  const ports = new THREE.Group(); ports.add(box(24, 15, 1.6, 3, X.dark, 0, -13, 94.4)); ports.children[0].rotation.x = 0.35;
  ports.add(atP(mesh(rboxGeo(mm(9), mm(3.2), mm(1), mm(1.2)), M.chip), 0, -10, 95.6)); ports.add(atP(mesh(rboxGeo(mm(12), mm(1.6), mm(1), mm(0.6)), M.chip), 0, -16, 94.2));
  sg.add(ports); reg(ports, 'ports', V3(0, -0.02, 0.05), { label: P(0, -13, 95) });

  // ---------- 内部の電装（位置は例）----------
  const fc = box(56, 6, 60, 2, M.aluBrushDark, 0, 61, -60); sg.add(fc); reg(fc, 'fc', V3(0, 0.12, -0.04), { label: V3(0, 0.004, 0) });
  const esc = atP(mesh(rboxGeo(mm(60), mm(5), mm(48), mm(2)), [M.pcbEdge, M.pcbEdge, M.pcbPDB, M.pcbEdge, M.pcbEdge, M.pcbEdge]), 0, -10, -18); sg.add(esc); reg(esc, 'esc', V3(0, -0.08, 0));
  const rid = box(16, 4, 12, 1, M.plasticGray, 18, 62, 20); sg.add(rid); reg(rid, 'remoteId', V3(0.05, 0.08, 0));

  // ---------- センサー: 上の四隅の魚眼（前2・後2）と下面（下方ビジョン2・3D赤外線・補助ライト）----------
  const fish = (x, y, z, dir, key, label) => {
    const v = new THREE.Group(); atP(v, x, y, z); v.quaternion.setFromUnitVectors(UP, dir.clone().normalize());
    v.add(at(mesh(cylGeo(mm(7.6), mm(8.2), mm(2.6), 28), X.dark), 0, -0.0006, 0));
    v.add(at(mesh(new THREE.TorusGeometry(mm(6.6), mm(0.7), 8, 32).rotateX(Math.PI / 2), X.lensRing), 0, 0.0008, 0));
    const dome = mesh(new THREE.SphereGeometry(mm(5), 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), X.glass); dome.scale.y = 0.6; at(dome, 0, 0.0007, 0); v.add(dome);
    sg.add(v); reg(v, key, dir.clone().normalize().multiplyScalar(0.05), { label: label ? V3(0, 0.006, 0) : null }); return v; };
  fish(31, 54.5, -121.5, V3(0.55, 0.32, -0.77), 'vision', true); fish(-31, 54.5, -121.5, V3(-0.55, 0.32, -0.77), 'vision');
  fish(31, 54.5, 79.5, V3(0.55, 0.32, 0.77), 'vision'); fish(-31, 54.5, 79.5, V3(-0.55, 0.32, 0.77), 'vision');
  fish(0, -25.3, -16, V3(0, -1, 0), 'visionDown', true); fish(0, -25.3, 61, V3(0, -1, 0.08), 'visionDown');
  const ir = new THREE.Group(); ir.add(box(23, 1.6, 11, 4, X.dark, 0, -25.6, 4)); for (const s of [-1, 1]) ir.add(box(9.4, 1, 8, 2.6, X.glass, s * 5.2, -26.1, 4));
  sg.add(ir); reg(ir, 'ir3d', V3(0, -0.05, 0), { label: P(0, -27, 4) });
  const aux = new THREE.Group(); aux.add(atP(mesh(cylGeo(mm(7.4), mm(7.4), mm(1.4), 24), X.dark), 0, -25.5, 36)); aux.add(atP(mesh(cylGeo(mm(4.6), mm(4.6), mm(1), 20), M.ledWhite), 0, -26.3, 36));
  sg.add(aux); reg(aux, 'auxLight', V3(0, -0.05, 0.02));
  const rm = plane(mm(30), mm(5.8), X.regLabel); rm.rotation.y = -Math.PI / 2; atP(rm, -38.7, 22, 20); sg.add(rm); reg(rm, 'regMark', V3(-0.04, 0, 0));

  // ---------- ジンバル: 上ぶたの下の付け根 → パン（縦軸）→ ロール（前後の軸・頭の後ろ）→ U字のヨーク → チルト（左右の円筒）→ 頭 ----------
  const TILT = P(0, -0.8, -119.6), PANC = P(0, 26, -64), ROLLC = P(0, -0.8, -68);
  const mount = new THREE.Group();   // 上ぶたの眉の下から後ろ下へ降りる支え（胴に固定。CAD の側面）
  mount.add(box(34, 4, 40, 2, X.shell, 0, 44, -86));   // 眉の下の板
  { const st = box(24, 8, 30, 3, X.shell, 0, 35, -86); st.rotation.x = -0.52; mount.add(st); }   // 斜めの支え（CAD の側面）
  for (const s of [-1, 1]) mount.add(atP(mesh(cylGeo(mm(4.2), mm(4.2), mm(6), 16), M.rubber), s * 11, 33, -70));   // 防振ダンパー（黄褐色のゴム・整備マニュアル）
  mount.traverse(c => { if (c.isMesh && c.material === M.rubber) c.material = new THREE.MeshStandardMaterial({ color: 0xa88a5a, roughness: 0.8 }); });
  sg.add(mount);
  const gim = new THREE.Group(); gim.position.copy(PANC); sg.add(gim);
  const pan = new THREE.Group(); gim.add(pan);
  pan.add(mesh(cylGeo(mm(12), mm(12), mm(9), 36), X.gimbalDark));   // パン（ヨー）軸のモーター
  pan.add(at(mesh(rboxGeo(mm(12), mm(22), mm(10), mm(3)), X.gimbal), 0, mm(-14), mm(-1)));
  const roll = new THREE.Group(); roll.position.copy(ROLLC).sub(PANC); pan.add(roll);
  roll.add(at(mesh(cylGeo(mm(12.5), mm(12.5), mm(11), 36).rotateX(Math.PI / 2), X.gimbalDark), 0, 0, mm(3)));   // ロール軸のモーター（頭の後ろ）
  // U字のヨーク: ロールの軸から左右へ回り、頭の横の円筒（チルト軸）を抱える
  const yoke = new THREE.Group(); roll.add(yoke);
  { const zT = TILT.z - ROLLC.z, back = mm(-4);
    yoke.add(at(mesh(rboxGeo(mm(70), mm(20), mm(6), mm(3)), X.gimbal), 0, 0, back));
    for (const s of [-1, 1]) { const len = Math.abs(zT - back); yoke.add(at(mesh(rboxGeo(mm(6), mm(22), len, mm(3)), X.gimbal), s * mm(37), 0, back + zT / Math.abs(zT) * len / 2 - mm(0)));
      yoke.add(at(mesh(cylGeo(mm(12.5), mm(12.5), mm(6.5), 40).rotateZ(Math.PI / 2), X.gimbal), s * mm(37), 0, zT)); } }
  const tilt = new THREE.Group(); tilt.position.copy(TILT).sub(ROLLC); roll.add(tilt);
  for (const s of [-1, 1]) {   // チルト軸の円筒（輪状のリブ）
    tilt.add(at(mesh(cylGeo(mm(11.8), mm(11.8), mm(8), 40).rotateZ(Math.PI / 2), X.gimbal), s * mm(32.5), 0, 0));
    for (let k = 0; k < 4; k++) tilt.add(at(mesh(new THREE.TorusGeometry(mm(11.9), mm(0.55), 6, 40).rotateY(Math.PI / 2), X.gimbalDark), s * mm(29.5 + k * 1.8), 0, 0));
  }
  const head = new THREE.Group(); tilt.add(head);
  // 頭: 前面 58×62.5mm の八角形（角を面取り）、奥行き約51mm、後ろは丸く放熱フィン（CAD）
  const FZ = mm(-142 + 119.6), HD = mm(44.5);   // 前面の位置（チルト軸から）と奥行き
  { const w = mm(29), h0 = mm(29.8), h1 = mm(-33.7), c = mm(9);
    const oct = polyShape([[-w + c, h0], [w - c, h0], [w, h0 - c], [w, h1 + c], [w - c, h1], [-w + c, h1], [-w, h1 + c], [-w, h0 - c]]);
    const g = new THREE.ExtrudeGeometry(oct, { depth: HD, bevelEnabled: true, bevelThickness: mm(3.5), bevelSize: mm(3), bevelSegments: 4, curveSegments: 4 });
    g.translate(0, mm(0.8), 0); head.add(at(mesh(g, X.gimbal), 0, 0, FZ + mm(3.5)));
    for (let k = 0; k < 8; k++) { head.add(at(mesh(new THREE.BoxGeometry(mm(1.2), mm(3), mm(4)), X.gimbalDark), mm(-12.6 + k * 3.6), mm(31.8), FZ + mm(4)));   // 上縁と下縁の放熱フィン
      head.add(at(mesh(new THREE.BoxGeometry(mm(1.2), mm(3), mm(4)), X.gimbalDark), mm(-12.6 + k * 3.6), mm(-35.4), FZ + mm(4))); }
    for (let k = 0; k < 9; k++) head.add(at(mesh(new THREE.BoxGeometry(mm(1.4), mm(30), mm(4)), X.gimbalDark), mm(-14.4 + k * 3.6), mm(-2), FZ + HD + mm(6.6)));   // 背面の縦のフィン
  }
  // 前面の窓。4T と 4E で枠の組み方が違うので、前面の板ごと2枚作って切り替える
  const faceT = new THREE.Group(), faceE = new THREE.Group(); head.add(faceT, faceE); faceE.visible = false;
  const FF = FZ - mm(0.3);
  const frame = (grp, w, h, r, x, y, mat = X.window) => grp.add(at(mesh(rboxGeo(mm(w), mm(h), mm(1.6), mm(r), 3), mat), mm(x), mm(y), FF));
  const lens = (r, glass, ringMat) => { const g = new THREE.Group();
    g.add(mesh(cylGeo(r + mm(1.6), r + mm(1.6), mm(2.4), 40, true).rotateX(Math.PI / 2), ringMat || X.lensRing));
    g.add(at(mesh(new THREE.CircleGeometry(r + mm(0.2), 32).rotateY(Math.PI), X.lensBack), 0, 0, mm(1)));
    const gl = mesh(new THREE.SphereGeometry(r, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), glass || M.lens); gl.scale.y = 0.3; gl.rotation.x = -Math.PI / 2; at(gl, 0, 0, mm(-0.8)); g.add(gl);
    return g; };
  const glowRing = (r, col) => { const gl = at(mesh(new THREE.TorusGeometry(r, mm(0.6), 8, 48), new THREE.MeshBasicMaterial({ color: col, toneMapped: false })), 0, 0, mm(-1.8)); gl.visible = false; gl.renderOrder = 9; return noPart(gl); };
  // 4T（CAD）: 左上（機体の右）サーマル・右上 中望遠・中段 望遠と広角・下段 レーザー（乳白）と NIR（白）
  frame(faceT, 17.5, 16.5, 6, 13.5, 16.2); frame(faceT, 23, 15, 3, -12.4, 15.6); frame(faceT, 22, 22.5, 3, 7.6, -4.3); frame(faceT, 21, 21, 10.4, -15.5, -4.6);
  frame(faceT, 27.5, 10, 3, 7.8, -23.3); frame(faceT, 12.4, 12.4, 6.1, -15.9, -23.9);
  // 4E（取説の図と写真・推定）: 右上（機体の右）に丸い望遠の鏡筒、左上に中望遠、下に縦長のレーザーと大きな四角い広角
  faceE.add(at(mesh(cylGeo(mm(12.5), mm(12.5), mm(5), 48).rotateX(Math.PI / 2), X.gimbal), mm(13.5), mm(14.5), FF - mm(2)));
  frame(faceE, 20, 17, 4, -12.5, 18.5); frame(faceE, 10.5, 24, 3, 16.5, -9.5); frame(faceE, 30, 29, 4, -6.5, -8.5);
  for (let k = 0; k < 4; k++) faceE.add(at(mesh(new THREE.BoxGeometry(mm(1.2), mm(3), mm(4)), X.gimbalDark), mm(-22 + k * 3.6), mm(31.8), FZ + mm(4)));
  // レンズ（部品）。共通の3つは機種で位置を動かす（m4SetVariant）
  const L = {};
  const addLens = (key, part, r, glass, col, variantLook) => { const g = new THREE.Group(); g.add(variantLook || lens(mm(r), glass)); const glow = glowRing(mm(r + 2.2), col); g.add(glow); g.userData.glow = glow; head.add(g); L[key] = g; g.userData.partKey = part; return g; };
  addLens('thermal', 'thermal', 6.6, X.irGlass, X.fov.ir); addLens('wideT', 'camWideT', 5.2, null, X.fov.wide); addLens('wideE', 'camWideE', 6.2, null, X.fov.wide);
  addLens('mid', 'camMid', 5.4, null, X.fov.mid); addLens('tele', 'camTele', 8.2, null, X.fov.tele);
  { const g = new THREE.Group(); const w1 = at(mesh(rboxGeo(mm(25), mm(7.6), mm(1.2), mm(2.4)), X.milky), 0, 0, mm(-0.4)); const w2 = at(mesh(rboxGeo(mm(8.4), mm(21.6), mm(1.2), mm(2.4)), X.milky), 0, 0, mm(-0.4)); w2.visible = false; g.add(w1, w2); g.userData.looks = { t: w1, e: w2 };
    const glow = glowRing(mm(9), 0xff3b30); g.add(glow); g.userData.glow = glow; head.add(g); L.laser = g; }
  { const g = new THREE.Group(); g.add(at(mesh(cylGeo(mm(5.2), mm(5.2), mm(1.2), 32).rotateX(Math.PI / 2), X.milky), 0, 0, mm(-0.4))); head.add(g); L.nir = g; }
  const lensPos = (g, xy, dz = 0) => g.position.set(mm(xy[0]), mm(xy[1]), FF - mm(0.6) + dz);
  lensPos(L.thermal, M4_FACE.t.thermal); lensPos(L.wideT, M4_FACE.t.wide); lensPos(L.nir, M4_FACE.t.nir); lensPos(L.wideE, M4_FACE.e.wide); L.wideE.visible = false;
  for (const k of ['mid', 'tele', 'laser']) lensPos(L[k], M4_FACE.t[k]);
  reg(L.thermal, 'thermal', V3(0.006, 0.004, -0.05), { label: V3(0, 0, -0.004) }); reg(L.wideT, 'camWideT', V3(-0.006, 0, -0.05), { label: V3(0, 0, -0.004) }); reg(L.wideE, 'camWideE', V3(-0.006, 0, -0.05), { label: V3(0, 0, -0.004) });
  reg(L.mid, 'camMid', V3(-0.006, 0.004, -0.05), { label: V3(0, 0, -0.004) }); reg(L.tele, 'camTele', V3(0.006, 0, -0.05), { label: V3(0, 0, -0.004) });
  reg(L.laser, 'laser', V3(0.004, -0.006, -0.05), { label: V3(0, 0, -0.004) }); reg(L.nir, 'nir', V3(-0.004, -0.006, -0.05));
  reg(gim, 'gimbal', V3(0, -0.02, -0.1), { coarse: true, label: P(40, -0.8, -119.6).sub(PANC) });
  // ジンバルプロテクター（畳んだときにかぶせる。部品には数えない）
  const protector = new THREE.Group(); protector.visible = false;
  { const g = new THREE.ExtrudeGeometry(polyShape([[-0.030, 0.036], [0.030, 0.036], [0.040, 0.026], [0.040, -0.030], [0.030, -0.040], [-0.030, -0.040], [-0.040, -0.030], [-0.040, 0.026]]), { depth: 0.050, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.003, bevelSegments: 3 });
    g.translate(0, 0, -0.0265); protector.add(mesh(g, X.protector)); }   /* 頭（チルト軸の前22mm〜後ろ29mm）をすっぽり覆う */
  protector.position.copy(TILT); sg.add(noPart(protector));

  // ---------- アーム ×4（CAD）----------
  // 前アームは胴の中ほどの高さから横へ・前へ約26°、先へ向かって約5°下がる。後アームは下胴の後ろ寄りから後ろへ約37°、ほぼ水平。
  // 前のモーターは後ろより約9mm高い。4本の脚の先で接地する（4点着地）
  const R_PROP = 137.2;   // 10.8インチの半径（mm）
  const pScale = R_PROP / 1000 / 0.152;
  const PG = { bCCW: propGeometry(1, [0]).scale(pScale, 0.85, pScale), bCW: propGeometry(-1, [0]).scale(pScale, 0.85, pScale), fCCW: propGeometry(1).scale(pScale, 0.85, pScale), fCW: propGeometry(-1).scale(pScale, 0.85, pScale) };
  // 並びは M1前右 M2後右 M3後左 M4前左（550クラスと同じ）。回転方向は公式に記載がないので、M1 を反時計回りとする一般的な例。
  // A/B の印（取説）: 右前と左後が A（ハブの中心に白い丸）、左前と右後が B
  const ARMS = [
    { id: 'M1', front: true, sx: 1, hinge: [51, 16, -55], motor: [179.5, 0, -114.5], podTop: -3, dir: 1, mark: 'A' },
    { id: 'M2', front: false, sx: 1, hinge: [40, 0, 78], motor: [156.5, -8, 165.5], podTop: -11, dir: -1, mark: 'B' },
    { id: 'M3', front: false, sx: -1, hinge: [-40, 0, 78], motor: [-156.5, -8, 165.5], podTop: -11, dir: 1, mark: 'A' },
    { id: 'M4', front: true, sx: -1, hinge: [-51, 16, -55], motor: [-179.5, 0, -114.5], podTop: -3, dir: -1, mark: 'B' },
  ];
  const folds = [];
  ARMS.forEach((A, k) => {
    const h = P(...A.hinge), m = P(A.motor[0], A.podTop, A.motor[2]), d = V3().subVectors(m, h), len = Math.hypot(d.x, d.z), yaw = Math.atan2(-d.z, d.x), rise = Math.atan2(d.y, len);
    const ag = new THREE.Group(); ag.position.copy(h); ag.rotation.y = yaw; sg.add(ag);
    const fg = new THREE.Group(); ag.add(fg);
    const arm = new THREE.Group();
    // 腕: 角丸の断面 約13×11mm（付け根がやや太い）
    { const L0 = Math.hypot(len, d.y), g = new THREE.CylinderGeometry(mm(5.6), mm(6.6), L0 - mm(14), 28, 1).rotateZ(-Math.PI / 2).scale(1, 0.9, 1.12).translate((L0 - mm(14)) / 2 + mm(4), 0, 0).rotateZ(rise); arm.add(mesh(g, X.arm)); }
    arm.add(at(mesh(rboxGeo(mm(A.front ? 30 : 26), mm(A.front ? 22 : 20), mm(A.front ? 26 : 24), mm(7)), X.shell), mm(2), 0, 0));   // 付け根のヒンジ（胴の脇の膨らみ）
    const podR = A.front ? 15 : 14.5;
    const pod = mesh(lathe([[0, mm(-9)], [mm(podR - 4), mm(-9)], [mm(podR), mm(-5)], [mm(podR), mm(-0.5)], [mm(podR - 1), 0], [0, 0]], 40), X.arm); at(pod, len, d.y, 0); arm.add(pod);
    fg.add(arm); reg(arm, A.front ? 'frontArm' : 'rearArm', V3(0.05, 0, 0), { label: (A.front && k === 0) || (!A.front && k === 1) ? V3(len * 0.55, d.y * 0.55 + 0.009, 0) : null });
    const wg = new THREE.Group(); at(wg, len, d.y, 0); wg.rotation.y = -yaw; fg.add(wg);   // 機体の向きにそろえた入れ物（LED・脚）
    // モーター（黒いベル Ø約27mm・CAD）
    const mg = new THREE.Group(); mg.name = 'motor'; at(mg, len, d.y, 0); fg.add(mg);
    const core = new THREE.Group(); core.scale.set(0.78, 0.6, 0.78); mg.add(core);
    const base = new THREE.Group(); base.add(mesh(cylGeo(0.0105, 0.0105, 0.004).translate(0, 0.002, 0), M.aluDark)); base.add(mesh(hardLathe([[0.0046, 0.004], [0.0052, 0.004], [0.0052, 0.022], [0.0046, 0.022], [0.0046, 0.004]], 32), M.aluDark)); core.add(base); reg(base, 'motorBase', V3(0, 0, 0));
    const stator = at(mesh(G.teeth, M.lamination), 0, 0.013, 0); stator.castShadow = false; core.add(stator); reg(stator, 'stator', V3(0, 0.04, 0));
    const coils = at(mesh(G.coils, M.copper), 0, 0.013, 0); coils.castShadow = false; core.add(coils); reg(coils, 'winding', V3(0, 0.04, 0));
    const mags = at(mesh(G.magnets, M.magnet), 0, 0.013, 0); mags.castShadow = false; core.add(mags); reg(mags, 'magnet', V3(0, 0.10, 0));
    const bell = new THREE.Group(); bell.add(at(mesh(G.bellWall, X.bell), 0, 0.005, 0)); bell.add(at(mesh(G.bellTop, X.bell), 0, 0.0295, 0));
    bell.add(at(mesh(new THREE.TorusGeometry(0.0177, 0.0007, 6, 48).rotateX(Math.PI / 2), X.gimbal), 0, 0.009, 0));   // 下寄りの細い帯
    core.add(bell); reg(bell, 'bell', V3(0, 0.10, 0));
    const shaft = new THREE.Group(); shaft.add(at(mesh(cylGeo(0.002, 0.002, 0.036, 16), M.steel), 0, 0.016, 0)); shaft.add(at(mesh(G.bearing, M.steel), 0, 0.005, 0)); core.add(shaft); reg(shaft, 'shaft', V3(0, 0.10, 0));
    // プロペラ（クイックリリース・羽根は根元で折れる）。取付座の上が回転面
    const PY = mm(A.front ? 25.5 : 26.5);
    const propG = new THREE.Group(); propG.name = 'prop'; at(propG, 0, PY, 0); mg.add(propG);
    const hubCap = mesh(cylGeo(mm(10.5), mm(11.5), mm(7), 32), X.bell); at(hubCap, 0, mm(-3), 0); propG.add(hubCap);
    if (A.mark === 'A') propG.add(at(mesh(cylGeo(mm(2.6), mm(2.6), mm(0.6), 20), X.propDot), 0, mm(0.6), 0));   // A の白い丸（取説）
    const blades = [], hinges = [];
    for (const s of [1, -1]) {
      const hg = new THREE.Group(); at(hg, s * 0.011, 0, 0);
      const bl = mesh(A.dir > 0 ? PG.bCCW : PG.bCW, X.prop); if (s < 0) bl.rotation.y = Math.PI; bl.position.x = s > 0 ? -0.011 : 0.011;
      hg.add(bl); propG.add(hg); blades.push(bl); hinges.push({ g: hg, s });
    }
    const ghosts = [0, 1].map(() => { const gm = X.prop.clone(); gm.transparent = true; gm.opacity = 0.35; gm.depthWrite = false;
      const gh = new THREE.Mesh(A.dir > 0 ? PG.fCCW : PG.fCW, gm); gh.visible = false; gh.userData.noPart = true; gh.userData.noPick = true; propG.add(gh); return gh; });
    reg(propG, 'prop', V3(0.04, 0.09, 0), { label: k === 3 ? V3(0.09, 0.004, 0) : null });
    const disc = new THREE.Mesh(new THREE.CircleGeometry(mm(R_PROP), 64), (A.dir > 0 ? M.propDiscCCW : M.propDiscCW).clone()); disc.rotation.x = -Math.PI / 2; disc.userData.noAO = true; at(disc, 0, PY, 0);
    disc.renderOrder = 5; disc.userData.noPart = true; disc.userData.noPick = true; mg.add(disc);
    const mp = reg(mg, 'motor', V3(0.04, 0.06, 0), { coarse: true, label: k === 0 ? V3(0, 0.02, 0) : null });
    // 脚（アンテナ内蔵）: ポッドの下から先細りの板が地面へ。前脚は内側へ約14°傾く（CAD）
    const lg = new THREE.Group(); wg.add(lg);
    { const top = mm(-8), tipY = LEG_Y - m.y + mm(0.5), H = top - tipY;
      const sh = polyShape([[mm(-9), 0], [mm(9), 0], [mm(4), -H], [mm(-3.5), -H]]);
      const lgeo = new THREE.ExtrudeGeometry(sh, { depth: mm(6.4), bevelEnabled: true, bevelThickness: mm(1.4), bevelSize: mm(1.4), bevelSegments: 2, curveSegments: 4 });
      lgeo.translate(0, 0, -mm(3.2)); lgeo.rotateY(-Math.PI / 2);   // 形は z(前後)×y、厚みは x
      const splay = new THREE.Group(); at(splay, 0, top, 0); splay.rotation.z = A.front ? -A.sx * 0.24 : 0; lg.add(splay);
      splay.add(mesh(lgeo, X.shell));
      splay.add(at(mesh(new THREE.SphereGeometry(mm(3.2), 14, 10).scale(1, 0.7, 1.4), M.rubber), 0, -H - mm(0.6), mm(0.2)));
    }
    reg(lg, 'landingGear', V3(0, -0.03, 0), { label: k === 0 ? V3(-0.006, -0.03, 0) : null }); legs.push({ group: lg, sx: A.sx, pivots: [] });
    if (A.front) {   // フロントLED: 前ポッドの前面、モーターのすぐ下（左右とも・公式写真）
      const led = new THREE.Group(); at(led, A.sx * -0.004, mm(-5), mm(-15)); wg.add(led);
      led.add(mesh(rboxGeo(mm(11), mm(5), mm(2.4), mm(1.6)), M.ledCover)); led.add(at(mesh(new THREE.BoxGeometry(mm(9), mm(3.4), mm(1)), M.ledRed), 0, 0, mm(-0.6)));
      const core2 = new THREE.Sprite(M.glowCore(0xff2a1f)); core2.scale.set(0.008, 0.008, 1); core2.position.z = -0.003; core2.renderOrder = 6; led.add(core2);
      const halo = new THREE.Sprite(M.glowHalo(0xff2a1f)); halo.scale.set(0.020, 0.020, 1); halo.position.z = -0.004; halo.renderOrder = 6; led.add(halo);
      reg(led, 'led', V3(0, -0.01, -0.03), { label: k === 0 ? V3(0, 0, -0.004) : null }); led.userData.halo = halo; led.userData.core = core2; halo.userData.baseColor = halo.material.color.clone();
    } else {   // 機体ステータスインジケーター: 後ポッドの外側の先端
      const st = new THREE.Group(); at(st, A.sx * mm(10), mm(-6), mm(8)); st.rotation.y = A.sx * 0.9; wg.add(st);
      st.add(mesh(rboxGeo(mm(7), mm(3.4), mm(2.4), mm(1)), M.ledCover)); const lamp = at(mesh(new THREE.BoxGeometry(mm(5.6), mm(2.2), mm(1)), M.ledGreen), 0, 0, mm(-0.8)); st.add(lamp);
      const sp = reg(st, 'statusLed', V3(A.sx * 0.02, -0.02, 0.02), { label: k === 1 ? V3(0, -0.004, 0) : null }); sp.lamp = lamp;
    }
    if (k === 3) {   // 左前アームの外側の側面に「Matrice 4」（公式写真）
      const t = plane(mm(34), mm(4.8), X.brand); t.rotation.set(0, Math.PI, 0); const mid = len * 0.32; at(t, mid, Math.sin(rise) * mid, mm(7.6)); t.rotation.z = -rise; t.userData.noPick = true; arm.add(t);
    }
    const ua = new THREE.Group(); ua.position.set(0, PY, 0); ua.scale.setScalar(1 / K); mg.add(ua);
    const mo = { group: mg, prop: propG, propMesh: blades[0], blades, hinges, ghosts, disc, bell, mags, shaft, adapter: hubCap, dir: A.dir, arm: ag, id: A.id, u: V3(m.x, 0, m.z), part: mp, arrowAnchor: ua, front: A.front, sx: A.sx, fold: fg, yaw };
    // たたみ方（取説の図）: 前アームは付け根のほぼ垂直な軸で水平に後ろへ（モーターは上向きのまま、脚の先が少し上がる）。
    // 後アームは「今の向き＋畳んだ向き」の二等分の水平軸で下へ振り下ろして前へ半回転（モーターが逆さ・脚が上）
    let flip = null, swing = null;
    if (A.front) { const d0 = Math.atan2(-d.z, d.x), dT = Math.atan2(-1, A.sx * 0.06); swing = { ang: Math.atan2(Math.sin(dT - d0), Math.cos(dT - d0)) }; }
    else { const d0 = V3(d.x, 0, d.z).normalize(), dT = V3(A.sx * 0.10, 0, -1).normalize(), ax = d0.clone().add(dT).normalize().applyAxisAngle(UP, -yaw);
      const test = V3(1, 0, 0).applyAxisAngle(ax, Math.PI / 2); flip = { axis: ax, sign: test.y < 0 ? 1 : -1 }; }
    motors.push(mo); folds.push({ fg, front: A.front, sx: A.sx, yaw, len, rise, flip, swing });
  });

  // ---------- 別売アクセサリー（E-Port に付ける。付けていないときは見せない）----------
  const acc = { spot: new THREE.Group(), spk: new THREE.Group() };
  { const s = acc.spot; const top = lidTop(-50);
    s.add(box(80, 6, 63, 3, X.lid, 0, top + 3, -53));   // ブラケット（E-Port に差して手締めねじ2本）
    const lamps = [];
    for (const sx of [-1, 1]) { const lp = new THREE.Group(); atP(lp, sx * 62.5, 82, -86); s.add(lp);
      lp.add(at(mesh(cylGeo(mm(19), mm(19), mm(40), 40).rotateX(Math.PI / 2), X.lid), 0, 0, 0));
      for (let k = 0; k < 6; k++) lp.add(at(mesh(new THREE.TorusGeometry(mm(19.2), mm(0.7), 6, 40), X.shell), 0, 0, mm(6 + k * 2.4)));
      lp.add(at(mesh(new THREE.CircleGeometry(mm(17), 40).rotateY(Math.PI), X.milky), 0, 0, mm(-20.2)));
      s.add(atP(mesh(rboxGeo(mm(30), mm(10), mm(26), mm(3)), X.lid), sx * 38, top + 8, -82)); lamps.push(lp); }
    s.userData.lamps = lamps;
    const beam = new THREE.Mesh(new THREE.ConeGeometry(Math.tan(THREE.MathUtils.degToRad(11.5)) * 1.2, 1.2, 40, 1, true), X.spotBeam); beam.rotation.x = -Math.PI / 2; beam.position.set(0, 0, -0.62); beam.renderOrder = 8;
    for (const lp of lamps) { const b = beam.clone(); lp.add(noPart(b)); b.visible = false; }
  }
  { const s = acc.spk; s.add(at(mesh(rboxGeo(mm(70), mm(50), mm(70), mm(9)), X.lid), 0, 0, 0)); s.add(at(mesh(rboxGeo(mm(54), mm(14), mm(2), mm(4)), X.dark), 0, mm(-12), mm(-35.2)));
    const t = plane(mm(18), mm(7.8), X.djiLogo); t.rotation.x = -Math.PI / 2; at(t, 0, mm(25.2), mm(4)); t.userData.noPick = true; s.add(t); }
  for (const k of ['spot', 'spk']) { acc[k].visible = false; sg.add(acc[k]); }
  reg(acc.spot, 'spotlight', V3(0, 0.08, 0), { label: P(62, 104, -86) }); reg(acc.spk, 'speaker', V3(0, 0.12, 0), { label: V3(0, 0.026, 0) });

  // ---------- 説明用の重ね絵（画角・検知範囲・測距。部品には数えない）----------
  const fovG = new THREE.Group(); fovG.visible = false; head.add(fovG);
  const frustum = (fovDeg, len, col, aspect = [0.8, 0.6]) => { const dg = Math.tan(THREE.MathUtils.degToRad(fovDeg / 2)) * len, a = dg * aspect[0], b = dg * aspect[1];   /* 公式のFOVを対角とみなす */
    const g = new THREE.ConeGeometry(Math.hypot(a, b), len, 4, 1, true); g.rotateY(Math.PI / 4); g.scale(a / Math.hypot(a, b) * Math.SQRT2, 1, b / Math.hypot(a, b) * Math.SQRT2); g.rotateX(Math.PI / 2); g.translate(0, 0, -len / 2 - 0.003);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.17, depthWrite: false, side: THREE.DoubleSide })); m.renderOrder = 7; return m; };
  const cones = { wideT: frustum(82, 0.55, X.fov.wide), wideE: frustum(84, 0.55, X.fov.wide), mid: frustum(35, 0.75, X.fov.mid), tele: frustum(15, 0.95, X.fov.tele), thermal: frustum(45, 0.65, X.fov.ir, [0.781, 0.625]) };
  for (const k of Object.keys(cones)) { cones[k].position.copy(L[k].position); fovG.add(cones[k]); }
  const nirBeam = new THREE.Mesh(new THREE.ConeGeometry(Math.tan(THREE.MathUtils.degToRad(2.85)) * 1.1, 1.1, 24, 1, true), X.nirBeam); nirBeam.rotation.x = -Math.PI / 2; nirBeam.position.copy(L.nir.position).add(V3(0, 0, -0.55)); nirBeam.visible = false; fovG.add(nirBeam);
  fovG.userData.cones = cones; fovG.userData.nir = nirBeam; noPart(fovG);
  const senseG = new THREE.Group(); senseG.visible = false; sg.add(senseG);
  { const S2 = 1 / 45;   // 実際の測定範囲(m)を 1/45 にした概念図
    const sector = (r, phi0, dphi, th0, dth) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 36, 18, phi0, dphi, th0, dth), X.sense); m.renderOrder = 7; return m; };
    const D2R = THREE.MathUtils.degToRad;
    const fr = sector(22.5 * S2, D2R(270 - 45), D2R(90), D2R(90 - 67.5), D2R(135)); fr.position.copy(P(0, 50, -121)); senseG.add(fr);   // 前: 0.4〜22.5m・水平90°×垂直135°（公式）
    const bk = sector(22.5 * S2, D2R(90 - 45), D2R(90), D2R(90 - 67.5), D2R(135)); bk.position.copy(P(0, 50, 80)); senseG.add(bk);
    const rt = sector(32 * S2, D2R(180 - 45), D2R(90), D2R(45), D2R(90)); rt.position.copy(P(44, 50, -20)); senseG.add(rt);   // 横: 0.5〜32m・90°×90°
    const lt = sector(32 * S2, D2R(-45), D2R(90), D2R(45), D2R(90)); lt.position.copy(P(-44, 50, -20)); senseG.add(lt);
    const dn = sector(18.8 * S2 * 0.3, 0, Math.PI * 2, D2R(180 - 80), D2R(80)); dn.position.copy(P(0, -26, 22)); senseG.add(dn);   // 下: 0.3〜18.8m・160°（図はさらに縮めた）
    noPart(senseG); }
  // レーザー距離計の光線（先の目標は m4ui.js が置く）
  const laserBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 1, 10, 1, true).rotateX(Math.PI / 2).translate(0, 0, -0.5), X.beam); laserBeam.visible = false; laserBeam.renderOrder = 9; L.laser.add(noPart(laserBeam));

  // ---------- 矢印 ----------
  const arrows = { thrust: [], rot: [], move: null, yaw: null };
  motors.forEach(mo => {
    const th = arrowMesh(0xffffff, 0.06, 0.0035); th.position.set(0, 0.012, 0); th.visible = false; mo.arrowAnchor.add(th); arrows.thrust.push(th);
    const rot = rotationArc(mo.dir, 0.05); rot.position.set(0, 0.012, 0); rot.visible = false; mo.arrowAnchor.add(rot); arrows.rot.push(rot);
  });
  const move = arrowMesh(0xef6a2d, 0.14, 0.005); move.visible = false; root.add(move); arrows.move = move;
  const yawA = rotationArc(-1, 0.24); yawA.position.set(0, -0.02, 0); yawA.visible = false; root.add(yawA); arrows.yaw = yawA;
  const cgMarker = new THREE.Group(); cgMarker.visible = false; root.add(cgMarker);

  return { root, sg, halfSpan: 0.33, focusMin: 0.27, parts, pick, wires, motors, legs, arrows, batPart, G, cgMarker, personGroup: null, folds,
    gimbalParts: { pan, roll, tilt, head, yoke, lens: L, faceT, faceE }, fovG, senseG, acc, laserBeam, protector,
    rotor: { R: mm(R_PROP) * K, y0: mm(25.5) }, moveR: 0.27, moveY: 0.05, rpmScale: 1.05 };
}
