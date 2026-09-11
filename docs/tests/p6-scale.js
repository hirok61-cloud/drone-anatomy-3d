// ⑥ 重さ・お金・重心 の検証（ブラウザペインで public/index.html?v=N を開いてから実行）
const log = []; const A = (c, ...m) => { if (!c) log.push('FAIL ' + m.join(' ')); };
const d = window.__d; d.step(1, 60);
document.querySelector('#tabs [data-tab=use]').click(); document.getElementById('scaleBtn').click(); d.step(1.5, 60);
const segs = [...document.querySelectorAll('#massBar .seg-i')]; const total = +document.querySelector('#massTotal').textContent.replace(/[^\d.]/g, '');
const bat = segs.find(s => s.dataset.key === 'battery');
A(Math.abs(total - 2.42) < 0.02, 'total', total); A(bat && +bat.style.getPropertyValue('--h').replace('%','') > 25, 'battery share');
d.__scale.batDz = 0.04; d.step(1.0, 60); const pct = d.D.motors.map(m => Math.round(m.pct));
A(pct[1] >= 104 && pct[1] <= 107 && pct[0] >= 93 && pct[0] <= 95, 'pct', pct);
document.querySelector('#payloadSeg [data-p=box]').click(); d.__scale.payDz = 0.05; d.step(1.0, 60);
A(document.querySelector('.mbadge.over'), 'over badge'); A(document.querySelector('#massBar').textContent.includes('余裕'), 'over note');
document.getElementById('priceBtn').click(); d.step(0.2, 60);
A([...document.querySelectorAll('#labels .lbl')].some(l => l.textContent.startsWith('¥')), 'price labels');
document.getElementById('scaleBtn').click(); d.step(0.5, 60);
A(!d.D.cgMarker.visible && d.body.mult.every(m => Math.abs(m - 1) < 0.02), 'reset');
log.length ? log : '⑥ OK';
