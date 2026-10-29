// ===== DJI Mini 5 Pro の固有の動き =====
// たたむ（後方右アームで電源オン／オフのカウントダウン）・電池交換・ジンバル（上向き55°・縦向き撮影・ロール225°・傾きの打ち消し）・画角（24mm／48mm）・検知範囲・大きさ
// ジンバルの数値は公式の仕様: 操作可能範囲 チルト −90°〜55°・ロール −180°〜45°、最大制御速度（チルト）100°/秒、
// 機械的可動範囲 チルト −135°〜80°・ロール −230°〜95°・パン −25°〜25°。
const MN5_R = THREE.MathUtils.degToRad;
const mn5 = { gim: { tilt: 0, roll: 0, zoom: 1 }, fold: 0, foldTo: 0, act: null, powered: true, fovOn: false, senseOn: false, sizeOn: false, person: null, ghost: null, pendingPower: false, _sup: false, _last: -1,
  rest: { th: 0, dy: 0, w: 1 }, pose: { lift: 0, px: 0, yaw: 0, rz: 0 }, _poseKey: '' };

// ---------- 状態の問い合わせ ----------
function mn5Busy() { return IS_MINI5 && (mn5.foldTo > 0 || mn5.fold > 0.001 || !!mn5.act || mn5.sizeOn || mn5.fovOn || mn5.senseOn); }
function mn5Wide() { return mn5.sizeOn || mn5.fovOn || mn5.senseOn; }
function mn5ShadowExtra() { return mn5.sizeOn ? 1.1 : 0; }
function mn5HasVariant() { return false; }
const mn5FrameWide = () => frameBox([-0.20, -0.16, -0.20], [0.20, 0.0, 0.20], [0.62, 0.42, -0.66], 1.12);
function mn5BlockPower() {
  if (!IS_MINI5) return false;
  if (mn5.act) { mn5Stop(); return false; }
  if (mn5.fold > 0.001 || mn5.foldTo > 0) { mn5.foldTo = 0; mn5.pendingPower = true; syncMn5Chips(); if ($('#noteCard').dataset.kind === 'mn5-fold') renderNote(null); showToast('アームを開いてから回します'); mn5FrameWide(); return true; }
  if (!mn5.powered) setMn5Power(true, '電源ボタンを押してから長押しして電源を入れました');
  return false;
}
function mn5OnTab(tab) {
  if (!IS_MINI5) return;
  if (tab !== 'fly') mn5.pendingPower = false;   /* 「とばす」で押した電源を、ほかのタブで広げ終えたときに回さない */
  if (tab !== 'see') { const had = !!mn5.act || mn5Wide(); mn5Stop(); mn5Overlays(null, true); if (($('#noteCard').dataset.kind || '').startsWith('mn5-')) renderNote(null); if (had) focusOn([D.root], { pull: true }); }
  if (tab === 'fly' && (mn5.foldTo > 0 || mn5.fold > 0.001)) { mn5.foldTo = 0; syncMn5Chips(); showToast('アームを開きました'); mn5FrameWide(); }
}

