// ===== WingtraRAY の固有の動き =====
// 離陸→遷移→巡航→戻りの遷移→尾で着地（場面）・操縦翼面・電池交換・カメラの付け替え・パラシュート・撮影範囲・レーダー・大きさ
// 置いたときは尾で立つ（機首が真上）。姿勢は D.pose が持つ: 立った姿勢（rest）・その場で寝かせた巡航の姿勢（lv: 舵と重ね絵の説明用）・場面の姿勢（act.pose）
const WT_R = THREE.MathUtils.degToRad;
const wt = { act: null, powered: true, pendingPower: false, fovOn: false, radarOn: false, sizeOn: false, person: null, ghost: null, _sup: false,
  rest: { lean: 0, dy: 0, dy0: 0, w: 1 }, lv: { w: 0, to: 0, y: 0.32, pitch: 0, roll: 0 }, el: [0, 0], hv: { tz: 0, wz: 0, az: 0, yaw: 0, yr: 0 }, _poseKey: '', fx: null };
const WT_EASE = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const _wtLv = new THREE.Vector3(), _wtS1 = new THREE.Vector3(), _wtS2 = new THREE.Vector3(), _wtQ1 = new THREE.Quaternion(), _wtQ2 = new THREE.Quaternion(), _wtE = new THREE.Euler(), _wtV = new THREE.Vector3(), _wtV2 = new THREE.Vector3(), _wtX = new THREE.Vector3(1, 0, 0);

// 一部の部品だけの頂点で、いちばん低い高さを測る（機体全体は約50万頂点あるので、床に近づきうる部品に絞る）
function wtLow(objs, stride = 2) { let low = Infinity; for (const o of objs) o.traverseVisible(c => { if (!c.isMesh || c.userData.noPart) return; const p = c.geometry.attributes.position; if (!p) return;
  for (let k = 0; k < p.count; k += stride) { _wtLv.fromBufferAttribute(p, k).applyMatrix4(c.matrixWorld); if (_wtLv.y < low) low = _wtLv.y; } }); return low; }
// いまの body と姿勢を、その場で機体に当てる（止めた直後に枠を決めるとき、1コマ前の位置で測らない）
function wtSyncRoot() { wt._poseKey = ''; if (!(wt.act && wt.act.pose)) wtApplyPose(0); applyBody(0); D.root.updateMatrixWorld(true); }
// 説明カードを避けて、注視点を画面の空いた側へずらす量（pdFrame と同じ考え方。縦向きのスマホはカードが下なのでずらさない）
function wtCardShift(out) {
  out.set(0, 0, 0); const card = $('#noteCard'), land = narrow() && innerHeight <= 520; if ((narrow() && !land) || card.hidden) return out;
  const r = card.getBoundingClientRect(), cw = land ? canvas.clientWidth : canvas.clientWidth - 384, vc = $('#viewCol').getBoundingClientRect();
  const f0 = Math.min(r.right + 12, cw * 0.6), f1 = Math.max(f0 + 200, (land ? cw : Math.min(cw, vc.left)) - 12);
  const back = _wtS1.copy(camera.position).sub(controls.target), d = back.length(), tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
  const px = (f0 + f1) / 2 - cw / 2, right = _wtS2.crossVectors(back.normalize().negate(), camera.up).normalize();
  return out.copy(right).multiplyScalar(-(px / cw) * 2 * d * tanH);
}

// ---------- 状態の問い合わせ ----------
function wtBusy() { return IS_WT && (!!wt.act || wt.sizeOn || wt.fovOn || wt.radarOn || wt.lv.to > 0 || wt.lv.w > 0.001); }
function wtWide() { return wt.sizeOn || wt.fovOn || wt.radarOn || !!(wt.act && wt.act.wide); }
function wtShadowExtra() { return wt.sizeOn ? 1.1 : 0; }
function wtHasVariant() { return false; }
function wtBlockPower() {
  if (!IS_WT) return false;
  if (wt.act) { wtStop(); return false; }
  if (wt.fovOn || wt.radarOn || wt.sizeOn) wtOverlays(null, true);
  if (!wt.powered) setWtPower(true);
  return false;
}
function wtOnTab(tab) {
  if (!IS_WT) return;
  if (tab !== 'fly') wt.pendingPower = false;
  const had = wtWide() || !!wt.act;
  if (wt.act && wt.act.tab !== tab) wtStop(true);
  if (tab !== 'see') { wtOverlays(null, true); if (($('#noteCard').dataset.kind || '').startsWith('wt-') && !wt.act) renderNote(null); }
  if (had && !wt.act) { wtSyncRoot(); focusOn([D.root], { pull: true }); }   /* 場面を止めたら、元の位置に戻った機体で枠を決め直す */
}

