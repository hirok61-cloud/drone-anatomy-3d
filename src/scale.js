// ===== 重さ・お金・重心 (パッケージ⑥) =====
// 機体の質量配分を積み上げバーで見せ、重心のずれが前後のモーター負担に効くことを体感させる。
const scale = {
  on: false, price: false, payload: 'none', batDz: 0, payDz: 0,
  cg: new THREE.Vector3(), cg0: new THREE.Vector3(), base: 0, total: 0,
  share: [1, 1, 1, 1], over: false, overShown: false, payGhost: null, drag: null, pos: null,
};
const SCALE_L = 0.194;      // モーターの前後(左右)オフセット [m] = 0.275 × cos45°
const SCALE_OVER = 1.35;    // この負担率を超えたら「余裕がない」
// はじめて用: 40キーを SIMPLE_KEYS の8つ + その他 に丸める
const SIMPLE_BUCKET = {
  prop: 'prop', motor: 'motor', arm: 'arm',
  frameTop: 'frameTop', frameBottom: 'frameTop', armClamp: 'frameTop', motorMount: 'frameTop', standoff: 'frameTop', screws: 'frameTop',
  battery: 'battery', xt60: 'battery', balance: 'battery', strap: 'battery', batteryTray: 'battery',
  fc: 'fc', esc: 'fc', pdb: 'fc',
  camera: 'camera', gimbal: 'camera', damper: 'camera',
  landingGear: 'landingGear',
};

function scaleGroupColor(key) { const d = PARTS[key]; const g = d && GROUPS.find(x => x.id === d.group); return g ? g.color : '#8b939f'; }
function scalePayload() { return PAYLOADS.find(p => p.id === scale.payload) || PAYLOADS[0]; }

// 部品の位置を「分解0・アニメ無し」の状態で1度だけ採る（分解中でも重心が動かないように）
function cacheScalePos() {
  D.root.updateWorldMatrix(true, true); scale.pos = {};
  for (const k in MASS) { const ps = partsOf(k); if (ps.length) scale.pos[k] = ps.map(p => D.root.worldToLocal(p.obj.getWorldPosition(new THREE.Vector3()))); }
  let m = 0; for (const k in MASS) { const d = PARTS[k]; if (d && scale.pos[k]) m += MASS[k] * (d.count || 1); }
  scale.base = m;
  computeCG(); scale.cg0.copy(scale.cg);   // 設計上のつり合い点。負担率はここからのずれで測る
}

function computeCG() {
  if (!scale.pos) return;
  const acc = new THREE.Vector3(); let m = 0;
  for (const k in MASS) {
    const d = PARTS[k], pos = scale.pos[k]; if (!d || !pos) continue;
    const each = MASS[k] * (d.count || 1) / pos.length;
    for (const v of pos) { acc.addScaledVector(v, each); m += each; }
  }
  acc.z += MASS.battery * (PARTS.battery.count || 1) * scale.batDz;   // バッテリーを前後にずらした分
  const pay = scalePayload();
  if (pay.g) { acc.x += pay.g * pay.pos[0]; acc.y += pay.g * pay.pos[1]; acc.z += pay.g * (pay.pos[2] + scale.payDz); m += pay.g; }
  scale.total = m; scale.cg.copy(acc).divideScalar(Math.max(1, m));
}

// 各モーターの負担率 = (総重量 / 基準重量) × 前後の配分 × 左右の配分
// M1前右 / M2後右 / M3後左 / M4前左、機首は −z。バッジの % はこの負担率をそのまま示す。
function computeShare() {
  const dz = (scale.cg.z - scale.cg0.z) / SCALE_L, dx = (scale.cg.x - scale.cg0.x) / SCALE_L;
  const ratio = scale.total / Math.max(1, scale.base);
  const sz = [-1, 1, 1, -1], sx = [1, 1, -1, -1];
  for (let i = 0; i < 4; i++) scale.share[i] = ratio * Math.max(0.15, (1 + sz[i] * dz) * (1 + sx[i] * dx));
  scale.over = Math.max(...scale.share) > SCALE_OVER;
}

