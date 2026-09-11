// ===== やってしまったシアター: 台本エンジンと6シナリオ =====
const theater = { active: false, def: null, phase: 'idle', t: 0, ev: 0, broken: false, red: [], flagged: [], debris: [], subtitle: '', cam: true, step: 0, waiting: false, done: false, legBend: [0, 0, 0, 0], legPerm: [0, 0, 0, 0], shake: 0, shakeOff: 0, shook: false, brokenAt: 0, orbit: 0, resetH: 0, fix: [] };
const RED = new THREE.Color(0xff3b30);
const TH_STAGES = ['まちがい', '飛ぶ', 'こわれた', 'ふせぐ', 'なおす'];
const M_UPTO = (rpm) => D.motors.forEach(mo => { mo.rpmTarget = rpm; });

function partsFor(key, idxs) { const ps = partsOf(key); return idxs && idxs.length ? ps.filter(p => idxs.includes(p.idx)) : ps; }
function theaterCamera(pos, target, dur = 900) { if (theater.cam) flyTo(pos, target, dur, false); }
function motorWorld(i, y = 0.02) { return D.motors[i].group.localToWorld(new THREE.Vector3(0, y, 0)); }

function startTheater(id) {
  const def = MISHAPS.find(m => m.id === id); if (!def) return;
  stopTheater(true);
  theater.active = true; theater.def = def; theater.phase = 'setup'; theater.t = 0; theater.ev = 0; theater.broken = false; theater.red = []; theater.flagged = []; theater.debris = []; theater.step = 0; theater.waiting = true; theater.done = false; theater.cam = true; theater.legBend = [0, 0, 0, 0]; theater.legPerm = [0, 0, 0, 0]; theater.shook = false; theater.shake = 0; theater.orbit = 0; theater.fix = [];
  S.theater = theater; setBodyMode('theater');
  body.px = body.py = body.pz = 0; body.tx = body.tz = body.wx = body.wz = 0; body.yaw = 0; body.mult = [1, 1, 1, 1];
  S.power = 0; M_UPTO(0); D.motors.forEach(mo => { mo.rpmRate = 2.5; });
  for (const k of def.flag) for (const p of partsFor(k, def.flagIdx)) { setTint(p, RED, 0.22); theater.flagged.push(p); }
  applyMode();
  theater.subtitle = def.setup;
  const fp = theater.flagged[0]; if (fp) focusOn([fp.obj], { pull: true });
  if (typeof onTheaterChanged === 'function') onTheaterChanged();
}
function stopTheater(silent) {
  if (!theater.active) return;
  for (const p of theater.flagged) setTint(p, RED, 0); for (const p of theater.red) setTint(p, RED, 0);
  for (const p of D.parts) { if (p.anim) { p.anim = null; p.animReset = true; } }
  for (const d of theater.debris) { scene.remove(d.mesh); } theater.debris = [];
  D.motors.forEach(mo => { mo.rpmTarget = null; mo.rpmRate = null; mo.propMesh.visible = true; if (mo.brokenBlade) mo.brokenBlade.visible = false; });
  for (const lg of D.legs) for (const pv of lg.pivots) pv.pivot.quaternion.identity();
  if (theater.shakeOff) { camera.position.y -= theater.shakeOff; theater.shakeOff = 0; } theater.shake = 0; theaterOutlineReset();
  theater.active = false; theater.phase = 'idle'; theater.broken = false; theater.red = []; theater.flagged = []; S.theater = null;
  setTimeScale(1); setBodyMode('idle'); applyMode();
  if (!silent && typeof onTheaterChanged === 'function') onTheaterChanged();
}
// 進める(手動送り)
function theaterNext() {
  if (!theater.active) return;
  if (theater.phase === 'setup') { theater.phase = 'takeoff'; theater.t = 0; theater.waiting = false; theater.subtitle = '離陸します…'; theaterCamera(...sceneCam(theater.def, 'takeoff')); }
  else if (theater.phase === 'broken') { theater.phase = 'prevent'; theater.waiting = true; theater.subtitle = theater.def.prevent; }
  else if (theater.phase === 'prevent') { theater.phase = 'repair'; theater.t = 0; theater.waiting = false; theater.subtitle = 'なおしています…'; beginRepair(); }
  if (typeof onTheaterChanged === 'function') onTheaterChanged();
}
function theaterStageIndex() { return { setup: 0, takeoff: 1, event: 1, settle: 1, broken: 2, prevent: 3, repair: 4, reset: 4, hover: 4, done: 4 }[theater.phase] || 0; }
function sceneCam(def, phase) {
  const c = new THREE.Vector3(0, 0.05, 0), vs = viewScale();
  if (def.physics === 'drop' && phase === 'takeoff') return [new THREE.Vector3(1.9 * vs, 0.9, -2.0 * vs), new THREE.Vector3(0, 0.75, 0)];
  return [new THREE.Vector3(1.05 * vs, 0.55 * vs, -1.05 * vs), c];
}

