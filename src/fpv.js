// ===== 機体のカメラから見る（一人称視点） =====
// 目的は3つ。①ジンバルが機体の傾きを打ち消していることを見せる ②カメラの視野は狭く、真下と真横は映らないと分からせる
// ③この映像は法令上の「目視」に含まれない（教則 3.1.2(2)2)b.）ことを、映像の中で言う。
// 実装はカメラを増やさず、本体のカメラの姿勢を main camera に写す。GTAO・輪郭線・接地影がそのまま効く。
const fpvTilt0 = () => THREE.MathUtils.degToRad(fpvTall() ? -14 : -12);   // 少し下向き。水平だと空しか映らない。縦長の画面は少しだけ伏せる(伏せすぎると地平線が隠れる)
const fpv = { on: false, stabilized: true, pan: 0, tilt: 0, drag: null, saved: null, t: 0 };
const FPV_FOV = 45;              // 縦の画角。機体に積む記録用カメラのおよその値
const FPV_PAN = THREE.MathUtils.degToRad(95);
const FPV_TILT_UP = THREE.MathUtils.degToRad(22), FPV_TILT_DOWN = THREE.MathUtils.degToRad(-88);
let _fpvCam = null;
const fpvCamObj = () => { if (!_fpvCam) { const p = partsOf('camera')[0]; _fpvCam = p && p.obj; } return _fpvCam; };
const fpvTall = () => innerWidth / Math.max(1, innerHeight) < 1.05;   // 縦長の画面は横の画角が狭い

// ジンバルは3軸。機体が傾いても、カメラだけは水平を保つ（止めると機体と一緒に傾く）。
// 打ち消しは「親の世界姿勢の逆 × 望みの世界姿勢」で作る。オイラー角を足し引きすると、
// パンを振った先の座標系で傾きを消すことになり、首を振った状態で水平が保てない。
const _gq = new THREE.Quaternion(), _gq2 = new THREE.Quaternion(), _ge = new THREE.Euler(), _gv = new THREE.Vector3();
function updateGimbal() {
  const c = fpvCamObj(); if (!c || !c.parent) return;
  fpv.pan = clamp(fpv.pan, -FPV_PAN, FPV_PAN); fpv.tilt = clamp(fpv.tilt, FPV_TILT_DOWN, FPV_TILT_UP);   // 可動域はここで一度だけ見る(共有リンクなど、ドラッグ以外から入ることもある)
  if (!fpv.stabilized) { c.rotation.set(clamp(fpv.tilt, -Math.PI / 2 + 0.01, Math.PI / 2 - 0.01), fpv.pan, 0, 'YXZ'); return; }   // 止めると機体の姿勢がそのまま乗る
  c.parent.updateWorldMatrix(true, false);
  c.parent.getWorldQuaternion(_gq);
  const f = _gv.set(0, 0, -1).applyQuaternion(_gq);                       // 機体の前方向
  const yaw = Math.atan2(-f.x, -f.z);                                     // その水平成分＝機首の方位（ヨーだけは機体に追随させる）
  _gq2.setFromEuler(_ge.set(fpv.tilt, yaw + fpv.pan, 0, 'YXZ'));          // 望みの世界姿勢: 水平のまま、パンとチルトだけ
  c.quaternion.copy(_gq).invert().multiply(_gq2);
}

