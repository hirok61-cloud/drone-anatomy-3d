// ===== 機種の切り替えと、機種ごとの動きへの振り分け =====
// ---------- 機種の切り替え（どの機種でも使う） ----------
function setModel(m) {
  try { sessionStorage.setItem('drone3d.model', m); } catch (e) {}
  const u = new URL(location.href);
  if (m !== 'q550') u.searchParams.set('model', m); else u.searchParams.delete('model');
  for (const k of SHARE_KEYS) u.searchParams.delete(k);   /* 部品の名前が機種ごとに違うので、共有の状態は持ち越さない */
  u.hash = '';
  $('#loading').classList.remove('gone'); $('#loadMsg').textContent = `${MODEL_NAME[m] || '550クラス'} を組み立てています…`;
  setTimeout(() => { try { location.assign(u.toString()); } catch (e) { location.reload(); } }, 30);
}
function initModelUI() {
  document.body.classList.toggle('alt', IS_ALT); document.body.classList.toggle('pd6b', IS_PD6B); document.body.classList.toggle('mavic4', IS_MAVIC); document.body.classList.toggle('matrice4', IS_M4);
  $('#modelName').textContent = MODEL_NAME[MODEL];
  for (const b of $$('#modelPop [data-model]')) { const on = b.dataset.model === MODEL; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); }
  const btn = $('#modelBtn'), pop = $('#modelPop');
  btn.addEventListener('click', e => { e.stopPropagation(); pop.hidden = !pop.hidden; btn.setAttribute('aria-expanded', String(!pop.hidden)); $('#settings').hidden = true; $('#askPop').hidden = true; });
  pop.addEventListener('click', e => { const b = e.target.closest('[data-model]'); if (!b) return; if (b.dataset.model === MODEL) { pop.hidden = true; return; } setModel(b.dataset.model); });
  document.addEventListener('click', e => { if (!e.target.closest('#modelPop') && !e.target.closest('#modelBtn')) { pop.hidden = true; btn.setAttribute('aria-expanded', 'false'); } });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !pop.hidden) { pop.hidden = true; e.stopPropagation(); } }, true);
}


// ---------- 機種ごとの動きへの振り分け（ui.js・live.js・engine.js・app.js から呼ばれる） ----------
// 一覧・部品の約束ごとは機種のデータが持つ
const ALT_DEF = IS_PD6B ? { list: PD6B_LIST_ORDER, sub: PD6B_SUB, perMotor: PD6B_PER_MOTOR } : IS_MAVIC ? { list: MAVIC_LIST_ORDER, sub: MAVIC_SUB, perMotor: MAVIC_PER_MOTOR } : IS_M4 ? { list: M4_LIST_ORDER, sub: M4_SUB, perMotor: M4_PER_MOTOR } : null;
const altUI = () => IS_PD6B ? 'pd6b' : IS_MAVIC ? 'mavic' : IS_M4 ? 'm4' : null;
function altBusy() { return IS_PD6B ? pd6bBusy() : IS_MAVIC ? mavicBusy() : IS_M4 ? m4Busy() : false; }              // 生きている機体（ホバー）を止めたいとき
function altActing() { return IS_PD6B ? !!pd6b.act : IS_MAVIC ? !!mav.act : IS_M4 ? !!m4.act : false; }             // 台本の動きの最中（%表示・自動回転を止める）
function altBodyOwned() { return IS_PD6B ? !!(pd6b.act && pd6b.act.body) : IS_MAVIC ? !!(mav.act && mav.act.body) : IS_M4 ? !!(m4.act && m4.act.body) : false; }   // 機体の位置を動きが持つ
function altWide() { return IS_PD6B ? (!!pd6b.act || pd6b.sizeOn || pd6b.chuteTo > 0) : IS_MAVIC ? mavicWide() : IS_M4 ? m4Wide() : false; }   // 引いた画を保つ
function altShadowExtra() { return IS_PD6B ? pd6bShadowExtra() : IS_MAVIC ? mavicShadowExtra() : IS_M4 ? m4ShadowExtra() : 0; }
function altBlockPower() { return IS_PD6B ? pd6bBlockPower() : IS_MAVIC ? mavicBlockPower() : IS_M4 ? m4BlockPower() : false; }
function altOnTab(tab) { if (IS_PD6B) pd6bOnTab(tab); else if (IS_MAVIC) mavicOnTab(tab); else if (IS_M4) m4OnTab(tab); }
function altStop() { if (IS_PD6B) pd6bStop(); else if (IS_MAVIC) mavicStop(); else if (IS_M4) m4Stop(); }
function altAction(id) { if (IS_PD6B) pd6bAction(id); else if (IS_MAVIC) mavicAction(id); else if (IS_M4) m4Action(id); }
function altVariant() { return IS_PD6B ? pd6b.variant : null; }
// 部品が今の組み合わせに含まれるか（PD6Bは腰下ユニット、Matrice 4 は 4T/4E とアクセサリー）
function altHasVariant(v) { return IS_PD6B ? pd6b.variant === v : IS_M4 ? m4HasVariant(v) : false; }
function stepAlt(dt) { if (IS_PD6B) stepPd6b(dt); else if (IS_MAVIC) stepMavic(dt); else if (IS_M4) stepM4(dt); }
function initAlt() { if (IS_PD6B) initPd6b(); else if (IS_MAVIC) initMavic(); else if (IS_M4) initM4(); }
