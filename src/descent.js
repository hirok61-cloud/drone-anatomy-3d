// ===== 降ろし方（地面効果とボルテックス・リング・ステート） =====
// 教則 5.2 の2つの現象を、降下のしかたで結果が変わる形で見せる。
//   地面効果: 対地高度がローター直径の1〜2倍以内になると、吹きおろしが地面付近で滞留して揚力が増す（同時に機体は不安定になる）
//   ボルテックス・リング・ステート: 垂直降下や降下を伴う低速前進で自分の吹きおろしを吸い込み、回転翼の上下で空気が再循環して急に揚力を失う
// 数値は見やすさのために小さくしてあるが、「まっすぐ降ろすと落ちる／横に流すと落ちない」という関係は変えていない。
const descent = {
  active: false, mode: null, t: 0, phase: 'idle', vy: 0, vx: 0, escaped: false, landed: 0,
  rings: null, band: null, bandRing: null, line: null, saved: { air: false }, savedTs: 1, lastPhase: '',
};
const DESC_TOP = 2.4;          // 降り始めの対地高度(m)。縦画面は見える帯が狭いので低くする
const descTop = () => (narrow() ? 1.9 : DESC_TOP);
const DESC_GE = 0.60;          // 地面効果の目安(この機体のローター直径のおよそ2倍)
const DESC_VRS_H = 0.85;       // これより低いところでは渦に入る前に地面効果に入る
const DESC_VRS_V = 0.85;       // この降下率を超え、横に動いていないと渦に入る
const DESC_SIDE = 0.30;        // 横にこれだけ動いていれば渦に入らない

function descentProps() {
  if (descent.rings) return;
  // 渦の輪: 各ローターの周りに1つずつ。入ったときだけ出す
  descent.rings = D.motors.map(mo => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(0.168, 0.013, 10, 48),
      new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0, toneMapped: false, depthWrite: false }));
    m.rotation.x = Math.PI / 2; m.position.y = 0.02; m.renderOrder = 5;
    m.userData.noPart = m.userData.noPick = m.userData.noAO = m.userData.noShadow = true;
    mo.group.add(m); return m;
  });
  // 地面効果のおよその範囲: 床から立ち上がる薄い円筒と、その上ぶちの輪
  const g = new THREE.Group(); g.userData.noShadow = true;
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.72, DESC_GE, 64, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x14b8a6, transparent: true, opacity: 0.07, toneMapped: false, side: THREE.DoubleSide, depthWrite: false }));
  cyl.position.y = -0.158 + DESC_GE / 2;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.005, 8, 96),
    new THREE.MeshBasicMaterial({ color: 0x14b8a6, transparent: true, opacity: 0.55, toneMapped: false }));
  ring.rotation.x = Math.PI / 2; ring.position.y = -0.158 + DESC_GE;
  for (const m of [cyl, ring]) { m.userData.noPart = m.userData.noPick = m.userData.noAO = m.userData.noShadow = true; g.add(m); }
  scene.add(g); descent.band = g; descent.bandRing = ring;
  // 高度の手がかり: 機体の真下へ引く細い線
  const line = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 1, 6),
    new THREE.MeshBasicMaterial({ color: 0x8b939f, transparent: true, opacity: 0.35, toneMapped: false }));
  line.userData.noPart = line.userData.noPick = line.userData.noAO = line.userData.noShadow = true;
  scene.add(line); descent.line = line;
}

const descentAim = () => clamp(body.py * 0.5 + 0.2, 0.2, descTop() * 0.5 + 0.25);   // 機体が降りるぶん、見る点も下げる
function startDescent(mode) {
  if (!['straight', 'slide'].includes(mode)) return;
  stopOthers('descent'); stopDescent(true);
  descentProps();
  descent.active = true; descent.mode = mode; descent.t = 0; descent.phase = 'hold'; descent.lastPhase = '';
  descent.vy = 0; descent.vx = mode === 'slide' ? 0.85 : 0; descent.escaped = false; descent.landed = 0;
  S.descent = descent;
  setBodyMode('theater'); setPower(0.5, true); setBodyMode('theater');   /* setPower→syncBodyMode が idle に戻すので、もう一度 theater に置く */
  body.px = mode === 'slide' ? -0.85 : 0; body.pz = 0; body.py = descTop();
  body.tx = body.tz = body.wx = body.wz = 0; body.yaw = 0; body.mult = [1, 1, 1, 1];
  D.motors.forEach(mo => { mo.rpmTarget = null; mo.rpmRate = 3.5; });
  setSticks(false); if (S.selected) select(null);
  descent.saved.air = S.air; S.air = true; for (const x of $$('.tgl[data-t=air]')) x.classList.add('on');   /* 吹きおろしが見えないと、この2つは分からない */
  descent.band.visible = true; descent.line.visible = true;
  descent.savedTs = S.tsTarget; setTimeScale(0.5);   /* 実時間だと1秒で終わってしまう。降下率の数値は変わらない */
  for (const b of $$('#descChips button')) { b.classList.toggle('on', b.dataset.dz === mode); b.setAttribute('aria-pressed', String(b.dataset.dz === mode)); }
  const dist = (descTop() / 2 + 0.55) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * (narrow() ? 1.55 : 1.05);   /* 説明カードが覆うぶんだけ広く取る */
  const dir = new THREE.Vector3(1, 0.56, -1).normalize();
  const aim = new THREE.Vector3(0, descentAim(), 0);
  flyTo(aim.clone().addScaledVector(dir, dist), aim, 900, false);
  renderDescent();
}

