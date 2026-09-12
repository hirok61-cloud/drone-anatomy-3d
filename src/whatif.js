// ===== もしもの5場面 (パッケージ⑩) =====
// ⑤が「組み立ての間違い」なのに対し、こちらは外の状況。機体ができることと人がやることを対で見せる。
const whatif = {
  active: false, def: null, phase: 0, t: 0, litIdx: -1, blink: 0,
  saved: { air: false, personPos: null, personVis: false }, seq: [], ring: null,
};
const D2R_W = (d) => THREE.MathUtils.degToRad(d);

function whatifStageIndex() { return clamp(whatif.phase, 0, WHATIF_STAGES.length - 1); }

function startWhatif(id) {
  const def = WHATIF.find(w => w.id === id); if (!def) return;
  stopTheater(true); stopWhatif(true);
  theater.cam = true;   // 劇場で視点をドラッグすると false のままになるので、場面の頭で必ず戻す
  whatif.active = true; whatif.def = def; whatif.phase = 0; whatif.t = 0; whatif.litIdx = -1; whatif.blink = 0; whatif.seq = [];
  S.whatif = whatif; setBodyMode('theater');
  body.px = body.pz = 0; body.py = free.hoverY; body.tx = body.tz = body.wx = body.wz = 0; body.yaw = 0; body.mult = [1, 1, 1, 1];
  D.motors.forEach(mo => { mo.rpmTarget = null; mo.rpmRate = 3.5; });
  S.power = 0.5;
  whatif.saved.air = S.air; S.labelsSuppressed = true; S.labelOnly = null;
  if (def.motion === 'night') { whatif.night = true; for (const a of D.arrows.thrust) a.userData.forceHide = true; }   /* 光るものを灯火だけにする */
  if (def.motion === 'wind') { S.air = true; for (const x of $$('.tgl[data-t=air]')) x.classList.add('on'); }   // 風の場面だけ気流を出す
  if (def.motion === 'driftHold') {   // GPS: 開始位置の床リング(流された量の基準)
    if (!whatif.ring) { const rg = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.002, 8, 72), new THREE.MeshBasicMaterial({ color: 0x3b7df7, transparent: true, opacity: 0.5, toneMapped: false })); rg.rotation.x = Math.PI / 2; rg.position.y = -0.156; rg.userData.noPart = rg.userData.noPick = rg.userData.noAO = rg.userData.noShadow = true; scene.add(rg); whatif.ring = rg; }
    whatif.ring.visible = true;
  }
  if (D.personGroup) { whatif.saved.personPos = D.personGroup.position.clone(); whatif.saved.personVis = D.personGroup.visible; }
  if (def.motion === 'airport') airportSetup();
  if (def.motion === 'crowd') dropSetup();
  const wide = { tachiiri: 2.6, bvlos: 4.2, airport: 2.6, crowd: 1.7 }[def.motion];   /* 床(半径2.8m)より広い場面は一時的に広げる */
  if (wide && !whatif.groundScale) { whatif.groundScale = ground.scale.x; ground.scale.set(wide, 1, wide); }
  const vs = viewScale();
  if (def.motion === 'tachiiri') { tachiiriSetup(); const dv = vs > 1 ? 1.3 : 1; theaterCamera(new THREE.Vector3(4.6 * dv, 4.4 * dv, 4.6 * dv), new THREE.Vector3(-1.4, 0.2, -1.4), 900); }   /* 近づく向きに沿って奥を見る俯瞰。3人を奥行き方向に並べるので縦画面でも入る */
  else if (def.motion === 'person') theaterCamera(new THREE.Vector3(3.2 * vs, 1.6 * vs, -2.6 * vs), new THREE.Vector3(-0.35, 0.72, -0.35), 900);   // 人型(1.7m)が全身で入る引き(約4.4m)
  else if (def.motion === 'night') theaterCamera(new THREE.Vector3(1.15 * vs, 0.42 * vs, -1.15 * vs), new THREE.Vector3(0, 0.02, 0), 900);   /* 灯火の色が前後で分かる高さ。俯瞰にすると向きが読めない */
  else if (def.motion === 'bvlos') theaterCamera(new THREE.Vector3(1.95 * vs, 1.05 * vs, 1.95 * vs), new THREE.Vector3(-0.15, 0.30, -0.15), 900);   /* 操縦者の肩ごし。機体が奥へ小さくなっていくのを見送る */
  else if (def.motion === 'airport') theaterCamera(new THREE.Vector3(3.5 * vs, 1.5 * vs, -1.2 * vs), new THREE.Vector3(0, 0.75, 1.2), 900);   /* 斜めの面と機体の高さの関係が見える横から */
  else if (def.motion === 'crowd') theaterCamera(new THREE.Vector3(3.4 * vs, 2.5 * vs, -3.4 * vs), new THREE.Vector3(-0.7, 0.35, -0.7), 900);   /* 床の円が広がるのが見える俯瞰 */
  else theaterCamera(new THREE.Vector3(1.05 * vs, 0.55 * vs, -1.05 * vs), new THREE.Vector3(0, 0.03, 0), 800);
  if (typeof onWhatifChanged === 'function') onWhatifChanged();
}

