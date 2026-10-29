// M DJI Mini 5 Pro の検証（public/index.html?model=mini5 で開いてから。幅1100px超）
const log = []; const A = (c, ...m) => { if (!c) log.push('FAIL ' + m.join(' ')); };
const d = window.__d; const q = (s) => document.querySelector(s); d.noRender = true; d.step(1, 30);
const V = d.mn5, R = Math.PI / 180;
A(document.body.classList.contains('mini5') && document.body.classList.contains('alt'), 'body class');
A(d.D.motors.length === 4, 'motors 4', d.D.motors.length);
A(window.LIST_ORDER.length === 30, 'parts 30', window.LIST_ORDER.length);
A(q('#modelName').textContent === 'Mini 5 Pro', 'model name', q('#modelName').textContent);
for (const t of ['use', 'mishap', 'expert']) A(getComputedStyle(q(`#tabs [data-tab=${t}]`)).display === 'none', 'tab hidden', t);
A(getComputedStyle(q('#mn5Chips')).display !== 'none' && getComputedStyle(q('#m4Chips').closest('.dock-group')).display === 'none', 'chips per model');
// 寸法: 公式の展開時 304×380mm（プロペラあり）。プロペラ 6.0インチ
{ d.D.root.updateMatrixWorld(true); const P = d.D.motors.map(m => m.group.getWorldPosition(d.camera.position.clone()));
  const diag = P[0].distanceTo(P[2]) * 1000; A(Math.abs(diag - 253.6) < 3, 'diagonal', diag.toFixed(1));
  const wid = (Math.max(...P.map(p => p.x)) - Math.min(...P.map(p => p.x)) + 0.1524) * 1000; A(Math.abs(wid - 380) < 6, 'width with props', wid.toFixed(1)); }
// 置いた姿勢: 前脚の先と電池の足で立ち、機首が上がる（約15°）
const aliveWas = d.S.alive; d.S.alive = false; d.step(3, 30);   /* forcedOff は画質の自動調整で上書きされるので使わない */
{ const sg = d.D.sg, L = d.D.legs.map(l => d.altLowest(l.group, 1)), B = d.altLowest(d.D.batPart.obj, 1);
  A(d.body.py < 0.001 && Math.abs(sg.rotation.x - 14.9 * R) < 1.5 * R, 'rest nose up', d.body.py, (sg.rotation.x / R).toFixed(1));
  A(L.every(y => Math.abs(y + 0.158) < 0.0008) && Math.abs(B + 0.158) < 0.0008, 'rest on floor', L.map(y => y.toFixed(4)).join(','), B.toFixed(4)); }
// 全部品の解説（くわしく）
q('#depthSeg [data-d=full]').click(); d.step(0.2, 30);
for (const k of window.LIST_ORDER) { A(d.D.parts.some(p => p.key === k), 'part exists', k); const row = q(`#partList .row[data-key="${k}"]`); A(!!row, 'row', k); if (row) { row.click(); A(!q('#detail').hidden && q('#detail h3').textContent.length > 0, 'detail', k); } }
q('#inspBack').click(); d.step(0.2, 30);
// たたむ → 後方右アームでカウントダウン → 電源オフ / 広げる → 後方右アームで電源オン
A(V.powered, 'powered at start');
q('#mn5Chips [data-mn5=fold]').click(); d.step(1.4, 30);
A(d.altLowest(d.D.sg) > -0.1586, 'no floor penetration while folding', d.altLowest(d.D.sg));
d.step(4, 30);
A(V.fold === 1 && !V.powered && d.D.protector.visible, 'folded', V.fold, V.powered);
{ d.D.root.updateMatrixWorld(true); const ps = d.D.motors.map(m => m.group.getWorldPosition(d.camera.position.clone()));   // 前アームはモーターが後ろ下（裏返し）、後アームは前の上の段
  A(ps.every((p, i) => d.D.motors[i].front ? p.z > 0.04 : p.z < 0.01), 'arms folded', ps.map(p => p.z.toFixed(3) + '/' + p.y.toFixed(3)).join(','));
  A(d.D.motors.every(m => { const u = new d.camera.up.constructor(0, 1, 0).applyQuaternion(m.group.getWorldQuaternion(d.camera.quaternion.clone())); return m.front ? u.y < -0.9 : u.y > 0.9; }), 'front motors upside down');
  const xs = ps.map(p => Math.abs(p.x)); A(Math.max(...xs) < 0.050, 'folded width', xs.map(x => x.toFixed(3)).join(','));
  A(Math.abs(d.altLowest(d.D.sg) + 0.158) < 0.0008, 'folded on floor', d.altLowest(d.D.sg)); }