function stopDescent(silent) {
  if (!descent.active) { if (!silent) renderDescent(); return; }
  descent.active = false; descent.mode = null; descent.phase = 'idle'; S.descent = null;
  if (descent.rings) for (const r of descent.rings) { r.material.opacity = 0; r.visible = false; }
  if (descent.band) descent.band.visible = false;
  if (descent.line) descent.line.visible = false;
  S.air = descent.saved.air; for (const x of $$('.tgl[data-t=air]')) x.classList.toggle('on', S.air);
  D.motors.forEach(mo => { mo.rpmTarget = null; mo.rpmRate = null; });
  body.tx = body.tz = 0; body.px = body.pz = 0; body.py = 0; body.vx = body.vz = 0;
  for (const b of $$('#descChips button')) { b.classList.remove('on'); b.setAttribute('aria-pressed', 'false'); }
  setTimeScale(descent.savedTs != null ? descent.savedTs : 1);
  setPower(0, true); setBodyMode('idle'); syncBodyMode();
  S.shadowDirty = S.csDirty = S.aoDirty = true;
  if ($('#noteCard').dataset.kind === 'descent') renderNote(null);   /* タブを移っても死んだカードを残さない */
  if (!silent) camHome();
}
function descentEscape() {
  if (!descent.active || descent.phase !== 'vrs') return;
  descent.escaped = true; descent.phase = 'recover'; descent.t = 0; setTimeScale(0.5); renderDescent();
}

