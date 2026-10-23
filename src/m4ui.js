// ===== DJI Matrice 4 シリーズ（4T／4E）の固有の動き =====
// 4T/4E の切り替え・たたむ・電池交換・ジンバル・カメラの画角・レーザー距離計・検知範囲・アクセサリー（スポットライト／スピーカー）・大きさ
// ジンバルの数値は公式の仕様: 操作できるチルト 4T −90°〜70°／4E −90°〜35°、パンは操作不可、最大制御速度 100°/秒、
// 機械的な範囲 チルト 4T −140°〜113°・4E −140°〜50°、ロール ±52°、パン ±65°。
const M4_R = THREE.MathUtils.degToRad;
// ズームの倍率は 24mm を1倍とする（中望遠は 70/24≒2.9倍、望遠は 168/24=7倍。望遠のデジタル16倍で 112倍ハイブリッド・公式）
const M4_LENS = {
  wide: { lens: { t: 'wideT', e: 'wideE' }, mm: 24, z0: 1, z1: 70 / 24, fov: { t: 82, e: 84 }, name: '広角', sensor: { t: '1/1.3インチ・4800万画素', e: '4/3型・2000万画素・メカシャッター' }, ap: { t: 'f/1.7', e: 'f/2.8〜f/11' }, focus: '1 m〜∞', col: '#ef6a2d' },
  mid: { lens: 'mid', mm: 70, z0: 70 / 24, z1: 7, fov: 35, name: '中望遠', sensor: '1/1.3インチ・4800万画素', ap: 'f/2.8', focus: '3 m〜∞', col: '#3b7df7' },
  tele: { lens: 'tele', mm: 168, z0: 7, z1: 112, fov: 15, name: '望遠', sensor: '1/1.5インチ・4800万画素', ap: 'f/2.8', focus: '3 m〜∞', col: '#22c55e' },
  ir: { lens: 'thermal', mm: 53, z0: 1, z1: 28, fov: 45, name: 'サーマル', sensor: '640×512・非冷却VOx', ap: 'f/1.0', focus: '5 m〜∞', col: '#e5484d' },
};
const M4_TILT = { t: [-90, 70], e: [-90, 35] }, M4_TILT_MECH = { t: [-140, 113], e: [-140, 50] };
const m4 = { variant: 't', acc: { spot: false, spk: false, lit: false }, gim: { tilt: 0, roll: 0, zoom: 1, ir: false, all: true }, fold: 0, foldTo: 0, act: null, powered: true,
  camsOn: false, senseOn: false, sizeOn: false, laserOn: false, person: null, ghost: null, target: null, pendingPower: false, _sup: false, _last: -1 };
const m4V = (v) => (v && typeof v === 'object' && !Array.isArray(v) && ('t' in v)) ? v[m4.variant] : v;   // 機種で値が違う項目を取り出す
const m4Lens = (k) => D.gimbalParts.lens[m4V(M4_LENS[k].lens)];

// ---------- 状態の問い合わせ ----------
function m4Busy() { return IS_M4 && (m4.foldTo > 0 || m4.fold > 0.001 || !!m4.act || m4.sizeOn || m4.camsOn || m4.senseOn || m4.laserOn); }
function m4Wide() { return m4.sizeOn || m4.camsOn || m4.senseOn || m4.laserOn; }
function m4ShadowExtra() { return m4.sizeOn ? 1.1 : m4.laserOn ? 0.8 : 0; }
function m4HasVariant(v) { return v === 't' || v === 'e' ? m4.variant === v : v === 'spot' ? m4.acc.spot : v === 'spk' ? m4.acc.spk : false; }
function m4BlockPower() {
  if (!IS_M4) return false;
  if (m4.act) { m4Stop(); return false; }
  if (m4.fold > 0.001 || m4.foldTo > 0) { m4.foldTo = 0; m4.pendingPower = true; syncM4Chips(); if ($('#noteCard').dataset.kind === 'm4-fold') renderNote(null); showToast('アームを開いてから回します（アームを展開する前にモーターを始動しない・安全ガイドライン）', 3600); m4FrameWide(); return true; }
  if (!m4.powered) setM4Power(true, '電源ボタンを1回押し、続けて長押しして電源を入れました');
  return false;
}
function m4OnTab(tab) {
  if (!IS_M4) return;
  if (tab !== 'fly') m4.pendingPower = false;   /* 「とばす」で押した電源を、ほかのタブで広げ終えたときに回さない */
  if (tab !== 'see') { const had = !!m4.act || m4Wide(); m4Stop(); m4Overlays(null, true); if ($('#noteCard').dataset.kind === 'm4-fold' || $('#noteCard').dataset.kind === 'm4-acc') renderNote(null); if (had) focusOn([D.root], { pull: true }); }   /* 引いた画・浮いた機体のまま「とばす」へ行かない */
  if (tab === 'fly' && (m4.foldTo > 0 || m4.fold > 0.001)) { m4.foldTo = 0; syncM4Chips(); showToast('アームを開きました'); m4FrameWide(); }
}
const m4FrameWide = () => frameBox([-0.36, -0.17, -0.42], [0.36, 0.06, 0.40], [0.62, 0.42, -0.66], 1.12);