// ---------- カメラで見るための舞台 ----------
// 何もない床の上では、ジンバルの働きも視野の狭さも分からない。
// 広い地面と地平線、離着陸場の印、距離の輪、実寸の人型とコーンを置いて、見えるものと距離の目安をつくる。
const FPV_FAR = 30;                 // 遠くの地面の半径(m)。カメラのfar=40より内側に収める
const FPV_FAR_IN = 2.6;             // 内径。床(半径2.8m)と重ねる。離すと隙間から背景の下半分がのぞいて暗い帯になる
const FPV_RINGS = [3, 10, 20];      // 距離の輪。遠いものほど太くしないと、伏せ角が浅くて線が消える
const fpvStage = { grp: null, groundWas: null, rings: [], marks: [], labels: [] };
// 遠くの地面。近くの床(半径2.8m)は縁で消えるので、その外にもう一枚広い円盤を敷く。
// 地平線ができると、ジンバルを止めたときの傾きも、空もようの雲の下端も読めるようになる。
// 材質は床と同じにして、遠さは頂点色の掛け算(かすみ)だけで出す。こうすると継ぎ目の色が必ず合う
const farGround = { mesh: null };
function farGroundBuild() {
  if (farGround.mesh) return;
  const geo = new THREE.RingGeometry(FPV_FAR_IN, FPV_FAR, 72, 16);
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 3), 3));
  const mat = new THREE.MeshPhysicalMaterial({ color: 0xe4e6ea, roughness: 0.75, metalness: 0, clearcoat: 0.25, clearcoatRoughness: 0.45, vertexColors: true, side: THREE.DoubleSide });
  const m = new THREE.Mesh(geo, mat);
  m.rotation.x = -Math.PI / 2; m.position.y = -0.172; m.renderOrder = -2; m.receiveShadow = false; m.visible = false;
  m.userData.noPart = m.userData.noPick = m.userData.noAO = m.userData.noShadow = true;
  scene.add(m); farGround.mesh = m; farGroundTheme();
}
function farGroundOn(on) { farGroundBuild(); if (farGround.mesh.visible !== !!on) { farGround.mesh.visible = !!on; S.shadowDirty = S.csDirty = S.aoDirty = true; } }
function farGroundTheme() {
  const far = farGround.mesh; if (!far) return;
  far.material.color.copy(groundMat.color);   // 近くの床と必ず同じ色にする（空もようは床の色も変える）
  const one = new THREE.Color(1, 1, 1), haze = themeDark ? new THREE.Color(3.1, 3.3, 3.8) : new THREE.Color(0.70, 0.74, 0.83);
  const pos = far.geometry.attributes.position, col = far.geometry.attributes.color, c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const r = Math.hypot(pos.getX(i), pos.getY(i));
    c.copy(one).lerp(haze, clamp((1 / FPV_FAR_IN - 1 / Math.max(r, FPV_FAR_IN)) / (1 / FPV_FAR_IN - 1 / FPV_FAR), 0, 1));
    col.setXYZ(i, c.r, c.g, c.b);
  }
  col.needsUpdate = true;
}
function fpvStageBuild() {
  if (fpvStage.grp) return;
  const g = new THREE.Group(); g.userData.noShadow = true;
  const flat = (mesh, y) => { mesh.rotation.x = -Math.PI / 2; mesh.position.y = y; mesh.userData.noPart = mesh.userData.noPick = mesh.userData.noAO = mesh.userData.noShadow = true; g.add(mesh); return mesh; };
  const line = (col, op) => new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, toneMapped: false, side: THREE.DoubleSide });
  // 離着陸場: 二重の輪と十字
  flat(new THREE.Mesh(new THREE.RingGeometry(0.78, 0.84, 72), line(0xe8a33d, 0.85)), -0.1548);
  flat(new THREE.Mesh(new THREE.RingGeometry(0.30, 0.33, 48), line(0xe8a33d, 0.6)), -0.1548);
  for (const a of [0, Math.PI / 2]) { const m = flat(new THREE.Mesh(new THREE.PlaneGeometry(1.40, 0.035), line(0xe8a33d, 0.5)), -0.1547); m.rotation.z = a; }
  // 距離の輪。見かけの太さ ≒ 幅 × 目の高さ ÷ 距離² なので、幅は距離の2乗で増やす
  fpvStage.rings = FPV_RINGS.map(r => {
    const w = 0.04 * (r / 3) ** 2;
    const m = flat(new THREE.Mesh(new THREE.RingGeometry(r - w / 2, r + w / 2, 160), line(0x8b939f, r > 12 ? 0.22 : 0.34)), -0.1549);
    m.userData.r = r; return m;
  });
  // 距離を床に書く。映像の中で数字が読めると、視野の広さと距離がつかめる。
  // 伏せ角が浅いほど縦に潰れるので、滑走路の数字と同じように、あらかじめ縦に伸ばして描く。
  // 真ん中を空けたいので、遠いほうは斜め前に置く
  for (const r of [3, 10]) {
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128;
    const c2 = cv.getContext('2d'); c2.fillStyle = '#aab4c4'; c2.font = 'bold 74px ui-monospace, Menlo, monospace'; c2.textAlign = 'center'; c2.textBaseline = 'middle'; c2.fillText(`${r} m`, 128, 68);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const k = r / 3, w = 0.62 * k ** 0.85, h = 0.30 * k ** 1.5, d = r - h / 2 - 0.30;
    const m = flat(new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.6, toneMapped: false, depthWrite: false })), -0.1546);
    m.userData.r = r; m.userData.d = d; fpvStage.labels.push(m);
  }
  fpvLabelsPos();
  // 3mの輪の上にコーン。前を向いたまま左右に見える位置に置くと、動かしたときの流れで距離がつかめる
  for (let i = 0; i < 4; i++) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.092, 0.26, 20, 1, true), new THREE.MeshStandardMaterial({ color: 0xe8732d, roughness: 0.72, metalness: 0, side: THREE.DoubleSide }));
    cone.userData.noPart = cone.userData.noPick = cone.userData.noShadow = true; cone.castShadow = false;
    g.add(cone); fpvStage.marks.push(cone);
  }
  fpvMarksPos();
  scene.add(g); fpvStage.grp = g;
  fpvStageTheme();
}
function fpvStageTheme() {
  farGroundTheme();
  for (const m of fpvStage.rings) m.material.color.set(themeDark ? 0x8b939f : 0x69727f);
}
// 立ち位置と目印は画面の形で置き直す。縦長だと横の画角が26°ほどしかなく、外に置くと映らない
function fpvPersonPos() { if (D.personGroup) D.personGroup.position.set(fpvTall() ? 0.05 : -1.1, -0.158, fpvTall() ? -9.0 : -5.4); }   /* 縦画面は左右の上すみを数値が占めるので、人は正面（中央の空き）に置く */
function fpvMarksPos() {
  const w = fpvTall() ? 11 : 20;
  fpvStage.marks.forEach((c, i) => { const a = THREE.MathUtils.degToRad([-w, w, -180 + w, 180 - w][i]); c.position.set(Math.sin(a) * 3, -0.158 + 0.13, -Math.cos(a) * 3); });
}
function fpvLabelsPos() {
  fpvStage.labels.forEach(m => { const az = m.userData.r > 5 ? THREE.MathUtils.degToRad(fpvTall() ? 8 : 20) : 0, d = m.userData.d;
    m.position.set(Math.sin(az) * d, -0.1546, -Math.cos(az) * d); m.rotation.z = -az; });
}
function fpvStageOn(on) {
  if (on) fpvStageBuild();
  if (!fpvStage.grp) return;
  const sceneBusy = theater.active || whatif.active || descent.active;
  fpvStage.grp.visible = on && !sceneBusy;
  if (!(typeof weather === 'object' && weather.on)) farGroundOn(on && !sceneBusy);   /* 空もようが出しているときは触らない */
  if (on && !sceneBusy) {
    if (fpvStage.groundWas == null) { fpvStage.groundWas = ground.scale.x; groundScale(5.2); }
    if (D.personGroup) { fpvStage.personWas = D.personGroup.visible; D.personGroup.visible = true; fpvPersonPos();   /* 縦長の画面は横の画角が狭い。近いと人だけが大写しになる */ if (D.personGroup.userData.face) D.personGroup.userData.face(0, 0); if (D.personGroup.userData.rest) D.personGroup.userData.rest(); }
  } else {
    if (fpvStage.groundWas != null) { groundScale(fpvStage.groundWas); fpvStage.groundWas = null; }
    if (D.personGroup && fpvStage.personWas != null) { D.personGroup.visible = fpvStage.personWas; D.personGroup.position.set(-0.50, -0.158, -0.48); fpvStage.personWas = null; }
  }
  S.shadowDirty = S.csDirty = S.aoDirty = true;
}

