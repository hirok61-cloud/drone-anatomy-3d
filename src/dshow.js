// ===== 夜のドローンショー =====
// 多数の機体が夜空で図形を描く。見世物であると同時に、教則では
// 「多数の者の集合する催し」の例そのもの（3.1.1）＋夜間飛行（3.1.2 / 6.4）の場面でもある。
// 1機ずつ手で操縦しているのではなく、あらかじめ決めた経路を自動で飛ばしている、という点も見せる。
const dshow = {
  on: false, t: 0, n: 0, pts: null, geo: null, mat: null,
  pos: null, from: null, to: null, col: null, colFrom: null, colTo: null, lag: null,
  fig: 0, figT: 0, phase: 'move', saved: null, star: 0, lastVals: 0,
};
const DSHOW_N = () => (S.qLevel <= 1 ? 160 : 260);   // 実際のショーは数百〜数千機。箱庭では見える密度に落とす
const DSHOW_H = 2.25;      // 隊列の中心の高さ(m)
const DSHOW_R = 1.55;      // 隊列の広がり(m)
const DSHOW_MOVE = 2.6, DSHOW_HOLD = 3.4;   // 移り変わりと静止の秒数
// 縦長の画面は説明カードが下半分を覆う。隊列を少し縮めて低くすると、上の帯に全部入る
const dshowTall = () => innerWidth / Math.max(1, innerHeight) < 1.05;
function dshowLayout() {
  const tall = dshowTall();
  if (dshow.pts) dshow.pts.scale.setScalar(tall ? 0.78 : 1);
  // 主役の1機は説明カードと部品一覧を避けた位置へ（隊列と重ならないところ）
  dshow.bodyPos = tall ? [1.15, 1.15, 0.35] : [2.2, 0.45, 0.6];
}

