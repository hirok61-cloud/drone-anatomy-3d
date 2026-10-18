// ===== DJI Mavic 4 Pro の固有の動き =====
// たたむ（広げると後方右アームで電源オン）・電池交換・ジンバル（上向き70°・縦撮り・360°）・3眼の画角・検知範囲・大きさ
const mav = { fold: 0, foldTo: 0, act: null, powered: true, fovOn: false, senseOn: false, sizeOn: false, person: null, ghost: null, pendingPower: false, _sup: false, _last: -1 };

// ---------- 状態の問い合わせ ----------
function mavicBusy() { return IS_MAVIC && (mav.foldTo > 0 || mav.fold > 0.001 || !!mav.act || mav.sizeOn || mav.fovOn || mav.senseOn); }
function mavicWide() { return mav.sizeOn || mav.fovOn || mav.senseOn; }
function mavicShadowExtra() { return mav.sizeOn ? 1.1 : 0; }
function mavicBlockPower() {
  if (!IS_MAVIC) return false;
  if (mav.act) { mavicStop(); return false; }
  if (mav.fold > 0.001 || mav.foldTo > 0) { mav.foldTo = 0; mav.pendingPower = true; syncMvChips(); showToast('アームを広げてからプロペラを回します'); return true; }
  if (!mav.powered) { setMvPower(true, '電源を入れました'); }
  return false;
}
function mavicOnTab(tab) {
  if (!IS_MAVIC) return;
  if (tab !== 'see') { mavicStop(); mvOverlays(null, true); }
  if (tab === 'fly' && (mav.foldTo > 0 || mav.fold > 0.001)) { mav.foldTo = 0; syncMvChips(); showToast('アームを広げました'); }
}