// ---------- 動きの入口 ----------
function wtAction(id) {
  if (!IS_WT) return;
  if (!(id === 'flight' && S.tab === 'fly') && S.tab !== 'see') setTab('see');
  if (id === 'about') { if (wt.act) wtStop(true); wtOverlays(null, true); renderWtAbout(); wtFrameDrone(); return; }
  if (id === 'fov' || id === 'radar' || id === 'size') { if (wt.act) wtStop(true); const was = { fov: wt.fovOn, radar: wt.radarOn, size: wt.sizeOn }[id]; wtOverlays(was ? null : id); return; }
  wtOverlays(null, true);
  const same = wt.act && wt.act.id === id;
  if (wt.act) wtStop(true);
  if (same) { focusOn([D.root], { pull: true }); return; }   /* 動きの最中にもう一度押すと止める */
  stopOthers('alt');
  if (S.explode > 0.02) setExplode(0);
  if (S.mode === 'cut') setMode('normal');
  if (S.power > 0) setPower(0, true);
  const a = wt.act = { id, t: 0, tab: S.tab, el: null };
  if (id === 'flight') { a.body = true; a.pose = true; a.wide = true; wtFlightStart(a); }
  else if (id === 'chute') { a.body = true; a.pose = true; a.wide = true; wtChuteStart(a); }
  else if (id === 'elevon') { a.wide = false; wt.lv.to = 1; wt.lv.y = 0.30; frameBox([-0.34, 0.10, -0.24], [0.34, 0.46, 0.26], [0.42, 0.58, 0.70], 1.22); }
  else if (id === 'battery') frameBox([-0.16, -0.02, -0.08], [0.30, 0.32, 0.08], [0.40, 0.55, 0.73], 1.15);   /* 背中の側のやや上から: 機首から引き抜く電池と、横へ置くノーズコーンが見える */
  else if (id === 'payload') frameBox([-0.20, -0.16, -0.20], [0.20, 0.22, 0.10], [0.36, 0.22, -0.91], 1.12);
  syncBodyMode(); renderWtNote(id); syncWtChips();
}
function wtStop(quiet) {
  if (!IS_WT || !wt.act) return;
  const a = wt.act; wt.act = null;
  for (const mo of D.motors) { mo.rpmTarget = null; mo.rpmRate = null; }
  for (const th of D.arrows.thrust) th.userData.forceHide = false;
  for (const p of [D.nosePart, ...D.bats, D.latchPart, D.payPart, D.chutePart]) if (p.anim) { p.anim = null; p.animReset = true; }
  for (const p of [...D.bats, D.payPart]) setTint(p, PD_OLD, 0);
  D.payPart.obj.visible = true; D.chutePart.obj.visible = true;
  if (D.canopy) D.canopy.visible = false;
  wtFx(false); if (wt.force) for (const ar of wt.force) ar.visible = false;
  if (a.airWas != null) { S.air = a.airWas; for (const x of $$('.tgl[data-t=air]')) { x.classList.toggle('on', S.air); x.setAttribute('aria-pressed', String(S.air)); } }
  if (a.body) { body.px = body.py = body.pz = 0; body.tx = body.tz = body.wx = body.wz = 0; body.vx = body.vz = body.vyF = 0; body.yaw = 0; body.v.set(0, 0, 0); }
  wt.lv.to = 0; wt.lv.pitch = wt.lv.roll = 0; wt._poseKey = '';
  if (!wt.powered) setWtPower(true);
  syncBodyMode(); syncWtChips();
  if ($('#noteCard').dataset.kind === 'wt-' + a.id) renderNote(null);
  wtSyncRoot();
  if (!quiet) focusOn([D.root], { pull: true });
}
// 撮影範囲・レーダー・大きさは「重ね絵」。同時には1つだけ。撮影範囲とレーダーは、その場で巡航の姿勢に寝かせて見せる
function wtOverlays(id, quiet) {
  const was = { fov: wt.fovOn, radar: wt.radarOn, size: wt.sizeOn };
  wt.fovOn = id === 'fov'; wt.radarOn = id === 'radar'; wt.sizeOn = id === 'size';
  D.fovG.visible = wt.fovOn; D.radarG.visible = wt.radarOn;
  if (wt.person) wt.person.visible = wt.sizeOn; if (wt.ghost) wt.ghost.visible = wt.sizeOn;
  if (!wt.act || wt.act.id !== 'elevon') { wt.lv.to = (wt.fovOn || wt.radarOn) ? 1 : 0; wt.lv.y = wt.fovOn ? 0.58 : 0.30; wt.lv.pitch = wt.lv.roll = 0; }
  S.shadowDirty = S.csDirty = S.aoDirty = true; syncWtChips();
  if (id) {
    if (S.explode > 0.02) setExplode(0); if (S.power > 0) setPower(0, true);
    renderWtNote(id);
    if (id === 'fov') frameBox([-0.55, -0.16, -0.75], [0.55, 0.66, 0.35], [0.80, 0.42, -0.42], 1.04);
    if (id === 'radar') frameBox([-0.40, 0.0, -1.10], [0.40, 0.50, 0.25], [0.86, 0.36, -0.36], 1.04);
    if (id === 'size') { if (wt.person.userData.face) wt.person.userData.face(camera.position.x, camera.position.z); pdFrame([D.root, wt.person, wt.ghost], { pull: true, margin: 1.15, dir: new THREE.Vector3(0.40, 0.30, 0.87).normalize() }); }
  } else if (!quiet && (was.fov || was.radar || was.size)) {
    const k = $('#noteCard').dataset.kind; if (['wt-fov', 'wt-radar', 'wt-size'].includes(k)) renderNote(null);
    focusOn([D.root], { pull: true });
  } else if (quiet) { const k = $('#noteCard').dataset.kind; if (['wt-fov', 'wt-radar', 'wt-size'].includes(k)) renderNote(null); }
}
function setWtPower(on, msg) {
  wt.powered = !!on;
  const r = D.pwr.userData.ring, want = on ? M.ledWhite : M.chip, was = r.userData.origMat || r.material; r.userData.origMat = want; if (r.material === was) r.material = want;
  if (msg) showToast(msg, 3000);
}
function syncWtChips() {
  for (const b of $$('[data-wt]')) { const id = b.dataset.wt; const on = id === 'fov' ? wt.fovOn : id === 'radar' ? wt.radarOn : id === 'size' ? wt.sizeOn : !!(wt.act && wt.act.id === id);
    b.classList.toggle('on', on); if (b.hasAttribute('aria-pressed')) b.setAttribute('aria-pressed', String(on)); }
}
const wtFrameDrone = (dir, margin) => pdFrame([D.root], { pull: true, margin: (margin || 1.18) * (narrow() ? 0.82 : 1), dir: new THREE.Vector3(...(dir || [0.52, 0.30, 0.80])).normalize() });

