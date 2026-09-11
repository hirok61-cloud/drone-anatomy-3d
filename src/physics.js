// ===== 機体の力学: ホバー・飛行デモ・フリック/スティック(free)・モーター/プロペラ表現 =====
const RPM_MAX = 9000, HOVER_RPM = RPM_MAX * 0.5, GRAV = 9.81;
const MOTOR_U = [[1, -1], [1, 1], [-1, 1], [-1, -1]].map(([x, z]) => ({ x: x / Math.SQRT2, z: z / Math.SQRT2 }));
const body = {
  px: 0, py: 0, pz: 0, vx: 0, vy: 0, vz: 0, tx: 0, tz: 0, wx: 0, wz: 0, ax: 0, az: 0, yaw: 0, yawRate: 0, vyF: 0,
  home: { x: 0, z: 0 }, mode: 'idle', mult: [1, 1, 1, 1], t: 0,
  hold: null, stick: { x: 0, y: 0, yaw: 0, thr: 0, active: false }, tilt: { x: 0, y: 0, active: false }, v: new THREE.Vector3(),
};
const free = { Kx: THREE.MathUtils.degToRad(34), Kv: THREE.MathUtils.degToRad(12.7), wAtt: 14, zAtt: 0.70, tiltMax: THREE.MathUtils.degToRad(22), holdMax: THREE.MathUtils.degToRad(18), kappa: 0.0057 };
const ambientT = { t: 0 };
const dl = (v, target, dt, rate) => v + (target - v) * (1 - Math.exp(-dt * rate));

function setBodyMode(mode) {
  if (body.mode === mode) return;
  body.mode = mode; body.t = 0; body.hold = null; body.stick.active = false;
  if (mode === 'free') { body.home.x = body.px; body.home.z = body.pz; body.vx = body.vz = 0; }
}
// フリック: 指の速度(ワールド)を機体速度へ
function flickBody(v) {
  const len = v.length(); if (len < 1e-4) return;
  const mag = clamp(0.45 * len, 0.15, 1.0); body.vx += v.x / len * mag; body.vz += v.z / len * mag;
  body.hold = null; S.shadowDirty = true;
}
// 押し続け(指の移動量に1:1で傾く)。d: 画面→ワールドの押し方向(xz), px: 移動量
function holdBody(dirXZ, pixels) { const th = Math.min(free.holdMax, pixels * THREE.MathUtils.degToRad(0.06)); body.hold = { x: dirXZ.x * th, z: dirXZ.z * th, th }; }