// ---------- 動きの入口 ----------
function mavicAction(id) {
  if (!IS_MAVIC) return;
  if (S.tab !== 'see') setTab('see');
  if (id === 'about') { renderMvAbout(); return; }
  if (id === 'fov' || id === 'sense' || id === 'size') { if (mav.act) mavicStop(); const was = id === 'fov' ? mav.fovOn : id === 'sense' ? mav.senseOn : mav.sizeOn; mvOverlays(was ? null : id); return; }
  mvOverlays(null, true);
  if (mav.act) mavicStop();
  stopOthers('alt');
  if (S.explode > 0.02) setExplode(0);
  if (S.mode === 'cut') setMode('normal');
  if (id === 'fold') {
    mav.foldTo = mav.foldTo > 0 ? 0 : 1; mav.pendingPower = false;
    if (mav.foldTo > 0 && S.power > 0) setPower(0, true);
    renderMvNote('fold'); syncMvChips(); mvFrameBox([-0.32, -0.16, -0.26], [0.32, 0.03, 0.27], [0.62, 0.42, -0.66], 1.12); return;   /* 広げた大きさで枠を決める（畳んだ大きさで決めると、広げたときにはみ出す） */
  }
  if (S.power > 0) setPower(0, true);
  if (id === 'battery') {
    if (mav.foldTo > 0 || mav.fold > 0.001) { mav.foldTo = 0; showToast('前向きLiDARを傷めないよう、アームを開いてから抜き差しします（取説）', 3600); }
    mav.act = { id, t: 0, p: D.batPart }; renderMvNote('battery'); syncMvChips(); mvFrameBox([-0.22, -0.16, -0.20], [0.22, 0.02, 0.36], [-0.70, 0.50, 0.52], 1.1); return;
  }
  if (id === 'gimbal') {
    if (mav.foldTo > 0 || mav.fold > 0.001) mav.foldTo = 0;
    mav.act = { id, t: 0 }; renderMvNote('gimbal'); syncMvChips();
    const g = D.gimbalParts.head; g.updateWorldMatrix(true, false); const c = new THREE.Vector3().setFromMatrixPosition(g.matrixWorld);
    mvFrameBox([c.x - 0.07, c.y - 0.06, c.z - 0.05], [c.x + 0.07, c.y + 0.07, c.z + 0.06], [0.55, 0.18, -0.82], 1.15); return;
  }
}
function mavicStop() {
  if (!IS_MAVIC || !mav.act) return;
  const a = mav.act; mav.act = null;
  if (a.id === 'battery' && a.p) { a.p.anim = null; a.p.animReset = true; if (!mav.powered) setMvPower(true); }
  if (a.id === 'gimbal') { const gp = D.gimbalParts; gp.roll.rotation.z = 0; gp.tilt.rotation.x = 0; }
  syncBodyMode(); syncMvChips();
  if ($('#noteCard').dataset.kind === 'mavic-' + a.id) renderNote(null);
}
// 画角・検知範囲・大きさは「重ね絵」。同時には1つだけ
function mvOverlays(id, quiet) {
  const was = { fov: mav.fovOn, sense: mav.senseOn, size: mav.sizeOn };
  mav.fovOn = id === 'fov'; mav.senseOn = id === 'sense'; mav.sizeOn = id === 'size';
  D.fovG.visible = mav.fovOn; D.senseG.visible = mav.senseOn;
  if (mav.person) mav.person.visible = mav.sizeOn; if (mav.ghost) mav.ghost.visible = mav.sizeOn;
  S.shadowDirty = S.csDirty = S.aoDirty = true; syncMvChips();
  if (id) {
    if (S.explode > 0.02) setExplode(0); if (S.power > 0) setPower(0, true); if (mav.foldTo > 0 || mav.fold > 0.001) mav.foldTo = 0;
    renderMvNote(id);
    if (id === 'fov') mvFrameBox([-0.40, -0.45, -1.50], [0.40, 0.05, 0.25], [0.80, 0.95, 0.30], 1.05);
    if (id === 'sense') mvFrameBox([-0.50, -0.20, -0.75], [0.50, 0.32, 0.55], [0.75, 0.62, -0.80], 1.05);
    if (id === 'size') { if (mav.person.userData.face) mav.person.userData.face(camera.position.x, camera.position.z); pdFrame([D.root, mav.person, mav.ghost], { pull: true, margin: 1.15, dir: new THREE.Vector3(0.45, 0.32, -0.84).normalize() }); }
  } else if (!quiet && (was.fov || was.sense || was.size)) {
    const k = $('#noteCard').dataset.kind; if (k === 'mavic-fov' || k === 'mavic-sense' || k === 'mavic-size') renderNote(null);
    focusOn([D.root], { pull: true });
  } else if (quiet) { const k = $('#noteCard').dataset.kind; if (k === 'mavic-fov' || k === 'mavic-sense' || k === 'mavic-size') renderNote(null); }
}
function setMvPower(on, msg) {
  mav.powered = !!on;
  for (const p of D.parts) {
    if (p.key === 'led') { const u = p.obj.userData; if (u.core) u.core.visible = on && !isWireMode(); if (u.halo) u.halo.visible = on && !isWireMode(); }
    if (p.key === 'statusLed' && p.lamp) { const m = p.lamp, want = on ? M.ledGreen : M.chip, was = m.userData.origMat || m.material; m.userData.origMat = want; if (m.material === was) m.material = want; }
  }
  if (msg) showToast(msg, 3200);
}
function syncMvChips() {
  const set = (id, on, label) => { const b = $(`#mvChips [data-mv="${id}"]`); if (!b) return; b.classList.toggle('on', !!on); if (b.hasAttribute('aria-pressed')) b.setAttribute('aria-pressed', String(!!on)); if (label) b.textContent = label; };
  set('fold', mav.foldTo > 0, mav.foldTo > 0 ? 'ひろげる' : 'たたむ');
  set('battery', mav.act && mav.act.id === 'battery'); set('gimbal', mav.act && mav.act.id === 'gimbal');
  set('fov', mav.fovOn); set('sense', mav.senseOn); set('size', mav.sizeOn);
}