// --- 各シナリオの「症状」: ev秒 → body を書く。戻り値 true で症状終了 ---
const EVENTS = {
  flipFR(ev) { // M1(前右)へ倒れてひっくり返る
    const s = smoothstep(0, 0.75, ev); const th = THREE.MathUtils.degToRad(160) * s; const u = MOTOR_U[0];
    body.tx = u.x * th; body.tz = u.z * th; body.py = Math.max(0.10 * s, 0.05 * (1 - smoothstep(0.1, 0.6, ev))) + 0.035 * Math.sin(Math.min(1, s) * Math.PI);
    body.px = 0.08 * s * u.x; body.pz = 0.08 * s * u.z;
    if (ev > 0.55) M_UPTO(0); if (ev < 0.1) setTimeScale(1 / 8, 0.15); if (ev > 0.5) setTimeScale(1);
    return ev > 1.6;
  },
  rollOver(ev) { // 右へ横転
    const s = smoothstep(0, 0.55, ev); const th = THREE.MathUtils.degToRad(95) * s + (ev > 0.55 ? THREE.MathUtils.degToRad(-4) * Math.sin((ev - 0.55) * 12) * Math.exp(-(ev - 0.55) * 4) : 0);
    body.tx = th; body.tz = -THREE.MathUtils.degToRad(12) * s; body.py = Math.max(0.22 * s, 0.04 * (1 - smoothstep(0.1, 0.5, ev)));
    body.px = 0.05 * s; if (ev < 0.12) setTimeScale(1 / 8, 0.15); if (ev > 0.5) setTimeScale(1); if (ev > 0.45) { D.motors[0].rpmTarget = 0; D.motors[1].rpmTarget = 0; } if (ev > 0.9) M_UPTO(0);
    return ev > 1.8;
  },
  wobbleFlip(ev) { // 補正が空回り → 対角軸まわりに裏返る
    const w = Math.min(1, ev / 0.5); const osc = THREE.MathUtils.degToRad(6) * w * Math.sin(ev * 38);
    if (ev < 0.5) { body.tx = osc; body.tz = -osc * 0.7; body.py = 0.05; if (ev < 0.15) setTimeScale(1 / 8, 0.15); }
    else { const s = smoothstep(0.5, 1.1, ev); const th = THREE.MathUtils.degToRad(165) * s; body.tx = th * 0.707; body.tz = th * 0.707; body.yaw = -THREE.MathUtils.degToRad(40) * s; body.py = Math.max(0.10 * s, 0.05 * (1 - s) + 0.03 * Math.sin(s * Math.PI)); if (ev > 0.8) setTimeScale(1); if (ev > 1.0) M_UPTO(0); }
    return ev > 2.0;
  },
  spin(ev, dt) { // その場でクルクル回る → 落とす
    if (ev < 4.6) { const rate = THREE.MathUtils.degToRad(200) * Math.exp((ev - 1.2) / 0.6); body.yaw -= Math.min(THREE.MathUtils.degToRad(200), rate) * dt; body.tx = THREE.MathUtils.degToRad(5) * Math.sin(ev * 12.5) * smoothstep(1, 2, ev); body.tz = THREE.MathUtils.degToRad(5) * Math.cos(ev * 12.5) * smoothstep(1, 2, ev); body.py = 0.12; body.px = 0.04 * Math.sin(ev * 1.3) * smoothstep(1.5, 3, ev); body.pz = 0.04 * Math.cos(ev * 1.3) * smoothstep(1.5, 3, ev);
      if (ev > 2.0 && ev < 2.3) setTimeScale(1 / 6, 0.15); if (ev > 3.6) setTimeScale(1); }
    else { const f = ev - 4.6; M_UPTO(0); body.py = Math.max(0, 0.12 - 4.9 * f * f) + (f > 0.16 ? 0.02 * Math.sin((f - 0.16) * 14) * Math.exp(-(f - 0.16) * 5) : 0); body.yaw -= THREE.MathUtils.degToRad(200) * Math.max(0, 1 - f / 0.7) * dt; body.tx = body.tz = 0; }
    return ev > 6.4;
  },
  drop(ev) { // 1.5mから落下
    const tf = 0.553;
    if (ev < tf) { body.py = 1.5 - 4.9 * ev * ev; body.tz = -THREE.MathUtils.degToRad(4) * ev / tf; M_UPTO(RPM_MAX * 0.4); if (ev > 0.40) setTimeScale(1 / 10, 0.15); return false; }   // 着地の0.15秒前からスローに入る
    const f = ev - tf; if (f < 0.14) setTimeScale(1 / 10, 0.15); else setTimeScale(1);
    body.py = Math.max(0, -0.025 * Math.exp(-f * 8) * Math.cos(f * 40) * -1 + (f > 0.05 ? 0.02 * Math.exp(-(f - 0.05) * 6) * Math.max(0, Math.sin((f - 0.05) * 20)) : 0)) * (f < 0.6 ? 1 : 0);
    body.tz = -THREE.MathUtils.degToRad(4) + THREE.MathUtils.degToRad(5) * Math.exp(-f * 4) * Math.sin(f * 30);
    for (let i = 0; i < 4; i++) { theater.legBend[i] = THREE.MathUtils.degToRad(14) * Math.exp(-f * 14) * Math.abs(Math.sin(f * 40)); } theater.legPerm[0] = THREE.MathUtils.degToRad(6) * smoothstep(0, 0.05, f);
    if (f > 0.01 && !theater.bladeFlew) { theater.bladeFlew = true; detachBlade(1); }
    if (f > 0.02 && !theater.shook) { theater.shook = true; theater.shake = 1; }
    if (f > 0.3) M_UPTO(0);
    return f > 1.4;
  },
  motorOut(ev, dt) { // M3停止 → 傾きながら落ちて横倒し
    const u = MOTOR_U[2];
    if (ev < 0.35) { D.motors[2].rpmTarget = 0; D.motors[2].rpmRate = 6; D.motors[0].rpmTarget = HOVER_RPM * 1.35; setTimeScale(1 / 6, 0.15); body.py = 0.35; const th = THREE.MathUtils.degToRad(12) * smoothstep(0, 0.35, ev); body.tx = u.x * th; body.tz = u.z * th; body.yaw += THREE.MathUtils.degToRad(30) * dt * smoothstep(0, 0.35, ev); return false; }
    setTimeScale(1); const f = ev - 0.35;
    const th = THREE.MathUtils.degToRad(12) + THREE.MathUtils.degToRad(23) * smoothstep(0, 0.55, f); body.tx = u.x * th; body.tz = u.z * th;
    body.py = Math.max(0.20 * smoothstep(0.55, 0.85, f), 0.35 - 0.5 * 4 * f * f); body.yaw += THREE.MathUtils.degToRad(80) * dt * (f < 0.6 ? 1 : Math.max(0, 1 - (f - 0.6) / 0.4));
    if (f > 0.55) { const g = smoothstep(0.55, 0.85, f); const roll = THREE.MathUtils.degToRad(70) * g; body.tx = u.x * (th + roll * 0.7); body.tz = u.z * (th + roll * 0.7); D.motors[2].rpmTarget = 0; D.motors[3].rpmTarget = 0; D.motors[1].rpmTarget = 0; if (f > 1.2) D.motors[0].rpmTarget = 0; }
    return f > 2.2;
  },
};
function detachBlade(i) {
  const mo = D.motors[i]; if (!mo.brokenBlade) { mo.brokenBlade = new THREE.Mesh(mo.dir > 0 ? D.G.bladeCCW : D.G.bladeCW, mo.propMesh.material); mo.brokenBlade.userData.noPart = mo.brokenBlade.userData.noPick = true; mo.prop.add(mo.brokenBlade); }
  mo.propMesh.visible = false; mo.brokenBlade.visible = true;
  const fly = new THREE.Mesh(mo.dir > 0 ? D.G.bladeCCW : D.G.bladeCW, mo.propMesh.material); fly.userData.noShadow = true; mo.prop.updateWorldMatrix(true, false);
  fly.position.copy(mo.prop.getWorldPosition(new THREE.Vector3())); fly.quaternion.copy(mo.prop.getWorldQuaternion(new THREE.Quaternion())).multiply(new THREE.Quaternion().setFromAxisAngle(UP, Math.PI));
  const tangent = new THREE.Vector3(0, 0, mo.dir).applyQuaternion(fly.quaternion).normalize();
  scene.add(fly); theater.debris.push({ mesh: fly, v: tangent.multiplyScalar(4).add(new THREE.Vector3(0, 1.5, 0)), w: new THREE.Vector3(0, mo.dir * 120, 0), t: 0 });
}
const FIX_ROT = { flipFR: [new THREE.Vector3(1, 0, 0), Math.PI], wobbleFlip: [UP, -Math.PI / 2] };   // 原因部品の「付け直し」: プロペラは裏返す、FCは90°戻す
function theaterOutlineReset() { outlineSel.selectedObjects = []; outlineSel.visibleEdgeColor.set('#ff7a3d'); outlineSel.hiddenEdgeColor.set('#7a3a1c'); }
function beginRepair() {
  theaterOutlineReset();
  const cause = theater.flagged.filter(p => !theater.red.includes(p)); const fixDur = cause.length ? 1.0 : 0;
  theater.fix = cause.map(p => ({ p, t0: 0, rot: FIX_ROT[theater.def.physics] || null }));
  theater.repair = theater.red.map((p, i) => ({ p, t0: fixDur + i * 0.3 }));
  for (const p of cause) p.anim = { pos: new THREE.Vector3(), quat: new THREE.Quaternion(), v: null };
  for (const p of theater.red) p.anim = { pos: new THREE.Vector3(), quat: new THREE.Quaternion(), v: null };
  for (const mo of D.motors) if (mo.brokenBlade) { mo.brokenBlade.visible = false; mo.propMesh.visible = true; }
  for (const d of theater.debris) scene.remove(d.mesh); theater.debris = [];
  const foc = cause.concat(theater.red); if (foc.length) focusOn(foc.map(p => p.obj), { pull: true });
}
function stepTheater(dtSim, dtReal) {
  if (!theater.active) return;
  theater.t += dtSim; const def = theater.def;
  const ph = theater.phase;
  if (ph === 'setup') { /* 待ち */ }
  else if (ph === 'takeoff') {
    const t = theater.t; S.power = Math.min(0.5, t / 1.2 * 0.5); M_UPTO(RPM_MAX * S.power);
    const h = def.physics === 'drop' ? 1.5 : def.physics === 'motorOut' ? 0.35 : def.physics === 'spin' ? 0.12 : 0.05;
    body.py = h * smoothstep(0.6, 1.8, t); body.tx = body.tz = 0;
    const ft = 0.22 * (1 - smoothstep(0.5, 1.4, t)); for (const p of theater.flagged) setTint(p, RED, ft);
    if (t > 1.8) { theater.phase = 'event'; theater.ev = 0; theater.subtitle = def.result; theater.bladeFlew = false; theaterCamera(...sceneCam(def, 'event'), 700); }
  } else if (ph === 'event') {
    theater.ev += dtSim; const done = EVENTS[def.physics](theater.ev, dtSim);
    if (done) { theater.phase = 'settle'; theater.t = 0; setTimeScale(1); M_UPTO(0); }
  } else if (ph === 'settle') {
    if (theater.t > 0.6) { theater.phase = 'broken'; theater.waiting = true; theater.broken = true; theater.brokenAt = performance.now();
      for (const k of def.broken) for (const p of partsFor(k, def.brokenIdx && def.brokenIdx[k])) theater.red.push(p);
      for (const p of theater.flagged) setTint(p, RED, 0);
      theater.subtitle = theater.red.length ? '赤く光っている部品が壊れました。下の名前をタップすると解説が出ます。' : 'この失敗では壊れませんが、飛行は続けられません。';
      if (theater.red[0]) { focusOn(theater.red.map(p => p.obj), { pull: true }); outlineSel.selectedObjects = theater.red.map(p => p.obj); outlineSel.visibleEdgeColor.set('#ff3b30'); outlineSel.hiddenEdgeColor.set('#7a1e18'); } if (typeof onTheaterChanged === 'function') onTheaterChanged(); }
  } else if (ph === 'repair') {
    const t = theater.t; let all = true;
    const seat = (lt2) => { const w = 20, z = 0.60; return Math.exp(-z * w * lt2) * Math.cos(w * Math.sqrt(1 - z * z) * lt2); };   // 減衰ばね ω20 ζ0.60
    for (const r of theater.fix) { if (r.done) continue; const lt = t - r.t0; const p = r.p; if (!p.anim) p.anim = { pos: new THREE.Vector3(), quat: new THREE.Quaternion() };
      const lift = 0.5; if (lt < 0.45) { const k = smoothstep(0, 0.45, lt); p.anim.pos.copy(p.explode).multiplyScalar(lift * k); if (r.rot) p.anim.quat.setFromAxisAngle(r.rot[0], r.rot[1] * smoothstep(0.15, 0.45, lt)); all = false; }
      else { const lt2 = lt - 0.45; let e = seat(lt2) * lift; const L = p.explode.length(); if (e < 0 && -e * L > 0.005) e = -0.005 / Math.max(L, 1e-6); p.anim.pos.copy(p.explode).multiplyScalar(e); if (r.rot) p.anim.quat.setFromAxisAngle(r.rot[0], r.rot[1]);
        if (lt2 > 0.55) { p.anim = null; p.animReset = true; r.done = true; } else all = false; }
    }
    for (const r of theater.repair) { if (r.done) continue; const lt = t - r.t0; const p = r.p; if (lt < 0) { all = false; continue; }
      if (!p.anim) p.anim = { pos: new THREE.Vector3(), quat: new THREE.Quaternion() };
      if (lt < 0.6) { const k = smoothstep(0, 0.6, lt); p.anim.pos.copy(p.explode).multiplyScalar(0.6 * k); all = false; setTint(p, RED, 0.6 + 0.4 * Math.sin(theater.t * 7.5)); }
      else { const lt2 = lt - 0.6; let e = seat(lt2) * 0.6; const L = p.explode.length(); if (e < 0 && -e * L > 0.005) e = -0.005 / Math.max(L, 1e-6); p.anim.pos.copy(p.explode).multiplyScalar(e);
        setTint(p, RED, 0.6 * Math.max(0, 1 - Math.max(0, lt2 - 0.196) / 0.3));   // 座ってから赤が抜ける
        if (lt2 > 0.9) { p.anim = null; p.animReset = true; setTint(p, RED, 0); r.done = true; } else all = false; }
    }
    for (let i = 0; i < 4; i++) { theater.legPerm[i] = dl(theater.legPerm[i], 0, dtReal, 4); }
    if (all) { theater.phase = 'reset'; theater.t = 0; theater.red = []; theater.subtitle = '機体を置き直します'; const tilt = Math.hypot(body.tx, body.tz); theater.resetH = 0.03 + 0.12 * smoothstep(THREE.MathUtils.degToRad(50), THREE.MathUtils.degToRad(110), tilt); }
  } else if (ph === 'reset') {
    const t = theater.t; const k = clamp(t / 1.6, 0, 1); const inAir = k > 0.18 && k < 0.88;   // 持ち上げ → 空中で向きを直す → 2mm沈んで着地
    if (inAir) { body.tx = dl(body.tx, 0, dtSim, 7); body.tz = dl(body.tz, 0, dtSim, 7); body.yaw = Math.atan2(Math.sin(body.yaw), Math.cos(body.yaw)); body.yaw = dl(body.yaw, 0, dtSim, 5); body.px = dl(body.px, 0, dtSim, 5); body.pz = dl(body.pz, 0, dtSim, 5); }
    if (k >= 0.88) { body.tx = dl(body.tx, 0, dtSim, 14); body.tz = dl(body.tz, 0, dtSim, 14); }
    body.py = t < 1.6 ? theater.resetH * Math.sin(Math.PI * k) : -0.002 * Math.sin(Math.PI * clamp((t - 1.6) / 0.35, 0, 1));
    if (t > 2.0) { theater.phase = 'hover'; theater.t = 0; theater.subtitle = '直った機体で、もう一度。'; theaterCamera(...sceneCam(def, 'hover'), 900); }
  } else if (ph === 'hover') {
    const t = theater.t; S.power = Math.min(0.5, t / 1.2 * 0.5); M_UPTO(RPM_MAX * S.power); body.py = free.hoverY * smoothstep(0.6, 1.8, t); body.tx = body.tz = 0;
    if (t > 4.5) { theater.phase = 'done'; theater.done = true; theater.waiting = true; theater.subtitle = 'なおりました。機体を指ではじいて、姿勢がもどるのを見てみましょう。'; D.motors.forEach(mo => { mo.rpmTarget = null; mo.rpmRate = null; }); setBodyMode('free'); body.py = free.hoverY; body.home.x = 0; body.home.z = 0; theater.active = false; S.theater = null; if (typeof onTheaterChanged === 'function') onTheaterChanged(); }
  }
  // 赤点滅・脚のしなり・破片・揺れ
  if (theater.phase === 'broken' || theater.phase === 'prevent') { const ramp = smoothstep(0, 0.25, (performance.now() - theater.brokenAt) / 1000); const k = ramp * (0.55 + 0.45 * (0.5 + 0.5 * Math.sin(performance.now() / 1000 * 2 * Math.PI * 1.2))); for (const p of theater.red) setTint(p, RED, k); }
  // スロー中はカメラがゆっくり回り込む(4°/s・最大15°)
  if (theater.phase === 'event' && theater.cam && S.ts < 0.6 && !S.camSpring) { const lim = THREE.MathUtils.degToRad(15), a = Math.min(THREE.MathUtils.degToRad(4) * dtReal, lim - theater.orbit); if (a > 0) { theater.orbit += a; camera.position.sub(controls.target).applyAxisAngle(UP, a).add(controls.target); } }
  D.legs.forEach((lg, li) => lg.pivots.forEach((pv, pi) => { const i = li * 2 + pi; const ang = theater.legBend[i] + theater.legPerm[i]; if (ang !== 0 || pv.pivot.userData.bent) { const out = new THREE.Vector3(pv.sx, 0, pv.sz).normalize(); const axis = new THREE.Vector3().crossVectors(UP, out).normalize(); pv.pivot.quaternion.setFromAxisAngle(axis, -ang); pv.pivot.userData.bent = ang !== 0; } }));
  for (const d of theater.debris) { d.t += dtSim; d.v.y -= 9.8 * dtSim; d.mesh.position.addScaledVector(d.v, dtSim); d.mesh.rotateOnAxis(UP, d.w.y * dtSim / 60); if (d.mesh.position.y < -0.155) { d.mesh.position.y = -0.155; d.v.y = Math.abs(d.v.y) * 0.35; d.v.x *= 0.7; d.v.z *= 0.7; d.w.y *= 0.5; } }
  camera.position.y -= theater.shakeOff; theater.shakeOff = 0;
  if (theater.shake > 0) { theater.shake -= dtReal; theater.shakeOff = 0.004 * Math.sin(performance.now() / 1000 * 2 * Math.PI * 12) * Math.exp(-(1 - theater.shake) / 0.12); camera.position.y += theater.shakeOff; }
  S.shadowDirty = S.csDirty = S.aoDirty = true;
}