q('#mn5Chips [data-mn5=fold]').click(); d.step(4, 30);
A(V.fold === 0 && V.powered, 'unfold → power on', V.fold, V.powered);
// 電池交換: 畳んだ状態からでも、まず開く。手に持って浮かせ、後ろへ抜くと差し込み口が見える
q('#mn5Chips [data-mn5=fold]').click(); d.step(5.5, 30);
q('#mn5Chips [data-mn5=battery]').click(); d.step(3.2, 30);
A(V.fold === 0, 'unfolded before battery');
d.step(1.6, 30); A(d.D.batPart.anim && d.D.batPart.anim.pos.z > 0.09 && d.D.bay.visible, 'battery pulled back', d.D.batPart.anim && d.D.batPart.anim.pos.z); A(!V.powered, 'power off while swapping');
A(d.altLowest(d.D.sg) > -0.1586, 'held above floor', d.altLowest(d.D.sg));
d.step(4, 30); A(!V.act && V.powered && !d.D.bay.visible, 'battery done', V.powered);
// ジンバル: 上55° → 下90° → 縦向き(ロール−90°) → −180° → 45° → 手で傾けても水平
q('#mn5Chips [data-mn5=gimbal]').click(); d.step(1.0, 30);
const gp = d.D.gimbalParts;
A(Math.abs(gp.tilt.rotation.x - 55 * R) < 0.02, 'tilt up 55', gp.tilt.rotation.x / R);
d.step(5.2, 30); A(Math.abs(gp.roll.rotation.z - 90 * R) < 0.05, 'roll -90 (portrait)', gp.roll.rotation.z / R);
d.step(1.8, 30); A(Math.abs(gp.roll.rotation.z - 180 * R) < 0.06, 'roll -180', gp.roll.rotation.z / R);
d.step(2.9, 30); A(Math.abs(gp.roll.rotation.z + 45 * R) < 0.05, 'roll +45', gp.roll.rotation.z / R);
d.step(4.0, 30); { const sg = d.D.sg, h = gp.head; A(Math.abs(sg.rotation.x) + Math.abs(sg.rotation.z) > 0.05, 'body tilted by hand', sg.rotation.x, sg.rotation.z);
  h.updateWorldMatrix(true, false); const qw = h.getWorldQuaternion(d.camera.quaternion.clone()); const ang = 2 * Math.acos(Math.min(1, Math.abs(qw.w))) / R; A(ang < 1.5, 'camera stays level', ang.toFixed(2));
  A(d.altLowest(sg) > -0.1586, 'sway above floor', d.altLowest(sg)); }
