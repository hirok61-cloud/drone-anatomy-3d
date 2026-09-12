// 降ろし方（地面効果とボルテックス・リング・ステート）の検証
const log = []; const A = (c, ...m) => { if (!c) log.push('FAIL ' + m.join(' ')); };
const d = window.__d, DZ = window.__descent, D = DZ.descent;
d.noRender = true; d.step(0.3, 30);
document.querySelector('#depthSeg [data-d=full]').click(); d.step(0.2, 30);
document.querySelector('#tabs [data-tab=fly]').click(); d.step(0.3, 30);
A(document.querySelectorAll('#descChips button').length === 2, '入口: 2つのボタン');

const toEnd = () => { for (let i = 0; i < 80 && D.phase !== 'done'; i++) d.step(0.25, 30); };
const run = (mode, waitInVrs) => {   // waitInVrs は「渦に入ってから逃がすまで」の実時間(秒)。null なら逃がさない
  DZ.startDescent(mode); const seen = new Set([D.phase]); let escaped = false, minVx = 9, inVrs = 0;
  for (let i = 0; i < 90 && D.phase !== 'done'; i++) {
    d.step(0.25, 30); seen.add(D.phase);
    if (D.phase === 'fall') minVx = Math.min(minVx, Math.abs(D.vx));
    if (D.phase === 'vrs') { inVrs += 0.25; if (waitInVrs != null && !escaped && inVrs >= waitInVrs) { DZ.descentEscape(); escaped = true; } }
  }
  return { seen, landed: D.landed, phase: D.phase, minVx, txt: (document.getElementById('descBody') || {}).textContent || '' };
};

// まっすぐ: 渦に入って、速い接地になる
{ const r = run('straight', null);
  A(r.phase === 'done', 'まっすぐ: 接地する');
  A(r.seen.has('vrs'), 'まっすぐ: 渦に入る');
  A(r.landed > 1.4, 'まっすぐ: 接地が速い', r.landed.toFixed(2));
  A(/渦に入ったまま/.test(r.txt), 'まっすぐ: 結果の文'); }
// すぐ逃がすと助かる
{ const r = run('straight', 0);
  A(r.seen.has('vrs') && r.seen.has('recover'), '逃がす: 渦 → 立て直し', [...r.seen].join('/'));
  A(r.landed < 0.6, '逃がす: そっと降りる', r.landed.toFixed(2));
  A(/スロットルを変えないまま/.test(r.txt), '逃がす: 結果の文'); }
// 横に流しながら: 渦に入らない。水平方向の速さが目安を下回らない
{ const r = run('slide', null);
  A(!r.seen.has('vrs'), '横に流す: 渦に入らない');
  A(r.landed < 0.9, '横に流す: そっと降りる', r.landed.toFixed(2));
  A(r.minVx > 0.30, '横に流す: 水平の速さを保つ（説明と数値が合う）', r.minVx.toFixed(2));
  A(Math.abs(d.body.px) > 0.3, '横に流す: 実際に横へ動く', d.body.px.toFixed(2)); }

// 画面の要素
A(document.getElementById('noteCard').dataset.kind === 'descent' && document.getElementById('descVals'), 'カードと数値');
A(/対地高度/.test(document.getElementById('descVals').textContent) && /降下率/.test(document.getElementById('descVals').textContent), '数値の中身');
A(D.band && D.band.visible && D.rings && D.rings.length === 4, '小道具: 帯と4つの輪');
A(D.rings.every(r => !r.visible), '接地後は輪が消える');
// 接地後は影とAOの焼き直しを止める
d.S.csDirty = false; d.step(0.5, 30);
A(!d.S.csDirty, '接地後は焼き直しを止める');
// 電源ボタンの文言が実際の状態と合う
A(/止める/.test(document.getElementById('powerBtn').textContent), '場面中: ボタンは「止める」', document.getElementById('powerBtn').textContent);

// 後始末
DZ.stopDescent(); d.step(2.2, 30);
A(!D.active && !D.band.visible && !D.line.visible, 'やめる: 小道具が消える');
A(Math.abs(d.S.ts - 1) < 0.05, 'やめる: 速さが戻る', d.S.ts.toFixed(2));
A(Math.abs(d.body.py) < 0.001 && Math.abs(d.body.px) < 0.001 && d.S.power === 0, 'やめる: 機体が戻る', d.body.py, d.body.px, d.S.power);
A(document.getElementById('noteCard').hidden, 'やめる: カードが閉じる');
A(/プロペラを回す/.test(document.getElementById('powerBtn').textContent), 'やめる: ボタンの文言も戻る');

// 点いているチップをもう一度押すと止まる（降り切ったあとも）
document.querySelector('#descChips [data-dz=slide]').click(); d.step(0.5, 30);
A(D.active && document.querySelector('#descChips [data-dz=slide]').getAttribute('aria-pressed') === 'true', 'チップ: 始まる');
document.querySelector('#descChips [data-dz=slide]').click(); d.step(0.6, 30);
A(!D.active, 'チップ: もう一度で止まる');
document.querySelector('#descChips [data-dz=straight]').click(); toEnd(); d.step(0.5, 30);
A(D.phase === 'done', '降り切る');
document.querySelector('#descChips [data-dz=straight]').click(); d.step(0.6, 30);
A(!D.active && document.getElementById('noteCard').hidden, '降り切ったあともチップで止まる');

// Esc で止まる
document.querySelector('#descChips [data-dz=straight]').click(); d.step(0.5, 30);
document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
d.step(1.2, 30);
A(!D.active, 'Esc: 止まる');

// タブを移ると止まり、死んだカードを残さない
document.querySelector('#descChips [data-dz=slide]').click(); d.step(0.5, 30);
document.querySelector('#tabs [data-tab=see]').click(); d.step(2.2, 30);
A(!D.active && Math.abs(d.S.ts - 1) < 0.05, 'タブを移ると止まる');
A(document.getElementById('noteCard').hidden || document.getElementById('noteCard').dataset.kind !== 'descent', 'タブを移るとカードも消える');
d.noRender = false;
log.length ? log : 'D OK';