// ---------- 毎フレーム ----------
function stepDescent(dtSim) {
  if (!descent.active) return;
  descent.t += dtSim;
  const h = body.py, inGE = h < DESC_GE;
  const ph = descent.phase;

  if (ph === 'hold') { if (descent.t > 0.9) { descent.phase = 'fall'; descent.t = 0; } }
  else if (ph === 'fall') {
    descent.vy = dl(descent.vy, -1.05, dtSim, 1.6);
    if (!descent.escaped && -descent.vy > DESC_VRS_V && Math.abs(descent.vx) < DESC_SIDE && h > DESC_VRS_H) { descent.phase = 'vrs'; descent.t = 0; }   /* 横に流しているかどうかは速さで決める(モードで免除しない) */
  } else if (ph === 'vrs') {
    if (descent.t < 0.05) setTimeScale(0.32);   /* 抜ける操作をする間をつくる */
    // 揚力を失って一気に沈む。姿勢も落ち着かない
    descent.vy = dl(descent.vy, -2.7, dtSim, 2.2);
    const w = Math.sin(descent.t * 7.5), w2 = Math.sin(descent.t * 5.1 + 1.2);
    body.tx = THREE.MathUtils.degToRad(5) * w * (reduceMotion ? 0.3 : 1);
    body.tz = THREE.MathUtils.degToRad(4) * w2 * (reduceMotion ? 0.3 : 1);
  } else if (ph === 'recover') {
    descent.vx = dl(descent.vx, 0.95, dtSim, 2.5);
    body.tx = dl(body.tx, THREE.MathUtils.degToRad(-7), dtSim, 4); body.tz = dl(body.tz, 0, dtSim, 4);
    if (descent.t > 0.7) { descent.vy = dl(descent.vy, -0.55, dtSim, 1.8); }
    if (descent.t > 1.4) { descent.phase = 'fall'; descent.t = 0; }
  }

  // 地面効果: 同じ回転数のままでも沈みが止まる
  if (inGE && ph !== 'vrs') {
    const k = 1 - h / DESC_GE;
    const rate = 3.5 * clamp(1.25 - Math.abs(descent.vy) * 0.32, 0.22, 1);   /* 速く落ちているほど地面効果では止まらない。逃がすのが遅いと間に合わない */
    descent.vy = dl(descent.vy, -0.22 * (1 - 0.7 * k), dtSim, rate);
    body.tx = dl(body.tx, 0, dtSim, 3); body.tz = dl(body.tz, 0, dtSim, 3);
  }

  body.py = Math.max(0, body.py + descent.vy * dtSim);
  body.px += descent.vx * dtSim;
  if (Math.abs(body.px) > 0.85 && Math.sign(descent.vx) === Math.sign(body.px)) descent.vx = -descent.vx;   /* 画の中に収める。止めると水平移動が消えて説明と食い違う */
  body.vy = descent.vy; body.vx = descent.vx;

  if (body.py <= 0.0005 && descent.phase !== 'done') {
    descent.landed = -descent.vy; descent.phase = 'done'; descent.t = 0; descent.vy = 0; descent.vx = 0;
    body.py = 0; body.tz = 0; setTimeScale(0.5);
    D.motors.forEach(mo => { mo.rpmTarget = 0; });
  }
  if (descent.phase === 'done') { descent.vy = 0; descent.vx = 0; body.tx = dl(body.tx, 0, dtSim, 4); body.tz = dl(body.tz, 0, dtSim, 4); }

  // 渦の輪
  if (descent.rings) {
    const want = descent.phase === 'vrs' ? 0.26 + 0.12 * Math.sin(descent.t * 9) : 0;
    for (const r of descent.rings) {
      r.material.opacity += (want - r.material.opacity) * (1 - Math.exp(-dtSim / 0.12));
      r.visible = r.material.opacity > 0.01;
      if (r.visible) { const s = 1 + 0.12 * Math.sin(descent.t * 6); r.scale.set(s, s, 1); r.rotation.z += dtSim * 2.4; }
    }
  }
  // 地面効果は機体の真下で起きる。帯は機体についてくる
  if (descent.band) descent.band.position.set(body.px, 0, body.pz);
  // 地面効果の帯は、入ったら濃くする
  if (descent.bandRing) { const o = inGE ? 0.95 : 0.5; descent.bandRing.material.opacity += (o - descent.bandRing.material.opacity) * (1 - Math.exp(-dtSim / 0.15)); }
  // 高度の線
  if (descent.line) { const y0 = -0.158, len = Math.max(0.001, body.py - y0); descent.line.scale.set(1, len, 1); descent.line.position.set(body.px, y0 + len / 2, body.pz); }

  // 視点は動かさず、見る点だけを機体に合わせて下げる（枠から出ないように）
  if (!S.camSpring && !S.camInertia) { const k = 1 - Math.exp(-dtSim / 0.45); controls.target.y += (descentAim() - controls.target.y) * k; controls.target.x += (body.px * 0.65 - controls.target.x) * k; }
  if (descent.phase !== descent.lastPhase) { descent.lastPhase = descent.phase; renderDescent(); }
  updateDescentVals();
  if (descent.phase !== 'done') S.shadowDirty = S.csDirty = S.aoDirty = true;   /* 降り切ったら影とAOの焼き直しを止める */
}
function updateDescentVals() {
  const el = $('#descVals'); if (!el) return;
  const h = body.py, vy = -descent.vy, vx = Math.abs(descent.vx);
  const state = descent.phase === 'vrs' ? '<b>渦に入った（VRS）</b>' : (h < DESC_GE && descent.phase !== 'hold' && descent.phase !== 'done') ? '<em>地面効果の中</em>' : descent.phase === 'done' ? '接地' : '通常';
  el.innerHTML = `<i class="dot" aria-hidden="true"></i><span>対地高度 ${h.toFixed(2)} m</span><span>降下率 ${vy.toFixed(2)} m/s</span><span>水平方向の速さ ${vx.toFixed(2)} m/s</span><span>${state}</span>`;
}

