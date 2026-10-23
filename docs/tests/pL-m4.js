// L DJI Matrice 4 シリーズ（4T／4E）の検証（public/index.html?model=matrice4 で開いてから。幅1100px超）
const log = []; const A = (c, ...m) => { if (!c) log.push('FAIL ' + m.join(' ')); };
const d = window.__d; const q = (s) => document.querySelector(s); d.noRender = true; d.step(1, 30);
const V = d.m4, R = Math.PI / 180;
A(document.body.classList.contains('matrice4') && document.body.classList.contains('alt'), 'body class');
A(d.D.motors.length === 4, 'motors 4', d.D.motors.length);
A(window.LIST_ORDER.length === 41, 'parts 41', window.LIST_ORDER.length);
A(q('#modelName').textContent === 'Matrice 4T', 'model name', q('#modelName').textContent);
for (const t of ['use', 'mishap', 'expert']) A(getComputedStyle(q(`#tabs [data-tab=${t}]`)).display === 'none', 'tab hidden', t);
A(getComputedStyle(q('#m4Chips')).display !== 'none' && getComputedStyle(q('#mvChips').closest('.dock-group')).display === 'none', 'chips per model');
// 寸法: 公式の展開時の幅 387.5mm（プロペラを除く）・対角ホイールベース 438.8mm
{ d.D.root.updateMatrixWorld(true); const P = d.D.motors.map(m => m.group.getWorldPosition(d.camera.position.clone()));
  const diag = P[0].distanceTo(P[2]) * 1000; A(Math.abs(diag - 438.8) < 4, 'wheelbase', diag.toFixed(1));
  A(P[0].y > P[1].y + 0.005, 'front motors higher than rear', P[0].y, P[1].y); }
// 全部品の解説（くわしく）。4T では 4E の部品とアクセサリーは一覧に出ない
q('#depthSeg [data-d=full]').click(); d.step(0.2, 30);
const visibleKeys = () => [...document.querySelectorAll('#partList .row[data-key]')].map(r => r.dataset.key);
{ const ks = visibleKeys(); A(ks.includes('thermal') && ks.includes('camWideT') && !ks.includes('camWideE') && !ks.includes('spotlight'), '4T list', ks.length); }
for (const k of visibleKeys()) { A(d.D.parts.some(p => p.key === k), 'part exists', k); const row = q(`#partList .row[data-key="${k}"]`); row.click(); A(!q('#detail').hidden && q('#detail h3').textContent.length > 0, 'detail', k); }
q('#inspBack').click(); d.step(0.2, 30);
// 4T → 4E: ジンバルの前面だけが替わる
q('#m4Chips [data-m4=variant]').click(); d.step(0.5, 30);
{ const ks = visibleKeys(); A(V.variant === 'e' && q('#modelName').textContent === 'Matrice 4E', 'variant e'); A(ks.includes('camWideE') && !ks.includes('thermal') && !ks.includes('nir'), '4E list');
  A(!d.D.gimbalParts.lens.thermal.visible && d.D.gimbalParts.lens.wideE.visible && d.D.gimbalParts.faceE.visible, '4E face'); }
q('#m4Chips [data-m4=variant]').click(); d.step(0.5, 30); A(V.variant === 't' && d.D.gimbalParts.lens.thermal.visible, 'back to 4T');
(q('#noteCard').hidden || q('#noteClose').click());
// たたむ: 前アームは水平に後ろへ（モーターは上向き）、後アームは下へ回して前へ（モーターが逆さ）・プロテクターをかぶせる・電源は切る
q('#m4Chips [data-m4=fold]').click(); d.step(9, 30);
A(V.fold === 1 && !V.powered && d.D.protector.visible, 'folded', V.fold, V.powered);
{ d.D.root.updateMatrixWorld(true); const up = d.camera.up.clone().set(0, 1, 0);
  d.D.motors.forEach((m, i) => { const p = m.group.getWorldPosition(d.camera.position.clone()), u = up.clone().applyQuaternion(m.group.getWorldQuaternion(d.camera.quaternion.clone()));
    if (m.front) A(p.z > 0.04 && u.y > 0.9, 'front arm folded back upright', i, p.z.toFixed(3), u.y.toFixed(2));
    else A(p.z < -0.05 && u.y < -0.9, 'rear arm folded forward upside down', i, p.z.toFixed(3), u.y.toFixed(2)); }); }
