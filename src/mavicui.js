// ===== DJI Mavic 4 Pro の固有の動き =====
// たたむ（広げると後方右アームで電源オン）・電池交換・ジンバル（上向き70°・縦撮り・360°・傾きの打ち消し）・3眼の持ち替えと絞り・検知範囲・大きさ
// ジンバルの数値は公式の仕様: 操作可能範囲 チルト −90°〜70°・ロール −40°〜400°、最大制御速度 100°/秒、機械的可動範囲 パン ±22°。
const MV_R = THREE.MathUtils.degToRad;
const MV_LENS = {
  main: { key: 'camMain', mm: 28, z0: 1, z1: 2.5, fov: 72, name: 'Hasselblad', sensor: '4/3型・1億画素', ap: 'f/2.0〜f/11', focus: '2 m〜∞', col: '#ef6a2d' },
  mid: { key: 'camMid', mm: 70, z0: 2.5, z1: 6, fov: 35, name: '中望遠', sensor: '1/1.3インチ・4800万画素', ap: 'f/2.8', focus: '3 m〜∞', col: '#3b7df7' },
  tele: { key: 'camTele', mm: 168, z0: 6, z1: 24, fov: 15, name: '望遠', sensor: '1/1.5インチ・5000万画素', ap: 'f/2.8', focus: '3 m〜∞', col: '#22c55e' },
};
const MV_FSTOPS = [2, 2.8, 4, 5.6, 8, 11];
const mav = { gim: { tilt: 0, roll: 0, zoom: 1, all: true, fstop: 2, iris: 2 }, fold: 0, foldTo: 0, act: null, powered: true, fovOn: false, senseOn: false, sizeOn: false, person: null, ghost: null, pendingPower: false, _sup: false, _last: -1 };

// ---------- 状態の問い合わせ ----------
function mavicBusy() { return IS_MAVIC && (mav.foldTo > 0 || mav.fold > 0.001 || !!mav.act || mav.sizeOn || mav.fovOn || mav.senseOn); }
function mavicWide() { return mav.sizeOn || mav.fovOn || mav.senseOn; }
function mavicShadowExtra() { return mav.sizeOn ? 1.1 : 0; }
function mavicBlockPower() {
  if (!IS_MAVIC) return false;
  if (mav.act) { mavicStop(); return false; }
  if (mav.fold > 0.001 || mav.foldTo > 0) { mav.foldTo = 0; mav.pendingPower = true; syncMvChips(); if ($('#noteCard').dataset.kind === 'mavic-fold') renderNote(null); showToast('アームを広げてから回します'); frameBox([-0.32, -0.16, -0.26], [0.32, 0.03, 0.27], [0.62, 0.42, -0.66], 1.12); return true; }
  if (!mav.powered) { setMvPower(true, '電源を入れました'); }
  return false;
}
function mavicOnTab(tab) {
  if (!IS_MAVIC) return;
  if (tab !== 'fly') mav.pendingPower = false;   /* 「とばす」で押した電源を、ほかのタブで広げ終えたときに回さない */
  if (tab !== 'see') { const had = !!mav.act; mavicStop(); mvOverlays(null, true); if (($('#noteCard').dataset.kind || '').startsWith('mavic-')) renderNote(null); if (had) focusOn([D.root], { pull: true }); }   /* 寄った画のまま「とばす」へ行かない */
  if (tab === 'fly' && (mav.foldTo > 0 || mav.fold > 0.001)) { mav.foldTo = 0; syncMvChips(); showToast('アームを広げました'); frameBox([-0.32, -0.16, -0.26], [0.32, 0.03, 0.27], [0.62, 0.42, -0.66], 1.12); }   /* 畳んだ大きさに寄った画のまま広げない */
}

