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
let ground = null, root = F.farGround.mesh || ST.grp; while (root.parent) root = root.parent;
root.traverse(o => { if (o.isMesh && o.geometry && o.geometry.type === 'CircleGeometry' && o.geometry.parameters.radius === 2.8) ground = o; });
A(F.farGround.mesh && F.farGround.mesh.visible && ST.rings.length === 3 && ST.marks.length === 4 && ST.labels.length === 2, '舞台: 地面・輪・コーン・文字');
A(Math.abs(ground.scale.x - ground.scale.y) < 1e-6 && ground.scale.x > 4, '舞台: 床は円のまま広げる', ground.scale.toArray().join(','));
A(F.farGround.mesh.material.vertexColors && F.farGround.mesh.geometry.attributes.color, '舞台: かすみは頂点色');

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

// ジンバル: 機体を傾けて、同じコマで入切を比べる。
// パンを振った状態でも水平が保てること（オイラー角を足し引きすると、ここで崩れる）
const st = d.body.stick; st.active = true; st.x = 0.9; d.step(1.1, 30);
const roll = deg(d.body.tx);
A(Math.abs(roll) > 2, 'ジンバル: 機体が傾いている', roll.toFixed(1));
for (const pan of [0, 45, 95]) {
  F.fpv.pan = pan * Math.PI / 180;
  F.fpv.stabilized = true; F.stepFpv(0); const on = camRoll();
  A(Math.abs(on) < 0.5, `ジンバル入: 水平を保つ（パン${pan}°）`, on.toFixed(2));
  F.fpv.stabilized = false; F.stepFpv(0); const off = camRoll();
  if (pan === 0) A(Math.abs(off + roll) < 1.2, 'ジンバル切: 機体と一緒に傾く', off.toFixed(2), roll.toFixed(2));
  F.fpv.stabilized = true;
}
// 機首上げと横傾きを混ぜても水平
st.y = -1; d.step(0.6, 30); F.fpv.pan = 0; F.stepFpv(0);
A(Math.abs(deg(d.body.tz)) > 2 && Math.abs(deg(d.body.tx)) > 2, 'ジンバル: ピッチとロールが同時に出ている', deg(d.body.tz).toFixed(1), deg(d.body.tx).toFixed(1));
A(Math.abs(camRoll()) < 0.5, 'ジンバル入: ピッチとロールが同時でも水平', camRoll().toFixed(2));
// 真下を向けたまま機首を上げても裏返らない
F.fpv.tilt = -88 * Math.PI / 180; F.stepFpv(0); d.camera.updateMatrixWorld(true);
A(d.camera.matrixWorld.elements[5] > -0.2, '真下向き＋機首上げでも上下が反転しない', d.camera.matrixWorld.elements[5].toFixed(2));
F.fpv.tilt = F.fpvTilt0();
st.x = st.y = 0; st.active = false; d.step(1.6, 30);

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
A(!ST.grp.visible && !F.farGround.mesh.visible && ground.scale.x === 1, '出る: 舞台と床が戻る', ground.scale.x);
A(Math.abs(d.D.personGroup.position.z + 0.48) < 0.01, '出る: 人が元の位置へ', d.D.personGroup.position.z.toFixed(2));
A(document.getElementById('fpv').hidden, '出る: HUDが消える');

// 視点列のトグル（名・大）の点灯は、視点を切り替えても消えない
const lt = document.querySelector('#viewCol .tgl[data-t=labels]');
if (!lt.classList.contains('on')) { lt.click(); d.step(0.2, 30); }
const ltWas = lt.classList.contains('on');
document.querySelector('#viewCol [data-v=fpv]').click(); d.step(0.8, 30);
A(lt.classList.contains('on') === ltWas, '視点を切り替えても「名」の点灯は残る');
A(F.fpv.on, 'もう一度入れる');
// タブを移ると出る（操作列が隠れたまま電源だけ切れると戻れない）
document.querySelector('#tabs [data-tab=see]').click(); d.step(1.4, 30);
A(!F.fpv.on && !document.body.classList.contains('fpv'), 'タブを移ると出る');
document.querySelector('#tabs [data-tab=fly]').click(); d.step(0.3, 30);
// 降ろし方の最中に入ると、場面が畳まれて舞台が出る
document.querySelector('#descChips [data-dz=straight]').click(); d.step(1.0, 30);
document.querySelector('#viewCol [data-v=fpv]').click(); d.step(1.2, 30);
A(!window.__descent.descent.active, '場面の最中に入ると、場面は畳まれる');
A(ST.grp.visible && Math.abs(d.body.py - 1.05) < 0.06, '場面のあとでも舞台が出て浮いている', d.body.py.toFixed(2));
A(Math.abs(d.S.ts - 1) < 0.06, '場面の時間の伸ばしも戻る', d.S.ts.toFixed(2));
document.getElementById('fpvOut').click(); d.step(1.2, 30);
document.querySelector('#viewCol [data-v=fpv]').click(); d.step(0.8, 30);
A(F.fpv.on, 'もう一度入れる（2回目）');
window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
d.step(1.2, 30);
A(!F.fpv.on, 'Esc: 出られる');

// 遠くの地面は、どのテーマでも近くの床と同じ色でなければ継ぎ目が出る
for (const th of ['dark', 'light']) {
  document.querySelector(`#themeSeg [data-th=${th}]`).click(); d.step(0.5, 30);
  A(F.farGround.mesh.material.color.getHex() === F.groundColor(), `テーマ(${th}): 地平線と床が同じ色`, F.farGround.mesh.material.color.getHexString(), F.groundColor().toString(16));
}
document.querySelector('#themeSeg [data-th=auto]').click(); d.step(0.3, 30);
if (d.S.sticks) document.querySelector('.tgl[data-t=sticks]').click();
d.noRender = false;
log.length ? log : 'E OK';
