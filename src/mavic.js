// ===== DJI Mavic 4 Pro の手続き生成 =====
// 寸法は実寸(m)・等倍。公式値: 展開 328.7×390.5×135.2mm・折りたたみ 257.6×124.8×103.4mm（プロペラなし）。
// プロペラは販売店の表記で直径10.5インチ。胴の形・センサーの配置・アームの畳み方は写真と取説の図からの推定。
// 機首=−Z、右=+X。脚の先(y=−0.075)が床に来るよう、入れ物ごと下げる。
function mavicMaterials(M) {
  const phy = (o) => new THREE.MeshPhysicalMaterial(o), std = (o) => new THREE.MeshStandardMaterial(o);
  const decal = (c) => std({ map: canvasTex(c, { wrap: false }), roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const sans = '-apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif';
  const propCanvas = (dir) => pd6bCanvas(256, 1024, (g, w, h) => {
    g.fillStyle = '#2b2e34'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.05)'; for (let y = 0; y < h; y += 6) g.fillRect(0, y, w, 1);
    g.fillStyle = dir > 0 ? '#14b8a6' : '#3b7df7'; g.fillRect(0, h * 0.955, w, h * 0.045);
    g.fillStyle = dir > 0 ? '#c9ccd2' : '#2b2e34'; g.beginPath(); g.arc(w * 0.5, h * 0.12, w * 0.12, 0, Math.PI * 2); g.fill();   /* 根元の印（取付の組み合わせ） */
  });
  const propMat = (dir) => Object.assign(phy({ map: canvasTex(propCanvas(dir), { wrap: false }), roughness: 0.55, metalness: 0, clearcoat: 0.3, clearcoatRoughness: 0.4, side: THREE.DoubleSide }), { userData: { flatTint: true } });
  const regLabel = pd6bCanvas(512, 96, (g, w, h) => { g.fillStyle = '#f4f4f2'; g.fillRect(0, 0, w, h); g.fillStyle = '#17181b'; g.font = 'bold 60px "SF Mono", Menlo, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('JU 1234 5678', w / 2, h / 2 + 2); });
  const brand = pd6bCanvas(512, 96, (g, w, h) => { g.fillStyle = '#3c3f45'; g.fillRect(0, 0, w, h); g.fillStyle = '#c9ccd2'; g.font = `600 54px ${sans}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('MAVIC 4 PRO', w / 2, h / 2 + 2); });
  return {
    shell: phy({ color: 0x45484e, metalness: 0.15, roughness: 0.42, clearcoat: 0.45, clearcoatRoughness: 0.3 }),
    shellDark: phy({ color: 0x2c2e33, metalness: 0.1, roughness: 0.5, clearcoat: 0.25 }),
    shellLight: phy({ color: 0x5a5e66, metalness: 0.2, roughness: 0.38, clearcoat: 0.5, clearcoatRoughness: 0.25 }),
    glass: phy({ color: 0x07090d, roughness: 0.05, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, iridescence: 0.6, iridescenceIOR: 1.3 }),
    lensRing: phy({ color: 0x1d1f23, metalness: 0.8, roughness: 0.3 }),
    goldRing: phy({ color: 0xb08d57, metalness: 1, roughness: 0.3 }),
    propCCW: propMat(1), propCW: propMat(-1),
    regLabel: decal(regLabel), brand: decal(brand),
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
  const K = MAVIC_K, LEG_Y = -0.075;
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

  // ---------- 胴 (横から見た形を左右に押し出し、角を丸める) ----------
  const prof = new THREE.Shape();
  prof.moveTo(-0.118, -0.004);
  prof.quadraticCurveTo(-0.118, 0.016, -0.096, 0.024); prof.quadraticCurveTo(-0.060, 0.032, -0.020, 0.032);
  prof.lineTo(0.100, 0.030); prof.quadraticCurveTo(0.124, 0.028, 0.125, 0.008);
  prof.quadraticCurveTo(0.125, -0.022, 0.104, -0.030); prof.lineTo(-0.070, -0.034);
  prof.quadraticCurveTo(-0.112, -0.032, -0.118, -0.004);
  const bodyGeo = new THREE.ExtrudeGeometry(prof, { depth: 0.072, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.008, bevelSegments: 5, curveSegments: 18 });
  bodyGeo.rotateY(-Math.PI / 2); bodyGeo.translate(0.036, 0, 0); bodyGeo.computeVertexNormals();
  const bodyG = new THREE.Group();
  bodyG.add(mesh(bodyGeo, X.shell));
  bodyG.add(at(mesh(rboxGeo(0.060, 0.004, 0.120, 0.002), X.shellDark), 0, -0.035, 0.010));   // 底の板
  { const b = plane(0.050, 0.009, X.brand); b.rotation.y = Math.PI / 2; at(b, 0.0485, 0.004, 0.035); bodyG.add(b); }
  sg.add(bodyG); reg(bodyG, 'body', V3(0, 0, 0), { label: V3(-0.05, 0.0, 0.07) });
  const rm = plane(0.034, 0.0065, X.regLabel); rm.rotation.y = -Math.PI / 2; at(rm, -0.0485, -0.010, 0.045); sg.add(rm); reg(rm, 'regMark', V3(-0.04, 0, 0));
  const ports = new THREE.Group();
  ports.add(at(mesh(rboxGeo(0.002, 0.008, 0.016, 0.0008), X.shellDark), -0.0492, -0.012, 0.090));
  ports.add(at(mesh(rboxGeo(0.002, 0.004, 0.012, 0.0008), M.chip), -0.0492, 0.004, 0.090));
  sg.add(ports); reg(ports, 'ports', V3(-0.05, 0, 0), { label: V3(-0.051, -0.004, 0.09) });

  // ---------- バッテリー (胴の上・後ろへ抜く) ----------
  const bat = new THREE.Group(); at(bat, 0, 0.030, 0.048);
  const shell = mesh(rboxGeo(0.086, 0.024, 0.150, 0.008, 3), X.shellLight); at(shell, 0, 0.006, 0); bat.add(shell);
  for (let k = 0; k < 7; k++) bat.add(at(mesh(rboxGeo(0.070, 0.0015, 0.004, 0.0007), X.shellDark), 0, 0.0185, 0.040 + k * 0.0055));   // 後ろの滑り止め
  const cells = mesh(merged(Array.from({ length: 4 }, (_, k) => new THREE.BoxGeometry(0.019, 0.016, 0.130).translate(-0.0315 + k * 0.021, 0.004, 0))), M.cell); bat.add(cells);
  const bled = new THREE.Group();
  bled.add(at(mesh(cylGeo(0.0035, 0.0035, 0.002, 20).rotateX(Math.PI / 2), M.plasticGray), 0.022, 0.006, 0.0752));
  for (let k = 0; k < 4; k++) bled.add(at(mesh(new THREE.BoxGeometry(0.004, 0.0016, 0.001), k < 3 ? M.ledGreen : M.chip), -0.018 + k * 0.007, 0.006, 0.0755));
  bat.add(bled);
  const buckle = new THREE.Group();
  for (const s of [-1, 1]) buckle.add(at(mesh(rboxGeo(0.004, 0.012, 0.022, 0.0015), X.shellDark), s * 0.0445, 0.004, -0.050));
  bat.add(buckle);
  sg.add(bat);
  reg(cells, 'cells', V3(0, 0, 0)); reg(bled, 'batteryLed', V3(0, 0, 0.02)); reg(buckle, 'batteryBuckle', V3(0, 0, 0));
  const batPart = reg(bat, 'battery', V3(0, 0.10, 0.10), { coarse: true, label: V3(0.02, 0.022, 0.03) }); batPart.shell = shell;

  // ---------- 内部の電装 ----------
  const fc = at(mesh(rboxGeo(0.050, 0.008, 0.060, 0.002), M.aluBrushDark), 0, 0.006, -0.040); sg.add(fc); reg(fc, 'fc', V3(0, 0.10, -0.06), { label: V3(0, 0.006, 0) });
  const esc = at(mesh(rboxGeo(0.060, 0.006, 0.050, 0.002), [M.pcbEdge, M.pcbEdge, M.pcbPDB, M.pcbEdge, M.pcbEdge, M.pcbEdge]), 0, -0.018, 0.040); sg.add(esc); reg(esc, 'esc', V3(0, -0.05, 0.07));
  const gnss = at(mesh(rboxGeo(0.028, 0.004, 0.028, 0.002), M.gpsBody), 0, 0.024, -0.070); sg.add(gnss); reg(gnss, 'gnss', V3(0, 0.14, -0.06), { label: V3(0, 0.004, 0) });
  const rid = at(mesh(rboxGeo(0.016, 0.004, 0.012, 0.001), M.plasticGray), 0.020, -0.018, 0.090); sg.add(rid); reg(rid, 'remoteId', V3(0.05, -0.05, 0.06));

  // ---------- 機首: LiDAR・下面: 3D赤外線・補助ライト ----------
  const lidar = new THREE.Group(); at(lidar, 0, 0.014, -0.122);
  lidar.add(mesh(rboxGeo(0.034, 0.012, 0.006, 0.003), X.shellDark));
  lidar.add(at(mesh(rboxGeo(0.028, 0.008, 0.002, 0.002), X.glass), 0, 0, -0.003));
  sg.add(lidar); reg(lidar, 'lidar', V3(0, 0.05, -0.08), { label: V3(0, 0.008, 0) });
  const ir = new THREE.Group(); at(ir, 0, -0.037, -0.010);
  ir.add(mesh(rboxGeo(0.030, 0.004, 0.014, 0.002), X.shellDark)); for (const s of [-1, 1]) ir.add(at(mesh(cylGeo(0.004, 0.004, 0.0015, 16), X.glass), s * 0.008, -0.0025, 0));
  sg.add(ir); reg(ir, 'ir3d', V3(0, -0.04, 0), { label: V3(0, -0.004, 0) });
  const aux = new THREE.Group(); at(aux, 0, -0.037, 0.030);
  aux.add(mesh(cylGeo(0.005, 0.005, 0.003, 20), M.ledCover)); aux.add(at(mesh(cylGeo(0.003, 0.003, 0.001, 16), M.ledWhite), 0, -0.0015, 0));
  sg.add(aux); reg(aux, 'auxLight', V3(0, -0.04, 0.02));
  // 魚眼センサー 6基（四隅の上と、下面の前後）
  const VIS = [[0.040, 0.026, -0.090, 0.5, 0.6, -0.6], [-0.040, 0.026, -0.090, -0.5, 0.6, -0.6], [0.042, 0.024, 0.100, 0.5, 0.6, 0.6], [-0.042, 0.024, 0.100, -0.5, 0.6, 0.6], [0, -0.034, -0.060, 0, -1, -0.15], [0, -0.032, 0.085, 0, -1, 0.15]];
  VIS.forEach(([x, y, z, nx, ny, nz], i) => {
    const v = new THREE.Group(); at(v, x, y, z); const n = V3(nx, ny, nz).normalize(); v.quaternion.setFromUnitVectors(UP, n);
    v.add(mesh(cylGeo(0.0062, 0.0068, 0.003, 24), X.shellDark));
    const dome = mesh(new THREE.SphereGeometry(0.0048, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), X.glass); dome.scale.y = 0.6; at(dome, 0, 0.0015, 0); v.add(dome);
    sg.add(v); reg(v, 'vision', n.clone().multiplyScalar(0.05), { label: i === 0 ? V3(0, 0.006, 0) : null });
  });

  // ---------- インフィニティジンバルと3眼カメラ ----------
  const gim = new THREE.Group(); at(gim, 0, -0.026, -0.116);   /* カメラの頭が機首より前に出る */
  gim.add(mesh(cylGeo(0.010, 0.011, 0.008, 28), X.shellDark));                 // パン(水平)の付け根
  const yoke = new THREE.Group(); gim.add(yoke);
  yoke.add(tubeBetween(V3(0, -0.004, 0), V3(0, -0.014, -0.006), 0.0045, X.shell, 16));
  yoke.add(at(mesh(cylGeo(0.012, 0.012, 0.010, 32).rotateX(Math.PI / 2), X.shell), 0, -0.016, -0.010));   // ロールのモーター(軸は前後)
  const roll = new THREE.Group(); at(roll, 0, -0.016, -0.016); yoke.add(roll);
  roll.add(mesh(new THREE.TorusGeometry(0.024, 0.0032, 10, 48, Math.PI * 1.25).rotateZ(-Math.PI * 0.125 - Math.PI / 2), X.shell));   // ロール側の腕(弧)
  for (const s of [-1, 1]) roll.add(at(mesh(cylGeo(0.006, 0.006, 0.006, 20).rotateZ(Math.PI / 2), X.shellDark), s * 0.026, 0, -0.004));   // チルト軸
  const tilt = new THREE.Group(); at(tilt, 0, 0, -0.004); roll.add(tilt);
  const head = new THREE.Group(); tilt.add(head);
  head.add(mesh(rboxGeo(0.046, 0.036, 0.034, 0.011, 4), X.shellLight));
  const lensAt = (r, x, y, mat) => { const g = new THREE.Group(); at(g, x, y, -0.017);
    g.add(mesh(cylGeo(r + 0.0022, r + 0.0022, 0.004, 40).rotateX(Math.PI / 2), X.lensRing));
    g.add(at(mesh(new THREE.TorusGeometry(r + 0.0012, 0.0006, 8, 40), mat || X.lensRing), 0, 0, -0.0021));
    const gl = mesh(new THREE.SphereGeometry(r, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), M.lens); gl.scale.y = 0.3; gl.rotation.x = -Math.PI / 2; at(gl, 0, 0, -0.0018); g.add(gl);
    head.add(g); return g; };
  const camMain = lensAt(0.0105, -0.0075, 0, X.goldRing), camMid = lensAt(0.0058, 0.0135, 0.0085), camTele = lensAt(0.0062, 0.0135, -0.0085);
  reg(camMain, 'camMain', V3(0, 0, -0.04), { label: V3(0, 0, -0.006) }); reg(camMid, 'camMid', V3(0, 0.01, -0.05), { label: V3(0, 0.002, -0.006) }); reg(camTele, 'camTele', V3(0, -0.01, -0.05), { label: V3(0, -0.002, -0.006) });
  sg.add(gim); reg(gim, 'gimbal', V3(0, -0.02, -0.09), { coarse: true, label: V3(0.03, -0.02, -0.02) });

  // ---------- アーム ×4 (前は高く水平に畳む・後ろは低く斜め下へ畳む) ----------
  const bladeGeo = (dir) => { const g = propGeometry(dir, [0]); g.scale(0.877, 0.8, 0.877); return g; };
  const fullGeo = (dir) => { const g = propGeometry(dir); g.scale(0.877, 0.8, 0.877); return g; };
  const PG = { bCCW: bladeGeo(1), bCW: bladeGeo(-1), fCCW: fullGeo(1), fCW: fullGeo(-1) };
  const ARMS = [   // 並びは M1前右 M2後右 M3後左 M4前左（550クラスと同じ）
    { id: 'M1', front: true, sx: 1, hinge: V3(0.050, 0.012, -0.062), motor: V3(0.174, 0.016, -0.134), dir: 1 },
    { id: 'M2', front: false, sx: 1, hinge: V3(0.044, -0.014, 0.084), motor: V3(0.162, -0.004, 0.140), dir: -1 },
    { id: 'M3', front: false, sx: -1, hinge: V3(-0.044, -0.014, 0.084), motor: V3(-0.162, -0.004, 0.140), dir: 1 },
    { id: 'M4', front: true, sx: -1, hinge: V3(-0.050, 0.012, -0.062), motor: V3(-0.174, 0.016, -0.134), dir: -1 },
  ];
  const folds = [];
  ARMS.forEach((A, k) => {
    const d = V3().subVectors(A.motor, A.hinge), len = Math.hypot(d.x, d.z), yaw = Math.atan2(-d.z, d.x), rise = Math.atan2(d.y, len);
    const ag = new THREE.Group(); ag.position.copy(A.hinge); ag.rotation.y = yaw; sg.add(ag);
    const fg = new THREE.Group(); ag.add(fg);        // 畳むときに回る入れ物
    const arm = new THREE.Group();
    const beam = mesh(rboxGeo(len - 0.012, A.front ? 0.014 : 0.012, A.front ? 0.022 : 0.020, 0.005, 3), X.shell); beam.rotation.z = rise; at(beam, len / 2 - 0.004, d.y / 2, 0); arm.add(beam);
    arm.add(at(mesh(cylGeo(0.008, 0.008, 0.020, 20), X.shellDark), 0, 0, 0));    // ヒンジ
    // 先端のポッド(モーターの台)
    arm.add(at(mesh(cylGeo(0.0205, 0.0185, 0.014, 32), X.shell), len, d.y - 0.004, 0));
    if (!A.front) {   // 後アームの脚
      arm.add(tubeBetween(V3(len - 0.004, d.y - 0.010, 0), V3(len - 0.010, LEG_Y - A.hinge.y + 0.004, 0), 0.0042, X.shellDark, 14));
      arm.add(at(mesh(new THREE.SphereGeometry(0.0055, 16, 10), M.rubber), len - 0.010, LEG_Y - A.hinge.y + 0.004, 0));
    }
    fg.add(arm); reg(arm, A.front ? 'frontArm' : 'rearArm', V3(0.05, 0, 0), { label: (A.front && k === 0) || (!A.front && k === 1) ? V3(len * 0.55, 0.01, 0) : null });
    // モーター
    const mg = new THREE.Group(); mg.name = 'motor'; at(mg, len, d.y + 0.003, 0); fg.add(mg);
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
    // 前アーム: 脚(アンテナ入り)とフロントLED / 後アーム: ステータスインジケーター
    if (A.front) {
      const lg = new THREE.Group();
      const legShape = polyShape([[0, 0], [0.020, 0], [0.012, LEG_Y - A.hinge.y - d.y + 0.010], [0.004, LEG_Y - A.hinge.y - d.y + 0.010]]);
      const lgeo = new THREE.ExtrudeGeometry(legShape, { depth: 0.006, bevelEnabled: true, bevelThickness: 0.0015, bevelSize: 0.0015, bevelSegments: 2 }); lgeo.translate(-0.010, 0, -0.003);
      const leg = mesh(lgeo, X.shellDark); at(leg, len - 0.006, d.y - 0.010, 0); leg.rotation.y = Math.PI / 2; lg.add(leg);
      lg.add(at(mesh(new THREE.SphereGeometry(0.004, 14, 10), M.rubber), len - 0.006, LEG_Y - A.hinge.y + 0.004, 0));
      fg.add(lg); reg(lg, 'landingGear', V3(0, -0.03, 0), { label: k === 0 ? V3(len - 0.006, -0.05, 0) : null }); legs.push({ group: lg, sx: A.sx, pivots: [] });
      const led = new THREE.Group(); at(led, len + 0.016, d.y - 0.008, 0);
      led.add(mesh(rboxGeo(0.006, 0.004, 0.010, 0.0015), M.ledCover)); led.add(at(mesh(new THREE.BoxGeometry(0.004, 0.0012, 0.007), M.ledGreen), 0, -0.0016, 0));
      const core2 = new THREE.Sprite(M.glowCore(0x18ff4a)); core2.scale.set(0.009, 0.009, 1); core2.position.y = -0.003; core2.renderOrder = 6; led.add(core2);
      const halo = new THREE.Sprite(M.glowHalo(0x18ff4a)); halo.scale.set(0.022, 0.022, 1); halo.position.y = -0.004; halo.renderOrder = 6; led.add(halo);
      fg.add(led); reg(led, 'led', V3(0.04, -0.02, 0), { label: k === 0 ? V3(0.004, -0.004, 0) : null }); led.userData.halo = halo; led.userData.core = core2; halo.userData.baseColor = halo.material.color.clone();
    } else if (k === 1) {
      const st = new THREE.Group(); at(st, len + 0.012, d.y - 0.011, 0);
      st.add(mesh(rboxGeo(0.008, 0.003, 0.012, 0.0012), M.ledCover)); const lamp = at(mesh(new THREE.BoxGeometry(0.006, 0.001, 0.008), M.ledGreen), 0, -0.0012, 0); st.add(lamp);
      fg.add(st); const sp = reg(st, 'statusLed', V3(0.04, -0.02, 0), { label: V3(0.004, -0.004, 0) }); sp.lamp = lamp;
    }
    const ua = new THREE.Group(); ua.position.set(0, PY, 0); ua.scale.setScalar(1 / K); mg.add(ua);
    const mo = { group: mg, prop: propG, propMesh: blades[0], blades, hinges, ghosts, disc, bell, mags, shaft, adapter: hubCap, dir: A.dir, arm: ag, id: A.id, u: V3(A.motor.x, 0, A.motor.z), part: mp, arrowAnchor: ua, front: A.front, sx: A.sx, fold: fg, yaw };
    motors.push(mo); folds.push({ fg, front: A.front, sx: A.sx, yaw, len });
  });

  // ---------- 説明用の重ね絵 (画角・検知範囲。部品には数えない) ----------
  const fovG = new THREE.Group(); fovG.visible = false; head.add(fovG);
  const frustum = (fovDeg, len, mat) => { const dg = Math.tan(THREE.MathUtils.degToRad(fovDeg / 2)) * len, a = dg * 0.8, b = dg * 0.6;   /* 公式のFOVを対角とみなし、4:3 の枠にする */
    const g = new THREE.ConeGeometry(Math.hypot(a, b), len, 4, 1, true); g.rotateY(Math.PI / 4); g.scale(a / Math.hypot(a, b) * Math.SQRT2, 1, b / Math.hypot(a, b) * Math.SQRT2); g.rotateX(Math.PI / 2); g.translate(0, 0, -len / 2 - 0.018);
    const m = new THREE.Mesh(g, mat); m.renderOrder = 7; return m; };
  fovG.add(frustum(72, 0.95, X.fovMain), frustum(35, 1.15, X.fovMid), frustum(15, 1.35, X.fovTele)); noPart(fovG);
  const senseG = new THREE.Group(); senseG.visible = false; sg.add(senseG);
  { const S2 = 0.022;   // 実際の測定範囲(m)を 1/45 にした概念図
    const lobe = (dir, r) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2.4), X.sense); m.quaternion.setFromUnitVectors(UP, dir.clone().normalize()); m.renderOrder = 7; return m; };
    senseG.add(lobe(V3(0, 0, -1), 24 * S2), lobe(V3(0, 0, 1), 22 * S2), lobe(V3(1, 0, 0), 21 * S2), lobe(V3(-1, 0, 0), 21 * S2), lobe(V3(0, 1, 0), 18 * S2), lobe(V3(0, -1, 0), 17 * S2 * 0.25));
    const beam = new THREE.Mesh(new THREE.ConeGeometry(Math.tan(Math.PI / 6) * 25 * S2, 25 * S2, 4, 1, true), X.lidarBeam); beam.rotation.y = Math.PI / 4;   /* 視野は上下・左右とも60°（公式） */ beam.rotation.x = -Math.PI / 2; beam.position.set(0, 0.014, -0.125 - 25 * S2 / 2); beam.renderOrder = 8; senseG.add(beam);
    const irb = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.075, 24, 1, true), X.irBeam); irb.position.set(0, -0.037 - 0.0375, -0.010); irb.renderOrder = 8; senseG.add(irb);
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

  return { root, sg, halfSpan: 0.31, focusMin: 0.26, parts, pick, wires, motors, legs, arrows, batPart, G, cgMarker, personGroup: null, folds, gimbalParts: { roll, tilt, head, yoke }, fovG, senseG,
    rotor: { R: 0.1334 * K, y0: 0 }, moveR: 0.26, moveY: 0.05, rpmScale: 1.1 };
}