// ---------- 動きの入口 ----------
function m4Action(id) {
  if (!IS_M4) return;
  if (S.tab !== 'see') setTab('see');
  if (id === 'about') { if (m4.act) m4Stop(); m4Overlays(null, true); renderM4About(); m4FrameDrone(null, 1.05); return; }
  if (id === 'variant') { if (m4.act) m4Stop(); const keepCams = m4.camsOn; if (!keepCams) m4Overlays(null, true);
    m4SetVariant(m4.variant === 't' ? 'e' : 't', !keepCams); if (keepCams) { m4.gim.all = true; m4SyncLens(); renderM4Note('cams'); showToast(`表示を Matrice 4${m4.variant === 't' ? 'T' : 'E'} に切り替えました`, 2400); } return; }
  if (id === 'acc' && $('#noteCard').dataset.kind === 'm4-acc') { renderNote(null); return; }
  if (id === 'acc') { if (m4.act) m4Stop(); m4Overlays(null, true); if (S.power > 0) setPower(0, true); if (m4.foldTo > 0 || m4.fold > 0.001) m4.foldTo = 0; renderM4Note('acc'); syncM4Chips(); frameBox([-0.16, -0.08, -0.20], [0.16, 0.14, 0.12], [0.55, 0.62, -0.58], 1.15); return; }
  if (id === 'cams' || id === 'sense' || id === 'size' || id === 'laser') { if (m4.act) m4Stop(); const was = { cams: m4.camsOn, sense: m4.senseOn, size: m4.sizeOn, laser: m4.laserOn }[id]; m4Overlays(was ? null : id); return; }
  m4Overlays(null, true);
  if (m4.act) m4Stop();
  stopOthers('alt');
  if (S.explode > 0.02) setExplode(0);
  if (S.mode === 'cut') setMode('normal');
  if (id === 'fold') {
    m4.foldTo = m4.foldTo > 0 ? 0 : 1; m4.pendingPower = false;
    if (m4.foldTo > 0 && S.power > 0) setPower(0, true);
    renderM4Note('fold'); syncM4Chips(); m4FrameWide(); return;   /* 広げた大きさで枠を決める */
  }
  if (S.power > 0) setPower(0, true);
  if (id === 'battery') {
    if (m4.foldTo > 0 || m4.fold > 0.001) m4.foldTo = 0;
    m4.act = { id, t: 0, p: D.batPart }; renderM4Note('battery'); syncM4Chips(); frameBox([-0.20, -0.14, -0.10], [0.20, 0.08, 0.32], [-0.62, 0.48, 0.62], 1.1); return;
  }
  if (id === 'gimbal') {
    if (m4.foldTo > 0 || m4.fold > 0.001) m4.foldTo = 0;
    m4.act = { id, t: 0 }; m4.gim.tilt = 0; renderM4Note('gimbal'); syncM4Chips();
    const g = D.gimbalParts.head; g.updateWorldMatrix(true, false); const c = new THREE.Vector3().setFromMatrixPosition(g.matrixWorld);
    frameBox([c.x - 0.08, c.y - 0.06, c.z - 0.05], [c.x + 0.08, c.y + 0.07, c.z + 0.08], [0.55, 0.12, -0.83], 1.1); return;   /* 斜め前から: チルトの回り方が見える */
  }
}
function m4Stop() {
  if (!IS_M4 || !m4.act) return;
  const a = m4.act; m4.act = null;
  if (a.id === 'battery' && a.p) { a.p.anim = null; a.p.animReset = true; if (!m4.powered) setM4Power(true); }
  if (a.id === 'gimbal') { m4.gim.tilt = 0; m4Sway(0, 0, 0, 0); }
  syncBodyMode(); syncM4Chips();
  if ($('#noteCard').dataset.kind === 'm4-' + a.id) renderNote(null);
  if (a.id === 'gimbal' || a.id === 'battery') focusOn([D.root], { pull: true });
}
// 画角・検知範囲・測距・大きさは「重ね絵」。同時には1つだけ
function m4Overlays(id, quiet) {
  const was = { cams: m4.camsOn, sense: m4.senseOn, size: m4.sizeOn, laser: m4.laserOn };
  m4.camsOn = id === 'cams'; m4.senseOn = id === 'sense'; m4.sizeOn = id === 'size'; m4.laserOn = id === 'laser';
  D.fovG.visible = m4.camsOn; D.senseG.visible = m4.senseOn; D.laserBeam.visible = m4.laserOn; m4SyncLens();
  if (m4.person) m4.person.visible = m4.sizeOn; if (m4.ghost) m4.ghost.visible = m4.sizeOn; if (m4.target) m4.target.visible = m4.laserOn;
  if (!m4.laserOn && was.laser) { m4Sway(0, 0, 0, 0); m4.gim.tilt = 0; m4.laser = null; if (m4._groundWas != null) { groundScale(m4._groundWas); m4._groundWas = null; } }
  S.shadowDirty = S.csDirty = S.aoDirty = true; syncM4Chips();
  if (!id && !fpv.on) { const sup = !!(m4.act && m4.act.id === 'gimbal'); m4._sup = sup; S.labelsSuppressed = sup; }   /* ラベルの抑えをその場で戻す（次のコマを待つと「眼」が古い値を控える） */
  if (id) {
    if (S.explode > 0.02) setExplode(0); if (S.power > 0) setPower(0, true); if (m4.foldTo > 0 || m4.fold > 0.001) m4.foldTo = 0;
    if (id === 'cams') { m4.gim.all = true; m4SyncLens(); }
    if (id === 'laser') m4LaserStart();
    renderM4Note(id);
    if (id === 'cams') frameBox([-0.32, -0.30, -1.05], [0.32, 0.10, 0.20], [0.72, 0.50, -0.85], 1.05);   /* 前斜め上から。錐がこちらへ広がり、機体は奥に見える */
    if (id === 'laser') m4FrameLaser();
    if (id === 'sense') frameBox([-0.75, -0.25, -0.62], [0.75, 0.55, 0.50], [0.70, 0.66, -0.75], 1.02);
    if (id === 'size') { if (m4.person.userData.face) m4.person.userData.face(camera.position.x, camera.position.z); pdFrame([D.root, m4.person, m4.ghost], { pull: true, margin: 1.15, dir: new THREE.Vector3(0.45, 0.32, -0.84).normalize() }); }
  } else if (!quiet && (was.cams || was.sense || was.size || was.laser)) {
    const k = $('#noteCard').dataset.kind; if (['m4-cams', 'm4-sense', 'm4-size', 'm4-laser'].includes(k)) renderNote(null);
    focusOn([D.root], { pull: true });
  } else if (quiet) { const k = $('#noteCard').dataset.kind; if (['m4-cams', 'm4-sense', 'm4-size', 'm4-laser'].includes(k)) renderNote(null); }
}
function setM4Power(on, msg) {
  m4.powered = !!on;
  for (const p of D.parts) {
    if (p.key === 'led') { const u = p.obj.userData; if (u.core) u.core.visible = on && !isWireMode(); if (u.halo) u.halo.visible = on && !isWireMode(); }
    if (p.key === 'statusLed' && p.lamp) { const m = p.lamp, want = on ? M.ledGreen : M.chip, was = m.userData.origMat || m.material; m.userData.origMat = want; if (m.material === was) m.material = want; }
  }
  if (msg) showToast(msg, 3200);
}
// 4T ⇄ 4E: ジンバルの前面だけを付け替える（機体は共通・公式）
function m4SetVariant(v, announce) {
  m4.variant = v; const gp = D.gimbalParts, L = gp.lens, F = M4_FACE[v];
  gp.faceT.visible = v === 't'; gp.faceE.visible = v === 'e';
  const move = (key, xy, dz = 0) => { const g = L[key]; g.position.set(xy[0] / 1000, xy[1] / 1000, g.position.z - (g.userData.dz || 0) + dz); g.userData.dz = dz; if (g.userData.part) g.userData.part.home.copy(g.position); const c = D.fovG.userData.cones[key]; if (c) c.position.copy(g.position); };
  move('mid', F.mid); move('tele', F.tele, v === 'e' ? -0.0045 : 0); move('laser', F.laser);
  const lk = L.laser.userData.looks; lk.t.visible = v === 't'; lk.e.visible = v === 'e';
  for (const p of D.parts) if (PARTS[p.key] && (PARTS[p.key].variant === 't' || PARTS[p.key].variant === 'e')) p.hidden = PARTS[p.key].variant !== v;
  if (v === 'e' && m4.gim.ir) m4.gim.ir = false;
  m4.gim.tilt = clamp(m4.gim.tilt, M4_R(M4_TILT[v][0]), M4_R(M4_TILT[v][1]));
  if (S.selected && PARTS[S.selected.key] && PARTS[S.selected.key].variant && !m4HasVariant(PARTS[S.selected.key].variant)) select(null);
  if (S.isolated && PARTS[S.isolated] && PARTS[S.isolated].variant && !m4HasVariant(PARTS[S.isolated].variant)) S.isolated = null;
  applyVisibility(); buildList(); m4SyncLens(); syncM4Chips(); $('#modelName').textContent = v === 't' ? 'Matrice 4T' : 'Matrice 4E';
  try { sessionStorage.setItem('drone3d.m4variant', v); } catch (e) {}
  m4FpvRebuild(); if (fpv.on) updateFpvHud();
  if (announce) {
    showToast(v === 't' ? '表示を Matrice 4T に切り替えました（サーマルとNIR補助ライトのあるジンバル）' : '表示を Matrice 4E に切り替えました（4/3型・メカシャッターの広角のあるジンバル）', 3600);
    const g = gp.head; g.updateWorldMatrix(true, false); const c = new THREE.Vector3().setFromMatrixPosition(g.matrixWorld);
    frameBox([c.x - 0.06, c.y - 0.05, c.z - 0.04], [c.x + 0.06, c.y + 0.05, c.z + 0.05], [0.18, 0.10, -0.98], 1.15);
    renderM4Note('variant');
  }
}
// アクセサリー: E-Port に スポットライト → スピーカー の順で重ねられる（AL1/AS1マニュアル）
function m4SetAcc(spot, spk) {
  m4.acc.spot = !!spot; m4.acc.spk = !!spk; if (!spot) m4.acc.lit = false;
  const sp = D.acc.spk; sp.position.copy(m4P(0, (spot ? 82 : 73.6) + 25, spot ? -60 : -52)); if (sp.userData.part) sp.userData.part.home.copy(sp.position);
  for (const p of D.parts) if (p.key === 'spotlight' || p.key === 'speaker') p.hidden = !m4HasVariant(PARTS[p.key].variant);
  for (const lp of D.acc.spot.userData.lamps) lp.children.forEach(c => { if (c.isMesh && c.geometry.type === 'ConeGeometry') c.visible = m4.acc.lit; });
  if (S.selected && (S.selected.key === 'spotlight' || S.selected.key === 'speaker') && S.selected.hidden) select(null);
  applyVisibility(); buildList(); syncM4Chips();
}
function syncM4Chips() {
  const set = (id, on, label) => { const b = $(`#m4Chips [data-m4="${id}"]`); if (!b) return; b.classList.toggle('on', !!on); if (b.hasAttribute('aria-pressed')) b.setAttribute('aria-pressed', String(!!on)); if (label) b.textContent = label; };
  set('variant', false, m4.variant === 't' ? '4E にする' : '4T にする');
  set('fold', m4.foldTo > 0, m4.foldTo > 0 ? 'ひろげる' : 'たたむ');
  set('battery', m4.act && m4.act.id === 'battery'); set('gimbal', m4.act && m4.act.id === 'gimbal');
  set('cams', m4.camsOn); set('laser', m4.laserOn); set('sense', m4.senseOn); set('size', m4.sizeOn); set('acc', m4.acc.spot || m4.acc.spk);
}
const m4FrameDrone = (dir, margin) => pdFrame([D.root], { pull: true, margin: (margin || 1.25) * (narrow() ? 0.8 : 1), dir: dir ? new THREE.Vector3(...dir).normalize() : undefined });

