// ===== 夜のドローンショー =====
// 多数の機体が夜空で図形を描く。見世物であると同時に、教則が
// 「多数の者の集合する催し」の該当する例そのものとして挙げている場面（3.1.2）＋夜間飛行でもある。
// 1機ずつ手で操縦しているのではなく、あらかじめ決めた経路を自動で飛ばしている、という点も見せる。
//
// 描き方の考え方（実装の要点）:
//  ・点の動きは頂点シェーダで作る。CPU は図形が変わる瞬間だけ働くので、機数を増やしても毎フレームの負担が増えない
//  ・図形が変わるとき「どの機体がどこへ行くか」を決め直す。番号順のままだと経路が交差して糸くずのように見える
//  ・光の明るさは「値」ではなく「半径」で表す。ガウシアン1枚だと平坦に見える（人の目のにじみは4割がガウシアンで、残りはべき乗の裾）
const dshow = {
  on: false, t: 0, n: 0, pts: null, geo: null, mat: null,
  from: null, to: null, raw: null, colFrom: null, colTo: null, lag: null, rnd: null, bright: null,
  perm: null, keyA: null, keyB: null, ordA: null, ordB: null,
  nextTo: null, nextCol: null, nextLag: null, nextFig: -1,
  fig: 0, figT: 0, phase: 'hold', saved: null, star: 0, lastVals: 0, lastBand: 0, sig: '', auto: true, kWant: 1, gz: 0, gzWant: 0, fitX: 2.4, fitY: 2.4, mini: false, text: '', forceFig: -1, askText: false, bodyPos: null, dist: 11, k: 1, bodyYaw: 0,
};
const DSHOW_N = () => (S.qLevel <= 1 ? 1200 : S.qLevel === 2 ? 2200 : 3200);   // 実際のショーは数百〜数千機
const DSHOW_H = 3.60;      // 隊列の中心の高さ(m)。低いほうの機体が地平線あたりに来る高さ
const DSHOW_R = 2.25;      // 隊列の広がり(m)
const DSHOW_EYE = 1.55;    // 見る人の目の高さ(m)。ここを上げると地平線が画面に入る
const DSHOW_CAM = 11.0;    // 見る位置までの距離(m)。天球は半径16mなので、これより外へ出すと空が黒いドームになる
const DSHOW_MOVE = 3.2, DSHOW_HOLD = 3.6;   // 移り変わりと静止の秒数
const DSHOW_LAG = 0.46;    // 出発の遅れの最大（ワイプの深さ）
const DSHOW_FONT = (px) => `900 ${px}px "Noto Sans JP", "Hiragino Sans", "Yu Gothic UI", sans-serif`;
const DSHOW_GLOW = 0.060;  // 光の玉の直径(m)。機体そのものより少し大きい

