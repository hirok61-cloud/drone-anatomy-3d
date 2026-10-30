// N Wingtra WingtraRAY の検証（public/index.html?model=wingtra で開いてから。幅1100px超）
const log = []; const A = (c, ...m) => { if (!c) log.push('FAIL ' + m.join(' ')); };
const d = window.__d; const q = (s) => document.querySelector(s); d.noRender = true; d.step(1, 30);
const V = d.wt, R = Math.PI / 180, K = 0.4, FLOOR = -0.158;
const low = () => d.altLowest(d.D.sg, 2);
A(document.body.classList.contains('wingtra') && document.body.classList.contains('alt'), 'body class');
A(d.D.motors.length === 2 && d.body.mult.length === 2, 'motors 2', d.D.motors.length);
A(window.LIST_ORDER.length === 33, 'parts 33', window.LIST_ORDER.length);
A(q('#modelName').textContent === 'WingtraRAY', 'model name', q('#modelName').textContent);
for (const t of ['use', 'mishap', 'expert']) A(getComputedStyle(q(`#tabs [data-tab=${t}]`)).display === 'none', 'tab hidden', t);
A(getComputedStyle(q('#wtChips')).display !== 'none' && getComputedStyle(q('#mn5Chips').closest('.dock-group')).display === 'none', 'chips per model');
A(getComputedStyle(q('#viewCol [data-v=fpv]')).display === 'none', 'no camera view (fixed payload)');
// 置いた姿勢: 尾で立つ（機首が真上から少し背中の側へ）。脚の棒の先と尾が床に着く
const aliveWas = d.S.alive; d.S.alive = false; d.step(3, 30);
{ const nose = new d.camera.position.constructor(0, 0, -1).applyQuaternion(d.D.pose.quaternion);
  A(nose.y > 0.97 && nose.z > 0.03, 'stands on tail (nose up, leaning to the back)', nose.y.toFixed(3), nose.z.toFixed(3));
  const rods = d.D.rods.map(r => d.altLowest(r, 1)), tail = Math.min(d.altLowest(d.D.finPart.obj, 1), d.altLowest(d.D.parts.find(p => p.key === 'tailBumper').obj, 1));
  A(rods.every(y => Math.abs(y - FLOOR) < 0.001) && Math.abs(tail - FLOOR) < 0.001, 'rest on rods + tail', rods.map(y => y.toFixed(4)).join(','), tail.toFixed(4)); }
// 寸法（巡航の姿勢にして測る）: 翼幅 1242〜1250 mm、機首〜尾 702 mm、モーター軸 ±315 mm、プロペラ直径 355 mm
V.lv.to = 1; V.lv.y = 0.3; d.step(2, 30);
{ d.D.root.updateMatrixWorld(true); const v = d.camera.position.clone(); let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  d.D.sg.traverseVisible(c => { if (!c.isMesh || c.userData.noPart || c.parent && c.parent.name === 'prop') return; const p = c.geometry.attributes.position; if (!p) return; for (let k = 0; k < p.count; k += 2) { v.fromBufferAttribute(p, k).applyMatrix4(c.matrixWorld); mn = [Math.min(mn[0], v.x), Math.min(mn[1], v.y), Math.min(mn[2], v.z)]; mx = [Math.max(mx[0], v.x), Math.max(mx[1], v.y), Math.max(mx[2], v.z)]; } });
  const span = (mx[0] - mn[0]) / K * 1000; A(span > 1235 && span < 1262, 'span', span.toFixed(0));
  const ms = d.D.motors.map(m => m.group.getWorldPosition(v.clone()).x / K * 1000); A(ms.every(x => Math.abs(Math.abs(x) - 316) < 6), 'motor x', ms.map(x => x.toFixed(0)).join(','));
  const pr = d.D.rotor.R / K * 2000; A(Math.abs(pr - 355) < 1, 'prop dia', pr); }