// ---------- 説明カード ----------
const M4_SRC_LINK = (k) => { const s = M4_SRC[k]; return `<a href="${s.url}" target="_blank" rel="noopener">${s.name}</a>`; };
function renderM4About() {
  const row = (k, v, src) => `<tr><th>${k}</th><td>${v}${src ? `<small>${src}</small>` : ''}</td></tr>`;
  const html = `<p><b>複数のカメラとレーザー距離計を積んだ、折りたたみ式の産業用ドローン。</b>サーマルカメラを持つ <b>4T</b>（電力・救命救助・公共安全・森林保全向け）と、4/3型・メカシャッターの広角を持つ <b>4E</b>（測量・マッピング・土木建設・採掘向け）の2機種がある（公式）。公式の仕様は重さ・寸法を2機種共通の値で示していて、見た目の違いはジンバルのカメラ（この図も機体を共通にしている）。4Eだけの機能に0.5秒間隔の撮影やスマート3Dキャプチャーがある（公式）。</p>
    <table class="pd-spec">
      ${row('離陸重量', '1219 g（最大離陸重量 1420 g）', '公式・標準プロペラ')}${row('展開時', '約 307.0 × 387.5 × 149.5 mm', '公式・プロペラを除く')}${row('折りたたみ時', '約 260.6 × 113.7 × 138.4 mm', '公式')}
      ${row('最大飛行時間', '49 分（ホバリング 42 分）', '公式・無風・標準プロペラ')}${row('最大水平速度', '21 m/s', '公式・無風・前進')}${row('最大風圧抵抗', '12 m/s', '公式・離着陸時')}
      ${row('バッテリー', '6741 mAh・14.76 V・99.5 Wh・401 g', '公式')}${row('映像伝送', 'O4 Enterprise・最大 12 km（日本）', '公式・障害物と干渉なし')}
      ${row('カメラ', '4T：広角・中望遠・望遠・サーマル・NIR補助ライト<br>4E：4/3型の広角・中望遠・望遠', '公式')}${row('レーザー距離計', '最大 1800 m', '公式・反射率20%')}${row('保護等級', 'なし（防水性能はない）', '公式')}
    </table>
    <h4>ほかの機種とのちがい</h4>
    <ul class="pd-diff"><li><b>カメラ頭が四角い</b>：鼻先の下にぶら下がり、窓の数は4Tで6つ（サーマル・NIR補助ライト・レーザー距離計を含む）、4Eで4つ</li><li><b>天面の円筒</b>：RTK内蔵のGNSSアンテナ。後ろにビーコン、前にアクセサリー用のE-Port</li><li><b>4本脚で立つ</b>：脚にアンテナが入る（取説）。前のモーターが後ろより約9mm高い（公式3Dモデルの実測）</li><li><b>たたみ方</b>：前アームは水平に後ろへ、後アームは下へ回して前へ（モーターが逆さになる）</li><li><b>アクセサリー</b>：スポットライトとスピーカーを重ねて付けられる</li></ul>
    <p class="caveat">この3Dモデルは、DJI公式の3Dモデル（STEP）から寸法を測り、取扱説明書の図と公式写真で確かめて、教材用に組み直した再現です。CADの形そのものは使っていません。4Eの前面の窓の位置、ジンバルのヨークの形、内部の配置、モーターの回転方向は推定を含みます（解説の「推定」「例」）。</p>
    <details class="pd-src"><summary>出典（${M4_DATE}）</summary><ul>${['product', 'specs', 'faq', 'manual', 'maint', 'acc', 'prop', 'cad'].map(k => `<li>${M4_SRC_LINK(k)}</li>`).join('')}</ul></details>`;
  renderNote({ kind: 'm4-about', title: m4.variant === 't' ? 'DJI Matrice 4T' : 'DJI Matrice 4E', html, actions: [{ label: m4.variant === 't' ? '4E にしてみる' : '4T にしてみる', fn: () => m4Action('variant') }, { label: 'たたんでみる', fn: () => m4Action('fold') }, { label: 'カメラを見る', fn: () => { renderNote(null); m4Action('cams'); } }] });
}
function renderM4Note(id) {
  const tr = M4_TILT[m4.variant];
  const N = {
    variant: () => ({ title: m4.variant === 't' ? 'Matrice 4T のジンバル' : 'Matrice 4E のジンバル', html: m4.variant === 't'
      ? `<p>前面に6つの窓（取説の図）。<b>サーマルカメラ</b>（640×512）と、望遠を夜でも使えるようにする<b>NIR補助ライト</b>があるのが4Tだけの装備。広角は1/1.3インチ・f/1.7。</p><p>ジンバルは上へ <b>70°</b> まで向けられる（4Eは35°・公式）。</p>`
      : `<p>前面に4つの窓（取説の図）。広角が<b>4/3型・2000万画素でメカシャッター付き</b>になる（公式）。メカシャッターは移動しながらの撮影で像がゆがみにくい（一般的な知識）。サーマルとNIR補助ライトはない。</p><p>ジンバルは上へ <b>35°</b> まで（4Tは70°・公式）。</p><p class="caveat">4Eの窓の位置は取説の図と公式写真から読んだ推定です。</p>`,
      actions: [{ label: m4.variant === 't' ? '4E にする' : '4T にする', primary: true, fn: () => m4Action('variant') }, { label: 'カメラを見る', fn: () => { renderNote(null); m4Action('cams'); } }] }),
    fold: () => ({ title: m4.foldTo > 0 ? 'アームをたたむ' : 'アームを広げる', html: m4.foldTo > 0
      ? `<p>電源を切り、羽根を寄せてから、<b>後アームを下へ振り下ろして前へ</b>回し、胴の下の脇に収めます（モーターが逆さ・脚が上）。続いて<b>前アームを水平に後ろへ</b>回して胴の上の脇に沿わせ、最後にカメラへ<b>ジンバルプロテクター</b>をかぶせます。たたむと約 260.6 × 113.7 × 138.4 mm（公式）。</p><p class="caveat">取説には展開の順番（前アーム → 後アーム）だけが書かれていて、たたむ順番は書かれていません。この図は展開の逆にしています。回す軸の向きは取説の図からの推定です。</p>`
      : `<p>取説の準備の順番どおりに、<b>①ジンバルプロテクターを外す → ②前アームを開く → ③後アームを開く</b>。このあとバッテリーを入れ、プロペラを付けます。</p><p><b>アームを開ききってから電源を入れます</b>。開かないまま電源を入れると、ジンバルがアームに当たってセルフチェックを終えられません（公式FAQ）。電源は、電源ボタンを1回押してから長押し（取説）。</p>`,
      actions: [{ label: m4.foldTo > 0 ? '広げる' : 'たたむ', primary: true, fn: () => m4Action('fold') }] }),
    battery: () => ({ title: 'バッテリーを入れ替える', html: `<p id="m4BatState" class="pd-state">電源を切っています…</p><p>電源を切り、左右のバックルを押して、バッテリーを<b>後ろへ</b>引き抜きます。差し込むときはカチッと音がするまで（取説）。<b>電源が入っているときは抜き差ししない</b>（取説）。</p><p>バッテリーは 401 g で、離陸重量 1219 g のおよそ3分の1（公式の値からの計算）。</p><p class="caveat">胴の中のバッテリーの形は、公式の3Dモデルの外形から起こした簡略形です。</p>`, actions: [{ label: 'もう一度', fn: () => m4Action('battery') }], onClose: () => { m4Stop(); focusOn([D.root], { pull: true }); } }),
    gimbal: () => ({ title: 'ジンバル', html: `<p id="m4GimState" class="pd-state">上へ向けます…</p><p>カメラの頭は、上ぶたの下の付け根から<b>パン（縦軸）→ ロール（前後の軸）→ U字のヨーク → チルト（左右の円筒）</b>の順に吊られています。送信機で操作できるのは<b>チルト</b>で、${m4.variant === 't' ? '4T' : '4E'}は <b>${tr[0]}°〜${tr[1]}°</b>（公式）。パンとロールは機体の揺れを打ち消すのに使います（パンは手動では操作できない・公式）。</p><table class="pd-spec"><tr><th>操作できるチルト</th><td>4T −90°〜70°・4E −90°〜35°<small>公式</small></td></tr><tr><th>ソフトリミット</th><td>ロール ±47°・パン ±60°<small>公式</small></td></tr><tr><th>機械的な範囲</th><td>チルト 4T −140°〜113°・4E −140°〜50°、ロール ±52°、パン ±65°<small>公式</small></td></tr><tr><th>最大制御速度</th><td>チルト 100°/秒<small>公式</small></td></tr><tr><th>角度ぶれ範囲</th><td>±0.007°<small>公式</small></td></tr></table><p class="caveat">軸の並びは公式の3Dモデルの形から読んだものです。公式の仕様には4Tのチルトのソフトリミットとして −90°〜35° も載っています（制御可能な範囲 −90°〜70° と同じ表に併記）。</p>`, actions: [{ label: 'もう一度', fn: () => m4Action('gimbal') }, { label: 'カメラから見る', fn: () => m4CamView() }], onClose: () => { m4Stop(); focusOn([D.root], { pull: true }); } }),
    cams: () => m4CamNote(),
    laser: () => ({ title: 'レーザー距離計', html: `<div id="m4LaserRead" class="m4-read"></div><p>十字線の先にレーザーを当てて距離を測ります（光が返ってくるまでの時間から求めるのが一般的な仕組み）。アプリで「RNG」を有効にすると、<b>直線距離・高度・緯度経度・水平距離</b>が出ます（取説）。見つけた人や火元の位置を地図に落とすのに使えますが、位置はGNSSやジンバルの姿勢の精度に左右され、取説は「あくまで参考用」としています。</p><table class="pd-spec"><tr><th>測定範囲</th><td>1800 m<small>反射率20%の目標・1 Hz・公式</small></td></tr><tr><th>精度</th><td>±(0.2 + 0.0015 × 距離) m<small>3 m より遠いとき・公式</small></td></tr><tr><th>ブラインドゾーン</th><td>1 m<small>英語の仕様・製品ページ。日本語の仕様は「3～1 m」と表記</small></td></tr></table><p class="caveat">図の距離は舞台の上の実寸です。誤差の幅は公式の式で計算しています。電源が入っている間はレーザーの窓を直接見ないこと（安全ガイドライン）。</p>`, actions: [{ label: '別の目標を測る', primary: true, fn: () => m4LaserStart(true) }, { label: 'もどす', fn: () => m4Overlays(null) }], onClose: () => m4Overlays(null) }),
    sense: () => ({ title: '検知範囲', html: `<p>上の四隅の魚眼カメラ（前2・後2）を2つずつ組にして周りの障害物までの距離を測り、ぶつかる前に止まる・避けます。下は3D赤外線センサー（公式）と2つの魚眼（取説の図）。</p><table class="pd-spec"><tr><th>前方・後方</th><td>0.4〜22.5 m（デュアル）・水平90°×垂直135°<small>公式</small></td></tr><tr><th>側方</th><td>0.5〜32 m・水平90°×垂直90°<small>公式</small></td></tr><tr><th>下方</th><td>0.3〜18.8 m・160°<small>公式</small></td></tr><tr><th>上方</th><td>仕様に数値の記載なし</td></tr></table><p class="caveat">図はデュアルの測定範囲を約45分の1に縮めた概念図です（下向きはさらに縮めています）。公式の仕様には別に「測定範囲 0.4〜200 m」（前後）などの記載もあります。スポットライトを点けると障害物回避が働きません（公式）。</p>`, actions: [{ label: 'もどす', fn: () => m4Overlays(null) }], onClose: () => m4Overlays(null) }),
    size: () => ({ title: '大きさをくらべる', html: `<p>同じ縮尺で、<b>身長170cmの人</b>と、青い半透明の<b>550クラスのクアッド</b>（対角550mm・約2.4kg）を並べています。</p><p>Matrice 4 は展開時 約307.0 × 387.5 mm（プロペラを除く・公式）、離陸重量 1219 g。対角ホイールベースは 438.8 mm（公式）で、550クラスよりひと回り小さい。たためば約 260.6 × 113.7 mm。</p>`, actions: [{ label: 'もどす', fn: () => m4Overlays(null) }], onClose: () => m4Overlays(null) }),
    acc: () => m4AccNote(),
  };
  renderNote(Object.assign({ kind: 'm4-' + id }, N[id]()));
  if (id === 'cams') $('#noteBody').onclick = m4CamClick;
  if (id === 'acc') $('#noteBody').onclick = m4AccClick;
}
// カメラの選択（カードの中のボタンを委譲で受ける）
function m4CamNote() {
  const g = m4.gim, k = m4LensKey(), v = m4.variant, keys = v === 't' ? ['wide', 'mid', 'tele', 'ir'] : ['wide', 'mid', 'tele'];
  const btn = (key) => { const l = M4_LENS[key], on = !g.all && k === key; return `<button class="mv-seg${on ? ' on' : ''}" data-m4lens="${key}" aria-pressed="${on}" style="--c:${l.col}">${key === 'ir' ? 'サーマル' : l.mm + 'mm'}</button>`; };
  const L = M4_LENS[k];
  const body = g.all
    ? `<p>同じ場所から撮っても、写る範囲がこれだけ違います（画角・公式）。カメラを選ぶと、そのカメラだけを光らせます。</p><ul class="pd-diff"><li><b style="color:#ef6a2d">24mm 相当</b>（広角）：${m4V(M4_LENS.wide.fov)}°</li><li><b style="color:#3b7df7">70mm 相当</b>（中望遠）：35°</li><li><b style="color:#22c55e">168mm 相当</b>（望遠）：15°</li>${v === 't' ? '<li><b style="color:#e5484d">サーマル</b>（53mm 相当）：対角 45°</li>' : ''}</ul>`
    : `<table class="pd-spec"><tr><th>カメラ</th><td><b style="color:${L.col}">${L.name}</b>・${L.mm}mm 相当<small>${m4V(L.sensor)}・公式</small></td></tr><tr><th>画角</th><td>${k === 'ir' ? '対角 45°' : m4V(L.fov) + '°'}<small>公式</small></td></tr><tr><th>絞り</th><td>${m4V(L.ap)}<small>公式</small></td></tr><tr><th>ピント</th><td>${L.focus}<small>公式</small></td></tr></table>`
      + `<p>${k === 'wide' ? (v === 't' ? '全体を見渡して、探す・状況をつかむカメラ。' : '測量向けの広角。メカシャッター（公式）は、飛びながら撮るときの像のゆがみを抑えられる（一般的な知識）。') : k === 'mid' ? '公式は「10 m先からでもネジや亀裂を識別」と紹介している。' : k === 'tele' ? '公式は「最大250メートル離れた標識の細部まで」と紹介している。デジタル16倍（ハイブリッド112倍）まで寄れる（公式）。' : '物が出す赤外線（熱）を写す。測温範囲は −20〜150 ℃（高ゲイン）／0〜550 ℃（低ゲイン）（公式）。夜は NIR補助ライト（照射角5.7°）が望遠を助ける（紫の細い光）。'}</p>`;
  return { title: v === 't' ? 'Matrice 4T のカメラ' : 'Matrice 4E のカメラ', html: `<div class="mv-segs" role="group" aria-label="カメラを選ぶ">${keys.map(btn).join('')}<button class="mv-seg${g.all ? ' on' : ''}" data-m4lens="all" aria-pressed="${g.all}">全部</button></div>${body}<p class="caveat">錐は公式の画角を対角として4:3の枠（サーマルは5:4）で描いています。錐の長さは見やすさのための長さで、距離の意味はありません。</p>`,
    actions: [{ label: 'カメラから見る', primary: true, fn: () => m4CamView() }, { label: 'もどす', fn: () => m4Overlays(null) }], onClose: () => m4Overlays(null) };
}
function m4CamClick(e) {
  const b = e.target.closest('[data-m4lens]'); if (!b) return;
  const k = b.dataset.m4lens, g = m4.gim;
  if (k === 'all') { g.all = true; g.ir = false; g.zoom = 1; } else { g.all = false; g.ir = k === 'ir'; g.zoom = g.ir ? 1 : M4_LENS[k].z0; }
  m4SyncLens(); renderM4Note('cams');
}
function m4CamView() { if (m4.gim.all) { m4.gim.zoom = 1; m4.gim.ir = false; } m4.gim.all = true; renderNote(null); m4Overlays(null, true); segSet($('#viewCol'), 'v', 'fpv'); fpvOn(true); }
function m4AccNote() {
  const a = m4.acc, b = (id, on, label) => `<button class="mv-seg${on ? ' on' : ''}" data-m4acc="${id}" aria-pressed="${on}">${label}</button>`;
  const fly = !a.spot && !a.spk ? [42, 49] : a.spot && a.spk ? (a.lit ? [28, 32] : [34, 40]) : a.spot ? (a.lit ? [31, 35] : [37, 43]) : [37, 43];
  return { title: 'アクセサリー（別売）', html: `<div class="mv-segs" role="group" aria-label="付けるアクセサリー">${b('spot', a.spot, 'AL1 スポットライト')}${b('spk', a.spk, 'AS1 スピーカー')}${a.spot ? b('lit', a.lit, a.lit ? '点灯中' : '点ける') : ''}</div>
    <p>上面の <b>E-Port</b> に差し、手締めねじ2本で止めます。両方付けるときは、スポットライトの上にスピーカーを重ねます（AL1/AS1マニュアル）。付ける前に電源を切り、付けたらコンパスを較正します。</p>
    <table class="pd-spec"><tr><th>付けている物</th><td>${!a.spot && !a.spk ? 'なし' : [a.spot ? 'スポットライト 99 g' : '', a.spk ? 'スピーカー 92.5 g' : ''].filter(Boolean).join('・')}<small>ブラケット込み・公式</small></td></tr><tr><th>最大ホバリング / 飛行</th><td>${fly[0]} 分 / ${fly[1]} 分<small>AL1/AS1マニュアルの表${a.spot && a.lit ? (a.spk ? '・両方オンの値' : '・点灯中') : ''}</small></td></tr></table>
    ${a.spot ? `<p><b>スポットライト</b>：32 W・照射角23°・100 m先で4.3ルクス（公式）。付けると障害物回避が制限されて迂回が使えなくなり、<b>点けると障害物回避が働かない</b>（AL1/AS1マニュアル・公式FAQ）。</p>` : ''}${a.spk ? `<p><b>スピーカー</b>：1 m で 114 dB・有効放送距離 300 m（公式）。避難の呼びかけや録音を流す。</p>` : ''}
    <p class="caveat">形は公式の写真と仕様の寸法（スポットライト 幅164mm、スピーカー 73×70×52mm）からの簡略形です。</p>`,
    actions: [{ label: '外す', fn: () => { m4SetAcc(false, false); renderM4Note('acc'); } }], onClose: () => {} };
}
function m4AccClick(e) {
  const b = e.target.closest('[data-m4acc]'); if (!b) return; const a = m4.acc, k = b.dataset.m4acc;
  if (k === 'lit') { a.lit = !a.lit; m4SetAcc(a.spot, a.spk); if (a.lit) showToast('スポットライト点灯中は障害物回避が働きません（公式）', 3600); }
  else { if (S.power > 0) setPower(0, true); m4SetAcc(k === 'spot' ? !a.spot : a.spot, k === 'spk' ? !a.spk : a.spk); }
  renderM4Note('acc');
}