d.step(4, 30); A(!V.act && gp.roll.rotation.z === 0, 'gimbal done');
d.step(2, 30); A(Math.abs(d.D.sg.rotation.x - V.rest.th) < 0.01, 'back to rest pose', d.D.sg.rotation.x / R);
// 機体のカメラから見る: 24mm と 48mm 中望遠モード・チルトは55°まで・縦向き
q('#viewCol [data-v=fpv]').click(); d.step(1, 30);
A(window.__fpv.fpv.on && Math.abs(d.camera.fov - 56.75) < 0.3, 'fpv 24mm', d.camera.fov);
q('#fpvLens [data-z="2"]').click(); d.step(1, 30); A(Math.abs(d.camera.fov - 30.24) < 0.3, 'fpv 48mm', d.camera.fov);
q('#fpvZoomIn').click(); q('#fpvZoomIn').click(); q('#fpvZoomIn').click(); d.step(0.5, 30); A(V.gim.zoom === 3, 'zoom max 3x', V.gim.zoom);
window.__fpv.fpv.tilt = 2; d.step(0.3, 30); A(Math.abs(V.gim.tilt - 55 * R) < 0.01, 'tilt clamp 55', V.gim.tilt / R);
{ const V3c = d.camera.position.constructor, look = () => { gp.head.updateWorldMatrix(true, false); const qw = gp.head.getWorldQuaternion(d.camera.quaternion.clone()); return [new V3c(0, 0, -1).applyQuaternion(qw), new V3c(1, 0, 0).applyQuaternion(qw)]; };
  window.__fpv.fpv.tilt = -2; let worst = 0; for (let i = 0; i < 20; i++) { d.step(0.1, 30); const [fw] = look(); worst = Math.max(worst, Math.acos(Math.min(1, -fw.y)) / R); }   /* 真下（−90°・特異点）でも狂わない */
  A(worst < 2, 'fpv straight down stays', worst.toFixed(2));
  q('#fpvRoll90').click(); d.step(0.5, 30); { const [fw, rt] = look(); A(Math.acos(Math.min(1, -fw.y)) / R < 2 && Math.abs(rt.x) < 0.05, 'down + portrait', fw.y.toFixed(3), rt.x.toFixed(3)); }
  q('#fpvRoll90').click(); window.__fpv.fpv.tilt = 2; d.step(0.3, 30); }
q('#fpvRoll90').click(); d.step(0.3, 30); A(Math.abs(V.gim.roll + 90 * R) < 0.01, 'fpv portrait');
for (let i = 0; i < 12; i++) q('#fpvRollL').click(); d.step(0.2, 30); A(Math.abs(V.gim.roll + 180 * R) < 0.01, 'roll clamp -180', V.gim.roll / R);
q('#fpvOut').click(); d.step(1.2, 30); A(!window.__fpv.fpv.on && V.gim.roll === 0 && V.gim.tilt === 0, 'fpv out');
V.gim.zoom = 1;
// 重ね絵は同時に1つ
q('#mn5Chips [data-mn5=fov]').click(); d.step(0.5, 30); A(d.D.fovG.visible && V.fovOn, 'fov on');
q('#mn5Chips [data-mn5=sense]').click(); d.step(0.5, 30); A(d.D.senseG.visible && !d.D.fovG.visible, 'sense replaces fov');
q('#mn5Chips [data-mn5=size]').click(); d.step(0.5, 30); A(V.person.visible && V.ghost.visible && !d.D.senseG.visible, 'size replaces sense');
q('#mn5Chips [data-mn5=size]').click(); d.step(0.5, 30); A(!V.person.visible, 'size off');
// 分解すると水平に戻して散らす
d.S.explode = 0; { const s = q('#explode'); if (s) { s.value = 100; s.dispatchEvent(new Event('input')); } } d.step(2, 30); A(Math.abs(d.D.sg.rotation.x) < 0.01, 'level when exploded', d.D.sg.rotation.x);
{ const s = q('#explode'); if (s) { s.value = 0; s.dispatchEvent(new Event('input')); } } d.step(2, 30);
// 断面
q('#modeSeg [data-mode=cut]').click(); d.step(1.5, 30); A(d.S.mode === 'cut', 'cut'); q('#modeSeg [data-mode=normal]').click();
// とばす: 浮くと水平。4基で前進
q('#tabs [data-tab=fly]').click(); q('#powerBtn').click(); d.step(2, 30); A(d.body.mode === 'free' && d.body.py > 0.04, 'hover', d.body.mode, d.body.py);
A(Math.abs(d.D.sg.rotation.x) < 0.01, 'level in flight', d.D.sg.rotation.x);
q('#flightChips [data-f=pitch]').click(); d.step(0.5, 30); A(d.body.mult.length === 4, 'mult 4'); q('#flightChips [data-f=pitch]').click();
q('#powerBtn').click(); q('#tabs [data-tab=see]').click(); d.step(3, 30);
A(Math.abs(d.D.sg.rotation.x - V.rest.th) < 0.01, 'rest again after landing', d.D.sg.rotation.x / R);
d.S.alive = aliveWas;
d.noRender = false;
log.length ? log : 'M OK';