// ---------- 動きの入口 ----------
function mn5Action(id) {
  if (!IS_MINI5) return;
  if (S.tab !== 'see') setTab('see');
  if (id === 'about') { if (mn5.act) mn5Stop(); mn5Overlays(null, true); renderMn5About(); mn5FrameDrone(null, 1.05); return; }
  if (id === 'fov' || id === 'sense' || id === 'size') { if (mn5.act) mn5Stop(); const was = { fov: mn5.fovOn, sense: mn5.senseOn, size: mn5.sizeOn }[id]; mn5Overlays(was ? null : id); return; }
  mn5Overlays(null, true);
  if (mn5.act) mn5Stop();
  stopOthers('alt');
  if (S.explode > 0.02) setExplode(0);
  if (S.mode === 'cut') setMode('normal');
  if (id === 'fold') {
    mn5.foldTo = mn5.foldTo > 0 ? 0 : 1; mn5.pendingPower = false;
    if (mn5.foldTo > 0 && S.power > 0) setPower(0, true);
    renderMn5Note('fold'); syncMn5Chips(); mn5FrameWide(); return;   /* 広げた大きさで枠を決める */
  }
  if (S.power > 0) setPower(0, true);
  if (id === 'battery') {
    if (mn5.foldTo > 0 || mn5.fold > 0.001) mn5.foldTo = 0;
    mn5.act = { id, t: 0, p: D.batPart }; renderMn5Note('battery'); syncMn5Chips(); frameBox([-0.08, -0.15, -0.06], [0.08, -0.05, 0.20], [-0.62, 0.40, 0.68], 1.15); return;
  }
  if (id === 'gimbal') {
    if (mn5.foldTo > 0 || mn5.fold > 0.001) mn5.foldTo = 0;
    mn5.act = { id, t: 0 }; mn5.gim.tilt = mn5.gim.roll = 0; renderMn5Note('gimbal'); syncMn5Chips();
    const g = D.gimbalParts.head; g.updateWorldMatrix(true, false); const c = new THREE.Vector3().setFromMatrixPosition(g.matrixWorld);
    frameBox([c.x - 0.045, c.y - 0.035, c.z - 0.03], [c.x + 0.045, c.y + 0.045, c.z + 0.05], [0.42, 0.16, -0.89], 1.1); return;   /* 斜め前から: 左右の円筒（チルト）と頭の回り方が見える */
  }
}
function mn5Stop() {
  if (!IS_MINI5 || !mn5.act) return;
  const a = mn5.act; mn5.act = null;
  if (a.id === 'battery' && a.p) { a.p.anim = null; a.p.animReset = true; D.bay.visible = false; mn5.pose.lift = 0; if (!mn5.powered) setMn5Power(true); }
  if (a.id === 'gimbal') { mn5.gim.tilt = 0; mn5.gim.roll = 0; Object.assign(mn5.pose, { lift: 0, px: 0, yaw: 0, rz: 0 }); }
  syncBodyMode(); syncMn5Chips();
  if ($('#noteCard').dataset.kind === 'mn5-' + a.id) renderNote(null);
  if (a.id === 'gimbal' || a.id === 'battery') focusOn([D.root], { pull: true });
}
// 画角・検知範囲・大きさは「重ね絵」。同時には1つだけ
function mn5Overlays(id, quiet) {
  const was = { fov: mn5.fovOn, sense: mn5.senseOn, size: mn5.sizeOn };
  mn5.fovOn = id === 'fov'; mn5.senseOn = id === 'sense'; mn5.sizeOn = id === 'size';
  D.fovG.visible = mn5.fovOn; D.senseG.visible = mn5.senseOn;
  if (mn5.person) mn5.person.visible = mn5.sizeOn; if (mn5.ghost) mn5.ghost.visible = mn5.sizeOn;
  S.shadowDirty = S.csDirty = S.aoDirty = true; syncMn5Chips();
  if (!id && !fpv.on) { const sup = !!(mn5.act && mn5.act.id === 'gimbal'); mn5._sup = sup; S.labelsSuppressed = sup; }   /* ラベルの抑えをその場で戻す（次のコマを待つと「眼」が古い値を控える） */
  if (id) {
    if (S.explode > 0.02) setExplode(0); if (S.power > 0) setPower(0, true); if (mn5.foldTo > 0 || mn5.fold > 0.001) mn5.foldTo = 0;
    renderMn5Note(id);
    if (id === 'fov') frameBox([-0.30, -0.30, -0.85], [0.30, 0.10, 0.15], [0.72, 0.50, -0.85], 1.05);   /* 前斜め上から。錐がこちらへ広がり、機体は奥に見える */
    if (id === 'sense') frameBox([-0.42, -0.22, -0.48], [0.42, 0.42, 0.48], [0.70, 0.66, -0.75], 1.02);
    if (id === 'size') { if (mn5.person.userData.face) mn5.person.userData.face(camera.position.x, camera.position.z); pdFrame([D.root, mn5.person, mn5.ghost], { pull: true, margin: 1.15, dir: new THREE.Vector3(0.45, 0.32, -0.84).normalize() }); }
  } else if (!quiet && (was.fov || was.sense || was.size)) {
    const k = $('#noteCard').dataset.kind; if (['mn5-fov', 'mn5-sense', 'mn5-size'].includes(k)) renderNote(null);
    focusOn([D.root], { pull: true });
  } else if (quiet) { const k = $('#noteCard').dataset.kind; if (['mn5-fov', 'mn5-sense', 'mn5-size'].includes(k)) renderNote(null); }
}
function setMn5Power(on, msg) {
  mn5.powered = !!on;
  const swap = (m, want) => { const was = m.userData.origMat || m.material; m.userData.origMat = want; if (m.material === was) m.material = want; };
  for (const p of D.parts) {
    if (p.key === 'statusLed' && p.lamp) swap(p.lamp, on ? M.ledGreen : M.chip);
    if (p.key === 'batteryLed' && p.obj.userData.lamps) for (const l of p.obj.userData.lamps) swap(l, on ? M.ledGreen : M.chip);
  }
  if (msg) showToast(msg, 3200);
}
function syncMn5Chips() {
  const set = (id, on, label) => { const b = $(`#mn5Chips [data-mn5="${id}"]`); if (!b) return; b.classList.toggle('on', !!on); if (b.hasAttribute('aria-pressed')) b.setAttribute('aria-pressed', String(!!on)); if (label) b.textContent = label; };
  set('fold', mn5.foldTo > 0, mn5.foldTo > 0 ? '広げる' : 'たたむ');
  set('battery', mn5.act && mn5.act.id === 'battery'); set('gimbal', mn5.act && mn5.act.id === 'gimbal');
  set('fov', mn5.fovOn); set('sense', mn5.senseOn); set('size', mn5.sizeOn);
}
const mn5FrameDrone = (dir, margin) => pdFrame([D.root], { pull: true, margin: (margin || 1.25) * (narrow() ? 0.8 : 1), dir: dir ? new THREE.Vector3(...dir).normalize() : undefined });

