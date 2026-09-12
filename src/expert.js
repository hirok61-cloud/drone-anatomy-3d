// ===== 専門タブ (パッケージ⑪⑫⑬) =====
// ⑪ センサー視点: 機体が見ている生波形（ジャイロ・加速度・気圧高度・コンパス）、防振、電流でコンパスが狂う、電波の形、10分ホバーの熱
// ⑫ 1000フライト早送り: 消耗の4区分に塗り分け、フライト回数で部位ごとに進行、交換目安と年間維持費（幅つき）
// ⑬ 設計者の工具箱: KV・セル・プロペラ・重量から推力重量比/ホバー余裕/飛行時間/先端速度、30→70%のステップ応答、翼素の色分け、A/B比較
const expert = {
  mode: null, prev: { tx: 0, tz: 0, yaw: 0, vx: 0, vz: 0, t: 0 }, charts: {}, damper: true, current: 0, radio: false,
  heat: 0, heatRun: false, drift: 0, donut: null, flights: 0, perYear: 200, blade: false, bladeDiscs: [], ab: { A: null, B: null },
  tb: { kv: 450, cells: 6, diam: 12, pitch: 4.5, mass: 2.4, mah: 5000 }, stepT: 0, selStrip: null,
};
const EXPERT_MODES = ['sensors', 'wear', 'toolbox'];

// ---------- ストリップチャート ----------
class Strip {
  constructor(canvas, opts) { this.c = canvas; this.g = canvas.getContext('2d'); this.o = Object.assign({ n: 240, min: -1, max: 1, unit: '', colors: ['#3b7df7', '#14b8a6', '#ef6a2d'], labels: [] }, opts); this.data = this.o.colors.map(() => new Float32Array(this.o.n)); this.i = 0; this.auto = !!opts.auto; }
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
    g.fillStyle = dark ? '#aab2c0' : '#4b5260'; g.font = '10px ui-monospace, Menlo, monospace'; g.textAlign = 'right'; g.fillText(`${mx.toFixed(mx >= 100 ? 0 : 1)}${this.o.unit}`, w - 4, 11); g.fillText(`${mn.toFixed(mn <= -100 ? 0 : 1)}${this.o.unit}`, w - 4, h - 3);
  }
  last(k) { return this.data[k][(this.i + this.o.n - 1) % this.o.n]; }
}

// ---------- 入口 ----------
function expertStart(mode) {
  if (!EXPERT_MODES.includes(mode)) mode = 'sensors';
  if (expert.mode) expertStop(true);
  if (typeof stopOthers === 'function') stopOthers('expert');
  expert.mode = mode; S.expert = mode; store.set('expertMode', mode);
  segSet($('#expertSeg'), 'x', mode); if ($('#expertSegM')) segSet($('#expertSegM'), 'x', mode);
  $('#inspector').hidden = true; $('#inspector').classList.remove('open');
  const panel = $('#expert'); panel.hidden = false; if (narrow()) panel.classList.add('open');
  document.body.classList.add('expert');
  if (S.selected) select(null);
  if (mode === 'sensors') sensorsEnter(); else if (mode === 'wear') wearEnter(); else toolboxEnter();
  renderExpertPanel();
}
function expertStop(silent) {
  if (!expert.mode) return;
  if (expert.mode === 'sensors') sensorsLeave(); else if (expert.mode === 'wear') wearLeave(); else toolboxLeave();
  expert.mode = null; S.expert = null;
  $('#expert').hidden = true; $('#expert').classList.remove('open'); $('#inspector').hidden = false;
  document.body.classList.remove('expert');
  if (!silent) syncBodyMode();
}
function stepExpert(dtSim, dtReal) {
  if (!expert.mode) return;
  if (expert.mode === 'sensors') sensorsStep(dtSim, dtReal);
  else if (expert.mode === 'toolbox') toolboxStep(dtReal);
}