function setScale(on) {
  on = !!on; if (on === scale.on) return;
  scale.on = on; S.scale = on; document.body.classList.toggle('scale', on);
  if (on && typeof stopOthers === 'function') stopOthers('scale');
  const btn = $('#scaleBtn'); if (btn) { btn.classList.toggle('on', on); btn.setAttribute('aria-pressed', String(on)); }
  $('#massBar').hidden = !on;
  if (!on) document.documentElement.style.removeProperty('--massbar-h');
  if (on) {
    if (S.use) setUse(null);
    if (S.explode > 0.02) setExplode(0);
    if (S.mode === 'cut') setMode('normal');
    if (D.cgMarker) D.cgMarker.visible = true;
    if (D.personGroup) { D.personGroup.visible = !compact(); if (D.personGroup.userData.face) D.personGroup.userData.face(0, 0); if (D.personGroup.userData.rest) D.personGroup.userData.rest(); if (D.personGroup.userData.setGhost) D.personGroup.userData.setGhost(true); }
    setPayload(scale.payload); renderMassBar(); setPower(0.5, true);
    // 機体を主役に枠を決め、人型は「物差し」として画面右の端に腰まで入れる
    focusOn([D.root], { pull: true, margin: 1.75 });
    if (S.camSpring) {
      if (D.personGroup && D.personGroup.visible) { const off = new THREE.Vector3(-0.16, 0.06, -0.15); S.camSpring.p1.add(off); S.camSpring.q1.add(off); }
      if (compact()) S.camSpring.q1.y -= 0.12;   // スマホは下の横バーに隠れないよう機体を上へ
    }
  } else {
    setPrice(false); scale.batDz = 0; scale.payDz = 0; setPayload('none');
    if (D.cgMarker) D.cgMarker.visible = false;
    if (D.personGroup) { D.personGroup.visible = false; if (D.personGroup.userData.setGhost) D.personGroup.userData.setGhost(false); }
    camHome();
    for (let i = 0; i < 4; i++) body.mult[i] = 1;
    for (const B of badgeEls) B.el.classList.remove('over');
    if (S.power > 0) setPower(0, true);
    S.shadowDirty = S.csDirty = S.aoDirty = true;
    D.root.updateWorldMatrix(true, true); focusOn(D.parts.filter(p => partVisible(p) && effVisible(p.obj)).map(p => p.obj), { pull: true });
  }
  syncBodyMode();
}

function setPrice(on) {
  on = !!on; if (on === scale.price && S.price === on) return;
  scale.price = on; S.price = on;
  const b = $('#priceBtn'); if (b) { b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); }
  buildLabels(); renderMassBar();
}

function setPayload(id) {
  scale.payload = PAYLOADS.some(p => p.id === id) ? id : 'none';
  if (scale.payload === 'none') scale.payDz = 0;
  segSet($('#payloadSeg'), 'p', scale.payload);
  const pay = scalePayload();
  if (scale.payGhost) { scale.payGhost.visible = false; }
  if (pay.ghost) {
    if (!scale.payGhost) { scale.payGhost = buildGhost({ ...pay.ghost, pos: pay.pos }, useMat); scale.payGhost.userData.noPick = true; ghostGroup.add(scale.payGhost); }
    scale.payGhost.position.set(pay.pos[0], pay.pos[1], pay.pos[2] + scale.payDz); scale.payGhost.visible = scale.on;
  }
  computeCG(); renderMassBar(); S.shadowDirty = S.csDirty = S.aoDirty = true;
}

