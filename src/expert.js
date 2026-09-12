// ===== 専門タブ (パッケージ⑪⑫⑬) =====
// ⑪ センサー視点: 機体が見ている生波形（ジャイロ・加速度・気圧高度・コンパスのずれ）、防振、電流でコンパスが狂う、電波の形、10分ホバーの熱
// ⑫ 消耗の早送り: 消耗の4区分に塗り分け（丈夫な部品は紙色に落として消耗品だけ発色）、フライト回数で部位ごとに進行、交換目安と年間維持費（幅つき）
// ⑬ 設計の計算: KV・セル・プロペラ・重量から推力重量比/ホバー余裕/飛行時間/先端速度/g/W/全開電流、30→70%のステップ応答、翼素の色分け、A/B比較
const expert = {
  mode: null, prev: { tx: 0, tz: 0, yaw: 0, vx: 0, vz: 0, vy: 0, t: 0 }, charts: {}, damper: true, current: 0, radio: false,
  heat: 0, heatRun: false, drift: 0, tsum: 0, donut: null, flights: 0, perYear: 200, wearRun: false, papered: [], pulse: 0,
  blade: false, bladeDiscs: [], ab: { A: null, B: null }, arrowsHidden: false,
  tb: { kv: 450, cells: 6, diam: 12, pitch: 4.5, mass: 2.4, mah: 5000 }, stepT: 0, selStrip: null,
};
const EXPERT_MODES = ['sensors', 'wear', 'toolbox'];
const EXPERT_TITLE = { sensors: 'センサーが見ている波形', wear: '消耗の早送り（0〜1000回）', toolbox: '設計の計算（簡易）' };
const XCOL = { p: '#6366f1', q: '#0ea5e9', r: '#ef6a2d' };   // 波形の色は CW/CCW の青緑と別系にする
const fsz = (px) => `calc(${px}px * var(--fs, 1))`;

// ---------- ストリップチャート ----------
class Strip {
  constructor(canvas, opts) { this.c = canvas; this.g = canvas.getContext('2d'); this.o = Object.assign({ n: 240, min: -1, max: 1, unit: '', colors: [XCOL.p, XCOL.q, XCOL.r], span: '4 秒' }, opts); this.data = this.o.colors.map(() => new Float32Array(this.o.n)); this.i = 0; this.auto = !!opts.auto; }
  push(vals) { for (let k = 0; k < this.data.length; k++) this.data[k][this.i] = vals[k] || 0; this.i = (this.i + 1) % this.o.n; }
  draw(dark) {
    const c = this.c, g = this.g, dpr = Math.min(2, window.devicePixelRatio || 1); const w = c.clientWidth || 300, h = c.clientHeight || 80;
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    let mn = this.o.min, mx = this.o.max;
    if (this.auto) { mn = Infinity; mx = -Infinity; for (const d of this.data) for (const v of d) { if (v < mn) mn = v; if (v > mx) mx = v; } if (!isFinite(mn)) { mn = -1; mx = 1; } const pad = Math.max(0.05, (mx - mn) * 0.15); mn -= pad; mx += pad; }
    const ink = dark ? 'rgba(255,255,255,.10)' : 'rgba(20,26,40,.10)';
    g.strokeStyle = ink; g.lineWidth = 1; g.beginPath(); for (let k = 1; k < 4; k++) { const y = h * k / 4; g.moveTo(0, y); g.lineTo(w, y); } g.stroke();
    if (mn < 0 && mx > 0) { const y0 = h - (0 - mn) / (mx - mn) * h; g.strokeStyle = dark ? 'rgba(255,255,255,.22)' : 'rgba(20,26,40,.22)'; g.beginPath(); g.moveTo(0, y0); g.lineTo(w, y0); g.stroke(); }
    this.data.forEach((d, k) => {
      g.strokeStyle = this.o.colors[k]; g.lineWidth = 1.5; g.beginPath();
      for (let j = 0; j < this.o.n; j++) { const v = d[(this.i + j) % this.o.n]; const x = j / (this.o.n - 1) * w, y = h - (v - mn) / (mx - mn) * h; if (j === 0) g.moveTo(x, y); else g.lineTo(x, y); }
      g.stroke();
    });
    g.fillStyle = dark ? '#aab2c0' : '#4b5260'; g.font = '10px ui-monospace, Menlo, monospace'; g.textAlign = 'right';
    g.fillText(`${mx.toFixed(mx >= 100 ? 0 : 1)}${this.o.unit}`, w - 4, 11); g.fillText(`${mn.toFixed(mn <= -100 ? 0 : 1)}${this.o.unit}`, w - 4, h - 3);
    g.textAlign = 'left'; g.fillText(`← ${this.o.span}`, 4, h - 3);
  }
  last(k) { return this.data[k][(this.i + this.o.n - 1) % this.o.n]; }
}
const legendDots = (items) => items.map(([c, n]) => `<i style="background:${c}"></i>${n}`).join(' ');

// ---------- 入口 ----------
function expertStart(mode) {
  if (!EXPERT_MODES.includes(mode)) mode = 'sensors';
  const wasTall = $('#expert') && $('#expert').classList.contains('tall');
  if (expert.mode) expertStop(true);
  if (typeof stopOthers === 'function') stopOthers('expert');
  expert.mode = mode; S.expert = mode; store.set('expertMode', mode);
  segSet($('#expertSeg'), 'x', mode); if ($('#expertSegM')) segSet($('#expertSegM'), 'x', mode);
  $('#inspector').hidden = true; $('#inspector').classList.remove('open');
  const panel = $('#expert'); panel.hidden = false; if (narrow()) panel.classList.add('open'); if (wasTall) panel.classList.add('tall');
  document.body.classList.add('expert');
  if (S.selected) select(null);
  if (mode === 'sensors') sensorsEnter(); else if (mode === 'wear') wearEnter(); else toolboxEnter();
  renderExpertPanel();
}
function expertOpenSheet() { const p = $('#expert'); if (expert.mode && p) p.classList.add('open'); }
function expertStop(silent) {
  if (!expert.mode) return;
  if (expert.mode === 'sensors') sensorsLeave(); else if (expert.mode === 'wear') wearLeave(); else toolboxLeave();
  expert.mode = null; S.expert = null;
  $('#expert').hidden = true; $('#expert').classList.remove('open', 'tall'); if (!S.lesson) $('#inspector').hidden = false;
  document.body.classList.remove('expert');
  if (!silent) syncBodyMode();
}
function stepExpert(dtSim, dtReal) {
  if (!expert.mode) return;
  if (expert.mode === 'sensors') sensorsStep(dtSim, dtReal);
  else if (expert.mode === 'wear') wearStep(dtReal);
  else if (expert.mode === 'toolbox') toolboxStep(dtReal);
}
// 熱・ディスクを見せる間は推力矢印と回転リングを引く(主役と脇役を分ける)
function expertArrows(hide) {
  if (hide === expert.arrowsHidden) return; expert.arrowsHidden = hide;
  for (const a of D.arrows.thrust) a.userData.forceHide = hide;
  for (const a of D.arrows.rot) a.userData.forceHide = hide;
}