// ---------- ⑪ センサー視点 ----------
function sensorsEnter() {
  setPower(0.5, true); syncBodyMode();
  expert.prev = { tx: body.tx, tz: body.tz, yaw: body.yaw, vx: 0, vz: 0, t: 0 }; expert.drift = 0; expert.heat = 0; expert.heatRun = false;
  if (expert.radio) radioDonut(true);
  showToast('機体を指ではじくと、ジャイロの波形が動きます', 3000);
}
function sensorsLeave() {
  radioDonut(false); heatApply(0); expert.heatRun = false;
  if (S.power > 0) setPower(0, true);
}
function radioDonut(on) {
  if (on && !expert.donut) {
    // 受信機のV字アンテナ: 素子ごとに「軸方向に弱く、横に強い」ドーナツ型の指向性。面(淡い青)＋緯線・経線(アンテナ図の見え方)
    const rx = partsOf('rx')[0]; if (!rx) return;
    const grp = new THREE.Group(); grp.userData.noPart = grp.userData.noPick = grp.userData.noAO = grp.userData.noShadow = true;
    const R = 0.11, N = 32, M = 36;
    const profile = Array.from({ length: N + 1 }, (_, i) => { const th = -Math.PI / 2 + i / N * Math.PI; return new THREE.Vector2(0.002 + R * Math.abs(Math.cos(th)) * Math.cos(th) ** 0.15 || 0.002, R * 0.55 * Math.sin(th)); });
    const geo = new THREE.LatheGeometry(profile, M);
    const skin = new THREE.MeshBasicMaterial({ color: 0x3b7df7, transparent: true, opacity: 0.13, side: THREE.DoubleSide, depthWrite: false, toneMapped: false });
    const lineMat = new THREE.LineBasicMaterial({ color: 0x3b7df7, transparent: true, opacity: 0.55, toneMapped: false, depthWrite: false });
    const pts = [];   // 緯線(8本)と経線(12本)
    for (let k = 1; k < 8; k++) { const th = -Math.PI / 2 + k / 8 * Math.PI; const r = 0.002 + R * Math.abs(Math.cos(th)) * Math.cos(th) ** 0.15, y = R * 0.55 * Math.sin(th); for (let j = 0; j < M; j++) { const a0 = j / M * Math.PI * 2, a1 = (j + 1) / M * Math.PI * 2; pts.push(r * Math.cos(a0), y, r * Math.sin(a0), r * Math.cos(a1), y, r * Math.sin(a1)); } }
    for (let j = 0; j < 12; j++) { const a = j / 12 * Math.PI * 2; for (let i = 0; i < N; i++) { const p0 = profile[i], p1 = profile[i + 1]; pts.push(p0.x * Math.cos(a), p0.y, p0.x * Math.sin(a), p1.x * Math.cos(a), p1.y, p1.x * Math.sin(a)); } }
    const lgeo = new THREE.BufferGeometry(); lgeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    for (const sx of [1, -1]) {   // 素子: 根元(±0.030, 0.024, 0.062) → 先端(±0.058, 0.048, 0.068)
      const base = new THREE.Vector3(sx * 0.030, 0.024, 0.062), tip = new THREE.Vector3(sx * 0.058, 0.048, 0.068);
      const lobe = new THREE.Group(); lobe.position.copy(base).lerp(tip, 0.5);
      lobe.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tip.clone().sub(base).normalize());
      const m = new THREE.Mesh(geo, skin), l = new THREE.LineSegments(lgeo, lineMat);
      for (const o of [m, l]) { o.userData.noPart = o.userData.noPick = o.userData.noAO = o.userData.noShadow = true; o.renderOrder = 4; lobe.add(o); }
      grp.add(lobe);
    }
    rx.obj.add(grp); expert.donut = grp;
  }
  if (expert.donut) expert.donut.visible = !!on;
}
function radioFocus() {
  const g = expert.donut; if (!g) return;
  g.traverse(c => { if (c.isMesh) c.userData.noPart = false; });   // 枠決めの間だけ本体扱いにして、カメラをドーナツの外に置く
  focusOn([g], { pull: true, margin: 1.5 });
  g.traverse(c => { if (c.isMesh) c.userData.noPart = true; });
}
const HEAT_PARTS = { esc: 0.92, winding: 0.85, battery: 0.62, xt60: 0.5, pdb: 0.45, bell: 0.4, wiring: 0.35, fc: 0.3 };
const HEAT_COLD = new THREE.Color(0xffa64d), HEAT_HOT = new THREE.Color(0xff3b30);
function heatApply(k) {
  expert.heat = k;
  for (const key in HEAT_PARTS) { const v = HEAT_PARTS[key] * k; const col = HEAT_COLD.clone().lerp(HEAT_HOT, v); for (const p of partsOf(key)) setTint(p, col, v * 0.95); }
}
function sensorsStep(dtSim, dtReal) {
  const dt = Math.max(1e-3, dtSim); const pv = expert.prev;
  const R2D = 180 / Math.PI;
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const p = (body.tz - pv.tz) / dt * R2D, q = wrap(body.yaw - pv.yaw) / dt * R2D, r = (body.tx - pv.tx) / dt * R2D;
  const spin = D.motors.reduce((a, m) => a + m.rpm, 0) / 4 / RPM_MAX; const vib = (expert.damper ? 0.25 : 1.0) * spin;
  const nz = () => (Math.random() * 2 - 1);
  const gyro = [p + 0.4 * nz() + 6 * vib * nz(), r + 0.4 * nz() + 6 * vib * nz(), q + 0.3 * nz() + 3 * vib * nz()];
  const ax = (body.vx - pv.vx) / dt / 9.81, az = (body.vz - pv.vz) / dt / 9.81;
  const acc = [ax - Math.sin(body.tx) + 0.01 * nz() + 0.12 * vib * nz(), az + Math.sin(body.tz) + 0.01 * nz() + 0.12 * vib * nz(), 1 + 0.01 * nz() + 0.18 * vib * nz()];
  expert.drift = clamp(expert.drift + 0.03 * Math.sqrt(dt) * nz(), -0.25, 0.25);
  const alt = body.py + expert.drift + 0.03 * nz();
  const dev = 0.35 * expert.current;   // 定性モデル: 電源線の電流が磁気コンパスをずらす(電流に比例)
  let hd = (-body.yaw * R2D + dev + 1.0 * nz()) % 360; if (hd < 0) hd += 360;
  const ch = expert.charts;
  if (ch.gyro) { ch.gyro.push(gyro); ch.acc.push(acc); ch.baro.push([alt]); ch.mag.push([dev + 1.0 * nz()]); const dark = themeDark; ch.gyro.draw(dark); ch.acc.draw(dark); ch.baro.draw(dark); ch.mag.draw(dark); }
  const hv = $('#sensVals'); if (hv) hv.innerHTML = `<span>ジャイロ p ${gyro[0].toFixed(0)} / q ${gyro[1].toFixed(0)} / r ${gyro[2].toFixed(0)} °/s</span><span>加速度 ${acc[2].toFixed(2)} g</span><span>高度 ${alt.toFixed(2)} m</span><span>方位 ${hd.toFixed(0)}°${dev ? ` <b>（電流で +${dev.toFixed(0)}° ずれ）</b>` : ''}</span>`;
  pv.tx = body.tx; pv.tz = body.tz; pv.yaw = body.yaw; pv.vx = body.vx; pv.vz = body.vz;
  if (expert.heatRun) { heatApply(Math.min(1, expert.heat + dtReal / 6)); renderHeatBars(); if (expert.heat >= 1) expert.heatRun = false; }
}
function renderHeatBars() {
  const box = $('#heatBars'); if (!box) return;
  const rows = Object.entries(HEAT_PARTS).sort((a, b) => b[1] - a[1]);
  box.innerHTML = rows.map(([k, v]) => `<div class="hb"><span class="nm">${partName(k)}</span><i style="--w:${(v * expert.heat * 100).toFixed(0)}%;--c:${HEAT_COLD.clone().lerp(HEAT_HOT, v * expert.heat).getStyle()}"></i></div>`).join('');
  const t = $('#heatTime'); if (t) t.textContent = `ホバー ${(expert.heat * 10).toFixed(1)} 分`;
}

