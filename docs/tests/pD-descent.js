// 降ろし方（地面効果とボルテックス・リング・ステート）の検証
const log = []; const A = (c, ...m) => { if (!c) log.push('FAIL ' + m.join(' ')); };
const d = window.__d, DZ = window.__descent, D = DZ.descent;
d.noRender = true; d.step(0.3, 30);
document.querySelector('#depthSeg [data-d=full]').click(); d.step(0.2, 30);
document.querySelector('#tabs [data-tab=fly]').click(); d.step(0.3, 30);
A(document.querySelectorAll('#descChips button').length === 2, '入口: 2つのボタン');

const run = (mode, escapeAt) => {
  document.querySelector(`#descChips [data-dz=${mode}]`).click(); d.step(0.6, 30);
  const seen = new Set([D.phase]); let escaped = false;
  for (let i = 0; i < 60 && D.phase !== 'done'; i++) {
    d.step(0.3, 30); seen.add(D.phase);
    if (escapeAt && D.phase === 'vrs' && !escaped) { DZ.descentEscape(); escaped = true; }
  }
  return { seen, landed: D.landed, phase: D.phase };
};

// まっすぐ: 渦に入って、速い接地になる
{ const r = run('straight', false);
  A(r.phase === 'done', 'まっすぐ: 接地する');
  A(r.seen.has('vrs'), 'まっすぐ: 渦に入る');
  A(r.landed > 1.4, 'まっすぐ: 接地が速い', r.landed.toFixed(2)); }
// 途中で横へ逃がすと助かる
{ const r = run('straight', true);
  A(r.seen.has('vrs') && r.seen.has('recover'), '逃がす: 渦 → 立て直し', [...r.seen].join('/'));
  A(r.landed < 0.9, '逃がす: そっと降りる', r.landed.toFixed(2)); }
// 横に流しながら: 渦に入らない
{ const r = run('slide', false);
  A(!r.seen.has('vrs'), '横に流す: 渦に入らない');
  A(r.landed < 0.9, '横に流す: そっと降りる', r.landed.toFixed(2));
  A(Math.abs(d.body.px) > 0.5, '横に流す: 実際に横へ動く', d.body.px.toFixed(2)); }

// 画面の要素
A(document.getElementById('noteCard').dataset.kind === 'descent' && document.getElementById('descVals'), 'カードと数値');
A(/対地高度/.test(document.getElementById('descVals').textContent) && /降下率/.test(document.getElementById('descVals').textContent), '数値の中身');
A(D.band && D.band.visible && D.rings && D.rings.length === 4, '小道具: 帯と4つの輪');
A(D.rings.every(r => r.material.opacity < 0.02), '接地後は輪が消える');

// 後始末
DZ.stopDescent(); d.step(2.2, 30);
A(!D.active && !D.band.visible && !D.line.visible, 'やめる: 小道具が消える');
A(Math.abs(d.S.ts - 1) < 0.05, 'やめる: 速さが戻る', d.S.ts.toFixed(2));
A(d.body.py === 0 && d.body.px === 0 && d.S.power === 0, 'やめる: 機体が戻る');
A(document.getElementById('noteCard').hidden, 'やめる: カードが閉じる');
// タブを移ると止まる
document.querySelector('#descChips [data-dz=slide]').click(); d.step(0.5, 30);
A(D.active, 'もう一度はじめられる');
document.querySelector('#tabs [data-tab=see]').click(); d.step(2.2, 30);
A(!D.active && Math.abs(d.S.ts - 1) < 0.05, 'タブを移ると止まる');
d.noRender = false;
log.length ? log : 'D OK';