function stopWhatif(silent) {
  if (!whatif.active) { S.labelsSuppressed = false; S.labelOnly = null; return; }
  for (const k of whatif.def.parts) for (const p of partsOf(k)) setTint(p, ACCENT, 0);
  for (const p of partsOf('led')) { setTint(p, RED, 0); const h = p.obj.userData.halo; if (h && h.userData.baseColor) { h.material.color.copy(h.userData.baseColor); h.material.opacity = THEME[themeDark ? 'dark' : 'light'].halo; } }
  if (whatif.ring) whatif.ring.visible = false;
  D.motors.forEach(mo => { mo.rpmTarget = null; mo.rpmRate = null; });
  for (let i = 0; i < 4; i++) body.mult[i] = 1;
  air.windOverride = null; S.air = whatif.saved.air; for (const x of $$('.tgl[data-t=air]')) x.classList.toggle('on', S.air);
  if (D.personGroup) { if (whatif.saved.personPos) D.personGroup.position.copy(whatif.saved.personPos); D.personGroup.visible = whatif.saved.personVis; if (D.personGroup.userData.rest) D.personGroup.userData.rest(); if (D.personGroup.userData.face) D.personGroup.userData.face(0, 0); }
  if (whatif.people) for (const g of whatif.people) { g.visible = false; if (g.userData.foot) g.userData.foot.visible = false; }
  if (whatif.ring2) whatif.ring2.visible = false;
  if (whatif.apt) whatif.apt.visible = false;
  if (whatif.drop) whatif.drop.visible = false;
  if (whatif.night) { whatif.night = false; nightLevel(0); for (const p of partsOf('led')) { const h = p.obj.userData.halo; if (h) h.scale.setScalar(0.022); } applyTheme(); for (const a of D.arrows.thrust) a.userData.forceHide = false; }
  if (whatif.groundScale) { ground.scale.set(whatif.groundScale, 1, whatif.groundScale); whatif.groundScale = null; }
  S.labelsSuppressed = false; S.labelOnly = null; buildLabels();
  whatif.active = false; whatif.def = null; whatif.phase = 0; S.whatif = null;
  S.power = 0; setBodyMode('idle');
  S.shadowDirty = S.csDirty = S.aoDirty = true;
  if (!silent && typeof onWhatifChanged === 'function') onWhatifChanged();
}

function whatifNext() {
  if (!whatif.active) return;
  if (whatif.phase === 0) { whatif.phase = 1; whatif.t = 0; }
  else if (whatif.phase === 3) { return; }
  if (typeof onWhatifChanged === 'function') onWhatifChanged();
}
function whatifRestart() { const id = whatif.def && whatif.def.id; if (id) { stopWhatif(true); startWhatif(id); } }