function stepFree(dt) {
  const st = body.stick, ti = body.tilt;
  let cx = 0, cz = 0, drag = 0.8;
  const sx = st.active ? st.x : (ti.active ? ti.x : 0), sy = st.active ? st.y : (ti.active ? ti.y : 0);
  const stickOn = (st.active || ti.active) && Math.hypot(sx, sy) > 0.06;
  if (body.hold) { cx = body.hold.x; cz = body.hold.z; }
  else if (stickOn) {
    let mag = Math.hypot(sx, sy); const ex = 0.3; const shaped = free.tiltMax * (ex * mag ** 3 + (1 - ex) * mag) / Math.max(mag, 1e-6);
    const vcx = 0.6 * sx * shaped / free.tiltMax, vcz = -0.6 * sy * shaped / free.tiltMax; // 前=−z
    const Kv2 = THREE.MathUtils.degToRad(25);
    cx = clamp(Kv2 * (vcx - body.vx), -free.tiltMax, free.tiltMax); cz = clamp(Kv2 * (vcz - body.vz), -free.tiltMax, free.tiltMax); drag = 2.5;
    body.home.x = body.px; body.home.z = body.pz;
  } else {
    const ex = body.px - body.home.x, ez = body.pz - body.home.z; const r = Math.hypot(ex, ez); const kx = r > 0.25 ? free.Kx * 2 : free.Kx;
    cx = -(kx * ex + free.Kv * body.vx); cz = -(kx * ez + free.Kv * body.vz);
    const cl = Math.hypot(cx, cz), lim = THREE.MathUtils.degToRad(10); if (cl > lim) { cx *= lim / cl; cz *= lim / cl; }
  }
  // 姿勢2次系 (セミインプリシット・オイラー)
  const w = free.wAtt, z = free.zAtt;
  body.ax = w * w * (cx - body.tx) - 2 * z * w * body.wx; body.az = w * w * (cz - body.tz) - 2 * z * w * body.wz;
  body.wx += body.ax * dt; body.wz += body.az * dt; body.tx += body.wx * dt; body.tz += body.wz * dt;
  const th = Math.hypot(body.tx, body.tz); if (th > free.tiltMax) { body.tx *= free.tiltMax / th; body.tz *= free.tiltMax / th; }
  // 並進 (小角近似: a = g·τ)
  let axg = GRAV * Math.tan(Math.min(th, 1.2)) * (th > 1e-6 ? body.tx / th : 0), azg = GRAV * Math.tan(Math.min(th, 1.2)) * (th > 1e-6 ? body.tz / th : 0);
  const rp = Math.hypot(body.px, body.pz); if (rp > 0.22) { const s = 1 - smoothstep(0.22, 0.32, rp); const nx = body.px / rp, nz = body.pz / rp; const out = axg * nx + azg * nz; if (out > 0) { axg -= out * nx * (1 - s); azg -= out * nz * (1 - s); } }
  body.vx += (axg - drag * body.vx) * dt; body.vz += (azg - drag * body.vz) * dt; body.px += body.vx * dt; body.pz += body.vz * dt;
  // 高度: 傾きで沈む + スロットル
  const thr = st.active ? st.thr : 0; const pyCmd = -0.2 * (1 - Math.cos(th)) + 0.10 * thr;
  const ay = 36 * (pyCmd - body.py) - 9.6 * body.vyF; body.vyF += ay * dt; body.py += body.vyF * dt;
  // ヨー
  const yawCmd = st.active ? -1.2 * st.yaw : 0; body.yawRate = dl(body.yawRate, yawCmd, dt, 6); body.yaw += body.yawRate * dt;
  if (!st.active) { body.yaw = Math.atan2(Math.sin(body.yaw), Math.cos(body.yaw)); body.yaw = dl(body.yaw, 0, dt, 1.5); }
  // モーター配分: α_z = −τ̈x, α_x = τ̈z
  const collective = 1 / Math.cos(th) - 1; const alz = -body.ax, alx = body.az;
  for (let i = 0; i < 4; i++) {
    const u = MOTOR_U[i]; let d = free.kappa * (alz * u.x - alx * u.z);
    if (body.hold) d += 0.25 * (u.x * body.hold.x + u.z * body.hold.z) / Math.max(1e-6, body.hold.th) * (body.hold.th / free.holdMax);
    d += 0.12 * (st.active ? st.yaw : 0) * (i % 2 === 0 ? 1 : -1);
    body.mult[i] = clamp(1 + collective + d, 0.55, 1.35);
  }
}
function stepDemo(dt) {
  body.t += dt; const t = body.t, A = THREE.MathUtils.degToRad(10);
  let tx = 0, tz = 0, px = 0, py = 0, pz = 0; const f = FLIGHT[S.flight];
  const k = (S.flight === 'pitch' || S.flight === 'roll') ? Math.cos(t) : 1;
  switch (S.flight) {
    case 'hover': break;
    case 'climb': py = 0.06 * (0.5 - 0.5 * Math.cos(t * 1.1)); break;
    case 'pitch': tz = -A * Math.cos(t); pz = -0.14 * (0.5 - 0.5 * Math.cos(t)); break;   // 機首下げ = 前(−z)が低い → τz<0
    case 'roll': tx = A * Math.cos(t); px = 0.14 * (0.5 - 0.5 * Math.cos(t)); break;      // 右(+x)が低い
    case 'yaw': body.yaw -= THREE.MathUtils.degToRad(40) * dt; break;
  }
  if (S.flight !== 'yaw') { body.yaw = Math.atan2(Math.sin(body.yaw), Math.cos(body.yaw)); body.yaw = dl(body.yaw, 0, dt, 3); }
  const r = 5; body.tx = dl(body.tx, tx, dt, r); body.tz = dl(body.tz, tz, dt, r);
  const ox = body.px, oy = body.py, oz = body.pz;
  body.px = dl(body.px, px, dt, r); body.py = dl(body.py, py, dt, r); body.pz = dl(body.pz, pz, dt, r);
  const idt = 1 / Math.max(dt, 1e-3); body.vx = (body.px - ox) * idt; body.vy = (body.py - oy) * idt; body.vz = (body.pz - oz) * idt;
  for (let i = 0; i < 4; i++) body.mult[i] = f ? 1 + (f.mult[i] - 1) * k : 1;
}
function stepIdle(dt) {
  const r = 4; body.tx = dl(body.tx, 0, dt, r); body.tz = dl(body.tz, 0, dt, r); body.wx = body.wz = 0;
  body.px = dl(body.px, 0, dt, r); body.py = dl(body.py, 0, dt, r); body.pz = dl(body.pz, 0, dt, r); body.vx = body.vz = body.vy = 0;
  body.yaw = Math.atan2(Math.sin(body.yaw), Math.cos(body.yaw)); body.yaw = dl(body.yaw, 0, dt, 3);
  for (let i = 0; i < 4; i++) body.mult[i] = dl(body.mult[i], 1, dt, 4);
}
function stepBody(dtSim, dtReal) {
  const prev = { x: body.px, y: body.py, z: body.pz };
  if (body.mode === 'free') stepFree(dtSim); else if (body.mode === 'demo') stepDemo(dtSim); else if (body.mode === 'theater') { /* theater writes body */ } else stepIdle(dtSim);
  body.v.set(body.px - prev.x, body.py - prev.y, body.pz - prev.z).divideScalar(Math.max(dtSim, 1e-3));
  if (Math.abs(body.tx) + Math.abs(body.tz) + Math.abs(body.px) + Math.abs(body.pz) + Math.abs(body.py) > 1e-4) S.shadowDirty = S.csDirty = S.aoDirty = true;
}
// 浮遊層(実時間): ホバー中の呼吸と微揺れ
function ambient(dtReal) {
  ambientT.t += dtReal; const t = ambientT.t; const hov = smoothstep(0.1, 0.4, S.power) * (S.slow ? 0.6 : 1) * (reduceMotion ? 0 : 1) * (body.mode === 'theater' ? 0 : 1);
  const d = THREE.MathUtils.degToRad(0.25) / Math.sqrt(3);
  return { py: hov * (0.002 * Math.sin(2 * Math.PI * 0.35 * t) + 0.0007 * Math.sin(2 * Math.PI * 1.7 * t + 1.3)),
    rx: hov * d * (Math.sin(2 * Math.PI * 0.9 * t) + Math.sin(2 * Math.PI * 1.3 * t + 1.1) + Math.sin(2 * Math.PI * 2.1 * t + 2.2)),
    rz: hov * d * (Math.sin(2 * Math.PI * 0.9 * t + 0.7) + Math.sin(2 * Math.PI * 1.3 * t + 2.4) + Math.sin(2 * Math.PI * 2.1 * t + 0.3)),
    yaw: hov * THREE.MathUtils.degToRad(0.3) * Math.sin(2 * Math.PI * 0.2 * t) };
}
function applyBody(dtReal) {
  if (!Number.isFinite(body.px + body.py + body.pz + body.tx + body.tz + body.yaw + body.vx + body.vz)) { body.px = body.py = body.pz = body.tx = body.tz = body.wx = body.wz = body.vx = body.vy = body.vz = body.vyF = body.yaw = body.yawRate = 0; }
  const a = ambient(dtReal);
  D.root.rotation.set(body.tz + a.rx, body.yaw + a.yaw, -body.tx + a.rz, 'YXZ');
  D.root.position.set(body.px, body.py + a.py, body.pz);
  if (typeof body.extraRot === 'function') body.extraRot();
}

