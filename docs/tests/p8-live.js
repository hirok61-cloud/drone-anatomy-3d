// ⑧ 生きている機体と土台 の検証（localStorage を消して開いてから）。1100px以下のペインでは S.labels が既定オフなので labels の行は S.labels=true にして確認する
const log = []; const A = (c, ...m) => { if (!c) log.push('FAIL ' + m.join(' ')); };
const d = window.__d; d.step(0.5, 60); await new Promise(r => setTimeout(r, 900)); d.step(2, 60);
A(d.body.mode === 'free' && Math.abs(d.body.py - 0.06) < 0.01, 'alive hover', d.body.mode, d.body.py);
A([...document.querySelectorAll('#labels .lbl')].some(l => getComputedStyle(l).display !== 'none') || !d.S.labels, 'labels while alive');
d.body.lookYaw = 0.07; d.step(2, 60); A(d.body.yaw > 0.05 && d.body.yaw <= 0.071, 'look yaw', d.body.yaw); d.body.lookYaw = 0; d.step(2, 60); A(Math.abs(d.body.yaw) < 0.01, 'look back');
document.querySelector('#partList .row').click(); d.step(0.6, 60); A(d.S.power === 0, 'lands on select');
document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await new Promise(r => setTimeout(r, 900)); d.step(1.5, 60); A(d.body.mode === 'free', 'alive again');
document.getElementById('bigBtn').click(); d.step(0.2, 60); d.S.hovered = d.D.parts.find(p => p.key === 'battery'); updateBigBand(); A(!document.getElementById('bigBand').hidden && document.getElementById('bigBand').textContent.includes('バッテリー'), 'big band');
document.getElementById('bigBtn').click();
document.querySelector('#langSeg [data-lang=en]').click(); d.step(0.2, 60);
A(document.querySelector('#tabs [data-tab=fly] span').textContent === 'Fly', 'tab en'); A([...document.querySelectorAll('#labels .lbl')].some(l => l.textContent === 'Battery'), 'label en');
document.querySelector('#langSeg [data-lang=easy]').click(); d.step(0.2, 60); A(document.querySelector('#partList .row[data-key=fc] .nm').textContent.includes('あたま'), 'easy name');
document.querySelector('#langSeg [data-lang=ja]').click();
A(!('speechSynthesis' in window) || typeof speak === 'function', 'speak exists');
log.length ? log : '⑧ OK';
