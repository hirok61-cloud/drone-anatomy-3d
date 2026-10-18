// K DJI Mavic 4 Pro の検証（public/index.html?model=mavic4 で開いてから。幅1100px超）
const log = []; const A = (c, ...m) => { if (!c) log.push('FAIL ' + m.join(' ')); };
const d = window.__d; const q = (s) => document.querySelector(s); d.noRender = true; d.step(1, 30);
const V = d.mav;
A(document.body.classList.contains('mavic4') && document.body.classList.contains('alt'), 'body class');
A(d.D.motors.length === 4, 'motors 4', d.D.motors.length);
A(window.LIST_ORDER.length === 32, 'parts 32', window.LIST_ORDER.length);
A(q('#modelName').textContent === 'Mavic 4 Pro', 'model name');
for (const t of ['use', 'mishap', 'expert']) A(getComputedStyle(q(`#tabs [data-tab=${t}]`)).display === 'none', 'tab hidden', t);
A(getComputedStyle(q('#mvChips')).display !== 'none' && getComputedStyle(q('#pdChips').closest('.dock-group')).display === 'none', 'chips per model');
// 全部品の解説（くわしく）
q('#depthSeg [data-d=full]').click(); d.step(0.2, 30);
for (const k of window.LIST_ORDER) { A(d.D.parts.some(p => p.key === k), 'part exists', k); const row = q(`#partList .row[data-key="${k}"]`); A(!!row, 'row', k); if (row) { row.click(); A(!q('#detail').hidden && q('#detail h3').textContent.length > 0, 'detail', k); } }
q('#inspBack').click(); d.step(0.2, 30);
// たたむ → 電源が切れる / 広げる → 後方右アームで電源が入る
A(V.powered, 'powered at start');
q('#mvChips [data-mv=fold]').click(); d.step(6.5, 30);
A(V.fold === 1, 'folded', V.fold); A(!V.powered, 'power off after fold');
{ const F = d.D.folds; A(F.every(f => Math.abs(f.fg.rotation.y) > 1.5), 'arms rotated', F.map(f => f.fg.rotation.y.toFixed(2)).join(',')); }
q('#mvChips [data-mv=fold]').click(); d.step(4, 30);
A(V.fold === 0 && V.powered, 'unfold → power on', V.fold, V.powered);
// 電池交換: 畳んだ状態からでも、まず前アームを開く
q('#mvChips [data-mv=fold]').click(); d.step(6.5, 30);
q('#mvChips [data-mv=battery]').click(); d.step(3.2, 30);
{ const b = d.D.batPart; A(V.fold === 0, 'unfolded before battery'); }
d.step(1.5, 30); A(d.D.batPart.anim && d.D.batPart.anim.pos.z > 0.1, 'battery pulled back'); A(!V.powered, 'power off while swapping');
d.step(4, 30); A(!V.act && V.powered, 'battery done', V.powered);
// ジンバル: 上70° → 下90° → 縦撮り → 400°まで回して巻き戻す → 手で傾けても水平
q('#mvChips [data-mv=gimbal]').click(); d.step(1.2, 30);
A(Math.abs(d.D.gimbalParts.tilt.rotation.x - 70 * Math.PI / 180) < 0.02, 'tilt up 70', d.D.gimbalParts.tilt.rotation.x);
d.step(5.1, 30); A(Math.abs(d.D.gimbalParts.roll.rotation.z + Math.PI / 2) < 0.05, 'roll 90', d.D.gimbalParts.roll.rotation.z);
d.step(3.9, 30); A(d.D.gimbalParts.roll.rotation.z < -Math.PI * 2, 'roll beyond 270', d.D.gimbalParts.roll.rotation.z);
d.step(7.3, 30); { const sg = d.D.sg, h = d.D.gimbalParts.head; A(Math.abs(sg.rotation.x) + Math.abs(sg.rotation.z) > 0.05, 'body tilted by hand', sg.rotation.x, sg.rotation.z);
  h.updateWorldMatrix(true, false); const qw = h.getWorldQuaternion(d.camera.quaternion.clone()); const ang = 2 * Math.acos(Math.min(1, Math.abs(qw.w))) * 180 / Math.PI; A(ang < 1.5, 'camera stays level', ang.toFixed(2)); }
