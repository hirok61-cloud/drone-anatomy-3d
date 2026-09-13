// ===== ショーのしくみを3Dで見せる =====
// 夜空の見世物を壊さずに重ねる。線は細く、色は1つだけ、出すのは常に1つだけ。
// 置き場所は2つに分ける:
//   dsys.world … 地面のもの（基準局・地上局・離陸前の格子）。倍率 k を自分で掛ける
//   dsys.air   … 隊列の中のもの（経路・間隔・囲い）。dshow.pts の子にすると隊列と一緒に伸縮する
const dsys = { world: null, air: null, cur: null, t: 0, mats: null, built: false, tmp: [], beads: null, esc: null, brightSave: null };
const DSYS_C = 0xc8d6e4;   // しくみの色。演出の光点は彩度が高いので、こちらは彩度を落として層を分ける
                           // （以前の #7fd4ff は図形「輪」の1色目と完全に同じで、背後の光点に溶けていた）

function dsysBuild() {
  if (dsys.built) return;
  dsys.built = true;
  dsys.world = new THREE.Group(); dsys.world.visible = false; scene.add(dsys.world);
  dsys.air = new THREE.Group(); dsys.air.visible = false; dshow.pts.add(dsys.air);
  for (const g of [dsys.world, dsys.air]) { g.userData.noPart = g.userData.noPick = g.userData.noShadow = g.userData.noAO = true; g.renderOrder = 5; }
  dsys.mats = {
    line: new THREE.LineBasicMaterial({ color: DSYS_C, transparent: true, opacity: 0.70, depthWrite: false, toneMapped: false }),
    faint: new THREE.LineBasicMaterial({ color: DSYS_C, transparent: true, opacity: 0.42, depthWrite: false, toneMapped: false }),
    thin: new THREE.MeshBasicMaterial({ color: DSYS_C, transparent: true, opacity: 0.62, depthWrite: false, toneMapped: false }),
    lit: new THREE.MeshBasicMaterial({ color: 0xdff2ff, toneMapped: false }),
    solid: new THREE.MeshBasicMaterial({ color: DSYS_C, transparent: true, opacity: 0.9, toneMapped: false }),
    body: new THREE.MeshStandardMaterial({ color: 0xd7dde6, roughness: 0.6, metalness: 0.1 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x2b2f37, roughness: 0.5, metalness: 0.4 }),
    glass: new THREE.MeshBasicMaterial({ color: DSYS_C, transparent: true, opacity: 0.055, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }),
    warn: new THREE.MeshBasicMaterial({ color: 0xff7a3d, transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }),
    warnLine: new THREE.LineBasicMaterial({ color: 0xff7a3d, transparent: true, opacity: 0.5, depthWrite: false, toneMapped: false }),
  };
}
function dsysClear() {
  for (const g of [dsys.world, dsys.air]) { if (!g) continue; for (let i = g.children.length - 1; i >= 0; i--) { const o = g.children[i]; g.remove(o); if (o.geometry) o.geometry.dispose(); } }
  dsys.tmp.length = 0;
}
const dsysMark = (o) => { o.userData.noPart = o.userData.noPick = o.userData.noShadow = o.userData.noAO = true; o.renderOrder = 5; return o; };
// 文字の札。夜空に重ねるので、地は敷かず白抜きの文字＋薄い縁取りだけにする
const _dsLab = {};
function dsysLabel(text, w) {
  let e = _dsLab[text];
  if (!e) {
    const sc = 2, fs = 30, pad = 14;
    const probe = document.createElement('canvas').getContext('2d');
    probe.font = `700 ${fs}px -apple-system, "Hiragino Sans", sans-serif`;
    const tw = Math.ceil(probe.measureText(text).width) + pad * 2, th = fs + pad * 2;   /* 文字の幅を測ってから canvas を作る */
    const cv = document.createElement('canvas'); cv.width = tw * sc; cv.height = th * sc;
    const c = cv.getContext('2d'); c.scale(sc, sc);
    c.font = probe.font; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineWidth = 5; c.strokeStyle = 'rgba(6,10,18,0.85)'; c.strokeText(text, tw / 2, th / 2);
    c.fillStyle = '#eaf2ff'; c.fillText(text, tw / 2, th / 2);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    e = _dsLab[text] = { tex, ar: th / tw };
  }
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: e.tex, transparent: true, depthWrite: false, depthTest: false, toneMapped: false }));
  sp.scale.set(w, w * e.ar, 1); sp.renderOrder = 7; dsysMark(sp); return sp;
}
// 折れ線を1本つくる（three.js の線は太さが効かないので、太く見せたいものだけ筒にする）
function dsysLine(pts, mat) {
  const g = new THREE.BufferGeometry().setFromPoints(pts.map(p => new THREE.Vector3(p[0], p[1], p[2])));
  return dsysMark(new THREE.Line(g, mat || dsys.mats.line));
}
function dsysTube(pts, r, mat) {
  const c = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], p[1], p[2])));
  return dsysMark(new THREE.Mesh(new THREE.TubeGeometry(c, Math.min(64, pts.length * 2), r, 6, false), mat || dsys.mats.solid));
}
// シェーダと同じ式で、i番の機体が u の時点にいる場所を出す（経路を描くために使う）
function dsysAt(i, u, out) {
  const from = dshow.to, to = (dshow.nextFig >= 0 ? dshow.nextTo : dshow.from);   /* 静止中は「つぎに行く先」を見せる */
  const lag = dshow.nextFig >= 0 ? dshow.nextLag[i] : dshow.lag[i];
  const t = clamp((u - lag) / Math.max(0.10, 1 - lag), 0, 1), e = t * t * (3 - 2 * t);
  const dx = to[i * 3] - from[i * 3], dy = to[i * 3 + 1] - from[i * 3 + 1], dz = to[i * 3 + 2] - from[i * 3 + 2];
  const L = Math.hypot(dx, dy, dz);
  let ax = 0, ay = 0;
  if (L > 1e-4) { ax = -dy / L; ay = dx / L; const n = Math.hypot(ax, ay) || 1; ax /= n; ay /= n; }   /* 進行方向と z 軸の外積 */
  const bow = Math.sin(Math.PI * e) * 0.15 * L * dshow.rnd[i];
  out[0] = from[i * 3] + dx * e + ax * bow;
  out[1] = from[i * 3 + 1] + dy * e + ay * bow;
  out[2] = from[i * 3 + 2] + dz * e;
  return out;
}