// ---------- 説明カード ----------
const MN5_SRC_LINK = (k) => { const s = MN5_SRC[k]; return `<a href="${s.url}" target="_blank" rel="noopener">${s.name}</a>`; };
function renderMn5About() {
  const row = (k, v, src) => `<tr><th>${k}</th><td>${v}${src ? `<small>${src}</small>` : ''}</td></tr>`;
  const html = `<p><b>1インチのカメラを積んだ、手のひらに載る折りたたみ式の空撮用ドローン。</b>離陸重量は249.9 g。ジンバルは上へ55°、ロールで縦向きの撮影まで回り、前向きのLiDARで夜でも前を測る（公式）。</p>
    <table class="pd-spec">
      ${row('離陸重量', '249.9 g', '公式・約249.9 g ± 4 g')}${row('展開時', '304 × 380 × 91 mm', '公式・長さ×幅×高さ・プロペラあり')}${row('折りたたみ時', '157 × 95 × 68 mm', '公式・プロペラなし')}
      ${row('最大飛行時間', '36 分（Plusは52 分）', '公式・無風で定速飛行')}${row('最大速度', '水平 18 m/s（Plusは19 m/s）', '公式・スポーツモード')}${row('最大風圧抵抗', '12 m/s', '公式')}
      ${row('カメラ', '1インチ CMOS・5000万画素・24mm相当 f/1.8・FOV 84°', '公式')}${row('バッテリー', '2788 mAh・7 V・19.52 Wh・約71.2 g', '公式・標準')}
      ${row('映像伝送', 'O4+・最大 10 km（日本）', '公式・障害物と干渉なし')}${row('検知', '全方向デュアルビジョン＋前向きLiDAR＋下向き3D赤外線', '公式')}${row('プロペラ', '6.0 × 2.8 インチ・約2.8 g', 'DJIストア')}
    </table>
    <h4>550クラスとのちがい</h4>
    <ul class="pd-diff"><li><b>249.9 g</b>：公式の離陸重量は249.9 g（±4 g）。それでも日本では100 g以上なので登録が必要（「登録」の解説）</li><li><b>折りたたみ</b>：前アームは下へ回って裏返り、胴の下の段に。後アームは前へ回って上の段に。<b>後方右アームを開くと電源が入る</b></li><li><b>前だけに脚</b>：前アームの脚にアンテナが入り、後ろは電池の底で立ち、置くと機首が上がる（写真からの推定）</li><li><b>大きなカメラの頭</b>：1インチのセンサーを3軸ジンバルで吊り、ロールで縦向きの撮影にも回る。「眼」ボタンでカメラの映像を見られる</li><li><b>部品が一体</b>：フレーム・ESC・受信機が胴の中にまとまり、配線や基板は外から見えない</li></ul>
    <p class="caveat">この3Dモデルは、公式の仕様・取扱説明書と写真から起こした教材用の再現です。公式の3Dデータや寸法図は公開されていないため、形は公式の真上・正面・斜めの製品写真と取説の図から寸法を読み取って起こしました。高さ方向の寸法・ジンバルの軸の役割・内部の配置は推定を含みます（解説の「推定」「例」）。</p>
    <details class="pd-src"><summary>出典（${MN5_DATE}）</summary><ul>${['product', 'specs', 'faq', 'manual', 'safety', 'store', 'prop'].map(k => `<li>${MN5_SRC_LINK(k)}</li>`).join('')}</ul></details>`;
  renderNote({ kind: 'mn5-about', title: 'DJI Mini 5 Pro', html, actions: [{ label: 'たたんでみる', fn: () => mn5Action('fold') }, { label: 'ジンバルを動かす', fn: () => { renderNote(null); mn5Action('gimbal'); } }] });
}
function renderMn5Note(id) {
  const N = {
    fold: () => ({ title: mn5.foldTo > 0 ? 'アームをたたむ' : 'アームを広げる', html: mn5.foldTo > 0
      ? `<p>羽根を寄せ、<b>前アームを下へ回して後ろへ</b>（裏返ってモーターが下・脚が上になり、胴の下の段に沿う）。続いて<b>後アームを前へ</b>回し、胴の上の段に沿わせます。最後にジンバルにストレージカバーをかぶせます。折りたたむと 157 × 95 × 68 mm（公式）。</p><p><b>後方右アームを折りたたむと、電源オフのカウントダウンが始まります</b>（取説）。カウントダウン中に機体のボタンを押すと取り消せます。</p><p class="caveat">たたむ順番は取説に文章では書かれておらず、展開の図の逆順としています。回り方は取説の図と製品写真から起こした推定です。</p>`
      : `<p>ストレージカバーを外し、<b>後アームを外へ</b>回して開きます。<b>後方右アームを開くと、電源ボタンを押さなくても電源が入ります</b>（初期設定・取説）。続いて前アームを下から前へ回して開きます。</p><p class="caveat">USB-Cポートを使っている間は、アームを開いても電源は入りません（取説）。順番は取説とクイックスタートガイドの図から。</p>`,
      actions: [{ label: mn5.foldTo > 0 ? '広げる' : 'たたむ', primary: true, fn: () => mn5Action('fold') }] }),
    battery: () => ({ title: 'バッテリーを入れ替える', html: `<p id="mn5BatState" class="pd-state">電源を切っています…</p><p>電源ボタンを押してから長押しして電源を切り、機体を手に持って、<b>左右のバッテリーバックルを押しながら後ろへ</b>引き抜きます。入れるときは後ろから差し込み、カチッと音がするまで押し込みます（取説）。電源が入ったまま抜き差ししないこと（取説）。</p>
      <table class="pd-spec"><tr><th>標準</th><td>2788 mAh・約71.2 g・最大36分<small>公式</small></td></tr><tr><th>Plus</th><td>4680 mAh・約117 g・最大52分<small>公式。付けると機体は249 gを超える（DJIストア）</small></td></tr></table>
      <p class="caveat">胴の下に見える暗い受けと端子の形は図の例です。標準とPlusで外形が違うかは確認できなかったため、この図では同じ形で描いています。</p>`, actions: [{ label: 'もう一度', fn: () => mn5Action('battery') }], onClose: () => { mn5Stop(); focusOn([D.root], { pull: true }); } }),
    gimbal: () => ({ title: '3軸ジンバル', html: `<p id="mn5GimState" class="pd-state">上へ向けます…</p><p>カメラの頭は、下の縦の円筒（パン）から上へ回るU字の腕に、左右の円筒（チルト）で吊られています。頭はさらに光軸のまわりに回り（ロール）、<b>機体を傾けずに縦向きの撮影</b>ができます。上は55°まで向けられます（公式）。</p><table class="pd-spec"><tr><th>操作できる範囲</th><td>チルト −90°〜55°・ロール −180°〜45°<small>公式。ロールの幅は225°</small></td></tr><tr><th>最大制御速度</th><td>チルト 100°/秒<small>公式</small></td></tr><tr><th>角度ぶれ範囲</th><td>±0.005°<small>公式</small></td></tr></table><p class="caveat">機械的にはチルト −135°〜80°・ロール −230°〜95°・パン −25°〜25°（公式）。パンは操作できません（揺れの打ち消しに使うと考えられます）。どの円筒がどの軸か・ロールの回る向き・縦向きにするロールの角度は資料に無く、形からの推定です（この図は −90° で縦向きにしています）。</p>`, actions: [{ label: 'もう一度', fn: () => mn5Action('gimbal') }, { label: 'カメラから見る', fn: () => mn5CamView() }], onClose: () => { mn5Stop(); focusOn([D.root], { pull: true }); } }),
    fov: () => ({ title: 'カメラの画角', html: `<p>カメラは1台。<b>24mm相当・FOV 84°</b>（オレンジ）で広く写し、<b>48mm中望遠モード</b>（青）では2倍に寄って、従来のDJI Mini Proシリーズのデジタルズームより高い解像度で撮れます（公式）。</p><table class="pd-spec"><tr><th>センサー</th><td>1インチ CMOS・有効5000万画素<small>公式</small></td></tr><tr><th>レンズ</th><td>24mm相当・f/1.8・ピント 0.5 m〜∞<small>公式</small></td></tr><tr><th>デジタルズーム</th><td>4K 1〜3倍・FHD 1〜4倍・12MP写真 1〜3倍<small>公式</small></td></tr></table><p class="caveat">錐は公式のFOVを対角として4:3の枠で描いています。48mmの錐の角度は84°からの計算です。錐の長さは見やすさのための長さで、距離の意味はありません。</p>`,
      actions: [{ label: 'カメラから見る', primary: true, fn: () => mn5CamView() }, { label: 'もどす', fn: () => mn5Overlays(null) }], onClose: () => mn5Overlays(null) }),
    sense: () => ({ title: '検知範囲', html: `<p>前後の魚眼レンズで前後・左右・上を、底のデュアルビジョンと3D赤外線センサーで下を見て、全方向の障害物を検知します。前向きのLiDARは暗い夜でも前を測ります（公式）。</p><table class="pd-spec"><tr><th>ビジョン</th><td>前 0.5〜18・後 0.5〜18・横 0.5〜12・上 0.5〜18・下 0.3〜14 m<small>公式</small></td></tr><tr><th>LiDAR</th><td>夜間 0.5〜25 m・上下60°×左右60°<small>公式・反射率10%超</small></td></tr><tr><th>下向き赤外線</th><td>0.3〜8 m・前後60°×左右60°<small>公式</small></td></tr></table><p class="caveat">図は測定範囲を約45分の1に縮めた概念図です（下向きのドームと赤外線はさらに縮めています）。スポーツモードでは障害物回避が働きません（取説）。周りが1ルクス以下の暗さではビジョンは働かず、LiDARは明るい光の下では正常に働きません（公式）。</p>`, actions: [{ label: 'もどす', fn: () => mn5Overlays(null) }], onClose: () => mn5Overlays(null) }),
    size: () => ({ title: '大きさをくらべる', html: `<p>同じ縮尺で、<b>身長170cmの人</b>と、青い半透明の<b>550クラスのクアッド</b>（対角550mm・約2.4kg）を並べています。</p><p>Mini 5 Proは展開時 304 × 380 mm（プロペラあり・公式）、離陸重量249.9 g。折りたためば 157 × 95 × 68 mm で、手のひらに載る大きさです。550クラスのおよそ10分の1の重さです。</p>`, actions: [{ label: 'もどす', fn: () => mn5Overlays(null) }], onClose: () => mn5Overlays(null) }),
  };
  renderNote(Object.assign({ kind: 'mn5-' + id }, N[id]()));
}
// 「カメラから見る」: 機体のカメラの映像に入る
function mn5CamView() { mn5.gim.zoom = 1; renderNote(null); mn5Overlays(null, true); segSet($('#viewCol'), 'v', 'fpv'); fpvOn(true); }