V.lv.to = 0; d.step(2, 30);
// 全部品の解説（くわしく）
q('#depthSeg [data-d=full]').click(); d.step(0.2, 30);
for (const k of window.LIST_ORDER) { A(d.D.parts.some(p => p.key === k), 'part exists', k); const row = q(`#partList .row[data-key="${k}"]`); A(!!row, 'row', k); if (row) { row.click(); A(!q('#detail').hidden && q('#detail h3').textContent.length > 0, 'detail', k); } }
q('#inspBack').click(); d.step(0.2, 30);
// 離陸→遷移→巡航→戻りの遷移→着陸
q('#wtChips [data-wt=flight]').click(); d.step(1.0, 30);
A(V.act && V.act.id === 'flight' && d.body.mode === 'theater' && d.S.air, 'flight starts (theater, airflow on)');
d.step(4.5, 30); A(d.body.py > 0.5 && Math.abs(new d.camera.position.constructor(0, 0, -1).applyQuaternion(d.D.pose.quaternion).y - 1) < 0.02, 'vertical climb', d.body.py.toFixed(2));
d.step(5.5, 30); { const nose = new d.camera.position.constructor(0, 0, -1).applyQuaternion(d.D.pose.quaternion); A(nose.y < 0.2 && d.D.arrows.lift.every(a => a.visible), 'cruise attitude + wing lift', nose.y.toFixed(2));
  A(/主翼 100%/.test(q('#wtHudShare').textContent), 'wing carries the weight', q('#wtHudShare').textContent); }
