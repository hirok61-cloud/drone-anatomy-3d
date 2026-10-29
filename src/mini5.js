// ===== DJI Mini 5 Pro の手続き生成 =====
// 寸法は実寸・等倍。公式値: 折りたたみ 157×95×68mm、展開 304×380×91mm（プロペラあり）、プロペラ 6.0インチ。
// 公式の3Dモデル・寸法図は公開されていないので、形は公式の製品写真と取説の図から読んだ値（docs/reference/2026-10-29-mini5pro-shape.md、平面±3%・高さ±5mm程度）。
// 座標は仕様書の mm（原点＝胴の中心、x=右・y=上・z=後ろ、機首=−Z）を mn5P() で m に直す。前脚の先 y=−63 が床に来るよう入れ物ごと下げる。
const mn5P = (x, y, z) => V3(x / 1000, y / 1000, z / 1000);
function mn5Materials(M) {
  const phy = (o) => new THREE.MeshPhysicalMaterial(o), std = (o) => new THREE.MeshStandardMaterial(o);
  const decal = (c) => std({ map: canvasTex(c, { wrap: false }), roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const decalT = (c) => std({ map: canvasTex(c, { wrap: false }), roughness: 0.6, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const sans = '-apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif';
  const propCanvas = () => pd6bCanvas(256, 1024, (g, w, h) => {
    g.fillStyle = '#2e2e2e'; g.fillRect(0, 0, w, h);   /* 濃いグレーの羽根、先端約8mmがオレンジ（写真） */
    g.fillStyle = 'rgba(255,255,255,0.04)'; for (let y = 0; y < h; y += 6) g.fillRect(0, y, w, 1);
    g.fillStyle = '#e0843a'; g.fillRect(0, 0, w, h * 0.105);   /* キャンバスの上端＝羽根の先（CanvasTexture は上下が反転して v=1 が上端） */
  });
  const propMat = () => Object.assign(phy({ map: canvasTex(propCanvas(), { wrap: false }), roughness: 0.55, metalness: 0, clearcoat: 0.3, clearcoatRoughness: 0.4, side: THREE.DoubleSide }), { userData: { flatTint: true } });
  const txt = (w, h, lines, font, col = '#c8c8c8', bg = null) => pd6bCanvas(w, h, (g, W, H) => { if (bg) { g.fillStyle = bg; g.fillRect(0, 0, W, H); } g.fillStyle = col; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; lines.forEach((l, i) => g.fillText(l, W / 2, H * (i + 0.5) / lines.length + 2)); });
  return {
    shell: phy({ color: 0x8a8a8a, metalness: 0.04, roughness: 0.66, clearcoat: 0.12, clearcoatRoughness: 0.6 }),   /* 本体の灰・細かいシボのマット（写真） */
    shellLight: phy({ color: 0x969696, metalness: 0.04, roughness: 0.62 }),
    dark: phy({ color: 0x242424, metalness: 0.1, roughness: 0.6 }),
    gimbal: phy({ color: 0x1e1e1e, metalness: 0.2, roughness: 0.4, clearcoat: 0.4, clearcoatRoughness: 0.3 }),   /* カメラ頭は黒の半つや */
    gimbalMatte: phy({ color: 0x2a2a2a, metalness: 0.1, roughness: 0.7 }),
    bell: phy({ color: 0x161616, metalness: 0.35, roughness: 0.38, clearcoat: 0.4, clearcoatRoughness: 0.3 }),
    glass: phy({ color: 0x07090d, roughness: 0.05, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, iridescence: 0.6, iridescenceIOR: 1.3 }),
    lensGlass: phy({ color: 0x0f1a15, roughness: 0.04, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.02, iridescence: 0.7, iridescenceIOR: 1.4 }),   /* 緑がかった反射（写真） */
    window: phy({ color: 0x0a0b0d, metalness: 0.3, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.06 }),
    lensRing: phy({ color: 0x1d1f23, metalness: 0.8, roughness: 0.3 }),
    lensBack: new THREE.MeshBasicMaterial({ color: 0x020305 }),
    orange: std({ color: 0xe0843a, roughness: 0.5 }),
    prop: propMat(),
    regLabel: decal(txt(512, 96, ['JU 1234 5678'], 'bold 60px "SF Mono", Menlo, monospace', '#17181b', '#f4f4f2')),
    brand: decalT(txt(512, 72, ['MINI 5 PRO'], `600 52px ${sans}`, '#c8c8c8')),
    djiLogo: decalT(txt(256, 112, ['dji'], `italic 700 92px ${sans}`, '#bdbdbd')),
    camText: decalT(txt(128, 128, ['E24', 'F1.8'], `700 46px ${sans}`, '#e6e6e6')),
    inchText: decalT(txt(256, 64, ['1-INCH'], `600 44px ${sans}`, '#e6e6e6')),
    plate: decalT(txt(256, 128, ['81dB', 'CE  Lwa'], `500 40px ${sans}`, '#a8a8a8')),
    protector: phy({ color: 0x4a4f57, roughness: 0.25, clearcoat: 0.5, transparent: true, opacity: 0.6, depthWrite: false }),
    fov: new THREE.MeshBasicMaterial({ color: 0xef6a2d, transparent: true, opacity: 0.17, depthWrite: false, side: THREE.DoubleSide }),
    fov48: new THREE.MeshBasicMaterial({ color: 0x3b7df7, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide }),
    sense: new THREE.MeshBasicMaterial({ color: 0x14b8a6, transparent: true, opacity: 0.10, depthWrite: false, side: THREE.DoubleSide }),
    lidarBeam: new THREE.MeshBasicMaterial({ color: 0xef6a2d, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }),
    irBeam: new THREE.MeshBasicMaterial({ color: 0xa06cf5, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }),
  };
}

function buildMini5(M) {
  const K = MN5_K, P = mn5P, mm = (v) => v / 1000, LEG_Y = -0.063;
  const root = new THREE.Group(); root.name = 'drone';
  const sg = new THREE.Group(); sg.name = 'mini5'; sg.scale.setScalar(K); sg.position.y = -0.158 - LEG_Y * K; root.add(sg);
  const parts = [], pick = [], wires = [], motors = [], legs = [];
  const G = motorGeometries(), X = mn5Materials(M);
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

  // ---------- 胴（断面 [z, 半幅, 上端, 下端, 上の丸み, 下の丸み]・mm。写真から読んだ値）----------
  // 前は広い「頭」（ジンバルの上にひさし。前端は左右の目の台と、間の放熱フィンのかたまりで別に作る）、真ん中がくびれ、後ろの肩でまた広がる。上面は前の肩が最も高く後ろへ下がる。
  // 下面は前の頭の下がジンバルの入る空き、真ん中が平らな底、後ろの下半分は電池（別部品）が底になる
  const BODY = [
    [-66, 37, 27.6, 13, 3.4, 3], [-62, 38, 28, 13, 3.4, 3.2], [-57, 38, 27.4, 12, 3.4, 3.2], [-53, 38, 27, -2, 3.4, 3.4],
    [-50, 37.8, 26.6, -26, 3.4, 3.6], [-44, 37, 26.2, -29, 3.4, 3.8], [-36, 35, 25.5, -29, 3.4, 3.8], [-25, 30.5, 24.6, -29, 3.4, 3.8], [-14, 27.5, 23.6, -29, 3.4, 3.8],
    [0, 27, 22, -29, 3.4, 3.8], [8, 27, 21.4, -27, 3.4, 3.6], [13, 27, 21, -10, 3.4, 3], [39, 27, 18.6, -10, 3.4, 3], [45, 33, 18, -10, 3.4, 3], [50, 37, 16.8, -10, 3.4, 3],
    [55, 38.5, 16, -10, 3.4, 3], [62, 33, 14.6, -10, 3.2, 3], [66, 29, 13.6, -10, 3, 2.8], [71, 19, 11.6, -9, 2.6, 2.6], [74.5, 7, 9, -6, 2.3, 2.3],
  ];
  const S0 = BODY.map(([z, w, t, b, nt, nb]) => [z / 1000, w / 1000, t / 1000, b / 1000, nt, nb]);
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
  const topAt = (zmm) => secAt(S0, zmm / 1000)[2] * 1000;   // その z の上面の高さ（mm）

  const bodyG = new THREE.Group();
  bodyG.add(mesh(loftGeo(S0), X.shell));
  // 上面の浅い2本の稜線（写真）
  for (const s of [-1, 1]) { const g = new THREE.Group(); for (let z = -62; z <= 58; z += 6) g.add(atP(mesh(new THREE.BoxGeometry(mm(1.2), mm(0.8), mm(6.4)), X.shellLight), s * 22, topAt(z) - 0.9, z)); bodyG.add(g); }
  // 前面の上の左右: 目の台（丸いふくらみ。外に魚眼、内に LiDAR の窓・写真）。間は谷になり、その奥に放熱フィンが見える
  for (const s of [-1, 1]) bodyG.add(box(27, 19, 24, 7.5, X.shell, s * 24.5, 20, -66));
  // 目の台の間の谷: 胴より前へ出た黒い縦の放熱フィンのかたまり（写真）。下はカメラの頭が上を向いても当たらない高さ
  { const fin = new THREE.Group(); fin.add(box(22, 14, 16, 2, X.gimbalMatte, 0, 19, -72)); for (let k = 0; k < 8; k++) fin.add(box(1.2, 13, 16, 0.3, X.dark, -9.1 + k * 2.6, 19.5, -72.6)); bodyG.add(fin);
    fin.add(box(27, 12, 3, 1.5, X.gimbalMatte, 0, 4, -56)); for (let k = 0; k < 10; k++) fin.add(box(1.1, 11, 3.2, 0.3, X.dark, -11.7 + k * 2.6, 4, -57.6)); }   // 頭の後ろ（ひさしの下）にも続く
  // 下ヒレ: 前アーム付け根のソケットの真下で、胴の頬の下端が三角にとがる（写真。畳んだ姿はここで机に触れる。名称は取説に無い）
  for (const s of [-1, 1]) { const sh = polyShape([[mm(-9), 0], [mm(9), 0], [mm(2), mm(-18)], [mm(-1), mm(-18)]]); const g = new THREE.ExtrudeGeometry(sh, { depth: mm(6), bevelEnabled: true, bevelThickness: mm(1), bevelSize: mm(1), bevelSegments: 2 });
    g.translate(0, 0, -mm(3)); g.rotateY(-Math.PI / 2); const m = mesh(g, X.shell); atP(m, s * 27, -21, -32); bodyG.add(m); }
  // 上面の後ろ: 黒い斜めの通気口2つ・dji ロゴ（写真）
  for (const s of [-1, 1]) { const v = box(7, 1.6, 26, 2.5, X.dark, s * 25, topAt(51) - 1.2, 51); v.rotation.z = s * -0.18; bodyG.add(v); for (let k = 0; k < 3; k++) { const l = box(6, 1.2, 1.4, 0.4, X.gimbalMatte, s * 25, topAt(42 + k * 8) - 0.8, 42 + k * 8); l.rotation.x = -0.5; bodyG.add(l); } }
  { const t = plane(mm(12), mm(5.2), X.djiLogo); t.rotation.x = -Math.PI / 2 + 0.06; atP(t, 0, topAt(45) + 0.3, 45); t.userData.noPick = true; bodyG.add(t); }
  // 底面: 前のスリット・銘板（写真）
  bodyG.add(box(20, 1, 2, 0.5, X.dark, 0, -29.3, -55));
  { const t = plane(mm(30), mm(15), X.plate); t.rotation.x = Math.PI / 2; atP(t, 0, -29.4, -2); t.userData.noPick = true; bodyG.add(t); }
  sg.add(bodyG); reg(bodyG, 'body', V3(0, 0, 0), { label: P(-30, 26, -10) });
  const rm = plane(mm(26), mm(5), X.regLabel); rm.rotation.y = -Math.PI / 2; atP(rm, -27.4, 6, 0); sg.add(rm); reg(rm, 'regMark', V3(-0.04, 0, 0));
  // 後ろの上面: 電源ボタンと残量LED4つ（取説の図・写真）
  const bled = new THREE.Group();
  bled.add(box(14, 1.6, 7, 2.5, X.shellLight, 0, topAt(62) + 0.2, 62));
  bled.userData.lamps = [];   // 残量LED（電源ボタンを1回押すと残量を示す・取説。図では4つとも点けて示す）
  for (let k = 0; k < 4; k++) { const l = atP(mesh(cylGeo(mm(0.8), mm(0.8), mm(0.8), 10), M.chip), -5.4 + k * 3.6, topAt(55) + 0.3, 55); bled.add(l); bled.userData.lamps.push(l); }
  sg.add(bled);
  // 後ろの面: USB-C と microSD（取説の図・写真）
  const ports = new THREE.Group(); ports.add(box(18, 7, 1, 2.5, X.dark, 0, -2.5, 73)); ports.add(box(8, 2.8, 1, 1.2, M.chip, -4.2, -2.5, 73.3)); ports.add(box(6.5, 1.4, 1, 0.5, M.chip, 4.8, -2.5, 73.3));
  sg.add(ports); reg(ports, 'ports', V3(0, 0.01, 0.04), { label: P(0, -2.5, 74) });

  // ---------- バッテリー（胴の後ろの下半分・後ろから差し込む）----------
  const bat = new THREE.Group();
  const shell = new THREE.Group(); bat.add(shell);
  shell.add(box(54, 19.6, 63, 5, X.shell, 0, -19.2, 43.5));
  shell.add(box(46, 14, 34, 3, X.shell, 0, -18, -2));   // 胴の中へ入る前の部分（外からは見えない。単体の写真で全長約94mm）
  shell.add(box(1.6, 0.6, 52, 0.3, X.dark, 0, -29.1, 44));   // 底の中央の溝（写真では底が左右2枚に分かれて見える）
  for (const s of [-1, 1]) shell.add(box(6, 2.4, 6, 1.5, X.dark, s * 22, -29.4, 71));   // 底の後ろ角の小さな足（接地点・写真）
  const cells = mesh(rboxGeo(mm(44), mm(13), mm(84), mm(3)), M.cell); atP(cells, 0, -18.5, 30); bat.add(cells);
  const buckle = new THREE.Group();
  for (const s of [-1, 1]) { const b = box(1.8, 13, 8, 0.8, X.dark, s * 27.3, -21, 64); for (let k = 0; k < 4; k++) b.add(at(mesh(new THREE.BoxGeometry(mm(0.6), mm(10), mm(0.8)), X.gimbalMatte), s * mm(0.9), 0, mm(-2.7 + k * 1.8))); buckle.add(b); }
  bat.add(buckle);
  sg.add(bat);
  reg(cells, 'cells', V3(0, 0, 0)); reg(buckle, 'batteryBuckle', V3(0, 0, 0)); reg(bled, 'batteryLed', V3(0, 0.03, 0.02));
  const batPart = reg(bat, 'battery', V3(0, -0.04, 0.09), { coarse: true, label: P(20, -20, 60) }); batPart.shell = shell;
  // 電池を抜いたときに見える差し込み口（部品には数えない）
  const bay = new THREE.Group();   // 電池を抜いたあとに見える所
  bay.add(box(50, 1, 60, 3, X.dark, 0, -10.6, 44)); bay.add(box(47, 15, 1.2, 3, X.lensBack, 0, -18, 12.4));   // 胴の下面の受けと、前の壁の差し込み穴
  bay.visible = false; sg.add(noPart(bay));

  // ---------- 内部の電装（位置は例）----------
  const fc = box(40, 4, 46, 1.5, M.aluBrushDark, 0, 14, -32); sg.add(fc); reg(fc, 'fc', V3(0, 0.07, -0.03), { label: V3(0, 0.003, 0) });
  const esc = atP(mesh(rboxGeo(mm(40), mm(3.5), mm(36), mm(1.5)), [M.pcbEdge, M.pcbEdge, M.pcbPDB, M.pcbEdge, M.pcbEdge, M.pcbEdge]), 0, 4, -6); sg.add(esc); reg(esc, 'esc', V3(0, 0.05, 0));
  const gnss = box(18, 3, 18, 1, M.gpsBody, 0, 15, 22); sg.add(gnss); reg(gnss, 'gnss', V3(0, 0.08, 0), { label: V3(0, 0.002, 0) });
  const rid = box(10, 3, 8, 1, M.plasticGray, 12, 10, 30); sg.add(rid); reg(rid, 'remoteId', V3(0.04, 0.05, 0));

  // ---------- センサー ----------
  const fish = (x, y, z, dir, key, label, r = 4.5) => {
    const v = new THREE.Group(); atP(v, x, y, z); v.quaternion.setFromUnitVectors(UP, dir.clone().normalize());
    v.add(at(mesh(cylGeo(mm(r + 1.5), mm(r + 1.9), mm(2.2), 28), X.dark), 0, -0.0006, 0));
    v.add(at(mesh(new THREE.TorusGeometry(mm(r + 0.6), mm(0.5), 8, 32).rotateX(Math.PI / 2), X.lensRing), 0, 0.0005, 0));
    const dome = mesh(new THREE.SphereGeometry(mm(r), 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), X.glass); dome.scale.y = 0.62; at(dome, 0, 0.0005, 0); v.add(dome);
    sg.add(v); reg(v, key, dir.clone().normalize().multiplyScalar(0.04), { label: label ? V3(0, 0.005, 0) : null }); return v; };
  fish(31.5, 20.5, -76.6, V3(0.55, 0.1, -0.83), 'vision', true); fish(-31.5, 20.5, -76.6, V3(-0.55, 0.1, -0.83), 'vision');   // 前面の左右（前向き・やや外・上）
  fish(31, topAt(-31) - 1.5, -31, V3(0.55, 0.83, 0.05), 'vision', false, 4); fish(-31, topAt(-31) - 1.5, -31, V3(-0.55, 0.83, 0.05), 'vision', false, 4);   // 肩の左右（斜め上・横向き）
  const lidar = new THREE.Group();   // 前向きLiDAR: 魚眼の内側の黒い長円の窓2つ（取説の図・写真）
  for (const s of [-1, 1]) { const w = mesh(new THREE.CylinderGeometry(mm(1), mm(1), mm(1.4), 24).rotateX(Math.PI / 2).scale(4, 3, 1), X.glass); atP(w, s * 17.5, 20, -78.4); lidar.add(w); }
  sg.add(lidar); reg(lidar, 'lidar', V3(0, 0, -0.03), { label: P(17.5, 20, -79) });
  fish(20, -29.6, -45, V3(0, -1, 0), 'visionDown', true, 3.5); fish(-20, -29.6, -45, V3(0, -1, 0), 'visionDown', false, 3.5);
  const ir = new THREE.Group(); ir.add(box(19, 1, 6, 3, X.dark, 0, -29.5, -42)); for (const s of [-1, 1]) ir.add(box(8, 0.8, 4.6, 2, X.glass, s * 4.6, -29.9, -42));
  sg.add(ir); reg(ir, 'ir3d', V3(0, -0.04, 0), { label: P(0, -30, -42) });
  const aux = new THREE.Group(); aux.add(atP(mesh(cylGeo(mm(4.5), mm(4.5), mm(1), 24), X.shellLight), 0, -29.5, -30)); aux.add(atP(mesh(cylGeo(mm(3), mm(3), mm(0.8), 20), M.ledWhite), 0, -30.1, -30));
  sg.add(aux); reg(aux, 'auxLight', V3(0, -0.04, 0.01));

  // ---------- ジンバル: 胴の下の支え → 下の縦の円筒（パン）→ U字のヨーク → 左右の円筒（チルト）→ 頭の中（ロール）→ カメラの頭 ----------
  // 軸の役割は形からの推定（仕様書 8.2）。頭は 35×30×26mm の黒い角丸の箱、前面に 19×16mm のレンズ枠
  const PANC = P(0, -29.5, -68), TILT = P(0, -8, -70);
  const mount = new THREE.Group();
  for (const s of [-1, 1]) { const a = box(4, 3, 24, 1.2, X.gimbal, s * 11, -30.5, -58); a.rotation.y = s * -0.35; mount.add(a); mount.add(atP(mesh(cylGeo(mm(2.2), mm(2.2), mm(3), 14), M.rubber), s * 18, -30, -48)); }
  mount.add(box(20, 2.5, 8, 1.2, X.gimbal, 0, -31.5, -66));
  sg.add(mount);
  const gim = new THREE.Group(); gim.position.copy(PANC); sg.add(gim);
  const pan = new THREE.Group(); gim.add(pan);
  pan.add(mesh(cylGeo(mm(8.5), mm(8.5), mm(7), 36), X.gimbal));   // パン（縦軸）のモーター。下端 y −33
  const yoke = new THREE.Group(); pan.add(yoke);
  { const ty = TILT.y - PANC.y, tz = TILT.z - PANC.z;
    yoke.add(at(mesh(rboxGeo(mm(58), mm(4.5), mm(14), mm(2.2)), X.gimbal), 0, mm(2.25), tz + mm(4)));   // ヨークの底（頭の下をくぐる）。頭を傾けても縦にしても角が当たらない高さ
    for (const s of [-1, 1]) yoke.add(at(mesh(rboxGeo(mm(5), ty - mm(4.5), mm(8), mm(2.5)), X.gimbal), s * mm(31.5), mm(4.5) + (ty - mm(4.5)) / 2, tz)); }
  const tilt = new THREE.Group(); tilt.position.copy(TILT).sub(PANC); pan.add(tilt);
  for (const s of [-1, 1]) { tilt.add(at(mesh(cylGeo(mm(7.5), mm(7.5), mm(6), 36).rotateZ(Math.PI / 2), X.gimbal), s * mm(31.5), 0, 0));   // 左右の円筒（チルト）
    tilt.add(at(mesh(cylGeo(mm(5), mm(5), mm(0.6), 28).rotateZ(Math.PI / 2), X.gimbalMatte), s * mm(34.7), 0, 0));
    tilt.add(at(mesh(rboxGeo(mm(8), mm(12), mm(10), mm(3)), X.gimbal), s * mm(24), mm(3), mm(6))); }   // 頭と円筒の間の耳（頭の後ろ半分の横。頭を縦にしても当たらない）
  const roll = new THREE.Group(); at(roll, 0, mm(3), 0); tilt.add(roll);   // ロールの軸は頭の中心（y −5・チルト軸より3mm上）を前後に通す
  const head = new THREE.Group(); roll.add(head);
  const FZ = mm(-13);   // 前面（チルト軸から）
  head.add(mesh(rboxGeo(mm(31), mm(30), mm(26), mm(7), 4), X.gimbal));
  head.add(at(mesh(rboxGeo(mm(19), mm(16), mm(1.2), mm(4), 3), X.gimbalMatte), 0, 0, FZ - mm(0.2)));   // レンズ枠（内側へ段差で凹む）
  head.add(at(mesh(rboxGeo(mm(16.5), mm(13.5), mm(0.8), mm(3), 3), X.window), 0, 0, FZ - mm(0.5)));
  for (const sx of [-1, 1]) for (let k = 0; k < 5; k++) head.add(at(mesh(new THREE.BoxGeometry(mm(1.2), mm(16), mm(1)), X.gimbalMatte), sx * mm(15.6), 0, mm(1 + k * 2.4)));   // 側面の後ろ半分の放熱リブ（写真）
  { const t = plane(mm(5), mm(5), X.camText); t.rotation.y = Math.PI; at(t, mm(12.4), mm(1), FZ - mm(0.15)); t.userData.noPick = true; head.add(t); }   // 「E24／F1.8」（レンズ枠の左＝機体の右）
  { const t = plane(mm(10), mm(2.5), X.inchText); t.rotation.y = Math.PI; at(t, 0, mm(-10.6), FZ - mm(0.15)); t.userData.noPick = true; head.add(t); }   // 「1-INCH」
  const lens = new THREE.Group(); at(lens, 0, 0, FZ - mm(0.9)); head.add(lens);
  lens.add(mesh(cylGeo(mm(7.4), mm(7.4), mm(1.6), 40, true).rotateX(Math.PI / 2), X.lensRing));
  lens.add(at(mesh(new THREE.CircleGeometry(mm(6.2), 32).rotateY(Math.PI), X.lensBack), 0, 0, mm(0.8)));
  { const gl = mesh(new THREE.SphereGeometry(mm(6), 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), X.lensGlass); gl.scale.y = 0.3; gl.rotation.x = -Math.PI / 2; at(gl, 0, 0, mm(-0.4)); lens.add(gl); }
  const glow = at(mesh(new THREE.TorusGeometry(mm(8.6), mm(0.5), 8, 48), new THREE.MeshBasicMaterial({ color: 0xef6a2d, toneMapped: false })), 0, 0, mm(-1)); glow.visible = false; glow.renderOrder = 9; lens.add(noPart(glow)); lens.userData.glow = glow;
  reg(lens, 'camMain', V3(0, 0, -0.03), { label: V3(0, 0, -0.003) });
  reg(gim, 'gimbal', V3(0, -0.02, -0.06), { coarse: true, label: P(34, -8, -70).sub(PANC) });
  // ストレージカバー（畳んだときにかぶせる。部品には数えない）
  const protector = new THREE.Group(); protector.visible = false;
  protector.add(mesh(rboxGeo(mm(74), mm(40), mm(34), mm(8)), X.protector)); protector.position.copy(P(0, -12, -70)); sg.add(noPart(protector));

  // ---------- アーム ×4（写真・取説の図）----------
  // 前アームは胴の前部の側面の低めからほぼ水平に外へ（21°前向き）、先に板状の脚。後アームは後部の側面の中ほどから斜め後ろへ（34°後ろ向き）、
  // 後ろのモーターは前より約15mm高い（推定）。後アームに脚は無く、ポッドの下にステータスLED
  const R_PROP = 76.2, pScale = R_PROP / 1000 / 0.152;
  const PG = { bCCW: propGeometry(1, [0]).scale(pScale, 0.7, pScale), bCW: propGeometry(-1, [0]).scale(pScale, 0.7, pScale), fCCW: propGeometry(1).scale(pScale, 0.7, pScale), fCW: propGeometry(-1).scale(pScale, 0.7, pScale) };
  // 並びは M1前右 M2後右 M3後左 M4前左。A（オレンジの印）= 右前・左後（取説の図）。回転方向は公式に記載がないので一般的な例
  const ARMS = [
    { id: 'M1', front: true, sx: 1, hinge: [37.5, -22, -27], motor: [116, -20, -59.6], dir: 1, mark: 'A' },
    { id: 'M2', front: false, sx: 1, hinge: [36, 0, 54], motor: [88.5, 3, 90.3], dir: -1, mark: 'B' },
    { id: 'M3', front: false, sx: -1, hinge: [-36, 0, 54], motor: [-88.5, 3, 90.3], dir: 1, mark: 'A' },
    { id: 'M4', front: true, sx: -1, hinge: [-37.5, -22, -27], motor: [-116, -20, -59.6], dir: -1, mark: 'B' },
  ];
  const folds = [];
  ARMS.forEach((A, k) => {
    const h = P(...A.hinge), m = P(...A.motor), d = V3().subVectors(m, h), len = Math.hypot(d.x, d.z), yaw = Math.atan2(-d.z, d.x), rise = Math.atan2(d.y, len);
    const ag = new THREE.Group(); ag.position.copy(h); ag.rotation.y = yaw; sg.add(ag);
    const fg = new THREE.Group(); ag.add(fg);
    const arm = new THREE.Group();
    { const L0 = Math.hypot(len, d.y), g = new THREE.CylinderGeometry(mm(5.2), mm(6), L0 - mm(10), 24, 1).rotateZ(-Math.PI / 2).scale(1, 0.92, 1.05).translate((L0 - mm(10)) / 2 + mm(2), 0, 0).rotateZ(rise); arm.add(mesh(g, X.shell)); }
    arm.add(at(mesh(cylGeo(mm(7), mm(7), mm(12), 28), X.shell), mm(1), 0, 0));   // 付け根の縦の筒（頬に埋まる。折りたたみのヒンジ）
    const pod = mesh(lathe([[0, mm(A.front ? -7 : -13)], [mm(9), mm(A.front ? -7 : -13)], [mm(10), mm(A.front ? -6 : -12)], [mm(10), mm(-0.5)], [mm(9.5), 0], [0, 0]], 36), X.shell); at(pod, len, d.y, 0); arm.add(pod);
    fg.add(arm); reg(arm, A.front ? 'frontArm' : 'rearArm', V3(0.035, 0, 0), { label: (A.front && k === 0) || (!A.front && k === 1) ? V3(len * 0.5, d.y * 0.5 + 0.007, 0) : null });
    const wg = new THREE.Group(); at(wg, len, d.y, 0); wg.rotation.y = -yaw; fg.add(wg);   // 機体の向きにそろえた入れ物
    // モーター（黒いベル Ø約18mm・高さ約8mm）
    const mg = new THREE.Group(); mg.name = 'motor'; at(mg, len, d.y, 0); fg.add(mg);
    const core = new THREE.Group(); core.scale.set(0.52, 0.29, 0.52); mg.add(core);
    const base = new THREE.Group(); base.add(mesh(cylGeo(0.0105, 0.0105, 0.004).translate(0, 0.002, 0), M.aluDark)); base.add(mesh(hardLathe([[0.0046, 0.004], [0.0052, 0.004], [0.0052, 0.022], [0.0046, 0.022], [0.0046, 0.004]], 32), M.aluDark)); core.add(base); reg(base, 'motorBase', V3(0, 0, 0));
    const stator = at(mesh(G.teeth, M.lamination), 0, 0.013, 0); stator.castShadow = false; core.add(stator); reg(stator, 'stator', V3(0, 0.03, 0));
    const coils = at(mesh(G.coils, M.copper), 0, 0.013, 0); coils.castShadow = false; core.add(coils); reg(coils, 'winding', V3(0, 0.03, 0));
    const mags = at(mesh(G.magnets, M.magnet), 0, 0.013, 0); mags.castShadow = false; core.add(mags); reg(mags, 'magnet', V3(0, 0.07, 0));
    const bell = new THREE.Group(); bell.add(at(mesh(G.bellWall, X.bell), 0, 0.005, 0)); bell.add(at(mesh(G.bellTop, X.bell), 0, 0.0295, 0)); bell.add(at(mesh(cylGeo(0.0118, 0.0118, 0.0012, 36), X.bell), 0, 0.0306, 0)); core.add(bell); reg(bell, 'bell', V3(0, 0.07, 0));
    const shaft = new THREE.Group(); shaft.add(at(mesh(cylGeo(0.002, 0.002, 0.036, 16), M.steel), 0, 0.016, 0)); shaft.add(at(mesh(G.bearing, M.steel), 0, 0.005, 0)); core.add(shaft); reg(shaft, 'shaft', V3(0, 0.07, 0));
    // プロペラ（クイックリリース・羽根は根元で折れる）。回転面はベル上面の約2mm上
    const PY = mm(10);
    const propG = new THREE.Group(); propG.name = 'prop'; at(propG, 0, PY, 0); mg.add(propG);
    const hubCap = mesh(rboxGeo(mm(26), mm(3), mm(8), mm(3.5)), X.gimbal); at(hubCap, 0, mm(-1.4), 0); propG.add(hubCap);   // 黒い長円のクリップ（写真）
    for (const s of [-1, 1]) propG.add(at(mesh(new THREE.ConeGeometry(mm(1.6), mm(3.2), 3).rotateZ(-s * Math.PI / 2), A.mark === 'A' ? X.orange : X.shellLight), s * mm(9), mm(0.2), 0));   // クリップの矢印（A=オレンジ・B=灰）
    const blades = [], hinges = [];
    for (const s of [1, -1]) {
      const hg = new THREE.Group(); at(hg, s * 0.011 * pScale * 1.6, 0, 0);
      const bl = mesh(A.dir > 0 ? PG.bCCW : PG.bCW, X.prop); if (s < 0) bl.rotation.y = Math.PI; bl.position.x = (s > 0 ? -0.011 : 0.011) * pScale * 1.6;
      hg.add(bl); propG.add(hg); blades.push(bl); hinges.push({ g: hg, s });
    }
    const ghosts = [0, 1].map(() => { const gm = X.prop.clone(); gm.transparent = true; gm.opacity = 0.35; gm.depthWrite = false;
      const gh = new THREE.Mesh(A.dir > 0 ? PG.fCCW : PG.fCW, gm); gh.visible = false; gh.userData.noPart = true; gh.userData.noPick = true; propG.add(gh); return gh; });
    reg(propG, 'prop', V3(0.03, 0.06, 0), { label: k === 3 ? V3(0.05, 0.003, 0) : null });
    const disc = new THREE.Mesh(new THREE.CircleGeometry(mm(R_PROP), 64), (A.dir > 0 ? M.propDiscCCW : M.propDiscCW).clone()); disc.rotation.x = -Math.PI / 2; disc.userData.noAO = true; at(disc, 0, PY, 0);
    disc.renderOrder = 5; disc.userData.noPart = true; disc.userData.noPick = true; mg.add(disc);
    const mp = reg(mg, 'motor', V3(0.03, 0.04, 0), { coarse: true, label: k === 0 ? V3(0, 0.012, 0) : null });
    if (A.front) {   // 前脚（アンテナ内蔵）: ポッドの外へ張り出してから板が真下へ下りる Γ字。下端は面取りだけ（写真・取説の図）
      const lg = new THREE.Group(); wg.add(lg);
      const top = mm(-6), tipY = LEG_Y - m.y + mm(0.5), H = top - tipY;
      const sh = polyShape([[mm(-7), 0], [mm(7), 0], [mm(6), -H + mm(3)], [mm(3), -H], [mm(-6), -H]]);
      const lgeo = new THREE.ExtrudeGeometry(sh, { depth: mm(6), bevelEnabled: true, bevelThickness: mm(1), bevelSize: mm(1), bevelSegments: 2, curveSegments: 4 });
      lgeo.translate(0, 0, -mm(3)); lgeo.rotateY(-Math.PI / 2);   // 形は z(前後)×y、厚みは x
      const st = new THREE.Group(); at(st, A.sx * mm(5), top, mm(1.5)); lg.add(st); st.add(mesh(lgeo, X.shell));
      lg.add(at(mesh(rboxGeo(mm(10), mm(7), mm(14), mm(2)), X.shell), A.sx * mm(2), top + mm(2), mm(1.5)));   // ポッドから脚の上端への張り出し
      reg(lg, 'landingGear', V3(0, -0.02, 0), { label: k === 0 ? V3(0, -0.03, 0) : null }); legs.push({ group: lg, sx: A.sx, pivots: [] });
    } else {   // 機体ステータスインジケーター: 後ろポッドの下の外・下向きの窓（取説の図）
      const st = new THREE.Group(); at(st, A.sx * mm(8), mm(-11.6), mm(4)); st.rotation.z = A.sx * 0.8; wg.add(st);
      st.add(mesh(rboxGeo(mm(8), mm(1.6), mm(6), mm(1.2)), M.ledCover)); const lamp = at(mesh(new THREE.BoxGeometry(mm(6.4), mm(0.8), mm(4.6)), M.ledGreen), 0, mm(0.3), 0); st.add(lamp);
      const sp = reg(st, 'statusLed', V3(A.sx * 0.015, -0.02, 0.01), { label: k === 1 ? V3(0, -0.004, 0) : null }); sp.lamp = lamp;
    }
    if (k === 3) {   // 左前アームの前側の面に「MINI 5 PRO」（写真。付け根から先へ読む）
      const t = plane(mm(26), mm(3.8), X.brand); const mid = len * 0.6; at(t, mid, Math.sin(rise) * mid, mm(5.95)); t.rotation.z = rise; t.userData.noPick = true; arm.add(t);
    }
    const ua = new THREE.Group(); ua.position.set(0, PY, 0); ua.scale.setScalar(1 / K); mg.add(ua);
    const mo = { group: mg, prop: propG, propMesh: blades[0], blades, hinges, ghosts, disc, bell, mags, shaft, adapter: hubCap, dir: A.dir, arm: ag, id: A.id, u: V3(m.x, 0, m.z), part: mp, arrowAnchor: ua, front: A.front, sx: A.sx, fold: fg, yaw };
    // たたみ方（取説の図・写真）: 前アームは「今の向き＋畳んだ向き」の二等分の水平軸で180°（モーターが下・脚が上）。後アームはほぼ垂直な軸で前へ約145°
    let flip = null;
    if (A.front) { const d0 = V3(d.x, 0, d.z).normalize(), dT = V3(-A.sx * 0.023, 0, 1).normalize(), ax = d0.clone().add(dT).normalize().applyAxisAngle(UP, -yaw);
      const test = V3(1, 0, 0).applyAxisAngle(ax, Math.PI / 2); flip = { axis: ax, sign: test.y < 0 ? 1 : -1 }; }
    motors.push(mo); folds.push({ fg, front: A.front, sx: A.sx, yaw, len, rise, flip });
  });

  // ---------- 説明用の重ね絵（画角・検知範囲。部品には数えない）----------
  const fovG = new THREE.Group(); fovG.visible = false; head.add(fovG);
  const frustum = (fovDeg, len, mat) => { const dg = Math.tan(THREE.MathUtils.degToRad(fovDeg / 2)) * len, a = dg * 0.8, b = dg * 0.6;   /* 公式のFOVを対角とみなし 4:3 の枠に */
    const g = new THREE.ConeGeometry(Math.hypot(a, b), len, 4, 1, true); g.rotateY(Math.PI / 4); g.scale(a / Math.hypot(a, b) * Math.SQRT2, 1, b / Math.hypot(a, b) * Math.SQRT2); g.rotateX(Math.PI / 2); g.translate(0, 0, -len / 2 - 0.003);
    const mm2 = new THREE.Mesh(g, mat); mm2.renderOrder = 7; mm2.position.copy(lens.position); return mm2; };
  const cones = { wide: frustum(84, 0.55, X.fov), tele: frustum(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(42)) / 2) * 180 / Math.PI, 0.75, X.fov48) };   /* 48mm（2倍）の画角は 84° からの計算 */
  fovG.add(cones.wide, cones.tele); fovG.userData.cones = cones; noPart(fovG);
  const senseG = new THREE.Group(); senseG.visible = false; sg.add(senseG);
  { const S2 = 1 / 45, D2R = THREE.MathUtils.degToRad;   // 実際の測定範囲(m)を 1/45 にした概念図
    const sector = (r, phi0, dphi, th0, dth) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 36, 18, phi0, dphi, th0, dth), X.sense); m.renderOrder = 7; return m; };
    const fr = sector(18 * S2, D2R(270 - 45), D2R(90), D2R(90 - 36), D2R(72)); fr.position.copy(P(0, 20, -74)); senseG.add(fr);   // 前 0.5〜18m・水平90°×垂直72°（公式）
    const bk = sector(18 * S2, D2R(90 - 45), D2R(90), D2R(90 - 36), D2R(72)); bk.position.copy(P(0, 15, 75)); senseG.add(bk);
    const rt = sector(12 * S2, D2R(180 - 45), D2R(90), D2R(90 - 36), D2R(72)); rt.position.copy(P(38, 18, -10)); senseG.add(rt);   // 横 0.5〜12m
    const lt = sector(12 * S2, D2R(-45), D2R(90), D2R(90 - 36), D2R(72)); lt.position.copy(P(-38, 18, -10)); senseG.add(lt);
    const up = sector(18 * S2, 0, Math.PI * 2, 0, D2R(40)); up.position.copy(P(0, 26, -10)); senseG.add(up);   // 上 0.5〜18m（前後72°×左右90° を円錐で近似）
    const dn = sector(14 * S2 * 0.3, 0, Math.PI * 2, D2R(180 - 50), D2R(50)); dn.position.copy(P(0, -30, -30)); senseG.add(dn);   // 下 0.3〜14m（図はさらに縮めた）
    const beam = new THREE.Mesh(new THREE.ConeGeometry(Math.tan(Math.PI / 6) * Math.SQRT2 * 25 * S2, 25 * S2, 4, 1, true), X.lidarBeam); beam.rotation.y = Math.PI / 4; beam.rotation.x = -Math.PI / 2; beam.position.copy(P(0, 20.5, -78 - 25 * S2 * 1000 / 2)); beam.renderOrder = 8; senseG.add(beam);   // LiDAR 0.5〜25m・60°×60°
    const irb = new THREE.Mesh(new THREE.ConeGeometry(Math.tan(Math.PI / 6) * Math.SQRT2 * 0.06, 0.06, 4, 1, true), X.irBeam); irb.rotation.y = Math.PI / 4; irb.position.copy(P(0, -30 - 30, -42)); irb.renderOrder = 8; senseG.add(irb);   // 下向き赤外線 0.3〜8m・60°×60°（図はさらに縮めた）
    noPart(senseG); }

  // ---------- 矢印 ----------
  const arrows = { thrust: [], rot: [], move: null, yaw: null };
  motors.forEach(mo => {
    const th = arrowMesh(0xffffff, 0.045, 0.0028); th.position.set(0, 0.008, 0); th.visible = false; mo.arrowAnchor.add(th); arrows.thrust.push(th);
    const rot = rotationArc(mo.dir, 0.035); rot.position.set(0, 0.008, 0); rot.visible = false; mo.arrowAnchor.add(rot); arrows.rot.push(rot);
  });
  const move = arrowMesh(0xef6a2d, 0.11, 0.004); move.visible = false; root.add(move); arrows.move = move;
  const yawA = rotationArc(-1, 0.17); yawA.position.set(0, -0.02, 0); yawA.visible = false; root.add(yawA); arrows.yaw = yawA;
  const cgMarker = new THREE.Group(); cgMarker.visible = false; root.add(cgMarker);

  return { root, sg, halfSpan: 0.20, focusMin: 0.18, parts, pick, wires, motors, legs, arrows, batPart, G, cgMarker, personGroup: null, folds,
    gimbalParts: { pan, roll, tilt, head, yoke, lens: { main: lens } }, fovG, senseG, protector, bay,
    rotor: { R: mm(R_PROP) * K, y0: mm(10) }, moveR: 0.19, moveY: 0.04, rpmScale: 1.6 };
}
