// ===== ことばを形にする =====
// 入力された言葉を (1) 作り込んだ形 (2) 端末の絵文字 (3) 読み込んだ画像 のどれかから
// 「色のついた点の集まり」に変える。three.js には触れない（検証用のラボページ tools/shapelab.html でも
// 同じコードを使うため）。
//
// 点の置き方: まず下絵を「どの画素がどの部品か」の地図にする。部品の境目（外周だけでなく、目や模様の縁も）に
// 沿って等間隔に並べ、残りを六方格子で埋める。格子だけだと縁がぼろぼろになり、小さな部品は1点も当たらずに消える。
// 実際のショーも、輪郭を機体の列でなぞり、面はまばらに埋めている。
//
// 形の定義（src/shapes/*.json）の書き方は docs/design/shape-authoring.md にまとめてある。
const DSHAPE_SIZE = 384;                 // 点を拾うための下絵の大きさ(px)
const DSHAPE_EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Twemoji Mozilla",sans-serif';
const DSHAPE_MERGE = 0.055;               // 絵文字・画像で、この差より近い色は同じ部品とみなす（陰影の縞を縁取らないため）
const DSHAPE_GEN = {};                   // 手続きで作る形（龍など）。name → (n, env, def) => shape
const _dshapeDefs = new Map(), _dshapeKeys = new Map();
let _dshapeWords = null;

// 絵文字や画像には部品の区別がないので、形全体にかける動きを名前で選ぶ（長さは「形の半分の大きさ＝1」）
const DSHAPE_MOTION = {
  swim:    [{ type: 'swim', amp: 0.075, hz: 0.75, k: 1.0 }, { type: 'bob', amp: 0.020, hz: 0.37 }],
  swimR:   [{ type: 'swim', amp: 0.075, hz: 0.75, k: 1.0, head: 'right' }, { type: 'bob', amp: 0.020, hz: 0.37 }],
  flap:    [{ type: 'flap', amp: 0.62, hz: 1.05, lift: 0.10 }, { type: 'bob', amp: 0.030, hz: 0.52 }],
  beat:    [{ type: 'pulse', amp: 0.085, hz: 0.95, beat: true }],
  breathe: [{ type: 'pulse', amp: 0.030, hz: 0.30 }],
  float:   [{ type: 'bob', amp: 0.040, hz: 0.33, ax: 0.022 }],
  sway:    [{ type: 'sway', amp: 0.065, hz: 0.33 }],
  hop:     [{ type: 'hop', amp: 0.10, hz: 1.15 }],
  spin:    [{ type: 'spin', hz: 0.075 }],
  rock:    [{ type: 'swing', amp: 0.10, hz: 0.42 }],
  wave:    [{ type: 'wave', amp: 0.060, hz: 0.65, k: 1.2, anchor: 'left' }],
  ripple:  [{ type: 'wave', amp: 0.035, hz: 0.55, k: 1.6, anchor: 'none' }],
  fly:     [{ type: 'bob', amp: 0.034, hz: 0.48, ax: 0.030 }, { type: 'swing', amp: 0.045, hz: 0.48, phase: 0.25 }],
  drive:   [{ type: 'bob', amp: 0.010, hz: 2.1 }, { type: 'shift', ax: 0.030, hz: 0.22 }],
  launch:  [{ type: 'bob', amp: 0.030, hz: 0.55 }, { type: 'shift', ax: 0.006, hz: 3.1 }],
  twinkle: [{ type: 'twinkle', hz: 0.85, depth: 0.62 }, { type: 'pulse', amp: 0.025, hz: 0.45 }],
  flicker: [{ type: 'twinkle', hz: 1.6, depth: 0.45 }, { type: 'sway', amp: 0.045, hz: 0.9 }],
  chase:   [{ type: 'chase', hz: 0.45, k: 2, depth: 0.55 }],
  none:    [],
};

// ---------- 言葉の正規化と解決 ----------
// かな・カナ・全角半角・大文字小文字・記号の違いを吸収する（「ドラゴン！」「どらごん」「DRAGON」を同じに扱う）
function dshapeNorm(s) {
  s = (s || '').normalize('NFKC').toLowerCase();
  s = s.replace(/[\u30a1-\u30f6]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60));   // カタカナ → ひらがな
  return s.replace(/[\s\u3000!?。、,.・~〜♪☆★\-‐―'"「」『』()]/g, '').replace(/[\ufe0e\ufe0f]/g, '');
}
function dshapeRegister(def) {
  if (!def || !def.id) return;
  _dshapeDefs.set(def.id, def);
  for (const k of [def.id, def.name].concat(def.keys || [])) { const nk = dshapeNorm(k); if (nk && !_dshapeKeys.has(nk)) _dshapeKeys.set(nk, def.id); }
}
function dshapeList() { return [..._dshapeDefs.values()]; }
function dshapeGet(id) { return _dshapeDefs.get(id) || null; }
// 絵文字1つだけの入力かどうか（国旗や肌色つきなど、複数の符号でできた1文字も1つと数える）
function dshapeSingleEmoji(t) {
  t = (t || '').trim(); if (!t) return null;
  let g = [t];
  try { if (typeof Intl !== 'undefined' && Intl.Segmenter) g = [...new Intl.Segmenter('ja', { granularity: 'grapheme' }).segment(t)].map(x => x.segment); } catch (e) {}
  if (g.length !== 1) return null;
  try { return /\p{Extended_Pictographic}/u.test(t) ? t : null; } catch (e) { return null; }
}
// 言葉の表（src/shapes/words.tsv）: 「絵文字 <TAB> 動き <TAB> 言葉,言葉,…」
function _dshapeWordMap() {
  if (_dshapeWords) return _dshapeWords;
  _dshapeWords = new Map();
  if (typeof DSHAPE_WORDS === 'string') for (const row of DSHAPE_WORDS.split('\n')) {
    const c = row.split('\t'); if (c.length < 3 || row[0] === '#') continue;
    const ch = c[0].trim(), motion = c[1].trim(); if (!ch) continue;
    for (const w of [ch].concat(c[2].split(','))) { const nk = dshapeNorm(w); if (nk && !_dshapeWords.has(nk)) _dshapeWords.set(nk, { ch, motion }); }
  }
  return _dshapeWords;
}
// 言葉 → 形。見つからなければ null（そのときは文字で描く）。作り込んだ形 → 言葉の表 → 絵文字そのもの、の順
function dshapeResolve(text) {
  const nk = dshapeNorm(text); if (!nk) return null;
  const id = _dshapeKeys.get(nk); if (id) return { kind: 'lib', def: _dshapeDefs.get(id), key: 'lib:' + id };
  const w = _dshapeWordMap().get(nk);
  if (w) { const id2 = _dshapeKeys.get(dshapeNorm(w.ch)); if (id2) return { kind: 'lib', def: _dshapeDefs.get(id2), key: 'lib:' + id2 };
    return { kind: 'emoji', ch: w.ch, motion: w.motion, key: 'emoji:' + w.ch }; }
  const one = dshapeSingleEmoji(text); if (one) return { kind: 'emoji', ch: one, motion: 'float', key: 'emoji:' + one };
  return null;
}

// ---------- 色 ----------
function _dsHex(h) { h = (h || '#ffffff').replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; const v = parseInt(h, 16) || 0; return [(v >> 16 & 255) / 255, (v >> 8 & 255) / 255, (v & 255) / 255]; }
// 機体は光るだけで、黒は出せない。暗い色は「弱く灯した青みの灰」に持ち上げて、面が欠けて見えないようにする
function dshapeNight(r, g, b, o, i) {
  const mx = Math.max(r, g, b), FLOOR = 0.24;
  if (mx < FLOOR) { const t = 1 - mx / FLOOR; r = r + (FLOOR * 0.66 - r) * t; g = g + (FLOOR * 0.76 - g) * t; b = b + (FLOOR - b) * t; }
  o[i] = r; o[i + 1] = g; o[i + 2] = b;
}

// ---------- 下絵 ----------
let _dsCan = null;
function _dshapeCtx(size) {
  if (!_dsCan) _dsCan = document.createElement('canvas');
  if (_dsCan.width !== size || _dsCan.height !== size) { _dsCan.width = size; _dsCan.height = size; }
  const c = _dsCan.getContext('2d', { willReadFrequently: true }); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, size, size);
  return c;
}
// 制御点を通るなめらかな曲線（Catmull-Rom）を、長さで等間隔の M+1 点にする
function _dsCurve(pts, M) {
  const n = pts.length, fine = [], at = (i) => pts[Math.max(0, Math.min(n - 1, i))];
  for (let i = 0; i < n - 1; i++) { const a = at(i - 1), b = at(i), c = at(i + 1), d = at(i + 2);
    for (let q = 0; q < 14; q++) { const t = q / 14, t2 = t * t, t3 = t2 * t;
      fine.push(0.5 * (2 * b[0] + (c[0] - a[0]) * t + (2 * a[0] - 5 * b[0] + 4 * c[0] - d[0]) * t2 + (3 * b[0] - a[0] - 3 * c[0] + d[0]) * t3),
                0.5 * (2 * b[1] + (c[1] - a[1]) * t + (2 * a[1] - 5 * b[1] + 4 * c[1] - d[1]) * t2 + (3 * b[1] - a[1] - 3 * c[1] + d[1]) * t3)); } }
  fine.push(at(n - 1)[0], at(n - 1)[1]);
  const m = fine.length / 2, acc = new Float32Array(m); for (let i = 1; i < m; i++) acc[i] = acc[i - 1] + Math.hypot(fine[i * 2] - fine[i * 2 - 2], fine[i * 2 + 1] - fine[i * 2 - 1]);
  const L = acc[m - 1] || 1, x = new Float32Array(M + 1), y = new Float32Array(M + 1); let j = 0;
  for (let q = 0; q <= M; q++) { const sd = q / M * L; while (j < m - 2 && acc[j + 1] < sd) j++; const t = (sd - acc[j]) / Math.max(1e-6, acc[j + 1] - acc[j]);
    x[q] = fine[j * 2] + (fine[j * 2 + 2] - fine[j * 2]) * t; y[q] = fine[j * 2 + 1] + (fine[j * 2 + 3] - fine[j * 2 + 1]) * t; }
  return { x, y, len: L, M };
}
// 曲線の各点の向き（接線）。法線は (-ty, tx)＝進む向きに対して右手側（下絵は y が下向きなので、左→右へ進む線なら下側）
function _dsTangents(cv) { const M = cv.M, tx = new Float32Array(M + 1), ty = new Float32Array(M + 1);
  for (let q = 0; q <= M; q++) { const a = Math.max(0, q - 1), b = Math.min(M, q + 1), dx = cv.x[b] - cv.x[a], dy = cv.y[b] - cv.y[a], l = Math.hypot(dx, dy) || 1; tx[q] = dx / l; ty[q] = dy / l; } return { tx, ty }; }