// ---------- ⑪ センサー視点 ----------
function sensorsEnter() {
  setPower(0.5, true); syncBodyMode();
  expert.prev = { tx: body.tx, tz: body.tz, yaw: body.yaw, vx: 0, vz: 0, vy: 0, t: 0 }; expert.drift = 0; expert.tsum = 0; expert.heat = 0; expert.heatRun = false;
  if (expert.radio) radioDonut(true);
  showToast('機体はホバー中。はじくとジャイロが振れます', 3000);
}
function sensorsLeave() {
  radioDonut(false); heatApply(0); expert.heatRun = false; expertArrows(false); expert.charts = {};
  if (S.power > 0) setPower(0, true);
}
function radioDonut(on) {
  if (on && !expert.donut) {
    // 受信機のV字アンテナ(2本で1本のダイポール): 各素子の延長方向が弱く、横に強い。半波ダイポールの極形式 ρ(φ)=R·cos(π/2·sinφ)/cosφ で描く
    const rx = partsOf('rx')[0]; if (!rx) return;
    const grp = new THREE.Group(); grp.userData.noPart = grp.userData.noPick = grp.userData.noAO = grp.userData.noShadow = true;
    const R = 0.11, N = 32, M = 36;
    const rho = (ph) => { const c = Math.cos(ph); return c < 1e-3 ? 0 : R * Math.cos(Math.PI / 2 * Math.sin(ph)) / c; };
    const prof = (ph) => { const r = rho(ph); return new THREE.Vector2(Math.max(0.002, r * Math.cos(ph)), r * Math.sin(ph)); };
    const profile = Array.from({ length: N + 1 }, (_, i) => prof(-Math.PI / 2 + i / N * Math.PI));
    const geo = new THREE.LatheGeometry(profile, M);
    const skin = new THREE.MeshBasicMaterial({ color: 0x3b7df7, transparent: true, opacity: 0.05, side: THREE.DoubleSide, depthWrite: false, toneMapped: false });
    const lineMat = new THREE.LineBasicMaterial({ color: 0x3b7df7, transparent: true, opacity: 0.30, toneMapped: false, depthWrite: false });
    const ringMat = new THREE.LineBasicMaterial({ color: 0x9cc2ff, transparent: true, opacity: 0.9, toneMapped: false, depthWrite: false });
    const pts = [], ring = [];
    for (let k = 1; k < 8; k++) { const ph = -Math.PI / 2 + k / 8 * Math.PI, p = prof(ph); for (let j = 0; j < M; j++) { const a0 = j / M * Math.PI * 2, a1 = (j + 1) / M * Math.PI * 2; pts.push(p.x * Math.cos(a0), p.y, p.x * Math.sin(a0), p.x * Math.cos(a1), p.y, p.x * Math.sin(a1)); } }
    for (let j = 0; j < 8; j++) { const a = j / 8 * Math.PI * 2; for (let i = 0; i < N; i++) { const p0 = profile[i], p1 = profile[i + 1]; pts.push(p0.x * Math.cos(a), p0.y, p0.x * Math.sin(a), p1.x * Math.cos(a), p1.y, p1.x * Math.sin(a)); } }
    for (let j = 0; j <= 72; j++) { const a = j / 72 * Math.PI * 2; ring.push(R * Math.cos(a), 0, R * Math.sin(a)); }
    const lgeo = new THREE.BufferGeometry(); lgeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const rgeo = new THREE.BufferGeometry(); rgeo.setAttribute('position', new THREE.Float32BufferAttribute(ring, 3));
    for (const sx of [1, -1]) {
      const base = new THREE.Vector3(sx * 0.030, 0.024, 0.062), tip = new THREE.Vector3(sx * 0.058, 0.048, 0.068);
      const lobe = new THREE.Group(); lobe.position.copy(base).lerp(tip, 0.5);
      lobe.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tip.clone().sub(base).normalize());
      const m = new THREE.Mesh(geo, skin), l = new THREE.LineSegments(lgeo, lineMat), rg = new THREE.Line(rgeo, ringMat);
      for (const o of [m, l, rg]) { o.userData.noPart = o.userData.noPick = o.userData.noAO = o.userData.noShadow = true; o.renderOrder = 4; lobe.add(o); }
      grp.add(lobe);
    }
    rx.obj.add(grp); expert.donut = grp;
  }
  if (expert.donut) expert.donut.visible = !!on;
}
function radioFocus() {
  const g = expert.donut; if (!g) return;
  g.traverse(c => { if (c.isMesh) c.userData.noPart = false; });
  // 素子は x–y 面に寝ているので、後ろ(+z)やや上から見るとドーナツの断面(8の字)が読める
  focusOn([g], { pull: true, margin: 1.5, dir: new THREE.Vector3(0.18, 0.28, 1).normalize() });
  g.traverse(c => { if (c.isMesh) c.userData.noPart = true; });
  showToast('受信機に寄りました。R キーか視点ボタンで戻せます', 3200);
}
// ホバー(低電流)で先に温まるのは巻線、次に映像送信機。ESC が熱いのは全開連続・密閉フレームのとき
const HEAT_PARTS = { winding: 0.9, vtx: 0.8, esc: 0.5, fc: 0.45, battery: 0.4, bell: 0.35, pdb: 0.3, wiring: 0.2, xt60: 0.15 };
const HEAT_RAMP = [[0, 0x8a3a1e], [0.35, 0xe0341e], [0.7, 0xff8a2a], [1, 0xffd36b]];
function heatColor(v) {
  for (let i = 1; i < HEAT_RAMP.length; i++) { const [a, ca] = HEAT_RAMP[i - 1], [b, cb] = HEAT_RAMP[i]; if (v <= b) return new THREE.Color(ca).lerp(new THREE.Color(cb), (v - a) / (b - a)); }
  return new THREE.Color(HEAT_RAMP[HEAT_RAMP.length - 1][1]);
}
function heatApply(k) {
  expert.heat = k; expertArrows(k > 0.05 || (expert.mode === 'toolbox' && expert.blade));
  for (const key in HEAT_PARTS) { const v = HEAT_PARTS[key] * k; const col = heatColor(v); for (const p of partsOf(key)) setTint(p, col, v, { lerp: 0.7, emis: 0.45 * v }); }
}
function sensorsStep(dtSim, dtReal) {
  const dt = Math.max(1e-3, dtSim); const pv = expert.prev; expert.tsum += dt;
  const R2D = 180 / Math.PI;
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  // 機体座標: tx=ロール(前方は −z なので tz がピッチ)。ヨーは右回りを正にする航空慣例
  const p = (body.tx - pv.tx) / dt * R2D, q = (body.tz - pv.tz) / dt * R2D, r = -wrap(body.yaw - pv.yaw) / dt * R2D;
  const rpm = D.motors.reduce((a, m) => a + m.rpm, 0) / 4; const spin = rpm / RPM_MAX; const vib = (expert.damper ? 0.25 : 1.0) * spin;
  const nz = () => (Math.random() * 2 - 1);
  const vs = Math.sin(2 * Math.PI * (rpm / 60) * expert.tsum);   // 回転数の1倍の周期振動(サンプリングで折り返す)
  const gyro = [p + 0.4 * nz() + vib * (4 * vs + 3 * nz()), q + 0.4 * nz() + vib * (4 * vs + 3 * nz()), r + 0.3 * nz() + vib * (2 * vs + 1.5 * nz())];
  const ax = (body.vx - pv.vx) / dt / 9.81, az = (body.vz - pv.vz) / dt / 9.81, ay = ((body.vy || 0) - (pv.vy || 0)) / dt / 9.81;
  // 傾いて加速しても機体軸の x・y はほぼ 0 g(推力は機体 z 軸方向だけ)。z は 1/cosθ + 上下加速
  const acc = [ax - Math.sin(body.tx) + 0.01 * nz() + 0.12 * vib * nz(), -az + Math.sin(body.tz) + 0.01 * nz() + 0.12 * vib * nz(), 1 / Math.cos(Math.hypot(body.tx, body.tz)) + ay + 0.01 * nz() + 0.18 * vib * nz()];
  // 気圧高度: 天候でどこまでも流れる長期トレンド + 短期ノイズ + 地面近くの吹き下ろし
  expert.drift = clamp(expert.drift + 0.0015 * dt * Math.sin(expert.tsum / 90 + 1.0) + 0.01 * Math.sqrt(dt) * nz(), -0.6, 0.6);
  const alt = body.py + expert.drift + 0.03 * nz() + (body.py < 0.3 ? 0.04 * spin * nz() : 0);
  // コンパス: 電源線の電流が作る磁界は機体に固定されたベクトル → 機首の向きで誤差が ± に変わる(地磁気水平分力=1 として 60A で 0.36)
  const Bi = 0.006 * expert.current, phi0 = 0.6;
  const dev = Math.atan2(Bi * Math.sin(body.yaw - phi0), 1 + Bi * Math.cos(body.yaw - phi0)) * R2D;
  let hd = (-body.yaw * R2D + dev + 1.0 * nz()) % 360; if (hd < 0) hd += 360;
  const ch = expert.charts;
  if (ch.gyro) { ch.gyro.push(gyro); ch.acc.push(acc); ch.baro.push([alt]); ch.mag.push([dev + 1.0 * nz()]); const dark = themeDark; ch.gyro.draw(dark); ch.acc.draw(dark); ch.baro.draw(dark); ch.mag.draw(dark); }
  const hv = $('#sensVals'); if (hv) hv.innerHTML = `<span>ジャイロ p ${gyro[0].toFixed(0)} / q ${gyro[1].toFixed(0)} / r ${gyro[2].toFixed(0)} °/s</span><span>加速度 z ${acc[2].toFixed(2)} g</span><span>高度 ${alt.toFixed(2)} m</span><span>方位 ${hd.toFixed(0)}°${Math.abs(dev) >= 0.5 ? ` <b>（電流で ${dev > 0 ? '+' : ''}${dev.toFixed(0)}° ずれ）</b>` : ''}</span>`;
  pv.tx = body.tx; pv.tz = body.tz; pv.yaw = body.yaw; pv.vx = body.vx; pv.vz = body.vz; pv.vy = body.vy || 0;
  if (expert.heatRun) { heatApply(Math.min(1, expert.heat + dtReal / 6)); renderHeatBars(); if (expert.heat >= 1) { expert.heatRun = false; renderHeatBars(); } }
}
function renderHeatBars() {
  const box = $('#heatBars'); if (!box) return;
  const rows = Object.entries(HEAT_PARTS).sort((a, b) => b[1] - a[1]);
  box.innerHTML = rows.map(([k, v]) => `<div class="hb"><span class="nm">${partName(k)}</span><i style="--w:${(v * expert.heat * 100).toFixed(0)}%;--c:${heatColor(v * expert.heat).getStyle()}"></i></div>`).join('');
  const t = $('#heatTime'); if (t) t.textContent = `ホバー ${(expert.heat * 10).toFixed(1)} 分`;
  const b = $('#xHeat'); if (b) b.textContent = expert.heatRun ? '■ 止める' : expert.heat >= 1 ? '↻ もう一度' : '▶ 早送り';
  const rs = $('#xHeatReset'); if (rs) rs.disabled = expert.heat <= 0;
}