d.step(3.5, 30); A(!V.act && d.D.gimbalParts.roll.rotation.z === 0 && d.D.sg.rotation.x === 0, 'gimbal done');
// 3眼: レンズを選ぶとそのカメラだけ光る・絞り
q('#mvChips [data-mv=fov]').click(); d.step(0.3, 30);
q('[data-mvlens=tele]').click(); d.step(0.2, 30);
{ const L = d.D.gimbalParts.lens, C = d.D.fovG.userData.cones; A(L.tele.userData.glow.visible && !L.main.userData.glow.visible && C.tele.visible && !C.main.visible, 'tele selected'); }
q('[data-mvlens=main]').click(); q('[data-mvf="11"]').click(); d.step(1.5, 30);
A(d.D.gimbalParts.iris.geometry.parameters.innerRadius < 0.0015, 'iris f/11', d.D.gimbalParts.iris.geometry.parameters.innerRadius);
q('[data-mvf="2"]').click(); d.step(1.5, 30); A(d.D.gimbalParts.iris.geometry.parameters.innerRadius > 0.006, 'iris f/2');
q('[data-mvlens=all]').click(); q('#mvChips [data-mv=fov]').click(); d.step(0.3, 30);
// 機体のカメラから見る: レンズでFOVが変わる・チルトは70°まで
q('#viewCol [data-v=fpv]').click(); d.step(1, 30);
A(window.__fpv.fpv.on && Math.abs(d.camera.fov - 47.1) < 0.3, 'fpv 28mm', d.camera.fov);
q('#fpvLens [data-z="6"]').click(); d.step(1, 30); A(Math.abs(d.camera.fov - 9.03) < 0.2, 'fpv 168mm', d.camera.fov);
q('#fpvZoomIn').click(); d.step(1, 30); A(d.mav.gim.zoom === 8 && d.camera.fov < 7, 'zoom 8x', d.mav.gim.zoom, d.camera.fov);
window.__fpv.fpv.tilt = 2; d.step(0.3, 30); A(Math.abs(d.mav.gim.tilt - 70 * Math.PI / 180) < 0.01, 'tilt clamp 70', d.mav.gim.tilt);
q('#fpvRoll90').click(); d.step(0.3, 30); A(Math.abs(d.mav.gim.roll - Math.PI / 2) < 0.01, 'fpv roll 90');
q('#fpvOut').click(); d.step(1.2, 30); A(!window.__fpv.fpv.on && d.mav.gim.roll === 0 && d.mav.gim.tilt === 0, 'fpv out');
d.mav.gim.zoom = 1;
// 重ね絵は同時に1つ
q('#mvChips [data-mv=fov]').click(); d.step(0.5, 30); A(d.D.fovG.visible && V.fovOn, 'fov on');
q('#mvChips [data-mv=sense]').click(); d.step(0.5, 30); A(d.D.senseG.visible && !d.D.fovG.visible, 'sense replaces fov');
q('#mvChips [data-mv=size]').click(); d.step(0.5, 30); A(V.person.visible && !d.D.senseG.visible, 'size replaces sense');
q('#mvChips [data-mv=size]').click(); d.step(0.5, 30); A(!V.person.visible, 'size off');
// 断面
q('#modeSeg [data-mode=cut]').click(); d.step(1.5, 30); A(d.S.mode === 'cut', 'cut'); q('#modeSeg [data-mode=normal]').click();
// とばす: 4基で前進
q('#tabs [data-tab=fly]').click(); q('#powerBtn').click(); d.step(2, 30); A(d.body.mode === 'free' && d.body.py > 0.04, 'hover', d.body.mode, d.body.py);
q('#flightChips [data-f=pitch]').click(); d.step(0.5, 30); A(d.body.mult.length === 4, 'mult 4'); q('#flightChips [data-f=pitch]').click();
q('#powerBtn').click(); q('#tabs [data-tab=see]').click(); d.step(1, 30);
d.noRender = false;
log.length ? log : 'K OK';
