// 夜のドローンショーの検証
const log = []; const A = (c, ...m) => { if (!c) log.push('FAIL ' + m.join(' ')); };
const d = window.__d, DS = window.__dshow, ds = DS.dshow;
d.noRender = true; d.step(0.4, 30);
document.querySelector('#tabs [data-tab=fly]').click(); d.step(0.3, 30);
A(!!document.getElementById('showBtn'), '入口: ボタンがある');

// 始める
document.getElementById('showBtn').click(); d.step(1.2, 30);
A(ds.on && document.body.classList.contains('dshow'), '始まる');
A(ds.pts && ds.pts.visible && ds.n > 500, `${ds.n} 機の光点`);
A(DS.SD.built && DS.SD.root.visible && !d.D.root.visible, '手前の1機がショー専用機に替わる');
A(Math.abs(DS.SD.root.position.x - d.D.root.position.x) < 1e-4 && Math.abs(DS.SD.root.position.y - d.D.root.position.y) < 1e-4, 'ショー機は主役機と同じ姿勢で動く');
A(document.getElementById('noteCard').dataset.kind === 'dshow' && document.getElementById('dshowVals'), 'カードと数値');
A(d.body.mode === 'theater' && d.body.py > 0.2, '主役の1機が浮く', d.body.mode, d.body.py.toFixed(2));
A(document.getElementById('showBtn').getAttribute('aria-pressed') === 'true', 'ボタンが点く');

// 図形が順に変わる
{ const seen = new Set([DS.DSHOW_FIGS[ds.fig].id]); let moved = false;
  for (let i = 0; i < 200 && seen.size < 4; i++) { d.step(0.25, 30); seen.add(DS.DSHOW_FIGS[ds.fig].id); if (ds.phase === 'move') moved = true; }
  A(seen.size >= 4, '図形が次々に変わる', [...seen].join('/'));
  A(moved, '移り変わりの時間がある'); }

// 図形の形が実際に違う（同じ座標を返していない）
{ const n = 40, a = new Float32Array(n * 3), b = new Float32Array(n * 3);
  DS.dshowShape('ring', n, a); DS.dshowShape('star', n, b);
  let diff = 0; for (let i = 0; i < n * 3; i++) diff += Math.abs(a[i] - b[i]);
  A(diff > 1, '図形ごとに座標が違う', diff.toFixed(1));
  // どの図形も、点は隊列の広がりの中に収まる
  let maxR = 0; for (let i = 0; i < n; i++) maxR = Math.max(maxR, Math.hypot(b[i * 3], b[i * 3 + 1] - DS.DSHOW_H));
  A(maxR > 0.5 && maxR < 3.6, '図形は隊列の広がりに収まる', maxR.toFixed(2)); }

// 点がちゃんと動いている（動きは頂点シェーダが作るので、同じ式を CPU で回した値で見る）
{ while (ds.phase !== 'hold') d.step(0.2, 30); DS.dshowNext(); d.step(0.1, 30);
  const p0 = [0, 1, 2, 3].map(i => DS.sample(i));
  d.step(1.4, 30);
  const p1 = [0, 1, 2, 3].map(i => DS.sample(i));
  let diff = 0; for (let i = 0; i < 4; i++) for (let k = 0; k < 3; k++) diff += Math.abs(p1[i][k] - p0[i][k]);
  A(diff > 0.01, '点が動いている', diff.toFixed(3));
  A(ds.mat.uniforms.uProg.value > 0.05 && ds.mat.uniforms.uProg.value <= 1, '進み具合が渡っている', ds.mat.uniforms.uProg.value.toFixed(2)); }

// 行き先の割り当て: 番号順のままではなく、近い者どうしが結ばれている
{ while (ds.phase !== 'hold') d.step(0.2, 30);
  const n = ds.n, from = ds.from, to = ds.to;
  let cur = 0, rnd = 0;
  for (let i = 0; i < n; i++) {
    const j = (i * 2654435761) % n;   /* 行き先をでたらめに割り当てた場合との比較 */
    cur += Math.hypot(from[i*3] - to[i*3], from[i*3+1] - to[i*3+1], from[i*3+2] - to[i*3+2]);
    rnd += Math.hypot(from[i*3] - to[j*3], from[i*3+1] - to[j*3+1], from[i*3+2] - to[j*3+2]);
  }
  A(cur < rnd * 0.55, '経路の合計が、でたらめに結んだ場合よりずっと短い', cur.toFixed(1), rnd.toFixed(1)); }

