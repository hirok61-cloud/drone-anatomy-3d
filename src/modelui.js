// ===== 機種の切り替えと、機種ごとの動きへの振り分け =====
// ---------- 機種の切り替え（どの機種でも使う） ----------
function setModel(m) {
  try { sessionStorage.setItem('drone3d.model', m); } catch (e) {}
  const u = new URL(location.href);
  if (m !== 'q550') u.searchParams.set('model', m); else u.searchParams.delete('model');
  for (const k of SHARE_KEYS) u.searchParams.delete(k); u.searchParams.delete('m4v'); u.searchParams.delete('m4acc');   /* 部品の名前が機種ごとに違うので、共有の状態は持ち越さない */
  u.hash = '';
  $('#loading').classList.remove('gone'); $('#loadMsg').textContent = `${MODEL_NAME[m] || '550クラス'} を組み立てています…`;
  setTimeout(() => { try { location.assign(u.toString()); } catch (e) { location.reload(); } }, 30);
}
function initModelUI() {
  document.body.classList.toggle('alt', IS_ALT); document.body.classList.toggle('pd6b', IS_PD6B); document.body.classList.toggle('mavic4', IS_MAVIC); document.body.classList.toggle('matrice4', IS_M4); document.body.classList.toggle('mini5', IS_MINI5); document.body.classList.toggle('wingtra', IS_WT);
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
const ALT_DEF = IS_PD6B ? { list: PD6B_LIST_ORDER, sub: PD6B_SUB, perMotor: PD6B_PER_MOTOR } : IS_MAVIC ? { list: MAVIC_LIST_ORDER, sub: MAVIC_SUB, perMotor: MAVIC_PER_MOTOR } : IS_M4 ? { list: M4_LIST_ORDER, sub: M4_SUB, perMotor: M4_PER_MOTOR } : IS_MINI5 ? { list: MN5_LIST_ORDER, sub: MN5_SUB, perMotor: MN5_PER_MOTOR } : IS_WT ? { list: WT_LIST_ORDER, sub: WT_SUB, perMotor: WT_PER_MOTOR } : null;
const altUI = () => IS_PD6B ? 'pd6b' : IS_MAVIC ? 'mavic' : IS_M4 ? 'm4' : IS_MINI5 ? 'mn5' : IS_WT ? 'wt' : null;
function altBusy() { return IS_PD6B ? pd6bBusy() : IS_MAVIC ? mavicBusy() : IS_M4 ? m4Busy() : IS_MINI5 ? mn5Busy() : IS_WT ? wtBusy() : false; }              // 生きている機体（ホバー）を止めたいとき
function altActing() { return IS_PD6B ? !!pd6b.act : IS_MAVIC ? !!mav.act : IS_M4 ? !!m4.act : IS_MINI5 ? !!mn5.act : IS_WT ? !!wt.act : false; }             // 台本の動きの最中（%表示・自動回転を止める）
function altBodyOwned() { return IS_PD6B ? !!(pd6b.act && pd6b.act.body) : IS_MAVIC ? !!(mav.act && mav.act.body) : IS_M4 ? !!(m4.act && m4.act.body) : IS_MINI5 ? !!(mn5.act && mn5.act.body) : IS_WT ? !!(wt.act && wt.act.body) : false; }   // 機体の位置を動きが持つ
function altWide() { return IS_PD6B ? (!!pd6b.act || pd6b.sizeOn || pd6b.chuteTo > 0) : IS_MAVIC ? mavicWide() : IS_M4 ? m4Wide() : IS_MINI5 ? mn5Wide() : IS_WT ? wtWide() : false; }   // 引いた画を保つ
function altShadowExtra() { return IS_PD6B ? pd6bShadowExtra() : IS_MAVIC ? mavicShadowExtra() : IS_M4 ? m4ShadowExtra() : IS_MINI5 ? mn5ShadowExtra() : IS_WT ? wtShadowExtra() : 0; }
function altBlockPower() { return IS_PD6B ? pd6bBlockPower() : IS_MAVIC ? mavicBlockPower() : IS_M4 ? m4BlockPower() : IS_MINI5 ? mn5BlockPower() : IS_WT ? wtBlockPower() : false; }
function altOnTab(tab) { if (IS_PD6B) pd6bOnTab(tab); else if (IS_MAVIC) mavicOnTab(tab); else if (IS_M4) m4OnTab(tab); else if (IS_MINI5) mn5OnTab(tab); else if (IS_WT) wtOnTab(tab); }
function altStop() { if (IS_PD6B) pd6bStop(); else if (IS_MAVIC) mavicStop(); else if (IS_M4) m4Stop(); else if (IS_MINI5) mn5Stop(); else if (IS_WT) wtStop(); }
function altAction(id) { if (IS_PD6B) pd6bAction(id); else if (IS_MAVIC) mavicAction(id); else if (IS_M4) m4Action(id); else if (IS_MINI5) mn5Action(id); else if (IS_WT) wtAction(id); }
function altVariant() { return IS_PD6B ? pd6b.variant : null; }
// 部品が今の組み合わせに含まれるか（PD6Bは腰下ユニット、Matrice 4 は 4T/4E とアクセサリー）
function altHasVariant(v) { return IS_PD6B ? pd6b.variant === v : IS_M4 ? m4HasVariant(v) : IS_MINI5 ? mn5HasVariant(v) : IS_WT ? wtHasVariant(v) : false; }
function stepAlt(dt) { if (IS_PD6B) stepPd6b(dt); else if (IS_MAVIC) stepMavic(dt); else if (IS_M4) stepM4(dt); else if (IS_MINI5) stepMn5(dt); else if (IS_WT) stepWt(dt); }
// 「眼」に入る直前（fpv.js が今の状態を控える前）。機種の重ね絵と台本の動きを閉じる
function altFpvEnter() {
  if (IS_MAVIC) { if (mav.act) mavicStop(); if (mav.fovOn || mav.senseOn || mav.sizeOn) mvOverlays(null, true); mav._sup = false; S.labelsSuppressed = false; }
  else if (IS_M4) { if (m4.act) m4Stop(); if (m4Wide()) m4Overlays(null, true); m4._sup = false; S.labelsSuppressed = false; }
  else if (IS_MINI5) { if (mn5.act) mn5Stop(); if (mn5Wide()) mn5Overlays(null, true); mn5._sup = false; S.labelsSuppressed = false; }   /* ジンバルの台本が抑えたラベルも戻す（眼が控える値を正しくする） */
}
function altFpvExit() { if (IS_MAVIC) { mav.pendingPower = false; mav.gim.zoom = 1; mvSyncLens(); } else if (IS_M4) { m4.pendingPower = false; m4.gim.zoom = 1; m4.gim.ir = false; m4SyncLens(); } else if (IS_PD6B) pd6b.pendingPower = false; else if (IS_MINI5) { mn5.pendingPower = false; mn5.gim.zoom = 1; } else if (IS_WT) wt.pendingPower = false; }   /* 眼に入るときに保留した電源を、出たあとで回さない */
// 部品を選ぶ前に、その部品が見える組み合わせにする（Matrice 4 の 4T/4E・アクセサリー、PD6B の腰下ユニット）
function altShowPart(k) { const v = PARTS[k] && PARTS[k].variant; if (!v) return;
  if (IS_M4) { if ((v === 't' || v === 'e') && m4.variant !== v) m4SetVariant(v, false); else if ((v === 'spot' && !m4.acc.spot) || (v === 'spk' && !m4.acc.spk)) m4SetAcc(m4.acc.spot || v === 'spot', m4.acc.spk || v === 'spk'); }
  else if (IS_PD6B && pd6b.variant !== v) pd6bSetVariant(v); }
// 床（y=−0.158）を突き抜けないための共通の道具。機体のいちばん低い点を、部品のメッシュの頂点から測る（重ね絵・回転円盤など部品でないものは数えない）
const ALT_FLOOR = -0.158, _altLv = new THREE.Vector3();
function altLowest(root, stride = 3) { root.updateMatrixWorld(true); let low = Infinity;
  root.traverseVisible(c => { if (!c.isMesh || c.userData.noPart) return; const p = c.geometry.attributes.position; if (!p) return;
    for (let k = 0; k < p.count; k += stride) { _altLv.fromBufferAttribute(p, k).applyMatrix4(c.matrixWorld); if (_altLv.y < low) low = _altLv.y; } });
  return low; }
function altLiftAboveFloor(sg) { const low = altLowest(sg); if (low < ALT_FLOOR - 0.0005) sg.position.y += ALT_FLOOR - low; }   /* 手で持って傾ける場面など: 床より下に出た分だけ持ち上げる */
function initAlt() { if (IS_PD6B) initPd6b(); else if (IS_MAVIC) initMavic(); else if (IS_M4) initM4(); else if (IS_MINI5) initMn5(); else if (IS_WT) initWt(); }