// ---------- 図形 ----------
// どれも「輪郭の上に等間隔で並べる」。点の数が変わっても形が保てる
const DSHOW_FIGS = [
  { id: 'grid', name: '整列', col: ['#cfe0ff', '#9ec2ff'], note: '離陸して定位置に並びます。1機ずつ手で操縦しているのではなく、あらかじめ決めた経路を自動で飛ばします。教則は自動操縦を「プログラムにより自動的に操縦を行うこと」としています。' },
  { id: 'ring', name: '輪', col: ['#7fd4ff', '#c9f0ff'], note: '教則は、飛行中の他の無人航空機を確認した場合は安全な間隔を確保し、接近や衝突のおそれがあれば降下させるなどの措置をとるとともに、相手方と飛行日時・経路・高度を調整するとしています。' },
  { id: 'star', name: '星', col: ['#ffd97a', '#fff3c9'], note: 'ショーの色は演出です。夜間飛行の必須装備は「機体の姿勢及び方向が正確に視認できる灯火」で、こちらは安全のための要件です。' },
  { id: 'heart', name: 'ハート', col: ['#ff8fb0', '#ffd0dd'], note: 'カテゴリーⅡ飛行は、飛行経路下に操縦者と補助者以外の第三者が立ち入らないよう管理する措置を講じたうえで行うものとされています。看板やコーンによる表示、補助者による監視と口頭警告が例です。' },
  { id: 'drone', name: '機体のかたち', col: ['#8effc8', '#d8fff0'], note: 'この教材の機体と同じ形です。100グラム以上の機体は1機ずつ登録し、一部の例外を除きリモートID機能を備えることが求められます。台数分すべてが対象です。' },
  { id: 'sphere', name: '球', col: ['#b79cff', '#e6ddff'], note: '風が強まれば隊列は保てません。催しの上空では、風速5m/s以上の場合は飛行を中止することが必要とされています。' },
];
function dshowShape(id, n, out) {
  const put = (i, x, y, z) => { out[i * 3] = x; out[i * 3 + 1] = y + DSHOW_H; out[i * 3 + 2] = z; };
  if (id === 'grid') {
    const cols = Math.max(2, Math.round(Math.sqrt(n * 1.6))), rows = Math.ceil(n / cols);   /* 横長の格子。端数が出ると最終行だけ欠けて左に寄って見える */
    for (let i = 0; i < n; i++) { const c = i % cols, r = (i / cols) | 0;
      put(i, (c / (cols - 1) - 0.5) * DSHOW_R * 1.6, (r / Math.max(1, rows - 1) - 0.5) * DSHOW_R * 0.8, 0); }
  } else if (id === 'ring') {
    // 内と外をそれぞれ等分する。角度を (i/n)*4π にすると i と i+n/2 が重なって、半数が同じ場所に立つ
    for (let i = 0; i < n; i++) {
      const k = i % 2, m = k ? Math.floor(n / 2) : Math.ceil(n / 2), j = (i - k) / 2;
      const a = (j / m) * Math.PI * 2 + (k ? Math.PI / m : 0), r = DSHOW_R * (k ? 0.62 : 1.0);
      put(i, Math.cos(a) * r, Math.sin(a) * r, 0); }
  } else if (id === 'star') {
    const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = DSHOW_R * (i % 2 ? 0.46 : 1.0); pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
    dshowAlong(pts, n, put, true);
  } else if (id === 'heart') {
    const pts = []; for (let i = 0; i < 140; i++) { const t = (i / 140) * Math.PI * 2, k = DSHOW_R / 17;
      pts.push([16 * Math.pow(Math.sin(t), 3) * k, (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * k]); }
    dshowAlong(pts, n, put, true);
  } else if (id === 'drone') {
    // クアッドの平面図: 4つのローター円 + 十字のアーム + 中央の胴
    const per = Math.floor(n * 0.15), arm = Math.floor(n * 0.07), rest = n - per * 4 - arm * 4;
    let i = 0; const rr = DSHOW_R * 0.42, off = DSHOW_R * 0.62;
    for (let q = 0; q < 4; q++) {
      const cx = (q === 0 || q === 3 ? 1 : -1) * off, cy = (q < 2 ? 1 : -1) * off;
      for (let j = 0; j < per; j++) { const a = (j / per) * Math.PI * 2; put(i++, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 0); }
      for (let j = 0; j < arm; j++) { const t = 0.18 + (j / Math.max(1, arm - 1)) * 0.72; put(i++, cx * t, cy * t, 0); }
    }
    for (let j = 0; j < rest; j++) { const a = (j / rest) * Math.PI * 2, r = DSHOW_R * 0.2 * (0.4 + 0.6 * ((j % 3) / 2)); put(i++, Math.cos(a) * r, Math.sin(a) * r, 0); }
  } else {   // sphere: フィボナッチ球
    const g = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) { const y = 1 - (i / (n - 1)) * 2, r = Math.sqrt(Math.max(0, 1 - y * y)), a = g * i;
      put(i, Math.cos(a) * r * DSHOW_R, y * DSHOW_R, Math.sin(a) * r * DSHOW_R); }
  }
}
// 折れ線の上に等間隔で並べる（頂点の数に関わらず密度が揃う）
function dshowAlong(pts, n, put, close) {
  const P = close ? pts.concat([pts[0]]) : pts;
  const seg = [], L = [];
  let total = 0;
  for (let i = 0; i < P.length - 1; i++) { const d = Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]); seg.push(d); total += d; L.push(total); }
  for (let i = 0; i < n; i++) {
    const s = (i / n) * total; let k = 0; while (k < L.length - 1 && L[k] < s) k++;
    const s0 = k ? L[k - 1] : 0, t = seg[k] > 1e-6 ? (s - s0) / seg[k] : 0;
    put(i, P[k][0] + (P[k + 1][0] - P[k][0]) * t, P[k][1] + (P[k + 1][1] - P[k][1]) * t, 0);
  }
}