// 配列で与えた値を、線の上の位置 s(0〜1) でなめらかに読む
function _dsProfile(v, s) { if (typeof v === 'number') return v; if (!v || !v.length) return 0; if (v.length === 1) return v[0];
  const f = Math.max(0, Math.min(1, s)) * (v.length - 1), i = Math.min(v.length - 2, Math.floor(f)), t = f - i, u = t * t * (3 - 2 * t); return v[i] + (v[i + 1] - v[i]) * u; }
function _dsPathOf(p) {
  if (p.d) return new Path2D(p.d);
  const P = new Path2D(), q = p.poly || p.line;
  if (p.band) {   // 太さの変わる帯。path=中心線の制御点 / r=太さ（半分）の並び / off=中心線からのずらし
    const b = p.band, cv = _dsCurve(b.path, 96), tg = _dsTangents(cv), L = [], R = [], s0 = b.from || 0, s1 = b.to == null ? 1 : b.to;
    for (let j = 0; j <= 96; j++) { const s = j / 96; if (s < s0 - 1e-6 || s > s1 + 1e-6) continue; const u = (s - s0) / Math.max(1e-6, s1 - s0), r = Math.max(0, _dsProfile(b.r, u)), o = _dsProfile(b.off || 0, u), nx = -tg.ty[j], ny = tg.tx[j];
      L.push([cv.x[j] + nx * (o + r), cv.y[j] + ny * (o + r)]); R.push([cv.x[j] + nx * (o - r), cv.y[j] + ny * (o - r)]); }
    if (L.length > 1) { P.moveTo(L[0][0], L[0][1]); for (let j = 1; j < L.length; j++) P.lineTo(L[j][0], L[j][1]); for (let j = R.length - 1; j >= 0; j--) P.lineTo(R[j][0], R[j][1]); P.closePath(); }
    return P; }
  if (p.fins) {   // 線に沿って並ぶ三角（背びれ・とげ・たてがみ・光の筋）
    const f = p.fins, cv = _dsCurve(f.path, 96), tg = _dsTangents(cv), cnt = f.count || 10, s0 = f.from || 0, s1 = f.to == null ? 1 : f.to, side = f.side || 1;
    for (let i = 0; i < cnt; i++) { const u = (i + 0.5) / cnt, s = s0 + (s1 - s0) * u, j = Math.round(s * 96), nx = -tg.ty[j] * side, ny = tg.tx[j] * side, tx = tg.tx[j], ty = tg.ty[j];
      const h = _dsProfile(f.h == null ? 6 : f.h, u), w = _dsProfile(f.w == null ? 5 : f.w, u) / 2, base = Math.max(0, _dsProfile(f.r || 0, f.rspan ? (s - f.rspan[0]) / Math.max(1e-6, f.rspan[1] - f.rspan[0]) : s) - 0.6), ln = (f.lean || 0) * h;   /* r は線全体(0〜1)に沿った帯の太さ。帯が from/to つきなら rspan:[from,to] で合わせる */
      const bx = cv.x[j] + nx * base, by = cv.y[j] + ny * base; if (h <= 0.2) continue;
      P.moveTo(bx - tx * w, by - ty * w); P.lineTo(bx + nx * h + tx * ln, by + ny * h + ty * ln); P.lineTo(bx + tx * w, by + ty * w); P.closePath(); }
    return P; }
  if (p.arc) { P.arc(p.arc[0], p.arc[1], p.arc[2], (p.arc[3] || 0) * Math.PI / 180, (p.arc[4] == null ? 360 : p.arc[4]) * Math.PI / 180); return P; }
  if (p.circle) P.arc(p.circle[0], p.circle[1], p.circle[2], 0, Math.PI * 2);
  else if (p.ellipse) P.ellipse(p.ellipse[0], p.ellipse[1], p.ellipse[2], p.ellipse[3], (p.ellipse[4] || 0) * Math.PI / 180, 0, Math.PI * 2);
  else if (p.rect) { if (p.rect[4] && P.roundRect) P.roundRect(p.rect[0], p.rect[1], p.rect[2], p.rect[3], p.rect[4]); else P.rect(p.rect[0], p.rect[1], p.rect[2], p.rect[3]); }
  else if (p.star) { const [x, y, R, r, m, rot] = p.star, N = m || 5, a0 = ((rot || 0) - 90) * Math.PI / 180;
    for (let i = 0; i < N * 2; i++) { const a = a0 + i * Math.PI / N, rr = i % 2 ? r : R; if (i) P.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else P.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } P.closePath(); }
  else if (q) { for (let i = 0; i + 1 < q.length; i += 2) { if (i) P.lineTo(q[i], q[i + 1]); else P.moveTo(q[i], q[i + 1]); } if (p.poly && !p.s) P.closePath(); }
  return P;
}
// mirror つきの部品は、左右を写した写しをすぐ後ろに足す（同じ重なり順になる）
function _dsExpand(def) {
  const out = [];
  const named = def.paths || {};
  for (let p of def.parts || []) {
    for (const key of ['band', 'fins']) if (p[key] && typeof p[key].path === 'string') p = Object.assign({}, p, { [key]: Object.assign({}, p[key], { path: named[p[key].path] || [[0, 0], [1, 1]] }) });
    out.push(p); if (p.mirror != null) out.push(Object.assign({}, p, { _mx: p.mirror, tag: p.mtag || p.tag, mirror: null })); }
  return out;
}
function _dsDrawPart(c, p, tf, white) {
  c.setTransform(tf.a, 0, 0, tf.a, tf.ox, tf.oy); if (p._mx != null) c.transform(-1, 0, 0, 1, 2 * p._mx, 0);
  const path = _dsPathOf(p);
  if (p.s) { c.strokeStyle = white ? '#fff' : p.s; c.lineWidth = p.sw || 2; c.lineCap = p.cap || 'round'; c.lineJoin = 'round'; c.stroke(path); return; }
  if (white) c.fillStyle = '#fff';
  else if (p.c2 && p.g) { const gr = c.createLinearGradient(p.g[0], p.g[1], p.g[2], p.g[3]); gr.addColorStop(0, p.c); gr.addColorStop(1, p.c2); c.fillStyle = gr; }
  else if (p.c2 && p.gr) { const gr = c.createRadialGradient(p.gr[0], p.gr[1], 0, p.gr[0], p.gr[1], p.gr[2]); gr.addColorStop(0, p.c); gr.addColorStop(1, p.c2); c.fillStyle = gr; }
  else c.fillStyle = p.c || '#fff';
  c.fill(path, p.rule || 'nonzero');
}
function _dsTf(def, size) {
  const vb = def.vb || [0, 0, 100, 100], m = size * 0.04, a = Math.min((size - 2 * m) / vb[2], (size - 2 * m) / vb[3]);
  return { a, ox: (size - vb[2] * a) / 2 - vb[0] * a, oy: (size - vb[3] * a) / 2 - vb[1] * a };
}
// 下絵をそのまま描く（ラボで元の絵を確かめるため）
function dshapeDrawDef(c, def, size) {
  const tf = _dsTf(def, size);
  for (const p of _dsExpand(def)) { if (p.cut) { c.globalCompositeOperation = 'destination-out'; _dsDrawPart(c, p, tf, true); c.globalCompositeOperation = 'source-over'; } else _dsDrawPart(c, p, tf, false); }
  c.setTransform(1, 0, 0, 1, 0, 0);
  return tf;
}
// 部品の地図: 画素ごとに「いちばん手前の部品の番号」（何も無ければ -1）
function _dsLabelsDef(parts, tf, size) {
  const c = _dshapeCtx(size), lab = new Int16Array(size * size).fill(-1), N = size * size;
  for (let k = 0; k < parts.length; k++) {
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, size, size);
    _dsDrawPart(c, parts[k], tf, true);
    c.setTransform(1, 0, 0, 1, 0, 0);
    const px = c.getImageData(0, 0, size, size).data, v = parts[k].cut ? -1 : k;
    for (let i = 0, q = 3; i < N; i++, q += 4) if (px[q] > 110) lab[i] = v;
  }
  return lab;
}
function dshapeDrawEmoji(c, ch, size) {
  c.setTransform(1, 0, 0, 1, 0, 0); c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = `${Math.round(size * 0.74)}px ${DSHAPE_EMOJI_FONT}`; c.fillStyle = '#fff'; c.fillText(ch, size / 2, size * 0.54);
}
// 画像を収める。背景が一色で塗られた絵（白地のロゴなど）は、縁から同じ色をたどって抜く
function dshapeDrawImage(c, img, size) {
  const iw = img.naturalWidth || img.videoWidth || img.width, ih = img.naturalHeight || img.videoHeight || img.height; if (!iw || !ih) return false;
  const m = size * 0.04, k = Math.min((size - 2 * m) / iw, (size - 2 * m) / ih), w = Math.max(1, Math.round(iw * k)), h = Math.max(1, Math.round(ih * k));
  const x0 = Math.round((size - w) / 2), y0 = Math.round((size - h) / 2);
  c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high'; c.drawImage(img, x0, y0, w, h);
  const im = c.getImageData(x0, y0, w, h), px = im.data;
  let opaque = true, sr = 0, sg = 0, sb = 0, cnt = 0, vr = 0;
  const ring = []; for (let x = 0; x < w; x++) ring.push(x, (h - 1) * w + x); for (let y = 0; y < h; y++) ring.push(y * w, y * w + w - 1);
  for (const i of ring) { if (px[i * 4 + 3] < 250) { opaque = false; break; } sr += px[i * 4]; sg += px[i * 4 + 1]; sb += px[i * 4 + 2]; cnt++; }
  if (!opaque) return true;                                    // すでに透過つき。そのまま使う
  sr /= cnt; sg /= cnt; sb /= cnt;
  for (const i of ring) vr += Math.abs(px[i * 4] - sr) + Math.abs(px[i * 4 + 1] - sg) + Math.abs(px[i * 4 + 2] - sb);
  if (vr / cnt > 42) return true;                              // 縁の色がばらばら = 写真。抜かずに四角いまま点にする
  const tol = 46, seen = new Uint8Array(w * h), st = [];
  const near = (i) => Math.abs(px[i * 4] - sr) + Math.abs(px[i * 4 + 1] - sg) + Math.abs(px[i * 4 + 2] - sb) < tol;
  for (const i of ring) if (!seen[i] && near(i)) { seen[i] = 1; st.push(i); }
  while (st.length) { const i = st.pop(); px[i * 4 + 3] = 0; const x = i % w, y = (i / w) | 0;
    if (x > 0 && !seen[i - 1] && near(i - 1)) { seen[i - 1] = 1; st.push(i - 1); } if (x < w - 1 && !seen[i + 1] && near(i + 1)) { seen[i + 1] = 1; st.push(i + 1); }
    if (y > 0 && !seen[i - w] && near(i - w)) { seen[i - w] = 1; st.push(i - w); } if (y < h - 1 && !seen[i + w] && near(i + w)) { seen[i + w] = 1; st.push(i + w); } }
  c.putImageData(im, x0, y0);
  return true;
}
// 絵文字が端末に無いと「□」が出る。中が空の四角（＝輪郭にしか画素が無い単色の絵）は形として使わない
function _dsLooksTofu(px, size) {
  let x0 = size, x1 = -1, y0 = size, y1 = -1, cnt = 0, chroma = 0;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { const q = (y * size + x) * 4; if (px[q + 3] < 110) continue; cnt++;
    chroma += Math.max(px[q], px[q + 1], px[q + 2]) - Math.min(px[q], px[q + 1], px[q + 2]); if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (cnt < 60) return true;
  if (chroma / cnt > 6) return false;
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1, mx = bw * 0.16, my = bh * 0.16; let rim = 0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { if (px[(y * size + x) * 4 + 3] < 110) continue; if (x - x0 < mx || x1 - x < mx || y - y0 < my || y1 - y < my) rim++; }
  return rim / cnt > 0.93 && cnt / (bw * bh) < 0.5;
}
// 絵文字・画像の「部品の地図」。色の近い画素をまとめて、目・口・模様などを部品として取り出す。
// 色は「色相の向き（無彩色は原点）・鮮やかさ・明るさ」で比べる。同じ色相なら、つやや陰影による
// 明るさ・鮮やかさの違いは同じ面とみなす（そうしないと、ハートのつやや顔の陰影が縞として縁取られる）
function _dsLabelsPixels(px, size) {
  const N = size * size, lab = new Int16Array(N).fill(-1), BINS = 4096, cnt = new Float64Array(BINS), sR = new Float64Array(BINS), sG = new Float64Array(BINS), sB = new Float64Array(BINS);
  const bin = new Int16Array(N).fill(-1); let total = 0;
  for (let i = 0, q = 0; i < N; i++, q += 4) { if (px[q + 3] <= 110) continue;
    const bi = (px[q] >> 4) << 8 | (px[q + 1] >> 4) << 4 | (px[q + 2] >> 4); bin[i] = bi; cnt[bi]++; sR[bi] += px[q]; sG[bi] += px[q + 1]; sB[bi] += px[q + 2]; total++; }
  if (total < 40) return null;
  // 色の特徴: [色相x, 色相y, 鮮やかさ, 明るさ]。鮮やかさが 0.22 を超えたら色相の向きは長さ1（それ未満は無彩色として原点へ寄せる）
  const F = new Map(), used = [];
  for (let b = 0; b < BINS; b++) { if (!cnt[b]) continue; const r = sR[b] / cnt[b] / 255, g = sG[b] / cnt[b] / 255, bl = sB[b] / cnt[b] / 255;
    const mx = Math.max(r, g, bl), mn = Math.min(r, g, bl), c = mx - mn, sat = mx > 1e-4 ? c / mx : 0;
    let h = 0; if (c > 1e-5) { h = mx === r ? ((g - bl) / c) % 6 : mx === g ? (bl - r) / c + 2 : (r - g) / c + 4; h *= Math.PI / 3; }
    const kk = Math.min(1, sat / 0.22) * Math.min(1, mx / 0.18);   // 暗すぎる色は色相があてにならない
    F.set(b, [Math.cos(h) * kk, Math.sin(h) * kk, sat, mx]); used.push(b); }
  const dK = (f, c) => (f[0] - c[0]) ** 2 + (f[1] - c[1]) ** 2 + 0.16 * (f[2] - c[2]) ** 2 + 0.36 * (f[3] - c[3]) ** 2;   // まとまりを作るときの距離
  const dM = (a, b) => { const dv = Math.max(0, Math.abs(a[3] - b[3]) - 0.26); return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + 0.10 * (a[2] - b[2]) ** 2 + 1.3 * dv * dv; };   // 同じ部品かどうかの距離（明るさの小さな差は見ない）
  // 種の選び方: いちばん多い色から始めて、「いまある種から遠く、しかも画素の多い色」を足していく
  let first = used[0]; for (const b of used) if (cnt[b] > cnt[first]) first = b;
  let cen = [F.get(first).slice()]; const K = 8;
  while (cen.length < K) { let best = -1, bs = 0; for (const b of used) { if (cnt[b] < total * 0.0006) continue; let m = 1e9; for (const c of cen) { const d = dK(F.get(b), c); if (d < m) m = d; } const sc = m * Math.pow(cnt[b], 0.35); if (sc > bs) { bs = sc; best = b; } }
    if (best < 0) break; cen.push(F.get(best).slice()); }
  const asg = new Int16Array(BINS);
  for (let it = 0; it < 8; it++) {
    const acc = cen.map(() => [0, 0, 0, 0, 0]);
    for (const b of used) { const f = F.get(b); let m = 1e9, mi = 0; for (let k = 0; k < cen.length; k++) { const d = dK(f, cen[k]); if (d < m) { m = d; mi = k; } } asg[b] = mi; const a = acc[mi], w = cnt[b]; a[0] += f[0] * w; a[1] += f[1] * w; a[2] += f[2] * w; a[3] += f[3] * w; a[4] += w; }
    for (let k = 0; k < cen.length; k++) if (acc[k][4] > 0) cen[k] = [acc[k][0] / acc[k][4], acc[k][1] / acc[k][4], acc[k][2] / acc[k][4], acc[k][3] / acc[k][4]];
  }
  const map = cen.map((_, k) => k);
  for (let a = 0; a < cen.length; a++) for (let b = a + 1; b < cen.length; b++) { if (map[b] !== b) continue; if (dM(cen[a], cen[b]) < DSHAPE_MERGE) map[b] = map[a]; }
  for (let i = 0; i < N; i++) if (bin[i] >= 0) lab[i] = map[asg[bin[i]]];
  // 縁のにじみでできた1〜2画素の帯を消す（3×3 の多数決を2回）
  const tmp = new Int16Array(N), votes = new Int32Array(cen.length);
  for (let pass = 0; pass < 2; pass++) { tmp.set(lab);
    for (let y = 1; y < size - 1; y++) for (let x = 1; x < size - 1; x++) { const i = y * size + x; if (tmp[i] < 0) continue; votes.fill(0);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const v = tmp[i + dy * size + dx]; if (v >= 0) votes[v]++; }
      let bk = tmp[i], bv = votes[bk]; for (let k = 0; k < votes.length; k++) if (votes[k] > bv) { bv = votes[k]; bk = k; } lab[i] = bk; } }
  // 小さいまとまりほど手前（＝境目の点を自分の色で持つ）。番号を面積の大きい順に振り直す
  const area = new Float64Array(cen.length); for (let i = 0; i < N; i++) if (lab[i] >= 0) area[lab[i]]++;
  const order = [...area.keys()].filter(k => area[k] > 0).sort((a, b) => area[b] - area[a]), re = new Int16Array(cen.length).fill(-1);
  order.forEach((k, j) => { re[k] = j; });
  for (let i = 0; i < N; i++) if (lab[i] >= 0) lab[i] = re[lab[i]];
  return { lab, K: order.length };
}