// ---------- 説明カード ----------
function renderDescent() {
  if (!descent.active) return;
  const straight = descent.mode === 'straight';
  const P = descent.phase;
  let body_ = '', actions = [{ label: 'やめる', fn: () => stopDescent() }];
  if (P === 'hold' || P === 'fall') {
    body_ = straight
      ? '<p>まっすぐ下へ降ろします。降下率が上がると、自分が吹きおろした空気を上から吸い込み始めます。垂直に近いほど、また水平方向の速さが小さいほど起きやすくなります。</p>'
      : '<p>横へ流しながら降ろします。機体が新しい空気の中へ移り続けるぶん、自分の吹きおろしを吸い込みにくくなります。教則は、降下の際に水平方向の移動を合わせて操作することを挙げています。ただし水平方向の速さが足りないと、降下を伴う低速前進でも渦に入るとされています。</p>';
  } else if (P === 'vrs') {
    body_ = '<p><b>ボルテックス・リング・ステート。</b>吹きおろした空気が再び吸い込まれ、回転翼の上下で再循環が起きて急に揚力を失います。スロットルを上げると吹きおろしが強まり、かえって沈みが速くなります。</p><p>抜け方は、横へ流すか前進して、吹きおろしの外の新しい空気に出すこと。<span data-full>教則は「急激に高度が低下し回復できない危険性がある」としています。まず入らないこと（降下に水平方向の移動を合わせること）が第一です。</span></p>';
    actions = [{ label: '横へ逃がす', primary: true, fn: descentEscape }, { label: 'やめる', fn: () => stopDescent() }];
  } else if (P === 'recover') {
    body_ = '<p>横へ流しました。機体が吹きおろしの外に出ると揚力が戻ります。</p>';
  } else if (P === 'done') {
    const v = descent.landed.toFixed(2);
    body_ = descent.escaped && descent.landed > 0.6
      ? `<p><b>接地の速さ ${v} m/s。</b>逃がすのが遅く、沈みが残ったまま地面に届きました。渦は入ってからでは戻しにくいので、まず入らないことが第一です。</p>`
      : descent.landed > 1.2
        ? `<p><b>接地の速さ ${v} m/s。</b>渦に入ったまま降りると、この速さで地面に届きます。教則は「地面に近づくにつれ、降下速度を遅くし、着陸による衝撃を抑えること。衝撃が大きい場合、脚部が変形又は破損するおそれがある」としています。</p>`
        : `<p>接地の速さ ${v} m/s。スロットルを変えないまま、地面効果に入ってから沈みが弱まりました。地面効果だけを見せるためにスロットルは固定していますが、実際の着陸では対地高度に応じて降下速度を落とします（教則${KYOSOKU.ver} 5.2 離着陸時の操作）。</p>`;
    actions = [{ label: 'もう一度', primary: true, fn: () => startDescent(descent.mode) }, { label: straight ? '横に流して比べる' : 'まっすぐ降ろして比べる', fn: () => startDescent(straight ? 'slide' : 'straight') }, { label: 'やめる', fn: () => stopDescent() }];
  }
  // 位相が進むたびにカードを作り直すと、長い注記まで読み上げ直される（#noteCard は aria-live）
  if ($('#noteCard').dataset.kind === 'descent' && $('#descBody') && $('#noteTitle').textContent === (straight ? 'まっすぐ降ろす' : '横に流しながら降ろす')) {
    $('#descBody').innerHTML = body_; renderNoteActions(actions); updateDescentVals(); return;
  }
  renderNote({
    kind: 'descent', title: straight ? 'まっすぐ降ろす' : '横に流しながら降ろす',
    html: `<div id="descVals" class="vals live" aria-live="off"><i class="dot" aria-hidden="true"></i></div><div id="descBody">${body_}</div>
      <p class="hint">緑の帯は地面効果のおよその範囲で、この教材ではローター直径の2倍ほど（約 ${DESC_GE.toFixed(1)} m）に描いています。教則は1.5kg級の機体で対地1m程度を例に挙げています。地面効果は揚力が増える一方で機体が不安定にもなるため、教則は「離陸後は速やかに地面効果外まで上昇する」「地面効果範囲内のホバリングは避け、速やかに着陸させる」としています。<span data-full>渦に入る降下率も水平方向の速さも、この教材では場面が短く収まるよう実機より小さい値にしてあります。実際に入る条件は機体・重量・気象で変わるので、取扱説明書で指定された降下率の範囲に従ってください。</span></p>
      <small class="ky-src">教則${KYOSOKU.ver} 5.2 操縦者に求められる操縦知識（離着陸時の操作）</small>`,
    actions, onClose: () => stopDescent(),
  });
  updateDescentVals();
}

function initDescent() {
  const chips = $('#descChips');
  if (chips) chips.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (descent.active && descent.mode === b.dataset.dz) stopDescent(); else startDescent(b.dataset.dz);   /* 点いているチップをもう一度押す＝止める。やり直しはカードの「もう一度」 */
    for (const x of $$('#descChips button')) x.setAttribute('aria-pressed', String(descent.active && descent.mode === x.dataset.dz)); });
  window.__descent = { descent, startDescent, stopDescent, descentEscape, DESC_GE, DESC_TOP };
}