// ---------- それぞれのレイヤー ----------
function dsysPath() {   // ①経路: つぎの図形へ向かう経路。太い1本＝1機ぶんの予定
  const n = dshow.n, N = 15, S = 24, p = [0, 0, 0];
  for (let m = 0; m < N; m++) {
    const i = Math.floor((m + 0.5) * n / N);
    const pts = []; for (let s2 = 0; s2 <= S; s2++) pts.push(dsysAt(i, s2 / S, p).slice());
    dsys.air.add(dsysTube(pts, m === 0 ? 0.026 : 0.014, m === 0 ? dsys.mats.solid : dsys.mats.thin));
    // 出発点は小さく、行き先は大きく。どちらへ向かう線なのかが一目で分かる
    for (const [u, r] of [[0, 0.018], [1, 0.034]]) {
      const c = dsysAt(i, u, p), sp = dsysMark(new THREE.Mesh(new THREE.SphereGeometry(r * (m === 0 ? 1.5 : 1), 10, 6), dsys.mats.solid));
      sp.position.set(c[0], c[1], c[2]); dsys.air.add(sp);
    }
  }
}
function dsysPair() {   // ③間隔: 隣り合う機体の「間」を見せる
  // 輪郭の図形（星・ハート・輪）は等間隔に並べるので、機数を増やすほど間隔は 0.5〜1.1px まで縮む。
  // 2機を球で示す方式では物理的に見えないので、「一区画だけ明るく残す」方式にする
  const n = dshow.n, to = dshow.to;
  // 画面のいちばん手前に近い機体を1つ選び、その近傍だけ残す
  let a = 0, bz = -1e9;
  for (let i = 0; i < n; i++) if (to[i * 3 + 2] > bz) { bz = to[i * 3 + 2]; a = i; }
  const near = [], ax = to[a * 3], ay = to[a * 3 + 1], az = to[a * 3 + 2];
  for (let i = 0; i < n; i++) { const d2 = (to[i*3]-ax)**2 + (to[i*3+1]-ay)**2 + (to[i*3+2]-az)**2; near.push([d2, i]); }
  near.sort((x, y) => x[0] - y[0]);
  const keep = new Set(); for (let i = 0; i < Math.min(36, near.length); i++) keep.add(near[i][1]);
  if (!dsys.brightSave) dsys.brightSave = dshow.bright.slice();
  for (let i = 0; i < n; i++) dshow.bright[i] = keep.has(i) ? 2.10 : 0.11;
  dshow.geo.attributes.bright.needsUpdate = true;
  // いちばん近い相手までの距離を、実寸の線で出す
  const b = near[1] ? near[1][1] : a;
  const p = [to[a*3], to[a*3+1], to[a*3+2]], q = [to[b*3], to[b*3+1], to[b*3+2]];
  dsys.air.add(dsysTube([p, q], 0.010, dsys.mats.solid));
  { const mid = [(p[0]+q[0])/2, (p[1]+q[1])/2, (p[2]+q[2])/2];
    const tip = [mid[0] - DSHOW_R * 0.52, mid[1] + DSHOW_R * 0.30, mid[2]];
    dsys.air.add(dsysTube([mid, tip], 0.005));
    // 箱庭の縮尺で実寸に直す。この教材の隊列は実際のショーを縮めたものなので、
    // 「機体の飛行間隔1.5mを、この隊列の広がりに当てはめるとどれくらいか」を出す
    const d = Math.hypot(p[0]-q[0], p[1]-q[1], p[2]-q[2]);
    const lab = dsysLabel(`となりまで ${d.toFixed(2)} m`, DSHOW_R * 0.80);
    lab.position.set(tip[0] - DSHOW_R * 0.28, tip[1] + DSHOW_R * 0.07, tip[2]); dsys.air.add(lab); }
  for (const c of [p, q]) { const m = dsysMark(new THREE.Mesh(new THREE.SphereGeometry(0.030, 12, 8), dsys.mats.solid)); m.position.set(c[0], c[1], c[2]); dsys.air.add(m); }
}
function dsysPairOff() { if (dsys.brightSave) { dshow.bright.set(dsys.brightSave); dshow.geo.attributes.bright.needsUpdate = true; dsys.brightSave = null; } }
function dsysFence() {   // ⑥囲い: 内側（越えたら帰る）と外側（越えたら止める）
  // dsys.air は dshow.pts の子。面を張るとカメラと隊列の間に色の膜ができて主役が消えるので、線だけで描く
  const k = dshow.k || 1, gz = dshow.gz || 0;
  const y0 = -DSHOW_H * (1 - k) * (1 - gz) / k, y1 = DSHOW_H + DSHOW_R * 1.16;
  for (const [r, lm, nv] of [[DSHOW_R * 1.10, dsys.mats.line, 8], [DSHOW_R * 1.55, dsys.mats.warnLine, 16]]) {
    for (const y of [y0, y1]) { const pts = []; for (let s2 = 0; s2 <= 64; s2++) { const a = s2 / 64 * Math.PI * 2; pts.push([Math.cos(a) * r, y, Math.sin(a) * r]); } dsys.air.add(dsysLine(pts, lm)); }
    for (let s2 = 0; s2 < nv; s2++) { const a = s2 / nv * Math.PI * 2; dsys.air.add(dsysLine([[Math.cos(a) * r, y0, Math.sin(a) * r], [Math.cos(a) * r, y1, Math.sin(a) * r]], lm)); }
    const inner = lm === dsys.mats.line;
    if (inner) {   // 枠に向かって出ていく1機。触れたら帰ってくる
      const sp = new THREE.Sprite(M.glowCore('#ffd2a8')); sp.scale.setScalar(0.16); sp.renderOrder = 7; dsysMark(sp);
      dsys.air.add(sp); dsys.esc = { sp, r0: DSHOW_R * 0.55, r1: r, y: DSHOW_H };
    }
    const lab = dsysLabel(inner ? '内側: 越えたら帰る・降りる' : '外側: 越えたらモーターを切る', DSHOW_R * 1.30);
    lab.position.set(0, y1 - DSHOW_R * (inner ? 0.26 : 0.62), r * 0.62); dsys.air.add(lab);   /* 手前側に寄せる。上に出すと画面の外へ出る */
  }
}
function dsysGrid(withBoxes) {   // ⑦離陸前の格子（②⑤の足場にもなる）
  const k = dshow.k || 1, n = Math.min(dshow.n, 216);
  const cols = Math.ceil(Math.sqrt(n * 1.6)), rows = Math.ceil(n / cols), sp = 0.075;   /* 0.5m格子を箱庭の縮尺に合わせる */
  const g = new THREE.SphereGeometry(sp * 0.19, 8, 6);
  const im = new THREE.InstancedMesh(g, dsys.mats.lit, n); im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const m = new THREE.Matrix4();
  for (let i = 0; i < n; i++) { const c = i % cols, r = (i / cols) | 0;
    m.makeTranslation((c - (cols - 1) / 2) * sp, 0.014, (r - (rows - 1) / 2) * sp + 0.30); im.setMatrixAt(i, m); }
  im.instanceMatrix.needsUpdate = true; dsysMark(im); dsys.world.add(im);
  { const w = cols * sp * 0.62, h = rows * sp * 0.72;   /* 離陸場所を示す淡い床 */
    const pad = dsysMark(new THREE.Mesh(new THREE.PlaneGeometry(w * 2, h * 2), dsys.mats.glass));
    pad.rotation.x = -Math.PI / 2; pad.position.set(0, 0.004, 0.30); dsys.world.add(pad);
    const pts = []; for (const [x, z] of [[-w, -h], [w, -h], [w, h], [-w, h], [-w, -h]]) pts.push([x, 0.006, z + 0.30]);
    dsys.world.add(dsysLine(pts, dsys.mats.line)); }
  if (withBoxes) { const bg = new THREE.BoxGeometry(sp * 2.0, 0.055, sp * rows * 0.8);
    for (const x of [-1, 1]) { const b = dsysMark(new THREE.Mesh(bg, dsys.mats.body)); b.position.set(x * cols * sp * 0.42, 0.028, 0.30); dsys.world.add(b); } }
  dsys.world.scale.setScalar(k);
}
function dsysStation(kind) {   // ②基準局 / ⑤地上局。夜なので自分で光っていないと見えない
  const k = dshow.k || 1, sc = 1.7;
  const grp = new THREE.Group(); dsysMark(grp);
  const px = kind === 'rtk' ? -1.30 : 1.30, pz = 1.00;
  grp.position.set(px, 0, pz); grp.scale.setScalar(sc);
  for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2 + 0.4;   /* 三脚 */
    const leg = dsysMark(new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.36, 6), dsys.mats.body));
    leg.position.set(Math.cos(a) * 0.075, 0.17, Math.sin(a) * 0.075); leg.rotation.set(Math.cos(a) * 0.36, 0, -Math.sin(a) * 0.36); grp.add(leg); }
  const head = dsysMark(new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.060, 0.055, 20), dsys.mats.body)); head.position.y = 0.37; grp.add(head);
  if (kind === 'rtk') {
    const dome = dsysMark(new THREE.Mesh(new THREE.SphereGeometry(0.062, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), dsys.mats.lit)); dome.position.y = 0.395; grp.add(dome);
    const core = new THREE.Sprite(M.glowCore('#c8d6e4')); core.scale.setScalar(0.22); core.position.y = 0.40; core.renderOrder = 6; grp.add(core);
    for (let i = 0; i < 3; i++) {   /* 補正を配っている様子。広がる輪 */
      const r = 0.42 + i * 0.34, pts = []; for (let s2 = 0; s2 <= 48; s2++) { const a = s2 / 48 * Math.PI * 2; pts.push([Math.cos(a) * r, 0.40 + i * 0.02, Math.sin(a) * r]); }
      grp.add(dsysLine(pts, dsys.mats.faint)); }
  } else {
    const scr = dsysMark(new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.17, 0.014), dsys.mats.dark)); scr.position.set(0, 0.47, 0); scr.rotation.x = -0.32; grp.add(scr);
    const lit = dsysMark(new THREE.Mesh(new THREE.PlaneGeometry(0.23, 0.14), dsys.mats.lit)); lit.position.set(0, 0.472, 0.010); lit.rotation.x = -0.32; grp.add(lit);
    const core = new THREE.Sprite(M.glowCore('#c8d6e4')); core.scale.setScalar(0.34); core.position.set(0, 0.47, 0.02); core.renderOrder = 6; grp.add(core);
  }
  dsys.world.add(grp);
  dsys.world.scale.setScalar(k);
  dsys.tmp.push({ kind, grp, px, pz });
}
function dsysLinks() {   // ⑤電波: 地上局から機体へ。多いと線だらけになるので少しだけ
  const n = dshow.n, N = 16, st = new THREE.Vector3(1.35 * (dshow.k || 1), 0.44 * (dshow.k || 1), 1.05 * (dshow.k || 1));
  const k = dshow.k || 1;
  for (let m = 0; m < N; m++) {
    const i = Math.floor((m + 0.5) * n / N);
    const p = new THREE.Vector3(dshow.to[i * 3] * k, dshow.to[i * 3 + 1] * k + DSHOW_H * (1 - k) * (1 - (dshow.gz || 0)), dshow.to[i * 3 + 2] * k);
    dsys.tmp.push({ link: true, a: st.clone(), b: p });
  }
  const geo = new THREE.BufferGeometry();
  const arr = new Float32Array(N * 6);
  let j = 0; for (const t of dsys.tmp) if (t.link) { arr[j++] = t.a.x; arr[j++] = t.a.y; arr[j++] = t.a.z; arr[j++] = t.b.x; arr[j++] = t.b.y; arr[j++] = t.b.z; }
  geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  const ls = dsysMark(new THREE.LineSegments(geo, dsys.mats.faint)); scene.add(ls); dsys.tmp.push({ owned: ls });
  // 線の上を小さな玉が上がる。地上局から機体へ「状態を見に行っている」ことが動きで分かる
  const beads = [];
  for (const t of dsys.tmp) if (t.link) {
    const b = new THREE.Sprite(M.glowCore('#c8d6e4')); b.scale.setScalar(0.085); b.renderOrder = 7; dsysMark(b);
    scene.add(b); beads.push({ sp: b, a: t.a, b: t.b, ph: Math.random() });
    dsys.tmp.push({ owned: b });
  }
  dsys.beads = beads;
}