// ---------- 点を拾う ----------
// 部品ごとに境目をたどる（ムーア近傍追跡）。外周も穴の縁も、順に並んだ画素の列として取り出す
function _dsContours(lab, W, H) {
  const DX = [1, 1, 0, -1, -1, -1, 0, 1], DY = [0, 1, 1, 1, 0, -1, -1, -1];   // 東から時計回り（y は下向き）
  const seen = new Uint8Array(W * H), chains = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, k = lab[i]; if (k < 0 || seen[i]) continue;
    const at = (xx, yy) => xx >= 0 && yy >= 0 && xx < W && yy < H && lab[yy * W + xx] === k;
    let b = -1; if (!at(x - 1, y)) b = 4; else if (!at(x, y - 1)) b = 6; else if (!at(x + 1, y)) b = 0; else if (!at(x, y + 1)) b = 2;
    if (b < 0) continue;                                       // 内側の画素
    const ch = []; let cx = x, cy = y, dir = b, second = -1;
    for (let guard = 0; guard < 60000; guard++) {
      let d = -1; for (let q = 0; q < 8; q++) { const dd = (dir + q) % 8; if (at(cx + DX[dd], cy + DY[dd])) { d = dd; break; } }
      if (d < 0) { ch.push(cx, cy); seen[cy * W + cx] = 1; break; }   // 1画素だけの島
      const nx = cx + DX[d], ny = cy + DY[d];
      if (cx === x && cy === y) { if (second < 0) second = ny * W + nx; else if (ny * W + nx === second) break; }   // 出発点に戻り、同じ向きへ出ようとしたら1周
      ch.push(cx, cy); seen[cy * W + cx] = 1;
      cx = nx; cy = ny; dir = (d + (d % 2 ? 5 : 6)) % 8;
    }
    if (ch.length >= 8) chains.push({ k, ch });
  }
  return chains;
}
// 列をならして（画素の階段を消す）長さを測る。あわせて「この境目の点は誰が持つか」を画素ごとに決めておく:
//   外との境目 → 必ず持つ / 手前の部品との境目 → 手前に譲る / 奥の部品との境目 → 自分の輪郭を描く設定なら持つ
function _dsPrepChain(c, lab, W, H, edgeOn) {
  const ch = c.ch, m = ch.length / 2, xs = new Float32Array(m), ys = new Float32Array(m), acc = new Float32Array(m + 1), keep = new Uint8Array(m), isOut = new Uint8Array(m), k = c.k;
  for (let i = 0; i < m; i++) { let sx = 0, sy = 0; for (let q = -2; q <= 2; q++) { const j = ((i + q) % m + m) % m; sx += ch[j * 2]; sy += ch[j * 2 + 1]; } xs[i] = sx / 5 + 0.5; ys[i] = sy / 5 + 0.5; }
  for (let i = 0; i < m; i++) { const j = (i + 1) % m; acc[i + 1] = acc[i] + Math.hypot(xs[j] - xs[i], ys[j] - ys[i]); }
  for (let i = 0; i < m; i++) { const x = ch[i * 2], y = ch[i * 2 + 1]; let out = false, up = false;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) { out = true; continue; } const v = lab[yy * W + xx]; if (v < 0) out = true; else if (v > k) up = true; }
    isOut[i] = out ? 1 : 0; keep[i] = out ? 1 : up ? 0 : (edgeOn && !edgeOn[k] ? 0 : 1); }
  let kept = 0, outer = 0; for (let i = 0; i < m; i++) if (keep[i]) { const d = acc[i + 1] - acc[i]; kept += d; if (isOut[i]) outer += d; }
  return { k, xs, ys, acc, keep, len: acc[m], kept, outer, m };
}
// 透明でないところから n 点ちょうどを拾う。
// 戻り値: { xy(画素), lbl(点ごとの部品番号), edge(境目の点なら1), pitch(点の間隔・画素) }
function dshapeSample(lab, W, H, n, opt) {
  opt = opt || {};
  const edgeOn = opt.edgeOn || null, wt = opt.wt || null, N = W * H;
  let area = 0; for (let i = 0; i < N; i++) if (lab[i] >= 0) area++;
  if (area < 40) return null;
  const wOf = (k) => (wt ? wt[k] || 1 : 1), drawn = (a, b) => a < 0 || b < 0 || !edgeOn || edgeOn[Math.max(a, b)];
  // 描かれる境目までの距離（面取り距離変換）。内側の点を境目の点の列から離すのに使う
  const dist = new Float32Array(N), BIG = 1e6;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x, k = lab[i]; if (k < 0) { dist[i] = 0; continue; }
    let seed = x === 0 || y === 0 || x === W - 1 || y === H - 1;
    if (!seed) { const a = lab[i - 1], b = lab[i + 1], c = lab[i - W], d = lab[i + W]; seed = (a !== k && drawn(a, k)) || (b !== k && drawn(b, k)) || (c !== k && drawn(c, k)) || (d !== k && drawn(d, k)); }
    dist[i] = seed ? 1 : BIG; }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (lab[i] < 0) continue; let d = dist[i];
    if (x > 0) d = Math.min(d, dist[i - 1] + 1); if (y > 0) { d = Math.min(d, dist[i - W] + 1); if (x > 0) d = Math.min(d, dist[i - W - 1] + 1.414); if (x < W - 1) d = Math.min(d, dist[i - W + 1] + 1.414); } dist[i] = d; }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) { const i = y * W + x; if (lab[i] < 0) continue; let d = dist[i];
    if (x < W - 1) d = Math.min(d, dist[i + 1] + 1); if (y < H - 1) { d = Math.min(d, dist[i + W] + 1); if (x < W - 1) d = Math.min(d, dist[i + W + 1] + 1.414); if (x > 0) d = Math.min(d, dist[i + W - 1] + 1.414); } dist[i] = d; }
  // 手前の部品の列から先に置く（境目が重なったら手前の色が残る）
  const chains = _dsContours(lab, W, H).map(c => _dsPrepChain(c, lab, W, H, edgeOn)).filter(c => c.kept > (opt.minChain || 5)).sort((a, b) => b.k - a.k);
  const wset = [1]; if (wt) for (let k = 0; k < wt.length; k++) { const w = wOf(k); if (wset.indexOf(w) < 0) wset.push(w); }
  const wmax = Math.max.apply(null, wset), wmin = Math.min.apply(null, wset);
  const gen = (g) => {
    const ex = [], el = [], cell = Math.max(0.6, 0.52 * g / Math.sqrt(wmin)), grid = new Map();
    for (const c of chains) {
      const gw = g / Math.sqrt(wOf(c.k)), step = gw * 0.80, rad = gw * 0.52, cnt = Math.max(3, Math.round(c.len / step)); let j = 0;
      for (let q = 0; q < cnt; q++) { const s = (q + 0.5) / cnt * c.len; while (j < c.m - 1 && c.acc[j + 1] < s) j++;
        if (!c.keep[j]) continue;
        const j2 = (j + 1) % c.m, t = (s - c.acc[j]) / Math.max(1e-6, c.acc[j + 1] - c.acc[j]); let x = c.xs[j] + (c.xs[j2] - c.xs[j]) * t, y = c.ys[j] + (c.ys[j2] - c.ys[j]) * t;
        // 細い線（ひげ・角・触角・細い脚）は、両側の縁に1列ずつ置くと管のように見える。
        // 縁から内側へたどって、すぐ向こう側の縁に近づき始める（＝幅が点の間隔ほどしかない）なら、まん中の尾根に置く。両側の点はそこで重なって1列にまとまる
        { const ja = (j + 2) % c.m, jb = (j - 2 + c.m) % c.m; let tx = c.xs[ja] - c.xs[jb], ty = c.ys[ja] - c.ys[jb]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
          const lim = 0.62 * gw;
          for (const sg of [1, -1]) { const nx = -ty * sg, ny = tx * sg; let pd = -1, rx = x, ry = y, ridge = false;
            for (let u = 0.75; u <= lim + 1.5; u += 0.75) { const qx = x + nx * u, qy = y + ny * u; if (qx < 0 || qy < 0 || qx >= W || qy >= H) break; const qi = (qy | 0) * W + (qx | 0); if (lab[qi] !== c.k) break;
              const dv = dist[qi]; if (dv < pd - 0.01) { ridge = true; break; } if (dv > pd) { pd = dv; rx = qx; ry = qy; } }
            if (ridge && pd > 0 && pd < lim) { x = rx; y = ry; break; } } }
        // 近すぎる点は置かない（細い線は輪郭が往復するので、同じ場所に2つ並ぶ）
        const gx = Math.floor(x / cell), gy = Math.floor(y / cell); let ok = true;
        for (let yy = gy - 1; yy <= gy + 1 && ok; yy++) for (let xx = gx - 1; xx <= gx + 1 && ok; xx++) { const l = grid.get(xx * 4096 + yy); if (l) for (let u = 0; u < l.length; u += 2) if ((l[u] - x) * (l[u] - x) + (l[u + 1] - y) * (l[u + 1] - y) < rad * rad) { ok = false; break; } }
        if (!ok) continue; ex.push(x, y); el.push(c.k); const key = gx * 4096 + gy, l = grid.get(key); if (l) l.push(x, y); else grid.set(key, [x, y]); }
    }
    const ix = [], il = [];
    for (const w of wset) { const gw = g / Math.sqrt(w), dy = gw * 0.866, need = gw * 0.78; let row = 0;
      for (let y = dy * 0.5; y < H; y += dy, row++) for (let x = (row % 2 ? gw * 0.5 : 0) + gw * 0.25; x < W; x += gw) { const i = (y | 0) * W + (x | 0), k = lab[i]; if (k >= 0 && wOf(k) === w && dist[i] >= need) { ix.push(x, y); il.push(k); } } }
    return { ex, el, ix, il };
  };
  let best = null;
  const search = () => { let lo = 0.8, hi = 64;
    for (let it = 0; it < 18; it++) { const g = (lo + hi) / 2, r = gen(g), tot = (r.ex.length + r.ix.length) / 2; best = { g, r }; if (tot > n) lo = g; else hi = g; if (Math.abs(tot - n) <= Math.max(2, n * 0.003)) break; } };
  search();
  for (let round = 0; round < 4 && opt.edgeMax && best.r.el.length > n * opt.edgeMax; round++) {
    const inner = chains.filter(c => c.outer < c.kept * 0.2).sort((a, b) => a.kept - b.kept); if (!inner.length) break;
    const cut = new Set(inner.slice(0, Math.max(1, Math.ceil(inner.length * 0.4))));
    for (let i = chains.length - 1; i >= 0; i--) if (cut.has(chains[i])) chains.splice(i, 1);
    search();
  }
  const g = best.g, r = best.r; let ex = r.ex, el = r.el, ix = r.ix, il = r.il; const tot = (ex.length + ix.length) / 2;
  const thinOut = (xs, ls, drop) => { const m = ls.length, kx = [], kl = [], step = m / drop; let next = step * 0.5;
    for (let i = 0; i < m; i++) { if (drop > 0 && i >= next) { next += step; drop--; continue; } kx.push(xs[i * 2], xs[i * 2 + 1]); kl.push(ls[i]); } return [kx, kl]; };
  if (tot > n) {                                               // 多いぶんは散らして抜く。まず内側から
    let drop = tot - n; const di = Math.min(drop, il.length); if (di > 0) { const o = thinOut(ix, il, di); ix = o[0]; il = o[1]; drop -= di; }
    if (drop > 0) { const o = thinOut(ex, el, drop); ex = o[0]; el = o[1]; }
  } else if (tot < n) {                                        // 足りないぶんは、半目ずらした格子から散らして足す
    const cx2 = [], cl = [], dy = g * 0.866; let row = 0;
    for (let y = dy; y < H; y += dy, row++) for (let x = (row % 2 ? 0 : g * 0.5) + g * 0.25; x < W; x += g) { const i = (y | 0) * W + (x | 0); if (lab[i] >= 0 && dist[i] >= g * 0.45) { cx2.push(x, y); cl.push(lab[i]); } }
    const need = n - tot, m = cl.length;
    for (let q = 0; q < need; q++) { if (m > 0) { const j = Math.floor((q + 0.5) * m / need) % m; ix.push(cx2[j * 2], cx2[j * 2 + 1]); il.push(cl[j]); }
      else { const j = (q * 7919) % el.length, a = q * 2.399963; ix.push(ex[j * 2] + Math.cos(a) * g * 0.4, ex[j * 2 + 1] + Math.sin(a) * g * 0.4); il.push(el[j]); } }
  }
  const xy = new Float32Array(n * 2), lbl = new Int16Array(n), edge = new Uint8Array(n); let k = 0;
  for (let i = 0; i < el.length && k < n; i++, k++) { xy[k * 2] = ex[i * 2]; xy[k * 2 + 1] = ex[i * 2 + 1]; lbl[k] = el[i]; edge[k] = 1; }
  for (let i = 0; i < il.length && k < n; i++, k++) { xy[k * 2] = ix[i * 2]; xy[k * 2 + 1] = ix[i * 2 + 1]; lbl[k] = il[i]; }
  for (; k < n; k++) { xy[k * 2] = xy[0]; xy[k * 2 + 1] = xy[1]; lbl[k] = lbl[0]; }
  return { xy, lbl, edge, pitch: g, edgeN: el.length, dist, wmax };
}