// ---------- 動きの入口 ----------
function mavicAction(id) {
  if (!IS_MAVIC) return;
  if (S.tab !== 'see') setTab('see');
  if (id === 'about') { if (mav.act) mavicStop(); mvOverlays(null, true); renderMvAbout(); mvFrameDrone(null, 1.05); return; }   /* 説明だけを見せる。前の重ね絵を残さない */
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
    mav.act = { id, t: 0 }; mav.gim.tilt = mav.gim.roll = 0; renderMvNote('gimbal'); syncMvChips();
    const g = D.gimbalParts.head; g.updateWorldMatrix(true, false); const c = new THREE.Vector3().setFromMatrixPosition(g.matrixWorld);
    mvFrameBox([c.x - 0.085, c.y - 0.05, c.z - 0.035], [c.x + 0.085, c.y + 0.07, c.z + 0.09], [0.30, 0.14, -0.94], 1.08); return;   /* ほぼ正面のやや上から、カメラの頭を主役に（斜め横からだと前アームが視線をふさぐ） */
  }
}
function mavicStop() {
  if (!IS_MAVIC || !mav.act) return;
  const a = mav.act; mav.act = null;
  if (a.id === 'battery' && a.p) { a.p.anim = null; a.p.animReset = true; if (!mav.powered) setMvPower(true); }
  if (a.id === 'gimbal') { mav.gim.tilt = 0; mav.gim.roll = 0; mvSway(0, 0, 0, 0); }
  syncBodyMode(); syncMvChips();
  if ($('#noteCard').dataset.kind === 'mavic-' + a.id) renderNote(null);
  if (a.id === 'gimbal' || a.id === 'battery') focusOn([D.root], { pull: true });
}
// 画角・検知範囲・大きさは「重ね絵」。同時には1つだけ
function mvOverlays(id, quiet) {
  const was = { fov: mav.fovOn, sense: mav.senseOn, size: mav.sizeOn };
  mav.fovOn = id === 'fov'; mav.senseOn = id === 'sense'; mav.sizeOn = id === 'size';
  D.fovG.visible = mav.fovOn; D.senseG.visible = mav.senseOn; mvSyncLens();
  if (mav.person) mav.person.visible = mav.sizeOn; if (mav.ghost) mav.ghost.visible = mav.sizeOn;
  S.shadowDirty = S.csDirty = S.aoDirty = true; syncMvChips();
  if (!id && !fpv.on) { const sup = !!(mav.act && mav.act.id === 'gimbal'); mav._sup = sup; S.labelsSuppressed = sup; }   /* ラベルの抑えをその場で戻す（次のコマを待つと「眼」が古い値を控える） */
  if (id) {
    if (S.explode > 0.02) setExplode(0); if (S.power > 0) setPower(0, true); if (mav.foldTo > 0 || mav.fold > 0.001) mav.foldTo = 0;
    if (id === 'fov') { mav.gim.all = true; mvSyncLens(); }
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
const mvFrameBox = (min, max, dir, margin) => frameBox(min, max, dir, margin);
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
    <ul class="pd-diff"><li><b>折りたたみ</b>：前アームは下から後ろへ、後アームは上の段で前へ畳み、約5分の1の体積に。後方右アームを開くと電源が入る</li><li><b>高さの違う前後のモーター</b>：後ろのモーターは胴より高く、前は長い脚で立つ</li><li><b>カメラが3つ</b>：28・70・168mm相当を持ち替える。ジンバルが縦向き撮影にも回る。「眼」ボタンでカメラの映像を見られる</li><li><b>周りを見る</b>：魚眼センサーとLiDARで、ぶつかる前に止まる・避ける</li><li><b>部品が一体</b>：フレーム・ESC・受信機が胴の中にまとまり、配線や基板は外から見えない</li></ul>
    <p class="caveat">この3Dモデルは、公式の仕様・取扱説明書と写真から起こした教材用の再現です。形は公式の真上・正面・斜めの製品写真と取説の図から寸法を読み取って起こしました。胴の断面の細かな形・センサーの一部の配置・ジンバルの軸の順番・内部の配置は推定を含みます（解説の「推定」「例」）。</p>
    <details class="pd-src"><summary>出典（${MAVIC_DATE}）</summary><ul>${['specs', 'product', 'manual', 'prop', 'review'].map(k => `<li>${MV_SRC_LINK(k)}</li>`).join('')}</ul></details>`;
  renderNote({ kind: 'mavic-about', title: 'DJI Mavic 4 Pro', html, actions: [{ label: 'たたんでみる', fn: () => mavicAction('fold') }, { label: '3眼のカメラを見る', fn: () => { renderNote(null); mavicAction('fov'); } }] });
}
function renderMvNote(id) {
  const N = {
    fold: () => ({ title: mav.foldTo > 0 ? 'アームをたたむ' : 'アームを広げる', html: mav.foldTo > 0
      ? `<p>羽根を寄せ、<b>前アームを下へ振り下ろして後ろへ</b>回します（畳むとモーターが下・脚が上になり、胴の後ろの角に収まる）。最後に<b>後アームを前へ</b>回し、胴の上の段に重ねます。折りたたむと 257.6 × 124.8 × 103.4 mm（公式）。</p><p>アームを畳んでも、初期設定では電源は切れません（アーム折りたたみによる電源オフは初期設定で無効・取説）。この図では畳み終えたら電源ボタンで切った状態にします。</p><p class="caveat">回し方は取説の展開図と製品写真から起こしたものです。この図は胴のくぼみを作っていないので、畳んだ幅が実機より少し大きくなります。</p>`
      : `<p>まず後アームを後ろへ開きます。<b>後方右アームを開くと、電源ボタンを押さなくても電源が入ります</b>（アーム展開による電源オン・初期設定で有効・取説）。続いて前アームを下から前へ振り上げて開きます。フロントLEDが緑に点き、機首の向きを示します。</p><p class="caveat">USB-Cポートを使っている間は、アームを開いても電源は入りません（取説）。順番は取説の展開図から。</p>`,
      actions: [{ label: mav.foldTo > 0 ? '広げる' : 'たたむ', primary: true, fn: () => mavicAction('fold') }] }),
    battery: () => ({ title: 'バッテリーを入れ替える', html: `<p id="mvBatState" class="pd-state">電源を切っています…</p><p>電源を切り、左右のバックルを押して、胴の下半分のバッテリーを後ろへ引き抜きます。差し込むときはカチッと音がするまで（取説）。</p><p><b>抜き差しの前に前アームを展開する</b>のが決まりです。前向きLiDARを傷めないため（取説）。</p><p class="caveat">バッテリーの位置と抜く向きは製品写真と取説の背面図から。バックルの形は図の例です。</p>`, actions: [{ label: 'もう一度', fn: () => mavicAction('battery') }], onClose: () => { mavicStop(); focusOn([D.root], { pull: true }); } }),
    gimbal: () => ({ title: 'インフィニティジンバル', html: `<p id="mvGimState" class="pd-state">上へ向けます…</p><p>カメラの頭は、機首の下の付け根から右側面へ回る腕に、横向きのモーター（チルト）で吊られています。前面はさらに光軸のまわりに回り（ロール）、<b>機体を傾けずに縦向きの撮影や、傾いた構図（ダッチアングル）</b>が撮れます。上は70°まで向けられます（公式）。</p><table class="pd-spec"><tr><th>操作できる範囲</th><td>チルト −90°〜70°・ロール −40°〜400°<small>公式</small></td></tr><tr><th>最大制御速度</th><td>チルト・ロールとも 100°/秒<small>公式</small></td></tr><tr><th>ぶれの範囲</th><td>ホバリング（無風）±0.001°<small>公式</small></td></tr></table><p class="caveat">機械的にはロール −90°〜450°・チルト −164°〜160°・パン ±22°（公式）。パンは操作できず、揺れの打ち消しに使います。回る範囲は軸の角度・風・速さで変わります（公式の注記）。腕の形と軸の順番は写真からの推定です。</p>`, actions: [{ label: 'もう一度', fn: () => mavicAction('gimbal') }, { label: 'カメラから見る', fn: () => mvCamView() }], onClose: () => { mavicStop(); focusOn([D.root], { pull: true }); } }),
    fov: () => mvCamNote(),
    sense: () => ({ title: '検知範囲', html: `<p>魚眼センサーで全方向の障害物を見て、ぶつかる前に止まる・避けます。暗い夜は前向きLiDARが前を測ります（公式）。</p><table class="pd-spec"><tr><th>ビジョン</th><td>前 24・後 22・横 21・上 18・下 17 m<small>いずれも 0.5 m から・公式</small></td></tr><tr><th>LiDAR</th><td>夜間 0.5〜25 m・視野 60°<small>公式</small></td></tr><tr><th>下向き赤外線</th><td>0.3〜8 m<small>公式</small></td></tr></table><p class="caveat">図は測定範囲を約45分の1に縮めた概念図です（下向きのドームと赤外線の線はさらに縮めています）。スポーツモードではビジョンシステムが働かず、細い電線や枝は見分けにくい（取説）。</p>`, actions: [{ label: 'もどす', fn: () => mvOverlays(null) }], onClose: () => mvOverlays(null) }),
    size: () => ({ title: '大きさをくらべる', html: `<p>同じ縮尺で、<b>身長170cmの人</b>と、青い半透明の<b>550クラスのクアッド</b>（対角550mm・約2.4kg）を並べています。</p><p>Mavic 4 Proは展開時 328.7 × 390.5 mm（プロペラなし・公式）、離陸重量は約1063g。折りたためば 257.6 × 124.8 mm で、カメラバッグに入る大きさです。</p>`, actions: [{ label: 'もどす', fn: () => mvOverlays(null) }], onClose: () => mvOverlays(null) }),
  };
  renderNote(Object.assign({ kind: 'mavic-' + id }, N[id]()));
  if (id === 'fov') $('#noteBody').onclick = mvCamClick;
}
// 3眼の持ち替え・絞り。ボタンはカードの中に置き、委譲で受ける
function mvCamNote() {
  const g = mav.gim, L = mvLensOf(g.zoom), k = mvLensKey(g.zoom);
  const lensBtn = (key) => { const l = MV_LENS[key], on = !g.all && k === key; return `<button class="mv-seg${on ? ' on' : ''}" data-mvlens="${key}" aria-pressed="${on}" style="--c:${l.col}">${l.mm}mm</button>`; };
  const fBtn = (f) => `<button class="mv-seg${g.fstop === f ? ' on' : ''}" data-mvf="${f}" aria-pressed="${g.fstop === f}">f/${f.toFixed(f % 1 ? 1 : 0).replace(/^2$/, '2.0')}</button>`;
  const body = g.all
    ? `<p>同じ場所から撮っても、写る範囲がこれだけ違います（画角・公式）。レンズを選ぶと、そのカメラだけを光らせます。</p><ul class="pd-diff"><li><b style="color:#ef6a2d">28mm 相当</b>（Hasselblad・4/3型）：72°</li><li><b style="color:#3b7df7">70mm 相当</b>（中望遠・1/1.3インチ）：35°</li><li><b style="color:#22c55e">168mm 相当</b>（望遠・1/1.5インチ）：15°</li></ul>`
    : `<table class="pd-spec"><tr><th>カメラ</th><td><b style="color:${L.col}">${L.name}</b>・${L.mm}mm 相当<small>${L.sensor}・公式</small></td></tr><tr><th>画角</th><td>${L.fov}°<small>公式</small></td></tr><tr><th>絞り</th><td>${L.ap}<small>公式</small></td></tr><tr><th>ズーム</th><td>${L.z0}〜${L.z1}倍<small>この範囲はこのカメラで寄る・公式</small></td></tr><tr><th>ピント</th><td>${L.focus}<small>公式</small></td></tr></table>`
      + (k === 'main' ? `<p class="mv-row-label">絞り（Hasselbladのみ変えられる）</p><div class="mv-segs">${MV_FSTOPS.map(fBtn).join('')}</div><p class="caveat">ガラス越しに開口が狭まるのが見えます。絞るほど光は減り、ピントの合う奥行きが深くなります。公式は絞ると街灯などが10本の光条になると紹介しています。羽根の枚数と形はこの図では描いていません。</p>` : `<p>${k === 'tele' ? '168mm相当は、主カメラのおよそ5分の1の幅を切り取ります。近づかずに大きく写せるぶん、わずかな揺れも大きく写るので、望遠向けにジンバルの制御を最適化しています（公式）。' : '70mm相当は、人や建物を背景から引き離して撮る中望遠。主カメラの2.5倍の位置です（公式のズーム区分）。'}</p>`);
  return { title: '3眼のカメラ', html: `<div class="mv-segs" role="group" aria-label="カメラを選ぶ">${lensBtn('main')}${lensBtn('mid')}${lensBtn('tele')}<button class="mv-seg${g.all ? ' on' : ''}" data-mvlens="all" aria-pressed="${g.all}">3つとも</button></div>${body}<p class="caveat">錐は公式の画角を対角として4:3の枠で描いています。錐の長さは見やすさのための長さで、距離の意味はありません。レンズの並びは公式の写真とセンサー図から。</p>`,
    actions: [{ label: 'カメラから見る', primary: true, fn: () => mvCamView() }, { label: 'もどす', fn: () => mvOverlays(null) }], onClose: () => mvOverlays(null) };
}
function mvCamClick(e) {
  const b = e.target.closest('[data-mvlens],[data-mvf]'); if (!b) return;
  const g = mav.gim;
  if (b.dataset.mvlens) { const k = b.dataset.mvlens; if (k === 'all') g.all = true; else { g.all = false; g.zoom = MV_LENS[k].z0; } }
  if (b.dataset.mvf) g.fstop = +b.dataset.mvf;
  mvSyncLens(); renderMvNote('fov');
}
// 「カメラから見る」: 選んでいるレンズのまま、機体のカメラの映像に入る
function mvCamView() { if (mav.gim.all) mav.gim.zoom = 1; mav.gim.all = true; renderNote(null); mvOverlays(null, true); segSet($('#viewCol'), 'v', 'fpv'); fpvOn(true); }

// ---------- ジンバルとレンズ ----------
const mvLensKey = (z) => z < 2.5 - 1e-6 ? 'main' : z < 6 - 1e-6 ? 'mid' : 'tele';
const mvLensOf = (z) => MV_LENS[mvLensKey(z)];
// 縦の画角(度)。公式の画角を4:3の対角とみなし、そのレンズの倍率からさらにデジタルで寄せる
function mvVFov(z) { const L = mvLensOf(z); return 2 * Math.atan(Math.tan(MV_R(L.fov / 2)) * 0.6 / (z / L.z0)) * 180 / Math.PI; }
function mvSetZoom(z) { mav.gim.zoom = clamp(z, 1, 24); mvSyncLens(); if (fpv.on) updateFpvHud(); }
function mvSyncLens() {
  const gp = D.gimbalParts; if (!gp) return;
  const k = mvLensKey(mav.gim.zoom), all = mav.gim.all, cones = D.fovG.userData.cones;
  for (const key of ['main', 'mid', 'tele']) { gp.lens[key].userData.glow.visible = mav.fovOn && !all && key === k; cones[key].visible = all || key === k; }
  S.aoDirty = true;
}
// 毎フレーム（本体の姿勢を当てた後）。電源が入っていれば、機体の傾きを3軸で打ち消して、望みの向きを保つ。
// 機体の傾きを親(付け根)の世界姿勢から読み、チルトとロールから引く。ヨーは機首に追随し、揺れの分だけパン(±22°)で消す
const _mq = new THREE.Quaternion(), _mq2 = new THREE.Quaternion(), _me = new THREE.Euler(), _me2 = new THREE.Euler(), _mvv = new THREE.Vector3(), _mvax = new THREE.Vector3();
function mvGimbalApply() {
  const gp = D.gimbalParts; if (!gp) return;
  let tl = mav.gim.tilt, rz = -mav.gim.roll, pn = 0;   /* rz はロール軸(Z)の回転。望みのロール(＋で縦向き側)と逆向きに回す */
  if (mav.powered && !(fpv.on && !fpv.stabilized)) {
    // 望みの世界姿勢（機首の方位・指定のチルト・指定のロール）を付け根の世界姿勢で割って局所の回転にする。
    // オイラー分解はチルト ±90°（真下）が特異点なので使わず、パンは光軸の水平成分、続いてチルト、ロールの順に取り出す（mini5ui.js と同じ）
    gp.pan.parent.updateWorldMatrix(true, false); gp.pan.parent.getWorldQuaternion(_mq);
    D.root.getWorldQuaternion(_mq2); _me2.setFromQuaternion(_mq2, 'YXZ');
    _mq2.setFromEuler(_me.set(mav.gim.tilt, _me2.y, -mav.gim.roll, 'YXZ'));
    _mq.invert().multiply(_mq2);
    const f = _mvv.set(0, 0, 1).applyQuaternion(_mq), h = Math.hypot(f.x, f.z);
    let p = h < 1e-6 ? 0 : Math.atan2(f.x, f.z); if (Math.abs(p) > Math.PI / 2) p = mvNorm(p - Math.PI);
    pn = clamp(p * Math.min(1, h / 0.1), -MV_R(22), MV_R(22));
    _mq.premultiply(_mq2.setFromAxisAngle(_mvax.set(0, 1, 0), -pn));
    const z = _mvv.set(0, 0, 1).applyQuaternion(_mq); tl = Math.atan2(-z.y, z.z);
    const x = _mvv.set(1, 0, 0).applyQuaternion(_mq).applyAxisAngle(_mvax.set(1, 0, 0), -tl);
    rz = -mav.gim.roll + mvNorm(Math.atan2(x.y, x.x) + mav.gim.roll);   /* ロールは ±180° を越えるので、望みの角度の近くへ巻き直す */
  }
  gp.tilt.rotation.x = clamp(tl, MV_R(-164), MV_R(160)); gp.roll.rotation.z = -clamp(-rz, MV_R(-90), MV_R(450)); gp.pan.rotation.y = pn;
}
// 機体のカメラの映像（fpv.js）の表示をMavicの中身にする
function mvFpvSync() {
  const g = mav.gim, k = mvLensKey(g.zoom), L = MV_LENS[k], set = (id, v) => { const el = $(id); if (el && el.textContent !== v) el.textContent = v; };
  set('#fpvPanLbl', 'ジンバル チルト / ロール');
  set('#fpvFov', `${L.mm}mm相当（${L.name}）・縦${mvVFov(g.zoom).toFixed(g.zoom > 6 ? 1 : 0)}°`);
  set('#fpvZoom', `${g.zoom < 10 ? g.zoom.toFixed(1) : g.zoom.toFixed(0)}×`);
  for (const b of $$('#fpvLens [data-z]')) { const on = mvLensKey(+b.dataset.z) === k; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); }
  const r90 = $('#fpvRoll90'); if (r90) { const on = Math.abs(g.roll - MV_R(90)) < 0.02; r90.classList.toggle('on', on); r90.setAttribute('aria-pressed', String(on)); }
}
// 機体のカメラの映像（fpv.js）から使う窓口。レンズの持ち替え・ズーム・ロール（−40°〜400°）。ズームはレンズの区切り(2.5×・6×)で自動で持ち替わる
const MV_GC = {
  st: mav.gim, tilt0: -4, tiltMin: MV_R(-90), tiltMax: MV_R(70), seenKey: 'fpvSeenMv',
  firstToast: '上下のドラッグでチルト（−90°〜70°）。レンズ・ズーム・ロールは下のボタンで。左右は機体ごと向きを変えます',
  dragToast: 'このジンバルは左右に振れません（パン ±22°は揺れの打ち消し専用・公式）。左右はスティックで機体ごと向きを変えます',
  person: () => mav.person, personFpv: [0.12, -0.158, -12], personHome: [0.40, -0.158, 0.30],   /* 正面12m。28mmでは小さく、168mmでは画面いっぱいになる距離 */
  eye: () => D.gimbalParts.lens[mvLensKey(mav.gim.zoom)], vfov: () => mvVFov(mav.gim.zoom),
  apply: () => mvGimbalApply(), sync: () => mvFpvSync(),
  hud: () => `${(mav.gim.tilt * 180 / Math.PI).toFixed(0)}° / ${(mav.gim.roll * 180 / Math.PI).toFixed(0)}°`,
  camHtml: `<div class="fpv-seg" id="fpvLens"><button data-z="1" style="--c:#ef6a2d">28mm</button><button data-z="2.5" style="--c:#3b7df7">70mm</button><button data-z="6" style="--c:#22c55e">168mm</button></div>
        <div class="fpv-seg"><button id="fpvZoomOut" aria-label="引く">−</button><b id="fpvZoom">1.0×</b><button id="fpvZoomIn" aria-label="寄る">＋</button></div>
        <div class="fpv-seg"><button id="fpvRollL" aria-label="左へ傾ける">↺</button><button id="fpvRoll90">縦撮り</button><button id="fpvRollR" aria-label="右へ傾ける">↻</button></div>`,
  bind() {
    for (const b of $$('#fpvLens [data-z]')) b.addEventListener('click', () => mvSetZoom(+b.dataset.z));
    const steps = [1, 1.5, 2, 2.5, 3, 4, 6, 8, 12, 16, 24];
    $('#fpvZoomIn').addEventListener('click', () => mvSetZoom(steps.find(z => z > mav.gim.zoom + 1e-6) || 24));
    $('#fpvZoomOut').addEventListener('click', () => mvSetZoom([...steps].reverse().find(z => z < mav.gim.zoom - 1e-6) || 1));
    const roll = (deg) => { mav.gim.roll = clamp(mav.gim.roll + MV_R(deg), MV_R(-40), MV_R(400)); updateFpvHud(); };
    $('#fpvRollL').addEventListener('click', () => roll(-15)); $('#fpvRollR').addEventListener('click', () => roll(15));
    $('#fpvRoll90').addEventListener('click', () => { const r = mav.gim.roll * 180 / Math.PI; mav.gim.roll = MV_R(Math.abs(r - 90) < 1 ? 0 : 90); updateFpvHud(); });
    canvas.addEventListener('wheel', e => { if (!fpv.on) return; e.preventDefault(); mvSetZoom(mav.gim.zoom * Math.exp(-e.deltaY * 0.0022)); }, { passive: false });
  },
};
// 手で持って傾ける（ジンバルの打ち消しを見せる）。胴を床から浮かせてから回す
function mvSway(lift, px, yaw, rz) { const sg = D.sg; if (sg.userData.y0 == null) sg.userData.y0 = sg.position.y; sg.position.y = sg.userData.y0 + lift; sg.rotation.set(px, yaw, rz, 'YXZ'); altLiftAboveFloor(sg); }

// ---------- 毎フレーム ----------
const mvEase = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const mvNorm = (a) => Math.atan2(Math.sin(a), Math.cos(a));
function stepMavic(dt) {
  let dirty = false;
  if (S.explode > 0.02 && mav.act) mavicStop();   /* 動きの途中で分解したら動きを止める（胴が浮いたまま揺れが続かない） */
  if (S.explode > 0.02 && mav.foldTo > 0) { mav.foldTo = 0; syncMvChips(); if ($('#noteCard').dataset.kind === 'mavic-fold') renderNote(null); }   /* 畳んだ姿勢のまま部品を散らさない */
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
    const f = mav.fold, fb = mvEase(f / 0.3), ff = mvEase((f - 0.25) / 0.4), fr = mvEase((f - 0.6) / 0.4);   /* 畳む: 羽根→前アーム(下の段)→後アーム(上の段) / 広げる: 後ろ→前→羽根（取説の展開順） */
    D.motors.forEach((mo, i) => {
      const F = D.folds[i];
      if (F.front) F.fg.quaternion.setFromAxisAngle(F.flip.axis, F.flip.sign * Math.PI * ff);   /* 下へ振り下ろして後ろへ。畳むと上下が逆さになる */
      else { const yawT = Math.atan2(1, F.sx * 0.06); F.fg.rotation.set(0, mvNorm(yawT - F.yaw) * fr, -F.rise * 1.15 * fr); }   /* 前へ回して胴の上の段に寝かせる */
      for (const h of mo.hinges) h.g.rotation.y = h.s * fb * Math.PI / 2;
    });
    // 後方右アーム(M2)を開ききったら電源が入る / 畳み終えたら電源を切った状態に
    const rr = fr;
    if (mav.foldTo === 0 && !mav.powered && rr < 0.02 && !mav.act) setMvPower(true, '後方右アームを開いて電源オン');
    if (mav.foldTo === 1 && f >= 1 && mav.powered) { setMvPower(false, '電源ボタンで電源を切りました'); mvFrameBox([-0.09, -0.16, -0.16], [0.09, -0.04, 0.14], [0.62, 0.42, -0.66], 1.15); }   /* 畳み終えたら畳んだ大きさに寄せ直す */
    if (f === 0 && mav.foldTo === 0 && mav.pendingPower) { mav.pendingPower = false; setPower(0.5); }
    { const sg = D.sg; if (sg.userData.y0 == null) sg.userData.y0 = sg.position.y; sg.position.y = sg.userData.y0; if (f > 0.0005) sg.position.y += ALT_FLOOR - altLowest(sg); }   /* 前アームを振り下ろすあいだ床を突き抜けない。畳んだ姿はいちばん低い所で床に置く */
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
        p.anim.pos.set(0, 0, back);   /* 胴の上側と底の板の間を、まっすぐ後ろへ */
        const st = $('#mvBatState'); if (st) st.textContent = t < 0.8 ? '電源を切りました' : t < 2.0 ? 'バックルを押して後ろへ引き抜きます' : t < 2.8 ? '充電済みのバッテリーに持ち替え' : t < 4.0 ? 'カチッと音がするまで差し込みます' : '電源ボタンを押して起動しました';
        if (t > 4.2 && !mav.powered) setMvPower(true);
        if (t > 4.6) { p.anim = null; p.animReset = true; mav.act = null; syncMvChips(); }
      }
    }
    if (a.id === 'gimbal') {
      // 速さは最大制御速度 100°/秒 を超えないように区切る（例: 70°→−90° の160°は2秒）
      const R = MV_R, E = mvEase, T = [0.9, 0.5, 2.0, 0.4, 1.1, 1.0, 0.8, 3.6, 4.4, 0.4, 5.0];   // 各区間の長さ(秒)
      let k = 0, u = t; while (k < T.length && u > T[k]) { u -= T[k]; k++; } const f = k < T.length ? u / T[k] : 1;
      let tilt = 0, roll = 0, msg = '', sway = [0, 0, 0, 0];
      if (k === 0) { tilt = R(70) * E(f); msg = '上へ 70°（操作できる上限・見上げる構図）'; }
      else if (k === 1) { tilt = R(70); msg = '上へ 70°（操作できる上限・見上げる構図）'; }
      else if (k === 2) { tilt = R(70) + R(-160) * E(f); msg = '真下へ −90°（真上からの俯瞰）'; }
      else if (k === 3) { tilt = R(-90); msg = '真下へ −90°（真上からの俯瞰）'; }
      else if (k === 4) { tilt = R(-90) * (1 - E(f)); msg = '正面へもどす'; }
      else if (k === 5) { roll = R(90) * E(f); msg = 'ロール 90°：縦向きの撮影（機体は水平のまま）'; }
      else if (k === 6) { roll = R(90); msg = 'ロール 90°：縦向きの撮影（機体は水平のまま）'; }
      else if (k === 7) { roll = R(90) + R(310) * E(f); msg = 'ロールを 400° まで：映像がぐるりと回る（操作できる上限）'; }
      else if (k === 8) { roll = R(400) * (1 - E(f)); msg = '無限には回らない。−40°〜400°の中で巻き戻す'; }
      else if (k === 9) { msg = '手に持って傾けても…'; sway = [0.05 * E(f), 0, 0, 0]; }
      else if (k === 10) { const w = Math.sin(Math.PI * Math.min(1, f * 1.15)), s1 = Math.sin(f * Math.PI * 4), s2 = Math.sin(f * Math.PI * 3 + 1.1), s3 = Math.sin(f * Math.PI * 2 + 0.4);
        sway = [0.05 * (1 - E((f - 0.85) / 0.15)), R(16) * s1 * w, R(14) * s3 * w, R(18) * s2 * w]; msg = 'カメラは水平と向きを保つ（チルト・ロール・パンの3軸で打ち消す）'; }
      if (k === 9 && u < 0.05 && !a.framed) { a.framed = true; mvFrameBox([-0.20, -0.16, -0.24], [0.20, 0.04, 0.16], [0.36, 0.10, -0.93], 1.1); }   /* 胴ごと傾くので引いて見せる */
      mav.gim.tilt = tilt; mav.gim.roll = roll; mvSway(...sway);
      const st = $('#mvGimState'); if (st && msg && st.textContent !== msg) st.textContent = msg;
      if (k >= T.length) { mav.gim.tilt = mav.gim.roll = 0; mvSway(0, 0, 0, 0); mav.act = null; syncMvChips(); }
    }
  }
  // 絞りの開閉（開口の直径は f値に反比例）
  { const g = mav.gim; if (Math.abs(g.iris - g.fstop) > 0.005) { g.iris += (g.fstop - g.iris) * (1 - Math.exp(-dt / 0.18)); if (Math.abs(g.iris - g.fstop) < 0.01) g.iris = g.fstop;
      const ir = D.gimbalParts.iris, R0 = ir.userData.r; ir.geometry.dispose(); ir.geometry = new THREE.RingGeometry(Math.max(0.0008, R0 * 0.93 * 2 / g.iris), R0, 48).rotateY(Math.PI); dirty = true; } }
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
  if (!SHARE_KEYS.some(k => q.has(k))) setTimeout(() => { if (!$('#noteCard').dataset.kind) { renderMvAbout(); mvFrameDrone(null, 1.05); } }, 900);
}