// ---------- 場面の小道具（夜の明るさ・空港の制限表面・落下の範囲） ----------
// 夜は「暗くする」のではなく、光源と環境光を落として灯火だけが残る状態にする。テーマの値を基準に戻せるようにしておく
function nightLevel(k) {
  const T = THEME[themeDark ? 'dark' : 'light'];
  key.intensity = T.key[1] * (1 - 0.92 * k); rim.intensity = T.rim[1] * (1 - 0.88 * k); kick.intensity = T.kick[1] * (1 - 0.94 * k);
  scene.environmentIntensity = T.env * S.envMul * (1 - 0.90 * k);
  renderer.toneMappingExposure = T.exposure * S.exposureMul * (1 - 0.18 * k);
  const mix = (u, hex) => u.value.set(hex).lerp(NIGHT_SKY, k);
  mix(backdropMat.uniforms.top, T.bg[0]); mix(backdropMat.uniforms.mid, T.bg[1]); mix(backdropMat.uniforms.edge, T.bg[2]); mix(backdropMat.uniforms.bottom, T.bg[3]);
  groundMat.color.set(T.ground).lerp(NIGHT_GROUND, k);
  for (const p of partsOf('led')) { const h = p.obj.userData.halo; if (h) { h.material.opacity = THEME[themeDark ? 'dark' : 'light'].halo + 0.55 * k; h.scale.setScalar(0.022 * (1 + 1.6 * k)); } }
  S.csDirty = S.aoDirty = true;
}
const NIGHT_SKY = new THREE.Color(0x05070c), NIGHT_GROUND = new THREE.Color(0x0a0c10);

// 空港: 滑走路の帯と、そこから斜めに立ち上がる面（模式図）。高さは実際の制限表面ではない
const APT_LO = 0.12, APT_HI = 1.45;
const aptHeight = (z) => APT_LO + (APT_HI - APT_LO) * clamp((3.2 - z) / 4.6, 0, 1);
function airportSetup() {
  if (!whatif.apt) {
    const g = new THREE.Group(); g.userData.noShadow = true;
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 5.0), new THREE.MeshBasicMaterial({ color: 0x9aa3b0, transparent: true, opacity: 0.55, toneMapped: false, side: THREE.DoubleSide }));
    strip.rotation.x = -Math.PI / 2; strip.position.set(0, -0.1551, 5.2);
    const center = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 4.4), new THREE.MeshBasicMaterial({ color: 0xf2f4f8, transparent: true, opacity: 0.8, toneMapped: false, side: THREE.DoubleSide }));
    center.rotation.x = -Math.PI / 2; center.position.set(0, -0.1549, 5.2);
    // 面は4隅を直に置く（回転で作ると向きを間違える）。滑走路の側(奥 z=+3.2)で低く、手前へ来るほど高い
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([-2.6, APT_LO, 3.2, 2.6, APT_LO, 3.2, 2.6, APT_HI, -1.4, -2.6, APT_HI, -1.4], 3));
    geo.setIndex([0, 1, 2, 0, 2, 3]); geo.computeVertexNormals();
    const surf = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xef6a2d, transparent: true, opacity: 0.17, toneMapped: false, side: THREE.DoubleSide, depthWrite: false }));
    const edge = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.012, 0.012), new THREE.MeshBasicMaterial({ color: 0xef6a2d, toneMapped: false }));
    edge.position.set(0, APT_LO, 3.2);
    for (const m of [strip, center, surf, edge]) { m.userData.noPart = m.userData.noPick = m.userData.noAO = m.userData.noShadow = true; g.add(m); }
    scene.add(g); whatif.apt = g; whatif.aptSurf = surf;
  }
  whatif.apt.visible = true;
}
// 落ちる範囲: 高度に応じて広がる床の円（模式図）
function dropSetup() {
  if (!whatif.drop) {
    const g = new THREE.Group(); g.userData.noShadow = true;
    const ringGeo = new THREE.RingGeometry(0.97, 1.0, 96);
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xe8a33d, transparent: true, opacity: 0.95, toneMapped: false, side: THREE.DoubleSide }));
    const fill = new THREE.Mesh(new THREE.CircleGeometry(1.0, 96), new THREE.MeshBasicMaterial({ color: 0xe8a33d, transparent: true, opacity: 0.10, toneMapped: false, side: THREE.DoubleSide, depthWrite: false }));
    for (const m of [fill, ring]) { m.rotation.x = -Math.PI / 2; m.position.y = -0.1548; m.userData.noPart = m.userData.noPick = m.userData.noAO = m.userData.noShadow = true; g.add(m); }
    scene.add(g); whatif.drop = g; whatif.dropRing = ring; whatif.dropFill = fill;
  }
  whatif.drop.visible = true; whatif.drop.scale.set(0.35, 1, 0.35); whatif.dropFill.material.opacity = 0.10; whatif.dropRing.material.opacity = 0.95;
}
function dropColor(inside) {
  if (whatif.phase >= 2) return;
  const c = inside ? RED : new THREE.Color(0xe8a33d);
  whatif.dropRing.material.color.copy(c); whatif.dropFill.material.color.copy(c);
  whatif.dropFill.material.opacity = inside ? 0.18 : 0.10;
}