// 枠決め: 見えない箱（材質だけ非表示）を一瞬置いて pdFrame に渡す。重ね絵は部品ではないので focusOn が数えないため
function mvFrameBox(min, max, dir, margin) {
  const proxy = new THREE.Mesh(new THREE.BoxGeometry(max[0] - min[0], max[1] - min[1], max[2] - min[2]), new THREE.MeshBasicMaterial({ visible: false }));
  proxy.position.set((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2); scene.add(proxy);
  pdFrame([proxy], { pull: true, margin: (margin || 1.1) * (narrow() ? 0.72 : 1), dir: new THREE.Vector3(...dir).normalize() });   /* スマホは帯に合わせて引くぶん、元の余白を詰める */
  scene.remove(proxy); proxy.geometry.dispose();
}
const mvFrameDrone = (dir, margin) => pdFrame([D.root], { pull: true, margin: (margin || 1.25) * (narrow() ? 0.8 : 1), dir: dir ? new THREE.Vector3(...dir).normalize() : undefined });

// ---------- 説明カード ----------
const MV_SRC_LINK = (k) => { const s = MAVIC_SRC[k]; return `<a href="${s.url}" target="_blank" rel="noopener">${s.name}</a>`; };
function renderMvAbout() {
  const row = (k, v, src) => `<tr><th>${k}</th><td>${v}${src ? `<small>${src}</small>` : ''}</td></tr>`;
  const html = `<p><b>3つのカメラを積んだ、折りたたみ式の空撮用ドローン。</b>4/3型・1億画素のHasselbladカメラに、70mm相当と168mm相当の望遠カメラを組み合わせ、360°回転するインフィニティジンバルに載せている（公式）。</p>
    <table class="pd-spec">
      ${row('離陸重量', '約 1063 g', '公式')}${row('展開時', '328.7 × 390.5 × 135.2 mm', '公式・プロペラなし')}${row('折りたたみ時', '257.6 × 124.8 × 103.4 mm', '公式・プロペラなし')}
      ${row('最大飛行時間', '51 分（ホバリング 45 分）', '公式')}${row('最大速度', '水平 25 m/s（スポーツ）', '公式・無風')}${row('最大風圧抵抗', '12 m/s', '公式')}
      ${row('バッテリー', '6654 mAh・14.32 V・95.3 Wh・約332 g', '公式')}${row('映像伝送', 'O4+・最大 15 km（日本）', '公式・障害物と干渉なし')}
      ${row('検知', '全方向デュアルビジョン＋前向きLiDAR＋下向き赤外線', '公式')}${row('プロペラ', '10.5 × 5.8 インチ', '販売店の表記')}
    </table>
    <h4>550クラスとのちがい</h4>
    <ul class="pd-diff"><li><b>折りたたみ</b>：4本のアームを畳むと約5分の1の体積に。後方右アームを開くと電源が入る</li><li><b>カメラが3つ</b>：28・70・168mm相当を持ち替える。ジンバルが縦向き撮影にも回る</li><li><b>周りを見る</b>：魚眼センサーとLiDARで、ぶつかる前に止まる・避ける</li><li><b>部品が一体</b>：フレーム・ESC・受信機が胴の中にまとまり、外から見えるのはアームとセンサーだけ</li></ul>
    <p class="caveat">この3Dモデルは、公式の仕様・取扱説明書と写真から起こした教材用の再現です。胴の形・センサーの配置・カメラの並び・アームの畳み方・内部の配置は推定を含みます（解説の「推定」「例」）。</p>
    <details class="pd-src"><summary>出典（${MAVIC_DATE}）</summary><ul>${['specs', 'product', 'manual', 'prop', 'review'].map(k => `<li>${MV_SRC_LINK(k)}</li>`).join('')}</ul></details>`;
  renderNote({ kind: 'mavic-about', title: 'DJI Mavic 4 Pro', html, actions: [{ label: 'たたんでみる', fn: () => mavicAction('fold') }, { label: '3眼の画角を見る', fn: () => { renderNote(null); mavicAction('fov'); } }] });
}
function renderMvNote(id) {
  const N = {
    fold: () => ({ title: mav.foldTo > 0 ? 'アームをたたむ' : 'アームを広げる', html: mav.foldTo > 0
      ? `<p>羽根を寄せてから、後ろのアームを斜め下へ、前のアームを胴の脇へ畳みます。折りたたむと 257.6 × 124.8 mm（公式）。</p><p>アームを畳んでも、初期設定では電源は切れません（アーム折りたたみによる電源オフは初期設定で無効・取説）。この図では畳み終えたら電源ボタンで切った状態にします。</p><p class="caveat">畳む順番と角度は例です。</p>`
      : `<p>前のアームを開いてから、後ろのアームを開きます。<b>後方右アームを開くと、電源ボタンを押さなくても電源が入ります</b>（アーム展開による電源オン・初期設定で有効・取説）。フロントLEDが緑に点き、機首の向きを示します。</p><p class="caveat">USB-Cポートを使っている間は、アームを開いても電源は入りません（取説）。畳む順番と角度は例です。</p>`,
      actions: [{ label: mav.foldTo > 0 ? '広げる' : 'たたむ', primary: true, fn: () => mavicAction('fold') }] }),
    battery: () => ({ title: 'バッテリーを入れ替える', html: `<p>電源を切り、左右のバックルを押して、バッテリーを後ろへ引き抜きます。差し込むときはカチッと音がするまで（取説）。</p><p><b>抜き差しの前に前アームを展開する</b>のが決まりです。前向きLiDARを傷めないため（取説）。</p><p id="mvBatState" class="pd-state">電源を切っています…</p><p class="caveat">バッテリーの抜き方向とバックルの形は図の例です。</p>`, actions: [{ label: 'もう一度', fn: () => mavicAction('battery') }] }),
    gimbal: () => ({ title: 'インフィニティジンバル', html: `<p>3軸のジンバルで、上は70°まで、下は真下（−90°）まで向けられます。ロールの軸が大きく回るので、<b>機体を傾けずに縦向きの撮影</b>ができます（公式・取説）。</p><p id="mvGimState" class="pd-state">上へ向けます…</p><p class="caveat">操作できる範囲はチルト −90°〜70°・ロール −40°〜400°、機械的にはロール −90°〜450°（公式）。図は360°回して見せています。</p>`, actions: [{ label: 'もう一度', fn: () => mavicAction('gimbal') }] }),
    fov: () => ({ title: '3眼の画角', html: `<p>同じ場所から撮っても、写る範囲がこれだけ違います（水平の画角・35mm判換算からの計算）。</p><ul class="pd-diff"><li><b style="color:#ef6a2d">28mm 相当</b>（Hasselblad・4/3型）：約65°</li><li><b style="color:#3b7df7">70mm 相当</b>（中望遠・1/1.3インチ）：約29°</li><li><b style="color:#22c55e">168mm 相当</b>（望遠・1/1.5インチ）：約12°</li></ul><p>望遠は近づかずに大きく写せるので、人や物から距離をとったまま撮れます。そのぶん、わずかな揺れも大きく写ります。</p><p class="caveat">画角の錐の長さは見やすさのための長さで、距離の意味はありません。カメラの並びは例です。</p>`, actions: [{ label: 'もどす', fn: () => mvOverlays(null) }], onClose: () => mvOverlays(null) }),
    sense: () => ({ title: '検知範囲', html: `<p>魚眼センサーで全方向の障害物を見て、ぶつかる前に止まる・避けます。暗い夜は前向きLiDARが前を測ります（公式）。</p><table class="pd-spec">${[['前', '0.5〜24 m'], ['後', '0.5〜22 m'], ['横', '0.5〜21 m'], ['上', '0.5〜18 m'], ['下', '0.5〜17 m'], ['LiDAR（夜間）', '0.5〜25 m'], ['下向き赤外線', '0.3〜8 m']].map(([k, v]) => `<tr><th>${k}</th><td>${v}<small>公式</small></td></tr>`).join('')}</table><p class="caveat">図は測定範囲を約45分の1に縮めた概念図です（下向きはさらに縮めています）。スポーツモードではビジョンシステムが働かず、細い電線や枝は見分けにくい（取説）。</p>`, actions: [{ label: 'もどす', fn: () => mvOverlays(null) }], onClose: () => mvOverlays(null) }),
    size: () => ({ title: '大きさをくらべる', html: `<p>同じ縮尺で、<b>身長170cmの人</b>と、青い半透明の<b>550クラスのクアッド</b>（対角550mm・約2.4kg）を並べています。</p><p>Mavic 4 Proは展開時 328.7 × 390.5 mm（プロペラなし・公式）、離陸重量は約1063g。折りたためば 257.6 × 124.8 mm で、カメラバッグに入る大きさです。</p>`, actions: [{ label: 'もどす', fn: () => mvOverlays(null) }], onClose: () => mvOverlays(null) }),
  };
  renderNote(Object.assign({ kind: 'mavic-' + id }, N[id]()));
}

// ---------- 毎フレーム ----------
const mvEase = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const mvNorm = (a) => Math.atan2(Math.sin(a), Math.cos(a));
function stepMavic(dt) {
  let dirty = false;
  { const sup = mav.sizeOn || mav.fovOn || mav.senseOn || !!(mav.act && mav.act.id === 'gimbal'); if (sup !== mav._sup) { mav._sup = sup; S.labelsSuppressed = sup; } }
  // --- たたむ / 広げる ---
  if (mav.foldTo > mav.fold) {
    const spinning = D.motors.some(mo => mo.rpm > 30) || body.py > 0.003;
    if (!spinning) {
      let aligned = true;
      for (const mo of D.motors) { const tgt = Math.PI / 2 + Math.round((mo.angle - Math.PI / 2) / (Math.PI * 2)) * Math.PI * 2; const d = tgt - mo.angle; if (Math.abs(d) > 0.005) { aligned = false; mo.angle += d * (1 - Math.exp(-dt / 0.12)); } else mo.angle = tgt; mo.prop.rotation.y = mo.angle; }
      if (aligned || mav.fold > 0) mav.fold = Math.min(mav.foldTo, mav.fold + dt / 2.6);
      dirty = true;
    }
  } else if (mav.foldTo < mav.fold) { mav.fold = Math.max(mav.foldTo, mav.fold - dt / 2.6); dirty = true; }
  if (mav.fold !== mav._last) {
    const f = mav.fold, fb = mvEase(f / 0.3), fr = mvEase(f / 0.6), ff = mvEase((f - 0.4) / 0.6);   /* 畳む: 羽根→後ろ→前 / 広げる: 前→後ろ→羽根 */
    D.motors.forEach((mo, i) => {
      const F = D.folds[i];
      if (F.front) { const yawT = Math.atan2(-0.99, F.sx * 0.11); F.fg.rotation.set(0, mvNorm(yawT - F.yaw) * ff, 0); }
      else { const yawT = Math.atan2(0.99, F.sx * 0.12); F.fg.rotation.set(0, mvNorm(yawT - F.yaw) * fr, -0.22 * fr); }
      for (const h of mo.hinges) h.g.rotation.y = h.s * fb * Math.PI / 2;
    });
    // 後方右アーム(M2)を開ききったら電源が入る / 畳み終えたら電源を切った状態に
    const rr = mvEase(f / 0.6);
    if (mav.foldTo === 0 && !mav.powered && rr < 0.02 && !mav.act) setMvPower(true, '後方右アームを開いたので、電源が入りました（アーム展開による電源オン）');
    if (mav.foldTo === 1 && f >= 1 && mav.powered) setMvPower(false, '畳み終えたので電源ボタンで電源を切りました（初期設定では畳んでも切れない）');
    if (f === 0 && mav.foldTo === 0 && mav.pendingPower) { mav.pendingPower = false; setPower(0.5); }
    mav._last = f; dirty = true;
  }
  // --- 動き ---
  const a = mav.act;
  if (a) {
    a.t += dt; const t = a.t; dirty = true;
    if (a.id === 'battery' && a.p) {
      if (mav.fold > 0.001) { a.t = 0; }   /* アームが開くまで待つ */
      else {
        const p = a.p; if (!p.anim) p.anim = { pos: new THREE.Vector3(), quat: new THREE.Quaternion() };
        if (t > 0.3 && mav.powered) setMvPower(false);
        let back = 0, up = 0;
        if (t > 0.8 && t < 2.0) back = mvEase((t - 0.8) / 1.2) * 0.17; else if (t >= 2.0 && t < 2.8) back = 0.17; else if (t >= 2.8 && t < 4.0) back = 0.17 * (1 - mvEase((t - 2.8) / 1.2));
        up = Math.min(back, 0.012);
        p.anim.pos.set(0, up, back);
        const st = $('#mvBatState'); if (st) st.textContent = t < 0.8 ? '電源を切りました' : t < 2.0 ? 'バックルを押して後ろへ引き抜きます' : t < 2.8 ? '充電済みのバッテリーに持ち替え' : t < 4.0 ? 'カチッと音がするまで差し込みます' : '電源ボタンを押して起動しました';
        if (t > 4.2 && !mav.powered) setMvPower(true);
        if (t > 4.6) { p.anim = null; p.animReset = true; mav.act = null; syncMvChips(); }
      }
    }
    if (a.id === 'gimbal') {
      const gp = D.gimbalParts, R = THREE.MathUtils.degToRad;
      let tilt = 0, roll = 0, msg = '';
      if (t < 1.2) { tilt = R(70) * mvEase(t / 1.2); msg = '上へ 70°（操作できる上限）'; }
      else if (t < 2.0) { tilt = R(70); msg = '上へ 70°（操作できる上限）'; }
      else if (t < 3.4) { tilt = R(70) + (R(-90) - R(70)) * mvEase((t - 2.0) / 1.4); msg = '真下へ −90°'; }
      else if (t < 4.2) { tilt = R(-90); msg = '真下へ −90°'; }
      else if (t < 5.2) { tilt = R(-90) * (1 - mvEase((t - 4.2) / 1.0)); msg = '正面へもどす'; }
      else if (t < 6.4) { roll = R(90) * mvEase((t - 5.2) / 1.2); msg = 'ロール 90°：縦向きの撮影'; }
      else if (t < 7.4) { roll = R(90); msg = 'ロール 90°：縦向きの撮影'; }
      else if (t < 10.0) { roll = R(90) + R(360) * mvEase((t - 7.4) / 2.6); msg = 'ロールをぐるりと回す（機械的には −90°〜450°）'; }
      else if (t < 11.2) { roll = R(450) * (1 - mvEase((t - 10.0) / 1.2)); msg = '正面へもどす'; }
      gp.tilt.rotation.x = tilt; gp.roll.rotation.z = -roll;
      const st = $('#mvGimState'); if (st && msg) st.textContent = msg;
      if (t > 11.4) { gp.tilt.rotation.x = 0; gp.roll.rotation.z = 0; mav.act = null; syncMvChips(); }
    }
  }
  if (dirty) S.shadowDirty = S.csDirty = S.aoDirty = true;
}

// ---------- 起動 ----------
function initMavic() {
  for (const b of $$('#mvChips [data-mv]')) b.addEventListener('click', () => mavicAction(b.dataset.mv));
  mav.person = buildPerson(); mav.person.scale.setScalar(MAVIC_K); mav.person.position.set(0.40, -0.158, 0.30); mav.person.visible = false; scene.add(mav.person);
  mav.ghost = pd6bQuadGhost(); mav.ghost.scale.setScalar(1); mav.ghost.position.set(-0.55, -0.158 + 0.156, -0.20); scene.add(mav.ghost);
  syncMvChips();
  focusOn([D.root], { pull: false, margin: 1.25 });   /* 550クラスより小さいので、最初の画を寄せる */
  const q = new URLSearchParams(location.search);
  if (!SHARE_KEYS.some(k => q.has(k))) setTimeout(() => { if (!$('#noteCard').dataset.kind) { renderMvAbout(); mvFrameDrone(null, 1.3); } }, 900);
}