// ---------- レンズとジンバル ----------
const m4LensKey = () => m4.gim.ir ? 'ir' : m4.gim.zoom < 70 / 24 - 1e-6 ? 'wide' : m4.gim.zoom < 7 - 1e-6 ? 'mid' : 'tele';
// 縦の画角(度)。公式の画角を対角とみなし（可視光 4:3・サーマル 5:4）、そのカメラの倍率からさらにデジタルで寄せる
function m4VFov() { const k = m4LensKey(), L = M4_LENS[k], z = m4.gim.zoom, f = m4V(L.fov), r = k === 'ir' ? 0.625 : 0.6, z0 = k === 'ir' ? 1 : L.z0;
  return 2 * Math.atan(Math.tan(M4_R(f / 2)) * r / (z / z0)) * 180 / Math.PI; }
function m4SetZoom(z) { const g = m4.gim; g.zoom = clamp(z, 1, g.ir ? 28 : 112); m4SyncLens(); if (fpv.on) updateFpvHud(); }
function m4SyncLens() {
  const gp = D.gimbalParts; if (!gp) return;
  const k = m4LensKey(), all = m4.gim.all, cones = D.fovG.userData.cones, v = m4.variant;
  const show = { wideT: v === 't', wideE: v === 'e', mid: true, tele: true, thermal: v === 't' };
  const cur = m4V(M4_LENS[k].lens);
  for (const key of Object.keys(cones)) { cones[key].visible = show[key] && (all || key === cur); const g = gp.lens[key]; if (g && g.userData.glow) g.userData.glow.visible = m4.camsOn && !all && key === cur; }
  D.fovG.userData.nir.visible = v === 't' && (all || k === 'tele' || k === 'ir');
  S.aoDirty = true;
}
// 毎フレーム（本体の姿勢を当てた後）。電源が入っていれば機体の傾きを打ち消す。操作はチルトだけ、パンとロールは打ち消し専用（機械的な範囲で止まる）
// このジンバルは パン(Y) → ロール(Z) → チルト(X) の順につながる（公式3Dモデルの形）。望みの世界姿勢（機首の方位・水平・指定のチルト）を
// 付け根の世界姿勢で割って局所の回転にし、それを同じ軸順（YZX）で3つの角度に分ける。オイラー角の足し引きでは軸順が違うと消し残る
const _m4q = new THREE.Quaternion(), _m4q2 = new THREE.Quaternion(), _m4e = new THREE.Euler(), _m4e2 = new THREE.Euler();
const m4Norm = (a) => Math.atan2(Math.sin(a), Math.cos(a));
function m4GimbalApply() {
  const gp = D.gimbalParts; if (!gp) return;
  const mech = M4_TILT_MECH[m4.variant];
  let tl = m4.gim.tilt, rl = 0, pn = 0;
  if (m4.powered && !(fpv.on && !fpv.stabilized)) {
    gp.pan.parent.updateWorldMatrix(true, false); gp.pan.parent.getWorldQuaternion(_m4q);
    (m4.laserOn ? gp.pan.parent : D.root).getWorldQuaternion(_m4q2); _m4e2.setFromQuaternion(_m4q2, 'YXZ');   /* 測距では機体ごと目標へ向けるので、胴の方位を基準にする */
    _m4q2.setFromEuler(_m4e.set(m4.gim.tilt, _m4e2.y, 0, 'YXZ'));
    _m4q.invert().multiply(_m4q2); _m4e.setFromQuaternion(_m4q, 'YZX');
    tl = _m4e.x; rl = clamp(_m4e.z, M4_R(-47), M4_R(47)); pn = clamp(_m4e.y, M4_R(-60), M4_R(60));   /* ソフトリミット（公式）。機械的にはロール±52°・パン±65° */
  }
  gp.tilt.rotation.x = clamp(tl, M4_R(mech[0]), M4_R(mech[1])); gp.roll.rotation.z = rl; gp.pan.rotation.y = pn;
  if (m4.fold > 0.02 || m4.foldTo > 0) { gp.tilt.rotation.x = 0; gp.roll.rotation.z = 0; gp.pan.rotation.y = 0; }
}
// 手で持って傾ける（打ち消しを見せる）。胴を床から浮かせてから回す
function m4Sway(lift, px, yaw, rz) { const sg = D.sg; if (sg.userData.y0 == null) sg.userData.y0 = sg.position.y; sg.position.y = sg.userData.y0 + lift; sg.rotation.set(px, yaw, rz, 'YXZ'); }

