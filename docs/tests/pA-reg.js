// 制度レイヤー(A1〜A6) の検証。__d.noRender = true で状態だけ進める。くわしくモードで実行（制度の注記の既定オン）
const log = []; const A = (c, ...m) => { if (!c) log.push('FAIL ' + m.join(' ')); };
const d = window.__d, R = window.__reg; d.noRender = true; d.step(0.3, 30);
document.querySelector('#depthSeg [data-d=full]').click(); d.step(0.2, 30); R.setReg(true);
A(R.regOn() && document.querySelector('.tgl[data-t=reg]').classList.contains('on'), 'toggle on');
// A1 部品の制度タグ
const pick = (k) => { const r = document.querySelector('#partList .row[data-key=' + k + ']'); if (r) r.click(); else document.querySelector('#partList .group[data-g] button, #partList .row').click(); d.step(0.2, 30); };
pick('regMark');
A(document.querySelectorAll('#detail .reg li').length === 1 && document.querySelector('#detail .d-group .ky'), 'A1 regMark section+chip');
A(/登録.*3年/.test(document.querySelector('#detail .reg').textContent) && document.querySelector('#detail .reg a[href*="mlit.go.jp"]'), 'A1 text+link');
pick('vtx'); A(/5\.7GHz.*5\.8GHz.*2\.4GHz/.test(document.querySelector('#detail .reg').textContent), 'A1 vtx radio');
document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); d.step(0.2, 30);
// A3 チップと対応表
document.querySelector('#tabs [data-tab=mishap]').click(); d.step(0.2, 30);
A(document.querySelectorAll('#whatifCards .ky, #whatifSiteCards .ky').length === WHATIF.length && document.querySelectorAll('#mishapCards .ky').length === document.querySelectorAll('#mishapCards button').length, 'A3 card chips');
document.getElementById('kyBtn').click(); d.step(0.2, 30);
A(document.getElementById('noteCard').dataset.kind === 'kyosoku' && /第5版/.test(document.getElementById('noteTitle').textContent), 'A3 card');
A(document.querySelectorAll('#noteBody .ky-sec').length === 6 && document.querySelector('#noteBody .ky-go button'), 'A3 章から引く（既定は第4章の6節）', document.querySelectorAll('#noteBody .ky-sec').length);
document.querySelector('#noteBody [data-kv=screen]').click(); d.step(0.2, 30);
A(document.querySelectorAll('#noteCard table.ky-tbl tr').length === R.KY_TAB.length + 1, 'A3 画面から引く');
document.querySelector('#noteBody [data-kv=chapter]').click(); d.step(0.2, 30); document.getElementById('noteClose').click();
// A4 もしも → 制度では / A6 報告するなら
document.querySelector('#whatifCards button[data-w=person], #whatifSiteCards button[data-w=person]').click(); d.step(1.0, 30); document.getElementById('thNext').click(); let g = 0; while (d.__whatif.phase < 3 && g++ < 40) d.step(0.5, 30);
A(document.querySelector('#noteCard .reg-line') && document.querySelector('#noteCard .rep .rep-q'), 'A4/A6 whatif card');
document.getElementById('thQuit').click(); d.step(0.4, 30);
// A5 立入管理措置の場面
document.querySelector('#whatifCards button[data-w=tachiiri], #whatifSiteCards button[data-w=tachiiri]').click(); d.step(1.2, 30); const W = d.__whatif;
A(W.active && W.people && W.people.every(p => p.visible) && W.ring2 && W.ring2.visible, 'A5 setup'); document.getElementById('thNext').click(); d.step(2.4, 30);
A(W.people[2].position.x > -4.8 && W.people[2].position.x < -3.6, 'A5 third walks', W.people[2].position.x.toFixed(2));
g = 0; while (W.phase < 3 && g++ < 40) d.step(0.5, 30); A(W.phase === 3 && document.querySelector('#noteCard .reg-line'), 'A5 final');
document.getElementById('thQuit').click(); d.step(0.5, 30); A(!W.active && W.people.every(p => !p.visible) && !W.ring2.visible, 'A5 cleanup');
// A6 劇場
document.querySelector('#mishapCards button[data-m=propReverse]').click(); d.step(0.8, 30); let k = 0; while (d.theater.phase !== 'broken' && k++ < 30) { const n = document.getElementById('thNext'); if (n && !n.hidden) n.click(); d.step(0.8, 30); }
A(document.querySelector('#noteCard .rep-q') && /前右（M1）プロペラ/.test(document.querySelector('#noteCard .rep-q').textContent), 'A6 theater example'); document.getElementById('thQuit').click(); d.step(0.4, 30);
// A2 重量区分
document.querySelector('#tabs [data-tab=use]').click(); d.step(0.2, 30); document.getElementById('scaleBtn').click(); d.step(1.2, 30);
A(!document.getElementById('massReg').hidden && document.querySelectorAll('#massReg .tick').length === 3, 'A2 axis');
let ghost = null; d.D.root.parent.traverse(o => { if (o.userData && o.userData.ring && o.userData.box) ghost = o; }); A(ghost && ghost.visible, 'A2 ghost on');
document.getElementById('scaleBtn').click(); d.step(0.3, 30); A(ghost && !ghost.visible && document.getElementById('massBar').hidden, 'A2 ghost off');
// オフにすると消える
R.setReg(false); d.step(0.2, 30); A(document.querySelectorAll('#whatifCards .ky, #whatifSiteCards .ky').length === 0, 'off hides chips'); R.setReg(true);
d.noRender = false;
log.length ? log : 'A OK';