// ---------- ジンバル ----------
// 縦の画角(度)。公式のFOV 84°を4:3の対角とみなし、倍率でデジタルに寄せる（48mm中望遠モード＝2倍）
function mn5VFov(z) { return 2 * Math.atan(Math.tan(MN5_R(42)) * 0.6 / z) * 180 / Math.PI; }
function mn5SetZoom(z) { mn5.gim.zoom = clamp(z, 1, 3); if (fpv.on) updateFpvHud(); }
// 毎フレーム（本体の姿勢を当てた後）。電源が入っていれば機体の傾きを打ち消す。軸は パン(Y) → チルト(X) → ロール(Z) の順につながる（形からの推定）。
// 望みの世界姿勢（機首の方位・指定のチルト・指定のロール）を付け根の世界姿勢で割って局所の回転にし、同じ軸の順で3つの角度に分ける
const _mn5q = new THREE.Quaternion(), _mn5q2 = new THREE.Quaternion(), _mn5e = new THREE.Euler(), _mn5e2 = new THREE.Euler(), _mn5v = new THREE.Vector3(), _mn5ax = new THREE.Vector3();
const mn5Norm = (a) => Math.atan2(Math.sin(a), Math.cos(a));
function mn5GimbalApply() {
  const gp = D.gimbalParts; if (!gp) return;
  let tl = mn5.gim.tilt, rl = -mn5.gim.roll, pn = 0;
  if (mn5.powered && !(fpv.on && !fpv.stabilized)) {
    gp.pan.parent.updateWorldMatrix(true, false); gp.pan.parent.getWorldQuaternion(_mn5q);
    D.root.getWorldQuaternion(_mn5q2); _mn5e2.setFromQuaternion(_mn5q2, 'YXZ');
    _mn5q2.setFromEuler(_mn5e.set(mn5.gim.tilt, _mn5e2.y, -mn5.gim.roll, 'YXZ'));
    _mn5q.invert().multiply(_mn5q2);
    // オイラー角の分解はチルト ±90°（真下）が特異点になるので使わない。パンは光軸の水平成分の向きから取り（真下に近いほど 0 へ寄せる）、
    // パンを外した残りからチルト、さらにチルトを外した残りからロールを取る
    const f = _mn5v.set(0, 0, 1).applyQuaternion(_mn5q), h = Math.hypot(f.x, f.z);
    let p = h < 1e-6 ? 0 : Math.atan2(f.x, f.z); if (Math.abs(p) > Math.PI / 2) p = mn5Norm(p - Math.PI);
    pn = clamp(p * Math.min(1, h / 0.1), MN5_R(-25), MN5_R(25));
    _mn5q.premultiply(_mn5q2.setFromAxisAngle(_mn5ax.set(0, 1, 0), -pn));
    const z = _mn5v.set(0, 0, 1).applyQuaternion(_mn5q); tl = Math.atan2(-z.y, z.z);
    const x = _mn5v.set(1, 0, 0).applyQuaternion(_mn5q).applyAxisAngle(_mn5ax.set(1, 0, 0), -tl);
    rl = -mn5.gim.roll + mn5Norm(Math.atan2(x.y, x.x) + mn5.gim.roll);   /* ロールは ±180° を越えるので、望みの角度の近くへ巻き直す */
  }
  gp.tilt.rotation.x = clamp(tl, MN5_R(-135), MN5_R(80)); gp.roll.rotation.z = clamp(rl, MN5_R(-95), MN5_R(230)); gp.pan.rotation.y = pn;
  if (mn5.fold > 0.02 || mn5.foldTo > 0) { gp.tilt.rotation.x = 0; gp.roll.rotation.z = 0; gp.pan.rotation.y = 0; }
}
function mn5FpvSync() {
  const g = mn5.gim, set = (id, v) => { const el = $(id); if (el && el.textContent !== v) el.textContent = v; };
  set('#fpvPanLbl', 'ジンバル チルト / ロール');
  set('#fpvFov', `${Math.abs(g.zoom - 2) < 0.01 ? '48mm中望遠モード' : '24mm相当'}・縦${mn5VFov(g.zoom).toFixed(0)}°`);
  set('#fpvZoom', `${g.zoom.toFixed(1)}×`);
  for (const b of $$('#fpvLens [data-z]')) { const on = Math.abs(+b.dataset.z - g.zoom) < 0.01; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); }
  const r90 = $('#fpvRoll90'); if (r90) { const on = Math.abs(g.roll + MN5_R(90)) < 0.02; r90.classList.toggle('on', on); r90.setAttribute('aria-pressed', String(on)); }
}
// 機体のカメラの映像（fpv.js）から使う窓口。ズーム（4Kで1〜3倍）・48mm中望遠モード・ロール（−180°〜45°）
const MN5_GC = {
  st: mn5.gim, tilt0: -4, tiltMin: MN5_R(-90), tiltMax: MN5_R(55), seenKey: 'fpvSeenMn5',
  firstToast: '上下のドラッグでチルト（−90°〜55°）。ズーム・縦向き・ロールは下のボタンで。左右は機体ごと向きを変えます',
  dragToast: 'このジンバルは左右に振れません（パンは操作できない。機械的な範囲は ±25°・公式）。左右はスティックで機体ごと向きを変えます',
  person: () => mn5.person, personFpv: [0.12, -0.158, -6], personHome: [0.30, -0.158, 0.22],   /* 正面6m。24mmで全身、48mmで上半身が大きく写る距離 */
  eye: () => D.gimbalParts.lens.main, vfov: () => mn5VFov(mn5.gim.zoom),
  apply: () => mn5GimbalApply(), sync: () => mn5FpvSync(),
  hud: () => `${(mn5.gim.tilt * 180 / Math.PI).toFixed(0)}° / ${(mn5.gim.roll * 180 / Math.PI).toFixed(0)}°`,
  camHtml: `<div class="fpv-seg" id="fpvLens"><button data-z="1" style="--c:#ef6a2d">24mm</button><button data-z="2" style="--c:#3b7df7">48mm</button></div>
        <div class="fpv-seg"><button id="fpvZoomOut" aria-label="引く">−</button><b id="fpvZoom">1.0×</b><button id="fpvZoomIn" aria-label="寄る">＋</button></div>
        <div class="fpv-seg"><button id="fpvRollL" aria-label="左へ傾ける">↺</button><button id="fpvRoll90">縦向き</button><button id="fpvRollR" aria-label="右へ傾ける">↻</button></div>`,
  bind() {
    for (const b of $$('#fpvLens [data-z]')) b.addEventListener('click', () => mn5SetZoom(+b.dataset.z));
    const steps = [1, 1.5, 2, 2.5, 3];
    $('#fpvZoomIn').addEventListener('click', () => mn5SetZoom(steps.find(z => z > mn5.gim.zoom + 1e-6) || 3));
    $('#fpvZoomOut').addEventListener('click', () => mn5SetZoom([...steps].reverse().find(z => z < mn5.gim.zoom - 1e-6) || 1));
    const roll = (deg) => { mn5.gim.roll = clamp(mn5.gim.roll + MN5_R(deg), MN5_R(-180), MN5_R(45)); updateFpvHud(); };
    $('#fpvRollL').addEventListener('click', () => roll(-15)); $('#fpvRollR').addEventListener('click', () => roll(15));
    $('#fpvRoll90').addEventListener('click', () => { const r = mn5.gim.roll * 180 / Math.PI; mn5.gim.roll = MN5_R(Math.abs(r + 90) < 1 ? 0 : -90); updateFpvHud(); });
    if (!mn5._wheel) { mn5._wheel = true; canvas.addEventListener('wheel', e => { if (!fpv.on || !IS_MINI5) return; e.preventDefault(); mn5SetZoom(mn5.gim.zoom * Math.exp(-e.deltaY * 0.0022)); }, { passive: false }); }
  },
};

