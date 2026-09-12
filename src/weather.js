// ===== 空もよう（教則第5版 6.2 気象）=====
// 空・光・風を「その日の場」として差し替える。場面（劇場・もしも・降ろし方）と違い、選んだあとはそのまま飛ばせる。
// 風は physics に外乱として渡すだけで、機体の挙動は既存の制御が決める（風上へ傾いて定位置を保つ、強いと流される）。
const weather = { id: null, on: false, t: 0, ts: 0, sockGrp: null, sock: null, rain: null, fogWas: null, gust: 0, cyc: 0, burstEnv: 0, lastVal: 0 };
const WEATHER_BY_ID = Object.fromEntries(WEATHER.map(w => [w.id, w]));
const W16 = ['北', '北北東', '北東', '東北東', '東', '東南東', '南東', '南南東', '南', '南南西', '南西', '西南西', '西', '西北西', '北西', '北北西'];
const windName = (deg) => W16[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16];
const WIND_REF = 1.0;          // 高度プロファイルの基準（m）。この高さで表示どおりの風速になる
const BURST_R = 1.3;           // ダウンバーストの吹き出しの半径（m）。箱庭に縮めてある
const BURST_V = 3.2;           // 下降流の強さ（m/s）

// いまの風。高さ（地表の摩擦）・時間（突風）・場所（ダウンバースト）で変わる
const _wind = { x: 0, y: 0, z: 0, spd: 0, dir: 0 };
function windAt(py, px, pz) {
  _wind.x = _wind.y = _wind.z = 0; _wind.spd = 0;
  const w = weather.on && WEATHER_BY_ID[weather.id]; if (!w) return _wind;
  const p = w.wind;
  let dir = p.dir, spd = p.spd;
  if (p.cycle) { const c = weather.cyc; dir = c.dir; spd = c.spd; }          // 海陸風は時間で入れ替わる
  const h = Math.pow(Math.max(py || 0, 0.05) / WIND_REF, p.alpha);          // 上空ほど強い（粗度が大きいほど差が大きい）
  const g = 1 + (p.gust || 0) * weather.gust;
  const v = spd * h * g;
  _wind.x = -Math.sin(THREE.MathUtils.degToRad(dir)) * v;
  _wind.z = Math.cos(THREE.MathUtils.degToRad(dir)) * v;
  if (p.burst) {   // 下降流が地表にぶつかり、外へ広がる。中心は通り過ぎていく
    const cx = weather.burstX || 0, dx = (px || 0) - cx, dz = (pz || 0);
    const r = Math.hypot(dx, dz), e = weather.burstEnv, k = Math.exp(-(r / BURST_R) * (r / BURST_R));
    _wind.y -= BURST_V * e * k * (1 - Math.min(1, (py || 0) / 2.2) * 0.35);
    const out = BURST_V * 1.25 * e * (r / BURST_R) * k;
    if (r > 1e-4) { _wind.x += (dx / r) * out; _wind.z += (dz / r) * out; }
  }
  _wind.spd = Math.hypot(_wind.x, _wind.z); _wind.dir = dir;
  return _wind;
}
// 表示用（基準高度・突風なしの10分平均）
function windMean() {
  const w = WEATHER_BY_ID[weather.id]; if (!w) return { dir: 0, spd: 0 };
  return w.wind.cycle ? { dir: weather.cyc.dir, spd: weather.cyc.spd } : { dir: w.wind.dir, spd: w.wind.spd };
}