// ---------- 機体の反応（すべて小さく: 姿勢±8°・移動0.25m以内） ----------
const RM = () => (reduceMotion ? 1 / 3 : 1);
const WHATIF_MOTION = {
  // 電波が切れた → 向きを変えて帰り、降りる
  rth(t, dt) {
    if (t < 0.8) { body.py = free.hoverY; return false; }
    if (t < 4.0) {
      body.yaw = dl(body.yaw, Math.PI, dt, 3);
      if (t >= 2.0) { const k = smoothstep(2.0, 3.6, t); body.pz = 0.20 * k; body.tz = D2R_W(6) * RM() * Math.sin(Math.PI * k); }
      return false;
    }
    body.tz = dl(body.tz, 0, dt, 6);
    const k = smoothstep(4.0, 5.4, t); body.py = free.hoverY * (1 - k);
    if (t > 5.0) D.motors.forEach(mo => { mo.rpmTarget = 0; });
    return t > 5.6;
  },
  // 電池が少ない → ゆっくり降りる
  landSlow(t, dt) {
    if (t < 1.0) { body.py = free.hoverY; return false; }
    body.py = dl(body.py, 0, dt, 1.2);
    if (t > 3.6) D.motors.forEach(mo => { mo.rpmTarget = 0; });
    return t > 4.4;
  },
  // GPSを見失った → 位置は流されるが姿勢は保つ
  driftHold(t, dt) {
    body.py = free.hoverY;
    if (t < 1.5) { body.px = dl(body.px, 0.06, dt, 1.5); body.tx = 0; return false; }
    if (t < 2.2) { body.tx = dl(body.tx, -D2R_W(4) * RM(), dt, 5); return false; }
    body.tx = dl(body.tx, 0, dt, 3); body.px = 0.06;   // 位置は戻さない
    return t > 4.5;
  },
  // 風が強い → 風上へ傾いて踏ん張る
  wind(t, dt) {
    body.py = free.hoverY;
    const k = smoothstep(0, 1.0, t);
    // 風は +x へ吹く → 風上(−x)へ傾く。傾きを作る一瞬だけ風下側(+x: M1/M2)が強く回り、傾いたままの間は4つとも少し余分に働く
    body.tx = -D2R_W(7) * RM() * k;
    body.px = 0.02 * k * Math.sin(2 * Math.PI * 0.4 * t);
    air.windOverride = air.windOverride || new THREE.Vector3();
    air.windOverride.set(0.9 * k, 0, 0);
    const tr = Math.sin(Math.PI * clamp(t / 1.0, 0, 1)), coll = 0.05 * k;
    body.mult[0] = 1 + 0.12 * tr + coll; body.mult[1] = 1 + 0.12 * tr + coll; body.mult[2] = 1 - 0.12 * tr + coll; body.mult[3] = 1 - 0.12 * tr + coll;
    return t > 4.5;
  },
  // 人を入れない → 第三者は補助者の手前で止まり、機体はその場に降りる
  tachiiri(t, dt) {
    const P = whatif.people; if (!P) return t > 5.0;
    const th = P[2]; const k = smoothstep(1.0, 3.6, t), dd = 6.0 - 2.2 * k, walking = t > 1.0 && k < 1;   /* 半径6.0m → 3.8m（区画の外で止まる） */
    const phase = 2 * Math.PI * (2.2 * k) / 1.3;
    th.position.set(-0.894 * dd, -0.158 + (walking ? 0.012 * Math.abs(Math.sin(phase)) : 0), -0.447 * dd);
    th.userData.face(P[1].position.x, P[1].position.z);
    if (walking) th.userData.walk(phase, 1); else th.userData.rest(dt);
    if (th.userData.foot) th.userData.foot.position.set(th.position.x, -0.1555, th.position.z);
    if (t < 3.8) body.py = free.hoverY + 0.03;
    else { const k2 = smoothstep(3.8, 5.0, t); body.py = (free.hoverY + 0.03) * (1 - k2); if (t > 4.6) D.motors.forEach(mo => { mo.rpmTarget = 0; }); }
    if (t > 3.6) { const b = 0.5 + 0.5 * Math.sin((t - 3.6) * 2 * Math.PI / 0.6); for (const p of partsOf('led')) { setTint(p, RED, 0.6 * b); const h = p.obj.userData.halo; if (h) { h.material.color.copy(RED); h.material.opacity = 0.06 + 0.4 * b; } } }
    return t > 5.4;
  },
  // 夜に飛ばす → 暗くなり、灯火だけが残る。機首の向きを見せるためにゆっくり半回転する
  night(t, dt) {
    body.py = free.hoverY;
    nightLevel(smoothstep(0.2, 2.2, t));
    if (t > 1.6) body.yaw = dl(body.yaw, Math.PI, dt, 1.1);
    if (t > 2.0) { const b = 0.5 + 0.5 * Math.sin((t - 2.0) * 2 * Math.PI / 1.1); for (const p of partsOf('led')) { setTint(p, RED, 0.55 * b); const h = p.obj.userData.halo; if (h) { h.material.color.copy(RED); h.material.opacity = 0.25 + 0.5 * b; } } }
    return t > 5.6;
  },
  // 見えなくなる → 遠ざかって小さくなる。操縦者の位置にカメラを置いたまま見送る
  bvlos(t, dt) {
    body.py = free.hoverY + 0.55 * smoothstep(0.5, 4.2, t);
    const k = smoothstep(0.5, 4.6, t), d = 9.5 * k;
    body.px = -0.707 * d; body.pz = -0.707 * d;
    body.yaw = dl(body.yaw, Math.PI * 0.75, dt, 1.2);
    return t > 5.2;
  },
  // 空港が近い → 高度を上げると、斜めの制限表面に頭が入る
  airport(t, dt) {
    const k = smoothstep(0.6, 3.6, t);
    body.py = free.hoverY + 1.30 * k;   /* 面（手前で1.45m）に頭が入るところまで上がる */
    body.pz = 0.2 * k;
    if (whatif.aptSurf) {   /* 面に届いたら色を強める */
      const over = body.py > aptHeight(body.pz) - 0.12;
      whatif.aptSurf.material.opacity = over ? 0.32 : 0.17;
      whatif.aptSurf.material.color.set(over ? 0xef4444 : 0xef6a2d);
      whatif.aptOver = over;
    }
    if (t > 3.4) { const b = 0.5 + 0.5 * Math.sin((t - 3.4) * 2 * Math.PI / 0.5); for (const p of partsOf('led')) { setTint(p, RED, 0.7 * b); const h = p.obj.userData.halo; if (h) { h.material.color.copy(RED); h.material.opacity = 0.06 + 0.5 * b; } } }
    return t > 5.0;
  },
  // 落ちる範囲 → 高度を上げるほど床の円が広がり、立っている人を呑み込む
  crowd(t, dt) {
    const k = smoothstep(0.5, 4.0, t);
    body.py = free.hoverY + 1.5 * k;
    const g = D.personGroup;
    if (g) { g.visible = true; g.position.set(-1.55, -0.158, -1.55); if (g.userData.face) g.userData.face(0, 0); if (g.userData.rest) g.userData.rest(dt); }
    const r = 0.35 + 2.15 * k;   /* 高さに比例して広がる（模式。実際の落下距離ではない） */
    if (whatif.drop) { whatif.drop.scale.set(r, 1, r); whatif.drop.position.set(body.px, 0, body.pz); }
    const dist = Math.hypot(-1.55 - body.px, -1.55 - body.pz);
    const inside = r >= dist;
    if (whatif.drop) dropColor(inside);
    if (inside) { const b = 0.5 + 0.5 * Math.sin(t * 2 * Math.PI / 0.5); for (const p of partsOf('led')) { setTint(p, RED, 0.7 * b); const h = p.obj.userData.halo; if (h) { h.material.color.copy(RED); h.material.opacity = 0.06 + 0.5 * b; } } }
    return t > 5.0;
  },
  // 人が近づいた → 機体は避けられない。灯火と音で知らせるだけ
  person(t, dt) {
    body.py = free.hoverY + 0.03 * smoothstep(1.0, 1.8, t);
    const g = D.personGroup;
    if (g) {   // 機体の前左(画面右・同じ奥行き)から 2.6m → 1.3m に歩いて寄る。歩きの上下 12mm、脚と腕を振る
      g.visible = true; const k = smoothstep(1.0, 3.0, t), dd = 2.6 - 1.3 * k, walking = t > 1.0 && k < 1;
      const phase = 2 * Math.PI * (1.3 * k) / 1.3;   // 進んだ距離で位相を進める(1周期=2歩=1.3m) → 足が地面を滑らない
      g.position.set(-0.707 * dd, -0.158 + (walking ? 0.012 * Math.abs(Math.sin(phase)) : 0), -0.707 * dd);
      if (g.userData.face) g.userData.face(0, 0);
      if (g.userData.walk) { if (walking) g.userData.walk(phase, 1); else g.userData.rest(dt); }
    }
    if (t > 3.0) { const b = 0.5 + 0.5 * Math.sin((t - 3.0) * 2 * Math.PI / 0.5); for (const p of partsOf('led')) { setTint(p, RED, 0.8 * b); const h = p.obj.userData.halo; if (h) { h.material.color.copy(RED); h.material.opacity = 0.06 + 0.5 * b; } } }
    return t > 4.4;
  },
};