function fpvExit() { if (fpv.on) { segSet($('#viewCol'), 'v', 'iso'); S.view = 'iso'; fpvOn(false); } }
function fpvOn(on) {
  on = !!on;
  if (on === fpv.on) return;
  if (on) {
    stopOthers('fpv');   /* 劇場・もしも・降ろし方・重さ・専門が裏で走っていると、舞台も電源も取り合いになる */
    if (S.explode > 0.02) setExplode(0); if (S.mode === 'cut') setMode('normal');
    fpv.pan = 0; fpv.tilt = fpvTilt0();
    fpv.saved = { pos: camera.position.clone(), tgt: controls.target.clone(), fov: camera.fov, labels: S.labelsSuppressed, power: S.power, rot: controls.autoRotate };
    fpv.on = true; S.fpv = true; document.body.classList.add('fpv');
    S.camSpring = null; S.camInertia = null; controls.enabled = false; controls.autoRotate = false;
    S.labelsSuppressed = true; buildLabels();
    camera.fov = FPV_FOV; resize();
    if (S.power === 0) setPower(0.5, true);
    syncBodyMode();
    fpvStageOn(true);
    $('#fpv').hidden = false; syncDockH();   /* 操作列を畳んだ高さをHUDに先に伝える(ResizeObserverは1コマ遅れる) */
    stepFpv(0);
    if (!store.get('fpvSeen')) { store.set('fpvSeen', '1'); showToast('画面をドラッグするとジンバルの向きが変わります。床の輪は機体からの距離 3m・10m・20m です', 4600); }
  } else {
    fpv.on = false; S.fpv = false; document.body.classList.remove('fpv');
    fpv.drag = null; canvas.classList.remove('push');   /* 掴んだまま抜けても離した扱いにする */
    fpvStageOn(false);
    $('#fpv').hidden = true; syncDockH();
    fpv.pan = 0; fpv.tilt = fpvTilt0(); updateGimbal();
    const s = fpv.saved || {};
    camera.fov = s.fov || 30; controls.enabled = true;
    S.labelsSuppressed = !!s.labels; buildLabels();
    if (s.power === 0 && S.power > 0 && !theater.active && !whatif.active && !descent.active) setPower(0, true);
    resize();
    if (s.pos) flyTo(s.pos, s.tgt, 700, false); else camHome();
  }
  for (const b of $$('#viewCol button[data-v]')) b.classList.toggle('on', fpv.on ? b.dataset.v === 'fpv' : b.classList.contains('on') && b.dataset.v !== 'fpv');
}

