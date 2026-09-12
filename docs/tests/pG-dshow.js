// 夜のドローンショーの検証
const log = []; const A = (c, ...m) => { if (!c) log.push('FAIL ' + m.join(' ')); };
const d = window.__d, DS = window.__dshow, ds = DS.dshow;
d.noRender = true; d.step(0.4, 30);
document.querySelector('#tabs [data-tab=fly]').click(); d.step(0.3, 30);
A(!!document.getElementById('showBtn'), '入口: ボタンがある');

// 始める
document.getElementById('showBtn').click(); d.step(1.2, 30);
A(ds.on && document.body.classList.contains('dshow'), '始まる');
A(ds.pts && ds.pts.visible && ds.n > 100, `${ds.n} 機の光点`);
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
  let maxR = 0; for (let i = 0; i < n; i++) maxR = Math.max(maxR, Math.hypot(b[i * 3], b[i * 3 + 1] - 2.25));
  A(maxR > 0.5 && maxR < 2.2, '図形は隊列の広がりに収まる', maxR.toFixed(2)); }

// 点がちゃんと動いている（位置バッファが更新される）
{ const p0 = ds.pos.slice(0, 30); d.step(1.2, 30); let diff = 0; for (let i = 0; i < 30; i++) diff += Math.abs(ds.pos[i] - p0[i]);
  A(diff > 0.001, '点が動いている', diff.toFixed(3)); }

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
A(!document.body.classList.contains('dshow'), 'クラスが外れる');
A(document.getElementById('noteCard').hidden, 'カードが閉じる');
A(d.body.mode !== 'theater' && Math.abs(d.body.py) < 0.2, '機体が地上に戻る', d.body.mode, d.body.py.toFixed(2));
A(!window.__fpv.farGround.mesh.visible, '地平線が消える');
A(d.S.power === 0, '電源が戻る', d.S.power);

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
