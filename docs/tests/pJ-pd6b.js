// J PD6B-CAT3 の検証（public/index.html?model=pd6b で開いてから。幅1100px超）
const log = []; const A = (c, ...m) => { if (!c) log.push('FAIL ' + m.join(' ')); };
const d = window.__d; const q = (s) => document.querySelector(s); d.noRender = true; d.step(1, 30);
const P = d.pd6b;
A(document.body.classList.contains('pd6b'), 'body.pd6b');
A(d.D.motors.length === 6, 'motors 6', d.D.motors.length);
A(window.LIST_ORDER.length === 35, 'parts 35', window.LIST_ORDER.length);
A(q('#modelName').textContent === 'PD6B-CAT3', 'model name');
// 非対応のタブ・授業・質問は隠れている
for (const t of ['use', 'mishap', 'expert']) A(getComputedStyle(q(`#tabs [data-tab=${t}]`)).display === 'none', 'tab hidden', t);
A(getComputedStyle(q('#askBtn')).display === 'none' && getComputedStyle(q('#lessonBtn')).display === 'none', 'ask/lesson hidden');
A(getComputedStyle(q('#viewCol [data-v=fpv]')).display === 'none', 'fpv hidden');
// 全部品の解説を「くわしく」で開いても落ちない（6基ぶんの部品は M1〜M6 が出る）
q('#depthSeg [data-d=full]').click(); d.step(0.2, 30);
for (const k of window.LIST_ORDER) A(d.D.parts.some(p => p.key === k), 'part exists', k);
for (const k of window.LIST_ORDER) { const row = q(`#partList .row[data-key="${k}"]`); if (k === 'surveyUnit') { A(!row, 'survey row hidden while cargo'); continue; } A(!!row, 'row', k); if (row) { row.click(); A(!q('#detail').hidden && q('#detail h3').textContent.length > 0, 'detail', k); } }
// 6基の部品は個別に M1〜M6 を名乗る
{ const sel = d.D.parts.find(p => p.key === 'esc' && p.idx === 4); A(!!sel, 'esc M5'); }
q('#inspBack').click(); d.step(0.2, 30);
// たたむ → 広げる
q('#pdChips [data-pd=fold]').click(); d.step(6, 30);
A(P.fold === 1, 'folded', P.fold); A(Math.abs(d.D.pivots[0].rotation.z - THREE_DEG(78)) < 0.01, 'pivot angle');
A(d.D.motors.every(mo => Math.abs(((mo.angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) - Math.PI / 2) < 0.01), 'props aligned');
A(q('#pdChips [data-pd=fold]').textContent === 'ひろげる', 'chip label');
// 畳んだままプロペラを回そうとすると、先に広げる
q('#tabs [data-tab=fly]').click(); d.step(3.5, 30); A(P.fold === 0, 'unfold on fly tab', P.fold);
q('#tabs [data-tab=see]').click(); d.step(0.5, 30);
// 電池交換
q('#pdChips [data-pd=swap]').click(); d.step(2.0, 30);
{ const b = d.D.parts.filter(p => p.key === 'battery')[1]; A(b.anim && b.anim.pos.y > 0.25, 'battery lifted'); A(/3本/.test(q('#pdSwapState').textContent), 'swap state 3'); }
d.step(4.5, 30); A(!P.act, 'swap done');
// 荷物を置く: 機体は上がり、箱は床に残る
q('#pdChips [data-pd=drop]').click(); d.step(4.6, 30);
A(d.body.mode === 'theater' && d.body.py > 0.2, 'drone lifted', d.body.mode, d.body.py);
{ const box = d.D.boxPart.obj; box.updateWorldMatrix(true, false); const y = new THREE_V3().setFromMatrixPosition(box.matrixWorld).y; A(Math.abs(y - (-0.365 * 0.29811)) < 0.01, 'box stays on floor', y.toFixed(3)); }
d.step(5.5, 30); A(!P.act && d.body.mode !== 'theater' && d.body.py < 0.002, 'drop done', d.body.mode, d.body.py);
// パラシュート
q('#pdChips [data-pd=chute]').click(); d.step(1.5, 30); A(d.D.chute.visible && P.chuteK > 0.99, 'chute open'); A(q('#noteCard').dataset.kind === 'pd6b-chute', 'chute card');
q('#pdChips [data-pd=chute]').click(); d.step(1.0, 30); A(!d.D.chute.visible, 'chute closed');
// 付け替え
q('#pdChips [data-pd=unit]').click(); d.step(2.2, 30);
A(P.variant === 'survey' && d.D.svPart.hidden === false && d.D.boxPart.hidden === true, 'survey attached');
A(!!q('#partList .row[data-key=surveyUnit]') && !q('#partList .row[data-key=cargoBox]'), 'list follows variant');
q('#pdChips [data-pd=unit]').click(); d.step(2.2, 30); A(P.variant === 'cargo', 'cargo back');
// 大きさ
q('#pdChips [data-pd=size]').click(); d.step(1, 30); A(P.person.visible && P.ghost.visible, 'size on');
q('#pdChips [data-pd=size]').click(); d.step(1, 30); A(!P.person.visible, 'size off');
// 断面: モーターとバッテリーを切る
q('#modeSeg [data-mode=cut]').click(); d.step(1.5, 30); A(d.S.mode === 'cut', 'cut'); q('#modeSeg [data-mode=normal]').click();
// 飛行の原理: 前進は前2基が遅く後ろ2基が速い、真横はそのまま
q('#tabs [data-tab=fly]').click(); q('#flightChips [data-f=pitch]').click(); d.body.t = 0; d.step(0.05, 30);
{ const m = window.FLIGHT.pitch.mult; A(m[0] < 1 && m[5] < 1 && m[2] > 1 && m[3] > 1 && Math.abs(m[1] - 1) < 1e-6 && Math.abs(m[4] - 1) < 1e-6, 'pitch mult', m.join(',')); }
q('#flightChips [data-f=pitch]').click(); d.step(0.5, 30);
A(d.body.mult.length === 6, 'mult 6');
// 共有リンクは機種を保つ
A(/model=pd6b/.test(shareUrlForTest()), 'share keeps model');
q('#tabs [data-tab=see]').click(); d.step(0.5, 30);
d.noRender = false;
function THREE_DEG(x) { return x * Math.PI / 180; }
function THREE_V3() { return d.camera.position.clone().set(0, 0, 0); }
function shareUrlForTest() { const u = new URL(location.href); return u.toString(); }
log.length ? log : 'J OK';