// 毎フレーム: バッテリー位置・荷物・重心マーカー・モーター負担
function stepScale() {
  if (!scale.on) return;
  const bp = D.batPart; if (bp) bp.obj.position.z += scale.batDz;
  const pay = scalePayload();
  if (scale.payGhost && scale.payGhost.visible) scale.payGhost.position.z = pay.pos[2] + scale.payDz;
  computeCG(); computeShare();
  if (scale.over !== scale.overShown) {   // 「余裕なし」の注記はドラッグ中も毎フレーム追従させる
    scale.overShown = scale.over; const n = $('#massNote');
    if (n) { n.textContent = scale.over ? scaleOverText() : ''; n.hidden = !scale.over; }
  }
  if (D.cgMarker) { D.cgMarker.position.copy(scale.cg); D.cgMarker.visible = true; const pl = D.cgMarker.userData.plumb; if (pl) { const len = Math.max(0.001, scale.cg.y + 0.158 + body.py); pl.scale.y = len; pl.position.y = -len / 2; } }
  for (let i = 0; i < 4; i++) body.mult[i] = scale.share[i];
}

function scaleOverText() {   // 原因 → 結果 の順で1文に
  const sh = scale.share, rear = sh[1] + sh[2], front = sh[0] + sh[3], ratio = scale.total / Math.max(1, scale.base);
  const tail = '前に進む・風に逆らう力が残りません';
  if (Math.abs(rear - front) < 0.12) return (ratio > 1.2 ? '荷物が重く、' : '') + 'モーターに余裕がありません。' + tail;
  return rear > front ? `重心が後ろに寄り、後ろのモーターに余裕がありません。${tail}` : `重心が前に寄り、前のモーターに余裕がありません。${tail}`;
}
// ---------- 積み上げバー ----------
function massRows() {
  const simple = S.depth === 'simple', map = new Map();
  for (const k in MASS) {
    const d = PARTS[k]; if (!d) continue;
    const bk = simple ? (SIMPLE_BUCKET[k] || '__etc') : k;
    const cur = map.get(bk) || { key: bk, g: 0, yen: 0 };
    cur.g += MASS[k] * (d.count || 1); cur.yen += (PRICE[k] || 0) * (d.count || 1); map.set(bk, cur);
  }
  const pay = scalePayload();
  if (pay.g) map.set('__pay', { key: '__pay', g: pay.g, yen: 0 });
  const rows = [...map.values()];
  for (const r of rows) {
    r.name = r.key === '__etc' ? 'その他' : r.key === '__pay' ? pay.name : ((simple && SIMPLE_NAME[r.key]) || (PARTS[r.key] ? PARTS[r.key].name : r.key));
    r.color = r.key === '__pay' ? '#3b7df7' : r.key === '__etc' ? '#8b939f' : scaleGroupColor(r.key);
  }
  rows.sort((a, b) => b.g - a.g);
  const total = rows.reduce((s, r) => s + r.g, 0);
  for (const r of rows) r.pct = r.g / Math.max(1, total) * 100;
  return { rows, total };
}

function renderMassBar(activeKey) {
  if (!$('#massBar') || !scale.on) return;
  requestAnimationFrame(() => { const el = $('#massBar'); if (el && !el.hidden) document.documentElement.style.setProperty('--massbar-h', el.offsetHeight + 'px'); });   // 説明カードを帯の上に逃がすため実高さを渡す
  const { rows, total } = massRows();
  const act = activeKey && (S.depth === 'simple' ? (SIMPLE_BUCKET[activeKey] || '__etc') : activeKey);
  $('#massStack').innerHTML = rows.map(r => `<i class="seg-i${act && r.key !== act ? ' dim' : ''}" data-key="${r.key}" style="--c:${r.color};--h:${r.pct.toFixed(2)}%" title="${r.name}"></i>`).join('');
  $('#massLegend').innerHTML = rows.map(r => `<button class="mb-row${act && r.key !== act ? ' dim' : ''}" data-key="${r.key}"><i style="background:${r.color}"></i><span class="nm">${r.name}</span><span class="g">${r.g >= 1000 ? (r.g / 1000).toFixed(2) + ' kg' : r.g + ' g'}</span>${scale.price && r.yen ? `<span class="yen">¥${r.yen.toLocaleString()}</span>` : ''}</button>`).join('');
  $('#massTotal').textContent = (total / 1000).toFixed(2) + ' kg';
  const bottles = total / SCALE_TEXT.bottleG;
  let sub = `≒ ${SCALE_TEXT.bottle} ${bottles.toFixed(1)}本`;
  if (compact()) sub += ` ／ ${SCALE_TEXT.person}`;
  sub += `<br>${SCALE_TEXT.perMotor(Math.round(total / 4))}<br>${SCALE_TEXT.energyNote}`;
  $('#massSub').innerHTML = sub;
  const yen = rows.reduce((s, r) => s + r.yen, 0);
  $('#massPrice').innerHTML = scale.price ? `<b>¥${yen.toLocaleString()}</b><span>${SCALE_TEXT.priceNote}</span>` : '';
  $('#massPrice').hidden = !scale.price;
  $('#massNote').textContent = scale.over ? scaleOverText() : '';   // 文言は1か所(stepScale と同じ)に揃える
  $('#massNote').hidden = !scale.over;
}