// ---------- 機体の置き方 ----------
// 着地すると前脚の先と電池の底の後ろの足で立ち、機首が上がる（約15°・写真から）。浮くと水平に戻る。
// 置いた角度は起動時に形から求める（前脚のいちばん低い点と電池の足のいちばん低い点が同じ高さになる角度）
function mn5RestInit() {
  const sg = D.sg; sg.userData.y0 = sg.position.y;
  const lowOf = (objs) => { let low = Infinity; for (const o of objs) low = Math.min(low, altLowest(o, 1)); return low; };
  const legs = D.legs.map(L => L.group), bat = [D.batPart.obj];
  const diff = (th) => { sg.rotation.set(th, 0, 0); sg.updateMatrixWorld(true); return lowOf(legs) - lowOf(bat); };
  let a = 0, b = MN5_R(30); for (let i = 0; i < 30; i++) { const m = (a + b) / 2; if (diff(m) < 0) a = m; else b = m; }
  const th = (a + b) / 2; sg.rotation.set(th, 0, 0); sg.updateMatrixWorld(true);
  mn5.rest.th = th; mn5.rest.dy = ALT_FLOOR - Math.min(lowOf(legs), lowOf(bat));
  sg.rotation.set(0, 0, 0); sg.position.y = sg.userData.y0; mn5._poseKey = '';
}
// 胴の姿勢を毎フレーム決める: 置いた傾き（w）＋手で持って傾ける（ジンバル・電池交換）＋畳んだ姿の高さ。変わったときだけ床までの距離を測る
// 床に近づきうる部品（胴・脚・モーターと羽根・電池・カメラの頭・カバー）だけの頂点で、いちばん低い高さを測る。胴全体を毎フレーム走査しない
const _mn5lv = new THREE.Vector3();
function mn5Lowest() {
  const sg = D.sg; sg.updateMatrixWorld(true); let low = Infinity;
  const scan = (o, stride) => o.traverseVisible(c => { if (!c.isMesh || (c.userData.noPart && c.parent !== D.protector)) return; const pos = c.geometry.attributes.position; if (!pos) return;
    for (let k = 0; k < pos.count; k += stride) { _mn5lv.fromBufferAttribute(pos, k).applyMatrix4(c.matrixWorld); if (_mn5lv.y < low) low = _mn5lv.y; } });
  const bodyP = D.parts.find(p => p.key === 'body'); if (bodyP) scan(bodyP.obj, 2);
  for (const L of D.legs) scan(L.group, 1);
  for (const mo of D.motors) { scan(mo.prop, 2); for (const c of mo.group.children) if (c !== mo.prop && !c.userData.noPart) scan(c, 6); }
  scan(D.batPart.obj, 2); scan(D.gimbalParts.head, 2); if (D.protector.visible) scan(D.protector, 1);
  return low;
}
function mn5ApplyPose(dt) {
  const sg = D.sg, R = mn5.rest, P = mn5.pose;
  const want = (mn5.fold > 0.0005 || mn5.foldTo > 0 || !!mn5.act || body.py > 0.003 || body.mode !== 'idle' || S.explode > 0.02 || mn5.senseOn) ? 0 : 1;   /* 電源が入って飛行デモ・操縦・場面で動いている間は水平（接地したままのホバリングでも機首を上げない） */   /* 検知範囲の図は水平で見せる */
  R.w += (want - R.w) * (1 - Math.exp(-dt / (body.py > 0.003 ? 0.25 : 0.35))); if (Math.abs(R.w - want) < 0.002) R.w = want;
  const ex = S.explode > 0.02, key = `${R.w.toFixed(4)},${P.lift.toFixed(4)},${P.px.toFixed(4)},${P.yaw.toFixed(4)},${P.rz.toFixed(4)},${mn5.fold.toFixed(4)},${ex}`;
  if (key === mn5._poseKey) return false; mn5._poseKey = key;
  sg.rotation.set(P.px + R.th * R.w, P.yaw, P.rz, 'YXZ');
  sg.position.y = sg.userData.y0 + R.dy * R.w + P.lift;
  if (mn5.fold > 0.0005 && !ex) sg.position.y += ALT_FLOOR - mn5Lowest();   /* 前アームを振り下ろすあいだ床を突き抜けない。畳んだ姿はいちばん低い所で床に置く（分解中は散らした部品で測らない） */
  else if (P.lift > 0 || P.px || P.rz) { const low = mn5Lowest(); if (low < ALT_FLOOR - 0.0005) sg.position.y += ALT_FLOOR - low; }
  return true;
}

