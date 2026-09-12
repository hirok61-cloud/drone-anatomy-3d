// ⑪⑫⑬ 専門タブ の検証。ペインが隠れていると描画が重いので __d.noRender = true で状態だけ進める（1回の呼び出しで ~10s）
const log = []; const A = (c, ...m) => { if (!c) log.push('FAIL ' + m.join(' ')); };
const d = window.__d, X = window.__expert; d.noRender = true; d.step(0.3, 30);
const seg = (m) => { document.querySelector('#expertSeg [data-x=' + m + ']').click(); d.step(0.5, 30); };
document.querySelector('#tabs [data-tab=expert]').click(); d.step(0.8, 30);
A(d.S.expert && !document.getElementById('expert').hidden, 'tab opens sheet');
// ⑪ センサー
seg('sensors'); A(d.S.expert === 'sensors' && d.body.mode === 'free' && d.S.power > 0, 'sensors: hover', d.body.mode, d.S.power);
A(document.querySelectorAll('#expertBody .chart canvas').length >= 4, 'sensors: 4 charts');
d.body.vx = 0.6; d.step(1.0, 30); A(/ジャイロ/.test(document.getElementById('sensVals').textContent), 'sensors: values');
document.getElementById('xRadio').click(); d.step(0.3, 30); A(X.donut && X.donut.visible && X.donut.children.length === 2, 'sensors: 2 lobes');
const dist = d.camera.position.distanceTo(d.controls.target); A(dist > 0.35, 'sensors: camera outside lobes', dist.toFixed(2));
document.getElementById('xRadio').click(); A(!X.donut.visible, 'sensors: lobes off');
document.getElementById('xHeat').click(); d.step(6.5, 30); A(X.heat > 0.95 && document.querySelectorAll('#heatBars .hb').length === 8, 'sensors: heat', X.heat);
const esc = d.D.parts.find(p => p.key === 'esc'); A(esc.meshes[0].material !== esc.meshes[0].userData.origMat, 'sensors: esc tinted');
// ⑫ 摩耗
seg('wear'); A(d.S.expert === 'wear' && d.S.power === 0, 'wear: grounded'); A(X.heat === 0 && esc.meshes[0].material === esc.meshes[0].userData.origMat, 'wear: heat cleared');
const sl = document.getElementById('xFlights'); sl.value = 120; sl.dispatchEvent(new Event('input')); d.step(0.2, 30);
const prop = d.D.parts.find(p => p.key === 'prop'), frame = d.D.parts.find(p => p.key === 'frameTop');
A(prop.meshes[0].material !== prop.meshes[0].userData.origMat, 'wear: prop tinted (must, 120>100)'); A(frame.meshes[0].material === frame.meshes[0].userData.origMat, 'wear: robust untouched');
A(document.querySelector('#expertBody .wr .nm').textContent.includes('プロペラ'), 'wear: prop first'); A(/¥[\d,]+〜¥[\d,]+/.test(document.getElementById('wearCost').textContent), 'wear: cost range');
// ⑬ 工具箱
seg('toolbox'); A(d.S.expert === 'toolbox' && prop.meshes[0].material === prop.meshes[0].userData.origMat, 'toolbox: wear cleared');
const tb = X.tb; A(tb.kv === 450 && tb.diam === 12 && tb.pitch === 4.5, 'toolbox: defaults');
const r = window.__toolboxCalc ? __toolboxCalc(tb) : null; A(!r || (r.tw > 2 && r.tw < 4 && r.hoverMin > 8 && r.hoverMin < 30), 'toolbox: plausible', r && r.tw, r && r.hoverMin);
document.getElementById('xBlade').click(); d.step(0.3, 30); A(X.bladeDiscs.length === 4 && X.bladeDiscs.every(m => m.visible), 'toolbox: 4 discs');
document.getElementById('xBlade').click(); A(X.bladeDiscs.every(m => !m.visible), 'toolbox: discs off');
document.querySelector('#tabs [data-tab=see]').click(); d.step(0.5, 30); A(!d.S.expert && document.getElementById('expert').hidden && d.S.power === 0, 'leave: cleanup');
A(X.bladeDiscs.every(m => !m.visible) && (!X.donut || !X.donut.visible) && esc.meshes[0].material === esc.meshes[0].userData.origMat, 'leave: visuals cleared');
d.noRender = false;
log.length ? log : '⑪⑫⑬ OK';