// ---------- ⑫ 1000フライト早送り ----------
const WEAR_CLASS = { must: { name: '必ず減る', color: '#ff3b30' }, wear: { name: '摩耗する', color: '#f59e0b' }, crash: { name: '事故で壊れやすい', color: '#8b5cf6' }, robust: { name: 'ほぼ壊れない', color: '#9aa3b0' } };
function wearEnter() { wearApply(); }
function wearLeave() { for (const k in WEAR) for (const p of partsOf(k)) setTint(p, ACCENT, 0); }
function wearProgress(k) { const w = WEAR[k]; if (!w) return 0; return clamp(expert.flights / w.lo, 0, 1); }
function wearApply() {
  const order = { robust: 0, crash: 1, wear: 2, must: 3 };   // 親部品(モーター等・丈夫)を先に塗り、その中の消耗品(プロペラ等)で上書きする
  for (const k of Object.keys(WEAR).sort((a, b) => order[WEAR[a].cls] - order[WEAR[b].cls])) {
    const w = WEAR[k], cls = WEAR_CLASS[w.cls], col = new THREE.Color(cls.color);
    const prog = expert.flights / w.lo;   // 1.0 = 交換時期の下限
    const cap = { must: 0.95, wear: 0.6, crash: 0.45, robust: 0 }[w.cls];   // 丈夫な部品は素の色のまま。寿命の1/4を過ぎたところから順に色が乗る
    const kk = cap * smoothstep(0.25, 1.0, prog);
    for (const p of partsOf(k)) setTint(p, col, kk);
  }
  const bead = $('#wearFlights'); if (bead) bead.textContent = `${expert.flights} 回`;
  renderWearList();
}
function renderWearList() {
  const box = $('#wearList'); if (!box) return;
  const rows = Object.keys(WEAR).map(k => ({ k, w: WEAR[k], prog: expert.flights / WEAR[k].lo })).sort((a, b) => b.prog - a.prog);
  box.innerHTML = rows.slice(0, 14).map(({ k, w, prog }) => `<div class="wr"><span class="nm">${partName(k)}</span><span class="cls" style="--c:${WEAR_CLASS[w.cls].color}">${WEAR_CLASS[w.cls].name}</span><div class="bar2"><i style="--w:${(clamp(prog, 0, 1.2) / 1.2 * 100).toFixed(0)}%;--c:${WEAR_CLASS[w.cls].color}"></i><b style="--l:${(w.lo / (w.hi * 1.2) * 100).toFixed(0)}%;--r:${(100 / 1.2).toFixed(0)}%"></b></div><span class="rng">${w.lo}〜${w.hi}回</span><span class="ef">${w.effect}</span></div>`).join('');
  // 年間維持費(部品代のみ): 交換間隔 lo〜hi と PRICE×count から幅で
  let lo = 0, hi = 0;
  for (const k in WEAR) { const w = WEAR[k], d = PARTS[k]; if (!d || w.cls === 'robust') continue; const price = (PRICE[k] || 0) * (d.count || 1); hi += price * expert.perYear / w.lo; lo += price * expert.perYear / w.hi; }
  const c = $('#wearCost'); if (c) c.innerHTML = `年間の維持費（部品代のみ・${expert.perYear}フライト/年）<b>¥${(Math.round(lo / 1000) * 1000).toLocaleString()}〜¥${(Math.round(hi / 1000) * 1000).toLocaleString()}</b><span>劣化の速さは典型例。順番を見るためのもので、絶対値は幅です。バッテリーは時間だけで決まりません。</span>`;
}