let minY = 9; for (let i = 0; i < 50; i++) { d.step(0.5, 30); if (V.act) minY = Math.min(minY, low()); }
A(!V.act && d.body.py === 0 && d.body.mode === 'idle', 'landed and finished', d.body.py, d.body.mode);
A(minY > FLOOR - 0.002, 'no floor penetration in the scene', minY);
d.step(2, 30); A(Math.abs(d.body.px) + Math.abs(d.body.pz) < 1e-6 && Math.abs(low() - FLOOR) < 0.002 && V.rest.w > 0.99, 'back on the pad, resting', low());
A(d.S.air === false || d.S.air === undefined, 'airflow restored', d.S.air);
// 操縦翼面: その場で巡航の姿勢にして、同じ向き・逆向きに動かす
q('#wtChips [data-wt=elevon]').click(); d.step(2.5, 30);
A(V.lv.w > 0.99 && V.el[0] > 0.15 && Math.abs(V.el[0] - V.el[1]) < 0.01, 'elevons together (pitch)', V.el.map(x => (x / R).toFixed(1)).join(','));
d.step(4.7, 30); A(V.el[0] * V.el[1] < 0 && Math.abs(V.el[0]) > 0.1, 'elevons opposite (roll)', V.el.map(x => (x / R).toFixed(1)).join(','));
d.step(7, 30); A(!V.act && V.lv.w < 0.01 && Math.abs(V.el[0]) < 0.01, 'elevon demo done', V.lv.w);
// 電池交換: ノーズコーンを外し、2個を前へ抜く。その間は電源が切れる
q('#wtChips [data-wt=battery]').click(); d.step(2.8, 30);
A(d.D.nosePart.anim && d.D.bats.every(p => p.anim && p.anim.pos.z < -0.2) && !V.powered, 'nose off, batteries out, power off');
d.step(5, 30); A(!V.act && V.powered && !d.D.nosePart.anim, 'battery done');
// カメラの付け替え
q('#wtChips [data-wt=payload]').click(); d.step(1.8, 30); A(d.D.payPart.anim && d.D.payPart.anim.pos.y < -0.2, 'payload out'); d.step(3.5, 30); A(!V.act, 'payload done');
// パラシュート: 上がって推進を失い、傘を出して降りる。着地で床に入らない
q('#wtChips [data-wt=chute]').click(); d.step(4.5, 30); A(d.D.canopy.visible && d.body.py > 0.1, 'canopy open, descending', d.body.py);
let chMin = 9; for (let i = 0; i < 16; i++) { d.step(0.5, 30); if (V.act) chMin = Math.min(chMin, low()); }
A(!V.act && !d.D.canopy.visible, 'chute done'); A(chMin > FLOOR - 0.002, 'chute landing above floor', chMin);
d.step(2, 30);
// 重ね絵は同時に1つ。撮影範囲とレーダーは巡航の姿勢で見せる
q('#wtChips [data-wt=fov]').click(); d.step(2, 30); A(d.D.fovG.visible && V.lv.w > 0.99, 'fov on (level)');
q('#wtChips [data-wt=radar]').click(); d.step(0.5, 30); A(d.D.radarG.visible && !d.D.fovG.visible, 'radar replaces fov');
q('#wtChips [data-wt=size]').click(); d.step(2, 30); A(V.person.visible && V.ghost.visible && !d.D.radarG.visible && V.lv.w < 0.01, 'size replaces radar, standing');
q('#wtChips [data-wt=size]').click(); d.step(0.5, 30); A(!V.person.visible, 'size off');
// 分解: 部品が床に入らない
{ const s = q('#explode'); s.value = 100; s.dispatchEvent(new Event('input')); } d.step(2.5, 30); A(low() > FLOOR - 0.001, 'explode above floor', low());
{ const s = q('#explode'); s.value = 0; s.dispatchEvent(new Event('input')); } d.step(2.5, 30);
q('#modeSeg [data-mode=cut]').click(); d.step(1.5, 30); A(d.S.mode === 'cut', 'cut'); q('#modeSeg [data-mode=normal]').click();
// とばす: 尾を下にしてホバー。前進は舵（同じ向き）、横は左右の回転差、旋回は舵（逆向き）
q('#tabs [data-tab=fly]').click(); q('#powerBtn').click(); d.step(2, 30);
A(d.body.mode === 'free' && d.body.py > 0.04 && V.rest.w < 0.01, 'hover upright', d.body.mode, d.body.py);
q('#flightChips [data-f=pitch]').click(); d.step(0.12, 30); A(V.el[0] > 0.03 && Math.abs(V.el[0] - V.el[1]) < 0.02, 'pitch by elevons', V.el.map(x => (x / R).toFixed(1)).join(','));
d.step(1.5, 30); A(low() > FLOOR - 0.002, 'pitch above floor', low());
q('#flightChips [data-f=roll]').click(); d.step(0.6, 30); A(d.D.motors[1].rpm > d.D.motors[0].rpm * 1.05, 'roll by motor difference', d.D.motors.map(m => Math.round(m.rpm)).join(','));
d.step(1.5, 30); A(low() > FLOOR - 0.002, 'roll above floor', low());
q('#flightChips [data-f=yaw]').click(); d.step(1.2, 30); A(V.el[0] * V.el[1] < 0 && Math.abs(V.el[0]) > 0.1 && Math.abs(d.D.motors[0].rpm - d.D.motors[1].rpm) < 80, 'yaw by elevons, not motors', V.el.map(x => (x / R).toFixed(1)).join(','));
q('#flightChips [data-f=yaw]').click();
// とばすの「離陸→遷移→巡航→着陸」もここから動く
q('.ctx-row[data-tab=fly] [data-wt=flight]').click(); d.step(1, 30); A(V.act && V.act.id === 'flight' && d.S.tab === 'fly', 'flight from fly tab');
q('#tabs [data-tab=see]').click(); d.step(0.5, 30); A(!V.act, 'flight stops when leaving the tab');
q('#tabs [data-tab=fly]').click(); q('#powerBtn').click(); d.step(0.5, 30); if (d.S.power > 0) q('#powerBtn').click(); q('#tabs [data-tab=see]').click(); d.step(3, 30);
A(V.rest.w > 0.99 && Math.abs(low() - FLOOR) < 0.002, 'rest again after landing', low());
d.S.alive = aliveWas;
d.noRender = false;
log.length ? log : 'N OK';
