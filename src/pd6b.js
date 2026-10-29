// ===== PD6B-CAT3 の手続き生成 =====
// 寸法は実寸(m)。公式値: モーター軸間1,623mm・プロペラ30インチ・全高676mm・展開2,181×2,398mm。
// 公表されていない部分（ハブの形・脚・箱・アンテナの配置）は JMS2026 の展示機の写真から起こしている。
// 機首=−Z、右=+X、アームの中心線が y=0。全体を PD6B_K 倍して 550クラスと同じ舞台に載せる。
function pd6bCanvas(w, h, draw) { const c = makeCanvas(w, h); draw(c.getContext('2d'), w, h); return c; }
function pd6bMaterials(M) {
  const std = (o) => new THREE.MeshStandardMaterial(o), phy = (o) => new THREE.MeshPhysicalMaterial(o);
  const decal = (c) => std({ map: canvasTex(c, { wrap: false }), roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const sans = '-apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif';
  // 30インチの折りたたみプロペラ: 光沢のある黒いカーボン。翼端の細い帯だけ回転方向の色（550クラスと同じ約束）
  const propCanvas = (dir) => pd6bCanvas(512, 1024, (g, w, h) => {
    g.fillStyle = '#121316'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.045)'; g.lineWidth = 5; for (let x = -h; x < w + h; x += 22) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + h * 0.35, h); g.stroke(); }
    g.fillStyle = dir > 0 ? '#14b8a6' : '#3b7df7'; g.fillRect(0, 0, w, h * 0.035);   /* キャンバスの上端＝羽根の先 */
    g.save(); g.translate(w * 0.30, h * 0.30); g.rotate(Math.PI / 2); g.fillStyle = '#8d9097'; g.font = `bold 34px ${sans}`; g.fillText(`30"  ${dir > 0 ? 'CCW' : 'CW'}`, 0, 0); g.restore();
  });
  const propMat = (dir) => Object.assign(phy({ map: canvasTex(propCanvas(dir), { wrap: false }), roughness: 0.32, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08, specularIntensity: 0.7, side: THREE.DoubleSide }), { userData: { flatTint: true } });
  const boxLabel = pd6bCanvas(1024, 256, (g, w, h) => {
    g.fillStyle = '#eef0f2'; g.fillRect(0, 0, w, h); g.fillStyle = '#1d1f24'; g.textBaseline = 'middle';
    g.font = `800 132px ${sans}`; const a = g.measureText('PRO').width; g.font = `300 132px ${sans}`; const b = g.measureText('DRONE').width;
    const x0 = (w - a - b) / 2; g.font = `800 132px ${sans}`; g.fillText('PRO', x0, h / 2); g.font = `300 132px ${sans}`; g.fillText('DRONE', x0 + a, h / 2);
  });
  const paraLabel = pd6bCanvas(1024, 256, (g, w, h) => {
    g.fillStyle = '#1b1c20'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#3fae49'; g.beginPath(); g.arc(150, 128, 82, 0, Math.PI * 2); g.fill(); g.fillStyle = '#1b1c20'; g.beginPath(); g.arc(150, 128, 34, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#f2f3f5'; g.font = `bold 92px ${sans}`; g.textBaseline = 'middle'; g.fillText('PARA', 270, 88); g.fillText('SAFE', 270, 176);
    g.font = `bold 34px ${sans}`; g.fillStyle = '#c9ccd2'; g.fillText('NIPPON KAYAKU', 560, 214);
  });
  const escLabel = pd6bCanvas(256, 128, (g, w, h) => { g.fillStyle = '#f2f3f5'; g.fillRect(0, 0, w, h); g.fillStyle = '#26282d'; g.font = `bold 44px ${sans}`; g.fillText('ESC', 22, 58); });
  const regLabel = pd6bCanvas(1024, 160, (g, w, h) => { g.fillStyle = '#f4f4f2'; g.fillRect(0, 0, w, h); g.fillStyle = '#17181b'; g.font = 'bold 112px "SF Mono", Menlo, Consolas, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('JU 1234 5678 9012', w / 2, h / 2 + 4); });
  const gnssTop = pd6bCanvas(256, 256, (g, w, h) => { g.fillStyle = '#c7cacf'; g.fillRect(0, 0, w, h); g.fillStyle = '#2b2e34'; g.beginPath(); g.moveTo(128, 40); g.lineTo(92, 112); g.lineTo(116, 112); g.lineTo(116, 196); g.lineTo(140, 196); g.lineTo(140, 112); g.lineTo(164, 112); g.closePath(); g.fill(); });
  return {
    hub: phy({ color: 0x2b2d33, metalness: 0.55, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.35, anisotropy: 0.3 }),
    hubPlate: phy({ color: 0x34373e, metalness: 0.7, roughness: 0.36, anisotropy: 0.5, anisotropyRotation: Math.PI / 2 }),
    legBlack: phy({ color: 0x1f2024, metalness: 0.25, roughness: 0.36, clearcoat: 0.45, clearcoatRoughness: 0.3 }),
    boxWhite: phy({ color: 0xeef0f2, roughness: 0.52, clearcoat: 0.2, clearcoatRoughness: 0.4 }),
    boxLabel: decal(boxLabel), paraLabel: decal(paraLabel), escLabel: decal(escLabel), regLabel: decal(regLabel), gnssTop: decal(gnssTop),
    para: phy({ color: 0x1c1d21, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.3 }),
    orange: phy({ color: 0xff6a13, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.3 }),
    gnss: phy({ color: 0x9da2aa, roughness: 0.4, metalness: 0.2, clearcoat: 0.5 }),
    tofGlass: phy({ color: 0x0b0d12, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.04, iridescence: 0.5, iridescenceIOR: 1.3 }),
    lidarGlass: phy({ color: 0x1a2230, roughness: 0.1, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05 }),
    propCCW: propMat(1), propCW: propMat(-1),
    canopy: phy({ color: 0xf26b1d, roughness: 0.8, sheen: 0.6, sheenRoughness: 0.6, sheenColor: new THREE.Color(0xffffff), side: THREE.DoubleSide }),
    canopyWhite: phy({ color: 0xf4f4f2, roughness: 0.8, sheen: 0.6, sheenRoughness: 0.6, sheenColor: new THREE.Color(0xffffff), side: THREE.DoubleSide }),
    line: new THREE.MeshBasicMaterial({ color: 0xd9dbe0 }),
  };
}

function buildPD6B(M) {
  const K = PD6B_K;
  const root = new THREE.Group(); root.name = 'drone';
  const sg = new THREE.Group(); sg.name = 'pd6b'; sg.scale.setScalar(K); root.add(sg);
  const parts = [], pick = [], wires = [], motors = [], legs = [];
  const G = motorGeometries(), X = pd6bMaterials(M);
  const idxCount = {};
  function reg(obj, key, explode, opts = {}) {
    const idx = (idxCount[key] = (idxCount[key] || 0) + 1) - 1;
    const p = { key, idx, obj, home: obj.position.clone(), homeQuat: obj.quaternion.clone(), explode: explode.clone(), meshes: [], coarse: !!opts.coarse, label: opts.label || null, hidden: false, anim: null };
    obj.userData.part = p;
    obj.traverse(m => { if (m.isMesh && !m.userData.noPart) { p.meshes.push(m); if (!m.userData.fine) m.userData.fine = p; if (opts.coarse) m.userData.coarse = p; if (!m.userData.noPick) pick.push(m); } });
    parts.push(p); return p;
  }
  const rw = (m) => { wires.push(m); m.userData.wire = true; return m; };
  const noPart = (o) => { o.traverse(c => { c.userData.noPart = true; c.userData.noPick = true; }); return o; };
  // 縮尺の逆数を掛けた入れ物。矢印・光など「画面上の大きさ」で決めたいものをここに入れる
  const unscaled = (parent, x, y, z) => { const o = new THREE.Group(); o.position.set(x, y, z); o.scale.setScalar(1 / K); parent.add(o); return o; };
  const plane = (w, h, mat) => mesh(new THREE.PlaneGeometry(w, h), mat, { cast: false });

  // ---------- センターハブ ----------
  const BAT = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => ({ x: sx * 0.058, z: sz * 0.064, sx, sz }));
  const hub = new THREE.Group();
  hub.add(at(mesh(rboxGeo(0.36, 0.13, 0.36, 0.028, 3), X.hub), 0, -0.010, 0));
  hub.add(at(mesh(rboxGeo(0.30, 0.010, 0.30, 0.004), X.hubPlate), 0, -0.078, 0));
  // 側面の帯(継ぎ目)と通気のスリット
  hub.add(at(mesh(rboxGeo(0.364, 0.006, 0.364, 0.028, 2), M.aluDark), 0, 0.030, 0));
  for (const s of [-1, 1]) for (let k = 0; k < 5; k++) hub.add(at(mesh(new THREE.BoxGeometry(0.004, 0.032, 0.002), M.plasticBlack), -0.030 + k * 0.015, -0.025, s * 0.1805));
  // アームの差し込み口(短い管)
  PD6B_U.forEach(u => { const st = tubeBetween(V3(u.x * 0.15, 0, u.z * 0.15), V3(u.x * 0.218, 0, u.z * 0.218), 0.0235, M.carbonArm, 28); hub.add(st); });
  sg.add(hub); reg(hub, 'hubBody', V3(0, 0, 0), { label: V3(0.17, -0.05, 0.12) });
  const regMark = at(plane(0.13, 0.021, X.regLabel), 0, -0.052, 0.1812); sg.add(regMark); reg(regMark, 'regMark', V3(0, 0, 0.10));
  // 上板: バッテリーの差込口4つ
  const topHoles = BAT.map(b => ({ w: 0.096, h: 0.116, rr: 0.008, x: b.x, s: -b.z }));
  const top = at(mesh(plateGeometry(0.40, 0.40, 0.035, topHoles, 0.008), [X.hubPlate, M.carbonEdge]), 0, 0.055, 0);
  sg.add(top); reg(top, 'hubTop', V3(0, 0.42, 0), { label: V3(0.16, 0.01, -0.16) });

  // ---------- バッテリー ×4 (天面から差し込み・取っ手つき) ----------
  let batPart = null;
  BAT.forEach((b, i) => {
    const bat = new THREE.Group(); at(bat, b.x, 0.004, b.z);
    const shell = mesh(rboxGeo(0.090, 0.140, 0.110, 0.008, 3), M.plasticBlack); bat.add(shell);
    const cap = mesh(rboxGeo(0.094, 0.012, 0.114, 0.004), M.heatShrink); at(cap, 0, 0.074, 0); bat.add(cap);
    // 取っ手(U字)と残量LED
    const hpts = []; for (let n = 0; n <= 16; n++) { const t = n / 16 * Math.PI; hpts.push(V3(-0.030 * Math.cos(t), 0.080 + 0.026 * Math.sin(t), 0)); }
    bat.add(mesh(tubeGeo(hpts, 0.0065, 32, 12), M.rubber));
    for (let k = 0; k < 4; k++) { const l = mesh(new THREE.BoxGeometry(0.008, 0.0016, 0.004), k < 3 ? M.ledGreen : M.chip); at(l, -0.016 + k * 0.011, 0.0808, b.sz * 0.042); bat.add(l); }
    const cells = mesh(merged(Array.from({ length: 6 }, (_, k) => new THREE.BoxGeometry(0.011, 0.122, 0.096).translate(-0.0325 + k * 0.013, -0.004, 0))), M.cell); bat.add(cells);
    sg.add(bat);
    reg(cells, 'cells', V3(0, 0, 0));
    const bp = reg(bat, 'battery', V3(b.sx * 0.10, 0.70, b.sz * 0.10), { coarse: true, label: i === 1 ? V3(0, 0.10, 0) : null });
    bp.shell = shell; if (!batPart) batPart = bp;
  });
  // 電源コネクター(橙)×4 天面右
  const pc = new THREE.Group();
  for (let k = 0; k < 4; k++) { const z = -0.075 + k * 0.05; pc.add(at(mesh(rboxGeo(0.030, 0.020, 0.024, 0.003), X.orange), -0.168, 0.075, z)); pc.add(at(mesh(rboxGeo(0.012, 0.016, 0.020, 0.002), M.plasticBlack), -0.188, 0.075, z)); }
  sg.add(pc); reg(pc, 'powerConn', V3(-0.30, 0.30, 0), { label: V3(-0.19, 0.09, 0) });

  // ---------- 内部の電装 (外からは見えない。すけて見る・分解で見える) ----------
  const fc = new THREE.Group(); at(fc, 0, -0.030, -0.150);
  fc.add(mesh(rboxGeo(0.120, 0.030, 0.048, 0.004), M.aluBrushDark));
  fc.add(at(mesh(new THREE.BoxGeometry(0.10, 0.0016, 0.040), [M.pcbEdge, M.pcbEdge, M.pcbFC, M.pcbEdge, M.pcbEdge, M.pcbEdge]), 0, 0.016, 0));
  fc.add(at(mesh(new THREE.BoxGeometry(0.0016, 0.0008, 0.0016), M.ledBlue), 0.04, 0.0172, 0.012));
  sg.add(fc); reg(fc, 'fc', V3(0, 0.30, -0.15), { label: V3(0, 0.02, 0) });
  const pdb = new THREE.Group(); at(pdb, 0, -0.035, 0.150);
  pdb.add(at(mesh(new THREE.BoxGeometry(0.15, 0.0024, 0.05), [M.pcbEdge, M.pcbEdge, M.pcbPDB, M.pcbEdge, M.pcbEdge, M.pcbEdge]), 0, 0, 0));
  for (let k = 0; k < 4; k++) pdb.add(at(mesh(cylGeo(0.007, 0.007, 0.018, 20), M.plasticBlack), -0.055 + k * 0.036, 0.010, 0.010));
  sg.add(pdb); reg(pdb, 'pdb', V3(0, 0.26, 0.15));
  const rid = new THREE.Group(); at(rid, -0.135, 0.063, 0.150);
  rid.add(at(mesh(rboxGeo(0.050, 0.016, 0.034, 0.004), M.plasticGray), 0, 0.008, 0));
  rid.add(at(mesh(new THREE.BoxGeometry(0.0025, 0.001, 0.0025), M.ledBlue), -0.015, 0.0165, -0.009));
  sg.add(rid); reg(rid, 'remoteId', V3(-0.12, 0.40, 0.10), { label: V3(0, 0.02, 0) });

  // ---------- 天面の機器 ----------
  const gps = new THREE.Group(); at(gps, 0, 0.063, -0.150);
  gps.add(mesh(cylGeo(0.012, 0.016, 0.045, 24).translate(0, 0.0225, 0), M.aluDark));
  gps.add(at(mesh(lathe([[0, 0], [0.040, 0], [0.042, 0.004], [0.042, 0.012], [0.036, 0.022], [0.020, 0.028], [0, 0.029]], 64), X.gnss), 0, 0.045, 0));
  { const t = mesh(new THREE.CircleGeometry(0.022, 40), X.gnssTop, { cast: false }); t.rotation.x = -Math.PI / 2; t.rotation.z = 0; at(t, 0, 0.0742, 0); gps.add(t); }
  sg.add(gps); reg(gps, 'gps', V3(0, 0.80, -0.10), { label: V3(0, 0.08, 0) });
  for (const sx of [-1, 1]) {
    const an = new THREE.Group(); at(an, sx * 0.150, 0.063, -0.150);
    an.add(mesh(cylGeo(0.016, 0.019, 0.010, 24).translate(0, 0.005, 0), M.aluDark));
    an.add(mesh(cylGeo(0.017, 0.017, 0.085, 32).translate(0, 0.052, 0), M.plasticBlack));
    an.add(mesh(new THREE.SphereGeometry(0.017, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 0.0945, 0), M.plasticBlack));
    sg.add(an); reg(an, 'antenna', V3(sx * 0.10, 0.55, -0.12), { label: sx > 0 ? V3(0, 0.11, 0) : null });
  }
  // パラシュート(後方左・台座つき)
  const para = new THREE.Group(); at(para, 0.175, 0.063, 0.175);
  para.add(mesh(rboxGeo(0.15, 0.010, 0.15, 0.004), M.aluDark).translateY(0.005));
  para.add(mesh(cylGeo(0.090, 0.090, 0.165, 64).translate(0, 0.0925, 0), X.para));
  para.add(mesh(hardLathe([[0, 0], [0.091, 0], [0.091, 0.006], [0.084, 0.012], [0, 0.014]], 64).translate(0, 0.175, 0), M.aluDark));
  { const band = mesh(new THREE.CylinderGeometry(0.0905, 0.0905, 0.075, 64, 1, true, -0.55 * Math.PI, 1.1 * Math.PI), X.paraLabel, { cast: false }); band.position.y = 0.105; band.rotation.y = Math.PI * 0.25; para.add(band); }
  para.add(rw(mesh(tubeGeo([V3(-0.06, 0.03, -0.06), V3(-0.09, 0.02, -0.09), V3(-0.11, 0.0, -0.11), V3(-0.13, -0.02, -0.12)], 0.004, 24), M.wireWhite)));
  sg.add(para); const paraPart = reg(para, 'parachute', V3(0.20, 0.72, 0.20), { label: V3(0, 0.19, 0) });

  // ---------- 前面の ToF センサー ----------
  const tof = new THREE.Group(); at(tof, 0, -0.030, -0.182);
  tof.add(mesh(rboxGeo(0.070, 0.034, 0.014, 0.004), M.plasticBlack));
  for (const sx of [-1, 1]) { const g2 = mesh(cylGeo(0.0075, 0.0075, 0.004, 24), X.tofGlass); g2.rotation.x = Math.PI / 2; at(g2, sx * 0.017, 0, -0.0075); tof.add(g2); }
  tof.add(at(mesh(new THREE.BoxGeometry(0.003, 0.003, 0.002), M.ledRed), 0, 0.011, -0.0075));
  sg.add(tof); reg(tof, 'tof', V3(0, -0.04, -0.32), { label: V3(0, -0.01, -0.01) });

  // ---------- アーム ×6 ----------
  const HINGE_X = 0.262, HINGE_Y = 0.024, MOTOR_X = 0.8115 - HINGE_X;
  const LEDC = [{ m: M.ledGreen, g: 0x18ff4a }, { m: M.ledWhite, g: 0xffffff }, { m: M.ledWhite, g: 0xffffff }, { m: M.ledWhite, g: 0xffffff }, { m: M.ledWhite, g: 0xffffff }, { m: M.ledRed, g: 0xff2a1a }];
  // 大型モーター用の共有形状
  const bladeGeo = (dir) => { const g = propGeometry(dir, [0]); g.scale(2.5, 2.2, 2.5); return g; };
  const fullGeo = (dir) => { const g = propGeometry(dir); g.scale(2.5, 2.2, 2.5); return g; };
  const PG = { bCCW: bladeGeo(1), bCW: bladeGeo(-1), fCCW: fullGeo(1), fCW: fullGeo(-1) };
  const clampGeo = hardLathe([[0.006, 0], [0.034, 0], [0.036, 0.002], [0.036, 0.006], [0.034, 0.008], [0.006, 0.008], [0.006, 0]], 48);
  const pivots = [];
  PD6B_U.forEach((u, k) => {
    const dir = PD6B_DIR[k];
    const ag = new THREE.Group(); ag.name = 'arm' + (k + 1); ag.rotation.y = Math.atan2(-u.z, u.x); sg.add(ag);
    // 折りたたみ継手(ハブ側に固定): 台座・ヒンジの軸・ロックレバー・ロック表示
    const fj = new THREE.Group();
    fj.add(at(mesh(rboxGeo(0.052, 0.054, 0.056, 0.006), M.aluDark), 0.236, 0, 0));
    for (const s of [-1, 1]) fj.add(at(mesh(cylGeo(0.010, 0.010, 0.014, 24).rotateX(Math.PI / 2), M.aluDark), HINGE_X, HINGE_Y - 0.004, s * 0.021));
    fj.add(at(mesh(cylGeo(0.0045, 0.0045, 0.062, 16).rotateX(Math.PI / 2), M.steel), HINGE_X, HINGE_Y - 0.004, 0));
    fj.add(at(mesh(rboxGeo(0.060, 0.010, 0.020, 0.004), M.plasticBlack), 0.262, -0.031, 0));
    const lock = at(mesh(new THREE.BoxGeometry(0.010, 0.002, 0.010), M.ledGreen), 0.236, 0.0275, 0); fj.add(lock);
    ag.add(fj); const fjp = reg(fj, 'foldJoint', V3(0.12, 0, 0), { label: k === 1 ? V3(0.236, 0.035, 0) : null }); fjp.lock = lock;
    if (k === 1 || k === 4) {   // 送受信アンテナ: 左右のアームの付け根に1本ずつ(ハブ側に固定なので畳んでも動かない)
      const rx = new THREE.Group(); at(rx, 0.222, 0.027, 0.020);
      rx.add(mesh(cylGeo(0.008, 0.009, 0.012, 16).translate(0, 0.006, 0), M.aluDark));
      rx.add(mesh(cylGeo(0.0045, 0.0055, 0.120, 16).translate(0, 0.072, 0), M.plasticBlack));
      ag.add(rx); reg(rx, 'rxAnt', V3(0.06, 0.34, 0), { label: k === 1 ? V3(0, 0.13, 0) : null });
    }
    // 折りたたみの軸より先(ここが回る)
    const pv = new THREE.Group(); pv.name = 'fold'; at(pv, HINGE_X, HINGE_Y, 0); ag.add(pv); pivots.push(pv);
    const arm = new THREE.Group();
    const tube = mesh(cylGeo(0.0225, 0.0225, MOTOR_X - 0.016, 40), M.carbonArm); tube.rotation.z = -Math.PI / 2; at(tube, 0.008 + (MOTOR_X - 0.016) / 2, -HINGE_Y, 0); arm.add(tube);
    arm.add(at(mesh(rboxGeo(0.034, 0.050, 0.050, 0.006), M.aluDark), 0.012, -HINGE_Y, 0));
    arm.add(at(mesh(cylGeo(0.010, 0.010, 0.026, 24).rotateX(Math.PI / 2), M.aluDark), 0, -0.004, 0));
    pv.add(arm); reg(arm, 'arm', V3(0.28, 0, 0), { label: k === 4 ? V3(0.30, 0.0, 0) : null });
    // モーターマウント
    const mount = new THREE.Group(); at(mount, MOTOR_X, -HINGE_Y, 0);
    mount.add(mesh(rboxGeo(0.078, 0.052, 0.060, 0.008), M.aluDark));
    mount.add(at(mesh(hardLathe([[0.010, 0], [0.050, 0], [0.050, 0.007], [0.010, 0.007], [0.010, 0]], 48), M.aluDark), 0, 0.026, 0));
    mount.add(at(mesh(cylGeo(0.020, 0.020, 0.004, 32).rotateZ(Math.PI / 2), M.plasticBlack), 0.041, 0, 0));
    pv.add(mount); reg(mount, 'motorMount', V3(0.42, 0.03, 0));
    // モーター本体(550クラスの形を扁平に拡大: 直径約112mm・高さ約60mm)
    const mg = new THREE.Group(); mg.name = 'motor'; at(mg, MOTOR_X, -HINGE_Y + 0.033, 0); pv.add(mg);
    const core = new THREE.Group(); core.scale.set(3.2, 1.7, 3.2); mg.add(core);
    const base = new THREE.Group(); const bp = [cylGeo(0.0105, 0.0105, 0.004).translate(0, 0.002, 0)]; for (let q = 0; q < 4; q++) { const a = q * Math.PI / 2 + Math.PI / 4; bp.push(rboxGeo(0.021, 0.0032, 0.008, 0.0014).rotateY(-a).translate(Math.cos(a) * 0.0115, 0.0016, -Math.sin(a) * 0.0115)); }
    bp.push(hardLathe([[0.0046, 0.004], [0.0052, 0.004], [0.0052, 0.022], [0.0046, 0.022], [0.0046, 0.004]], 32)); base.add(mesh(merged(bp), M.aluDark)); core.add(base); reg(base, 'motorBase', V3(0, 0, 0));
    const stator = at(mesh(G.teeth, M.lamination), 0, 0.013, 0); stator.castShadow = false; core.add(stator); reg(stator, 'stator', V3(0, 0.04, 0));
    const coils = at(mesh(G.coils, M.copper), 0, 0.013, 0); coils.castShadow = false; core.add(coils); reg(coils, 'winding', V3(0, 0.04, 0));
    const mags = at(mesh(G.magnets, M.magnet), 0, 0.013, 0); mags.castShadow = false; core.add(mags); reg(mags, 'magnet', V3(0, 0.10, 0));
    const bell = new THREE.Group(); bell.add(at(mesh(G.bellWall, M.bell), 0, 0.005, 0)); bell.add(at(mesh(G.bellTop, M.aluDark), 0, 0.0295, 0)); bell.add(at(mesh(cylGeo(0.0065, 0.0075, 0.0035), M.alu), 0, 0.0333, 0));
    core.add(bell); reg(bell, 'bell', V3(0, 0.10, 0));
    const shaft = new THREE.Group(); shaft.add(at(mesh(cylGeo(0.002, 0.002, 0.040, 16), M.steel), 0, 0.016, 0)); shaft.add(at(mesh(G.bearing, M.steel), 0, 0.005, 0)); shaft.add(at(mesh(G.bearing, M.steel), 0, 0.017, 0));
    core.add(shaft); reg(shaft, 'shaft', V3(0, 0.10, 0));
    // プロペラ(回る入れ物): クランプ・ヒンジ・羽根2枚
    const PY = 0.064;
    const propG = new THREE.Group(); propG.name = 'prop'; at(propG, 0, PY, 0); mg.add(propG);
    const hubCap = mesh(cylGeo(0.012, 0.014, 0.010, 32), M.alu); at(hubCap, 0, 0.012, 0); propG.add(hubCap);   // 最初の子メッシュ = mo.hubMesh
    const clamp = new THREE.Group();
    clamp.add(at(mesh(clampGeo, M.aluDark), 0, -0.012, 0)); clamp.add(at(mesh(clampGeo, M.aluDark), 0, 0.004, 0));
    for (const s of [-1, 1]) clamp.add(at(mesh(G.screwHead, M.steelBlack), s * 0.032, 0.012, 0));
    for (const s of [-1, 1]) clamp.add(at(mesh(rboxGeo(0.030, 0.012, 0.030, 0.004), M.aluDark), s * 0.034, -0.002, 0));
    propG.add(clamp);
    const blades = [], hinges = [];
    for (const s of [1, -1]) {
      const hg = new THREE.Group(); at(hg, s * 0.032, -0.002, 0);
      const bl = mesh(dir > 0 ? PG.bCCW : PG.bCW, dir > 0 ? X.propCCW : X.propCW); bl.position.x = -s * 0.032; if (s < 0) { bl.rotation.y = Math.PI; bl.position.x = 0.032; }
      hg.add(bl); propG.add(hg); blades.push(bl); hinges.push({ g: hg, s });
    }
    const ghosts = [0, 1].map(() => { const gm = (dir > 0 ? X.propCCW : X.propCW).clone(); gm.transparent = true; gm.opacity = 0.35; gm.depthWrite = false;
      const gh = new THREE.Mesh(dir > 0 ? PG.fCCW : PG.fCW, gm); gh.position.y = -0.002; gh.visible = false; gh.userData.noPart = true; gh.userData.noPick = true; propG.add(gh); return gh; });
    reg(clamp, 'propClamp', V3(0, 0.05, 0));
    reg(propG, 'prop', V3(0.42, 0.50, 0), { label: k === 0 ? V3(0.22, 0.01, 0.0) : null });
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.385, 72), (dir > 0 ? M.propDiscCCW : M.propDiscCW).clone()); disc.rotation.x = -Math.PI / 2; disc.userData.noAO = true; at(disc, 0, PY - 0.002, 0);
    disc.renderOrder = 5; disc.userData.noPart = true; disc.userData.noPick = true; mg.add(disc);
    const mp = reg(mg, 'motor', V3(0.42, 0.26, 0), { coarse: true, label: k === 1 ? V3(0, 0.035, 0) : null });
    // ESC (モーターの下に吊る箱・放熱フィン)
    const esc = new THREE.Group(); at(esc, MOTOR_X + 0.006, -HINGE_Y - 0.060, 0);
    esc.add(mesh(rboxGeo(0.066, 0.044, 0.084, 0.006), M.heatShrink));
    esc.add(mesh(merged(Array.from({ length: 7 }, (_, q) => new THREE.BoxGeometry(0.058, 0.010, 0.003).translate(0, -0.026, -0.033 + q * 0.011))), M.aluBrushDark));
    { const l = plane(0.040, 0.020, X.escLabel); l.rotation.y = Math.PI / 2; at(l, 0.0332, 0.004, 0); esc.add(l); }
    pv.add(esc); reg(esc, 'esc', V3(0.42, -0.20, 0), { label: k === 5 ? V3(0.03, -0.01, 0) : null });
    // 灯火 (マウントの外側の下)
    const led = new THREE.Group(); at(led, MOTOR_X + 0.052, -HINGE_Y - 0.012, 0);
    led.add(mesh(rboxGeo(0.014, 0.026, 0.028, 0.004), M.plasticBlack));
    led.add(at(mesh(new THREE.BoxGeometry(0.003, 0.010, 0.014), LEDC[k].m), 0.0075, 0, 0));
    { const cv = mesh(rboxGeo(0.006, 0.020, 0.024, 0.003), M.ledCover); cv.userData.noAO = true; led.add(at(cv, 0.0095, 0, 0)); }
    const gl = unscaled(led, 0.014, 0, 0);
    const core2 = new THREE.Sprite(M.glowCore(LEDC[k].g)); core2.scale.set(0.009, 0.009, 1); core2.renderOrder = 6; gl.add(core2);
    const halo = new THREE.Sprite(M.glowHalo(LEDC[k].g)); halo.scale.set(0.022, 0.022, 1); halo.position.x = 0.002; halo.renderOrder = 6; gl.add(halo);
    pv.add(led); reg(led, 'led', V3(0.58, -0.06, 0), { label: k === 0 ? V3(0.012, 0, 0) : null });
    led.userData.halo = halo; led.userData.core = core2; halo.userData.baseColor = halo.material.color.clone();
    // 配線: 継手をまたぐたるみ + 管の先からESCへ
    const wg = new THREE.Group();
    wg.add(rw(mesh(tubeGeo([V3(-0.050, -0.052, 0.012), V3(-0.030, -0.066, 0.014), V3(0.000, -0.068, 0.014), V3(0.028, -0.058, 0.012), V3(0.044, -0.046, 0.010)], 0.0055, 40), M.wireBlack)));
    wg.add(rw(mesh(tubeGeo([V3(MOTOR_X - 0.040, -HINGE_Y - 0.018, 0.010), V3(MOTOR_X - 0.030, -HINGE_Y - 0.040, 0.014), V3(MOTOR_X - 0.020, -HINGE_Y - 0.052, 0.012)], 0.0045, 24), M.wireBlack)));
    wg.add(rw(mesh(tubeGeo([V3(MOTOR_X - 0.040, -HINGE_Y - 0.018, -0.010), V3(MOTOR_X - 0.030, -HINGE_Y - 0.040, -0.014), V3(MOTOR_X - 0.020, -HINGE_Y - 0.052, -0.012)], 0.0045, 24), M.wireRed)));
    pv.add(wg); reg(wg, 'wiring', V3(0.20, -0.08, 0));
    // 推力・回転の矢印は画面上の大きさで作る(縮尺の逆数の入れ物に入れる)
    const ua = unscaled(mg, 0, PY, 0);
    const mo = { group: mg, prop: propG, propMesh: blades[0], blades, hinges, ghosts, disc, bell, mags, shaft, adapter: clamp, dir, arm: ag, pivot: pv, id: 'M' + (k + 1), u: V3(u.x, 0, u.z), part: mp, arrowAnchor: ua };
    motors.push(mo);
  });

  // ---------- 腰下ユニット ----------
  const lm = new THREE.Group();
  lm.add(at(mesh(rboxGeo(0.24, 0.012, 0.24, 0.004), M.aluDark), 0, -0.090, 0));
  for (const sz of [-1, 1]) lm.add(at(mesh(rboxGeo(0.54, 0.020, 0.030, 0.005), M.aluDark), 0, -0.094, sz * 0.13));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const pin = mesh(cylGeo(0.005, 0.005, 0.030, 16), M.steel); pin.rotation.z = Math.PI / 2; at(pin, sx * 0.105, -0.084, sz * 0.105); lm.add(pin);
    lm.add(at(mesh(cylGeo(0.0075, 0.0075, 0.004, 16).rotateZ(Math.PI / 2), M.aluOrange), sx * 0.122, -0.084, sz * 0.105)); }
  sg.add(lm); reg(lm, 'lowerMount', V3(0, -0.04, 0), { label: V3(0.27, -0.09, 0.13) });
  // 脚 (左右)・スキッド
  const LEG_TOP = (sx, sz) => V3(sx * 0.255, -0.104, sz * 0.13), LEG_BOT = (sx, sz) => V3(sx * 0.300, -0.500, sz * 0.19);
  for (const sx of [-1, 1]) {
    const lg = new THREE.Group();
    for (const sz of [-1, 1]) {
      const a = LEG_TOP(sx, sz), b = LEG_BOT(sx, sz);
      lg.add(tubeBetween(a, b, 0.0145, X.legBlack, 24));
      lg.add(at(mesh(rboxGeo(0.040, 0.026, 0.040, 0.005), M.aluDark), a.x, a.y + 0.004, a.z));
      lg.add(at(mesh(rboxGeo(0.036, 0.034, 0.036, 0.006), M.plasticBlack), b.x, b.y - 0.003, b.z));
    }
    // 前後の脚をつなぐ横の桟
    const yM = -0.31, t = (yM - (-0.104)) / (-0.500 - (-0.104)), xM = sx * (0.255 + (0.300 - 0.255) * t), zM = 0.13 + (0.19 - 0.13) * t;
    lg.add(tubeBetween(V3(xM, yM, -zM), V3(xM, yM, zM), 0.011, X.legBlack, 20));
    sg.add(lg); reg(lg, 'landingGear', V3(sx * 0.30, 0, 0), { label: sx > 0 ? V3(0.29, -0.40, -0.17) : null });
    legs.push({ group: lg, sx, pivots: [] });
    const sk = new THREE.Group();
    const skid = mesh(cylGeo(0.015, 0.015, 0.78, 28), X.legBlack); skid.rotation.x = Math.PI / 2; at(skid, sx * 0.300, -0.515, 0); sk.add(skid);
    for (const sz of [-1, 1]) { const cap = mesh(new THREE.CapsuleGeometry(0.017, 0.040, 6, 16), M.rubber); cap.rotation.x = Math.PI / 2; at(cap, sx * 0.300, -0.515, sz * 0.39); sk.add(cap); }
    sg.add(sk); reg(sk, 'skid', V3(sx * 0.42, 0, 0), { label: sx < 0 ? V3(-0.30, -0.52, 0.30) : null });
  }
  // 物流ボックス (白い箱 + 黒い台)
  const box = new THREE.Group(); at(box, 0, -0.330, 0);
  box.add(at(mesh(rboxGeo(0.400, 0.300, 0.400, 0.012, 3), X.boxWhite), 0, 0.02, 0));
  box.add(at(mesh(rboxGeo(0.404, 0.050, 0.404, 0.010, 2), X.boxWhite), 0, 0.150, 0));   // ふた
  box.add(at(mesh(rboxGeo(0.406, 0.004, 0.406, 0.002), M.plasticGray), 0, 0.125, 0));   // ふたの合わせ目
  box.add(at(mesh(rboxGeo(0.420, 0.030, 0.420, 0.006), X.legBlack), 0, -0.150, 0));    // 台
  for (let q = 0; q < 5; q++) box.add(at(mesh(rboxGeo(0.040, 0.020, 0.012, 0.003), X.boxWhite), -0.144 + q * 0.072, -0.150, -0.212));
  { const l = plane(0.30, 0.075, X.boxLabel); at(l, 0, 0.05, -0.2012); l.rotation.y = Math.PI; box.add(l); }
  { const l = plane(0.30, 0.075, X.boxLabel); at(l, 0.2012, 0.05, 0); l.rotation.y = Math.PI / 2; box.add(l); }
  { const l = plane(0.20, 0.05, X.boxLabel); at(l, 0, 0.1755, 0); l.rotation.set(-Math.PI / 2, 0, Math.PI); box.add(l); }   /* 前に立って上から読める向き */
  sg.add(box); const boxPart = reg(box, 'cargoBox', V3(0, 0, -0.62), { label: V3(-0.1, 0.0, -0.21) });
  // ボックスリリース機構 (四隅の爪)
  const latch = new THREE.Group(); const claws = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    latch.add(at(mesh(rboxGeo(0.034, 0.020, 0.034, 0.004), M.aluDark), sx * 0.165, -0.104, sz * 0.165));
    const cp = new THREE.Group(); at(cp, sx * 0.165, -0.112, sz * 0.165);
    const claw = mesh(merged([new THREE.BoxGeometry(0.010, 0.080, 0.022).translate(sx * 0.047, -0.040, 0), new THREE.BoxGeometry(0.018, 0.010, 0.022).translate(sx * 0.040, -0.075, 0)]), M.aluOrange);
    cp.add(claw); cp.rotation.z = 0; latch.add(cp); claws.push({ g: cp, sx });
  }
  sg.add(latch); const latchPart = reg(latch, 'boxLatch', V3(0, 0.06, 0), { label: V3(0.17, -0.13, -0.17) }); latchPart.claws = claws;
  // 測量ユニット (付け替えたときだけ出す)
  const sv = new THREE.Group(); at(sv, 0, -0.100, 0);
  sv.add(at(mesh(rboxGeo(0.20, 0.014, 0.20, 0.004), M.aluDark), 0, -0.012, 0));
  sv.add(at(mesh(rboxGeo(0.16, 0.090, 0.12, 0.010), M.plasticGray), 0, -0.065, 0.020));
  { const lid = mesh(cylGeo(0.052, 0.052, 0.090, 48), X.gnss); at(lid, 0, -0.160, -0.060); sv.add(lid);
    const win = mesh(cylGeo(0.0525, 0.0525, 0.040, 48, true), X.lidarGlass); at(win, 0, -0.165, -0.060); sv.add(win); }
  { const cam = mesh(rboxGeo(0.07, 0.06, 0.07, 0.008), M.plasticBlack); at(cam, 0, -0.150, 0.075); sv.add(cam);
    const lens = mesh(cylGeo(0.022, 0.022, 0.012, 32), M.lens); lens.rotation.x = Math.PI / 2; at(lens, 0, -0.150, 0.034); sv.add(lens); }
  sg.add(sv); const svPart = reg(sv, 'surveyUnit', V3(0, 0, -0.50), { label: V3(0, -0.17, -0.06) }); svPart.hidden = true;

  // ---------- パラシュートの傘 (開いたときだけ出す。部品には数えない) ----------
  const chute = new THREE.Group(); chute.visible = false; chute.position.set(0.175, 0.24, 0.175); sg.add(chute);
  { const R = 1.15, segs = 16, can = new THREE.Group();
    for (let i = 0; i < segs; i++) { const gore = new THREE.SphereGeometry(R, 4, 10, i / segs * Math.PI * 2, Math.PI * 2 / segs, 0, Math.PI * 0.42); can.add(new THREE.Mesh(gore, i % 2 ? X.canopyWhite : X.canopy)); }
    can.position.y = 1.15; chute.add(can);
    const rimY = 1.15 + R * Math.cos(Math.PI * 0.42), rimR = R * Math.sin(Math.PI * 0.42);
    for (let i = 0; i < segs; i++) { const a = i / segs * Math.PI * 2; chute.add(tubeBetween(V3(0, 0, 0), V3(Math.cos(a) * rimR, rimY, Math.sin(a) * rimR), 0.003, X.line, 4)); }
    chute.userData.canopy = can; noPart(chute); chute.traverse(o => { o.userData.noAO = true; }); }

  // ---------- 矢印 ----------
  const arrows = { thrust: [], rot: [], move: null, yaw: null };
  motors.forEach(mo => {
    const th = arrowMesh(0xffffff, 0.06, 0.0035); th.position.set(0, 0.012, 0); th.visible = false; mo.arrowAnchor.add(th); arrows.thrust.push(th);
    const rot = rotationArc(mo.dir, 0.075); rot.position.set(0, 0.016, 0); rot.visible = false; mo.arrowAnchor.add(rot); arrows.rot.push(rot);
  });
  const move = arrowMesh(0xef6a2d, 0.14, 0.005); move.visible = false; root.add(move); arrows.move = move;
  const yaw = rotationArc(-1, 0.40); yaw.position.set(0, 0.10, 0); yaw.visible = false; root.add(yaw); arrows.yaw = yaw;
  const cgMarker = new THREE.Group(); cgMarker.visible = false; root.add(cgMarker);

  for (const p of parts) p.explode.multiplyScalar(0.78);   /* 実寸で決めた分解量のままだと縦に伸び、スマホでは部品が粒になる */
  const propPart = parts.find(p => p.key === 'prop' && p.idx === 0);
  return { root, sg, halfSpan: 1.20 * K, viewK: () => narrow() ? 1.32 : 1.15, parts, pick, wires, motors, legs, arrows, batPart, G, cgMarker, personGroup: null, pivots, chute, paraPart, boxPart, latchPart, svPart,
    rotor: { R: 0.381 * K, y0: 0 }, moveR: 0.42, moveY: 0.12, rpmScale: 0.5, labelPropPart: propPart };
}