// ---------- 吹き流し ----------
// 実際の飛行現場にもある。風速で上がる角度が決まるので、数値を見なくても風が読める
function windsockBuild() {
  if (weather.sockGrp) return;
  const g = new THREE.Group(); g.position.set(0.95, -0.158, -0.95);   /* カメラの奥。手前に置くと画面の1/3を占める */
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x9aa3b0, roughness: 0.6, metalness: 0.2 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.012, 0.62, 12), poleMat); pole.position.y = 0.31; g.add(pole);
  const sock = new THREE.Group(); sock.position.y = 0.60; g.add(sock);
  // 5本の縞（オレンジと白）を根元から先へ。円錐台をつないで細くする
  const segs = 5, len = 0.088;
  for (let i = 0; i < segs; i++) {
    const r0 = 0.060 - i * 0.007, r1 = 0.060 - (i + 1) * 0.007;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, len, 16, 1, true),
      new THREE.MeshStandardMaterial({ color: i % 2 ? 0xf4f6f8 : 0xe8732d, roughness: 0.8, metalness: 0, side: THREE.DoubleSide }));
    m.rotation.z = Math.PI / 2; m.position.x = len * (i + 0.5); sock.add(m);   // +x を「先」にして、向きは group の回転で決める
  }
  g.traverse(o => { o.userData.noPart = o.userData.noPick = o.userData.noShadow = true; o.castShadow = false; });
  scene.add(g); weather.sockGrp = g; weather.sock = sock;
}
function windsockPose(dtReal) {
  if (!weather.sock) return;
  const w = windAt(0.5, weather.sockGrp.position.x, weather.sockGrp.position.z);
  const spd = w.spd;
  const yaw = Math.atan2(-w.x, -w.z) + Math.PI / 2;          // 吹き流しの先は風下（風の向かう先）
  const lift = Math.min(1, spd / 5.5);                        // 5.5m/s ほどで水平になる
  const pitch = -(Math.PI / 2) * (1 - lift);                  // 無風では真下に垂れる
  const k = 1 - Math.exp(-dtReal / 0.35);
  weather.sock.rotation.y += (yaw - weather.sock.rotation.y) * k;
  weather.sock.rotation.z += (pitch - weather.sock.rotation.z) * k;
  const sway = reduceMotion ? 0 : Math.sin(weather.t * 3.1) * 0.05 * lift;
  weather.sock.rotation.x = sway;
}

// ---------- 雨 ----------
// 点だと雪に見えるので、落ちる向きに伸びる線分で描く（風が強いほど斜めになる）
function rainBuild() {
  if (weather.rain) return;
  const N = S.qLevel <= 1 ? 700 : 1600;
  const pos = new Float32Array(N * 6), seed = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) { seed[i * 4] = (Math.random() - 0.5) * 5; seed[i * 4 + 1] = Math.random() * 3.4; seed[i * 4 + 2] = (Math.random() - 0.5) * 5; seed[i * 4 + 3] = 3.2 + Math.random() * 2.4; }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.LineBasicMaterial({ color: 0xd2dcea, transparent: true, opacity: 0.32, depthWrite: false });
  const seg = new THREE.LineSegments(geo, mat); seg.frustumCulled = false;
  seg.userData.noPart = seg.userData.noPick = seg.userData.noShadow = seg.userData.noAO = true;
  seg.userData.seed = seed; seg.visible = false; scene.add(seg); weather.rain = seg;
}
function rainStep(dtReal) {
  const r = weather.rain; if (!r || !r.visible) return;
  const a = r.geometry.attributes.position, sd = r.userData.seed, w = windAt(1.2, 0, 0), N = sd.length / 4;
  const len = r.userData.len || 0.05;
  for (let i = 0; i < N; i++) {
    let x = sd[i * 4], y = sd[i * 4 + 1], z = sd[i * 4 + 2]; const vy = sd[i * 4 + 3];
    y -= vy * dtReal; x += w.x * dtReal * 0.4; z += w.z * dtReal * 0.4;
    if (y < -0.16) { y = 3.2 + Math.random() * 0.5; x = (Math.random() - 0.5) * 5; z = (Math.random() - 0.5) * 5; }
    if (x > 2.5) x -= 5; else if (x < -2.5) x += 5;
    if (z > 2.5) z -= 5; else if (z < -2.5) z += 5;   // 風下へ流れ切ったら反対側から入れ直す
    sd[i * 4] = x; sd[i * 4 + 1] = y; sd[i * 4 + 2] = z;
    const dx = w.x * 0.4, dz = w.z * 0.4, m = Math.hypot(dx, vy, dz) || 1, k = len * (vy / 3.5);
    a.array[i * 6] = x; a.array[i * 6 + 1] = y; a.array[i * 6 + 2] = z;
    a.array[i * 6 + 3] = x - dx / m * k; a.array[i * 6 + 4] = y + vy / m * k; a.array[i * 6 + 5] = z - dz / m * k;
  }
  a.needsUpdate = true;
}