// ---------- 説明カード ----------
const WT_SRC_LINK = (k) => { const s = WT_SRC[k]; return `<a href="${s.url}" target="_blank" rel="noopener">${s.name}</a>`; };
function renderWtAbout() {
  const row = (k, v, src) => `<tr><th>${k}</th><td>${v}${src ? `<small>${src}</small>` : ''}</td></tr>`;
  const html = `<p><b>尾で立って真上へ離陸し、空中で機首を倒して飛行機として飛ぶ「テールシッター」型のVTOL（垂直離着陸）の測量機。</b>2基のプロペラと2枚の操縦翼面だけで、浮くことと飛ぶことの両方をこなす。2025年に WingtraOne GEN II の後を継いだ（公式）。</p>
    <table class="pd-spec">
      ${row('最大離陸重量', '5.2 kg', '公式')}${row('翼幅', '125 cm', '公式・寸法図では1242 mm')}${row('飛行時間', '最大 59 分（LIDAR は 45 分）', '公式')}
      ${row('巡航速度', '16〜22 m/s', '公式・ふつうは 19 m/s（取説）')}${row('ホバーの上昇・下降', '6 / 2.5 m/s', '公式')}${row('風', '巡航高度で 12 m/s・突風 18 m/s・地上 8 m/s まで', '公式')}
      ${row('1回で撮れる広さ', '550 ha', '公式・MAP61・高度120 m')}${row('電池', '99 Wh × 2個（2個1組）', '公式')}${row('防じん防水', 'IP53', '公式')}
    </table>
    <h4>550クラスとのちがい</h4>
    <ul class="pd-diff"><li><b>プロペラは2つ</b>：浮くのも前へ進むのも同じ2つのプロペラ。離着陸専用のローターを別に持たない</li><li><b>翼で浮く</b>：巡航中は翼の揚力が重さを支えるので、プロペラは空気の抵抗に打ち勝つぶんだけ推力を出せばよい。だから長く遠くまで飛べる</li><li><b>舵で姿勢を作る</b>：翼の後ろの2枚の操縦翼面で機首の上げ下げと傾きを作る。ホバー中もプロペラの風を曲げて姿勢を変える（推定）</li><li><b>遷移</b>：決めた高さまで垂直に上がったら、機首を前へ倒して加速し、飛行機の飛び方に切り替える。遷移はいつも自動（取説）</li><li><b>尾で着地</b>：尾翼と、ウイングレットの先の脚の棒で立つ。風が強いと倒れることがある（公式）</li></ul>
    <p class="caveat">この3Dモデルは、公式の仕様書・取扱説明書・写真から起こした教材用の再現です。平面の形は公式の真上の写真、高さ方向は取説の寸法図（側面）から寸法を読みました。内部の配置・舵の分担・プロペラの回る向きは推定を含みます（解説の「推定」「例」）。図は実物の${Math.round(WT_K * 100)}%の大きさで描いています（ほかの機種と同じ画に収めるため。大きさの比べは「大きさ」で）。</p>
    <details class="pd-src"><summary>出典（${WT_DATE}）</summary><ul>${['spec', 'manual', 'start', 'product', 'radar', 'chute', 'trans', 'gen2', 'kyosoku'].map(k => `<li>${WT_SRC_LINK(k)}</li>`).join('')}</ul></details>`;
  renderNote({ kind: 'wt-about', title: 'Wingtra WingtraRAY', html, actions: [{ label: '離陸から着陸まで見る', primary: true, fn: () => { renderNote(null); wtAction('flight'); } }, { label: '舵を動かす', fn: () => { renderNote(null); wtAction('elevon'); } }] });
}
function renderWtNote(id) {
  const again = (lbl) => ({ label: lbl || 'もう一度', fn: () => { const keep = wt.act && wt.act.id === id; if (keep) wtStop(true); wtAction(id); } });
  const N = {
    flight: () => ({ title: '離陸から着陸まで', html: `<div class="wt-top"><p id="wtFlState" class="pd-state">離陸前のチェック…</p>
      <div class="wt-hud"><div><span>機首</span><b id="wtHudPitch">真上 90°</b></div><div><span>速さ</span><b id="wtHudSpd">0 m/s</b></div><div><span>高さ</span><b id="wtHudAlt">0 m</b></div>
        <div class="wt-share"><span>重さを支えているもの</span><b id="wtHudWing">主翼 0%</b><div class="wt-bar"><i id="wtBarProp" style="width:100%"></i><i id="wtBarWing" style="width:0%"></i></div><small id="wtHudShare">プロペラ 100%・主翼 0%</small></div></div></div>
      <p>垂直に上がり、<b>遷移</b>で機首を前へ倒して加速すると、速さの2乗で翼の揚力が増え、重さを支える役がプロペラから翼へ移ります。巡航中のプロペラは空気の抵抗のぶんだけ推力を出せばよく、ホバー中の電池の減りは巡航の6〜7倍速いとされます（ナレッジベース。前の機種のアプリ向けの記事）。戻るときは機首を起こして減速し（戻りの遷移）、尾を下にしたまま降ります。</p>
      <table class="pd-spec"><tr><th>ホバー</th><td>上昇 最大 6 m/s・下降 最大 2.5 m/s<small>公式</small></td></tr><tr><th>巡航</th><td>16〜22 m/s・上昇／下降 8 / 8 m/s<small>公式</small></td></tr><tr><th>遷移の高さ</th><td>離陸と着陸で同じ。障害物より20 m以上上に設定（取説・ナレッジベース）<small>仕様書の飛行時間は 25 m の条件。前の機種のアプリ向けの記事では既定 50 m・20〜120 m</small></td></tr></table>
      <p class="caveat">距離と高さは画に収まるよう大きく縮め、時間も縮めています（表示の高さは遷移の高さを25 mとしたときの例）。実際は遷移のあと旋回しながら撮影の高さ（例: 120 m）まで上がり、決めた線の上を往復して撮ります。遷移にかかる時間と機首の角度の変わり方、何%を翼が支えるかは公表されておらず、図は「揚力は速さの2乗」の考え方による目安です。</p>`,
      actions: [again(), { label: 'とばすで操縦', fn: () => { wtStop(); setTab('fly'); } }], onClose: () => wtStop() }),
    chute: () => ({ title: 'パラシュート（オプション）', html: `<p id="wtChState" class="pd-state">ホバーで上がります…</p><p>電源の喪失・推進の故障・急な落下などを検知すると、<b>飛行終了のしくみが機体の電源を切り、同時に腹の後ろのふたと傘をバネで押し出します</b>（取説）。手動のトリガー装置やタブレットからも開けます。</p>
      <table class="pd-spec"><tr><th>最低展開高度</th><td>45 m<small>公式。パラシュート付きでは計画の最低の高さも45 m</small></td></tr><tr><th>降下速度</th><td>平均 4 m/s<small>公式</small></td></tr><tr><th>重さ</th><td>250 g・外形は変わらない<small>取説</small></td></tr></table>
      <p class="caveat">傘の形・大きさと、吊られたときの機体の向き（腹の後ろの取り付け点の真下に重心が来る向き）は図の例です。高さと時間は縮めています。</p>`, actions: [again()], onClose: () => wtStop() }),
    elevon: () => ({ title: '操縦翼面（エレボン）', html: `<p id="wtElState" class="pd-state">巡航の姿勢にします…</p><p>翼の後ろの2枚の操縦翼面を<b>同じ向きに動かすと機首が上下</b>し、<b>逆向きに動かすと左右に傾きます</b>（全翼機の一般的な動かし方・推定）。橙の矢印は、舵を曲げたところで空気が板を押す向きです。</p>
      <p>ホバー中（機首が真上）は、2枚がプロペラの風を受けます。同じ向きに動かすと腹の側・背中の側へ傾き、逆向きに動かすと縦の軸のまわりに回ります（推定）。「とばす」の飛行の原理の「前進」「右旋回」で見られます。</p>
      <p class="caveat">機体はその場に浮かせて巡航の姿勢にした図です（風洞の中のような見せ方）。舵の角度と機体の動きの大きさは見やすさのための例です。</p>`, actions: [again(), { label: 'ホバーで見る', fn: () => { wtStop(); setTab('fly'); setFlight('pitch'); } }], onClose: () => wtStop() }),
    battery: () => ({ title: '電池を入れ替える', html: `<p id="wtBatState" class="pd-state">ノーズコーンを外します…</p><p>磁石で付いた<b>ノーズコーンを外す</b>と電池室。電源ボタンは電池室の中央にあり、<b>ノーズを外してから長押しで電源を切ります</b>（取説）。2個の電池の間の<b>十字のつまみを回して外し</b>、取っ手を持って前へ引き抜きます。入れるときは取っ手を内側に向けて差し込み、押し下げてつまみを直角に回して留め、電源を入れてからノーズコーンを戻します（取説・ナレッジベース）。電池は差し込むだけでコネクタにつながります。</p>
      <table class="pd-spec"><tr><th>電池</th><td>WRB01・99 Wh・公称 30.8 V・525 g<small>公式</small></td></tr><tr><th>組</th><td>2個1組。「1234A」「1234B」の刻印で組が分かる<small>ナレッジベース</small></td></tr><tr><th>充電</th><td>電池を4個差せる充電器で、1組 約1時間<small>公式</small></td></tr></table>
      <p class="caveat">電源ボタンの位置、つまみと取っ手の形は取説の図と写真から起こしました。手順の順番は取説の文から。</p>`, actions: [again()], onClose: () => wtStop() }),
    payload: () => ({ title: 'カメラ（ペイロード）を付け替える', html: `<p id="wtPayState" class="pd-state">つまみを回して外します…</p><p>カメラなどの機材は腹の前寄りに入り、<b>工具なしで付け替え</b>られます。機体の中に収まり（一部はレンズがカバーから突き出る・取説）、機体から最大 80 W の電源をもらいます（公式）。</p>
      <table class="pd-spec"><tr><th>MAP61</th><td>6100万画素・17 mm・前へ15°の斜め<small>120 mで 2.7 cm/px・最大 550 ha（公式）</small></td></tr><tr><th>SURVEY61</th><td>6100万画素・35 mm・真下<small>120 mで 1.3 cm/px（公式）</small></td></tr><tr><th>INSPECT</th><td>6100万画素・85 mm・真下<small>120 mで 0.5 cm/px（公式）</small></td></tr><tr><th>SURVEY24</th><td>2400万画素・20 mm・真下<small>120 mで 2.4 cm/px（公式）</small></td></tr><tr><th>RedEdge-P</th><td>5バンドのマルチスペクトル＋パンクロ<small>120 mで 4.0 cm/px（公式）</small></td></tr><tr><th>LIDAR</th><td>Hesai XT32M2X・905 nm<small>飛行時間は 45 分（公式）</small></td></tr></table>
      <p class="caveat">留め方は、仕様書が「twist-lock」、ナレッジベースが「下の端を合わせて押し込み、上のラッチで留める」と書いています。図は前の端のつまみを回す例です。</p>`, actions: [again()], onClose: () => wtStop() }),
    fov: () => ({ title: '撮影範囲（MAP61）', html: `<p>巡航中、カメラは腹から地面を撮ります。MAP61 は横に<b>93°</b>、進行方向に<b>後ろ20°〜前50°</b>の範囲を写します（前へ15°傾けた斜めの配置・公式）。ほかのカメラは真下向き（公式）。</p>
      <table class="pd-spec"><tr><th>高度120 mの1枚</th><td>横 約253 m × 前後 約187 m<small>公式の画角からの計算</small></td></tr><tr><th>地上画素寸法</th><td>2.7 cm/px（120 m）・最小 1.2 cm/px（54 m）<small>公式</small></td></tr><tr><th>重なり</th><td>横 60% の条件で 1回 550 ha<small>公式</small></td></tr></table>
      <p class="caveat">機体はその場で巡航の姿勢に寝かせて描いています。紫の範囲は画角の形を示す図で、長さは見やすさのための長さです。</p>`, actions: [{ label: 'もどす', fn: () => wtOverlays(null) }], onClose: () => wtOverlays(null) }),
    radar: () => ({ title: '前向きレーダー', html: `<p>ノーズコーンの先のレーダーが、<b>巡航中に</b>前の止まった障害物を見つけると、避けて離陸地点へ戻ります（仕様書）。<b>ホバー中は空を向くので働きません</b>（ナレッジベース）。</p>
      <table class="pd-spec"><tr><th>検知距離</th><td>100 m<small>仕様書</small></td></tr><tr><th>周波数</th><td>60〜64 GHz<small>仕様書。取説は 60〜60.25 GHz</small></td></tr><tr><th>見つけやすさ</th><td>建物・クレーン・塔・岩壁は高い、木や細い電線は低い<small>仕様書</small></td></tr></table>
      <p class="caveat">ベータ版の機能で、申し込んだ人だけが使えます（ナレッジベース）。緑の円錐は向きを示す概念図で、範囲の形と長さは資料にありません。</p>`, actions: [{ label: 'もどす', fn: () => wtOverlays(null) }], onClose: () => wtOverlays(null) }),
    size: () => ({ title: '大きさをくらべる', html: `<p>同じ縮尺で、<b>身長170cmの人</b>と、青い半透明の<b>550クラスのクアッド</b>（対角550mm・約2.4kg）を並べています。</p><p>WingtraRAY は翼幅 125 cm・最大離陸重量 5.2 kg（公式）。立てると機首から脚の先まで約72 cm（寸法図）。運ぶハードケースは 130 × 70 × 34 cm で、尾翼とノーズコーンを外して入れます（公式・ナレッジベース）。</p>`, actions: [{ label: 'もどす', fn: () => wtOverlays(null) }], onClose: () => wtOverlays(null) }),
  };
  renderNote(Object.assign({ kind: 'wt-' + id }, N[id]()));
}
const wtSetText = (id, msg) => { const el = $(id); if (el && el.textContent !== msg) el.textContent = msg; };

