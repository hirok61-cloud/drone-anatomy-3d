// ⑩ もしもの5場面 の検証（ブラウザペインで public/index.html?v=N を開いてから実行）
// ツールの応答サイズ制限を避けるため、2〜3場面ずつに分けて呼ぶ
window.__wtest = (ids) => { const log = []; const A = (c, ...m) => { if (!c) log.push('FAIL ' + m.join(' ')); };
const d = window.__d, w = d.__whatif; const info = {};
if (w.active || d.theater.active) { document.getElementById('thQuit').click(); d.step(0.3, 60); }
document.querySelector('#tabs [data-tab=mishap]').click(); d.step(0.2, 60);
for (const id of ids) {
  document.querySelector('#whatifCards button[data-w=' + id + ']').click(); d.step(0.5, 60);
  A(w.active && w.phase === 0, id + ' start');
  document.getElementById('thNext').click(); let mt = 0, mv = 0, sq = 0;
  for (let i = 0; i < 120 && w.phase < 3; i++) { d.step(0.1, 60); mt = Math.max(mt, Math.hypot(d.body.tx, d.body.tz)); mv = Math.max(mv, Math.hypot(d.body.px, d.body.pz)); sq = Math.max(sq, document.querySelectorAll('#noteCard .parts-seq li').length); }
  A(w.phase === 3, id + ' final', w.phase); A(mt <= 0.14 && mv <= 0.26, id + ' small', mt.toFixed(3), mv.toFixed(3));
  A(document.querySelector('#noteCard .two-col') && document.querySelector('#noteCard .caveat'), id + ' card');
  A(sq === WHATIF.find(x => x.id === id).parts.length, id + ' parts', sq);
  info[id] = [+mt.toFixed(3), +mv.toFixed(3), sq];
  document.getElementById('thQuit').click(); d.step(0.5, 60);
  A(!w.active && d.body.mult.every(m => Math.abs(m - 1) < 0.02) && !d.S.air, id + ' cleanup');
}
return { log, info }; };
// __wtest(['signal','battery']) → __wtest(['gps','wind','person']) がともに log: [] なら ⑩ OK