q('#m4Chips [data-m4=fold]').click(); d.step(4, 30);
A(V.fold === 0 && V.powered && !d.D.protector.visible, 'unfold → power on', V.fold, V.powered);
// 電池交換: 後ろへ抜く・電源を切って入れ替える
q('#m4Chips [data-m4=battery]').click(); d.step(1.8, 30);
A(d.D.batPart.anim && d.D.batPart.anim.pos.z > 0.1 && !V.powered, 'battery pulled back, power off');
d.step(3.4, 30); A(!V.act && V.powered, 'battery done', V.powered);
// ジンバル: 4T は上 70°、真下 −90°、機体を傾けてもカメラは水平
q('#m4Chips [data-m4=gimbal]').click(); d.step(1.2, 30);
A(Math.abs(d.D.gimbalParts.tilt.rotation.x - 70 * R) < 0.02, 'tilt up 70', d.D.gimbalParts.tilt.rotation.x / R);
d.step(2.6, 30); A(Math.abs(d.D.gimbalParts.tilt.rotation.x + 90 * R) < 0.03, 'tilt down -90', d.D.gimbalParts.tilt.rotation.x / R);
d.step(3.6, 30); { const sg = d.D.sg, h = d.D.gimbalParts.head; A(Math.abs(sg.rotation.x) + Math.abs(sg.rotation.z) > 0.05, 'body tilted by hand');
  h.updateWorldMatrix(true, false); const qw = h.getWorldQuaternion(d.camera.quaternion.clone()); const ang = 2 * Math.acos(Math.min(1, Math.abs(qw.w))) / R; A(ang < 1.5, 'camera stays level', ang.toFixed(2)); }