// ---------- 場面の小道具（経路・離着陸地点・高さの線・重さ／揚力／推力の矢印）----------
function wtFx(on) {
  if (on && !wt.fx) {
    const fx = wt.fx = { g: new THREE.Group() };
    const pad = new THREE.Mesh(new THREE.RingGeometry(0.15, 0.17, 48), new THREE.MeshBasicMaterial({ color: 0xef6a2d, transparent: true, opacity: 0.8, depthWrite: false }));
    pad.rotation.x = -Math.PI / 2; pad.position.y = -0.156; fx.g.add(pad);
    const hc = makeCanvas(128, 128), hg = hc.getContext('2d'); hg.fillStyle = '#ef6a2d'; hg.font = 'bold 96px -apple-system, Helvetica, Arial, sans-serif'; hg.textAlign = 'center'; hg.textBaseline = 'middle'; hg.fillText('H', 64, 70);
    const hm = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.12), new THREE.MeshBasicMaterial({ map: canvasTex(hc, { wrap: false }), transparent: true, depthWrite: false })); hm.rotation.x = -Math.PI / 2; hm.position.set(0.24, -0.155, -0.02); fx.g.add(hm);
    fx.path = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: 0x8b939f, dashSize: 0.06, gapSize: 0.04, transparent: true, opacity: 0.75 })); fx.g.add(fx.path);
    fx.drop = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 1, 6), new THREE.MeshBasicMaterial({ color: 0x8b939f, transparent: true, opacity: 0.35 })); fx.g.add(fx.drop);
    fx.weight = arrowMesh(0x8b939f, 0.10, 0.0036); fx.weight.rotation.x = Math.PI; fx.g.add(fx.weight);
    fx.thrust = D.motors.map(mo => { const a = arrowMesh(0xffffff, 0.05, 0.003); a.position.set(0, 0.012, 0); a.visible = false; mo.arrowAnchor.add(a); return a; });
    fx.g.traverse(o => { o.userData.noPart = o.userData.noPick = o.userData.noAO = o.userData.noShadow = true; o.castShadow = false; });
    scene.add(fx.g); fx.g.visible = false;
  }
  if (!wt.fx) return;
  wt.fx.g.visible = !!on; if (!on) { for (const a of wt.fx.thrust) a.visible = false; for (const a of D.arrows.lift) a.visible = false; }
}