// ---------- 作る ----------
function dshowBuild() {
  if (dshow.pts) return;
  const n = dshow.n = DSHOW_N();
  dshow.pos = new Float32Array(n * 3); dshow.from = new Float32Array(n * 3); dshow.to = new Float32Array(n * 3);
  dshow.col = new Float32Array(n * 3); dshow.colFrom = new Float32Array(n * 3); dshow.colTo = new Float32Array(n * 3);
  dshow.lag = new Float32Array(n);
  for (let i = 0; i < n; i++) dshow.lag[i] = Math.random() * 0.35;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(dshow.pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(dshow.col, 3));
  const mat = new THREE.PointsMaterial({ size: 0.155, map: canvasTex(glowCanvas(true)), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, toneMapped: false });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = 6;
  pts.userData.noPart = pts.userData.noPick = pts.userData.noShadow = pts.userData.noAO = true;
  pts.visible = false; scene.add(pts);
  dshow.geo = geo; dshow.mat = mat; dshow.pts = pts;
  dshowShape('grid', n, dshow.from); dshow.pos.set(dshow.from); dshow.to.set(dshow.from);
  dshowSetColor(0, dshow.colFrom); dshow.col.set(dshow.colFrom); dshow.colTo.set(dshow.colFrom);
}
function dshowSetColor(fi, out) {
  const f = DSHOW_FIGS[fi], a = new THREE.Color(f.col[0]), b = new THREE.Color(f.col[1]), c = new THREE.Color();
  for (let i = 0; i < dshow.n; i++) { c.copy(a).lerp(b, (i * 2654435761 % 1000) / 1000); out[i * 3] = c.r; out[i * 3 + 1] = c.g; out[i * 3 + 2] = c.b; }
}

// ---------- 入口 ----------
function dshowOn(on) {
  on = !!on;
  if (on === dshow.on) return;
  if (on) {
    stopOthers('dshow');
    dshowBuild();
    dshowLayout();   /* 主役機の置き場所は画面の形で決まる。位置を読む前に確定させる */
    dshow.on = true; dshow.t = 0; dshow.fig = 0; dshow.figT = 0; dshow.phase = 'hold'; dshow.star = 0; dshow.lastVals = 0;
    document.body.classList.add('dshow'); syncDockH();   /* 操作列を畳んで夜空を広くとる */
    dshow.saved = { power: S.power, labels: S.labelsSuppressed, air: S.air };
    S.labelsSuppressed = true; buildLabels();
    S.air = false; for (const x of $$('.tgl[data-t=air]')) { x.classList.remove('on'); x.setAttribute('aria-pressed', 'false'); }
    if (S.explode > 0.02) setExplode(0); if (S.mode === 'cut') setMode('normal');
    dshow.pts.visible = true;
    farGroundOn(true);
    if (S.power === 0) setPower(0.5, true);
    // 主役の1機は隊列の手前に浮かべる。「あの光の点ひとつが、この機体」と分かるように
    setBodyMode('theater');
    const bp = dshow.bodyPos || [2.2, 0.45, 0.6];
    body.px = bp[0]; body.py = bp[1]; body.pz = bp[2]; body.tx = body.tz = body.wx = body.wz = 0; body.yaw = 0; body.mult = [1, 1, 1, 1];
    dshowSky();
    { const tall = dshowTall();
      const dir = new THREE.Vector3(0.32, 0.40, 1).normalize(), aim = new THREE.Vector3(0, tall ? 1.25 : 1.45, 0);   /* 見上げるほど空が広い */   /* 観客の位置から見上げる。隊列と地上の機体を1枚に入れる */
      flyTo(aim.clone().addScaledVector(dir, (tall ? 9.2 : 10.6) * viewScale()), aim, 1100, false); }
    renderDshow();
    if (!store.get('dshowSeen')) { store.set('dshowSeen', '1'); showToast('図形は自動で切り替わります。1機ずつ操縦しているのではありません', 4600); }
  } else {
    dshow.on = false;
    document.body.classList.remove('dshow'); syncDockH();
    if (dshow.pts) dshow.pts.visible = false;
    const s = dshow.saved || {};
    S.labelsSuppressed = !!s.labels; buildLabels();
    S.air = !!s.air; for (const x of $$('.tgl[data-t=air]')) { x.classList.toggle('on', S.air); x.setAttribute('aria-pressed', String(S.air)); }
    if (!(typeof fpv === 'object' && fpv.on)) farGroundOn(false);
    { const u = backdropMat.uniforms; u.uStar.value = 0; u.uCloud.value = 0; u.uWall.value = 0; u.uHaze.value = 0; }   /* 星だけ戻しても、夜の雲とかすみが昼の空に残る */
    if (typeof weather === 'object' && weather.on) weatherSky(); else applyTheme();
    body.px = body.pz = 0; body.py = 0; body.tx = body.tz = 0;
    if (s.power === 0 && S.power > 0) setPower(0, true);
    setBodyMode('idle'); syncBodyMode();
    if ($('#noteCard').dataset.kind === 'dshow') renderNote(null);
    camHome();
  }
  const b = $('#showBtn'); if (b) { b.classList.toggle('on', dshow.on); b.setAttribute('aria-pressed', String(dshow.on)); }
}
// 夜空。空もようの仕組みをそのまま使い、星だけ足す
function dshowSky() {
  const u = backdropMat.uniforms;
  u.top.value.set('#050a16'); u.mid.value.set('#0b1526'); u.edge.value.set('#131c2e'); u.bottom.value.set('#05080f');
  u.uCloud.value = 0.10; u.uWall.value = 0.10; u.uSharp.value = 0.35; u.uScale.value = 1.4;
  u.uLo.value.set('#0f1722'); u.uHi.value.set('#2a3446'); u.uHaze.value = 0.10; u.uHazeCol.value.set('#131c2e');
  u.uDrift.value.set(0.006, 0.003); u.uOct.value = S.qLevel <= 1 ? 3 : 5;
  key.color.set('#9fb6e8'); key.intensity = 0.55;
  rim.color.set('#8fb0ff'); rim.intensity = 1.5;
  kick.color.set('#7f9ee0'); kick.intensity = 0.35;
  scene.environmentIntensity = 0.5 * S.envMul;
  renderer.toneMappingExposure = 1.12 * S.exposureMul;
  groundMat.color.set('#070b12');
  // 夜間の灯火。機体がどこにいるか、向きがどちらかを光で見せる（教則が夜間の必須装備に挙げているもの）
  D.parts.filter(p => p.key === 'led').forEach(p => { if (p.obj.userData.halo) p.obj.userData.halo.material.opacity = 0.42; });
  farGroundTheme(new THREE.Color(1.25, 1.3, 1.6));   /* 夜は遠くをほんの少しだけ持ち上げる。上げすぎると地面が昼のように光る */
  S.shadowDirty = S.csDirty = S.aoDirty = true;
}

