// 機体のカメラから見る（一人称視点）の検証
const log = []; const A = (c, ...m) => { if (!c) log.push('FAIL ' + m.join(' ')); };
const d = window.__d, F = window.__fpv, ST = F.fpvStage;
const deg = r => r * 180 / Math.PI;
const camRoll = () => { d.camera.updateMatrixWorld(true); return deg(Math.asin(Math.max(-1, Math.min(1, d.camera.matrixWorld.elements[1])))); };
const R = s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; };
const overlap = (a, b) => !!a && !!b && a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
d.noRender = true; d.step(0.3, 30);
const fov0 = d.camera.fov;

// 入口
document.querySelector('#tabs [data-tab=fly]').click(); d.step(0.3, 30);
document.querySelector('#viewCol [data-v=fpv]').click(); d.step(1.0, 30);
A(F.fpv.on && document.body.classList.contains('fpv'), '入る: fpvになる');
A(!document.getElementById('fpv').hidden, '入る: HUDが出る');
A(!d.controls.enabled, '入る: 軌道操作を切る');
A(Math.abs(d.camera.fov - 45) < 0.01, '入る: 画角45°', d.camera.fov);
A(Math.abs(d.body.py - 1.05) < 0.06, '入る: 浮いている', d.body.py.toFixed(2));
A(getComputedStyle(document.getElementById('viewCol')).display === 'none', '入る: 見え方の列は隠す');

// 舞台
let ground = null, root = ST.far; while (root.parent) root = root.parent;
root.traverse(o => { if (o.isMesh && o.geometry && o.geometry.type === 'CircleGeometry' && o.geometry.parameters.radius === 2.8) ground = o; });
A(ST.far && ST.far.visible && ST.rings.length === 3 && ST.marks.length === 4 && ST.labels.length === 2, '舞台: 地面・輪・コーン・文字');
A(Math.abs(ground.scale.x - ground.scale.y) < 1e-6 && ground.scale.x > 4, '舞台: 床は円のまま広げる', ground.scale.toArray().join(','));
A(ST.far.material.vertexColors && ST.far.geometry.attributes.color, '舞台: かすみは頂点色');

// HUDの数値
d.step(0.5, 30);
A(/^\d+\.\d\d m$/.test(document.getElementById('fpvAlt').textContent), '数値: 高度', document.getElementById('fpvAlt').textContent);
A(/m\/s$/.test(document.getElementById('fpvSpd').textContent), '数値: 対地速度');
A(/°$/.test(document.getElementById('fpvHdg').textContent), '数値: 方位');

// 重なり: 数値・操作・スティックが互いに乗らない
document.getElementById('fpvStickBtn').click(); d.step(0.4, 30);
A(d.S.sticks && document.body.classList.contains('sticks-on'), 'スティック: HUDから出せる');
for (const [a, b] of [['.fpv-head', '#stickL'], ['.fpv-head', '#stickR'], ['.fpv-foot', '#stickL'], ['.fpv-foot', '#stickR'], ['.fpv-head', '.fpv-foot'], ['.fpv-foot', '#dock'], ['.fpv-head', '#topbar']])
  A(!overlap(R(a), R(b)), '重なり: ' + a + ' と ' + b);

// ジンバル: 機体を傾けて、同じコマで入切を比べる
const st = d.body.stick; st.active = true; st.x = 0.9; d.step(1.1, 30);
const roll = deg(d.body.tx);
F.fpv.stabilized = true; F.stepFpv(0); const on = camRoll();
F.fpv.stabilized = false; F.stepFpv(0); const off = camRoll();
F.fpv.stabilized = true; F.stepFpv(0);
A(Math.abs(roll) > 2, 'ジンバル: 機体が傾いている', roll.toFixed(1));
A(Math.abs(on) < 0.8, 'ジンバル入: 水平を保つ', on.toFixed(2));
A(Math.abs(off + roll) < 1.2, 'ジンバル切: 機体と一緒に傾く', off.toFixed(2), roll.toFixed(2));
st.x = 0; st.active = false; d.step(1.6, 30);

// 首振りと戻し
F.fpv.pan = 9; F.fpv.tilt = -9; F.updateGimbal();
A(Math.abs(deg(F.fpv.pan) - 95) < 0.01 && Math.abs(deg(F.fpv.tilt) + 88) < 0.01, '首振り: 可動域の外は丸める', deg(F.fpv.pan).toFixed(0), deg(F.fpv.tilt).toFixed(0));
document.getElementById('fpvGimBtn').click();
A(!F.fpv.stabilized && document.getElementById('fpvGim').textContent === '止めている', 'ボタン: ジンバルを止める');
document.getElementById('fpvGimBtn').click();
A(F.fpv.stabilized, 'ボタン: もう一度で戻る');
document.getElementById('fpvCenter').click();
A(Math.abs(F.fpv.pan) < 1e-6 && Math.abs(F.fpv.tilt - F.fpvTilt0()) < 1e-6, '戻す: 正面に戻る', deg(F.fpv.tilt).toFixed(0));

// 出口
document.getElementById('fpvOut').click(); d.step(1.4, 30);
A(!F.fpv.on && !document.body.classList.contains('fpv'), '出る: 元に戻る');
A(d.controls.enabled && Math.abs(d.camera.fov - fov0) < 0.01, '出る: 画角と操作が戻る', d.camera.fov);
A(!ST.grp.visible && ground.scale.x === 1, '出る: 舞台と床が戻る', ground.scale.x);
A(Math.abs(d.D.personGroup.position.z + 0.48) < 0.01, '出る: 人が元の位置へ', d.D.personGroup.position.z.toFixed(2));
A(document.getElementById('fpv').hidden, '出る: HUDが消える');

// Escでも出られる
document.querySelector('#viewCol [data-v=fpv]').click(); d.step(0.8, 30);
A(F.fpv.on, 'もう一度入れる');
window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
d.step(1.2, 30);
A(!F.fpv.on, 'Esc: 出られる');

// テーマを変えても地面の色が付け直される
const c0 = ST.far.material.color.getHex();
document.querySelector('#themeSeg [data-th=light]').click(); d.step(0.4, 30);
const c1 = ST.far.material.color.getHex();
document.querySelector('#themeSeg [data-th=dark]').click(); d.step(0.4, 30);
A(c0 !== c1 && ST.far.material.color.getHex() === c0, 'テーマ: 地面の色が追従する', c0.toString(16), c1.toString(16));
document.querySelector('#themeSeg [data-th=auto]').click(); d.step(0.3, 30);
if (d.S.sticks) document.querySelector('.tgl[data-t=sticks]').click();
d.noRender = false;
log.length ? log : 'E OK';