// ---------- 場面: 離陸→遷移→巡航→戻りの遷移→着地 ----------
// 図の中の大きさ（m）。遷移の高さ H1、巡航の速さ VC、旋回の半径 RT。経路は離陸地点から −Z へ遷移し、右旋回で折り返して戻る長円
const WT_FL = { H1: 1.05, DH: 0.12, VC: 1.05, RT: 0.82, TT: 4.0, TB: 4.0, THC: WT_R(6), BANK: WT_R(-32) };
const WT_PH = [['check', 1.7], ['spin', 0.9], ['climb', 4.0], ['trans', WT_FL.TT], ['cruise', 0], ['back', WT_FL.TB], ['hold', 0.9], ['desc', 5.2], ['stop', 1.6]];
function wtFlightStart(a) {
  const F = WT_FL, Str = F.VC * F.TT * 0.5, Sb = F.VC * F.TB * 0.5, R = F.RT;
  // 経路（水平面）: [直線 遷移] → [右へ半周] → [直線] → [右へ半周] → [直線 戻りの遷移]
  a.seg = [{ k: 'line', x0: 0, z0: 0, dx: 0, dz: -1, L: Str }, { k: 'arc', cx: R, cz: -Str, a0: Math.PI, sweep: -Math.PI, L: Math.PI * R }, { k: 'line', x0: 2 * R, z0: -Str, dx: 0, dz: 1, L: Str + Sb },
    { k: 'arc', cx: R, cz: Sb, a0: 0, sweep: -Math.PI, L: Math.PI * R }, { k: 'line', x0: 0, z0: Sb, dx: 0, dz: -1, L: Sb }];
  a.Str = Str; a.Sb = Sb; a.Lc = Math.PI * R * 2 + Str + Sb;
  a.T = WT_PH.map(([n, d]) => [n, n === 'cruise' ? a.Lc / F.VC : d]);
  wt.rest.w = 0; wt._poseKey = '';   /* 場面のあとは傾きなしの立ち姿から、ゆっくり置いた傾きへ */
  a.psi = 0; a.phi = 0; a.theta = Math.PI / 2; a.s = 0; a.x = 0; a.z = 0; a.y = 0; a.hudT = 0; a.lastPh = '';
  a.airWas = S.air; S.air = true; for (const x of $$('.tgl[data-t=air]')) { x.classList.add('on'); x.setAttribute('aria-pressed', 'true'); }   /* プロペラの風の向きの変化を見せる */
  for (const th of D.arrows.thrust) th.userData.forceHide = true;
  wtFx(true);
  { const pts = [], H = F.H1 + F.DH; for (let y = 0; y <= F.H1; y += 0.1) pts.push(new THREE.Vector3(0, y, 0));
    for (let s = 0; s <= a.Lc + Str + Sb + 1e-6; s += 0.05) { const p = wtPathAt(a, s); pts.push(new THREE.Vector3(p.x, H, p.z)); } for (let y = H; y >= 0; y -= 0.1) pts.push(new THREE.Vector3(0, y, 0));
    wt.fx.path.geometry.dispose(); wt.fx.path.geometry = new THREE.BufferGeometry().setFromPoints(pts.map(p => p.add(_wtV.set(0, wt.rest.dy0, 0)))); wt.fx.path.computeLineDistances(); }
  const dir = new THREE.Vector3(-0.80, 0.36, 0.48).normalize(), aim = new THREE.Vector3(0, 0.42, 0), dist = 2.5 * (narrow() ? (innerWidth < innerHeight ? 1.9 : 1.25) : 1);
  controls.maxDistance = Math.max(controls.maxDistance, dist * 1.4); flyTo(aim.clone().addScaledVector(dir, dist), aim, 900, false);
}
function wtPathAt(a, s) {
  let rest = Math.max(0, s);
  for (const g of a.seg) {
    if (rest <= g.L || g === a.seg[a.seg.length - 1]) { const u = Math.min(rest, g.L);
      if (g.k === 'line') return { x: g.x0 + g.dx * u, z: g.z0 + g.dz * u, hx: g.dx, hz: g.dz, turn: false };
      const ang = g.a0 + g.sweep * (u / g.L), R = WT_FL.RT; const tx = -Math.sin(ang) * Math.sign(g.sweep), tz = Math.cos(ang) * Math.sign(g.sweep);
      return { x: g.cx + R * Math.cos(ang), z: g.cz + R * Math.sin(ang), hx: tx, hz: tz, turn: true }; }
    rest -= g.L;
  }
  return { x: 0, z: 0, hx: 0, hz: -1, turn: false };
}
function stepWtFlight(a, dt) {
  const F = WT_FL, ds = dt * (S.ts || 1); a.t += ds;
  let k = 0, u = a.t; while (k < a.T.length && u > a.T[k][1]) { u -= a.T[k][1]; k++; }
  const ph = k < a.T.length ? a.T[k][0] : 'end', f = k < a.T.length ? clamp(u / a.T[k][1], 0, 1) : 1, E = WT_EASE;
  const H = F.H1 + F.DH;
  let y = 0, theta = Math.PI / 2, v = 0, s = a.s, rpm = 0, rate = 3, msg = '', el = 0, eld = 0;
  if (ph === 'check') { const pulse = (t0) => u > t0 && u < t0 + 0.22; const on1 = pulse(0.2) || pulse(0.55), on2 = pulse(0.95) || pulse(1.3); D.motors[0].rpmTarget = on1 ? 1500 : 0; D.motors[1].rpmTarget = on2 ? 1500 : 0; D.motors.forEach(mo => mo.rpmRate = 16); msg = '離陸前の確認: 各モーターを短く2回ずつ回す（取説）'; rpm = -1; }
  else if (ph === 'spin') { rpm = HOVER_RPM * E(f); rate = 6; msg = 'プロペラをホバーの回転へ'; }
  else if (ph === 'climb') { y = F.H1 * E(f); rpm = HOVER_RPM * (1.06 + 0.06 * Math.sin(Math.PI * f)); el = 0.05 * Math.sin(a.t * 6.3); msg = '尾を下にしたまま真上へ上昇（ホバー・最大 6 m/s）'; }
  else if (ph === 'trans') { y = F.H1 + F.DH * E(f); theta = Math.PI / 2 - (Math.PI / 2 - F.THC) * E(Math.min(1, f * 1.3)); v = F.VC * (3 * f * f - 2 * f ** 3); s = F.VC * F.TT * (f ** 3 - f ** 4 / 2);
    el = f < 0.45 ? 0.32 * Math.sin(Math.PI * f / 0.45) : -0.06 * Math.sin(Math.PI * (f - 0.45) / 0.55); msg = '遷移: 機首を前へ倒して加速。速くなるほど翼が重さを支える（遷移はいつも自動・取説）'; }
  else if (ph === 'cruise') { y = H; theta = F.THC; v = F.VC; s = a.Str + F.VC * u; msg = '巡航: 飛行機として飛ぶ（16〜22 m/s）。曲がるときは翼を傾ける'; }
  else if (ph === 'back') { y = H + 0.10 * Math.sin(Math.PI * f); theta = F.THC + (WT_R(96) - F.THC) * E(Math.min(1, f * 1.35)) - WT_R(6) * E((f - 0.7) / 0.3); v = F.VC * (1 - (3 * f * f - 2 * f ** 3)); s = a.Str + a.Lc + F.VC * F.TB * (f - (f ** 3 - f ** 4 / 2));
    el = f < 0.5 ? -0.34 * Math.sin(Math.PI * f / 0.5) : 0.05 * Math.sin(Math.PI * (f - 0.5) / 0.5); msg = '戻りの遷移: 機首を起こして減速し、ホバーへ'; }
  else if (ph === 'hold') { y = H; s = a.Str + a.Lc + a.Sb; msg = '離陸地点の上でホバー'; }
  else if (ph === 'desc') { y = H * (1 - E(f ** 0.85)); el = 0.04 * Math.sin(a.t * 5.1); msg = '尾を下にしたまま垂直に降下（最大 2.5 m/s）。尾の距離センサーで着地をなめらかに'; }
  else if (ph === 'stop') { y = 0; rpm = HOVER_RPM * (1 - E(f / 0.6)); rate = 4; msg = '尾で着地。プロペラを止める'; }
  else { msg = '着陸しました'; }
  if (ph === 'hold') rpm = HOVER_RPM; else if (ph === 'desc') rpm = HOVER_RPM * 0.96;
  const w = (ph === 'trans' || ph === 'cruise' || ph === 'back') ? clamp((v / F.VC) ** 2, 0, 1) : 0;   // 翼が支える割合（揚力は速さの2乗）
  if (ph === 'trans' || ph === 'cruise' || ph === 'back') rpm = HOVER_RPM * (0.80 + 0.22 * (1 - w) + (ph === 'trans' ? 0.08 * Math.sin(Math.PI * f) : 0));   /* 回転数はあまり下がらない（前から風が入るので、同じ推力でも速く回す）。推力そのものは大きく下がる */
  if (rpm >= 0) for (const mo of D.motors) { mo.rpmTarget = rpm; mo.rpmRate = rate; }
  // 位置と向き（経路の接線）。旋回中は右へ傾ける
  a.s = s; const p = wtPathAt(a, s);
  const dx = p.x - a.x, dz = p.z - a.z, idt = 1 / Math.max(ds, 1e-4);
  a.x = p.x; a.z = p.z;
  if (v > 0.02) { let psi = Math.atan2(-p.hx, -p.hz); while (psi - a.psi > Math.PI) psi -= Math.PI * 2; while (psi - a.psi < -Math.PI) psi += Math.PI * 2; a.psi = psi; }
  const phiT = ph === 'cruise' && p.turn ? F.BANK : 0, phiWas = a.phi; a.phi += (phiT - a.phi) * (1 - Math.exp(-ds * 2.6)); const dphi = (a.phi - phiWas) * idt;
  eld = clamp(-0.55 * dphi, -0.35, 0.35) + (ph === 'cruise' && p.turn ? -0.03 : 0);
  a.theta = theta; a.y = y;
  body.px = a.x; body.pz = a.z; body.py = y; body.tx = body.tz = 0; body.yaw = 0; body.vyF = 0;
  body.v.set(dx * idt, (y - (a.yWas == null ? y : a.yWas)) * idt, dz * idt); a.yWas = y;
  // 姿勢: 方位 ψ（世界の縦軸）→ 機首の上げ θ（機体の横軸）→ 傾き φ（機首の軸）
  D.pose.quaternion.setFromEuler(_wtE.set(theta, a.psi, a.phi, 'YXZ'));
  D.pose.position.y = wt.rest.dy0;
  a.el = [clamp(el - eld, -0.5, 0.5), clamp(el + eld, -0.5, 0.5)];
  // 矢印: 重さ（いつも下）・揚力（翼の割合）・推力（重さに対する割合の目安）
  const fx = wt.fx; if (fx) {
    const rootY = y + wt.rest.dy0;
    fx.weight.position.set(a.x, rootY - 0.02, a.z); fx.weight.visible = ph !== 'end' && ph !== 'check' && ph !== 'spin' && ph !== 'stop';
    fx.drop.visible = y > 0.05; fx.drop.scale.y = Math.max(0.01, rootY + 0.158); fx.drop.position.set(a.x, (rootY - 0.158) / 2, a.z);
    const thrustW = ph === 'climb' || ph === 'hold' || ph === 'desc' ? 1 : (ph === 'trans' || ph === 'back' || ph === 'cruise') ? (1 - w) + 0.14 * w : 0;   /* 巡航の推力は重さの約1/7（揚抗比を7と置いた目安・推定） */
    fx.thrust.forEach((ar, i) => { ar.visible = thrustW > 0.01 && D.motors[i].rpm > 300; ar.userData.setLength(0.02 + 0.09 * thrustW); });
    D.arrows.lift.forEach(ar => { ar.visible = w > 0.03; ar.userData.setLength(0.02 + 0.13 * w); });
    a.hudT -= dt; if (a.hudT <= 0 || ph !== a.lastPh) { a.hudT = 0.12;
      const deg = Math.round(theta * 180 / Math.PI), alt = y <= F.H1 ? 25 * y / F.H1 : 25 + (y - F.H1) / F.DH * 3;
      wtSetText('#wtHudPitch', deg >= 85 ? `真上 ${deg}°` : `${deg}°`); wtSetText('#wtHudSpd', `${Math.round(19 * v / F.VC)} m/s`); wtSetText('#wtHudAlt', `${Math.round(alt)} m`);
      const pw = Math.round(100 * (1 - w)); const bp = $('#wtBarProp'), bw = $('#wtBarWing'); if (bp) bp.style.width = pw + '%'; if (bw) bw.style.width = (100 - pw) + '%';
      wtSetText('#wtHudShare', `プロペラ ${pw}%・主翼 ${100 - pw}%`); wtSetText('#wtHudWing', `主翼 ${100 - pw}%`); wtSetText('#wtFlState', msg); a.lastPh = ph; }
  }
  // カメラ: 注視点は機体を追い、視点は半分だけついていく（地面に対する動きが見える）
  if (!S.camSpring) { const tgt = _wtV.set(a.x, y + wt.rest.dy0 * 0.5, a.z).add(wtCardShift(_wtS1)); const prev = _wtV2.copy(controls.target); controls.target.lerp(tgt, 1 - Math.exp(-dt * 2.4)); camera.position.addScaledVector(prev.sub(controls.target).negate(), 0.5); if (camera.position.y < 0.05) camera.position.y = 0.05; }
  if (ph === 'end') { const t = a.t; a.endT = a.endT || t; if (t - a.endT > 0.6) { wt.act = null; wtFlightEnd(a); } }
  return true;
}
function wtFlightEnd(a) {
  for (const mo of D.motors) { mo.rpmTarget = null; mo.rpmRate = null; }
  for (const th of D.arrows.thrust) th.userData.forceHide = false;
  wtFx(false);
  if (a.airWas != null) { S.air = a.airWas; for (const x of $$('.tgl[data-t=air]')) { x.classList.toggle('on', S.air); x.setAttribute('aria-pressed', String(S.air)); } }
  body.px = body.py = body.pz = 0; body.v.set(0, 0, 0); wt._poseKey = '';
  syncBodyMode(); syncWtChips(); wtSetText('#wtFlState', '尾で着陸しました（もう一度で最初から）');
  focusOn([D.root], { pull: true });
}