// 毎フレーム: 本体のカメラの位置と向きを main camera に写す
function onResizedFpv() { if (fpv.on) { fpvPersonPos(); fpvMarksPos(); fpvLabelsPos(); } }
function stepFpv(dtReal) {
  if (!fpv.on) return;
  const c = fpvCamObj(); if (!c) return;
  updateGimbal();
  c.updateWorldMatrix(true, false);
  const q = c.getWorldQuaternion(new THREE.Quaternion());
  const p = c.getWorldPosition(new THREE.Vector3());
  p.addScaledVector(new THREE.Vector3(0, 0, -1).applyQuaternion(q), 0.045);   // レンズの前へ出す(筐体の中から写さない)
  camera.position.copy(p); camera.quaternion.copy(q);
  controls.target.copy(p).addScaledVector(new THREE.Vector3(0, 0, -1).applyQuaternion(q), 2);
  fpv.t += dtReal;
  if (fpv.t > 0.22) { fpv.t = 0; updateFpvHud(); }
  S.aoDirty = true;
}
function updateFpvHud() {
  const set = (id, v) => { const el = $(id); if (el) el.textContent = v; };
  const spd = Math.hypot(body.vx, body.vz);
  let hd = (-body.yaw * 180 / Math.PI) % 360; if (hd < 0) hd += 360; if (hd >= 359.5) hd = 0;
  set('#fpvAlt', `${Math.max(0, body.py).toFixed(2)} m`);
  set('#fpvSpd', `${spd.toFixed(2)} m/s`);
  set('#fpvHdg', `${hd.toFixed(0)}°`);
  set('#fpvAtt', `${(body.tz * 180 / Math.PI).toFixed(0)}° / ${(body.tx * 180 / Math.PI).toFixed(0)}°`);   // ロールは右バンクが正(専門タブのセンサーと揃える)
  set('#fpvGim', fpv.stabilized ? '水平を保つ' : '止めている');
  const g = $('#fpvGimBtn'); if (g) { g.classList.toggle('off', !fpv.stabilized); g.setAttribute('aria-pressed', String(fpv.stabilized)); g.setAttribute('aria-label', `ジンバル: ${fpv.stabilized ? '水平を保つ' : '止めている'}`); }
  const sb = $('#fpvStickBtn'); if (sb) { sb.classList.toggle('on', !!S.sticks); sb.setAttribute('aria-pressed', String(!!S.sticks)); }
  const pan = $('#fpvPan'); if (pan) pan.textContent = `${(fpv.pan * 180 / Math.PI).toFixed(0)}° / ${(fpv.tilt * 180 / Math.PI).toFixed(0)}°`;
  const fv = $('#fpvFov'); if (fv) { const h = 2 * Math.atan(Math.tan(FPV_FOV * Math.PI / 360) * innerWidth / Math.max(1, innerHeight)) * 180 / Math.PI; fv.textContent = `画角 縦${FPV_FOV}° / 横${h.toFixed(0)}°（例）`; }
}

