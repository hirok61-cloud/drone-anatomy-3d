// 飛行前の点検・確認シート（印刷）と、教則の逆引きの検証。くわしく で実行する
const log = []; const A = (c, ...m) => { if (!c) log.push('FAIL ' + m.join(' ')); };
const d = window.__d, P = window.__preflight, R = window.__reg, SH = window.__share;
const PREFLIGHT = P.PREFLIGHT, KYOSOKU = R.KYOSOKU, WHATIF_REG = R.WHATIF_REG;
d.noRender = true; d.step(0.3, 30);
document.querySelector('#depthSeg [data-d=full]').click(); d.step(0.2, 30);

// ---- 01 飛行前の点検・確認シート ----
document.getElementById('lessonBtn').click(); d.step(0.2, 30);
A(document.getElementById('pfBtn') && document.getElementById('kyBtn'), '入口: 授業ポップに2つのボタン');
document.getElementById('pfBtn').click(); d.step(0.2, 30);
A(document.getElementById('noteCard').dataset.kind === 'preflight' && document.getElementById('pfLen'), 'PF: 長さを選ぶカード');
const short = P.preflightCount(false), full = P.preflightCount(true);
A(short >= 35 && short <= 60, 'PF: みじかい版は現場で潰せる量', short);
A(full > short * 2, 'PF: くわしい版は全部品ぶん', full);
P.preflight.detail = 'short'; await P.buildPreflightSheet();
{ const ps = document.getElementById('printSheet');
  A(ps.querySelectorAll('.pf-sec').length === PREFLIGHT.length, 'PF: 節の数', ps.querySelectorAll('.pf-sec').length);
  A(ps.querySelectorAll('.pf-list:not(.pf-add) li').length > 20, 'PF: 法定・教則の項目');
  A(ps.querySelectorAll('.pf-add li').length > 0 && ps.querySelectorAll('.pf-sub').length > 0, 'PF: 追加は別の見出しで分ける');
  A(/様式2/.test(ps.textContent) && /そのものではありません/.test(ps.textContent), 'PF: 様式2との違いを断る');
  A(/第132条の86/.test(ps.textContent) && /236条の77/.test(ps.textContent), 'PF: 根拠条文');
  A(ps.querySelectorAll('.pf-head i').length === 6, 'PF: 記入欄');
  A(!/undefined/.test(ps.textContent), 'PF: 未定義の差し込みがない');
}
P.preflight.detail = 'full'; await P.buildPreflightSheet();
A(document.getElementById('printSheet').querySelectorAll('.pf-list li').length === full, 'PF: くわしい版の項目数');
P.preflight.detail = 'short';
document.getElementById('noteClose').click(); d.step(0.2, 30);

// ---- 02 教則の逆引き ----
document.getElementById('lessonBtn').click(); d.step(0.2, 30); document.getElementById('kyBtn').click(); d.step(0.2, 30);
A(R.kyView.mode === 'chapter', '逆引き: 既定は章から引く');
for (const c of ['2', '3', '4', '5', '6']) {
  document.querySelector(`#noteBody [data-kc="${c}"]`).click(); d.step(0.1, 30);
  const secs = [...document.querySelectorAll('#noteBody .ky-sec h4')].map(h => h.textContent);
  const want = Object.keys(KYOSOKU.chapters).filter(k => k.startsWith(c + '.'));
  A(secs.length === want.length, `逆引き: 第${c}章の節の数 ${secs.length}/${want.length}`);
  A(document.querySelectorAll('#noteBody .ky-go button').length > 0, `逆引き: 第${c}章に飛び先がある`);
}
// 章の名前と節の見出しが教則の目次どおりか（抜き取り）
A(KYOSOKU.chapterNames['6'] === '運航上のリスク管理', '教則: 第6章の名称');
A(KYOSOKU.chapters['5.3'] === '操縦者のパフォーマンス' && KYOSOKU.chapters['2.1'] === '操縦者の役割と責任', '教則: 目次に載っている節がそろっている');
// すべての飛び先が実在の画面を指すか
for (const [sec, list] of Object.entries(R.KY_JUMP)) {
  A(KYOSOKU.chapters[sec], `逆引き: ${sec} は教則にある節`);
  for (const j of list) {
    if (j.act) { A(j.act === 'preflight', `逆引き: ${sec} の動作 ${j.act}`); continue; }
    const g = j.go || {};
    if (g.part) A(PARTS[g.part], `逆引き: ${sec} の部品 ${g.part}`);
    if (g.whatif) A(WHATIF.some(w => w.id === g.whatif), `逆引き: ${sec} の場面 ${g.whatif}`);
    if (g.mishap) A(MISHAPS.some(m => m.id === g.mishap), `逆引き: ${sec} のまちがい ${g.mishap}`);
    if (g.use) A(USES.some(u => u.id === g.use), `逆引き: ${sec} の用途 ${g.use}`);
    if (g.flight) A(FLIGHT[g.flight], `逆引き: ${sec} の飛行 ${g.flight}`);
    if (g.expert) A(EXPERT_MODES.includes(g.expert), `逆引き: ${sec} の専門 ${g.expert}`);
    A(/^https?:/.test(SH.stateUrl(g)), `逆引き: ${sec} のリンクが作れる`);
  }
}
// 押すとその画面に切り替わる
document.querySelector('#noteBody [data-kc="4"]').click(); d.step(0.1, 30);
{ const btn = [...document.querySelectorAll('#noteBody .ky-go button')].find(b => b.textContent.includes('モーターの中身'));
  A(btn, '逆引き: 4.4 にモーターの飛び先'); btn.click(); d.step(0.4, 30);
  A(d.S.selected && d.S.selected.key === 'motor' && d.S.mode === 'cut' && document.getElementById('noteCard').hidden, '逆引き: 押すとその画面になる'); }
document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); d.step(0.2, 30);
document.querySelector('#modeSeg [data-mode=normal]').click(); d.step(0.2, 30);

// ---- 03 もしもの4場面が並んでいるか ----
document.querySelector('#tabs [data-tab=mishap]').click(); d.step(0.2, 30);
A(document.querySelectorAll('#whatifCards button').length === WHATIF.filter(w => w.grp !== 'site').length, 'もしも: 機体の組');
A(document.querySelectorAll('#whatifSiteCards button').length === WHATIF.filter(w => w.grp === 'site').length, 'もしも: 場所・時間の組');
for (const id of ['night', 'bvlos', 'airport', 'crowd']) {
  A(document.querySelector(`#whatifSiteCards button[data-w=${id}]`), `もしも: ${id} のカード`);
  A(WHATIF_REG[id] && /3\.1|4\.2/.test(WHATIF_REG[id].ky), `もしも: ${id} の制度の1行`);
}
d.noRender = false;
log.length ? log : 'C OK';
