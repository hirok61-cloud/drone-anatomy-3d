// ===== 起動とメインループ =====
function rebuildAirflow() { const old = air.mesh; buildAirflow(Q.particles); if (old) { old.parent && old.parent.remove(old); } scenePass.particles = air.mesh; if (Q.direct) scene.add(air.mesh); airflowTheme(themeDark); }
let last = performance.now(), fpsAcc = 0, fpsN = 0, perfT = 0, lowT = 0, highT = 0;
function frame(now) { requestAnimationFrame(frame); tick(now); }
window.renderOnce = () => tick(performance.now());   // 記念写真: 描画直後に同期で取り出すため
function tick(now) {
  if (now < last) now = last + 1000 / 60;
  const dtRaw = Math.max(0, (now - last) / 1000), dt = Math.min(0.05, dtRaw); last = now; fpsAcc += dtRaw; fpsN++; perfPush(dtRaw * 1000);
  stepTimeScale(dt); const dtSim = dt * S.ts;
  // カメラ
  stepCamera(dt);
  if (!S.camSpring && S.springWas) S.rotFrom = now; S.springWas = !!S.camSpring;
  const rotFor = (now - Math.max(S.lastInteract, S.rotFrom || 0, S.lastSelect + 7000)) / 1000;
  const wantRot = S.autoRotate && !S.camSpring && !S.camInertia && rotFor > 5 && (body.mode === 'idle' || alive.on) && !reduceMotion && $('#inspector').classList.contains('open') === false && !S.question;
  controls.autoRotate = wantRot; controls.autoRotateSpeed = 0.45 * smoothstep(5, 7, rotFor);
  if (body.mode === 'free' && !S.camSpring) { const r = Math.hypot(body.px, body.pz); const w = smoothstep(0.08, 0.20, r); if (w > 0) controls.target.lerp(new THREE.Vector3(body.px, controls.target.y, body.pz), w * (1 - Math.exp(-dt / 0.6))); }
  controls.update();
  // 分解
  S.explodeT += (S.explode - S.explodeT) * (1 - Math.exp(-dt * 9)); if (Math.abs(S.explode - S.explodeT) < 0.0005) S.explodeT = S.explode; if (S.explode < 0.05 && S.explodedCam) { S.explodedCam = false; S.explodeFrame = true; }   // 戻したら組み上がった機体を再フレーミング
  { const fs = 0.5 + 0.45 * S.explodeT + 0.3 * Math.max(0, body.py) + (S.scale && D.personGroup && D.personGroup.visible ? 0.8 : 0) + (S.scale && typeof regGhost === 'object' && regGhost.grp && regGhost.grp.visible ? 0.45 : 0);
    const c = key.shadow.camera; if (Math.abs(c.right - fs) > 0.01) { c.left = c.bottom = -fs; c.right = c.top = fs; const kd = key.position.length(); c.near = Math.max(0.05, kd - fs * 1.8); c.far = kd + fs * 1.8; key.shadow.normalBias = 0.0006 * Math.max(1, fs / 0.5); c.updateProjectionMatrix(); S.shadowDirty = true; }   /* 枠を広げたら near/far とバイアスも合わせる(人型や区画が影から外れる・縞が出るのを防ぐ) */
    const si = 1 - 0.55 * S.explodeT; if (Math.abs((key.shadow.intensity ?? 1) - si) > 0.01) { key.shadow.intensity = si; S.shadowDirty = true; } }
  applyExplode();
  if (S.scale) stepScale();
  if (S.explodeFrame && Math.abs(S.explode - S.explodeT) < 0.01 && performance.now() - (S.explodeAt || 0) > 350) { S.explodeFrame = false; D.root.updateWorldMatrix(true, true); focusOn(D.parts.filter(p => partVisible(p) && effVisible(p.obj)).map(p => p.obj), { pull: true }); }   // 分解が落ち着いたら全体をフレーミング
  // 機体
  stepAlive(dt); stepBody(dtSim, dt); if (theater.active) stepTheater(dtSim, dt); if (whatif.active) stepWhatif(dtSim, dt); applyBody(dt);
  updateMotors(dtSim, dt); updateMoveArrow(); updateAirflow(dtSim, dt);
  if (S.expert) stepExpert(dtSim, dt);
  if (S.mode === 'cut') updateCutPlanes();
  updateHover();
  // 影・接地影
  if (S.shadowDirty && key.castShadow) { renderer.shadowMap.needsUpdate = true; S.shadowDirty = false; }
  if (S.csDirty) { renderContactShadow(); S.csDirty = false; renderer.setClearColor(0x000000, 1); }
  backdropMat.uniforms.spotDir.value.copy(camera.position).multiplyScalar(-1).normalize();
  finishPass.uniforms.t.value = now % 1000;
  renderer.info.reset();
  const c0 = performance.now();
  if (window.__d && window.__d.noRender) { /* 検証用: 状態だけ進めて描画を飛ばす */ }
  else if (Q.direct) { if (air.mesh && air.mesh.parent !== scene) scene.add(air.mesh); renderer.setRenderTarget(null); renderer.render(scene, camera); }
  else { if (air.mesh && air.mesh.parent === scene) scene.remove(air.mesh); composer.render(); }
  perf.cpu = performance.now() - c0;
  updateLabels(); stepCodex(dt); if (S.lesson) tickLessonClock(dt); if (quiz.active) stepQuiz(dt); if (S.flight) updateFlightTab();
  perfT += dtRaw;
  if (perfT > 1.5) {
    perfT = 0; perf.fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0;
    $('#perfInfo').textContent = `${perf.fps.toFixed(0)} fps · p90 ${perfP90().toFixed(1)}ms · CPU ${perf.cpu.toFixed(1)}ms · ${renderer.info.render.calls} draw · ${(renderer.info.render.triangles / 1000).toFixed(0)}k tri · 品質${S.qLevel} · ${DPR}× · 起動${TL.first || '-'}ms`;
    if (S.quality === 'auto' && now - (S.lastQChange || 0) > 4000 && renderer.info.programs.length === perf.programs) {
      const budget = 0.8 * 1000 / 60, p90 = perfP90();
      if (p90 > budget * 1.3) { lowT += 1.5; highT = 0; if (lowT >= 3 && S.qLevel > 0) { applyQuality(S.qLevel - 1); lowT = 0; } }
      else if (p90 < budget * 0.55) { highT += 1.5; lowT = 0; if (highT >= 6 && S.qLevel < 3 && !S.steppedUp) { S.steppedUp = true; applyQuality(S.qLevel + 1); highT = 0; } }
      else { lowT = 0; highT = 0; }
    }
    perf.programs = renderer.info.programs.length;
  }
}
// 検証用に最小限だけグローバルへ出す(モジュールスコープのままだとコンソールから触れないため)
window.LIST_ORDER = LIST_ORDER; window.PARTS = PARTS; window.WHATIF = WHATIF; window.WEAR = WEAR;
window.__d = { S, body, D, theater, air, perf, cam, flyTo, focusOn, __scale: scale, __codex: codex, __whatif: whatif, __alive: alive, __lesson: lesson, __expert: expert, get camera() { return camera; }, get controls() { return controls; }, step(sec, fps = 60) { for (let i = 0; i < sec * fps; i++) tick(last + 1000 / fps); } };
// ---------- 起動 ----------
(async () => {
  $('#loadMsg').textContent = '照明と材質を準備しています…';
  buildList(); applyTheme(); resize();
  applyQuality(isMobile ? (HF ? 1 : 0) : 3);
  applyMode(); applyVisibility(); buildLabels(); rebuildAirflow(); initUI(); initScale(); initCodex(); initWhatif(); initLive(); initLesson(); initExpert(); initReg(); initShare();
  { const vs = viewScale(); if (vs > 1) camera.position.multiplyScalar(vs); }
  renderer.setClearColor(0x000000, 1);
  $('#loadMsg').textContent = 'シェーダーをコンパイルしています…'; mark('setup');
  await warmCompile(); mark('compile');
  S.shadowDirty = S.csDirty = S.aoDirty = true;
  let t = performance.now(); composer.render(); TL.r1 = Math.round(performance.now() - t);
  requestAnimationFrame(frame);
  setTimeout(() => $('#loading').classList.add('gone'), 8000);   // 背面タブなどで rAF が回らないとき、覆いが残り続けないように
  applyShare();   /* 共有リンクの読み戻しは、部品も材質もそろってから */
  requestAnimationFrame(() => requestAnimationFrame(() => { mark('first'); $('#loading').classList.add('gone'); window.__droneReady = true; renderer.debug.checkShaderErrors = false; console.log('[drone3d] timeline ms', JSON.stringify(TL)); }));
})().catch(e => { console.error(e); window.__showErr('初期化エラー: ' + e.message); });