// ---------- レーザー距離計: 目標を置いて測る ----------
// 目標（人）は機体の前 2〜3m。機体を 0.8m 浮かせて向きを変え、胸の高さにレーザーを当てる
const M4_TARGETS = [[0.5, -0.158, -2.6], [-0.9, -0.158, -3.2], [0.15, -0.158, -2.0]];
const _m4v1 = new THREE.Vector3(), _m4v2 = new THREE.Vector3();
function m4LaserStart(next) {
  if (!m4.target) return;
  m4.laserIdx = next ? ((m4.laserIdx || 0) + 1) % M4_TARGETS.length : (m4.laserIdx || 0);
  const t = M4_TARGETS[m4.laserIdx]; m4.target.position.set(t[0], t[1], t[2]); m4.target.visible = true;
  if (m4.target.userData.face) m4.target.userData.face(0, 0);
  const was = m4.laser;   /* 別の目標へは、浮いたまま向きだけ変える（床へ降ろしてから浮き直さない） */
  m4.laser = { t: was ? 1.2 : 0, lt: was ? was.lt : 0, lift: 0.8, yaw: was ? was.yaw : 0, shown: 0 };
  const el = $('#m4LaserRead'); if (el) el.innerHTML = '<span>目標へ向けています…</span>';
  if (m4._groundWas == null) { m4._groundWas = ground.scale.x; groundScale(3.2); }
  if (next) m4FrameLaser();   /* 初回はカードを開いてから m4Overlays が枠を決める */
}
// 機体（浮いた高さまで）と目標の人を両方収める。距離の上限（ふだんの3.2m）を緩めて渡す
function m4FrameLaser() {
  const t = m4.target.position, lift = m4.laser.lift, tall = innerWidth < innerHeight;
  const min = [Math.min(-0.3, t.x - 0.35), -0.16, t.z - 0.3], max = [Math.max(0.3, t.x + 0.35), -0.158 + Math.max(1.75, lift + 0.25), 0.35];
  const proxy = new THREE.Mesh(new THREE.BoxGeometry(max[0] - min[0], max[1] - min[1], max[2] - min[2]), new THREE.MeshBasicMaterial({ visible: false }));
  proxy.position.set((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2); scene.add(proxy);
  pdFrame([proxy], { pull: true, min: 0.08, max: 12, margin: narrow() ? 0.95 : 1.06, dir: new THREE.Vector3(...(tall ? [0.42, 0.50, 0.76] : [0.92, 0.36, 0.16])).normalize() });   /* 縦長の画面は後ろ斜めから（奥行きに並べる）、横長は横から */
  scene.remove(proxy); proxy.geometry.dispose();
}
function m4LaserStep(dt) {
  const L = m4.laser; if (!L || !m4.laserOn) return false;
  L.t += dt; L.lt += dt; const e = Math.min(1, L.lt / 1.6), ease = e * e * (3 - 2 * e);
  // 目標の胸の高さへジンバルを向け、胴の向きを目標へ回す
  D.sg.updateWorldMatrix(true, false);
  const tgt = _m4v1.copy(m4.target.position); tgt.y += 1.25;
  const pos = D.gimbalParts.lens.laser.getWorldPosition(_m4v2);
  const dx = tgt.x - pos.x, dz = tgt.z - pos.z, dy = tgt.y - pos.y, h = Math.hypot(dx, dz);
  const yawWant = Math.atan2(-dx, -dz); L.yaw = (L.yaw || 0) + m4Norm(yawWant - (L.yaw || 0)) * Math.min(1, dt / 0.25); m4Sway(L.lift * ease, 0, L.yaw, 0);
  m4.gim.tilt = clamp(Math.atan2(dy, h), M4_R(M4_TILT[m4.variant][0]), M4_R(M4_TILT[m4.variant][1]));
  const dist = Math.hypot(dx, dy, dz); D.laserBeam.scale.set(1, 1, Math.max(0.01, dist * Math.min(1, Math.max(0, (L.t - 1.4) / 0.4))));
  const el = $('#m4LaserRead');
  if (el && L.t > 1.8 && (!L.shown || Math.abs(L.shown - dist) > 0.005)) { L.shown = dist; const err = 0.2 + 0.0015 * dist;
    el.innerHTML = `<b>直線距離 ${dist.toFixed(2)} m</b><span>水平距離 ${h.toFixed(2)} m ・ 高さの差 ${dy.toFixed(2)} m</span><span>${dist < 1 ? '1 m より近いと測れない（ブラインドゾーン・公式）' : dist <= 3 ? '1〜3 m の精度はシステム誤差 0.3 m 未満（公式）' : `誤差の目安 ±${err.toFixed(2)} m（公式の式）`}</span>`; }
  else if (el && L.t <= 1.8 && !el.textContent) el.innerHTML = '<span>機体を浮かせて目標へ向けています…</span>';
  return true;
}

// ---------- 機体のカメラの映像（fpv.js）から使う窓口 ----------
const M4_GC = {
  st: m4.gim, tilt0: -4, get tiltMin() { return M4_R(M4_TILT[m4.variant][0]); }, get tiltMax() { return M4_R(M4_TILT[m4.variant][1]); }, seenKey: 'fpvSeenM4',
  get firstToast() { return `上下のドラッグでチルト（${M4_TILT[m4.variant][0]}°〜${M4_TILT[m4.variant][1]}°）。カメラとズームは下のボタンで。左右は機体ごと向きを変えます`; },
  dragToast: 'パン（左右）は送信機からは操作できません（公式）。左右はスティックで機体ごと向きを変えます',
  person: () => m4.person, personFpv: [0.12, -0.158, -12], personHome: [0.42, -0.158, 0.34],
  eye: () => m4Lens(m4LensKey()), vfov: () => m4VFov(),
  apply: () => m4GimbalApply(), sync: () => m4FpvSync(),
  hud: () => `${(m4.gim.tilt * 180 / Math.PI).toFixed(0)}°`,
  get camHtml() { return m4FpvHtml(); },
  bind() { m4FpvBind(); },
};
function m4FpvHtml() {
  const t = m4.variant === 't';
  return `<div class="fpv-seg" id="fpvLens"><button data-z="1" style="--c:#ef6a2d">24mm</button><button data-z="${(70 / 24).toFixed(3)}" style="--c:#3b7df7">70mm</button><button data-z="7" style="--c:#22c55e">168mm</button>${t ? '<button data-ir="1" style="--c:#e5484d" aria-label="サーマル">熱</button>' : ''}</div>
        <div class="fpv-seg"><button id="fpvZoomOut" aria-label="引く">−</button><b id="fpvZoom">1.0×</b><button id="fpvZoomIn" aria-label="寄る">＋</button></div>`;
}
function m4FpvBind() {
  const box = $('#fpv .fpv-cam'); if (!box) return;
  box.onclick = (e) => {
    const b = e.target.closest('button'); if (!b) return; const g = m4.gim;
    if (b.dataset.ir) { g.ir = !g.ir; g.zoom = 1; m4SyncLens(); m4ThermalLook(); updateFpvHud(); return; }
    if (b.dataset.z) { g.ir = false; m4SetZoom(+b.dataset.z); m4ThermalLook(); return; }
    const steps = g.ir ? [1, 2, 4, 8, 16, 28] : [1, 1.5, 2, 70 / 24, 4, 5, 7, 10, 14, 20, 28, 40, 56, 80, 112];
    if (b.id === 'fpvZoomIn') m4SetZoom(steps.find(z => z > g.zoom + 1e-6) || steps[steps.length - 1]);
    if (b.id === 'fpvZoomOut') m4SetZoom([...steps].reverse().find(z => z < g.zoom - 1e-6) || 1);
  };
  if (!m4._wheel) { m4._wheel = true; canvas.addEventListener('wheel', e => { if (!fpv.on || !IS_M4) return; e.preventDefault(); m4SetZoom(m4.gim.zoom * Math.exp(-e.deltaY * 0.0022)); }, { passive: false }); }
}
function m4FpvRebuild() { const box = $('#fpv .fpv-cam'); if (box) { box.innerHTML = m4FpvHtml(); m4FpvBind(); } }
function m4FpvSync() {
  const g = m4.gim, k = m4LensKey(), L = M4_LENS[k], set = (id, v) => { const el = $(id); if (el && el.textContent !== v) el.textContent = v; };
  set('#fpvPanLbl', 'ジンバル チルト');
  set('#fpvFov', `${k === 'ir' ? 'サーマル 640×512（熱が白）' : `${L.mm}mm相当（${L.name}）`}・縦${m4VFov().toFixed(g.zoom > 7 ? 1 : 0)}°`);
  set('#fpvZoom', `${g.zoom < 10 ? g.zoom.toFixed(1) : g.zoom.toFixed(0)}×`);
  for (const b of $$('#fpvLens [data-z]')) { const on = !g.ir && Math.abs(M4_LENS[k === 'ir' ? 'wide' : k].z0 - +b.dataset.z) < 0.01; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); }
  const irb = $('#fpvLens [data-ir]'); if (irb) { irb.classList.toggle('on', g.ir); irb.setAttribute('aria-pressed', String(g.ir)); }
  m4ThermalLook();
}
// サーマルの見え方: 画面を白黒にして、人とモーターだけを熱く（白く）する。温度の計算ではなく、見え方の再現
function m4ThermalLook() {
  const on = fpv.on && m4.gim.ir; if (on === !!m4._irLook) return; m4._irLook = on;
  document.body.classList.toggle('m4-ir', on);
  const p = m4.person; if (p) p.traverse(o => { if (!o.isMesh || !o.material || !o.material.emissive) return;
    if (on) { if (!o.userData.irMat) { o.userData.irMat = o.material.clone(); o.userData.irMat.emissive.set(0xffffff); o.userData.irMat.emissiveIntensity = 0.9; } o.userData.baseMat = o.material; o.material = o.userData.irMat; }
    else if (o.userData.baseMat) { o.material = o.userData.baseMat; o.userData.baseMat = null; } });
}