// ---------- 毎フレーム ----------
function stepDshow(dtReal) {
  if (!dshow.on) return;
  dshow.t += dtReal; dshow.figT += dtReal;
  dshow.star += (1 - dshow.star) * (1 - Math.exp(-dtReal / 1.6));
  backdropMat.uniforms.uStar.value = dshow.star;
  backdropMat.uniforms.uT.value = dshow.t;
  const n = dshow.n, pos = dshow.pos, from = dshow.from, to = dshow.to;
  if (dshow.phase === 'hold' && dshow.figT > DSHOW_HOLD) {
    from.set(pos); dshow.colFrom.set(dshow.col);
    dshow.fig = (dshow.fig + 1) % DSHOW_FIGS.length;
    dshowShape(DSHOW_FIGS[dshow.fig].id, n, to);
    dshowSetColor(dshow.fig, dshow.colTo);
    dshow.phase = 'move'; dshow.figT = 0; renderDshow();
  } else if (dshow.phase === 'move' && dshow.figT > DSHOW_MOVE) {
    dshow.phase = 'hold'; dshow.figT = 0; pos.set(to); dshow.col.set(dshow.colTo);
  }
  const wave = reduceMotion ? 0 : 1;
  if (dshow.phase === 'move') {
    for (let i = 0; i < n; i++) {
      const lag = dshow.lag[i];
      const u = clamp((dshow.figT / DSHOW_MOVE - lag) / (1 - lag), 0, 1);
      const e = u * u * (3 - 2 * u);            // なめらかに出て、なめらかに止まる
      const bow = Math.sin(Math.PI * e) * 0.16 * wave;   // まっすぐ飛ばず、少し膨らむ
      for (let k = 0; k < 3; k++) {
        const a = from[i * 3 + k], b = to[i * 3 + k];
        pos[i * 3 + k] = a + (b - a) * e + (k === 1 ? bow : 0);
        dshow.col[i * 3 + k] = dshow.colFrom[i * 3 + k] + (dshow.colTo[i * 3 + k] - dshow.colFrom[i * 3 + k]) * e;
      }
    }
  } else if (wave) {
    for (let i = 0; i < n; i++) pos[i * 3 + 1] = to[i * 3 + 1] + Math.sin(dshow.t * 1.7 + dshow.lag[i] * 18) * 0.012;   // 静止中もわずかに揺れる
  }
  // 主役の1機もホバリングらしく、わずかに上下する
  { const bp = dshow.bodyPos || [2.2, 0.45, 0.6];
    body.px = bp[0]; body.pz = bp[2];
    body.py = bp[1] + (reduceMotion ? 0 : Math.sin(dshow.t * 1.3) * 0.018);
    if (!reduceMotion) { body.tz = Math.sin(dshow.t * 0.9) * 0.012; body.tx = Math.sin(dshow.t * 1.1 + 2) * 0.010; } }
  dshow.geo.attributes.position.needsUpdate = true;
  if (dshow.phase === 'move') dshow.geo.attributes.color.needsUpdate = true;   /* 静止中は色が変わらない */
  if (dshow.t - dshow.lastVals > 0.25) { dshow.lastVals = dshow.t; updateDshowVals(); }
}