// ---------- ⑫ 消耗の早送り ----------
const WEAR_CLASS = { must: { name: '必ず減る', color: '#e5484d' }, wear: { name: '摩耗する', color: '#e8a33d' }, crash: { name: '事故で壊れやすい', color: '#7c5cff' }, robust: { name: 'ほぼ壊れない', color: '#9aa3b0' } };
const wearPaper = new THREE.MeshStandardMaterial({ color: 0xcfd2d8, roughness: 0.9, metalness: 0 });
function wearEnter() {
  if (S.power > 0) setPower(0, true);
  // 丈夫な部品は紙色に落として、消耗品だけが色を持つ技術図にする(消耗品の子メッシュは後で塗り直すので除外不要)
  expert.papered = [];
  for (const k in WEAR) { if (WEAR[k].cls !== 'robust') continue; for (const p of partsOf(k)) for (const m of p.meshes) { const o = m.userData.origMat; if (!o || Array.isArray(o) || !o.isMeshStandardMaterial || m.userData.papered) continue; m.userData.papered = true; m.userData.paperShadow = m.castShadow; m.material = wearPaper; expert.papered.push(m); } }
  wearApply(); applyMode();
  showToast('着地して、先にへる部品から色をつけます。スライダーで回数を進めてください', 3200);
}
function wearLeave() {
  for (const k in WEAR) for (const p of partsOf(k)) setTint(p, ACCENT, 0);
  for (const m of expert.papered) { m.userData.papered = false; if (m.material === wearPaper) m.material = m.userData.origMat; }
  expert.papered = []; expert.wearRun = false; applyMode();
}
function wearProgress(k) { const w = WEAR[k]; if (!w) return 0; return clamp(expert.flights / w.lo, 0, 1); }
function paintPart(p, col, k, opts) {
  setTint(p, col, k, opts);
  for (const m of p.meshes) { if (m.userData.tint && m.material !== m.userData.tint && m.userData.origMat && !Array.isArray(m.userData.origMat) && m.userData.origMat.isMeshStandardMaterial) m.material = m.userData.tint; if (k <= 0 && m.userData.papered && m.material === m.userData.origMat) m.material = wearPaper; }
}
function wearApply() {
  const order = { robust: 0, crash: 1, wear: 2, must: 3 };
  const depth = (k) => { const p = partsOf(k)[0]; if (!p) return 0; let n = 0, o = p.obj.parent; while (o) { if (o.userData.part && WEAR[o.userData.part.key]) n++; o = o.parent; } return n; };
  const blink = 0.5 + 0.5 * Math.sin(expert.pulse * 2 * Math.PI / 0.8);
  // 外側の部品(モーター)を先に、その中の部品(プロペラ→ナット)を後に塗る。同じ深さなら「丈夫→必ず減る」の順
  for (const k of Object.keys(WEAR).sort((a, b) => (depth(a) - depth(b)) || (order[WEAR[a].cls] - order[WEAR[b].cls]))) {
    const w = WEAR[k], cls = WEAR_CLASS[w.cls], col = new THREE.Color(cls.color);
    if (w.cls === 'robust') { for (const p of partsOf(k)) paintPart(p, col, 0); continue; }
    const prog = expert.flights / w.lo;   // 1.0 = 交換時期の下限
    const kk = 0.95 * smoothstep(0.25, 1.0, prog);
    const due = prog >= 1;
    const flat = k === 'prop';
    for (const p of partsOf(k)) paintPart(p, col, kk, { lerp: flat ? 0.55 : 0.85, emis: (flat ? 0.2 : 0.06) + (due ? 0.25 * blink : 0) });
  }
  const bead = $('#wearFlights'); if (bead) bead.textContent = `${Math.round(expert.flights)} 回 ≈ ${(expert.flights / expert.perYear).toFixed(1)} 年（年${expert.perYear}回）`;
  renderWearList();
}
function wearStep(dtReal) {
  expert.pulse += dtReal;
  if (expert.wearRun) { expert.flights = Math.min(1000, expert.flights + dtReal * 125); const sl = $('#xFlights'); if (sl) sl.value = Math.round(expert.flights / 10) * 10; if (expert.flights >= 1000) { expert.wearRun = false; const b = $('#xWearPlay'); if (b) b.textContent = '↻ もう一度'; } }
  const due = Object.keys(WEAR).some(k => WEAR[k].cls !== 'robust' && expert.flights / WEAR[k].lo >= 1);
  if (expert.wearRun || due) { expert.stepT += dtReal; if (expert.stepT > 0.08) { expert.stepT = 0; wearApply(); } }
}
function renderWearList() {
  const box = $('#wearList'); if (!box) return;
  const rows = Object.keys(WEAR).map(k => ({ k, w: WEAR[k], prog: expert.flights / WEAR[k].lo })).sort((a, b) => b.prog - a.prog);
  box.innerHTML = rows.slice(0, 14).map(({ k, w }) => { const c = WEAR_CLASS[w.cls]; return `<div class="wr"><span class="nm">${partName(k)}</span><span class="cls"><i style="background:${c.color}"></i>${c.name}</span><div class="bar2"><i style="--w:${(clamp(expert.flights / w.hi, 0, 1) * 100).toFixed(0)}%;--c:${c.color}"></i><b style="--l:${(w.lo / w.hi * 100).toFixed(0)}%"></b></div><span class="rng">交換目安 ${w.lo}〜${w.hi}回</span><span class="ef">${w.effect}</span></div>`; }).join('');
  // 年間維持費(部品代のみ): 交換間隔 lo〜hi と PRICE×count から幅で。内訳の大きい順と「事故次第」の分も見せる
  let lo = 0, hi = 0, crashLo = 0, crashHi = 0; const items = [];
  for (const k in WEAR) { const w = WEAR[k], d = PARTS[k]; if (!d || w.cls === 'robust') continue; const price = (PRICE[k] || 0) * (d.count || 1); const a = price * expert.perYear / w.hi, b = price * expert.perYear / w.lo; lo += a; hi += b; if (w.cls === 'crash') { crashLo += a; crashHi += b; } items.push({ k, a, b }); }
  items.sort((x, y) => y.b - x.b);
  const yen = (v) => `¥${(Math.round(v / 1000) * 1000).toLocaleString()}`; const man = (v) => `¥${(Math.round(v / 1000) * 1000).toLocaleString()}`;
  const c = $('#wearCost'); if (c) c.innerHTML = `年間の維持費（部品代のみ・年${expert.perYear}回）<b>${yen(lo)}〜${yen(hi)}</b><em>1フライトあたり ¥${Math.round(lo / expert.perYear)}〜¥${Math.round(hi / expert.perYear)}</em><span>内訳の大きい順: ${items.slice(0, 3).map(x => `${partName(x.k)} ${man(x.a)}〜${man(x.b)}`).join('・')}。うち「事故で壊れやすい」分 ${man(crashLo)}〜${man(crashHi)} は事故がなければ 0 円。</span><span>1フライト ≈ 15 分の想定。回数は目安で、時間・温度・扱いで大きく変わります。バッテリーは回数だけでは決まりません（放電率・保管電圧・温度）。</span>`;
}