// ---------- バッテリー / 荷物のドラッグ ----------
const SCALE_DRAG_KEYS = new Set(['battery', 'cells', 'strap', 'batteryTray', 'xt60', 'balance']);
function scaleTryDrag(e) {
  if (!scale.on) return false;
  const w = new THREE.Vector3(); if (!screenToDronePlane(e.clientX, e.clientY, w)) return false;
  let target = null;
  if (scale.payGhost && scale.payGhost.visible) {
    ptr.set((e.clientX / W) * 2 - 1, -(e.clientY / H) * 2 + 1); ray.setFromCamera(ptr, camera);
    if (ray.intersectObject(scale.payGhost, false).length) target = 'pay';
  }
  if (!target) { const p = pickAt(e.clientX, e.clientY); if (p && SCALE_DRAG_KEYS.has(p.key)) target = 'bat'; }
  if (!target) return false;
  const l = D.root.worldToLocal(w.clone());
  scale.drag = { id: e.pointerId, target, z0: l.z, d0: target === 'pay' ? scale.payDz : scale.batDz };
  controls.enabled = false; renderer.domElement.setPointerCapture(e.pointerId); renderer.domElement.classList.add('push');
  return true;
}
function scaleDragMove(e) {
  const dg = scale.drag; if (!dg || e.pointerId !== dg.id) return;
  const w = new THREE.Vector3(); if (!screenToDronePlane(e.clientX, e.clientY, w)) return;
  const l = D.root.worldToLocal(w.clone());
  const v = clamp(dg.d0 + (l.z - dg.z0), -0.045, 0.045);
  if (dg.target === 'pay') scale.payDz = v; else scale.batDz = v;
  S.shadowDirty = S.csDirty = S.aoDirty = true;
}
function scaleDragEnd(e) { if (!scale.drag || e.pointerId !== scale.drag.id) return; scale.drag = null; controls.enabled = true; renderer.domElement.classList.remove('push'); }

function initScale() {
  cacheScalePos();
  $('#payloadSeg').innerHTML = PAYLOADS.map(p => `<button data-p="${p.id}"${p.id === 'none' ? ' class="on"' : ''}>${p.name}</button>`).join('');
  $('#scaleBtn').addEventListener('click', () => setScale(!scale.on));
  $('#priceBtn').addEventListener('click', () => setPrice(!scale.price));
  $('#payloadSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { scale.payDz = 0; setPayload(b.dataset.p); } });
  $('#massLegend').addEventListener('click', e => { const b = e.target.closest('.mb-row'); if (!b) return; const k = b.dataset.key; if (PARTS[k]) select(partsOf(k)[0], true); });
  $('#massLegend').addEventListener('pointerover', e => { const b = e.target.closest('.mb-row'); if (b) renderMassBar(b.dataset.key); });
  $('#massLegend').addEventListener('pointerleave', () => renderMassBar(S.selected && S.selected.key));
  const cv = renderer.domElement;
  cv.addEventListener('pointermove', scaleDragMove);
  cv.addEventListener('pointerup', scaleDragEnd); cv.addEventListener('pointercancel', scaleDragEnd);
}