d.step(4, 30); A(!V.act && d.D.sg.rotation.x === 0, 'gimbal done');
// 4E は上 35° まで
q('#m4Chips [data-m4=variant]').click(); (q('#noteCard').hidden || q('#noteClose').click()); q('#m4Chips [data-m4=gimbal]').click(); d.step(1.2, 30);
A(Math.abs(d.D.gimbalParts.tilt.rotation.x - 35 * R) < 0.02, '4E tilt up 35', d.D.gimbalParts.tilt.rotation.x / R);
q('#noteClose').click(); d.step(0.3, 30); q('#m4Chips [data-m4=variant]').click(); (q('#noteCard').hidden || q('#noteClose').click()); d.step(0.5, 30);
// カメラ: 選ぶとそのカメラだけ光る
q('#m4Chips [data-m4=cams]').click(); d.step(0.3, 30);
q('[data-m4lens=ir]').click(); d.step(0.2, 30);
{ const L = d.D.gimbalParts.lens, C = d.D.fovG.userData.cones; A(L.thermal.userData.glow.visible && !L.tele.userData.glow.visible && C.thermal.visible && !C.tele.visible, 'thermal selected'); }
q('[data-m4lens=all]').click(); q('#m4Chips [data-m4=cams]').click(); d.step(0.3, 30); A(!V.camsOn && !d.D.fovG.visible, 'cams off');
// 機体のカメラから見る: 24mm→168mm→サーマル、チルトは 4T で 70° まで
q('#viewCol [data-v=fpv]').click(); d.step(1, 30);
A(window.__fpv.fpv.on && Math.abs(d.camera.fov - 2 * Math.atan(Math.tan(41 * R) * 0.6) / R) < 0.3, 'fpv 24mm', d.camera.fov);
q('#fpvLens [data-z="7"]').click(); d.step(1, 30); A(Math.abs(d.camera.fov - 2 * Math.atan(Math.tan(7.5 * R) * 0.6) / R) < 0.2, 'fpv 168mm', d.camera.fov);
q('#fpvLens [data-ir]').click(); d.step(1, 30); A(V.gim.ir && document.body.classList.contains('m4-ir'), 'thermal view');
window.__fpv.fpv.tilt = 2; d.step(0.3, 30); A(Math.abs(V.gim.tilt - 70 * R) < 0.01, 'tilt clamp 70', V.gim.tilt / R);
q('#fpvOut').click(); d.step(1.2, 30); A(!window.__fpv.fpv.on && !document.body.classList.contains('m4-ir') && V.gim.tilt === 0, 'fpv out');
V.gim.ir = false; V.gim.zoom = 1;
// レーザー距離計: 機体を浮かせて目標へ向け、距離を読む
q('#m4Chips [data-m4=laser]').click(); d.step(2.6, 30); await new Promise(r => setTimeout(r, 50)); d.step(0.2, 30);
{ const t = (q('#m4LaserRead') || {}).textContent || ''; A(/直線距離 [\d.]+ m/.test(t), 'laser reading', t.slice(0, 40)); A(d.D.laserBeam.visible && d.D.laserBeam.scale.z > 3, 'laser beam', d.D.laserBeam.scale.z); }
q('#m4Chips [data-m4=laser]').click(); d.step(0.5, 30); A(!V.laserOn && d.D.sg.position.y === d.D.sg.userData.y0, 'laser off returns body');
// アクセサリー: スポットライトとスピーカーを重ねて付ける・一覧に出る・外す
q('#m4Chips [data-m4=acc]').click(); d.step(0.3, 30);
q('[data-m4acc=spot]').click(); q('[data-m4acc=spk]').click(); d.step(0.3, 30);
{ const ks = visibleKeys(); A(V.acc.spot && V.acc.spk && d.D.acc.spot.visible && d.D.acc.spk.visible && ks.includes('spotlight') && ks.includes('speaker'), 'accessories on');
  A(d.D.acc.spk.position.y > d.D.acc.spot.position.y + 0.06, 'speaker stacked on spotlight'); A(/40 分/.test(q('#noteBody').textContent), 'flight time with both', q('#noteBody').textContent.match(/\d+ 分 \/ \d+ 分/)); }
q('#noteActions button').click(); d.step(0.3, 30); A(!V.acc.spot && !V.acc.spk && !d.D.acc.spot.visible, 'accessories off');
(q('#noteCard').hidden || q('#noteClose').click());
// 重ね絵は同時に1つ
q('#m4Chips [data-m4=sense]').click(); d.step(0.5, 30); A(d.D.senseG.visible && V.senseOn, 'sense on');
q('#m4Chips [data-m4=size]').click(); d.step(0.5, 30); A(V.person.visible && !d.D.senseG.visible, 'size replaces sense');
q('#m4Chips [data-m4=size]').click(); d.step(0.5, 30); A(!V.person.visible, 'size off');
// 断面
q('#modeSeg [data-mode=cut]').click(); d.step(1.5, 30); A(d.S.mode === 'cut', 'cut'); q('#modeSeg [data-mode=normal]').click();
// とばす: 4基で前進
q('#tabs [data-tab=fly]').click(); q('#powerBtn').click(); d.step(2, 30); A(d.body.mode === 'free' && d.body.py > 0.04, 'hover', d.body.mode, d.body.py);
q('#flightChips [data-f=pitch]').click(); d.step(0.5, 30); A(d.body.mult.length === 4, 'mult 4'); q('#flightChips [data-f=pitch]').click();
q('#powerBtn').click(); q('#tabs [data-tab=see]').click(); d.step(1, 30);
d.noRender = false;
log.length ? log : 'L OK';
