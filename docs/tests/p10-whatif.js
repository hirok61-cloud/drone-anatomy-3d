// ⑩ もしもの5場面 の検証。javascript_tool は実行時間が長いと Internal error になるので、30fps刻み・1場面ずつ呼ぶ
window.__wtest = (ids) => {
 const log = []; const A = (c, m) => { if (!c) log.push('FAIL ' + m); };
 const d = window.__d, w = d.__whatif;
 if (w.active || d.theater.active) { document.getElementById('thQuit').click(); d.step(0.3, 30); }
 document.querySelector('#tabs [data-tab=mishap]').click(); d.step(0.2, 30);
 for (const id of ids) {
  document.querySelector('#whatifCards button[data-w=' + id + ']').click(); d.step(0.5, 30);
  A(w.active && w.phase === 0, id + ' start'); document.getElementById('thNext').click(); let mt = 0, mv = 0, sq = 0;
  for (let i = 0; i < 60 && w.phase < 3; i++) { d.step(0.2, 30); mt = Math.max(mt, Math.hypot(d.body.tx, d.body.tz)); mv = Math.max(mv, Math.hypot(d.body.px, d.body.pz)); sq = Math.max(sq, document.querySelectorAll('#noteCard .parts-seq li').length); }
  A(w.phase === 3, id + ' final'); A(mt <= 0.14 && mv <= 0.26, id + ' small'); A(document.querySelector('#noteCard .two-col') && document.querySelector('#noteCard .caveat'), id + ' card'); A(sq === WHATIF.find(x => x.id === id).parts.length, id + ' parts ' + sq);
  document.getElementById('thQuit').click(); d.step(0.5, 30); A(!w.active && d.body.mult.every(m => Math.abs(m - 1) < 0.02) && !d.S.air, id + ' cleanup');
 }
 return log;
};
// __wtest(['signal']) … __wtest(['person']) を1つずつ。すべて [] なら ⑩ OK