// ---------- 毎フレーム ----------
const m4Ease = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
function stepM4(dt) {
  let dirty = false;
  if (S.explode > 0.02 && m4.foldTo > 0) { m4.foldTo = 0; syncM4Chips(); if ($('#noteCard').dataset.kind === 'm4-fold') renderNote(null); }
  { const sup = m4.sizeOn || m4.camsOn || m4.senseOn || m4.laserOn || !!(m4.act && m4.act.id === 'gimbal'); if (sup !== m4._sup) { m4._sup = sup; S.labelsSuppressed = sup; } }
  if (!fpv.on && m4._irLook) m4ThermalLook();
  // --- たたむ / 広げる ---
  if (m4.foldTo > m4.fold) {
    const spinning = D.motors.some(mo => mo.rpm > 30) || body.py > 0.003;
    if (!spinning) {
      if (m4.powered && m4.fold === 0) setM4Power(false, '電源を切りました');
      let aligned = true;
      for (const mo of D.motors) { const tgt = Math.PI / 2 + Math.round((mo.angle - Math.PI / 2) / (Math.PI * 2)) * Math.PI * 2; const d = tgt - mo.angle; if (Math.abs(d) > 0.005) { aligned = false; mo.angle += d * (1 - Math.exp(-dt / 0.12)); } else mo.angle = tgt; mo.prop.rotation.y = mo.angle; }
      if (aligned || m4.fold > 0) m4.fold = Math.min(m4.foldTo, m4.fold + dt / 3.0);
      dirty = true;
    }
  } else if (m4.foldTo < m4.fold) { m4.fold = Math.max(m4.foldTo, m4.fold - dt / 3.0); dirty = true; }
  if (m4.fold !== m4._last) {
    // 畳む: 羽根 → 後アーム（下へ回して前へ）→ 前アーム（水平に後ろへ）→ ジンバルプロテクター。広げる: プロテクター → 前 → 後 → 羽根（取説の準備の順）
    const f = m4.fold, fb = m4Ease(f / 0.2), fr = m4Ease((f - 0.18) / 0.36), ff = m4Ease((f - 0.52) / 0.36);
    D.motors.forEach((mo, i) => {
      const F = D.folds[i];
      if (F.front) F.fg.rotation.set(0, F.swing.ang * ff, 0.075 * ff, 'YZX');   /* 水平に後ろへ。脚の先が少し上がる（折りたたみ時の高さからの推定） */
      else F.fg.quaternion.setFromAxisAngle(F.flip.axis, F.flip.sign * Math.PI * fr);
      for (const h of mo.hinges) h.g.rotation.y = h.s * fb * Math.PI / 2;   /* 羽根は根元で折れてアームに沿う */
    });
    D.protector.visible = f > 0.92;
    if (m4.foldTo === 1 && f >= 1) m4FrameFolded();
    if (f === 0 && m4.foldTo === 0 && m4._last > 0) { if (!m4.powered) setM4Power(true, '電源ボタンを1回押し、続けて長押しして電源を入れました'); if (m4.pendingPower) { m4.pendingPower = false; setPower(0.5); } }
    m4._last = f; dirty = true;
  }
  // --- 動き ---
  const a = m4.act;
  if (a) {
    a.t += dt; const t = a.t; dirty = true;
    if (a.id === 'battery' && a.p) {
      if (m4.fold > 0.001) { a.t = 0; }
      else {
        const p = a.p; if (!p.anim) p.anim = { pos: new THREE.Vector3(), quat: new THREE.Quaternion() };
        if (t > 0.3 && m4.powered) setM4Power(false);
        let back = 0; const B = 0.15;
        if (t > 0.8 && t < 2.0) back = m4Ease((t - 0.8) / 1.2) * B; else if (t >= 2.0 && t < 2.8) back = B; else if (t >= 2.8 && t < 4.0) back = B * (1 - m4Ease((t - 2.8) / 1.2));
        p.anim.pos.set(0, 0, back);
        const st = $('#m4BatState'), msg = t < 0.8 ? '電源を切りました' : t < 2.0 ? '左右のバックルを押して後ろへ引き抜きます' : t < 2.8 ? '充電済みのバッテリーに持ち替え' : t < 4.0 ? 'カチッと音がするまで差し込みます' : '電源ボタンを1回押してから長押しして起動しました'; if (st && st.textContent !== msg) st.textContent = msg;
        if (t > 4.2 && !m4.powered) setM4Power(true);
        if (t > 4.6) { p.anim = null; p.animReset = true; m4.act = null; syncM4Chips(); }
      }
    }
    if (a.id === 'gimbal' && (m4.fold > 0.02 || m4.foldTo > 0)) { a.t = 0; const st = $('#m4GimState'); if (st && st.textContent !== 'アームを開いています…') st.textContent = 'アームを開いています…'; }   /* アームが開くまで待つ（開く前はジンバルを動かさない） */
    else if (a.id === 'gimbal') {
      // 速さは最大制御速度 100°/秒 を超えないように区切る
      const R = M4_R, E = m4Ease, up = M4_TILT[m4.variant][1], T = [Math.max(0.6, up / 70 * 1.0), 0.6, (up + 90) / 100 + 0.3, 0.5, 1.1, 0.5, 5.0];
      let k = 0, u = t; while (k < T.length && u > T[k]) { u -= T[k]; k++; } const f = k < T.length ? u / T[k] : 1;
      let tilt = 0, msg = '', sway = [0, 0, 0, 0];
      if (k === 0) { tilt = R(up) * E(f); msg = `上へ ${up}°（${m4.variant === 't' ? '4T' : '4E'}の操作できる上限）`; }
      else if (k === 1) { tilt = R(up); msg = `上へ ${up}°（${m4.variant === 't' ? '4T' : '4E'}の操作できる上限）`; }
      else if (k === 2) { tilt = R(up) + R(-90 - up) * E(f); msg = '真下へ −90°（真上からの点検・測量）'; }
      else if (k === 3) { tilt = R(-90); msg = '真下へ −90°（真上からの点検・測量）'; }
      else if (k === 4) { tilt = R(-90) * (1 - E(f)); msg = '正面へもどす'; }
      else if (k === 5) { msg = '手に持って傾けても…'; sway = [0.06 * E(f), 0, 0, 0]; }
      else if (k === 6) { const w = Math.sin(Math.PI * Math.min(1, f * 1.15)), s1 = Math.sin(f * Math.PI * 4), s2 = Math.sin(f * Math.PI * 3 + 1.1), s3 = Math.sin(f * Math.PI * 2 + 0.4);
        sway = [0.06 * (1 - E((f - 0.85) / 0.15)), R(14) * s1 * w, R(12) * s3 * w, R(16) * s2 * w]; msg = 'カメラは水平と向きを保つ（パン・ロールで打ち消す。ソフトリミットはロール±47°・パン±60°）'; }
      if (k === 5 && u < 0.05 && !a.framed) { a.framed = true; frameBox([-0.22, -0.17, -0.30], [0.22, 0.08, 0.24], [0.40, 0.12, -0.91], 1.1); }
      m4.gim.tilt = tilt; m4Sway(...sway);
      const st = $('#m4GimState'); if (st && msg && st.textContent !== msg) st.textContent = msg;
      if (k >= T.length) { m4.gim.tilt = 0; m4Sway(0, 0, 0, 0); m4.act = null; syncM4Chips(); }
    }
  }
  if (m4LaserStep(dt)) dirty = true;
  if (dirty) S.shadowDirty = S.csDirty = S.aoDirty = true;
}
function m4FrameFolded() { if (m4._framedFold) return; m4._framedFold = true; frameBox([-0.065, -0.16, -0.17], [0.065, -0.03, 0.12], [0.62, 0.42, -0.66], 1.15); setTimeout(() => { m4._framedFold = false; }, 50); }