// ---------- 場面: パラシュート ----------
function wtChuteStart(a) {
  if (D.canopy.parent !== scene) scene.add(D.canopy); wt.rest.w = 0; wt._poseKey = '';
  a.y = 0; a.vy = 0; a.q = new THREE.Quaternion().setFromAxisAngle(_wtX, Math.PI / 2);
  // 吊られたとき: 腹の後ろの取り付け点（0, −76, 270 mm）が重心の真上に来る向き（機首が下・背中が外）
  const v = new THREE.Vector3(0, -76, 270).normalize(); a.qHang = new THREE.Quaternion().setFromAxisAngle(_wtX, Math.atan2(v.y, v.z) - Math.PI / 2);
  const dir = new THREE.Vector3(0.78, 0.30, -0.55).normalize(), aim = new THREE.Vector3(0, 0.75, 0), dist = 3.0 * (narrow() ? (innerWidth < innerHeight ? 1.7 : 1.25) : 1);
  controls.maxDistance = Math.max(controls.maxDistance, dist * 1.4); flyTo(aim.clone().addScaledVector(dir, dist), aim, 900, false);
}
function stepWtChute(a, dt) {
  const ds = dt * (S.ts || 1); a.t += ds; const t = a.t, E = WT_EASE, cp = D.chutePart;
  let msg = '';
  const TOP = 1.25;
  if (t < 2.4) { a.y = TOP * E((t - 0.5) / 1.9); for (const mo of D.motors) { mo.rpmTarget = HOVER_RPM * (t < 0.5 ? E(t / 0.5) : 1.05); mo.rpmRate = 5; } msg = 'ホバーで上がります（パラシュートは高さ45 m以上で使う）'; }
  else if (t < 2.9) { for (const mo of D.motors) { mo.rpmTarget = HOVER_RPM; } msg = '推進が故障した例'; }
  else if (t < 3.15) { for (const mo of D.motors) { mo.rpmTarget = 0; mo.rpmRate = 9; } a.vy -= 9.8 * 0.35 * ds; a.y += a.vy * ds; msg = '急な落下を検知'; }
  else {
    if (!a.fired) { a.fired = true; a.fireY = a.y; if (!cp.anim) cp.anim = { pos: new THREE.Vector3(), quat: new THREE.Quaternion() }; D.canopy.visible = true; }
    const k = t - 3.15;
    for (const mo of D.motors) { mo.rpmTarget = 0; mo.rpmRate = 9; }
    cp.anim.pos.set(0, -0.10 / WT_K * E(k / 0.35), 0.05 / WT_K * E(k / 0.35)); cp.obj.visible = k < 0.5;   /* ふたと傘の包みを腹から押し出す */
    const vT = -0.32; if (!a.landT) { a.vy += (vT - a.vy) * (1 - Math.exp(-ds * (k < 1.2 ? 2.5 : 5))); a.y += a.vy * ds; }
    a.q.slerp(a.qHang, 1 - Math.exp(-ds * 2.2));
    msg = k < 1.4 ? '飛行終了のしくみが電源を切り、ふたと傘をバネで押し出す（取説）' : '傘につられて降下（平均 4 m/s・公式）';
  }
  // 姿勢・位置
  const sway = a.fired ? Math.sin(t * 1.7) * WT_R(5) * Math.min(1, (t - 3.15) / 1.5) : 0;
  D.pose.quaternion.copy(a.q).premultiply(_wtQ1.setFromAxisAngle(_wtV.set(0, 0, 1), sway));
  D.pose.position.y = wt.rest.dy0;
  body.px = body.pz = 0; body.py = a.fired ? a.y : Math.max(0, a.y); body.tx = body.tz = 0; body.yaw = 0;
  // 着地: 機体のいちばん低い所が床に着いたら止める
  if (a.fired) {
    D.root.position.set(0, body.py, 0); D.root.quaternion.identity(); D.root.updateMatrixWorld(true);
    const low = Math.min(wtLow(wt._hang), wtLow([D.parts.find(p => p.key === 'body').obj, D.parts.find(p => p.key === 'wing').obj], 6));   /* 吊られた向きでは胴の前や翼の肩も床に近い */
    if (low < ALT_FLOOR + 0.001) { a.y += ALT_FLOOR - low; body.py = a.y; a.vy = 0; if (!a.landT) a.landT = t; D.root.position.y = a.y; D.root.updateMatrixWorld(true); }   /* 床に着いたら、いちばん低い所を床にそろえて止める */
    if (a.landT) msg = '着地しました（もう一度で最初から）';
    // 傘: 取り付け点の上。開いて膨らみ、着地のあとはしぼむ
    const att = D.sg.localToWorld(_wtV.copy(wtP(0, -76, 270)));
    const k = t - 3.15, open = E(k / 1.0), col = a.landT ? E((t - a.landT) / 1.2) : 0;
    D.canopy.position.set(att.x + col * 0.35, att.y + 0.55 * open - col * 0.45, att.z);
    D.canopy.scale.set(0.15 + 0.85 * open, (0.15 + 0.85 * open) * (1 - 0.8 * col), 0.15 + 0.85 * open);
    if (a.landT && t - a.landT > 2.2) { wt.act = null; D.canopy.visible = false; if (cp.anim) { cp.anim = null; cp.animReset = true; } cp.obj.visible = true; body.py = 0; wt._poseKey = '';
      for (const mo of D.motors) { mo.rpmTarget = null; mo.rpmRate = null; } syncBodyMode(); syncWtChips(); focusOn([D.root], { pull: true }); return; }
  }
  if (!S.camSpring) { const prev = _wtV2.copy(controls.target); controls.target.lerp(_wtV.set(0, Math.max(0.15, body.py + 0.30), 0).add(wtCardShift(_wtS1)), 1 - Math.exp(-dt * 2)); camera.position.addScaledVector(prev.sub(controls.target).negate(), 0.6); }   /* 傘の上まで入るよう少し上を見る */
  wtSetText('#wtChState', msg);
}