// ---------- 図形 ----------
// どれも「輪郭の上に等間隔で並べる」。点の数が変わっても形が保てる
const DSHOW_FIGS = [
  { id: 'grid', name: '整列', col: ['#cfe0ff', '#8fb6ff'], note: '離陸して定位置に並びます。1機ずつ手で操縦しているのではなく、あらかじめ決めた経路を自動で飛ばします。教則は自動操縦を「プログラムにより自動的に操縦を行うこと」としています。' },
  { id: 'ring', name: '輪', col: ['#7fd4ff', '#d6f4ff'], note: '教則は、飛行中の他の無人航空機を確認した場合は安全な間隔を確保し、接近や衝突のおそれがあれば降下させるなどの措置をとるとともに、相手方と飛行日時・経路・高度を調整するとしています。' },
  { id: 'star', name: '星', col: ['#ffcf5e', '#fff6d6'], note: 'ショーの色は演出です。夜間飛行の必須装備は「機体の姿勢及び方向が正確に視認できる灯火」で、こちらは安全のための要件です。全周に同じ色で光る玉を見て、機首がどちらか分かるでしょうか。' },
  { id: 'heart', name: 'ハート', col: ['#ff7ba6', '#ffd8e3'], note: 'カテゴリーⅡ飛行は、飛行経路下に操縦者と補助者以外の第三者が立ち入らないよう管理する措置を講じたうえで行うものとされています。看板やコーンによる表示、補助者による監視と口頭警告が例です。' },
  { id: 'drone', name: '機体のかたち', col: ['#7dffc4', '#ddfff2'], note: '手前の1機を大きく描いています。ショーの機体はカメラを積まず、機体と同じくらい大きな灯りを下に抱えた形です。100グラム以上の機体は1機ずつ登録し、一部の例外を除きリモートID機能を備えることが求められます。台数分すべてが対象です。' },
  { id: 'sphere', name: '球', col: ['#a992ff', '#e8e0ff'], note: '風が強まれば隊列は保てません。催しの上空では、風速5m/s以上の場合は飛行を中止することが必要とされています。' },
  // 最後に置く。文字が指定されていないときは順番から外れる（dshowFigN）
  { id: 'custom', name: 'あなたの文字', col: ['#ffc7e8', '#bfe4ff'], note: 'いま出ている文字は、あなたがこの場で指定したものです。実際のショーでも、飛ばす前にこの配置を作って全機に読み込ませます。教則は自動操縦を「プログラムにより自動的に操縦を行うこと」としています。機数は決まっているので、文字が多いほど1文字あたりに使える機体は減ります。' },
];
const dshowFigN = () => DSHOW_FIGS.length - (dshow.text ? 0 : 1);   /* 文字が無ければ「あなたの文字」を飛ばす */
function dshowShape(id, n, out) {
  const put = (i, x, y, z) => { out[i * 3] = x; out[i * 3 + 1] = y + DSHOW_H; out[i * 3 + 2] = z; };
  if (id === 'grid') {
    const cols = Math.max(2, Math.round(Math.sqrt(n * 1.6))), rows = Math.ceil(n / cols);   /* 横長の格子。端数が出ると最終行だけ欠けて左に寄って見える */
    for (let i = 0; i < n; i++) { const c = i % cols, r = (i / cols) | 0;
      put(i, (c / (cols - 1) - 0.5) * DSHOW_R * 2.0, (r / Math.max(1, rows - 1) - 0.5) * DSHOW_R * 1.1, 0); }
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
    // ショー機の平面図: プロペラガードの輪4つ + 十字のアーム + 中央の胴（手前の1機と同じ形）
    const per = Math.floor(n * 0.16), arm = Math.floor(n * 0.06), rest = n - per * 4 - arm * 4;
    let i = 0; const rr = DSHOW_R * 0.44, off = DSHOW_R * 0.56;
    for (let q = 0; q < 4; q++) {
      const cx = (q === 0 || q === 3 ? 1 : -1) * off, cy = (q < 2 ? 1 : -1) * off;
      for (let j = 0; j < per; j++) { const a = (j / per) * Math.PI * 2; put(i++, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 0); }
      for (let j = 0; j < arm; j++) { const t = 0.20 + (j / Math.max(1, arm - 1)) * 0.70; put(i++, cx * t, cy * t, 0); }
    }
    for (let j = 0; j < rest; j++) { const a = j * 2.399963, r = DSHOW_R * 0.21 * Math.sqrt((j + 0.5) / rest); put(i++, Math.cos(a) * r, Math.sin(a) * r, 0); }   /* 黄金角で並べると渦の筋が出ずに一様な円板になる */
  } else if (id === 'custom' || id.slice(0, 5) === 'text:') {
    const t = (id === 'custom' ? dshow.text : id.slice(5)) || '　';
    dshowFromCanvas((c, W2, H2) => {
      c.textAlign = 'center'; c.textBaseline = 'middle';
      let fs = Math.round(H2 * 0.80);   /* 幅に収まるまで小さくする。文字数で自動的に決まる */
      for (; fs > 10; fs -= 2) { c.font = DSHOW_FONT(fs); if (c.measureText(t).width <= W2 - 24) break; }
      c.fillText(t, W2 / 2, H2 * 0.52);
    }, n, out, { w: 560, h: 190, fit: true });
  } else {   // sphere: フィボナッチ球
    const g = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) { const y = 1 - (i / (n - 1)) * 2, r = Math.sqrt(Math.max(0, 1 - y * y)), a = g * i;
      put(i, Math.cos(a) * r * DSHOW_R, y * DSHOW_R, Math.sin(a) * r * DSHOW_R); }
  }
}
// Canvas に描いた形の内側から n 点を取る。文字も塗りつぶしの図形も、これ一つで作れる
const _dsCv = { el: null, ctx: null };
function dshowFromCanvas(draw, n, out, opts) {
  const o = opts || {}, W2 = o.w || 220, H2 = o.h || 140, S1 = o.scale || (DSHOW_R * 2 / W2);
  if (!_dsCv.el) { _dsCv.el = document.createElement('canvas'); _dsCv.ctx = _dsCv.el.getContext('2d', { willReadFrequently: true }); }
  const cv = _dsCv.el, c = _dsCv.ctx;
  cv.width = W2; cv.height = H2;
  c.fillStyle = '#000'; c.fillRect(0, 0, W2, H2); c.fillStyle = '#fff';
  draw(c, W2, H2);
  const px = c.getImageData(0, 0, W2, H2).data, cand = [];
  let x0 = W2, x1 = -1, y0 = H2, y1 = -1;
  for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) if (px[(y * W2 + x) * 4] > 120) {
    cand.push(x + y * W2); if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (cand.length < 24) { for (let i = 0; i < n; i++) { out[i * 3] = 0; out[i * 3 + 1] = DSHOW_H; out[i * 3 + 2] = 0; } return false; }
  // 描いた絵の外接矩形を、いま画面に入る広さに合わせる。文字数が変わっても画面上の大きさが揃う
  let sc = S1, cx = W2 / 2, cy = H2 / 2;
  if (o.fit) { const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
    sc = Math.min(2 * dshow.fitX * 0.94 / bw, 2 * dshow.fitY * 0.84 / bh); cx = (x0 + x1) / 2; cy = (y0 + y1) / 2; }
  // 無作為に選ぶと縁がぼろぼろになり濃淡の斑も出る。格子のます目ごとに1点ずつ選んで均す
  const g = Math.max(1, Math.sqrt(cand.length / n)), gw = Math.max(1, Math.ceil((x1 - x0 + 1) / g));
  const cell = new Map();
  for (const kk of cand) {
    const x = kk % W2, y = (kk / W2) | 0;
    const ci = ((y - y0) / g | 0) * gw + ((x - x0) / g | 0);
    const e = cell.get(ci); if (e === undefined) cell.set(ci, kk); else if (((kk * 2654435761) % 97) < 24) cell.set(ci, kk);
  }
  const pick = [...cell.values()];
  for (let i = pick.length; i < n; i++) pick.push(cand[(i * 7919) % cand.length]);   /* 足りないぶんは元の候補から足す */
  for (let i = pick.length - 1; i > 0; i--) { const j = (Math.sin(i * 12.9898) * 43758.5453 % 1 + 1) % 1 * (i + 1) | 0; const t = pick[i]; pick[i] = pick[j]; pick[j] = t; }
  for (let i = 0; i < n; i++) {
    const k = pick[i % pick.length], x = k % W2, y = (k / W2) | 0;
    const jx = (Math.sin(i * 7.13) * 0.35) * g, jy = (Math.cos(i * 5.71) * 0.35) * g;   /* ます目の中で少しだけ散らす */
    out[i * 3] = (x + 0.5 + jx - cx) * sc;
    out[i * 3 + 1] = DSHOW_H - (y + 0.5 + jy - cy) * sc;
    out[i * 3 + 2] = 0;
  }
  return true;
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

// ---------- どの機体がどこへ行くか ----------
// 番号順のまま結ぶと経路が何度も交差して、移り変わりが糸くずのように見える。
// 空間充填曲線（ヒルベルト曲線）で両方の図形を並べ替え、同じ順位どうしを結ぶと、
// 近い者どうしが対応して総移動距離が大きく減る。そのあと近傍だけ入れ替えて交差を削る。
const _hN = 256;
function hilbertD(x, y) {
  let d = 0;
  for (let s = _hN >> 1; s > 0; s >>= 1) {
    const rx = (x & s) > 0 ? 1 : 0, ry = (y & s) > 0 ? 1 : 0;
    d += s * s * ((3 * rx) ^ ry);
    if (ry === 0) { if (rx === 1) { x = _hN - 1 - x; y = _hN - 1 - y; } const t = x; x = y; y = t; }
  }
  return d;
}
function dshowOrder(arr, n, keys, ord) {
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, z0 = 1e9, z1 = -1e9;
  for (let i = 0; i < n; i++) { const x = arr[i * 3], y = arr[i * 3 + 1], z = arr[i * 3 + 2];
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; if (z < z0) z0 = z; if (z > z1) z1 = z; }
  const sx = (x1 - x0) > 1e-6 ? (_hN - 1) / (x1 - x0) : 0, sy = (y1 - y0) > 1e-6 ? (_hN - 1) / (y1 - y0) : 0, sz = (z1 - z0) > 1e-6 ? 7 / (z1 - z0) : 0;
  for (let i = 0; i < n; i++) keys[i] = hilbertD(Math.round((arr[i * 3] - x0) * sx), Math.round((arr[i * 3 + 1] - y0) * sy)) * 8 + Math.round((arr[i * 3 + 2] - z0) * sz);
  for (let i = 0; i < n; i++) ord[i] = i;
  ord.sort((a, b) => keys[a] - keys[b]);
}
function dshowAssign(from, raw, out, n) {
  const perm = dshow.perm, ordA = dshow.ordA;
  dshowOrder(from, n, dshow.keyA, ordA);
  dshowOrder(raw, n, dshow.keyB, dshow.ordB);
  for (let k = 0; k < n; k++) perm[ordA[k]] = dshow.ordB[k];
  // 交差の削り取り。曲線の上で近い者どうしだけ試す（遠い相手を試しても当たらないので、その分は無駄になる）
  const d2 = (i, p) => { const dx = from[i * 3] - raw[p * 3], dy = from[i * 3 + 1] - raw[p * 3 + 1], dz = from[i * 3 + 2] - raw[p * 3 + 2]; return dx * dx + dy * dy + dz * dz; };
  for (let pass = 0; pass < 3; pass++) {
    for (let k = 0; k < n; k++) {
      const i = ordA[k];
      for (let w = 1; w <= 7; w++) {
        const k2 = k + w; if (k2 >= n) break;
        const j = ordA[k2], pi = perm[i], pj = perm[j];
        if (d2(i, pj) + d2(j, pi) < d2(i, pi) + d2(j, pj) - 1e-9) { perm[i] = pj; perm[j] = pi; }
      }
    }
  }
  for (let i = 0; i < n; i++) { const p = perm[i]; out[i * 3] = raw[p * 3]; out[i * 3 + 1] = raw[p * 3 + 1]; out[i * 3 + 2] = raw[p * 3 + 2]; }
}
// 出発の遅れを「場所」で決める。全機が同時に動くと壁が動くように見えるが、
// 端から順に動き出すと隊列が波のように崩れて、次の形へほどけていく
function dshowWipe(from, lag, n, fig) {
  const a = fig * 2.399963, wx = Math.cos(a), wy = Math.sin(a);   /* 黄金角ずつ向きを変える。毎回同じ向きだと単調になる */
  let lo = 1e9, hi = -1e9;
  for (let i = 0; i < n; i++) { const s = from[i * 3] * wx + from[i * 3 + 1] * wy; if (s < lo) lo = s; if (s > hi) hi = s; }
  const k = (hi - lo) > 1e-6 ? 1 / (hi - lo) : 0;
  for (let i = 0; i < n; i++) {
    const s = (from[i * 3] * wx + from[i * 3 + 1] * wy - lo) * k;
    lag[i] = clamp(s * DSHOW_LAG + (dshow.rnd[i] * 0.5 + 0.5) * DSHOW_LAG * 0.24, 0, 0.74);   /* 少しだけ散らす。直線の境目が見えないように */
  }
}
// 色は番号ではなく位置で決める。番号で散らすと砂嵐、位置で流すと「一つの図形」に見える
function dshowSetColor(fi, pos, out, n) {
  const f = DSHOW_FIGS[fi], a = new THREE.Color(f.col[0]), b = new THREE.Color(f.col[1]), c = new THREE.Color();
  const ang = fi * 1.1 + 0.6, ux = Math.cos(ang), uy = Math.sin(ang);
  let lo = 1e9, hi = -1e9;
  for (let i = 0; i < n; i++) { const s = pos[i * 3] * ux + pos[i * 3 + 1] * uy; if (s < lo) lo = s; if (s > hi) hi = s; }
  const k = (hi - lo) > 1e-6 ? 1 / (hi - lo) : 0;
  for (let i = 0; i < n; i++) {
    const s = (pos[i * 3] * ux + pos[i * 3 + 1] * uy - lo) * k;
    c.copy(a).lerp(b, clamp(s + dshow.rnd[i] * 0.07, 0, 1));
    out[i * 3] = c.r; out[i * 3 + 1] = c.g; out[i * 3 + 2] = c.b;
  }
}

// ---------- 作る ----------
function dshowBuild() {
  if (dshow.pts) return;
  const n = dshow.n = DSHOW_N();
  dshow.from = new Float32Array(n * 3); dshow.to = new Float32Array(n * 3); dshow.raw = new Float32Array(n * 3);
  dshow.colFrom = new Float32Array(n * 3); dshow.colTo = new Float32Array(n * 3);
  dshow.lag = new Float32Array(n); dshow.rnd = new Float32Array(n); dshow.bright = new Float32Array(n);
  dshow.perm = new Uint32Array(n); dshow.ordA = new Uint32Array(n); dshow.ordB = new Uint32Array(n);
  dshow.nextTo = new Float32Array(n * 3); dshow.nextCol = new Float32Array(n * 3); dshow.nextLag = new Float32Array(n); dshow.nextFig = -1;
  dshow.keyA = new Float64Array(n); dshow.keyB = new Float64Array(n);
  for (let i = 0; i < n; i++) { dshow.rnd[i] = Math.random() * 2 - 1; dshow.bright[i] = 0.80 + Math.random() * 0.40; }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(dshow.from, 3));   /* 出発点。行き先は aTo で渡し、途中はシェーダが作る */
  geo.setAttribute('aTo', new THREE.BufferAttribute(dshow.to, 3));
  geo.setAttribute('aColA', new THREE.BufferAttribute(dshow.colFrom, 3));
  geo.setAttribute('aColB', new THREE.BufferAttribute(dshow.colTo, 3));
  geo.setAttribute('aLag', new THREE.BufferAttribute(dshow.lag, 1));
  geo.setAttribute('aRnd', new THREE.BufferAttribute(dshow.rnd, 1));
  geo.setAttribute('bright', new THREE.BufferAttribute(dshow.bright, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, DSHOW_H, 0), DSHOW_R * 2);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uSize: { value: DSHOW_GLOW }, uPxPerM: { value: 900 }, uGain: { value: 1 },
      uProg: { value: 1 }, uTime: { value: 0 }, uWave: { value: 1 }, uSkew: { value: 0 },
    },
    // 位置と色は頂点シェーダで作る。CPU は図形が変わる瞬間しか働かない
    vertexShader: `
      attribute vec3 aTo, aColA, aColB;
      attribute float aLag, aRnd, bright;
      uniform float uSize, uPxPerM, uProg, uTime, uWave, uSkew;
      varying vec3 vCol; varying float vB;
      void main() {
        float u = clamp((uProg + aRnd * uSkew - aLag) / max(0.10, 1.0 - aLag), 0.0, 1.0);   // uSkew: わざと時計をずらして、形が崩れるのを見せる
        float e = u * u * (3.0 - 2.0 * u);          // なめらかに出て、なめらかに止まる
        vec3 p = mix(position, aTo, e);
        vec3 d = aTo - position; float L = length(d);
        if (L > 1e-4 && uWave > 0.5) {              // まっすぐ飛ばず、機体ごとに向きの違う弧を描く
          vec3 ax = normalize(cross(d / L, vec3(0.0, 0.0, 1.0)) + vec3(0.0, 1e-3, 0.0));
          p += ax * (sin(3.14159265 * e) * 0.15 * L * aRnd);
        }
        float ph = aRnd * 31.4 + aLag * 12.0;       // 静止中も1機ずつわずかに位置を保ち直している
        p += uWave * 0.010 * vec3(sin(uTime * 1.30 + ph), sin(uTime * 1.07 + ph * 1.7), sin(uTime * 0.83 + ph * 2.3));
        vCol = mix(aColA, aColB, e);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float dist = max(-mv.z, 0.05);
        // 明るさは「値」ではなく「半径」で表す。gl_PointSize は画角を見ないので、自分で1mあたりの画素数を渡す
        float ideal = uSize * pow(bright, 0.42) * uPxPerM / dist;
        float px = clamp(ideal, 2.3, 62.0);         // 2px を切ると点が明滅する。上限は一部の GPU の上限(64px)の手前
        vB = min(bright * (ideal * ideal) / (px * px), 6.0);   // 広げたぶん暗く、詰めたぶん明るく。光の総量は変えない
        gl_PointSize = px;
        gl_Position = projectionMatrix * mv;
      }`,
    // 芯（すぐ白に飽和する）と裾（ガウシアンより遅く落ちる）の2層。裾のほうが「明るさ」に見える
    fragmentShader: `
      varying vec3 vCol; varying float vB; uniform float uGain;
      void main() {
        vec2 q = gl_PointCoord - 0.5;
        float d2 = dot(q, q);
        float core = exp(-d2 * 30.0);
        float halo = 0.075 / (1.0 + 52.0 * d2);
        float mask = 1.0 - smoothstep(0.16, 0.25, d2);   // discard は使わない（タイル方式の GPU で遅くなる）
        vec3 col = mix(vCol, vec3(1.0), core * 0.86);
        gl_FragColor = vec4(col * (core + halo) * mask * vB * uGain, 1.0);   // 加算合成では RGB に alpha が掛かるので alpha は 1 のまま
      }`,
    transparent: true, depthWrite: false, depthTest: true,
    blending: THREE.AdditiveBlending, toneMapped: false,
  });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = 6;
  pts.userData.noPart = pts.userData.noPick = pts.userData.noShadow = pts.userData.noAO = true;
  pts.visible = false; scene.add(pts);
  dshow.geo = geo; dshow.mat = mat; dshow.pts = pts;
  dshow.fig = 0;
  dshowShape(DSHOW_FIGS[0].id, n, dshow.to); dshow.from.set(dshow.to);
  dshowSetColor(0, dshow.to, dshow.colTo, n); dshow.colFrom.set(dshow.colTo);
  for (let i = 0; i < n; i++) dshow.lag[i] = 0;
  dshowUpload();
}
function dshowUpload() {
  for (const k of ['position', 'aTo', 'aColA', 'aColB', 'aLag']) dshow.geo.attributes[k].needsUpdate = true;
}
// 画面の広さと画素密度から、1m が何画素になるかを出す（点の大きさはこれで決まる）
function dshowPixels() {
  const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  dshow.mat.uniforms.uPxPerM.value = (H * DPR) / (2 * tanV);
  // ブルームは無いので、光の飽和はトーンマッピングに任せる。中間バッファが 8bit の環境では 1 を超えた分が消えるので抑える
  dshow.mat.uniforms.uGain.value = (HF && !Q.direct) ? 2.6 : 1.15;
}