// ---------- 形を作る ----------
// src: { kind:'lib', def } | { kind:'emoji', ch, motion? } | { kind:'image', img, motion? }
// env: { aspect: 見える範囲の横/縦, still: 動きを止める }
// 戻り値: { n, bx, by（外接の長いほうの半分を1とした座標・y上向き）, col, tag, edge, half, box, pitch, dom, anims, colAnims, kind, name, id }
function dshapeMake(src, n, env) {
  env = env || {};
  if (src.kind === 'lib' && src.def.gen) {
    const f = DSHAPE_GEN[src.def.gen], sh = f ? f(n, env, src.def) : null; if (!sh) return null;
    sh.kind = 'lib'; sh.name = src.def.name; sh.id = src.def.id; sh.n = n; sh.anims = sh.anims || []; sh.colAnims = sh.colAnims || [];
    if (!sh.box) dshapeMotionBox(sh); return sh;
  }
  const size = DSHAPE_SIZE; let lab = null, parts = null, tf = null, px = null; const opt = {};
  if (src.kind === 'lib') {
    parts = _dsExpand(src.def); tf = _dsTf(src.def, size); lab = _dsLabelsDef(parts, tf, size);
    opt.edgeOn = Uint8Array.from(parts, p => (p.edge === false ? 0 : 1)); opt.wt = Float32Array.from(parts, p => Math.max(0.4, Math.min(4, p.w || 1)));
  } else {
    const c = _dshapeCtx(size);
    if (src.kind === 'emoji') dshapeDrawEmoji(c, src.ch, size); else if (src.kind === 'image') { if (!dshapeDrawImage(c, src.img, size)) return null; } else return null;
    px = c.getImageData(0, 0, size, size).data;
    if (src.kind === 'emoji' && _dsLooksTofu(px, size)) return null;
    const L = _dsLabelsPixels(px, size); if (!L) return null; lab = L.lab; opt.minChain = 14; opt.edgeMax = 0.50;
  }
  const sm = dshapeSample(lab, size, size, n, opt); if (!sm) return null;
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (let i = 0; i < n; i++) { const x = sm.xy[i * 2], y = sm.xy[i * 2 + 1]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, hm = Math.max(x1 - x0, y1 - y0, 4) / 2;
  const sh = { n, bx: new Float32Array(n), by: new Float32Array(n), col: new Float32Array(n * 3), tag: new Uint8Array(n), edge: sm.edge, part: sm.lbl,
    half: [(x1 - x0) / 2 / hm, (y1 - y0) / 2 / hm], pitch: sm.pitch / hm, dense: sm.wmax, dom: [1, 1, 1], anims: [], colAnims: [], tags: [''], kind: src.kind,
    name: src.kind === 'lib' ? src.def.name : src.kind === 'emoji' ? src.ch : '画像', id: src.kind === 'lib' ? src.def.id : '' };
  const tagIx = new Map([['', 0]]);
  let pc = null, pc2 = null;
  if (parts) { pc = parts.map(p => _dsHex(p.s || p.c)); pc2 = parts.map(p => (p.c2 && !p.s ? _dsHex(p.c2) : null));
    for (const p of parts) if (p.tag && !tagIx.has(p.tag)) { tagIx.set(p.tag, sh.tags.length); sh.tags.push(p.tag); } }
  // 絵の色が全体に暗い（黒一色のロゴなど）ときは、明るさを裏返す。光で黒は描けない
  let invert = false;
  if (px) { let s = 0; for (let i = 0; i < n; i++) { const q = ((sm.xy[i * 2 + 1] | 0) * size + (sm.xy[i * 2] | 0)) * 4; s += Math.max(px[q], px[q + 1], px[q + 2]) / 255; } invert = s / n < 0.22; }
  let ar = 0, ag = 0, ab = 0;
  for (let i = 0; i < n; i++) {
    const x = sm.xy[i * 2], y = sm.xy[i * 2 + 1], k = sm.lbl[i]; let r, g, b;
    if (parts) { const p = parts[k]; let t = 0;
      if (pc2[k]) { let vx = (x - tf.ox) / tf.a; const vy = (y - tf.oy) / tf.a; if (p._mx != null) vx = 2 * p._mx - vx;
        if (p.g) { const gx = p.g[2] - p.g[0], gy = p.g[3] - p.g[1]; t = ((vx - p.g[0]) * gx + (vy - p.g[1]) * gy) / Math.max(1e-6, gx * gx + gy * gy); }
        else if (p.gr) t = Math.hypot(vx - p.gr[0], vy - p.gr[1]) / Math.max(1e-6, p.gr[2]);
        t = Math.max(0, Math.min(1, t)); }
      const a = pc[k], b2 = pc2[k] || a, br = p.b || 1; r = (a[0] + (b2[0] - a[0]) * t) * br; g = (a[1] + (b2[1] - a[1]) * t) * br; b = (a[2] + (b2[2] - a[2]) * t) * br;
      sh.tag[i] = tagIx.get(p.tag || '') || 0;
    } else {
      // 境目の点は、にじんだ色を拾わないよう、同じ部品のいちばん内側の画素から色をとる
      let qx = x | 0, qy = y | 0;
      if (sm.edge[i]) { let bd = -1; for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const xx = (x | 0) + dx, yy = (y | 0) + dy; if (xx < 0 || yy < 0 || xx >= size || yy >= size) continue; const j = yy * size + xx; if (lab[j] === k && sm.dist[j] > bd) { bd = sm.dist[j]; qx = xx; qy = yy; } } }
      const q = (qy * size + qx) * 4; r = px[q] / 255; g = px[q + 1] / 255; b = px[q + 2] / 255;
      if (invert) { const l = 0.299 * r + 0.587 * g + 0.114 * b, d = (1 - l) - l; r = Math.max(0, Math.min(1, r + d)); g = Math.max(0, Math.min(1, g + d)); b = Math.max(0, Math.min(1, b + d)); }
    }
    dshapeNight(r, g, b, sh.col, i * 3);
    const c0 = sh.col[i * 3], c1 = sh.col[i * 3 + 1], c2 = sh.col[i * 3 + 2], w = 0.12 + Math.max(c0, c1, c2) - Math.min(c0, c1, c2);   // 鮮やかな色ほど重く数える
    ar += c0 * w; ag += c1 * w; ab += c2 * w;
    sh.bx[i] = (x - cx) / hm; sh.by[i] = -(y - cy) / hm;
  }
  { const mx = Math.max(ar, ag, ab, 1e-6); sh.dom = [ar / mx, ag / mx, ab / mx]; }
  // 動き。定義の座標（下絵の単位）で書かれた長さと支点を、点と同じ座標に直す
  if (!env.still) {
    const K = tf ? tf.a / hm : 1, toN = (p) => (tf ? [((p[0] * tf.a + tf.ox) - cx) / hm, -((p[1] * tf.a + tf.oy) - cy) / hm] : p);
    const list = parts ? src.def.anim || [] : (Array.isArray(src.motion) ? src.motion : DSHAPE_MOTION[src.motion || 'float'] || []);
    const LEN = { swim: ['amp'], wave: ['amp'], bob: ['amp', 'ax'], hop: ['amp'], shift: ['ax', 'ay'], orbit: ['r', 'ry'], swing: ['r'], rock: ['r'], spine: ['amp'] };
    // mirror つきの動きは、支点を左右に写した動きを足す（左右の耳・腕・ひれ）。回る向きも写すので、左右が同じように開いて閉じる
    const full = [];
    for (const a of list) { full.push(a); if (a.mirror != null && tf) { const mx = a.mirror, m = Object.assign({}, a, { mirror: null, tags: a.mtags || a.tags, phase: (a.phase || 0) + (a.mphase || 0) });
        for (const key of ['pivot', 'hinge']) if (a[key]) m[key] = [2 * mx - a[key][0], a[key][1]];
        if (a.type === 'swing' || a.type === 'rock' || a.type === 'sway') { m.amp = -(a.amp == null ? (a.type === 'sway' ? 0.06 : 0.2) : a.amp); if (a.bias) m.bias = -a.bias; }
        if (a.ax) m.ax = -a.ax; if (a.type === 'spin') m.dir = -(a.dir || 1);
        full.push(m); } }
    for (const a of full) { const o = Object.assign({}, a);
      for (const key of ['pivot', 'hinge']) if (a[key]) o[key] = toN(a[key]);
      for (const key of LEN[a.type] || []) if (typeof a[key] === 'number') o[key] = a[key] * K;
      if ((a.type === 'swing' || a.type === 'rock') && typeof a.k === 'number') o.k = a.k / K;
      o.m = new Uint8Array(sh.tags.length); if (a.tags) { for (const t of a.tags) { const ix = tagIx.get(t); if (ix !== undefined) o.m[ix] = 1; } } else o.m.fill(1);
      if (a.type === 'spine') { const raw = typeof a.path === 'string' ? (src.def.paths || {})[a.path] : a.path; if (!raw || raw.length < 2) continue; _dsSpineBind(o, sh, raw.map(toN)); }
      (a.type === 'twinkle' || a.type === 'blink' || a.type === 'chase' ? sh.colAnims : sh.anims).push(o); }
    sh.anims.sort((a, b) => (b.type === 'spine') - (a.type === 'spine'));   // 背骨の動きは位置を置き直すので、ほかの動きより先にかける
  }
  sh.colLive = sh.colAnims.length > 0 || sh.anims.some(a => a.type === 'flap');   // 色を毎フレーム書き直す必要があるか
  dshapeMotionBox(sh);
  return sh;
}

