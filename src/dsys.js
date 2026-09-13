// ===== ショーのしくみを3Dで見せる =====
// 夜空の見世物を壊さずに重ねる。線は細く、色は1つだけ、出すのは常に1つだけ。
// 置き場所は2つに分ける:
//   dsys.world … 地面のもの（基準局・地上局・離陸前の格子）。倍率 k を自分で掛ける
//   dsys.air   … 隊列の中のもの（経路・間隔・囲い）。dshow.pts の子にすると隊列と一緒に伸縮する
const dsys = { world: null, air: null, cur: null, t: 0, mats: null, built: false, tmp: [] };
const DSYS_C = 0x7fd4ff;   // しくみの色。演出の色（暖色・寒色いろいろ）と喧嘩しない一色に固定する

function dsysBuild() {
  if (dsys.built) return;
  dsys.built = true;
  dsys.world = new THREE.Group(); dsys.world.visible = false; scene.add(dsys.world);
  dsys.air = new THREE.Group(); dsys.air.visible = false; dshow.pts.add(dsys.air);
  for (const g of [dsys.world, dsys.air]) { g.userData.noPart = g.userData.noPick = g.userData.noShadow = g.userData.noAO = true; g.renderOrder = 5; }
  dsys.mats = {
    line: new THREE.LineBasicMaterial({ color: DSYS_C, transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false }),
    faint: new THREE.LineBasicMaterial({ color: DSYS_C, transparent: true, opacity: 0.30, depthWrite: false, toneMapped: false }),
    thin: new THREE.MeshBasicMaterial({ color: DSYS_C, transparent: true, opacity: 0.50, depthWrite: false, toneMapped: false }),
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
function dsysPair() {   // ③間隔: 隣り合う2機の経路と、その間の距離
  const n = dshow.n, p = [0, 0, 0], q = [0, 0, 0];
  // 行き先がいちばん近い2機を探す（＝いちばん詰まるところ）
  let a = 0, b = 1, best = 1e9;
  for (let i = 0; i < n; i += Math.max(1, (n / 400) | 0)) for (let j = i + 1; j < Math.min(n, i + 24); j++) {
    const d = Math.hypot(dshow.to[i * 3] - dshow.to[j * 3], dshow.to[i * 3 + 1] - dshow.to[j * 3 + 1], dshow.to[i * 3 + 2] - dshow.to[j * 3 + 2]);
    if (d > 1e-4 && d < best) { best = d; a = i; b = j; }
  }
  for (const i of [a, b]) { const pts = []; for (let s = 0; s <= 20; s++) pts.push(dsysAt(i, s / 20, p).slice()); dsys.air.add(dsysTube(pts, 0.008)); }
  dsysAt(a, 0, p); dsysAt(b, 0, q);
  dsys.air.add(dsysTube([p.slice(), q.slice()], 0.006, dsys.mats.solid));
  { const r = best / 2, g = new THREE.SphereGeometry(r, 16, 10);
    for (const c of [p, q]) { const m = dsysMark(new THREE.Mesh(g, dsys.mats.glass)); m.position.set(c[0], c[1], c[2]); dsys.air.add(m); } }
}
function dsysFence() {   // ⑥囲い: 内側（越えたら帰る）と外側（越えたら止める）
  // dsys.air は dshow.pts の子。面を張るとカメラと隊列の間に色の膜ができて主役が消えるので、線だけで描く
  const k = dshow.k || 1, gz = dshow.gz || 0;
  const y0 = -DSHOW_H * (1 - k) * (1 - gz) / k, y1 = DSHOW_H + DSHOW_R * 1.16;
  for (const [r, lm, nv] of [[DSHOW_R * 1.14, dsys.mats.line, 14], [DSHOW_R * 1.40, dsys.mats.warnLine, 14]]) {
    for (const y of [y0, (y0 + y1) / 2, y1]) { const pts = []; for (let s2 = 0; s2 <= 64; s2++) { const a = s2 / 64 * Math.PI * 2; pts.push([Math.cos(a) * r, y, Math.sin(a) * r]); } dsys.air.add(dsysLine(pts, lm)); }
    for (let s2 = 0; s2 < nv; s2++) { const a = s2 / nv * Math.PI * 2; dsys.air.add(dsysLine([[Math.cos(a) * r, y0, Math.sin(a) * r], [Math.cos(a) * r, y1, Math.sin(a) * r]], lm)); }
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
    const core = new THREE.Sprite(M.glowCore('#7fd4ff')); core.scale.setScalar(0.22); core.position.y = 0.40; core.renderOrder = 6; grp.add(core);
    for (let i = 0; i < 3; i++) {   /* 補正を配っている様子。広がる輪 */
      const r = 0.42 + i * 0.34, pts = []; for (let s2 = 0; s2 <= 48; s2++) { const a = s2 / 48 * Math.PI * 2; pts.push([Math.cos(a) * r, 0.40 + i * 0.02, Math.sin(a) * r]); }
      grp.add(dsysLine(pts, dsys.mats.faint)); }
  } else {
    const scr = dsysMark(new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.17, 0.014), dsys.mats.dark)); scr.position.set(0, 0.47, 0); scr.rotation.x = -0.32; grp.add(scr);
    const lit = dsysMark(new THREE.Mesh(new THREE.PlaneGeometry(0.23, 0.14), dsys.mats.lit)); lit.position.set(0, 0.472, 0.010); lit.rotation.x = -0.32; grp.add(lit);
    const core = new THREE.Sprite(M.glowCore('#7fd4ff')); core.scale.setScalar(0.34); core.position.set(0, 0.47, 0.02); core.renderOrder = 6; grp.add(core);
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
}

// ---------- 出し入れ ----------
const DSYS_GROUND = ['rtk', 'link', 'grid', 'fence'];   // 地面のものが主役のレイヤー。ショー全体を縮めて地面から入れる
function dshowLayer(id) {
  if (!dshow.pts) return;
  dsysBuild();
  // 前のレイヤーの後始末（scene に直接足したものも消す）
  for (const t of dsys.tmp) if (t.owned) { scene.remove(t.owned); t.owned.geometry.dispose(); }
  dsysClear();
  dsys.cur = id || null; dsys.t = 0;
  { const want = DSYS_GROUND.includes(dsys.cur) ? 1 : 0;
    if (want !== dshow.gzWant) { dshow.gzWant = want; dshowFrame(700); } }
  if (dshow.mat) dshow.mat.uniforms.uSkew.value = 0;
  if (!dsys.cur) { dsys.world.visible = dsys.air.visible = false; return; }
  dsys.world.scale.setScalar(dshow.k || 1);
  if (id === 'path') { dsysPath(); dsysGrid(true); }
  else if (id === 'rtk') { dsysStation('rtk'); dsysGrid(false); }
  else if (id === 'pair') { dsysPair(); }
  else if (id === 'sync') { if (dshow.mat) dshow.mat.uniforms.uSkew.value = 0.30; }   /* わざと時計をずらす。形が崩れるのを見せる */
  else if (id === 'link') { dsysStation('gcs'); dsysLinks(); }
  else if (id === 'fence') { dsysFence(); }
  else if (id === 'grid') { dsysGrid(true); }
  dsys.world.visible = dsys.world.children.length > 0;
  dsys.air.visible = dsys.air.children.length > 0;
  S.shadowDirty = S.csDirty = S.aoDirty = true;
}
// 画の大きさが変わったら地面のものも合わせる。図形が変わったら経路は引き直す
function dsysLayout() { if (dsys.world) dsys.world.scale.setScalar(dshow.k || 1); }
function dsysRefresh() { if (dsys.cur && ['path', 'pair', 'link', 'fence'].includes(dsys.cur)) dshowLayer(dsys.cur); }
function stepDsys(dtReal) {
  if (!dsys.cur || !dsys.built) return;
  dsys.t += dtReal;
  // 電波と補正は「流れているもの」なので、明るさを脈打たせる（動きを減らす設定では止める）
  const w = reduceMotion ? 0.5 : 0.5 + 0.5 * Math.sin(dsys.t * 3.2);
  if (dsys.cur === 'link' || dsys.cur === 'rtk') dsys.mats.faint.opacity = 0.12 + 0.22 * w;
  else dsys.mats.faint.opacity = 0.22;
}

window.__dsys = { dsys, dshowLayer, dsysLayout, dsysRefresh };