// ---------- ダウンバーストの小道具 ----------
// 「吹き降ろしが地面にぶつかり、ドーナツ状に四方へ広がる」を、柱と広がる輪で見せる
function burstProps() {
  if (weather.burstGrp) return;
  const g = new THREE.Group(); g.visible = false;
  const col = new THREE.Color(0x7fa6d8);
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(BURST_R * 0.72, BURST_R * 1.02, 2.4, 48, 1, true),
    new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.13, side: THREE.BackSide, depthWrite: false, toneMapped: false }));   /* 片面だけにする（両面だと前後が重なって板に見える） */
  pillar.position.y = -0.158 + 1.2; g.add(pillar);
  const rings = [0, 1, 2].map(() => {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.98, 1.0, 72), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
    m.rotation.x = -Math.PI / 2; m.position.y = -0.1545; g.add(m); return m;
  });
  g.traverse(o => { o.userData.noPart = o.userData.noPick = o.userData.noShadow = o.userData.noAO = true; });
  scene.add(g); weather.burstGrp = g; weather.burstPillar = pillar; weather.burstRings = rings;
}
function burstStep() {
  const g = weather.burstGrp; if (!g) return;
  const e = weather.burstEnv;
  g.visible = e > 0.01;
  if (!g.visible) return;
  g.position.x = weather.burstX || 0;
  weather.burstPillar.material.opacity = 0.14 * e;
  weather.burstRings.forEach((m, i) => {
    const ph = ((weather.t * 0.55 + i / 3) % 1);          // 0→1 で外へ広がる
    const r = 0.25 + ph * (BURST_R * 1.7);
    m.scale.set(r, r, 1);
    m.material.opacity = 0.55 * e * Math.sin(Math.PI * ph) * (1 - ph * 0.35);
  });
}

// ---------- 空と光 ----------
function weatherSky() {
  const u = backdropMat.uniforms;
  const w = weather.on && WEATHER_BY_ID[weather.id];
  if (!w) { u.uCloud.value = 0; u.uWall.value = 0; u.uHaze.value = 0; applyTheme(); return; }
  const s = w.sky;
  u.top.value.set(s.bg[0]); u.mid.value.set(s.bg[1]); u.edge.value.set(s.bg[2]); u.bottom.value.set(s.bg[3]);
  u.uCloud.value = s.cloud || 0; u.uWall.value = s.wall || 0; u.uSharp.value = s.sharp; u.uScale.value = s.scale;
  u.uLo.value.set(s.lo); u.uHi.value.set(s.hi); u.uHaze.value = s.haze || 0; u.uHazeCol.value.set(s.hazeCol);
  u.uDrift.value.set(s.drift[0], s.drift[1]);
  u.uOct.value = S.qLevel <= 1 ? 3 : 5;   // 低品質の端末はオクターブを減らす（全画面のピクセルシェーダなので効く）
  weatherLight();
}
function weatherLight() {
  const w = weather.on && WEATHER_BY_ID[weather.id]; if (!w) return;
  const L = w.light;
  key.color.set(L.key[0]); key.intensity = L.key[1];
  rim.color.set(L.rim[0]); rim.intensity = L.rim[1];
  kick.color.set(L.kick[0]); kick.intensity = L.kick[1];
  scene.environmentIntensity = L.env * S.envMul;
  renderer.toneMappingExposure = L.exposure * S.exposureMul;
  if (L.ground) groundMat.color.set(themeDark ? L.ground.dark : L.ground.light);
  farGroundTheme();   /* 遠くの地面も同じ色に合わせる（合わせないと継ぎ目が出る） */
  S.shadowDirty = S.csDirty = S.aoDirty = true;
}