// ---------- 画面をドラッグしてジンバルを振る ----------
function fpvDrag(e, phase) {
  if (!fpv.on) return false;
  if (phase === 'down') { fpv.drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); canvas.classList.add('push'); return true; }
  if (!fpv.drag || fpv.drag.id !== e.pointerId) return false;
  if (phase === 'move') {
    const k = 0.0042 * (camera.fov / 45);
    fpv.pan = clamp(fpv.pan - (e.clientX - fpv.drag.x) * k, -FPV_PAN, FPV_PAN);
    fpv.tilt = clamp(fpv.tilt - (e.clientY - fpv.drag.y) * k, FPV_TILT_DOWN, FPV_TILT_UP);
    fpv.drag.x = e.clientX; fpv.drag.y = e.clientY; updateFpvHud(); return true;
  }
  fpv.drag = null; canvas.classList.remove('push'); return true;
}

function initFpv() {
  const el = $('#fpv'); if (!el) return;
  el.innerHTML = `
    <div class="fpv-frame" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
    <div class="fpv-cross" aria-hidden="true"></div>
    <div class="fpv-head">
      <div class="fpv-tl"><span class="fpv-tag">機体のカメラ</span><b id="fpvAlt">—</b><span>対地高度</span><b id="fpvSpd">—</b><span>対地速度</span><b id="fpvHdg">—</b><span>機首の向き<span data-full>（離陸時0°）</span></span></div>
      <div class="fpv-tr"><b id="fpvAtt">—</b><span>機体 ピッチ / ロール</span><button id="fpvCenter" class="fpv-mini" title="ジンバルを正面に戻す"><b id="fpvPan">—</b> ↺</button><span>ジンバル パン / チルト</span><span class="fpv-sub" id="fpvFov">—</span></div>
    </div>
    <div class="fpv-foot">
      <div class="fpv-row">
        <button id="fpvGimBtn" class="fpv-btn" aria-pressed="false">ジンバル <b id="fpvGim">水平を保つ</b></button>
        <button id="fpvStickBtn" class="fpv-btn" aria-pressed="false">スティックで飛ばす</button>
        <button id="fpvOut" class="fpv-btn">外から見る</button>
      </div>
      <p class="fpv-note"><b>この映像は法令上の「目視」には含まれません</b>。双眼鏡・モニター（FPVを含む）や補助者による監視は「目視により常時監視」に当たりません。ただし残量確認などで一時的にモニターを見ることは目視飛行の範囲内とされています（教則${KYOSOKU.ver} 3.1.2）。<span data-full>映像に頼って飛ばすと目視外飛行にあたり、飛行の方法の承認（法132条の86第2項）が求められます。技能証明で飛ばすときは「目視内飛行の限定」の解除も確認します。床の輪は機体からの距離で、教則は〔一等〕の運航計画の例として、マルチローターの離陸地点を操縦者・補助者から3m以上、周囲の物件から30m以上離すことを挙げています（6.3。取扱説明書に推奨距離があればそちらに従います）。</span></p>
    </div>`;
  $('#fpvGimBtn').addEventListener('click', () => { fpv.stabilized = !fpv.stabilized; updateFpvHud(); showToast(fpv.stabilized ? 'ジンバル: 3つのモーターが機体の傾きを打ち消します' : 'ジンバル停止: カメラが機体と一緒に傾きます', 3200); });
  $('#fpvStickBtn').addEventListener('click', () => { setSticks(!S.sticks); updateFpvHud(); });
  $('#fpvCenter').addEventListener('click', () => { fpv.pan = 0; fpv.tilt = fpvTilt0(); updateGimbal(); updateFpvHud(); });
  $('#fpvOut').addEventListener('click', () => { segSet($('#viewCol'), 'v', 'iso'); S.view = 'iso'; fpvOn(false); });
  window.__fpv = { fpv, fpvOn, updateGimbal, stepFpv, fpvStage, farGround, fpvTilt0 };
}