// ---------- 動き: 操縦翼面（その場で巡航の姿勢にして） ----------
function stepWtElevon(a, dt) {
  a.t += dt; const t = a.t, R = WT_R, E = WT_EASE, L = wt.lv;
  const T = [1.5, 1.8, 0.6, 1.8, 0.6, 1.8, 0.6, 1.8, 0.6, 1.5];
  let k = 0, u = t; while (k < T.length && u > T[k]) { u -= T[k]; k++; } const f = k < T.length ? u / T[k] : 1;
  const S1 = (x) => Math.sin(Math.PI * clamp(x, 0, 1));
  let d = [0, 0], pitch = 0, roll = 0, msg = '';
  if (k === 0) { L.to = 1; msg = '巡航の姿勢にします'; }
  else if (k === 1) { const e = S1(f); d = [0.32 * e, 0.32 * e]; pitch = -R(7) * e; msg = '2枚とも後ろを下げる → 尾が持ち上がり、機首が下がる'; }
  else if (k === 3) { const e = S1(f); d = [-0.32 * e, -0.32 * e]; pitch = R(7) * e; msg = '2枚とも後ろを上げる → 尾が下がり、機首が上がる'; }
  else if (k === 5) { const e = S1(f); d = [-0.32 * e, 0.32 * e]; roll = -R(14) * e; msg = '右を上げ、左を下げる → 右へ傾く（右旋回のはじまり）'; }
  else if (k === 7) { const e = S1(f); d = [0.32 * e, -0.32 * e]; roll = R(14) * e; msg = '左を上げ、右を下げる → 左へ傾く'; }
  else if (k === 9) { L.to = 0; msg = '立てた姿勢にもどす'; }
  else msg = k < T.length ? 'まっすぐにもどす' : 'おわり';
  L.pitch = pitch; L.roll = roll; a.el = d;
  // 舵に当たる空気の力（橙の矢印）: 後ろを下げた舵は上へ押される
  wt.force.forEach((ar, i) => { const dd = d[i]; ar.visible = Math.abs(dd) > 0.03; ar.rotation.x = dd >= 0 ? 0 : Math.PI; ar.userData.setLength(0.01 + 0.16 * Math.abs(dd)); });
  wtSetText('#wtElState', msg);
  if (k >= T.length && L.w < 0.002) { for (const ar of wt.force) ar.visible = false; wt.act = null; a.el = null; syncWtChips(); }
}

// ---------- 動き: 電池交換・カメラの付け替え ----------
function stepWtBattery(a, dt) {
  a.t += dt; const t = a.t, E = WT_EASE, K = WT_K;
  const np = D.nosePart, lp = D.latchPart; for (const p of [np, lp, ...D.bats]) if (!p.anim) p.anim = { pos: new THREE.Vector3(), quat: new THREE.Quaternion() };
  // 順番は取説どおり: ノーズを外す → 電源を切る（ボタンはノーズの下）→ つまみ → 抜く → 差す → つまみ → 電源を入れる → ノーズを戻す
  const off = t < 0.8 ? E(t / 0.8) : t < 6.1 ? 1 : 1 - E((t - 6.1) / 0.8);   // ノーズコーン: 前へ外して横へ置く
  np.anim.pos.set(0.15 / K * E((off - 0.45) / 0.55), 0.02 / K * off, -0.10 / K * E(off / 0.5));
  if (t > 1.2 && t < 5.4 && wt.powered) setWtPower(false);
  const lat = t < 1.5 ? 0 : t < 2.0 ? E((t - 1.5) / 0.5) : t < 4.6 ? 1 : 1 - E((t - 4.6) / 0.5);   // 十字のつまみを直角に回す
  lp.anim.quat.setFromAxisAngle(_wtV.set(0, 0, 1), Math.PI / 2 * lat);
  const out = t < 2.0 ? 0 : t < 3.0 ? E((t - 2.0) / 1.0) : t < 3.5 ? 1 : t < 4.5 ? 1 - E((t - 3.5) / 1.0) : 0;   // 電池を前へ引き抜き、入れ替えて差し込む
  for (const p of D.bats) { p.anim.pos.set(0, 0, -0.16 / K * out); setTint(p, t < 3.25 ? PD_OLD : PD_NEW, t < 2.0 ? 0 : t < 5.2 ? 0.55 : Math.max(0, 0.55 * (1 - (t - 5.2) / 0.8))); }
  if (t > 5.4 && !wt.powered) setWtPower(true);
  wtSetText('#wtBatState', t < 0.8 ? '磁石で付いたノーズコーンを外します' : t < 1.5 ? '電源ボタン（電池室の中央）を長押しして電源を切ります' : t < 2.0 ? '十字のつまみを回して外します' : t < 3.0 ? '取っ手を持って2個とも引き抜きます' : t < 3.5 ? '充電済みの組（同じ刻印の2個）に持ち替え' : t < 4.5 ? '取っ手を内側に向けて差し込みます（差すだけでつながる）' : t < 5.1 ? 'つまみを直角に回して留めます' : t < 6.1 ? '電源ボタンを長押しして電源を入れます（起動音）' : t < 6.9 ? 'ノーズコーンを戻します' : '準備ができました');
  if (t > 7.4) { for (const p of [np, lp, ...D.bats]) { p.anim = null; p.animReset = true; setTint(p, PD_OLD, 0); } wt.act = null; syncWtChips(); }
}
function stepWtPayload(a, dt) {
  a.t += dt; const t = a.t, E = WT_EASE, K = WT_K, p = D.payPart;
  if (!p.anim) p.anim = { pos: new THREE.Vector3(), quat: new THREE.Quaternion() };
  const out = t < 0.6 ? 0 : t < 1.6 ? E((t - 0.6) / 1.0) : t < 2.8 ? 1 : t < 3.8 ? 1 - E((t - 2.8) / 1.0) : 0;
  p.anim.pos.set(0, -0.13 / K * out, 0.03 / K * Math.sin(Math.PI * out) * 0.3);
  setTint(p, t < 2.2 ? PD_OLD : PD_NEW, t < 0.6 ? 0 : t < 4.0 ? 0.5 : Math.max(0, 0.5 * (1 - (t - 4.0) / 0.8)));
  wtSetText('#wtPayState', t < 0.6 ? '前の端のつまみを回して外します' : t < 1.6 ? '腹から引き出します（工具はいらない）' : t < 2.8 ? '別のカメラに持ち替え' : t < 3.8 ? '差し込みます' : 'つまみを回して留めました');
  if (t > 4.9) { p.anim = null; p.animReset = true; setTint(p, PD_OLD, 0); wt.act = null; syncWtChips(); }
}

