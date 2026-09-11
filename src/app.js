// ===== 起動とメインループ =====
function rebuildAirflow() { const old = air.mesh; buildAirflow(Q.particles); if (old) { old.parent && old.parent.remove(old); } scenePass.particles = air.mesh; if (Q.direct) scene.add(air.mesh); airflowTheme(themeDark); }
let last = performance.now(), fpsAcc = 0, fpsN = 0, perfT = 0, lowT = 0, highT = 0;
function frame(now) { requestAnimationFrame(frame); tick(now); }
function tick(now) {
  if (now < last) now = last + 1000 / 60;
  const dtRaw = Math.max(0, (now - last) / 1000), dt = Math.min(0.05, dtRaw); last = now; fpsAcc += dtRaw; fpsN++; perfPush(dtRaw * 1000);
  stepTimeScale(dt); const dtSim = dt * S.ts;
  // カメラ
  stepCamera(dt);
  const idleFor = (now - S.lastInteract) / 1000, sinceSel = (now - S.lastSelect) / 1000;
  const wantRot = S.autoRotate && !S.camSpring && !S.camInertia && idleFor > 5 && sinceSel > 12 && body.mode === 'idle' && !reduceMotion && $('#inspector').classList.contains('open') === false && !S.question;
  controls.autoRotate = wantRot; controls.autoRotateSpeed = 0.45 * smoothstep(5, 7, idleFor);
  if (body.mode === 'free' && Math.hypot(body.px, body.pz) > 0.15 && !S.camSpring) { const target = new THREE.Vector3(body.px, controls.target.y, body.pz); controls.target.lerp(target, 1 - Math.exp(-dt / 0.6)); }
  controls.update();
  // 分解
  S.explodeT += (S.explode - S.explodeT) * (1 - Math.exp(-dt * 9)); if (Math.abs(S.explode - S.explodeT) < 0.0005) S.explodeT = S.explode; if (S.explode < 0.05) S.explodedCam = false;
  applyExplode();
  // 機体
  stepBody(dtSim, dt); if (theater.active) stepTheater(dtSim, dt); applyBody(dt);
  updateMotors(dtSim, dt); updateMoveArrow(); updateAirflow(dtSim, dt);
  if (S.mode === 'cut') updateCutPlanes();
  updateHover();
  // 影・接地影
  if (S.shadowDirty && key.castShadow) { renderer.shadowMap.needsUpdate = true; S.shadowDirty = false; }
  if (S.csDirty) { renderContactShadow(); S.csDirty = false; renderer.setClearColor(0x000000, 1); }
  backdropMat.uniforms.spotDir.value.copy(camera.position).multiplyScalar(-1).normalize();
  finishPass.uniforms.t.value = now % 1000;
  renderer.info.reset();
  const c0 = performance.now();
  if (Q.direct) { if (air.mesh && air.mesh.parent !== scene) scene.add(air.mesh); renderer.setRenderTarget(null); renderer.render(scene, camera); }
  else { if (air.mesh && air.mesh.parent === scene) scene.remove(air.mesh); composer.render(); }
  perf.cpu = performance.now() - c0;
  updateLabels(); if (S.flight) updateFlightTab();
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
window.__d = { S, body, D, theater, air, perf, cam, flyTo, focusOn, get camera() { return camera; }, get controls() { return controls; }, step(sec, fps = 60) { for (let i = 0; i < sec * fps; i++) tick(last + 1000 / fps); } };
// ---------- 起動 ----------
(async () => {
  $('#loadMsg').textContent = '照明と材質を準備しています…';
  buildList(); applyTheme(); resize();
  applyQuality(isMobile ? (HF ? 1 : 0) : 3);
  applyMode(); applyVisibility(); buildLabels(); rebuildAirflow(); initUI();
  { const vs = viewScale(); if (vs > 1) camera.position.multiplyScalar(vs); }
  renderer.setClearColor(0x000000, 1);
  $('#loadMsg').textContent = 'シェーダーをコンパイルしています…'; mark('setup');
  await warmCompile(); mark('compile');
  S.shadowDirty = S.csDirty = S.aoDirty = true;
  let t = performance.now(); composer.render(); TL.r1 = Math.round(performance.now() - t);
  requestAnimationFrame(frame);
  requestAnimationFrame(() => requestAnimationFrame(() => { mark('first'); $('#loading').classList.add('gone'); window.__droneReady = true; renderer.debug.checkShaderErrors = false; console.log('[drone3d] timeline ms', JSON.stringify(TL)); }));
})().catch(e => { console.error(e); window.__showErr('初期化エラー: ' + e.message); });