// ---------- 説明カード ----------
function updateDshowVals() {
  const el = $('#dshowVals'); if (!el || $('#noteCard').hidden) return;
  const f = DSHOW_FIGS[dshow.fig];
  el.innerHTML = `<i class="dot" aria-hidden="true"></i><span>いま <b>${f.name}</b></span><span>${dshow.n} 機</span><span>高さ ${(DSHOW_H * (dshow.pts ? dshow.pts.scale.x : 1)).toFixed(1)} m</span><span>${dshow.phase === 'move' ? '移動中' : '静止中'}</span>`;
}
function renderDshow() {
  if (!dshow.on) return;
  const card = $('#noteCard');
  if (card.hidden && card.dataset.kind === 'dshow') return;   /* 一度閉じたら、図形が変わっても開き直さない */
  const f = DSHOW_FIGS[dshow.fig];
  // 図形が変わるたびに作り直すと、制度の折りたたみが閉じてしまう。変わるところだけ差し替える
  if (card.dataset.kind === 'dshow' && $('#dshowBody')) {
    $('#dshowBody').innerHTML = f.note; $('#noteBadge').textContent = f.name; updateDshowVals(); return;
  }
  renderNote({
    kind: 'dshow', title: '夜のドローンショー', badge: f.name,
    html: `<div id="dshowVals" class="vals live" aria-live="off"><i class="dot" aria-hidden="true"></i></div>
      <p id="dshowBody">${f.note}</p>
      ${dshowRegHtml()}`,
    actions: [{ label: 'やめる', fn: () => dshowOn(false) }],
  });
  updateDshowVals();
}
// 制度。ショーは教則が「多数の者の集合する催し」の例に挙げている場面そのもの
function dshowRegHtml() {
  return `<details open><summary>この場面にかかわる制度</summary>
    <p class="caveat">${DSHOW_REG.lead}</p>
    <ul class="check">${DSHOW_REG.items.map(x => `<li>${x}</li>`).join('')}</ul>
    <p class="hint">${DSHOW_REG.outside}</p>
    <small class="ky-src">${DSHOW_REG.src}</small></details>`;
}
function onResizedDshow() { if (dshow.on) dshowLayout(); }
function initDshow() {
  const b = $('#showBtn');
  if (b) b.addEventListener('click', () => dshowOn(!dshow.on));
  window.__dshow = { dshow, dshowOn, DSHOW_FIGS, dshowShape, skyUniforms: () => { const u = backdropMat.uniforms; return { star: u.uStar.value, cloud: u.uCloud.value, wall: u.uWall.value, haze: u.uHaze.value }; } };
}