// 背骨への結びつけ。点ごとに「背骨のどこ(s)に、進む向きへ u・横へ v だけ離れて付いているか」を覚える。
// 毎フレーム、背骨だけを波で曲げて、点は付いている場所ごと運ぶ（体の太さ・模様・脚が崩れない）
function _dsSpineBind(a, sh, pts) {
  const M = 160, cv = _dsCurve(pts, M), tg = _dsTangents(cv), n = sh.n;
  a.cv = cv; a.M = M; a.bj = new Int16Array(n).fill(-1); a.bu = new Float32Array(n); a.bv = new Float32Array(n);
  a.fx = new Float32Array(M + 1); a.fy = new Float32Array(M + 1); a.ftx = new Float32Array(M + 1); a.fty = new Float32Array(M + 1);
  // bind: { tag名: [s0, s1] } で、その部位を結びつける背骨の範囲を絞れる（曲がりの内側の脚が、向かいの胴に結びつくのを防ぐ）
  for (let i = 0; i < n; i++) { if (!a.m[sh.tag[i]]) continue; const x = sh.bx[i], y = sh.by[i]; let bj = 0, bd = 1e9;
    const rg = a.bind && a.bind[sh.tags[sh.tag[i]]], j0 = rg ? Math.max(0, Math.round(rg[0] * M)) : 0, j1 = rg ? Math.min(M, Math.round(rg[1] * M)) : M;
    for (let j = j0; j <= j1; j++) { const d = (cv.x[j] - x) * (cv.x[j] - x) + (cv.y[j] - y) * (cv.y[j] - y); if (d < bd) { bd = d; bj = j; } }
    const dx = x - cv.x[bj], dy = y - cv.y[bj]; a.bj[i] = bj; a.bu[i] = dx * tg.tx[bj] + dy * tg.ty[bj]; a.bv[i] = -dx * tg.ty[bj] + dy * tg.tx[bj]; }
  a.rtx = tg.tx; a.rty = tg.ty;
}
function _dsSpineFrame(a, t) {
  const M = a.M, cv = a.cv, TAU = Math.PI * 2, amp = a.amp == null ? 0.06 : a.amp, k = a.k == null ? 1.5 : a.k, hz = a.hz == null ? 0.5 : a.hz, h0 = a.head == null ? 0.12 : a.head, pw = a.pow || 1.2;
  for (let j = 0; j <= M; j++) { const s = j / M, w = amp * (h0 + (1 - h0) * Math.pow(s, pw)) * Math.sin(TAU * (k * s - hz * t + (a.phase || 0))); a.fx[j] = cv.x[j] - a.rty[j] * w; a.fy[j] = cv.y[j] + a.rtx[j] * w; }
  for (let j = 0; j <= M; j++) { const p = Math.max(0, j - 1), q = Math.min(M, j + 1), dx = a.fx[q] - a.fx[p], dy = a.fy[q] - a.fy[p], l = Math.hypot(dx, dy) || 1; a.ftx[j] = dx / l; a.fty[j] = dy / l; }
}

