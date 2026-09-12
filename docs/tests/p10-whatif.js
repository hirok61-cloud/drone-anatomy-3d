// ⑩ もしもの5場面 の検証。javascript_tool は実行時間が長いと Internal error になるので、30fps刻み・1場面ずつ呼ぶ
window.__wtest = (ids) => {
 const log = []; const A = (c, m) => { if (!c) log.push('FAIL ' + m); };
 const d = window.__d, w = d.__whatif;
 const whatifProp = (k) => !!(w[k] && w[k].visible);
 if (w.active || d.theater.active) { document.getElementById('thQuit').click(); d.step(0.3, 30); }
 document.querySelector('#tabs [data-tab=mishap]').click(); d.step(0.2, 30);
 for (const id of ids) {
  document.querySelector('#whatifCards button[data-w=' + id + '], #whatifSiteCards button[data-w=' + id + ']').click(); d.step(0.5, 30);
  A(w.active && w.phase === 0, id + ' start'); document.getElementById('thNext').click(); let mt = 0, mv = 0, sq = 0;
  for (let i = 0; i < 60 && w.phase < 3; i++) { d.step(0.2, 30); mt = Math.max(mt, Math.hypot(d.body.tx, d.body.tz)); mv = Math.max(mv, Math.hypot(d.body.px, d.body.pz)); sq = Math.max(sq, document.querySelectorAll('#noteCard .parts-seq li').length); }
  A(w.phase === 3, id + ' final');
  // 機体で起きる場面は「小さく見せる」（姿勢±8°・移動0.25m以内）。場所・時間の場面は、遠ざかる/上がるのが要点なので別の物差しで見る
  const grp = WHATIF.find(x => x.id === id).grp;
  if (grp !== 'site') A(mt <= 0.14 && mv <= 0.26, id + ' small ' + mt.toFixed(2) + '/' + mv.toFixed(2));
  else A(mt <= 0.14 && mv <= 12 && d.body.py <= 2.2, id + ' site range ' + mv.toFixed(2) + '/' + d.body.py.toFixed(2));
  if (id === 'bvlos') A(mv > 6, 'bvlos: 遠ざかる ' + mv.toFixed(1));
  if (id === 'airport') A(d.body.py > 0.9 && whatifProp('apt'), 'airport: 面に届く ' + d.body.py.toFixed(2));
  if (id === 'crowd') A(d.body.py > 1.0 && whatifProp('drop'), 'crowd: 円が広がる ' + d.body.py.toFixed(2));
  if (id === 'night') A(Math.abs(d.body.yaw - Math.PI) < 0.3, 'night: 半回転 ' + d.body.yaw.toFixed(2)); A(document.querySelector('#noteCard .two-col') && document.querySelector('#noteCard .caveat'), id + ' card'); A(sq === WHATIF.find(x => x.id === id).parts.length, id + ' parts ' + sq);
  document.getElementById('thQuit').click(); d.step(0.5, 30);
  A(!w.active && d.body.mult.every(m => Math.abs(m - 1) < 0.02) && !d.S.air, id + ' cleanup');
  A(!whatifProp('apt') && !whatifProp('drop') && !w.night, id + ' props cleared');
 }
 return log;
};
// __wtest(['signal']) … __wtest(['person']) を1つずつ。すべて [] なら ⑩ OK