// 出発の遅れが場所で決まっている（全機同時でも、ばらばらでもない）
{ const n = ds.n, lag = ds.lag;
  let lo = 1e9, hi = -1e9; for (let i = 0; i < n; i++) { if (lag[i] < lo) lo = lag[i]; if (lag[i] > hi) hi = lag[i]; }
  A(hi - lo > 0.15, '出発に前後の差がある', (hi - lo).toFixed(2));
  // 近い場所の機体は、遅れも近い
  let near = 0, far = 0, cnt = 0;
  for (let i = 0; i + 1 < n && cnt < 200; i++) {
    const dxy = Math.hypot(ds.to[i*3] - ds.to[(i+1)*3], ds.to[i*3+1] - ds.to[(i+1)*3+1]);
    if (dxy < 0.25) { near += Math.abs(lag[i] - lag[i+1]); cnt++; }
  }
  near = cnt ? near / cnt : 0;
  for (let i = 0; i < 200; i++) far += Math.abs(lag[i] - lag[(i * 7 + 313) % n]);
  far /= 200;
  A(cnt < 10 || near < far, '近い機体は遅れも近い（場所で決まっている）', near.toFixed(3), far.toFixed(3)); }

// 画の決め方: 天球（半径16m）の外にカメラを出さない
{ A(d.camera.position.length() < 15.5, 'カメラが天球の中にある', d.camera.position.length().toFixed(1));
  A(ds.k > 0.3 && ds.k <= 1.0, '隊列の倍率が範囲内', ds.k.toFixed(2));
  // 点の大きさは画角を見ないので、1mあたりの画素数を自分で渡している
  const cv = document.querySelector('canvas');
  const px = ds.mat.uniforms.uPxPerM.value, want = cv.height / (2 * Math.tan(d.camera.fov * Math.PI / 360));   /* gl_PointSize は描画バッファの画素で効く（画質設定で CSS 画素とは倍率が違う） */
  A(Math.abs(px / want - 1) < 0.25, '1mあたりの画素数が画角から出ている', px.toFixed(0), want.toFixed(0)); }