// ---------- ⑬ 設計の計算 ----------
const K_LOAD = 0.85;   // 全開回転 = 無負荷回転(KV×V) の 85%
const ETA = 0.85;      // モーター＋ESC の効率
function toolboxCalc(t) {
  const rho = 1.225, D = t.diam * 0.0254, Vn = t.cells * 3.7, W = t.mass * 9.81;
  const Ct = 0.085 * Math.sqrt(t.pitch / 4.5), Cp = 0.040 * Math.pow(t.pitch / 4.5, 0.9);   // T=Ct·ρ·n²·D⁴, P=Cp·ρ·n³·D⁵ (n: rev/s)。12インチ級の一般値
  const nMax = t.kv * Vn * K_LOAD / 60;
  const Tmax = Ct * rho * nMax * nMax * Math.pow(D, 4);
  const TW = 4 * Tmax / W;
  const nH = Math.sqrt(W / (4 * Ct * rho * Math.pow(D, 4)));
  const thr = nH / nMax, margin = 1 - thr;
  const Pm = Cp * rho * Math.pow(nH, 3) * Math.pow(D, 5) / ETA;
  const Iper = Pm / Vn, Itot = 4 * Iper + 1.0;
  const Pmax = Cp * rho * Math.pow(nMax, 3) * Math.pow(D, 5) / ETA, Imax = 4 * Pmax / Vn + 1.0;
  const Wh = t.mah / 1000 * Vn * 0.8, tmin = Wh / (Itot * Vn) * 60;
  const tipH = Math.PI * D * nH, tipMax = Math.PI * D * nMax;
  const gW = (W / 4 / 9.81 * 1000) / Pm, DL = W / (4 * Math.PI * D * D / 4), Crate = Imax / (t.mah / 1000);
  return { D, Vn, nMax, Tmax, TW, nH, thr, margin, Iper, Itot, Imax, Pmax, tmin, tipH, tipMax, Ct, Cp, gW, DL, Crate, ok: TW >= 1.6 && thr <= 0.7 };
}
function toolboxEnter() { toolboxRender(); if (expert.blade) bladeDiscs(true); }
function toolboxLeave() { bladeDiscs(false); propScale(1); expertArrows(false); }
function propScale(k) { for (const mo of D.motors) mo.prop.scale.set(k, 1, k); }
const BLADE_RAMP = ['#233f9e', '#2f8fd0', '#f2c230', '#ee7b2c', '#c81e2b'];
function rampColor(stops, f) { f = clamp(f, 0, 1) * (stops.length - 1); const i = Math.min(stops.length - 2, Math.floor(f)); return new THREE.Color(stops[i]).lerp(new THREE.Color(stops[i + 1]), f - i); }
function bladeDiscs(on) {
  if (on && !expert.bladeDiscs.length) {
    for (const mo of D.motors) {
      const cv = document.createElement('canvas'); cv.width = cv.height = 512; const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
      const m = new THREE.Mesh(new THREE.CircleGeometry(0.156, 96), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
      m.rotation.x = -Math.PI / 2; m.position.set(0, 0.038, 0); m.renderOrder = 5; m.userData.noPart = m.userData.noPick = m.userData.noAO = m.userData.noShadow = true; m.userData.cv = cv; m.userData.tex = tex; mo.group.add(m); expert.bladeDiscs.push(m);
    }
  }
  if (on) for (const mo of D.motors) { if (mo.propMesh.userData.ro0 == null) mo.propMesh.userData.ro0 = mo.propMesh.renderOrder; mo.propMesh.renderOrder = 6; }   /* 2回目以降の ON でも効くよう生成ブロックの外で設定する */
  for (const m of expert.bladeDiscs) m.visible = !!on;
  if (!on) for (const mo of D.motors) { if (mo.propMesh.userData.ro0 != null) mo.propMesh.renderOrder = mo.propMesh.userData.ro0; }
  expertArrows(!!on || expert.heat > 0.05);
  if (on) { bladePaint(); showToast('4枚の円＝プロペラの周速。内側は遅く、外側ほど速い（青→赤）', 3200); }
}
function bladePaint() {
  const r = toolboxCalc(expert.tb); const vTip = r.tipH, vMax = Math.max(r.tipMax, 1);
  for (const m of expert.bladeDiscs) {
    const cv = m.userData.cv, g = cv.getContext('2d'); g.clearRect(0, 0, 512, 512); const C = 256;
    const grd = g.createRadialGradient(C, C, C * 0.14, C, C, C);   // 周速 v = vTip × r/R。色は最大回転時の翼端速度を 1 とした相対位置
    for (let i = 0; i <= 16; i++) { const f = 0.14 + (1 - 0.14) * i / 16, v = vTip * f; const col = rampColor(BLADE_RAMP, v / vMax); grd.addColorStop(i / 16, `rgba(${Math.round(col.r * 255)},${Math.round(col.g * 255)},${Math.round(col.b * 255)},${(0.25 + 0.6 * f).toFixed(2)})`); }
    g.fillStyle = grd; g.beginPath(); g.arc(C, C, C, 0, Math.PI * 2); g.arc(C, C, C * 0.14, 0, Math.PI * 2, true); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 2;
    g.fillStyle = '#fff'; g.font = 'bold 26px ui-monospace, Menlo, monospace'; g.textAlign = 'center'; g.textBaseline = 'bottom';
    for (const f of [0.25, 0.5, 0.75]) { g.beginPath(); g.arc(C, C, C * f, 0, Math.PI * 2); g.stroke(); g.fillText(`${(vTip * f).toFixed(0)} m/s`, C, C - C * f - 4); }
    g.lineWidth = 4; g.strokeStyle = 'rgba(255,255,255,0.95)'; g.beginPath(); g.arc(C, C, C - 3, 0, Math.PI * 2); g.stroke();
    g.font = 'bold 30px ui-monospace, Menlo, monospace'; g.textBaseline = 'top'; g.fillText(`${vTip.toFixed(0)} m/s`, C, C + C * 0.75 + 6);
    m.userData.tex.needsUpdate = true;
    m.scale.setScalar(expert.tb.diam / 12);
  }
  const lg = $('#bladeBar'); if (lg) { const g = lg.getContext('2d'); const w = lg.width, h = lg.height; const grd = g.createLinearGradient(0, 0, w, 0); for (let i = 0; i <= 8; i++) { const col = rampColor(BLADE_RAMP, i / 8); grd.addColorStop(i / 8, col.getStyle()); } g.fillStyle = grd; g.fillRect(0, 0, w, h); }
}
function toolboxStep(dtReal) {
  if (expert.wasDark !== themeDark) { expert.wasDark = themeDark; drawStepResponse(); }   // 応答グラフは入力で決まるので、色が変わるときだけ描き直す
}
function drawStepResponse() {
  const c1 = $('#stepChart'), c2 = $('#stepChart2'); if (!c1 || !c2) return;
  const t = expert.tb, r = toolboxCalc(t);
  const tau = 0.06 + 0.02 * Math.max(0, t.diam - 10) + 0.004 * Math.max(0, t.pitch - 4.5);   // 径・ピッチから推定した時定数(プロペラが大きいほど慣性で遅い)
  const Rp = t.cells * 0.005 + 0.005;   // セル 5 mΩ + 配線・コネクタ 5 mΩ
  const N = 300, T = 1.0; const traces = [[], [], [], []]; let n = 0.3;
  for (let i = 0; i < N; i++) { const tt = i / N * T; const cmd = tt < 0.2 ? 0.3 : 0.7; n += (cmd - n) * (1 - Math.exp(-(T / N) / tau)); const I = 4 * r.Iper * (n / r.thr) ** 3 * (1 + 2.5 * Math.max(0, cmd - n)) + 1.0; const V = r.Vn - I * Rp; traces[0].push(cmd); traces[1].push(n); traces[2].push(I); traces[3].push(V); }
  const Imax = Math.max(10, ...traces[2]) * 1.1, Vmin = Math.min(...traces[3]);
  const panel = (c, idx, rng, cols, dash, labels) => {
    const g = c.getContext('2d'); const dpr = Math.min(2, window.devicePixelRatio || 1); const w = c.clientWidth || 300, h = c.clientHeight || 100;
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    const ink = themeDark ? 'rgba(255,255,255,.10)' : 'rgba(20,26,40,.10)'; g.strokeStyle = ink; g.lineWidth = 1; g.beginPath(); for (let k = 1; k < 4; k++) { g.moveTo(0, h * k / 4); g.lineTo(w, h * k / 4); } g.stroke();
    const x0 = 0.2 / T * w; g.strokeStyle = themeDark ? 'rgba(255,255,255,.25)' : 'rgba(20,26,40,.25)'; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(x0, 0); g.lineTo(x0, h); g.stroke(); g.setLineDash([]);
    idx.forEach((ti, j) => { const tr = traces[ti], [lo, hi] = rng[j]; g.strokeStyle = cols[j]; g.lineWidth = dash[j] ? 1 : 1.6; g.setLineDash(dash[j] ? [4, 3] : []); g.beginPath(); tr.forEach((v, i) => { const x = i / (N - 1) * w, y = h - (v - lo) / (hi - lo) * h; if (i === 0) g.moveTo(x, y); else g.lineTo(x, y); }); g.stroke(); });
    g.setLineDash([]); g.fillStyle = themeDark ? '#aab2c0' : '#4b5260'; g.font = '10px ui-monospace, Menlo, monospace';
    g.textAlign = 'right'; g.fillText(labels[0], w - 4, 11); g.fillText(labels[1], w - 4, h - 3); g.textAlign = 'left'; g.fillText('0', 4, h - 3); g.fillText('← 1 秒 →', x0 + 4, 11);
  };
  panel(c1, [0, 1], [[0, 1], [0, 1]], ['#9aa3b0', XCOL.q], [true, false], ['100%', '0%']);
  panel(c2, [2, 3], [[0, Imax], [r.Vn - 3, r.Vn + 0.2]], [XCOL.r, '#14b8a6'], [false, false], [`${Imax.toFixed(0)} A / ${(r.Vn + 0.2).toFixed(1)} V`, `0 A / ${(r.Vn - 3).toFixed(1)} V`]);
  const el = $('#stepInfo'); if (el) el.innerHTML = `30→70% の立ち上がり: 63% まで <b>${(tau * 1000).toFixed(0)} ms</b>、90% まで <b>${(2.3 * tau * 1000).toFixed(0)} ms</b>。電流の山 ${Math.max(...traces[2]).toFixed(0)} A、電圧サグ ${(r.Vn - Vmin).toFixed(1)} V（内部抵抗 ${(Rp * 1000).toFixed(0)} mΩ）<br>τ（タウ）＝63% まで到達する時間。径とピッチから推定した目安で、測定値ではありません。`;
}
function toolboxRender() {
  const t = expert.tb, r = toolboxCalc(t);
  const set = (id, v) => { const el = $(id); if (el) el.innerHTML = v; };
  const grade = (v, ok, mid) => v >= ok ? ['ok', '◎'] : v >= mid ? ['mid', '○'] : ['bad', '▲'];
  const gradeLow = (v, ok, mid) => v <= ok ? ['ok', '◎'] : v <= mid ? ['mid', '○'] : ['bad', '▲'];
  const tw = grade(r.TW, 2.0, 1.6), mg = grade(r.margin, 0.4, 0.3), tp = gradeLow(r.tipH, 90, 120), im = gradeLow(r.Imax, 60, 80);
  set('#tbOut', `
    <div class="kv"><span>推力重量比</span><b class="${tw[0]}">${tw[1]} ${r.TW.toFixed(1)}</b><small>1基 約${(r.Tmax / 9.81).toFixed(1)} kgf（${r.Tmax.toFixed(0)} N）× 4。目安 2.0↑◎ 1.6↑○</small></div>
    <div class="kv"><span>ホバー余裕</span><b class="${mg[0]}">${mg[1]} ${(r.margin * 100).toFixed(0)}%</b><small>ホバー 回転数 ${(r.thr * 100).toFixed(0)}%（推力 ${(100 / r.TW).toFixed(0)}%）・${(r.nH * 60).toFixed(0)} rpm。目安 40%↑◎ 30%↑○</small></div>
    <div class="kv"><span>飛行時間 目安</span><b>約${r.tmin.toFixed(0)} 分</b><small>ホバー・無風、容量の80%。実飛行は 7〜8 掛け。${r.Itot.toFixed(1)} A（1基 ${r.Iper.toFixed(1)} A）</small></div>
    <div class="kv"><span>先端速度（ホバー）</span><b class="${tp[0]}">${tp[1]} ${r.tipH.toFixed(0)} m/s</b><small>最大 ${r.tipMax.toFixed(0)} m/s＝マッハ ${(r.tipMax / 343).toFixed(2)}（音速 343 m/s・20℃）。0.4 を超えると音と効率が急に悪くなる</small></div>
    <div class="kv"><span>全開の電流</span><b class="${im[0]}">${im[1]} ${r.Imax.toFixed(0)} A</b><small>${r.Crate.toFixed(0)}C 放電。XT60 の定格 60 A・ESC/バッテリーの定格と比べる</small></div>
    <div class="kv"><span>ホバー効率</span><b>${r.gW.toFixed(1)} g/W</b><small>g/W は大きいほど効率が良い。ディスク荷重 ${(r.DL / 9.81).toFixed(1)} kg/m²（こちらは小さいほど静かで長く飛ぶ）</small></div>
    <div class="kv"><span>重心 x / z</span><b>${typeof scale === 'object' && scale.cg ? `${(scale.cg.x * 1000).toFixed(0)} / ${(scale.cg.z * 1000).toFixed(0)} mm` : '—'}</b><small>「重さ・お金」の配置から</small></div>`);
  drawStepResponse(); if (expert.blade) bladePaint();
  const leg = $('#bladeLegend'); if (leg) leg.innerHTML = expert.blade ? `10区間の周速: 根元 ${(r.tipH * 0.15).toFixed(0)} → 先端 ${r.tipH.toFixed(0)} m/s（色は最大回転時の ${r.tipMax.toFixed(0)} m/s を赤とした相対）。推力の多くは外側の3区間が作る。` : '';
  renderAB(r);
}
function abSnapshot() { const t = { ...expert.tb }; return { t, r: toolboxCalc(t) }; }
function renderAB(rNow) {
  const box = $('#abBox'); if (!box) return; const A = expert.ab.A, B = expert.ab.B;
  const clr = $('#abClear'); if (clr) clr.disabled = !A && !B;
  if (!A && !B) { box.innerHTML = '<p class="hint">「Aに保存」→ 値を変えて「Bに保存」。違う行だけが光ります。</p>'; return; }
  const rows = [['KV', x => x.t.kv, ''], ['セル', x => x.t.cells + 'S', ''], ['プロペラ', x => `${x.t.diam}×${x.t.pitch}`, ''], ['重量', x => x.t.mass.toFixed(2), ' kg'], ['推力重量比', x => x.r.TW.toFixed(1), ''], ['ホバー余裕', x => (x.r.margin * 100).toFixed(0), '%'], ['飛行時間', x => x.r.tmin.toFixed(0), ' 分'], ['先端速度', x => x.r.tipH.toFixed(0), ' m/s'], ['全開の電流', x => x.r.Imax.toFixed(0), ' A'], ['ホバー効率', x => x.r.gW.toFixed(1), ' g/W']];
  box.innerHTML = `<table class="ab"><tr><th></th><th>A</th><th>B</th></tr>${rows.map(([n, f, u]) => { const a = A ? f(A) : '—', b = B ? f(B) : '—'; const diff = A && B && a !== b; return `<tr class="${diff ? 'diff' : ''}"><td>${n}</td><td>${a}${A ? u : ''}</td><td>${b}${B ? u : ''}</td></tr>`; }).join('')}</table>`;
}

// ---------- パネル描画 ----------
function renderExpertPanel() {
  const body_ = $('#expertBody'), m = expert.mode; if (!body_) return;
  $('#expertTitle').textContent = EXPERT_TITLE[m];
  const note = typeof langNote === 'function' ? langNote() : '';
  if (m === 'sensors') {
    body_.innerHTML = `${note}
      <p class="xnote">機体はホバー中。<b>はじく</b>とジャイロが振れ、<b>防振</b>を切ると細かい震えが乗ります。傾いて動いても x・y の加速度計はほぼ 0 g — だから FC はジャイロと融合して姿勢を知ります。</p>
      <div class="chart"><div class="chart-h"><b>ジャイロ <small>°/s（1秒に回る角度）</small></b><span class="lg">${legendDots([[XCOL.p, 'p ロール'], [XCOL.q, 'q ピッチ'], [XCOL.r, 'r ヨー']])}</span><button class="tgl sm ${expert.damper ? 'on' : ''}" id="xDamper" aria-pressed="${expert.damper}"><i></i>防振ゴムで震えを減らす</button></div><canvas id="chGyro" role="img" aria-label="ジャイロの波形"></canvas></div>
      <div class="chart"><div class="chart-h"><b>加速度 <small>g（重力 9.81 m/s² の何倍か）</small></b><span class="lg">${legendDots([[XCOL.p, 'x 横（ロールの向き）'], [XCOL.q, 'y 前後（ピッチの向き）'], [XCOL.r, 'z 上下']])}</span></div><canvas id="chAcc" role="img" aria-label="加速度の波形"></canvas></div>
      <div class="chart"><div class="chart-h"><b>気圧高度 <small>m</small></b><span class="lg">天候で流れる。地面近くでは吹き下ろしで乱れる</span></div><canvas id="chBaro" role="img" aria-label="気圧高度の波形"></canvas></div>
      <div class="chart"><div class="chart-h"><b>コンパスのずれ <small>°（真の方位との差）</small></b><label class="rng" for="xCurrent">電源線の電流 <input type="range" id="xCurrent" min="0" max="60" value="${expert.current}"> <b id="xCurrentV">${expert.current} A</b></label></div><canvas id="chMag" role="img" aria-label="コンパスのずれの波形"></canvas><p class="hint">電流に比例・電源線までの距離に反比例。機体に固定された磁界なので、機首の向きで ± が変わる。往復の線をより合わせると打ち消せる — だから GNSS/コンパスはマストの上に。</p></div>
      <div id="sensVals" class="vals"></div>
      <div class="xctl"><button class="tgl ${expert.radio ? 'on' : ''}" id="xRadio" aria-pressed="${expert.radio}"><i></i>電波の形を見る（受信アンテナ：2本で1本のダイポール）</button></div>
      <p class="hint">素子の延長方向が弱い。だから機体の真上・真下に穴ができ、2セット付けて互いの穴を埋める機体もある。</p>
      <div class="xheat"><div class="xh-head"><b>ホバー10分の熱</b><span id="heatTime">ホバー 0.0 分</span><button id="xHeat" class="pill-btn">▶ 早送り</button><button id="xHeatReset" class="pill-btn" disabled>もどす</button></div><div id="heatBars"></div><p class="hint">順番と相対量を見るための表示で、絶対温度ではありません。ホバー（低電流）ではモーターが最初に温まり、ESC が熱いのは全開連続・密閉フレームのときです。</p></div>`;
    expert.charts = { gyro: new Strip($('#chGyro'), { min: -60, max: 60, unit: '' }), acc: new Strip($('#chAcc'), { min: -0.6, max: 1.6, unit: 'g' }), baro: new Strip($('#chBaro'), { auto: true, unit: 'm', colors: [XCOL.q] }), mag: new Strip($('#chMag'), { min: -25, max: 25, unit: '°', colors: [XCOL.r] }) };
    $('#xDamper').onclick = () => { expert.damper = !expert.damper; $('#xDamper').classList.toggle('on', expert.damper); $('#xDamper').setAttribute('aria-pressed', String(expert.damper)); showToast(expert.damper ? '防振ゴム: 高い周波数の振動を通しにくくする（ゆっくりした揺れは通す）' : '防振なし: モーターの振動が直接センサーに乗ります', 3000); };
    $('#xCurrent').oninput = e => { expert.current = +e.target.value; $('#xCurrentV').textContent = `${expert.current} A`; };
    $('#xRadio').onclick = () => { expert.radio = !expert.radio; radioDonut(expert.radio); $('#xRadio').classList.toggle('on', expert.radio); $('#xRadio').setAttribute('aria-pressed', String(expert.radio)); if (expert.radio) radioFocus(); };
    $('#xHeat').onclick = () => { if (expert.heatRun) { expert.heatRun = false; } else { expert.heatRun = true; if (expert.heat >= 1) expert.heat = 0; } renderHeatBars(); };
    $('#xHeatReset').onclick = () => { expert.heatRun = false; heatApply(0); renderHeatBars(); };
    renderHeatBars();
  } else if (m === 'wear') {
    body_.innerHTML = `${note}
      <p class="xnote">機体は着地して、<b>先にへる部品から色</b>がつきます。スライダーで回数を進めるか、早送りしてください。交換時期を過ぎた部品は脈打ちます。</p>
      <div class="keys">${Object.values(WEAR_CLASS).map(c => `<span><i style="background:${c.color}"></i>${c.name}</span>`).join('')}<span><i class="hatch"></i>斜線＝交換目安の幅</span></div>
      <div class="xflights"><label for="xFlights">フライト回数 <b id="wearFlights">${expert.flights} 回</b></label><input type="range" id="xFlights" min="0" max="1000" step="10" value="${expert.flights}"></div>
      <div class="xctl"><button id="xWearPlay" class="pill-btn">▶ 1000回まで早送り</button><button id="xWearReset" class="pill-btn">もどす</button><label>年に飛ぶ回数 <select id="xPerYear">${[100, 200, 400].map(v => `<option value="${v}" ${v === expert.perYear ? 'selected' : ''}>${v} 回</option>`).join('')}</select></label></div>
      <div id="wearList" class="wear-list"></div>
      <div id="wearCost" class="cost"></div>`;
    $('#xFlights').oninput = e => { expert.flights = +e.target.value; expert.wearRun = false; $('#xWearPlay').textContent = '▶ 1000回まで早送り'; wearApply(); };
    $('#xWearPlay').onclick = () => { if (expert.wearRun) { expert.wearRun = false; $('#xWearPlay').textContent = '▶ 1000回まで早送り'; } else { if (expert.flights >= 1000) expert.flights = 0; expert.wearRun = true; $('#xWearPlay').textContent = '■ 止める'; } };
    $('#xWearReset').onclick = () => { expert.wearRun = false; expert.flights = 0; $('#xFlights').value = 0; $('#xWearPlay').textContent = '▶ 1000回まで早送り'; wearApply(); };
    $('#xPerYear').onchange = e => { expert.perYear = +e.target.value; wearApply(); };
    renderWearList();
  } else {
    const t = expert.tb;
    body_.innerHTML = `${note}
      <p class="xnote">KV・プロペラ・重量を変えると、下の数字がすぐ変わります。傾向を見るための簡易モデルです。</p>
      <div class="tbform">
        <label><span>KV <small>1Vあたりの無負荷回転数 rpm/V（キロボルトではない）</small></span><input type="number" id="tbKv" inputmode="numeric" min="200" max="1200" step="10" value="${t.kv}"><small>rpm/V</small></label>
        <label><span>セル数 <small>直列のセル数。1セル 3.7V</small></span><select id="tbCells" aria-label="セル数">${[4, 6, 8, 12].map(c => `<option value="${c}" ${c === t.cells ? 'selected' : ''}>${c}S</option>`).join('')}</select><small id="tbCellsV">${(t.cells * 3.7).toFixed(1)} V</small></label>
        <label><span>直径</span><input type="number" id="tbDiam" inputmode="decimal" min="8" max="18" step="0.5" value="${t.diam}"><small>in</small></label>
        <label><span>ピッチ</span><input type="number" id="tbPitch" inputmode="decimal" min="3" max="8" step="0.5" value="${t.pitch}"><small>in</small></label>
        <label><span>全備重量</span><input type="number" id="tbMass" inputmode="decimal" min="0.5" max="15" step="0.1" value="${t.mass}"><small>kg</small></label>
        <label><span>容量</span><input type="number" id="tbMah" inputmode="numeric" min="1000" max="30000" step="100" value="${t.mah}"><small>mAh</small></label>
      </div>
      <div id="tbOut" class="tbout"></div>
      <div class="chart tall"><div class="chart-h"><b>ステップ応答 30→70%</b><span class="lg">${legendDots([['#9aa3b0', '指令'], [XCOL.q, '回転数']])}</span></div><canvas id="stepChart" role="img" aria-label="指令と回転数の応答"></canvas></div>
      <div class="chart"><div class="chart-h"><b>同じ1秒の電流と電圧</b><span class="lg">${legendDots([[XCOL.r, '電流'], ['#14b8a6', '電圧']])}</span></div><canvas id="stepChart2" role="img" aria-label="電流と電圧の応答"></canvas><p id="stepInfo" class="hint"></p></div>
      <div class="xctl"><button class="tgl ${expert.blade ? 'on' : ''}" id="xBlade" aria-pressed="${expert.blade}"><i></i>周速で色分け（翼素）</button><button class="tgl" id="xPropScale" aria-pressed="false"><i></i>プロペラ径を機体に反映</button></div>
      <div class="bladebar" ${expert.blade ? '' : 'hidden'}><canvas id="bladeBar" width="240" height="10"></canvas><span>遅い 0</span><span>速い（最大回転の翼端）</span></div>
      <p id="bladeLegend" class="hint"></p>
      <div class="xab"><div class="xh-head"><b>A / B 比較</b><button id="abA" class="pill-btn">Aに保存</button><button id="abB" class="pill-btn">Bに保存</button><button id="abClear" class="pill-btn" disabled>消す</button></div><div id="abBox"></div></div>
      <details class="xlaw"><summary>制度の確認先（考え方のみ）</summary><ul><li>機体の改造・重量変更は、登録情報や機体認証の前提が変わることがある。まず所管（国土交通省 無人航空機ポータル／DIPS）で手続きの要否を確認する。</li><li>100 g 以上の機体は登録が必要とされている。飛行の区分（人口集中地区・夜間・目視外など）は飛行ごとに確認する。</li><li>この画面は判定をしない。数値は簡易モデルの目安で、実機の性能表と飛行前点検に置き換わるものではない。</li></ul></details>
      <p class="hint src">モデル: T = Ct·ρ·n²·D⁴、P = Cp·ρ·n³·D⁵（n は毎秒回転数、D は直径 m）。Ct = 0.085√(P/4.5)、Cp = 0.040(P/4.5)^0.9 は 12インチ級の一般値。全開回転は無負荷の 85%、モーター＋ESC の効率 85%、容量の 80% を使う。機種切替（ヘキサ／VTOL）と実ログの再生は未実装。</p>`;
    const num = (id, lo, hi, cur) => { const v = +$(id).value; return isFinite(v) && $(id).value !== '' ? clamp(v, lo, hi) : cur; };
    const upd = () => { t.kv = num('#tbKv', 200, 1200, t.kv); t.cells = +$('#tbCells').value; t.diam = num('#tbDiam', 8, 18, t.diam); t.pitch = num('#tbPitch', 3, 8, t.pitch); t.mass = num('#tbMass', 0.5, 15, t.mass); t.mah = num('#tbMah', 1000, 30000, t.mah); const vs = $('#tbCellsV'); if (vs) vs.textContent = `${(t.cells * 3.7).toFixed(1)} V`; toolboxRender(); if ($('#xPropScale').classList.contains('on')) propScale(t.diam / 12); };
    for (const id of ['#tbKv', '#tbCells', '#tbDiam', '#tbPitch', '#tbMass', '#tbMah']) $(id).addEventListener('input', upd);
    $('#xBlade').onclick = () => { expert.blade = !expert.blade; $('#xBlade').classList.toggle('on', expert.blade); $('#xBlade').setAttribute('aria-pressed', String(expert.blade)); $('.bladebar').hidden = !expert.blade; bladeDiscs(expert.blade); toolboxRender(); };
    $('#xPropScale').onclick = () => { const b = $('#xPropScale'); const on = !b.classList.contains('on'); b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); propScale(on ? t.diam / 12 : 1); };
    $('#abA').onclick = () => { expert.ab.A = abSnapshot(); renderAB(); }; $('#abB').onclick = () => { expert.ab.B = abSnapshot(); renderAB(); }; $('#abClear').onclick = () => { expert.ab = { A: null, B: null }; renderAB(); };
    toolboxRender();
  }
}
function renderExpertSel() {
  const box = $('#expertSel'); if (!box) return; const p = S.selected;
  if (!expert.mode || !p) { box.hidden = true; return; }
  let extra = '';
  if (expert.mode === 'wear' && WEAR[p.key]) { const w = WEAR[p.key]; extra = `${WEAR_CLASS[w.cls].name}・交換目安 ${w.lo}〜${w.hi}回・${w.effect}`; }
  else if (expert.mode === 'sensors' && HEAT_PARTS[p.key]) extra = `熱の順位 ${Object.keys(HEAT_PARTS).indexOf(p.key) + 1} 位`;
  else extra = partRole(p.key);
  box.innerHTML = `<b>${partName(p)}</b><span>${extra}</span>`; box.hidden = false;
}