// ---------- 起動 ----------
function initM4() {
  for (const b of $$('#m4Chips [data-m4]')) b.addEventListener('click', () => m4Action(b.dataset.m4));
  m4.person = buildPerson(); m4.person.position.set(0.42, -0.158, 0.34); m4.person.visible = false; scene.add(m4.person);
  m4.ghost = pd6bQuadGhost(); m4.ghost.position.set(-0.62, -0.158 + 0.156, -0.22); m4.ghost.visible = false; scene.add(m4.ghost);
  m4.target = buildPerson(); m4.target.visible = false; scene.add(m4.target);
  // 4T/4E とアクセサリー: 共有リンク（m4v・acc・部品）が最優先。共有リンクで m4v が無ければ 4T。ふつうに開いたときはこのタブで最後に見た方
  const q = new URLSearchParams(location.search), shared = SHARE_KEYS.some(k => q.has(k));
  let v = q.get('m4v'); if (v !== 't' && v !== 'e') { v = 't'; if (!shared) { try { if (sessionStorage.getItem('drone3d.m4variant') === 'e') v = 'e'; } catch (e) {} } }
  const pk = q.get('p') || q.get('iso'), pv = pk && PARTS[pk] && PARTS[pk].variant; if (pv === 't' || pv === 'e') v = pv;   /* 共有された部品が見える組み合わせにする */
  const acc = (q.get('acc') || '').split(','), spot = acc.includes('spot') || pv === 'spot', spk = acc.includes('spk') || pv === 'spk';
  m4SetVariant(v, false); m4SetAcc(spot, spk);
  syncM4Chips();
  focusOn([D.root], { pull: false, margin: 1.2 });
  if (!shared) setTimeout(() => { if (!$('#noteCard').dataset.kind) { renderM4About(); m4FrameDrone(null, 1.05); } }, 900);
}