// ---------- 入口 ----------
function setWeather(id, quiet) {
  const same = weather.id === id;
  const w = id && WEATHER_BY_ID[id];
  if (!w) {   // 元へ戻す
    weather.on = false; weather.id = null; weather.lastVal = 0;
    if (weather.sockGrp) weather.sockGrp.visible = false;
    if (!(typeof fpv === 'object' && fpv.on)) farGroundOn(false);
    if (weather.rain) weather.rain.visible = false;
    if (weather.burstGrp) weather.burstGrp.visible = false;
    scene.fog = weather.fogWas || null; weather.fogWas = null;
    const u = backdropMat.uniforms; u.uCloud.value = 0; u.uWall.value = 0; u.uHaze.value = 0;
    applyTheme();
    for (const b of $$('#skyChips button')) { b.classList.remove('on'); b.setAttribute('aria-pressed', 'false'); }
    if ($('#noteCard').dataset.kind === 'weather') renderNote(null);
    return;
  }
  if (same && weather.on) return setWeather(null);   // 同じものをもう一度押したら戻す
  stopOthers('weather');
  weather.on = true; weather.id = id; weather.t = 0; weather.ts = 0; weather.gust = 0; weather.burstEnv = 0; weather.lastVal = 0;
  weather.cyc = { dir: w.wind.dir, spd: w.wind.spd, label: '昼（海から陸へ）' };
  windsockBuild(); weather.sockGrp.visible = true;
  if (w.wind.burst) burstProps(); else if (weather.burstGrp) weather.burstGrp.visible = false;
  farGroundOn(true);   /* 空を出すなら地平線も要る。床(半径2.8m)だけだと雲の下端が宙に浮く */
  const rainy = id === 'warm' || id === 'cold';
  if (rainy) { rainBuild(); weather.rain.visible = true; weather.rain.material.opacity = id === 'cold' ? 0.34 : 0.22; weather.rain.userData.len = id === 'cold' ? 0.085 : 0.05; }
  else if (weather.rain) weather.rain.visible = false;
  if (weather.fogWas === null) weather.fogWas = scene.fog || undefined;
  scene.fog = w.wind.fog ? new THREE.Fog(new THREE.Color(w.sky.hazeCol), 0.6, w.wind.fog) : (weather.fogWas || null);
  weatherSky();
  for (const b of $$('#skyChips button')) { const on = b.dataset.sky === id; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); }
  if (S.power === 0 && S.tab === 'fly') setPower(0.5, true);
  syncBodyMode();
  // 空が主役なので、機体を画面の下に置いて空を広くとる
  { const dir = new THREE.Vector3(0.8, 0.26, 1).normalize(), aim = new THREE.Vector3(0, 0.38, 0);   /* 機体は0.5mに浮く。空・地平線・吹き流し・地面が1枚に入る引き */
    flyTo(aim.clone().addScaledVector(dir, 3.0 * viewScale()), aim, 900, false); }
  renderWeather();
  if (!quiet && !store.get('skySeen')) { store.set('skySeen', '1'); showToast('吹き流しの角度と機体の傾きで、風の強さが読めます', 4200); }
}

// ---------- 毎フレーム ----------
function stepWeather(dtSim, dtReal) {
  if (!weather.on) return;
  const w = WEATHER_BY_ID[weather.id]; if (!w) return;
  weather.t += dtReal;      // 見た目（雲の流れ・雨・吹き流しの揺れ）
  weather.ts += dtSim;      // 機体に効くもの（突風・海陸風・ダウンバースト）は「ゆっくり」に従う
  backdropMat.uniforms.uT.value = weather.t;
  // 突風（-1〜1のゆらぎ）。寒冷前線は強く、速く
  const f = w.id === 'cold' ? 1.7 : 1.0;
  weather.gust = (Math.sin(weather.ts * 0.9 * f) * 0.6 + Math.sin(weather.ts * 2.3 * f + 1.7) * 0.3 + Math.sin(weather.ts * 4.7 * f + 0.4) * 0.1);
  // 海陸風: 40秒で1日。入れ替わりは凪
  if (w.wind.cycle) {
    // 凪はV字（落ちて、また上がる）。片側だけだと、凪の終わりで風速が段になって機体がカクッと押される
    const ph = (weather.ts / 40) % 1;
    let dir, spd, label;
    if (ph < 0.35) { dir = 180; spd = 3.0; label = '昼（海から陸へ）'; }
    else if (ph < 0.425) { const k = (ph - 0.35) / 0.075; dir = 180 + 180 * k; spd = 3.0 - 2.85 * k; label = '夕凪（入れ替わり）'; }
    else if (ph < 0.50) { const k = (ph - 0.425) / 0.075; dir = 0; spd = 0.15 + 1.85 * k; label = '夕凪（入れ替わり）'; }
    else if (ph < 0.85) { dir = 0; spd = 2.0; label = '夜（陸から海へ）'; }
    else if (ph < 0.925) { const k = (ph - 0.85) / 0.075; dir = 360 - 180 * k; spd = 2.0 - 1.85 * k; label = '朝凪（入れ替わり）'; }
    else { const k = (ph - 0.925) / 0.075; dir = 180; spd = 0.15 + 2.85 * k; label = '朝凪（入れ替わり）'; }
    weather.cyc = { dir: dir % 360, spd, label };
  }
  // ダウンバースト: 24秒で 接近 → 最盛 → 減衰
  if (w.wind.burst) {
    const ph = (weather.ts / 24) % 1;
    weather.burstEnv = ph < 0.22 ? 0 : ph < 0.36 ? (ph - 0.22) / 0.14 : ph < 0.78 ? 1 : ph < 0.92 ? 1 - (ph - 0.78) / 0.14 : 0;
    weather.burstX = -2.0 + 4.0 * clamp((ph - 0.22) / 0.70, 0, 1);   // 中心が通り過ぎる: 向かい風 → 真下 → 追い風
  }
  windsockPose(dtReal);
  rainStep(dtReal);
  burstStep();
  // 注視点は動かさない。OrbitControls は target を動かすとカメラも一緒に平行移動するので、
  // 追従させると風で流れるたびに画の距離が変わってしまう（機体は home 制御で±0.3m程度に収まる）
  if (weather.t - (weather.lastVal || 0) > 0.22) { weather.lastVal = weather.t; updateWeatherVals(); }
}