// ---------- 画の決め方 ----------
// 隊列は画面の「見える帯」いっぱいに入れる。縦長の画面では説明カードが下半分を覆うので、
// 帯の狭さと横幅の狭さの両方から距離を出す。倍率で縮めると、機数を増やしても小さく見えるだけになる
const _dv1 = new THREE.Vector3(), _dv2 = new THREE.Vector3(), _dv3 = new THREE.Vector3();
// ショーを写せる範囲を画面座標で返す。説明カードが下半分を覆うなら上へ、
// 左に寄った小さなカードなら右へ逃がす。倍率で縮めるより、空いている側を使うほうが大きく見せられる
function dshowRect() {
  if (!narrow()) return null;   /* 広い画面は engine 側が右のパネルぶんを寄せている。そのまま使う */
  const iw = innerWidth, ih = innerHeight;
  let x0 = 0, x1 = iw, y0 = 0, y1 = ih;
  const tb = $('#topbar');
  if (tb && !tb.hidden) { const q = tb.getBoundingClientRect(); if (q.height > 4 && q.bottom < ih * 0.3) y0 = q.bottom + 6; }
  const dock = $('#dock');
  if (dock && !dock.hidden) { const q = dock.getBoundingClientRect(); if (q.height > 4) y1 = Math.min(y1, q.top - 6); }
  for (const sel of ['#dshowPanel', '#noteCard']) {
    const card = $(sel); if (!card || card.hidden) continue;
    if (sel === '#dshowPanel' && !card.classList.contains('open')) continue;
    const q = card.getBoundingClientRect();
    if (q.height > 40) {
      if (q.width > iw * 0.66) y1 = Math.min(y1, q.top - 6);                 // 全幅のシート: 上へ逃げる
      else if (q.right < iw * 0.55) x0 = Math.max(x0, q.right + 10);         // 左に寄ったカード: 右へ逃げる
      else x1 = Math.min(x1, q.left - 10);
    }
  }
  if (x1 - x0 < iw * 0.34) { x0 = 0; x1 = iw; }                              // 逃げ場がないときは全幅に戻す
  if (y1 - y0 < ih * 0.26) y1 = y0 + ih * 0.26;
  return { x0, x1, y0, y1, w: (x1 - x0) / iw, h: (y1 - y0) / ih, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}
function dshowFrame(ms) {
  const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const R = dshowRect(), asp = Math.max(0.40, camera.aspect);
  const wF = R ? R.w : 1, hF = R ? R.h : 1;
  if (R) { camera.setViewOffset(innerWidth, innerHeight, innerWidth / 2 - R.cx, innerHeight / 2 - R.cy, innerWidth, innerHeight); camera.updateProjectionMatrix(); }
  // カメラを引くと天球（半径16m）の外に出て空が黒いドームになる。距離は固定して隊列のほうを伸縮させる
  const fit = DSHOW_CAM * tanV * Math.min(hF, asp * wF) / 1.06;
  let k = clamp(fit / DSHOW_R, 0.34, 1.00);   /* 大きくしすぎると低い機体が地平線より下へ落ちる */
  // 地上のものを見せるレイヤーでは、地面から隊列の上端までを1枚に入れる。
  // カメラは引けない（天球の外に出る）ので、ショー全体を地面を基点に縮める
  const gz = dshow.gzWant ? 1 : 0;
  if (gz) k = Math.min(k, (DSHOW_CAM * tanV * hF * 2 * 0.92) / (DSHOW_H + DSHOW_R));
  dshow.kWant = k; dshow.dist = DSHOW_CAM; dshow.sig = R ? `${Math.round(R.x0)},${Math.round(R.x1)},${Math.round(R.y0)},${Math.round(R.y1)}` : 'wide';
  if (dshow.k == null || reduceMotion) dshow.k = k;   /* 初回と「動きを減らす」設定は、その場で合わせる */
  // 円の図形は縦横どちらかで頭打ちになるが、横長の図形（文字や整列）は余った側を使える。
  // 隊列の座標系で「いま画面に入る半分の幅・高さ」を控えておく
  dshow.fitX = DSHOW_CAM * tanV * (asp * wF) / k; dshow.fitY = DSHOW_CAM * tanV * hF / k;
  dshowApplyK();
  // 見上げる高さ。地上を含めるときは、地面から隊列の上端までの真ん中を見る
  const aimY = gz ? k * (DSHOW_H + DSHOW_R) / 2 : DSHOW_H;
  const eyeY = gz ? Math.max(0.75, aimY * 0.55) : DSHOW_EYE;
  const dy = aimY - eyeY, hz = Math.sqrt(Math.max(0.5, DSHOW_CAM * DSHOW_CAM - dy * dy));
  const eye = new THREE.Vector3(0.2874 * hz, eyeY, 0.9578 * hz), aim = new THREE.Vector3(0, aimY, 0);   /* 正面から少し右に寄って見上げる */
  dshowPlaceBody(eye, aim, tanV, asp * wF, hF);
  controls.maxDistance = Math.max(controls.maxDistance, DSHOW_CAM * 1.06);
  flyTo(eye, aim, ms, false);
}
// 隊列の倍率と高さの当てはめ。gz=1 のときは地面を基点に縮める（地上のものが画面に入る）
function dshowApplyK() {
  const k = dshow.k;
  if (dshow.pts) { dshow.pts.scale.setScalar(k); dshow.pts.position.y = DSHOW_H * (1 - k) * (1 - dshow.gz); }
  if (dshow.mat) dshow.mat.uniforms.uSize.value = DSHOW_GLOW * k;   /* 光の玉も一緒に縮める。画面上の見え方を揃えるため */
  if (typeof dsysLayout === 'function') dsysLayout();
}
// 手前の1機は「観客のすぐ前を飛んでいる1機」。カメラからの距離で置くので、
// 画面が変わっても同じ大きさに写る。隊列と重なっても手前なので前後は正しく出る
function dshowPlaceBody(eye, aim, tanV, wF, hF) {
  // 見える帯が狭いほど遠くに置く。そうしないと縦長の画面で手前の1機が隊列を覆ってしまう
  const near = clamp(2.85 / Math.max(0.2, Math.min(hF, wF)), 2.6, 7.5), hh = near * tanV;
  _dv1.copy(aim).sub(eye).normalize();
  _dv2.crossVectors(_dv1, UP).normalize();
  _dv3.crossVectors(_dv2, _dv1).normalize();
  const p = eye.clone().addScaledVector(_dv1, near).addScaledVector(_dv2, hh * wF * 0.60).addScaledVector(_dv3, -hh * hF * 0.76);   /* 隅に寄せる。文字は横いっぱいに広がるので、真ん中寄りだと隊列の上に乗る */
  dshow.bodyPos = [p.x, Math.max(0.5, p.y), p.z];
  dshow.bodyYaw = Math.atan2(eye.x - p.x, eye.z - p.z) + 0.6;
}

// ---------- 入口 ----------
function dshowOn(on) {
  on = !!on;
  if (on === dshow.on) return;
  if (on) {
    stopOthers('dshow');
    dshowBuild();
    dshow.on = true; dshow.t = 0; dshow.fig = 0; dshow.figT = 0; dshow.phase = 'hold'; dshow.star = 0; dshow.lastVals = 0;
    dshow.forceFig = -1; dshow.askText = false; dshowUIOn(true);
    dshow.text = (store.get('dshowText') || '').slice(0, 12);
    dshow.mini = narrow();   /* スマホは説明カードが画面の半分を占める。畳んだ状態で始めて、読みたい人が開く */
    dshow.mat.uniforms.uProg.value = 1;
    document.body.classList.add('dshow'); syncDockH();   /* 操作列を畳んで夜空を広くとる */
    $('#coach').hidden = true;   /* 見ている最中に問いかけを割り込ませない */
    dshow.saved = { power: S.power, labels: S.labelsSuppressed, air: S.air };
    S.labelsSuppressed = true; buildLabels();
    S.air = false; for (const x of $$('.tgl[data-t=air]')) { x.classList.remove('on'); x.setAttribute('aria-pressed', 'false'); }
    if (S.explode > 0.02) setExplode(0); if (S.mode === 'cut') setMode('normal');
    dshow.pts.visible = true; dshowPixels();
    farGroundOn(true);
    if (S.power === 0) setPower(0.5, true);
    // 手前の1機はショー専用機に差し替える。カメラも灯りも積まず、機体と同じくらいの光を抱えた別の機体
    setBodyMode('theater'); showDroneOn(true);
    dshowFrame(1100);
    const bp = dshow.bodyPos;
    body.px = bp[0]; body.py = bp[1]; body.pz = bp[2]; body.tx = body.tz = body.wx = body.wz = 0; body.yaw = dshow.bodyYaw; body.mult = [1, 1, 1, 1];
    dshowSky();
    renderDshow();
    { const b = (narrow() ? $('#dsRead') : null) || $('#noteCard .note-actions button'); if (b) b.focus({ preventScroll: true }); }   /* 押したボタンは畳まれて消えるので、行き先を渡す */
    if (!store.get('dshowSeen')) { store.set('dshowSeen', '1'); showToast('図形は自動で切り替わります。1機ずつ操縦しているのではありません', 4600); }
  } else {
    dshow.on = false; dshowUIOn(false);
    document.body.classList.remove('dshow'); syncDockH();
    if (dshow.pts) dshow.pts.visible = false;
    showDroneOn(false);
    const s = dshow.saved || {};
    S.labelsSuppressed = !!s.labels; buildLabels();
    S.air = !!s.air; for (const x of $$('.tgl[data-t=air]')) { x.classList.toggle('on', S.air); x.setAttribute('aria-pressed', String(S.air)); }
    if (!(typeof fpv === 'object' && fpv.on)) farGroundOn(false);
    { const u = backdropMat.uniforms; u.uStar.value = 0; u.uCloud.value = 0; u.uWall.value = 0; u.uHaze.value = 0; }   /* 星だけ戻しても、夜の雲とかすみが昼の空に残る */
    if (typeof weather === 'object' && weather.on) weatherSky(); else applyTheme();
    body.px = body.pz = 0; body.py = 0; body.tx = body.tz = 0; body.yaw = 0;
    if (s.power === 0 && S.power > 0) setPower(0, true);
    setBodyMode('idle'); syncBodyMode();
    if ($('#noteCard').dataset.kind === 'dshow') renderNote(null);
    camHome();
    { const b = $('#showBtn'); if (b) b.focus({ preventScroll: true }); }
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
  D.parts.filter(p => p.key === 'led').forEach(p => { if (p.obj.userData.halo) p.obj.userData.halo.material.opacity = 0.42; });
  farGroundTheme(new THREE.Color(1.25, 1.3, 1.6));   /* 夜は遠くをほんの少しだけ持ち上げる。上げすぎると地面が昼のように光る */
  if (dshow.mat) dshowPixels();
  S.shadowDirty = S.csDirty = S.aoDirty = true;
}

// 次の図形の下ごしらえ。対応づけは機数に比例して重い（3200機で15ms前後）ので、
// 静止している間に済ませておく。動き出す瞬間にやると、そこだけ画が飛ぶ
function dshowPrepare() {
  const n = dshow.n, fi = dshow.forceFig >= 0 ? dshow.forceFig : (dshow.fig + 1) % dshowFigN();
  if (dshow.nextFig === fi) return;
  dshowShape(DSHOW_FIGS[fi].id, n, dshow.raw);
  dshowAssign(dshow.to, dshow.raw, dshow.nextTo, n);   /* 静止中の位置＝いまの行き先 */
  dshowSetColor(fi, dshow.nextTo, dshow.nextCol, n);
  dshowWipe(dshow.to, dshow.nextLag, n, fi);
  dshow.nextFig = fi;
}
// 次の図形へ。位置と色の「行き先」を差し替えるだけで、あとはシェーダが動かす
function dshowAdvance() {
  const n = dshow.n;
  dshowPrepare();
  dshow.from.set(dshow.to); dshow.colFrom.set(dshow.colTo);
  dshow.fig = dshow.nextFig;
  dshow.to.set(dshow.nextTo); dshow.colTo.set(dshow.nextCol); dshow.lag.set(dshow.nextLag);
  dshow.nextFig = -1; dshow.forceFig = -1;
  dshowUpload();
  dshow.phase = 'move'; dshow.figT = 0; dshow.mat.uniforms.uProg.value = 0;
  if (typeof dsysRefresh === 'function') dsysRefresh();
  showDroneColor(DSHOW_FIGS[dshow.fig].col[0]);
  renderDshow();
}

// 指定した図形へ飛ぶ（文字を描いたときに使う）
function dshowGoto(fi) {
  if (!dshow.on) return;
  dshow.nextFig = -1; dshow.forceFig = fi;
  if (dshow.phase === 'hold') dshowAdvance(); else dshow.figT = DSHOW_MOVE;   /* 移動中なら着いてすぐ次へ */
}
// 好きな文字を描く。描けるかどうかは実際に点を作ってみないと分からない（絵文字などは拾えないことがある）
function dshowSetText(t) {
  t = (t || '').replace(/\s+/g, ' ').trim().slice(0, 12);
  if (!t) { dshow.text = ''; store.set('dshowText', ''); dshow.askText = false; if (dshow.fig === DSHOW_FIGS.length - 1) dshow.fig = 0; renderDshow(true); return false; }
  const probe = new Float32Array(48 * 3);
  const prev = dshow.text; dshow.text = t;
  const ok = dshowFromCanvas((c, W2, H2) => {
    c.textAlign = 'center'; c.textBaseline = 'middle';
    let fs = Math.round(H2 * 0.80);
    for (; fs > 10; fs -= 2) { c.font = DSHOW_FONT(fs); if (c.measureText(t).width <= W2 - 24) break; }
    c.fillText(t, W2 / 2, H2 * 0.52);
  }, 48, probe, { w: 560, h: 190, fit: true });
  if (!ok) { dshow.text = prev; showToast('その文字は光の点にできませんでした。ひらがな・漢字・英数字でお試しください', 4200); return false; }
  store.set('dshowText', t);
  dshow.askText = false;
  renderDshow(true);
  dshowGoto(DSHOW_FIGS.length - 1);
  return true;
}

// ---------- 毎フレーム ----------
function stepDshow(dtReal) {
  if (!dshow.on) return;
  dshow.t += dtReal; dshow.figT += dtReal;
  dshow.star += (1 - dshow.star) * (1 - Math.exp(-dtReal / 1.6));
  backdropMat.uniforms.uStar.value = dshow.star;
  backdropMat.uniforms.uT.value = dshow.t;
  const u = dshow.mat.uniforms;
  if (dshow.phase === 'move') {
    const p = dshow.figT / DSHOW_MOVE;
    if (p >= 1) { dshow.phase = 'hold'; dshow.figT = 0; u.uProg.value = 1; }
    else u.uProg.value = p;
  } else if (dshow.figT > DSHOW_HOLD && dshow.auto && !reduceMotion) { dshowAdvance(); }
  else if (dshow.phase === 'hold' && dshow.figT > 0.5 && dshow.nextFig < 0) { dshowPrepare(); }   /* 静止に入ってひと呼吸おいてから、次の図形を用意する */
  u.uTime.value = dshow.t;
  u.uWave.value = reduceMotion ? 0 : 1;
  { const a = reduceMotion ? 1 : 1 - Math.exp(-dtReal / 0.22);
    const dk = dshow.kWant - dshow.k, dg = dshow.gzWant - dshow.gz;
    if (Math.abs(dk) > 1e-4 || Math.abs(dg) > 1e-4) { dshow.k += dk * a; dshow.gz += dg * a; dshowApplyK(); }
    else if (dshow.k !== dshow.kWant) { dshow.k = dshow.kWant; dshow.gz = dshow.gzWant; dshowApplyK(); } }
  stepDsys(dtReal);
  // 手前の1機もホバリングらしく、わずかに上下する
  if (body.mode !== 'theater') setBodyMode('theater');   /* 何かの拍子に free へ戻っても、隊列の画は崩さない */
  const bp = dshow.bodyPos || [1.6, 1.9, 5.4];
  body.px = bp[0]; body.pz = bp[2];
  body.py = bp[1] + (reduceMotion ? 0 : Math.sin(dshow.t * 1.3) * 0.020);
  body.yaw = dshow.bodyYaw || 0;
  if (!reduceMotion) { body.tz = Math.sin(dshow.t * 0.9) * 0.012; body.tx = Math.sin(dshow.t * 1.1 + 2) * 0.010; }
  // 説明カードの高さは開いたあとに決まる。見える帯が変わったら画を取り直す
  if (dshow.t - dshow.lastBand > 0.4) {
    dshow.lastBand = dshow.t;
    const R = dshowRect(), sig = R ? `${Math.round(R.x0)},${Math.round(R.x1)},${Math.round(R.y0)},${Math.round(R.y1)}` : 'wide';
    if (sig !== dshow.sig) dshowFrame(420);
  }
  if (dshow.t - dshow.lastVals > 0.25) { dshow.lastVals = dshow.t; updateDshowVals(); }
}

// ---------- 説明カード ----------
// つぎの図形へ（自動送りと同じ手順。動きを減らす設定の人はこれで進める）
function dshowNext() {
  if (!dshow.on || dshow.phase !== 'hold') return;
  dshowAdvance();
  if (reduceMotion) { dshow.phase = 'hold'; dshow.figT = 0; dshow.mat.uniforms.uProg.value = 1; }
}
function updateDshowVals() {
  const el = $('#dshowVals'); if (!el || $('#noteCard').hidden) return;
  const f = DSHOW_FIGS[dshow.fig];
  el.innerHTML = `<i class="dot" aria-hidden="true"></i><span>いま <b>${f.name}</b></span><span>${dshow.n} 機</span><span>高さ ${DSHOW_H.toFixed(1)} m</span><span>${dshow.phase === 'move' ? '移動中' : '静止中'}</span>${dshow.auto ? '' : '<span>自動送り 止</span>'}${dsUI.pick ? `<span>しくみ${(DSHOW_HOW.find(h => h.id === dsUI.pick) || {}).no || ''}</span>` : ''}`;
}
function renderDshow(rebuild) {
  if (!dshow.on) return;
  const card = $('#noteCard');
  if (card.hidden && card.dataset.kind === 'dshow') return;   /* 一度閉じたら、図形が変わっても開き直さない */
  const f = DSHOW_FIGS[dshow.fig];
  // 図形が変わるたびに作り直すと、制度の折りたたみが閉じてしまう。変わるところだけ差し替える
  if (!rebuild && card.dataset.kind === 'dshow' && $('#dshowBody')) {
    $('#dshowBody').innerHTML = f.note; $('#noteBadge').textContent = f.name; updateDshowVals(); return;
  }
  renderNote({
    kind: 'dshow', title: '夜のドローンショー', badge: f.name, mini: true, miniOn: dshow.mini,
    html: `<div id="dshowVals" class="vals live" aria-live="off"><i class="dot" aria-hidden="true"></i></div>
      ${dshowTextHtml()}
      <p id="dshowBody" aria-live="off">${f.note}</p>
      ${dshowCraftHtml()}
      ${dshowRegHtml()}`,
    actions: [{ label: '文字を描く', fn: () => dshowToggleText() }, { label: 'つぎの図形 ›', fn: () => dshowNext() }, { label: 'やめる', fn: () => dshowOn(false) }],
  });
  bindDshowText();
  updateDshowVals();
}
// 好きな文字の入力欄。畳んでいる間は隠れるので、押したら開く
function dshowTextHtml() {
  if (!dshow.askText) return '';
  const v = (dshow.text || '').replace(/"/g, '&quot;');
  return `<form id="dshowText" class="ds-text"><input type="text" maxlength="12" inputmode="text" enterkeyhint="go"
      aria-label="描く文字" placeholder="例: そつぎょう" value="${v}"><button type="submit">描く</button></form>
    <p class="ds-hint">最大12文字。<b>文字が多いほど1文字あたりに使える機体が減ります</b>（いまは${dshow.n}機）。空にして「描く」を押すと元の6図形に戻ります。</p>`;
}
function bindDshowText() {
  const f = $('#dshowText'); if (!f) return;
  const inp = f.querySelector('input');
  f.addEventListener('submit', e => { e.preventDefault(); inp.blur(); dshowSetText(inp.value); });
  inp.focus({ preventScroll: true });
}
function dshowToggleText(force) {
  dshow.askText = force == null ? !dshow.askText : !!force;
  if (dshow.askText && dshow.mini) setNoteMini(false);   /* 畳んだままだと入力欄が隠れる */
  renderDshow(true);
}
// 手前の1機について。主役機と何が違うのかを、見えているものと結びつける
function dshowCraftHtml() {
  return `<details><summary>手前の1機（ショー専用の機体）</summary>${dshowCraftBody()}</details>`;
}
function dshowCraftBody() {
  return `<ul class="check">
      <li><b>カメラもジンバルもありません。</b>代わりに、機体と同じくらい大きな灯りを下に抱えています。運ぶ荷物が「映像」から「光」に変わると、形はここまで変わります。</li>
      <li><b>脚がありません。</b>着地するのはプロペラを囲む輪の下縁です。決まった間隔の格子に並べて真上に上げ、同じ場所へ戻すので、脚をつける理由がありません。</li>
      <li><b>輪は安全のためでもあります。</b>教則は催し場所上空の飛行について、機体が第三者及び物件に接触した場合の<b>危害を軽減する構造</b>を用意していることが必要としています。何が該当するかまでは教則に書かれていません（国土交通省の審査要領は、危害を軽減する機能の例としてプロペラガードを挙げています）。</li>
      <li><b>小さく見えても100gは超えています。</b>屋外のショーで使われている機体は、最も軽いものでも249g、多くは500g台です。100グラム以上は1機ずつ登録して登録記号を表示するので、500機飛ばすなら500機分が対象になります。</li>
    </ul>
    <p class="hint">主役機（外形85cm・約2200g）に対して、この機体は外形31cm・約530g。横幅で約1/3、質量で約1/4です。寸法は国内で実際に使われている機体（外形31cm前後・全高11〜14cm・モーター間23〜26cm・5インチ級のプロペラ）に合わせています。</p>`;
}
// 制度。ショーは教則が「多数の者の集合する催し」の例に挙げている場面そのもの
function dshowRegHtml() {
  return `<details${regOn() && innerWidth > 760 ? ' open' : ''}><summary>この場面にかかわる制度（${DSHOW_REG.items.length}項目）</summary>
    <p class="caveat">${DSHOW_REG.lead}</p>
    <ul class="check">${DSHOW_REG.items.map(x => `<li>${x}</li>`).join('')}</ul>
    <p class="hint">${DSHOW_REG.outside}</p>
    <small class="ky-src">この教材の隊列は箱庭の広さに合わせて縮めています（実際のショーは数百〜数千機で、高度も桁が違います）／${DSHOW_REG.src}</small></details>`;
}
function onResizedDshow() { if (dshow.on) { dshowPixels(); dshowFrame(420); } }
function initDshow() {
  const b = $('#showBtn');
  if (b) b.addEventListener('click', () => dshowOn(!dshow.on));
  initDshowUI();
  window.__dshow = { dshow, dshowOn, dshowNext, dshowSetText, dshowToggleText, setNoteMini, DSHOW_FIGS, dshowShape, SD, DSHOW_H, DSHOW_R,
    // シェーダが作る位置を CPU 側でも同じ式で求める（検証用）
    sample: (i) => { const e0 = clamp((dshow.mat.uniforms.uProg.value - dshow.lag[i]) / Math.max(0.10, 1 - dshow.lag[i]), 0, 1), e = e0 * e0 * (3 - 2 * e0);
      return [0, 1, 2].map(k => dshow.from[i * 3 + k] + (dshow.to[i * 3 + k] - dshow.from[i * 3 + k]) * e); },
    skyUniforms: () => { const u = backdropMat.uniforms; return { star: u.uStar.value, cloud: u.uCloud.value, wall: u.uWall.value, haze: u.uHaze.value }; } };
}