// ---------- 立入管理措置: 操縦者・補助者・第三者と区画の輪 ----------
function footShadowTex() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 2, 32, 32, 32); grd.addColorStop(0, 'rgba(0,0,0,0.55)'); grd.addColorStop(0.55, 'rgba(0,0,0,0.22)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function tachiiriSetup() {
  if (!whatif.people) {
    whatif.people = [0, 1, 2].map(() => { const g = buildPerson(); g.traverse(o => { o.userData.noPick = true; }); scene.add(g); return g; });
    const rg = new THREE.Mesh(new THREE.TorusGeometry(3.0, 0.02, 8, 200), new THREE.MeshBasicMaterial({ color: 0xe8a33d, transparent: true, opacity: 0.9, toneMapped: false }));
    rg.rotation.x = Math.PI / 2; rg.position.y = -0.156; rg.userData.noPart = rg.userData.noPick = rg.userData.noAO = rg.userData.noShadow = true; scene.add(rg); whatif.ring2 = rg;
    // 足元の影: 影マップの枠を広げると粗くなるので、人には柔らかい円を敷く
    const ftex = footShadowTex();
    for (const g of whatif.people) { const f = new THREE.Mesh(new THREE.CircleGeometry(0.26, 32), new THREE.MeshBasicMaterial({ map: ftex, transparent: true, depthWrite: false, toneMapped: false })); f.rotation.x = -Math.PI / 2; f.position.y = -0.1555; f.renderOrder = -1; f.userData.noPart = f.userData.noPick = f.userData.noAO = f.userData.noShadow = true; scene.add(f); g.userData.foot = f; }
  }
  const [op, as, th] = whatif.people;
  op.position.set(0.6, -0.158, 1.35); op.userData.face(0, 0); op.userData.rest(); op.visible = true;            /* 操縦者: 機体の手前(カメラ側) */
  as.position.set(-2.05, -0.158, -2.05); as.userData.face(-6, -6); as.userData.rest(); as.visible = true;        /* 補助者: 区画の境目で外を向く */
  th.position.set(-5.36, -0.158, -2.68); th.userData.face(-2.05, -2.05); th.userData.rest(); th.visible = true;   /* 第三者: 補助者の横から近づく(画面上で重ならない向き) */
  whatif.ring2.visible = true;
  if (!whatif.groundScale) { whatif.groundScale = ground.scale.x; ground.scale.set(2.6, 1, 2.6); }   /* 床(半径2.8m)のままだと区画も人も虚空に立つ */
  for (const g of whatif.people) if (g.userData.foot) { g.userData.foot.visible = true; g.userData.foot.position.set(g.position.x, -0.1555, g.position.z); }
}
function stepWhatif(dtSim, dtReal) {
  if (!whatif.active) return;
  whatif.t += dtSim; const def = whatif.def;
  if (whatif.phase === 1) {
    const done = WHATIF_MOTION[def.motion](whatif.t, dtSim);
    if (done) { whatif.phase = 2; whatif.t = 0; whatif.litIdx = -1; whatif.seq = []; S.labelsSuppressed = false;
      if (whatif.aptSurf) whatif.aptSurf.material.opacity = 0.10;   /* 部品を見る段では小道具を控えめに */
      if (whatif.dropFill) { whatif.dropFill.material.opacity = 0.06; whatif.dropRing.material.opacity = 0.7; }
      if (['tachiiri', 'bvlos', 'airport', 'crowd'].includes(def.motion)) { const vs2 = viewScale(); const c = new THREE.Vector3(body.px, body.py, body.pz); theaterCamera(new THREE.Vector3(1.05 * vs2, 0.55 * vs2, -1.05 * vs2).add(c), c.clone().setY(body.py + 0.03), 900); }   /* 引いたままだと部品が小さすぎるので、いまいる場所へ寄る */ if (typeof onWhatifChanged === 'function') onWhatifChanged(); }
  } else if (whatif.phase === 2) {
    const idx = Math.min(def.parts.length - 1, Math.floor(whatif.t / 1.2));
    if (idx !== whatif.litIdx) {
      whatif.litIdx = idx; whatif.seq = def.parts.slice(0, idx + 1);
      def.parts.forEach((k, i) => { for (const p of partsOf(k)) setTint(p, ACCENT, i === idx ? 1.0 : i < idx ? 0.35 : 0); });
      S.labelOnly = new Set([def.parts[idx]]); buildLabels();   // 深さに関わらずその部品のラベルだけ出す
      if (typeof onWhatifChanged === 'function') onWhatifChanged();
    }
    if (whatif.t > def.parts.length * 1.2) {
      whatif.phase = 3; whatif.t = 0; S.labelOnly = null; buildLabels();
      for (const k of def.parts) for (const p of partsOf(k)) setTint(p, ACCENT, 0.25);
      if (typeof onWhatifChanged === 'function') onWhatifChanged();
    }
  }
  S.shadowDirty = S.csDirty = S.aoDirty = true;
}

function initWhatif() { air.windOverride = null; }
