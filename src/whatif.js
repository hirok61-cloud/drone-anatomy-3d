// ===== もしもの5場面 (パッケージ⑩) =====
// ⑤が「組み立ての間違い」なのに対し、こちらは外の状況。機体ができることと人がやることを対で見せる。
const whatif = {
  active: false, def: null, phase: 0, t: 0, litIdx: -1, blink: 0,
  saved: { air: false, personPos: null, personVis: false }, seq: [],
};
const D2R_W = (d) => THREE.MathUtils.degToRad(d);

function whatifStageIndex() { return clamp(whatif.phase, 0, WHATIF_STAGES.length - 1); }

function startWhatif(id) {
  const def = WHATIF.find(w => w.id === id); if (!def) return;
  stopTheater(true); stopWhatif(true);
  whatif.active = true; whatif.def = def; whatif.phase = 0; whatif.t = 0; whatif.litIdx = -1; whatif.blink = 0; whatif.seq = [];
  S.whatif = whatif; setBodyMode('theater');
  body.px = body.pz = 0; body.py = free.hoverY; body.tx = body.tz = body.wx = body.wz = 0; body.yaw = 0; body.mult = [1, 1, 1, 1];
  D.motors.forEach(mo => { mo.rpmTarget = null; mo.rpmRate = 3.5; });
  S.power = 0.5;
  whatif.saved.air = S.air; S.labelsSuppressed = true; S.labelOnly = null;
  if (D.personGroup) { whatif.saved.personPos = D.personGroup.position.clone(); whatif.saved.personVis = D.personGroup.visible; }
  theaterCamera(new THREE.Vector3(1.05 * viewScale(), 0.55 * viewScale(), -1.05 * viewScale()), new THREE.Vector3(0, 0.03, 0), 800);
  if (typeof onWhatifChanged === 'function') onWhatifChanged();
}

function stopWhatif(silent) {
  if (!whatif.active) { S.labelsSuppressed = false; S.labelOnly = null; return; }
  for (const k of whatif.def.parts) for (const p of partsOf(k)) setTint(p, ACCENT, 0);
  for (const p of partsOf('led')) setTint(p, RED, 0);
  D.motors.forEach(mo => { mo.rpmTarget = null; mo.rpmRate = null; });
  for (let i = 0; i < 4; i++) body.mult[i] = 1;
  air.windOverride = null; S.air = whatif.saved.air;
  if (D.personGroup) { if (whatif.saved.personPos) D.personGroup.position.copy(whatif.saved.personPos); D.personGroup.visible = whatif.saved.personVis; }
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
    body.tz = -D2R_W(7) * RM() * k;
    body.px = 0.02 * k * Math.sin(2 * Math.PI * 0.4 * t);
    air.windOverride = air.windOverride || new THREE.Vector3();
    air.windOverride.set(0.4 * k, 0, 0);
    const m = [1.15, 0.90, 0.90, 1.15];   // 風上側(M1/M4)が速く回る
    for (let i = 0; i < 4; i++) body.mult[i] = 1 + (m[i] - 1) * k;
    return t > 4.5;
  },
  // 人が近づいた → 機体は避けられない。灯火と音で知らせるだけ
  person(t, dt) {
    body.py = free.hoverY + 0.03 * smoothstep(1.0, 1.8, t);
    const g = D.personGroup;
    if (g) { g.visible = true; const k = smoothstep(1.0, 3.0, t); g.position.set(0, -0.158, -1.2 + 0.6 * k); }
    if (t > 3.0) { const b = 0.5 + 0.5 * Math.sin((t - 3.0) * 2 * Math.PI / 0.5); for (const p of partsOf('led')) setTint(p, RED, 0.8 * b); }
    return t > 4.4;
  },
};

function stepWhatif(dtSim, dtReal) {
  if (!whatif.active) return;
  whatif.t += dtSim; const def = whatif.def;
  if (whatif.phase === 1) {
    const done = WHATIF_MOTION[def.motion](whatif.t, dtSim);
    if (done) { whatif.phase = 2; whatif.t = 0; whatif.litIdx = -1; whatif.seq = []; S.labelsSuppressed = false; if (typeof onWhatifChanged === 'function') onWhatifChanged(); }
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