// 好きな文字を描く
{ const before = ds.fig;
  const ok = DS.dshowSetText('安全'); d.step(0.4, 30);
  A(ok === true, '文字: 受け付ける');
  A(ds.text === '安全', '文字: 覚えている', ds.text);
  A(DS.DSHOW_FIGS[ds.fig].id === 'custom', '文字: すぐその図形へ飛ぶ', DS.DSHOW_FIGS[ds.fig].id, before);
  // 点が中央に潰れていない＝ちゃんと絵になっている
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (let i = 0; i < ds.n; i++) { const x = ds.to[i*3], y = ds.to[i*3+1];
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  A(x1 - x0 > 1.0 && y1 - y0 > 0.4, '文字: 広がりがある', (x1-x0).toFixed(2), (y1-y0).toFixed(2));
  A(x1 - x0 > (y1 - y0), '文字: 横に長い', (x1-x0).toFixed(2), (y1-y0).toFixed(2));
  // 描けない文字は元に戻す
  const keep = ds.text; DS.dshowSetText('   '); d.step(0.2, 30);
  A(ds.text === '', '文字: 空にすると元の図形だけに戻る', ds.text);
  A(DS.DSHOW_FIGS[ds.fig].id !== 'custom', '文字: 空にしたら「あなたの文字」から離れる');
  void keep; }
// 文字が無いときは「あなたの文字」を順番から外す
{ ds.text = '';
  const seen = new Set();
  for (let i = 0; i < 240 && seen.size < 6; i++) { d.step(0.25, 30); seen.add(DS.DSHOW_FIGS[ds.fig].id); }
  A(!seen.has('custom'), '文字が無ければ「あなたの文字」は出てこない', [...seen].join('/')); }

// 説明カードを畳める（スマホは畳んだ状態で始まる）
{ const card = document.getElementById('noteCard');
  A(!document.getElementById('noteMini').hidden, '畳むボタンが出る');
  DS.setNoteMini(true); d.step(0.3, 30);
  A(card.classList.contains('mini'), '畳める');
  const h1 = card.getBoundingClientRect().height;
  DS.setNoteMini(false); d.step(0.3, 30);
  A(!card.classList.contains('mini'), '開ける');
  A(card.getBoundingClientRect().height > h1, '畳むと低くなる', h1, card.getBoundingClientRect().height); }

// 他の機能を始めると止まる
document.querySelector('#skyChips [data-sky=cold]').click(); d.step(1.0, 30);
A(!ds.on && !document.body.classList.contains('dshow'), '空もようを始めるとショーは止まる');
window.__weather.setWeather(null); d.step(0.6, 30);

// もう一度始めて、やめると元に戻る（電源が切れている状態から始める）
if (d.S.power > 0) { document.querySelector('#powerBtn').click(); d.step(0.4, 30); }
document.querySelector('#tabs [data-tab=fly]').click(); d.step(0.3, 30);
document.getElementById('showBtn').click(); d.step(1.2, 30);
A(ds.on, 'もう一度始められる');
document.getElementById('showBtn').click(); d.step(1.4, 30);
A(!ds.on && !ds.pts.visible, 'ボタンをもう一度押すと止まる');
A(!DS.SD.root.visible && d.D.root.visible, '主役機が戻る');
A(!document.body.classList.contains('dshow'), 'クラスが外れる');
A(document.getElementById('noteCard').hidden, 'カードが閉じる');
A(d.body.mode !== 'theater' && Math.abs(d.body.py) < 0.2, '機体が地上に戻る', d.body.mode, d.body.py.toFixed(2));
A(!window.__fpv.farGround.mesh.visible, '地平線が消える');
A(d.S.power === 0, '電源が戻る', d.S.power);

// 一度閉じて開き直しても、説明カード（＝「やめる」の出口）が出る
DS.dshowOn(false); d.step(1.0, 30); DS.dshowOn(true); d.step(1.0, 30);
A(!document.getElementById('noteCard').hidden && document.getElementById('noteCard').dataset.kind === 'dshow', '2回目もカードが出る');
// 輪は機体が重ならない（角度の作り方を誤ると半数が同じ場所に立つ）
{ const m = 120, r = new Float32Array(m * 3); DS.dshowShape('ring', m, r);
  const uniq = new Set([...Array(m)].map((_, i) => r[i * 3].toFixed(4) + ',' + r[i * 3 + 1].toFixed(4))).size;
  A(uniq === m, '輪: 機体が重ならない', uniq, m); }
// テーマや明るさを触っても夜のまま
document.querySelector('#themeSeg [data-th=light]').click(); d.step(0.8, 30);
A(d.D.parts.find(p => p.key === 'led').obj.userData.halo.material.opacity > 0.2, 'テーマを変えても夜の灯火が残る');
document.querySelector('#themeSeg [data-th=dark]').click(); d.step(0.5, 30);
// やめると夜の空が残らない
DS.dshowOn(false); d.step(1.2, 30);
{ const u = DS.skyUniforms(); A(u.star === 0 && u.cloud === 0 && u.wall === 0 && u.haze === 0, 'やめると夜の星・雲・かすみが消える', JSON.stringify(u)); }

// Esc でも止まる
document.getElementById('showBtn').click(); d.step(1.0, 30);
document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
d.step(1.2, 30);
A(!ds.on, 'Esc: 止まる');

// タブを移っても止まる
document.getElementById('showBtn').click(); d.step(1.0, 30);
document.querySelector('#tabs [data-tab=see]').click(); d.step(1.4, 30);
A(!ds.on, 'タブを移ると止まる');
d.noRender = false;
log.length ? log : 'G OK';
