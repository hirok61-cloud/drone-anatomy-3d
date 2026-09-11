// ⑨ 授業・説明会モード の検証（public/index.html?v=N&lesson=class45 で開いてから）
const log = []; const A = (c, ...m) => { if (!c) log.push('FAIL ' + m.join(' ')); };
const d = window.__d; d.step(1, 60); const L = window.__lesson;
A(d.S.lesson && d.S.lesson.id === 'class45' && !document.getElementById('lesson').hidden, 'lesson open');
A(location.search.includes('lesson=class45'), 'url');
document.getElementById('lessonNext').click(); d.step(1.5, 60); A(d.S.lesson.step === 1 && d.S.question && d.S.question.id === 'ccw', 'step1 question');
for (let i = 0; i < 4; i++) { document.getElementById('lessonNext').click(); d.step(1.0, 60); }
A(d.S.lesson.step === 5 && d.theater.active, 'step5 theater'); A(!d.S.question && !d.S.air, 'previous state cleared');
document.getElementById('lessonNext').click(); d.step(1.0, 60); A(window.__quiz.active && !d.theater.active, 'quiz started');
A(!document.querySelector('#noteCard').textContent.match(/正解|点/), 'no scoring');
document.querySelector('#noteActions button').click(); d.step(0.2, 60); A(document.querySelector('#noteCard').textContent.length > 10, 'reveal');
L.quizStop(); L.gotoStep(0); d.step(0.5, 60);
document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })); d.step(0.5, 60); A(d.S.selected && d.S.selected.key === 'prop', 'tour first');
document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })); d.step(0.5, 60); A(d.S.selected.key === 'propNut', 'tour second');
await L.buildPrintSheet(); A(document.querySelectorAll('#printSheet .fill-num').length === 8, 'fill numbers');
L.stopLesson(); d.step(0.5, 60); A(!d.S.lesson && !document.getElementById('inspector').hidden, 'closed');
log.length ? log : '⑨ OK';
