// 空もよう（教則6.2 気象）の検証
const log = []; const A = (c, ...m) => { if (!c) log.push('FAIL ' + m.join(' ')); };
const d = window.__d, W = window.__weather, wx = W.weather;
const deg = r => r * 180 / Math.PI;
const tiltDeg = () => deg(Math.hypot(d.body.tx, d.body.tz));
d.noRender = true; d.step(0.4, 30);
document.querySelector('#tabs [data-tab=fly]').click(); d.step(0.3, 30);
A(document.querySelectorAll('#skyChips button').length === 6, '入口: 6つの空');

// 選ぶと空・光・床が変わる
const set = (id) => { W.setWeather(null); W.setWeather(id, true); d.step(1.0, 30); };
set('fine');
A(wx.on && wx.id === 'fine', '選ぶと空もようが入る');
A(document.getElementById('noteCard').dataset.kind === 'weather' && document.getElementById('skyVals'), 'カードと数値');
const g0 = window.__fpv.farGround.mesh;
A(g0 && g0.visible, '地平線（遠くの地面）が出る');

// 風: 強いほど機体が傾き、それでも位置は保つ
// 突風でばらつくので、しばらく飛ばして平均を見る
const measure = (id) => { set(id); d.step(4, 30); let sum = 0, n = 0, rmax = 0;
  for (let i = 0; i < 48; i++) { d.step(0.25, 30); sum += tiltDeg(); n++; rmax = Math.max(rmax, Math.hypot(d.body.px, d.body.pz)); }
  return { tilt: sum / n, r: rmax, py: d.body.py }; };
const mFog = measure('fog'), mCold = measure('cold');
A(mCold.tilt > mFog.tilt + 3, '風が強いほど機体が傾く', mFog.tilt.toFixed(1), mCold.tilt.toFixed(1));
A(mFog.r < 0.5 && mCold.r < 0.7, '風の中でも位置を保つ（枠から出ない）', mFog.r.toFixed(2), mCold.r.toFixed(2));
A(Math.abs(mCold.py - 0.5) < 0.12, '空もようでは0.5mに浮く', mCold.py.toFixed(2));

// 高さで風速が変わる（地表の摩擦）
{ const lo = W.windAt(0.1, 0, 0).spd, hi = W.windAt(2.0, 0, 0).spd;
  A(hi > lo * 1.15, '上空ほど風が強い', lo.toFixed(2), hi.toFixed(2)); }
// 風向は「吹いてくる方向」: 北の風なら +Z へ流れる
{ const w = W.windAt(1.0, 0, 0); A(typeof w.x === 'number' && typeof w.z === 'number', '風ベクトルが取れる'); }
A(W.windName(0) === '北' && W.windName(90) === '東' && W.windName(180) === '南', '16方位の名前');
A(W.beaufort(0.2) === 0 && W.beaufort(4.0) === 3 && W.beaufort(12) === 6, 'ビューフォート風力階級', W.beaufort(4.0));

// 吹き流し: 強い風ほど上がる
set('fog'); d.step(3, 30); const sockCalm = wx.sock.rotation.z;
set('cold'); d.step(3, 30); const sockWind = wx.sock.rotation.z;
A(sockWind > sockCalm + 0.2, '吹き流し: 風が強いほど水平に近づく', sockCalm.toFixed(2), sockWind.toFixed(2));

// 雨と霧
set('cold'); A(wx.rain && wx.rain.visible, '寒冷前線: 雨が降る');
set('fine'); A(!wx.rain.visible, '晴れ: 雨はやむ');
set('fog'); A(W.hasFog(), '霧: 視程が落ちる（fog）');
set('fine'); A(!W.hasFog(), '晴れ: 霧が消える');

// 海陸風は時間で入れ替わる
set('sea');
{ const seen = new Set(); for (let i = 0; i < 60; i++) { d.step(1.0, 30); seen.add(Math.round(W.windMean().dir)); }
  A(seen.size > 3, '海陸風: 風向が時間で変わる', [...seen].slice(0, 6).join('/')); }

// ダウンバースト: 通り過ぎる間に高度を失い、風向が反転する
set('burst');
{ let minPy = 9, wxMin = 9, wxMax = -9;
  for (let i = 0; i < 120; i++) { d.step(0.25, 30); minPy = Math.min(minPy, d.body.py); const w = W.windAt(d.body.py, d.body.px, d.body.pz); wxMin = Math.min(wxMin, w.x); wxMax = Math.max(wxMax, w.x); }
  A(minPy < 0.3, 'ダウンバースト: 高度を失う', minPy.toFixed(2));
  A(wxMin < -0.5 && wxMax > 0.5, 'ダウンバースト: 向かい風が追い風に変わる', wxMin.toFixed(2), wxMax.toFixed(2));
  A(wx.burstGrp, 'ダウンバースト: 吹き降ろしの小道具'); }

// もう一度押すと戻る
document.querySelector('#skyChips [data-sky=fine]').click(); d.step(0.6, 30);
A(wx.on && wx.id === 'fine', 'チップで選べる');
document.querySelector('#skyChips [data-sky=fine]').click(); d.step(0.6, 30);
A(!wx.on && !W.hasFog(), 'もう一度押すと空がもどる');
A(!window.__fpv.farGround.mesh.visible, 'もどすと地平線も消える');
A(document.getElementById('noteCard').hidden, 'もどすとカードも閉じる');
A(W.windAt(1, 0, 0).spd === 0, 'もどすと風もやむ');

// 場面を始めると空はもどる（場面は自前の空を使う）
set('cold');
document.querySelector('#descChips [data-dz=slide]').click(); d.step(0.8, 30);
A(!wx.on, '場面を始めると空はもどる');
window.__descent.stopDescent(); d.step(1.2, 30);

// テーマを変えても床と地平線の色が合う
set('warm');
document.querySelector('#themeSeg [data-th=light]').click(); d.step(0.5, 30);
A(window.__fpv.farGround.mesh.material.color.getHex() !== 0, 'テーマ: 地平線の色が入る');
document.querySelector('#themeSeg [data-th=dark]').click(); d.step(0.5, 30);
document.querySelector('#themeSeg [data-th=auto]').click(); d.step(0.3, 30);
W.setWeather(null); d.step(0.5, 30);
d.noRender = false;
log.length ? log : 'F OK';
