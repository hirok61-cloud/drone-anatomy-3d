// 共有リンクと部品検索の検証。くわしく で実行する（検索欄は「くわしく」のときだけ出る）
const log = []; const A = (c, ...m) => { if (!c) log.push('FAIL ' + m.join(' ')); };
const d = window.__d, SH = window.__share; d.noRender = true; d.step(0.3, 30);
document.querySelector('#depthSeg [data-d=full]').click(); d.step(0.2, 30);

// ---- 検索 ----
const inp = document.getElementById('partFind'); A(inp, 'find box exists');
const hits = (q) => { inp.value = q; inp.dispatchEvent(new Event('input')); return [...document.querySelectorAll('#partList .row')].filter(r => !r.hidden).map(r => r.dataset.key); };
A(hits('ぷろぺら').includes('prop'), 'find: ひらがな→カタカナ');
A(hits('ESC').length === 1 && hits('esc')[0] === 'esc', 'find: 英字・大小無視');
A(hits('電池').includes('battery'), 'find: 言い換え(電池→バッテリー)');
A(hits('羽').includes('prop') && hits('頭脳').includes('fc') && hits('あし').includes('landingGear'), 'find: 言い換え(羽/頭脳/あし)');
A(hits('gps').includes('gps'), 'find: gps');
A(hits('zzzz').length === 0 && /見つかりません/.test(document.getElementById('findNote').textContent), 'find: 0件の案内');
A(hits('綾織').length > 0 && /説明文から/.test(document.getElementById('findNote').textContent), 'find: 説明文からの取りこぼし救済');
{ hits('モーター'); const g = [...document.querySelectorAll('#partList .grp')].filter(x => !x.hidden); A(g.length > 0 && g.every(x => { let n = 0; for (let e = x.nextElementSibling; e && e.classList.contains('row'); e = e.nextElementSibling) if (!e.hidden) n++; return n > 0; }), 'find: 空の見出しを畳む'); }
inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); d.step(0.2, 30);
A(d.S.selected && d.S.selected.key === 'motor', 'find: Enter は本命を開く（モーターマウントではない）', d.S.selected && d.S.selected.key);
inp.value = ''; inp.dispatchEvent(new Event('input'));
A(document.getElementById('partCount').textContent === `${LIST_ORDER.length} 部品`, 'find: 消すと全件に戻る');

// ---- 共有リンク ----
document.querySelector('#modeSeg [data-mode=xray]').click(); d.step(0.2, 30);
{ const e = document.getElementById('explode'); e.value = 40; e.dispatchEvent(new Event('input')); }
document.querySelector('#partList .row[data-key=gps]').click(); d.step(0.3, 30);
const u = new URL(SH.shareUrl());
A(u.searchParams.get('p') === 'gps' && u.searchParams.get('m') === 'xray' && u.searchParams.get('d') === 'full', 'share: 部品・見え方・くわしさ');
A(Math.abs(+u.searchParams.get('e') - 40) <= 1, 'share: 分解', u.searchParams.get('e'));
A((u.searchParams.get('c') || '').split(',').length === 7, 'share: 視点7要素', u.searchParams.get('c'));
A(/GNSS/.test(SH.shareSummary()) && /すけて見る/.test(SH.shareSummary()), 'share: 説明文', SH.shareSummary());
// 既定の画面ではキーが増えない（最初の画面のリンクが長くならない）
document.querySelector('#modeSeg [data-mode=normal]').click(); { const e = document.getElementById('explode'); e.value = 0; e.dispatchEvent(new Event('input')); }
document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); d.step(0.3, 30);
{ const q = new URL(SH.shareUrl()).searchParams; A(!q.has('m') && !q.has('e') && !q.has('p'), 'share: 既定値は載せない', [...q.keys()].join(',')); }
// 場面のリンク
document.querySelector('#tabs [data-tab=mishap]').click(); d.step(0.2, 30);
document.querySelector('#whatifCards button[data-w=wind]').click(); d.step(0.8, 30);
A(new URL(SH.shareUrl()).searchParams.get('w') === 'wind', 'share: もしもの場面');
document.getElementById('thQuit').click(); d.step(0.4, 30);
// 受け取り側の検証は applyShare を直に呼んで確かめる（location を書き換えずに済ませる）
d.noRender = false;
log.length ? log : 'B OK';