// ---------- 出し入れ ----------
const DSYS_GROUND = ['rtk', 'link', 'grid', 'fence'];   // 地面のものが主役のレイヤー。ショー全体を縮めて地面から入れる
// 描き進みの対象にする（InstancedMesh と Sprite は除く）
function dsysArm(g) {
  for (const o of g.children) {
    if (o.isInstancedMesh || o.isSprite) continue;
    if (o.children.length) { dsysArm(o); continue; }
    const geo = o.geometry; if (!geo) continue;
    o.userData.full = geo.index ? geo.index.count : (geo.attributes.position ? geo.attributes.position.count : 0);
    if (o.userData.full) geo.setDrawRange(0, reduceMotion ? o.userData.full : 0);
  }
}
function dsysDrawOn(g, e) {
  for (const o of g.children) {
    if (o.children.length && !o.userData.full) { dsysDrawOn(o, e); continue; }
    if (!o.userData.full) continue;
    o.geometry.setDrawRange(0, Math.max(2, (o.userData.full * e) | 0));
  }
}
function dshowLayer(id) {
  if (!dshow.pts) return;
  dsysBuild();
  // 前のレイヤーの後始末（scene に直接足したものも消す）
  for (const t of dsys.tmp) if (t.owned) { scene.remove(t.owned); if (t.owned.geometry) t.owned.geometry.dispose(); }
  dsys.beads = null; dsys.esc = null;
  dsysClear();
  dsys.cur = id || null; dsys.t = 0;
  { const want = DSYS_GROUND.includes(dsys.cur) ? 1 : 0;
    if (want !== dshow.gzWant) { dshow.gzWant = want; dshowFrame(700); } }
  if (dshow.mat) { dshow.mat.uniforms.uSkew.value = 0; dshow.mat.uniforms.uSkewFrac.value = 0.03; }
  dsysPairOff();
  if (!dsys.cur) { dsys.world.visible = dsys.air.visible = false; return; }
  dsys.world.scale.setScalar(dshow.k || 1);
  if (id === 'path') { dsysPath(); dsysGrid(true); }
  else if (id === 'rtk') { dsysStation('rtk'); dsysGrid(false); }
  else if (id === 'pair') { dsysPair(); }
  else if (id === 'sync') { if (dshow.mat) { dshow.mat.uniforms.uSkew.value = 0.34; dshow.mat.uniforms.uSkewFrac.value = 0.03; } }   /* はじめは3%だけ遅らせる。だんだん増やして崩れるまでを見せる */
  else if (id === 'link') { dsysStation('gcs'); dsysLinks(); }
  else if (id === 'fence') { dsysFence(); }
  else if (id === 'grid') { dsysGrid(true); }
  dsysArm(dsys.air); dsysArm(dsys.world);
  dsys.world.visible = dsys.world.children.length > 0;
  dsys.air.visible = dsys.air.children.length > 0;
  S.shadowDirty = S.csDirty = S.aoDirty = true;
}
// 画の大きさが変わったら地面のものも合わせる。図形が変わったら経路は引き直す
function dsysLayout() { if (dsys.world) dsys.world.scale.setScalar(dshow.k || 1); }
function dsysRefresh() { if (dsys.cur && ['path', 'pair', 'link', 'fence'].includes(dsys.cur)) dshowLayer(dsys.cur); }
function stepDsys(dtReal) {
  if (!dsys.cur || !dsys.built) return;
  const was = dsys.t; dsys.t += dtReal;
  if (was < 0.62) { const t = clamp(dsys.t / 0.55, 0, 1), e = t * t * (3 - 2 * t);   /* 端から描き進む */
    dsysDrawOn(dsys.air, e); dsysDrawOn(dsys.world, e); }
  // 電波と補正は「流れているもの」なので、明るさを脈打たせる（動きを減らす設定では止める）
  const w = reduceMotion ? 0.5 : 0.5 + 0.5 * Math.sin(dsys.t * 3.2);
  if (dsys.cur === 'link' || dsys.cur === 'rtk') dsys.mats.faint.opacity = 0.20 + 0.30 * w;
  else dsys.mats.faint.opacity = 0.42;
  // ④は「1機だけ遅れる」から「形が崩れる」までを、8秒かけて見せる
  // ⑤の玉は線の上を上がり、⑥の1機は枠へ出て帰る
  if (dsys.beads) { const T = reduceMotion ? 0.5 : dsys.t;
    for (const b of dsys.beads) { const u = ((T * 0.42 + b.ph) % 1);
      b.sp.position.lerpVectors(b.a, b.b, u); b.sp.material.opacity = 0.95 * Math.sin(Math.PI * u); } }
  if (dsys.esc) { const T = reduceMotion ? 0.5 : (dsys.t % 6) / 6;
    const u = T < 0.45 ? T / 0.45 : T < 0.6 ? 1 : 1 - (T - 0.6) / 0.4;   /* 出る → 枠に触れて止まる → 帰る */
    const e = u * u * (3 - 2 * u), r = dsys.esc.r0 + (dsys.esc.r1 - dsys.esc.r0) * e, a = 0.9;
    dsys.esc.sp.position.set(Math.cos(a) * r, dsys.esc.y, Math.sin(a) * r);
    dsys.esc.sp.material.opacity = 0.5 + 0.5 * (T > 0.45 && T < 0.6 ? 1 : 0.6); }
  if (dsys.cur === 'sync' && dshow.mat) dshow.mat.uniforms.uSkewFrac.value = reduceMotion ? 0.25 : clamp(0.03 + dsys.t / 9, 0.03, 0.55);
}

window.__dsys = { dsys, dshowLayer, dsysLayout, dsysRefresh };
