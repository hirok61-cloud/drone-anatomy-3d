// ⑦ 図鑑とカード の検証（localStorage を消してから開き、2段階で実行）
// 段階1
const log = []; const A = (c, ...m) => { if (!c) log.push('FAIL ' + m.join(' ')); };
const d = window.__d; d.step(1, 60);
const row = document.querySelector('#partList .row'); row.click(); d.step(0.2, 60);
await new Promise(r => setTimeout(r, 1700)); d.step(0.2, 60);
A(document.getElementById('codexCount').textContent.trim() === '1/40', 'count', document.getElementById('codexCount').textContent);
A(JSON.parse(localStorage.getItem('drone3d.codex')).length === 1, 'persist');
A(document.querySelector('#detail .trivia'), 'trivia row');
// 段階2: localStorage.setItem('drone3d.codex', JSON.stringify(LIST_ORDER)); location.reload(); の後
// A(!document.querySelector('#modeSeg [data-mode=blueprint]').hidden, 'blueprint unlocked');
// document.querySelector('#modeSeg [data-mode=blueprint]').click(); d.step(0.5,60); A(d.S.mode === 'blueprint');
// window.__poster = await codexPoster(); A(__poster.width === 1600 && __poster.height === 1200, 'poster size');
log.length ? log : '⑦ OK';