// ---------- 毎フレーム ----------
const mn5Ease = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
function stepMn5(dt) {
  let dirty = false;
  if (S.explode > 0.02 && mn5.act) mn5Stop();   /* 動きの途中で分解したら動きを止める */
  if (S.explode > 0.02 && mn5.foldTo > 0) { mn5.foldTo = 0; syncMn5Chips(); if ($('#noteCard').dataset.kind === 'mn5-fold') renderNote(null); }   /* 畳んだ姿勢のまま部品を散らさない */
  { const sup = mn5.sizeOn || mn5.fovOn || mn5.senseOn || !!(mn5.act && mn5.act.id === 'gimbal'); if (sup !== mn5._sup) { mn5._sup = sup; S.labelsSuppressed = sup; } }
  // --- たたむ / 広げる ---
  if (mn5.foldTo > mn5.fold) {
    const spinning = D.motors.some(mo => mo.rpm > 30) || body.py > 0.003;
    if (!spinning) {
      let aligned = true;
      for (const mo of D.motors) { const tgt = Math.PI / 2 + Math.round((mo.angle - Math.PI / 2) / (Math.PI * 2)) * Math.PI * 2; const d = tgt - mo.angle; if (Math.abs(d) > 0.005) { aligned = false; mo.angle += d * (1 - Math.exp(-dt / 0.12)); } else mo.angle = tgt; mo.prop.rotation.y = mo.angle; }
      if (aligned || mn5.fold > 0) mn5.fold = Math.min(mn5.foldTo, mn5.fold + dt / 2.8);
      dirty = true;
    }
  } else if (mn5.foldTo < mn5.fold) { mn5.fold = Math.max(mn5.foldTo, mn5.fold - dt / 2.8); dirty = true; }
  if (mn5.fold !== mn5._last) {
    // 畳む: 羽根 → 前アーム（下の段）→ 後左 → 後右（ここで電源オフのカウントダウン）→ カバー。広げる: カバー → 後右（電源オン）→ 後左 → 前 → 羽根（取説の展開図の順）
    const f = mn5.fold, fb = mn5Ease(f / 0.22), ff = mn5Ease((f - 0.2) / 0.36), frL = mn5Ease((f - 0.52) / 0.3), frR = mn5Ease((f - 0.62) / 0.3);
    D.motors.forEach((mo, i) => {
      const F = D.folds[i];
      if (F.front) F.fg.quaternion.setFromAxisAngle(F.flip.axis, F.flip.sign * Math.PI * ff);   /* 下へ振り下ろして後ろへ。畳むと上下が逆さになる */
      else { const fr = F.sx > 0 ? frR : frL, yawT = Math.atan2(1, 0); F.fg.rotation.set(0, mn5Norm(yawT - F.yaw) * fr, 0); }   /* ほぼ垂直な軸で前へ回して胴の上の段に沿わせる */
      for (const h of mo.hinges) h.g.rotation.y = h.s * fb * Math.PI / 2;
    });
    D.protector.visible = f > 0.95;
    // 後方右アーム(M2)を開ききったら電源が入る / 畳み終えたら電源オフのカウントダウンが終わった状態に
    if (mn5.foldTo === 0 && !mn5.powered && frR < 0.02 && mn5._last > 0) setMn5Power(true, '後方右アームを開いて電源オン');
    if (mn5.foldTo === 1 && frR > 0.98 && mn5.powered && !mn5._countdown) { mn5._countdown = true; showToast('後方右アームを畳んだので、電源オフのカウントダウン', 2800); }
    if (mn5.foldTo === 1 && f >= 1 && mn5.powered) { setMn5Power(false); mn5._countdown = false; frameBox([-0.06, -0.16, -0.10], [0.06, -0.08, 0.10], [0.62, 0.42, -0.66], 1.2); }   /* 畳み終えたら畳んだ大きさに寄せ直す */
    if (mn5.foldTo === 0) mn5._countdown = false;
    if (f === 0 && mn5.foldTo === 0 && mn5.pendingPower) { mn5.pendingPower = false; setPower(0.5); }
    mn5._last = f; dirty = true;
  }
  // --- 動き ---
  const a = mn5.act;
  if (a) {
    a.t += dt; const t = a.t; dirty = true;
    if (a.id === 'battery' && a.p) {
      if (mn5.fold > 0.001) { a.t = 0; }   /* アームが開くまで待つ */
      else {
        const p = a.p; if (!p.anim) p.anim = { pos: new THREE.Vector3(), quat: new THREE.Quaternion() };
        if (t > 0.3 && mn5.powered) setMn5Power(false);
        mn5.pose.lift = 0.05 * mn5Ease(t / 0.8) * (1 - mn5Ease((t - 4.4) / 0.6));   /* 手に持って浮かせる（電池が後ろの足なので、置いたままでは抜けない） */
        let back = 0; const B = 0.105;
        if (t > 0.9 && t < 2.1) back = mn5Ease((t - 0.9) / 1.2) * B; else if (t >= 2.1 && t < 2.9) back = B; else if (t >= 2.9 && t < 4.1) back = B * (1 - mn5Ease((t - 2.9) / 1.2));
        p.anim.pos.set(0, -back * 0.1, back); D.bay.visible = back > 0.008;   /* 後ろへ（わずかに下へ）引き抜く。抜いている間は胴の下の受けが見える */
        const st = $('#mn5BatState'), msg = t < 0.9 ? '電源を切り、機体を手に持ちます' : t < 2.1 ? '左右のバックルを押しながら後ろへ引き抜きます' : t < 2.9 ? '充電済みのバッテリーに持ち替え' : t < 4.1 ? 'カチッと音がするまで差し込みます' : '電源ボタンを押してから長押しして起動しました'; if (st && st.textContent !== msg) st.textContent = msg;
        if (t > 4.2 && !mn5.powered) setMn5Power(true);
        if (t > 5.0) { p.anim = null; p.animReset = true; mn5.pose.lift = 0; mn5.act = null; D.bay.visible = false; syncMn5Chips(); }
      }
    }
    if (a.id === 'gimbal' && (mn5.fold > 0.02 || mn5.foldTo > 0)) { a.t = 0; const st = $('#mn5GimState'); if (st && st.textContent !== 'アームを開いています…') st.textContent = 'アームを開いています…'; }   /* アームが開くまで待つ */
    else if (a.id === 'gimbal') {
      // チルトは最大制御速度 100°/秒 を超えないように区切る（例: 55°→−90° の145°は1.8秒）。ロールの速さは公式に無いので同じくらいに
      const R = MN5_R, E = mn5Ease, T = [0.8, 0.5, 1.8, 0.4, 1.1, 1.1, 1.0, 1.1, 0.5, 2.4, 0.5, 0.9, 0.5, 5.0];
      let k = 0, u = t; while (k < T.length && u > T[k]) { u -= T[k]; k++; } const f = k < T.length ? u / T[k] : 1;
      let tilt = 0, roll = 0, msg = '';
      const P = mn5.pose; P.lift = 0; P.px = P.yaw = P.rz = 0;
      if (k === 0) { tilt = R(55) * E(f); msg = '上へ 55°（操作できる上限・見上げる構図）'; }
      else if (k === 1) { tilt = R(55); msg = '上へ 55°（操作できる上限・見上げる構図）'; }
      else if (k === 2) { tilt = R(55) + R(-145) * E(f); msg = '真下へ −90°（真上からの俯瞰）'; }
      else if (k === 3) { tilt = R(-90); msg = '真下へ −90°（真上からの俯瞰）'; }
      else if (k === 4) { tilt = R(-90) * (1 - E(f)); msg = '正面へもどす'; }
      else if (k === 5) { roll = R(-90) * E(f); msg = 'ロール −90°：縦向きの撮影（機体は水平のまま）'; }
      else if (k === 6) { roll = R(-90); msg = 'ロール −90°：縦向きの撮影（機体は水平のまま）'; }
      else if (k === 7) { roll = R(-90) + R(-90) * E(f); msg = 'ロール −180°：上下が逆さまの映像（操作できる下限）'; }
      else if (k === 8) { roll = R(-180); msg = 'ロール −180°：上下が逆さまの映像（操作できる下限）'; }
      else if (k === 9) { roll = R(-180) + R(225) * E(f); msg = '反対側は 45° まで。合わせて225°回る（公式）'; }
      else if (k === 10) { roll = R(45); msg = '反対側は 45° まで。合わせて225°回る（公式）'; }
      else if (k === 11) { roll = R(45) * (1 - E(f)); msg = '水平にもどす'; }
      else if (k === 12) { msg = '手に持って傾けても…'; P.lift = 0.05 * E(f); }
      else if (k === 13) { const w = Math.sin(Math.PI * Math.min(1, f * 1.15)), s1 = Math.sin(f * Math.PI * 4), s2 = Math.sin(f * Math.PI * 3 + 1.1), s3 = Math.sin(f * Math.PI * 2 + 0.4);
        P.lift = 0.05 * (1 - E((f - 0.85) / 0.15)); P.px = R(16) * s1 * w; P.yaw = R(10) * s3 * w; P.rz = R(18) * s2 * w; msg = 'カメラは水平と向きを保つ（チルト・ロール・パンの3軸で打ち消す）'; }
      if (k === 12 && u < 0.05 && !a.framed) { a.framed = true; frameBox([-0.12, -0.16, -0.14], [0.12, -0.02, 0.10], [0.40, 0.14, -0.90], 1.12); }   /* 胴ごと傾くので引いて見せる */
      mn5.gim.tilt = tilt; mn5.gim.roll = roll;
      const st = $('#mn5GimState'); if (st && msg && st.textContent !== msg) st.textContent = msg;
      if (k >= T.length) { mn5.gim.tilt = mn5.gim.roll = 0; Object.assign(P, { lift: 0, px: 0, yaw: 0, rz: 0 }); mn5.act = null; syncMn5Chips(); }
    }
  }
  if (mn5ApplyPose(dt)) dirty = true;
  if (dirty) S.shadowDirty = S.csDirty = S.aoDirty = true;
}

// ---------- 起動 ----------
function initMn5() {
  for (const b of $$('#mn5Chips [data-mn5]')) b.addEventListener('click', () => mn5Action(b.dataset.mn5));
  mn5.person = buildPerson(); mn5.person.position.set(0.30, -0.158, 0.22); mn5.person.visible = false; scene.add(mn5.person);
  mn5.ghost = pd6bQuadGhost(); mn5.ghost.position.set(-0.50, -0.158 + 0.156, -0.16); mn5.ghost.visible = false; scene.add(mn5.ghost);
  mn5RestInit(); mn5.rest.w = 1; mn5ApplyPose(0);
  setMn5Power(true);
  syncMn5Chips();
  focusOn([D.root], { pull: false, margin: 1.3 });   /* 550クラスよりずっと小さいので、最初の画を寄せる */
  const q = new URLSearchParams(location.search);
  if (!SHARE_KEYS.some(k => q.has(k))) setTimeout(() => { if (!$('#noteCard').dataset.kind) { renderMn5About(); mn5FrameDrone(null, 1.05); } }, 900);
}