// ---------- 機体の置き方（尾で立つ） ----------
// 尾翼の先・尾のバンパーと左右の脚の棒の先で立つ。立てたときのわずかな傾き（lean）は、形から「棒の先」と「尾」のいちばん低い点がそろう角度を求める
function wtRestInit() {
  const pose = D.pose, lowOf = (objs) => { let low = Infinity; for (const o of objs) low = Math.min(low, altLowest(o, 1)); return low; };
  const rods = D.rods, tail = [D.finPart.obj, D.parts.find(p => p.key === 'tailBumper').obj];
  const at = (lean) => { pose.quaternion.setFromAxisAngle(_wtX, Math.PI / 2 + lean); pose.position.set(0, 0, 0); pose.updateMatrixWorld(true); D.root.updateMatrixWorld(true); return lowOf(rods) - lowOf(tail); };
  let a = WT_R(-15), b = WT_R(15), fa = at(a);
  for (let i = 0; i < 40; i++) { const m = (a + b) / 2, fm = at(m); if (Math.sign(fm) === Math.sign(fa)) { a = m; fa = fm; } else b = m; }
  const lean = (a + b) / 2; at(lean); wt.rest.lean = lean; wt.rest.dy = ALT_FLOOR - altLowest(D.sg, 1);   /* 床に合わせるのは機体全体のいちばん低い所 */
  at(0); wt.rest.dy0 = ALT_FLOOR - altLowest(D.sg, 1);
  wt._poseKey = '';
}
function wtApplyPose(dt) {
  const pose = D.pose, R = wt.rest, L = wt.lv;
  const air = body.py > 0.003 || body.mode !== 'idle' || L.w > 0.001 || L.to > 0;
  const want = (air || S.explode > 0.02) ? 0 : 1;
  R.w += (want - R.w) * (1 - Math.exp(-dt / 0.3)); if (Math.abs(R.w - want) < 0.002) R.w = want;
  if (L.to > L.w) L.w = Math.min(L.to, L.w + dt / 1.3); else if (L.to < L.w) L.w = Math.max(L.to, L.w - dt / 1.3);
  const e = WT_EASE(L.w), ex = S.explode;
  const key = `${R.w.toFixed(4)},${e.toFixed(4)},${L.pitch.toFixed(4)},${L.roll.toFixed(4)},${L.y},${ex.toFixed(3)}`;
  if (key === wt._poseKey) return false; wt._poseKey = key;
  _wtQ1.setFromAxisAngle(_wtX, Math.PI / 2 + R.lean * R.w);
  _wtQ2.setFromEuler(_wtE.set(L.pitch, 0, L.roll, 'XYZ'));
  pose.quaternion.slerpQuaternions(_wtQ1, _wtQ2, e);
  pose.position.y = lerp(R.dy0 + (R.dy - R.dy0) * R.w, L.y, e) + 0.14 * WT_EASE(ex);   /* 分解するときは部品が床に入らないよう持ち上げる */
  return true;
}
// 操縦翼面の角度: 動きが決めた角度、または「とばす」のホバー中の姿勢の変化から（同じ向き＝腹・背中の側へ傾ける、逆向き＝縦の軸まわりに回す。推定）
function wtElevons(dt) {
  const a = wt.act, hv = wt.hv; let tR = 0, tL = 0;
  if (a && a.el) { tR = a.el[0]; tL = a.el[1]; }
  else if (body.mode === 'demo' || body.mode === 'free') {
    const idt = 1 / Math.max(dt, 1e-3), wz = (body.tz - hv.tz) * idt, az = (wz - hv.wz) * idt; hv.tz = body.tz; hv.wz = wz; hv.az += (az - hv.az) * (1 - Math.exp(-dt / 0.08));
    let dyaw = body.yaw - hv.yaw; dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw)); hv.yaw = body.yaw; hv.yr += (dyaw * idt - hv.yr) * (1 - Math.exp(-dt / 0.12));
    const sym = clamp(-0.07 * hv.az - 0.35 * hv.wz, -0.4, 0.4), dif = clamp(0.5 * hv.yr, -0.4, 0.4);
    tR = sym + dif; tL = sym - dif;
  } else { hv.tz = body.tz; hv.wz = 0; hv.az = 0; hv.yaw = body.yaw; hv.yr = 0; }
  const k = 1 - Math.exp(-dt * 12); let moved = false;
  D.elevons.forEach((ev, i) => { const tgt = clamp(i === 0 ? tR : tL, -WT_R(30), WT_R(30)); const v = wt.el[i] + (tgt - wt.el[i]) * k; if (Math.abs(v - wt.el[i]) > 1e-5) moved = true; wt.el[i] = Math.abs(v) < 1e-4 && tgt === 0 ? 0 : v; ev.g.rotation.x = wt.el[i]; });
  return moved;
}

// ---------- 毎フレーム ----------
function stepWt(dt) {
  let dirty = false;
  if (S.explode > 0.02 && wt.act) wtStop(true);
  { const sup = wt.sizeOn || wt.fovOn || wt.radarOn || !!(wt.act && (wt.act.id === 'flight' || wt.act.id === 'chute' || wt.act.id === 'elevon')); if (sup !== wt._sup) { wt._sup = sup; S.labelsSuppressed = sup; } }
  const a = wt.act;
  if (a) {
    dirty = true;
    if (a.id === 'flight') stepWtFlight(a, dt);
    else if (a.id === 'chute') stepWtChute(a, dt);
    else if (a.id === 'elevon') stepWtElevon(a, dt);
    else if (a.id === 'battery') stepWtBattery(a, dt);
    else if (a.id === 'payload') stepWtPayload(a, dt);
  }
  if (!(wt.act && wt.act.pose)) { if (wtApplyPose(dt)) dirty = true; }
  if (body.mode === 'free' && Math.abs(body.tx) + Math.abs(body.tz) > 0.02) { D.root.rotation.set(body.tz, body.yaw, -body.tx, 'YXZ'); D.root.position.set(body.px, body.py, body.pz); D.root.updateMatrixWorld(true); const low = wtLow(wt._gear); if (low < ALT_FLOOR) { body.py += ALT_FLOOR - low; dirty = true; } }   /* いまの傾きで、脚・尾翼・ウイングレットだけを測る */
  { const cutOn = S.mode === 'cut' && !wt.act; if (cutOn !== !!wt._cut) { wt._cut = cutOn; D.nosePart.obj.visible = !cutOn; for (const p of D.bats) { if (cutOn) p.anim = { pos: new THREE.Vector3(0, 0, -0.075 / WT_K), quat: new THREE.Quaternion() }; else if (p.anim) { p.anim = null; p.animReset = true; } } dirty = true; } }   /* 断面: 電池は胴の中なので、ノーズを外して少し引き出し、切り口を見せる */   /* 操縦で傾けたとき、脚の先や尾翼の先が床に入らない */
  if (wtElevons(dt)) dirty = true;
  if (dirty) S.shadowDirty = S.csDirty = S.aoDirty = true;
}

// ---------- 起動 ----------
function initWt() {
  for (const b of $$('[data-wt]')) b.addEventListener('click', () => wtAction(b.dataset.wt));
  wt.person = buildPerson(); wt.person.scale.setScalar(WT_K); wt.person.position.set(0.42, -0.158, 0.30); wt.person.visible = false; scene.add(wt.person);
  wt.ghost = pd6bQuadGhost(); wt.ghost.scale.setScalar(WT_K); wt.ghost.position.set(-0.48, -0.158 + 0.156 * WT_K, -0.10); wt.ghost.visible = false; scene.add(wt.ghost);
  scene.add(D.canopy);
  wt.force = D.elevons.map(ev => { const ar = arrowMesh(0xef6a2d, 0.05, 0.004); ar.position.copy(wtP(ev.sx * 350, 0, 250)); ar.scale.setScalar(1 / WT_K); ar.visible = false; D.sg.add(ar); return ar; });   /* 舵に当たる空気の力（操縦翼面の説明用） */
  const bumper = D.parts.find(p => p.key === 'tailBumper').obj;
  wt._gear = [...D.rods, ...D.winglets, D.finPart.obj, bumper]; wt._hang = [D.nosePart.obj, ...D.motors.map(m => m.group), ...wt._gear];
  wtRestInit(); wt.rest.w = 1; wtApplyPose(0);
  setWtPower(true);
  syncWtChips();
  wtFrameDrone(null, 1.3);
  const q = new URLSearchParams(location.search);
  if (!SHARE_KEYS.some(k => q.has(k))) setTimeout(() => { if (!$('#noteCard').dataset.kind) { renderWtAbout(); wtFrameDrone(); } }, 900);
}