function initExpert() {
  for (const id of ['#expertSeg', '#expertSegM']) { const el = $(id); if (el) el.addEventListener('click', e => { const b = e.target.closest('button'); if (b) expertStart(b.dataset.x); }); }
  const tg = $('#expertToggle'); if (tg) tg.addEventListener('click', expertOpenSheet);
  $('#expertClose').addEventListener('click', () => { if (narrow()) $('#expert').classList.remove('open'); else setTab('see'); });
  // シート: 下スワイプで閉じる、上スワイプで高く(2段デテント)
  const el = $('#expert'), grab = el.querySelector('.grabber'); let drag = null;
  grab.addEventListener('pointerdown', e => { drag = { y0: e.clientY, hist: [[e.clientY, performance.now()]] }; grab.setPointerCapture(e.pointerId); el.classList.add('dragging'); });
  grab.addEventListener('pointermove', e => { if (!drag) return; const dy = e.clientY - drag.y0; el.style.transform = `translateY(${Math.max(-80, dy)}px)`; drag.hist.push([e.clientY, performance.now()]); if (drag.hist.length > 6) drag.hist.shift(); });
  const end = e => { if (!drag) return; const dy = e.clientY - drag.y0; const h0 = drag.hist[0], h1 = drag.hist[drag.hist.length - 1]; const v = (h1[0] - h0[0]) / Math.max(1, h1[1] - h0[1]); el.classList.remove('dragging'); el.style.transform = '';
    if (v < -0.5 || dy < -60) el.classList.add('tall'); else if (el.classList.contains('tall') && (v > 0.5 || dy > 60)) el.classList.remove('tall'); else if (v > 0.5 || dy > el.offsetHeight * 0.4) el.classList.remove('open'); drag = null; };
  grab.addEventListener('pointerup', end); grab.addEventListener('pointercancel', end);
  window.__expert = expert; window.__toolboxCalc = toolboxCalc;
}