// ---------- 動き ----------
// どの動きも「点ごとに決まった式」で動かす。だから隣どうしが入れ替わらず、形が崩れない。
// out: 位置（n×2）。outCol を渡すと、明るさの動き（またたき等）をかけた色（n×3）も書く
function dshapePose(sh, t, out, outCol) {
  if (sh.pose) { sh.pose(t, out, outCol); return; }
  const n = sh.n, bx = sh.bx, by = sh.by, an = sh.anims, ca = sh.colAnims, col = sh.col, TAU = Math.PI * 2, hw = sh.half[0] || 1, hh = sh.half[1] || 1;
  for (let q = 0; q < an.length; q++) if (an[q].type === 'spine') _dsSpineFrame(an[q], t);
  for (let i = 0; i < n; i++) {
    let x = bx[i], y = by[i], f = 1; const tg = sh.tag[i];
    for (let q = 0; q < an.length; q++) { const a = an[q]; if (!a.m[tg]) continue;
      const ph = TAU * ((a.hz == null ? 1 : a.hz) * t + (a.phase || 0));
      switch (a.type) {
        case 'spine': { const j = a.bj[i]; if (j < 0) break; const u = a.bu[i], v = a.bv[i]; x = a.fx[j] + u * a.ftx[j] - v * a.fty[j]; y = a.fy[j] + u * a.fty[j] + v * a.ftx[j]; break; }   // うねり: 背骨ごと運ぶ
        case 'flap': { const hx = a.hinge ? a.hinge[0] : 0, s = 0.5 - 0.5 * Math.cos(ph), dx = x - hx;   // 羽ばたき: 付け根の縦線を軸に、横幅が縮んで戻る
          const c = 1 - (a.amp == null ? 0.65 : a.amp) * s; f *= 0.30 + 0.70 * c;   // 畳むと点が詰まる。そのぶん暗くしないと白く飛ぶ（斜めから見た羽は暗い、という見え方にも合う）
          y += Math.abs(dx) * (a.lift == null ? 0.14 : a.lift) * Math.sin(ph); x = hx + dx * c; break; }
        case 'swim': { const dir = a.head === 'right' ? -1 : 1, u = Math.max(0, Math.min(1, (dir * x + hw) / (2 * hw)));   // 泳ぎ: 頭から尾へ波が伝わる。尾ほど大きく
          y += (a.amp == null ? 0.07 : a.amp) * (0.10 + 0.90 * u * u) * Math.sin(TAU * (a.k == null ? 1.1 : a.k) * u - ph); break; }
        case 'wave': { const u = a.anchor === 'right' ? (hw - x) / (2 * hw) : a.anchor === 'top' ? (hh - y) / (2 * hh) : a.anchor === 'bottom' ? (y + hh) / (2 * hh) : (x + hw) / (2 * hw);   // はためき: 留めた側は動かない
          const w = (a.amp == null ? 0.07 : a.amp) * (a.anchor === 'none' ? 1 : Math.max(0, u)) * Math.sin(TAU * (a.k == null ? 1.4 : a.k) * u - ph);
          if (a.anchor === 'top' || a.anchor === 'bottom') x += w; else y += w; break; }
        case 'sway': { const px = a.pivot ? a.pivot[0] : 0, py = a.pivot ? a.pivot[1] : -hh, w = Math.max(0, Math.min(1, (y - py) / Math.max(1e-3, hh - py)));   // ゆれ: 根元は動かず、先ほど大きく
          const ang = (a.amp == null ? 0.06 : a.amp) * Math.sin(ph) * w * w, dx = x - px, dy = y - py, cs = Math.cos(ang), sn = Math.sin(ang); x = px + dx * cs - dy * sn; y = py + dx * sn + dy * cs; break; }
        case 'swing': case 'rock': { const px = a.pivot ? a.pivot[0] : 0, py = a.pivot ? a.pivot[1] : 0, dx = x - px, dy = y - py, d = Math.hypot(dx, dy);   // 振り: 支点まわりに揺らす。r で根元を固く、k で先へ遅れて伝わる（しっぽ・腕・旗ざお）
          const ang = (a.amp == null ? 0.2 : a.amp) * Math.sin(ph - TAU * (a.k || 0) * d) * (a.r ? Math.min(1, d / a.r) : 1) + (a.bias || 0), cs = Math.cos(ang), sn = Math.sin(ang);
          x = px + dx * cs - dy * sn; y = py + dx * sn + dy * cs; break; }
        case 'spin': { const px = a.pivot ? a.pivot[0] : 0, py = a.pivot ? a.pivot[1] : 0, ang = -ph * (a.dir || 1), dx = x - px, dy = y - py, cs = Math.cos(ang), sn = Math.sin(ang); x = px + dx * cs - dy * sn; y = py + dx * sn + dy * cs; break; }
        case 'pulse': { const px = a.pivot ? a.pivot[0] : 0, py = a.pivot ? a.pivot[1] : 0, amp = a.amp == null ? 0.06 : a.amp;   // 拍: beat をつけると「ドッ・クン」の二つ打ち
          const s = 1 + amp * (a.beat ? Math.pow(Math.max(0, Math.sin(ph)), 6) + 0.55 * Math.pow(Math.max(0, Math.sin(ph - 0.9)), 8) : Math.sin(ph));
          x = px + (x - px) * (a.sy === true ? 1 : s); y = py + (y - py) * (a.sx === true ? 1 : s); break; }
        case 'bob': y += (a.amp == null ? 0.04 : a.amp) * Math.sin(ph); x += (a.ax || 0) * Math.sin(ph * 0.5 + 1.3); break;
        case 'hop': { const s = Math.abs(Math.sin(ph * 0.5)), py = -hh; y = py + (y - py) * (1 - 0.07 * (1 - s)) + (a.amp == null ? 0.10 : a.amp) * s; break; }
        case 'orbit': x += (a.r == null ? 0.05 : a.r) * Math.cos(ph); y += (a.ry == null ? (a.r == null ? 0.05 : a.r) : a.ry) * Math.sin(ph); break;
        case 'shift': x += (a.ax || 0) * Math.sin(ph); y += (a.ay || 0) * Math.sin(ph); break;
      } }
    out[i * 2] = x; out[i * 2 + 1] = y;
    if (outCol) {
      for (let q = 0; q < ca.length; q++) { const a = ca[q]; if (!a.m[tg]) continue; const hz = a.hz == null ? 1 : a.hz, dp = a.depth == null ? 0.6 : a.depth;
        if (a.type === 'twinkle') { const r = (Math.sin(i * 12.9898) * 43758.5453) % 1; f *= 1 - dp * (0.5 + 0.5 * Math.sin(TAU * (hz * (0.7 + 0.6 * Math.abs(r)) * t + r))); }
        else if (a.type === 'blink') f *= 1 - dp * (0.5 + 0.5 * Math.sin(TAU * (hz * t + (a.phase || 0))));
        else { const px = a.pivot ? a.pivot[0] : 0, py = a.pivot ? a.pivot[1] : 0, u = a.axis === 'x' ? (bx[i] + hw) / (2 * hw) : Math.atan2(by[i] - py, bx[i] - px) / TAU;   // chase: 光が流れる
          f *= 1 - dp * (0.5 + 0.5 * Math.sin(TAU * (hz * t - (a.k == null ? 2 : a.k) * u))); } }
      outCol[i * 3] = col[i * 3] * f; outCol[i * 3 + 1] = col[i * 3 + 1] * f; outCol[i * 3 + 2] = col[i * 3 + 2] * f; }
  }
}
// 動いたときに画面からはみ出さないよう、動きを含めた外接の大きさを測っておく
function dshapeMotionBox(sh) {
  if (!(sh.anims && sh.anims.length) && !sh.pose) { sh.box = [sh.half[0], sh.half[1]]; return; }
  const tmp = new Float32Array(sh.n * 2); let mx = 0, my = 0;
  for (let q = 0; q < 16; q++) { dshapePose(sh, q * 0.41, tmp); for (let i = 0; i < sh.n; i++) { const ax = Math.abs(tmp[i * 2]), ay = Math.abs(tmp[i * 2 + 1]); if (ax > mx) mx = ax; if (ay > my) my = ay; } }
  sh.box = [Math.max(mx, sh.half[0]), Math.max(my, sh.half[1])];
}
if (typeof DSHAPE_LIB !== 'undefined') for (const d of DSHAPE_LIB) dshapeRegister(d);