// ---------- ⑬ 設計者の工具箱 ----------
function toolboxCalc(t) {
  const rho = 1.225, D = t.diam * 0.0254, Vn = t.cells * 3.7, W = t.mass * 9.81;
  const Ct = 0.085 * Math.sqrt(t.pitch / 4.5), Cp = 0.040 * Math.pow(t.pitch / 4.5, 0.9);   // 12インチ級の一般値(簡易)
  const nMax = t.kv * Vn * 0.85 / 60;                         // 負荷時の最大回転 [rev/s]
  const Tmax = Ct * rho * nMax * nMax * Math.pow(D, 4);        // 1基の最大推力 [N]
  const TW = 4 * Tmax / W;
  const nH = Math.sqrt(W / (4 * Ct * rho * Math.pow(D, 4)));   // ホバー回転
  const thr = nH / nMax, margin = 1 - thr;
  const Pm = Cp * rho * Math.pow(nH, 3) * Math.pow(D, 5) / 0.85;   // 1基の電気入力 [W]
  const Iper = Pm / Vn, Itot = 4 * Iper + 1.0;
  const Wh = t.mah / 1000 * Vn * 0.8, tmin = Wh / (Itot * Vn) * 60;
  const tipH = Math.PI * D * nH, tipMax = Math.PI * D * nMax;
  return { D, Vn, nMax, Tmax, TW, nH, thr, margin, Iper, Itot, tmin, tipH, tipMax, Ct, Cp, ok: TW >= 1.6 && thr <= 0.7 };
}
function toolboxEnter() { toolboxRender(); if (expert.blade) bladeDiscs(true); }
function toolboxLeave() { bladeDiscs(false); propScale(1); }
function propScale(k) { for (const mo of D.motors) mo.prop.scale.set(k, 1, k); }
function bladeDiscs(on) {
  if (on && !expert.bladeDiscs.length) {
    for (const mo of D.motors) {
      const cv = document.createElement('canvas'); cv.width = cv.height = 256; const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
      const m = new THREE.Mesh(new THREE.CircleGeometry(0.156, 64), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
      m.rotation.x = -Math.PI / 2; m.position.set(0, 0.045, 0); m.renderOrder = 5; m.userData.noPart = m.userData.noPick = m.userData.noAO = m.userData.noShadow = true; m.userData.cv = cv; m.userData.tex = tex; mo.group.add(m); expert.bladeDiscs.push(m);
    }
  }
  for (const m of expert.bladeDiscs) m.visible = !!on;
  if (on) bladePaint();
}
function bladePaint() {
  const r = toolboxCalc(expert.tb); const vTip = r.tipH;
  for (const m of expert.bladeDiscs) {
    const cv = m.userData.cv, g = cv.getContext('2d'); g.clearRect(0, 0, 256, 256);
    const grd = g.createRadialGradient(128, 128, 128 * 0.14, 128, 128, 128);   // 周速 v = vTip × r/R を色相で: 青(0) → 赤(100 m/s)
    for (let i = 0; i <= 12; i++) { const f = 0.14 + (1 - 0.14) * i / 12, v = vTip * f, hue = 220 - 220 * clamp(v / 100, 0, 1); grd.addColorStop(i / 12, `hsla(${hue}, 80%, 52%, 0.85)`); }
    g.fillStyle = grd; g.beginPath(); g.arc(128, 128, 128, 0, Math.PI * 2); g.arc(128, 128, 128 * 0.14, 0, Math.PI * 2, true); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 1.5;   // 25/50/75% の目盛りリングと外周
    for (const f of [0.25, 0.5, 0.75]) { g.beginPath(); g.arc(128, 128, 128 * f, 0, Math.PI * 2); g.stroke(); }
    g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(128, 128, 126.5, 0, Math.PI * 2); g.stroke();
    m.userData.tex.needsUpdate = true;
    m.scale.setScalar(expert.tb.diam / 12);
  }
}
function toolboxStep(dtReal) {
  expert.stepT += dtReal; if (expert.stepT > 0.25) { expert.stepT = 0; drawStepResponse(); }
}
function drawStepResponse() {
  const c = $('#stepChart'); if (!c) return; const g = c.getContext('2d'); const dpr = Math.min(2, window.devicePixelRatio || 1); const w = c.clientWidth || 300, h = c.clientHeight || 120;
  if (c.width !== Math.round(w * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
  g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
  const t = expert.tb, r = toolboxCalc(t);
  const tau = 0.06 + 0.02 * Math.max(0, t.diam - 10) + 0.004 * Math.max(0, t.pitch - 4.5);   // プロペラが大きいほど立ち上がりが遅い(慣性)
  const Rp = t.cells * 0.004; const N = 300, T = 1.0;
  const traces = [[], [], [], []]; let n = 0.3;
  for (let i = 0; i < N; i++) { const tt = i / N * T; const cmd = tt < 0.2 ? 0.3 : 0.7; n += (cmd - n) * (1 - Math.exp(-(T / N) / tau)); const I = 4 * r.Iper * (n / r.thr) ** 2 * (1 + 2.5 * Math.max(0, cmd - n)); const V = r.Vn - I * Rp; traces[0].push(cmd); traces[1].push(n); traces[2].push(I); traces[3].push(V); }
  const ink = themeDark ? 'rgba(255,255,255,.10)' : 'rgba(20,26,40,.10)'; g.strokeStyle = ink; g.beginPath(); for (let k = 1; k < 4; k++) { g.moveTo(0, h * k / 4); g.lineTo(w, h * k / 4); } g.stroke();
  const cols = ['#9aa3b0', '#3b7df7', '#ef6a2d', '#14b8a6']; const rng = [[0, 1], [0, 1], [0, Math.max(10, ...traces[2]) * 1.1], [r.Vn - 3, r.Vn + 0.2]];
  traces.forEach((tr, k) => { g.strokeStyle = cols[k]; g.lineWidth = k === 0 ? 1 : 1.6; g.setLineDash(k === 0 ? [4, 3] : []); g.beginPath(); tr.forEach((v, i) => { const x = i / (N - 1) * w, y = h - (v - rng[k][0]) / (rng[k][1] - rng[k][0]) * h; if (i === 0) g.moveTo(x, y); else g.lineTo(x, y); }); g.stroke(); });
  g.setLineDash([]);
  const t63 = 0.2 + tau, t90 = 0.2 + 2.3 * tau; const el = $('#stepInfo'); if (el) el.innerHTML = `30→70% の立ち上がり: 63% まで <b>${(tau * 1000).toFixed(0)} ms</b>、90% まで <b>${(2.3 * tau * 1000).toFixed(0)} ms</b>。電流の山 ${Math.max(...traces[2]).toFixed(0)} A、電圧サグ ${(r.Vn - Math.min(...traces[3])).toFixed(2)} V（内部抵抗 ${(Rp * 1000).toFixed(0)} mΩ）`;
}
function toolboxRender() {
  const t = expert.tb, r = toolboxCalc(t);
  const set = (id, v) => { const el = $(id); if (el) el.innerHTML = v; };
  set('#tbOut', `
    <div class="kv"><span>推力重量比</span><b class="${r.TW >= 2 ? 'ok' : r.TW >= 1.6 ? 'mid' : 'bad'}">${r.TW.toFixed(2)}</b><small>1基 ${(r.Tmax / 9.81 * 1000).toFixed(0)} gf × 4</small></div>
    <div class="kv"><span>ホバー余裕</span><b class="${r.margin >= 0.4 ? 'ok' : r.margin >= 0.3 ? 'mid' : 'bad'}">${(r.margin * 100).toFixed(0)}%</b><small>ホバー ${(r.thr * 100).toFixed(0)}% ／ ${(r.nH * 60).toFixed(0)} rpm</small></div>
    <div class="kv"><span>飛行時間 目安</span><b>${r.tmin.toFixed(0)} 分</b><small>${r.Itot.toFixed(1)} A（1基 ${r.Iper.toFixed(1)} A）・容量の80%</small></div>
    <div class="kv"><span>先端速度</span><b>${r.tipH.toFixed(0)} m/s</b><small>ホバー時。最大 ${r.tipMax.toFixed(0)} m/s＝マッハ ${(r.tipMax / 343).toFixed(2)}</small></div>
    <div class="kv"><span>重心 x / z</span><b>${typeof scale === 'object' && scale.cg ? `${(scale.cg.x * 1000).toFixed(0)} / ${(scale.cg.z * 1000).toFixed(0)} mm` : '—'}</b><small>「重さ・お金」の配置から</small></div>`);
  drawStepResponse(); if (expert.blade) bladePaint();
  const leg = $('#bladeLegend'); if (leg) leg.innerHTML = expert.blade ? `翼素10区間の周速: 根元 ${(r.tipH * 0.15).toFixed(0)} → 先端 ${r.tipH.toFixed(0)} m/s（青→赤）。推力の多くは外側の3区間が作る。` : '';
  renderAB(r);
}
function abSnapshot() { const t = { ...expert.tb }; return { t, r: toolboxCalc(t) }; }
function renderAB(rNow) {
  const box = $('#abBox'); if (!box) return; const A = expert.ab.A, B = expert.ab.B;
  if (!A && !B) { box.innerHTML = '<p class="hint">「Aに保存」→ 値を変えて「Bに保存」。違いだけが光ります。</p>'; return; }
  const rows = [['KV', x => x.t.kv, ''], ['セル', x => x.t.cells + 'S', ''], ['プロペラ', x => `${x.t.diam}×${x.t.pitch}`, ''], ['重量', x => x.t.mass.toFixed(2), ' kg'], ['推力重量比', x => x.r.TW.toFixed(2), ''], ['ホバー余裕', x => (x.r.margin * 100).toFixed(0), '%'], ['飛行時間', x => x.r.tmin.toFixed(0), ' 分'], ['先端速度', x => x.r.tipH.toFixed(0), ' m/s']];
  box.innerHTML = `<table class="ab"><tr><th></th><th>A</th><th>B</th></tr>${rows.map(([n, f, u]) => { const a = A ? f(A) : '—', b = B ? f(B) : '—'; const diff = A && B && a !== b; return `<tr class="${diff ? 'diff' : ''}"><td>${n}</td><td>${a}${A ? u : ''}</td><td>${b}${B ? u : ''}</td></tr>`; }).join('')}</table>`;
}

// ---------- パネル描画 ----------
function renderExpertPanel() {
  const body_ = $('#expertBody'), m = expert.mode; if (!body_) return;
  $('#expertTitle').textContent = { sensors: 'センサー視点', wear: '1000フライト早送り', toolbox: '設計者の工具箱' }[m];
  if (m === 'sensors') {
    body_.innerHTML = `
      <p class="xnote">機体は震えながら、雑音混じりで自分を見ています。指ではじくとジャイロが振れ、モーターが回ると細かい振動が乗ります。</p>
      <div class="chart"><label>ジャイロ <small>°/s（p ロール・q ピッチ・r ヨー）</small></label><canvas id="chGyro"></canvas></div>
      <div class="chart"><label>加速度 <small>g（x・y・z）</small></label><canvas id="chAcc"></canvas></div>
      <div class="chart"><label>気圧高度 <small>m（ゆっくり流れる＝気圧センサーのドリフト）</small></label><canvas id="chBaro"></canvas></div>
      <div class="chart"><label>コンパスのずれ <small>°（真の方位との差。電源線の電流で、じわっとずれる）</small></label><canvas id="chMag"></canvas></div>
      <div id="sensVals" class="vals"></div>
      <div class="xctl">
        <button class="tgl ${expert.damper ? 'on' : ''}" id="xDamper" aria-pressed="${expert.damper}"><i></i>防振マウント</button>
        <label class="rng">電源線の電流 <input type="range" id="xCurrent" min="0" max="60" value="${expert.current}"> <b id="xCurrentV">${expert.current} A</b></label>
        <button class="tgl ${expert.radio ? 'on' : ''}" id="xRadio" aria-pressed="${expert.radio}"><i></i>電波の形（受信機アンテナ）</button>
      </div>
      <div class="xheat"><div class="xh-head"><b>ホバー10分の熱</b><span id="heatTime">ホバー 0.0 分</span><button id="xHeat" class="pill-btn">▶ 早送り</button><button id="xHeatReset" class="pill-btn">もどす</button></div><div id="heatBars"></div><p class="hint">順番と相対量を見るための表示です。絶対温度ではありません。磁気干渉は定性モデルです。</p></div>`;
    expert.charts = { gyro: new Strip($('#chGyro'), { min: -60, max: 60, unit: '' }), acc: new Strip($('#chAcc'), { min: -0.6, max: 1.6, unit: 'g' }), baro: new Strip($('#chBaro'), { auto: true, unit: 'm', colors: ['#3b7df7'] }), mag: new Strip($('#chMag'), { min: -25, max: 25, unit: '°', colors: ['#ef6a2d'] }) };
    $('#xDamper').onclick = () => { expert.damper = !expert.damper; $('#xDamper').classList.toggle('on', expert.damper); $('#xDamper').setAttribute('aria-pressed', String(expert.damper)); showToast(expert.damper ? '防振マウント: ゴムがモーターの振動を吸収します' : '防振なし: 振動が直接センサーに乗ります'); };
    $('#xCurrent').oninput = e => { expert.current = +e.target.value; $('#xCurrentV').textContent = `${expert.current} A`; };
    $('#xRadio').onclick = () => { expert.radio = !expert.radio; radioDonut(expert.radio); $('#xRadio').classList.toggle('on', expert.radio); $('#xRadio').setAttribute('aria-pressed', String(expert.radio)); if (expert.radio) radioFocus(); };
    $('#xHeat').onclick = () => { expert.heatRun = true; expert.heat = 0; };
    $('#xHeatReset').onclick = () => { expert.heatRun = false; heatApply(0); renderHeatBars(); };
    renderHeatBars();
  } else if (m === 'wear') {
    body_.innerHTML = `
      <p class="xnote">新品の姿しか見せない分解図に、時間を入れます。整備士の頭にある「ここが先に死ぬ」順番。</p>
      <div class="xflights"><label>フライト回数 <b id="wearFlights">${expert.flights} 回</b></label><input type="range" id="xFlights" min="0" max="1000" step="10" value="${expert.flights}"></div>
      <div class="keys">${Object.values(WEAR_CLASS).map(c => `<span><i style="background:${c.color}"></i>${c.name}</span>`).join('')}</div>
      <div id="wearList" class="wear-list"></div>
      <div class="xctl"><label>年間 <select id="xPerYear">${[100, 200, 400].map(v => `<option value="${v}" ${v === expert.perYear ? 'selected' : ''}>${v} フライト</option>`).join('')}</select></label></div>
      <div id="wearCost" class="cost"></div>`;
    $('#xFlights').oninput = e => { expert.flights = +e.target.value; wearApply(); };
    $('#xPerYear').onchange = e => { expert.perYear = +e.target.value; renderWearList(); };
    renderWearList();
  } else {
    const t = expert.tb;
    body_.innerHTML = `
      <p class="xnote">自社の機体の値を入れて計算します。簡易モデル（推力係数 Ct=0.085√(P/4.5)・出力係数 Cp=0.040・効率85%・容量の80%）で、傾向を見るためのものです。</p>
      <div class="tbform">
        <label>KV <input type="number" id="tbKv" min="200" max="1200" step="10" value="${t.kv}"></label>
        <label>セル数 <select id="tbCells">${[4, 6, 8, 12].map(c => `<option value="${c}" ${c === t.cells ? 'selected' : ''}>${c}S</option>`).join('')}</select></label>
        <label>プロペラ 直径 <input type="number" id="tbDiam" min="8" max="18" step="0.5" value="${t.diam}"> in</label>
        <label>ピッチ <input type="number" id="tbPitch" min="3" max="8" step="0.5" value="${t.pitch}"> in</label>
        <label>全備重量 <input type="number" id="tbMass" min="0.5" max="15" step="0.1" value="${t.mass}"> kg</label>
        <label>容量 <input type="number" id="tbMah" min="1000" max="30000" step="100" value="${t.mah}"> mAh</label>
      </div>
      <div id="tbOut" class="tbout"></div>
      <div class="chart tall"><label>ステップ応答 30→70% <small>灰=指令 青=回転数 橙=電流 緑=電圧</small></label><canvas id="stepChart"></canvas><p id="stepInfo" class="hint"></p></div>
      <div class="xctl"><button class="tgl ${expert.blade ? 'on' : ''}" id="xBlade" aria-pressed="${expert.blade}"><i></i>翼素の色分け（周速）</button><button class="tgl" id="xPropScale" aria-pressed="false"><i></i>プロペラ径を機体に反映</button></div>
      <p id="bladeLegend" class="hint"></p>
      <div class="xab"><div class="xh-head"><b>A / B 比較</b><button id="abA" class="pill-btn">Aに保存</button><button id="abB" class="pill-btn">Bに保存</button><button id="abClear" class="pill-btn">消す</button></div><div id="abBox"></div></div>
      <details class="xlaw"><summary>制度の確認先（考え方のみ）</summary><ul><li>機体の改造・重量変更は、登録情報や機体認証の前提が変わることがある。まず所管（国土交通省 無人航空機ポータル／DIPS）で手続きの要否を確認する。</li><li>100 g 以上の機体は登録が必要とされている。飛行の区分（人口集中地区・夜間・目視外など）は飛行ごとに確認する。</li><li>この画面は判定をしない。数値は簡易モデルの目安で、実機の性能表と飛行前点検に置き換わるものではない。</li></ul></details>
      <p class="hint src">出典の考え方: 推力∝ρn²D⁴・出力∝ρn³D⁵（プロペラ相似則）、定数は 12インチ級の一般値。機種切替（ヘキサ／VTOL）と実ログの再生は未実装。</p>`;
    const upd = () => { t.kv = +$('#tbKv').value || t.kv; t.cells = +$('#tbCells').value; t.diam = +$('#tbDiam').value || t.diam; t.pitch = +$('#tbPitch').value || t.pitch; t.mass = +$('#tbMass').value || t.mass; t.mah = +$('#tbMah').value || t.mah; toolboxRender(); if ($('#xPropScale').classList.contains('on')) propScale(t.diam / 12); };
    for (const id of ['#tbKv', '#tbCells', '#tbDiam', '#tbPitch', '#tbMass', '#tbMah']) $(id).addEventListener('input', upd);
    $('#xBlade').onclick = () => { expert.blade = !expert.blade; $('#xBlade').classList.toggle('on', expert.blade); $('#xBlade').setAttribute('aria-pressed', String(expert.blade)); bladeDiscs(expert.blade); toolboxRender(); };
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
  $('#expertClose').addEventListener('click', () => { if (narrow()) $('#expert').classList.remove('open'); else setTab('see'); });
  const el = $('#expert'), grab = el.querySelector('.grabber'); let drag = null;
  grab.addEventListener('pointerdown', e => { drag = { y0: e.clientY, hist: [[e.clientY, performance.now()]] }; grab.setPointerCapture(e.pointerId); el.classList.add('dragging'); });
  grab.addEventListener('pointermove', e => { if (!drag) return; const dy = Math.max(0, e.clientY - drag.y0); el.style.transform = `translateY(${dy}px)`; drag.hist.push([e.clientY, performance.now()]); if (drag.hist.length > 6) drag.hist.shift(); });
  const end = e => { if (!drag) return; const dy = Math.max(0, e.clientY - drag.y0); const h0 = drag.hist[0], h1 = drag.hist[drag.hist.length - 1]; const v = (h1[0] - h0[0]) / Math.max(1, h1[1] - h0[1]); el.classList.remove('dragging'); el.style.transform = ''; if (v > 0.5 || dy > el.offsetHeight * 0.4) el.classList.remove('open'); drag = null; };
  grab.addEventListener('pointerup', end); grab.addEventListener('pointercancel', end);
  window.__expert = expert;
}