// ---------- モーター / プロペラ ----------
for (const mo of D.motors) { mo.rpm = 0; mo.angle = 0; mo.pct = 0; mo.rpmTarget = null; mo.rpmRate = null;
  mo.propMesh.material = mo.propMesh.material.clone(); mo.hubMesh = mo.prop.children.find(c => c.isMesh && c !== mo.propMesh); if (mo.hubMesh) mo.hubMesh.material = mo.hubMesh.material.clone(); }
let shadowTick = 0;
function updateMotors(dtSim, dtReal) {
  let anySpin = false;
  D.motors.forEach((mo, i) => {
    const target = mo.rpmTarget != null ? mo.rpmTarget : RPM_MAX * S.power * body.mult[i];
    const rate = mo.rpmRate != null ? mo.rpmRate : (body.mode === 'free' ? 14 : 2.5);
    mo.rpm = dl(mo.rpm, target, dtReal, rate); if (mo.rpm < 1) mo.rpm = 0;
    mo.angle = (mo.angle + mo.dir * mo.rpm / 60 * Math.PI * 2 * dtSim) % (Math.PI * 2); mo.prop.rotation.y = mo.angle;
    const dpf = mo.rpm / 60 * 360 * dtSim;
    const wReal = 1 - smoothstep(12, 40, dpf), wGhost = smoothstep(8, 20, dpf) * (1 - smoothstep(40, 90, dpf)), wDisc = smoothstep(35, 90, dpf);
    for (const m of [mo.propMesh.material, mo.hubMesh && mo.hubMesh.material]) { if (!m) continue; if (wReal >= 0.999) { if (m.transparent) { m.transparent = false; m.opacity = 1; m.needsUpdate = true; } } else { if (!m.transparent) { m.transparent = true; m.needsUpdate = true; } m.opacity = Math.max(0.05, wReal); } }
    mo.ghosts.forEach((gh, k) => { const on = Q.ghosts && wGhost > 0.02 && S.mode === 'normal'; gh.visible = on; if (on) { gh.rotation.y = (k ? 1 : -1) * THREE.MathUtils.degToRad(dpf / 3); gh.material.opacity = 0.35 * wGhost; } });
    mo.disc.material.opacity = wDisc * 0.85; mo.disc.rotation.z += mo.dir * 4 * dtReal;
    const raw = mo.rpm / HOVER_RPM * 100; mo.pct = raw > mo.pct ? raw : mo.pct + (raw - mo.pct) * (1 - Math.exp(-dtReal / 0.5));
    if (mo.rpm > 50) anySpin = true;
    const th = D.arrows.thrust[i]; th.visible = (body.mode === 'demo' || body.mode === 'free' || body.mode === 'theater') && partVisible(mo.part) && mo.rpm > 100;
    if (th.visible) { th.userData.setLength(0.02 + 0.11 * mo.rpm / RPM_MAX); const rel = mo.rpm / Math.max(1, S.power * RPM_MAX); th.userData.mat.color.set(rel > 1.03 ? 0x22c55e : rel < 0.97 ? 0xf59e0b : arrowNeutral); }
    D.arrows.rot[i].visible = (S.arrows || S.flight === 'yaw') && partVisible(mo.part) && S.explodeT < 0.05;
  });
  if (anySpin) { shadowTick += dtReal; if (shadowTick > 1 / 30) { shadowTick = 0; S.shadowDirty = true; } S.aoDirty = true; }
}
function updateMoveArrow() {
  const mv = D.arrows.move, spd = body.v.length();
  if (body.mode === 'demo' && S.flight && S.flight !== 'yaw' && S.flight !== 'hover' && spd > 0.004) {
    mv.visible = true; const dir = body.v.clone().normalize(); const local = dir.clone().applyQuaternion(D.root.getWorldQuaternion(tmpQ).invert());
    mv.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), local);
    if (S.flight === 'climb') mv.position.set(0, 0.16, 0); else if (S.flight === 'pitch') mv.position.set(0, 0.05, -0.22 * Math.sign(-dir.z || 1)); else mv.position.set(0.22 * Math.sign(dir.x || 1), 0.05, 0);
    mv.userData.setLength(0.03 + 1.3 * spd);
  } else mv.visible = false;
  D.arrows.yaw.visible = body.mode === 'demo' && S.flight === 'yaw';
}