// ---------- 説明カード ----------
function weatherStateText() {
  const w = WEATHER_BY_ID[weather.id]; if (!w) return '';
  const m = windMean(), gustV = m.spd * (1 + (w.wind.gust || 0) * Math.abs(weather.gust));
  const at = windAt(Math.max(body.py, 0.05), body.px, body.pz);
  const bits = [
    `<span>風向 ${windName(m.dir)}（${m.dir.toFixed(0)}°）</span>`,
    `<span>風速（高さ1m） ${m.spd.toFixed(1)} m/s・風力${beaufort(m.spd)}</span>`,
    `<span>瞬間 ${gustV.toFixed(1)} m/s</span>`,
    `<span>機体の高さ ${body.py.toFixed(2)} m で ${at.spd.toFixed(1)} m/s</span>`,
  ];
  if (w.wind.cycle) bits.push(`<span><b>${weather.cyc.label}</b></span>`);
  if (w.wind.burst) bits.push(`<span><b>${weather.burstEnv > 0.05 ? '吹き降ろしの中' : '待機'}</b>${weather.burstEnv > 0.05 ? `（下降流 ${Math.abs(at.y).toFixed(1)} m/s）` : ''}</span>`);
  return bits.join('');
}
function updateWeatherVals() {
  const el = $('#skyVals'); if (!el || $('#noteCard').hidden) return;
  el.innerHTML = `<i class="dot" aria-hidden="true"></i>${weatherStateText()}`;
}
function renderWeather() {
  const w = WEATHER_BY_ID[weather.id]; if (!w) return;
  renderNote({
    kind: 'weather', title: w.title || w.name, badge: w.cloudName,
    html: `<div id="skyVals" class="vals live" aria-live="off"><i class="dot" aria-hidden="true"></i></div>
      <p>${w.note}</p>
      <p class="caveat">${w.caution}</p>
      <p class="hint">${WIND_LEAD}</p>
      <p class="hint" data-full>${WIND_NOTE}</p>
      <small class="ky-src">教則${KYOSOKU.ver} 6.2 気象／この教材の風は箱庭の広さに合わせて縮めてあり、風速は高さ1mの値です</small>`,
    actions: [{ label: '空をもどす', fn: () => setWeather(null) }],
  });   /* ✕ ではカードだけ閉じる。空は「場」なので、戻すのはチップかこのボタンで */
  updateWeatherVals();
}

function initWeather() {
  const chips = $('#skyChips');
  if (chips) {
    chips.innerHTML = WEATHER.map(w => `<button data-sky="${w.id}" aria-pressed="false" title="${w.short}" aria-label="${w.name}（${w.short}）"><span aria-hidden="true">${w.icon}</span> ${w.name}</button>`).join('');
    chips.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; setWeather(b.dataset.sky); });
  }
  window.__weather = { weather, setWeather, windAt, windMean, beaufort, windName, WEATHER, hasFog: () => !!scene.fog };
}
