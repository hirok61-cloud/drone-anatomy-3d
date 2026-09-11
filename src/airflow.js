// ===== 気流の粒子 (GPU完結: 位置は頂点シェーダの時間関数) =====
const air = { mesh: null, N: 0, phase: [0, 0, 0, 0], mat: null, groundY: -0.158, cols: null, colT: [0, 0, 0, 0] };
// 柱の本体: 各モーターの下に開放円筒(R→0.72Rに絞る)。縁だけ濃く(フレネル)、縦に流れる縞
function buildAirColumns() {
  air.cols = D.motors.map((mo) => {
    const geo = new THREE.CylinderGeometry(0.150, 0.105, 0.30, 48, 1, true).translate(0, 0.043 - 0.15, 0);
    const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: { uColor: { value: new THREE.Color(0x2f6fe8) }, uT: { value: 0 }, uK: { value: 0 }, uA: { value: 1 }, uGroundY: { value: -0.158 } },
      vertexShader: `uniform float uGroundY; varying vec2 vUv; varying vec3 vN, vV; varying float vG; void main(){ vUv = uv; vec4 wp = modelMatrix * vec4(position, 1.0); wp.y = max(wp.y, uGroundY + 0.003); vG = smoothstep(uGroundY, uGroundY + 0.07, wp.y); vec4 mv = viewMatrix * wp; vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform vec3 uColor; uniform float uT, uK, uA; varying vec2 vUv; varying vec3 vN, vV; varying float vG;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        void main(){ float fr = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.0);
          float stripe = smoothstep(0.55, 1.0, hash(vec2(floor(vUv.x * 40.0), floor(vUv.y * 6.0 + uT))));
          float a = uA * uK * (0.03 + 0.09 * fr) * (0.6 + 0.4 * stripe) * smoothstep(0.0, 0.25, vUv.y) * vG * (1.0 - 0.35 * smoothstep(0.85, 1.0, vUv.y));
          gl_FragColor = vec4(uColor, a); }` });
    const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; m.renderOrder = 3; m.visible = false;
    m.userData.noShadow = m.userData.noPart = m.userData.noPick = m.userData.noAO = true; mo.group.add(m); return m;
  });
}
function buildAirflow(N) {
  if (air.mesh) { air.mesh.geometry.dispose(); }
  const NR = 4;
  const geo = new THREE.InstancedBufferGeometry().copy(new THREE.PlaneGeometry(1, 1)); geo.instanceCount = N * NR;
  const seed = new Float32Array(N * NR * 4);
  for (let i = 0; i < N * NR; i++) seed.set([i % NR, Math.random(), 0.55 + 0.45 * Math.random(), Math.random() * 6.2832], i * 4);   // 縁寄せ
  geo.setAttribute('seed', new THREE.InstancedBufferAttribute(seed, 4));
  if (!air.mat) air.mat = new THREE.ShaderMaterial({
    uniforms: { uPhase: { value: new THREE.Vector4() }, uRpm: { value: new THREE.Vector4() }, uDir: { value: new THREE.Vector4(1, -1, 1, -1) }, uRotor: { value: [0, 1, 2, 3].map(() => new THREE.Matrix4()) },
      uWind: { value: new THREE.Vector3() }, uR: { value: 0.152 }, uSize: { value: new THREE.Vector2(0.0016, 0.04) }, uColor: { value: new THREE.Color(0x3b7df7) }, uAlpha: { value: 0.30 }, uGroundY: { value: -0.158 },
      tDepth: { value: null }, uCam: { value: new THREE.Vector2(0.02, 40) }, uRes: { value: new THREE.Vector2(1, 1) }, uSoft: { value: 0.02 }, uTime: { value: 0 } },
    vertexShader: `attribute vec4 seed; uniform vec4 uPhase, uRpm, uDir; uniform mat4 uRotor[4]; uniform vec3 uWind; uniform float uR, uGroundY, uTime; uniform vec2 uSize;
      varying float vA; varying vec2 vUv; varying float vDepth;
      vec3 flow(float life, float r0, float a0, float dir, float s) {
        float y, c;
        if (life < 0.22) { float t = life / 0.22; y = 0.043 + 0.05 * (1.0 - t) * (1.0 - t); c = mix(1.25, 1.0, t); }   // 上から吸い込まれて円盤へ収束
        else { float l = (life - 0.22) / 0.78; y = 0.043 + mix(0.006, -0.42, l); c = mix(1.0, 0.70, min(1.0, (0.043 - y) / 0.30)); }
        float rel = y - 0.043;
        float a = a0 + dir * (2.2 * max(0.0, -rel) + uTime * 0.2);
        return vec3(cos(a) * r0 * uR * c, y, sin(a) * r0 * uR * c);
      }
      void main() {
        int k = int(seed.x + 0.5); float rpm = uRpm[k], dir = uDir[k]; float s = rpm / 9000.0;
        float life = fract(seed.y + uPhase[k]);
        vec3 p0 = flow(life, seed.z, seed.w, dir, s), p1 = flow(life - 0.015, seed.z, seed.w, dir, s);
        vec4 w0 = uRotor[k] * vec4(p0, 1.0), w1 = uRotor[k] * vec4(p1, 1.0);
        float down = max(0.0, 0.043 - p0.y); w0.xyz += uWind * down * 0.6; w1.xyz += uWind * down * 0.6;
        // 床に当たると外へ広がる
        vec3 rc = (uRotor[k] * vec4(0.0, 0.043, 0.0, 1.0)).xyz; float g = clamp((uGroundY + 0.035 - w0.y) / 0.035, 0.0, 1.0);
        vec2 rad = normalize(w0.xz - rc.xz + 1e-5); w0.xz += rad * g * g * 0.16; w1.xz += rad * g * g * 0.16; w0.y = max(w0.y, uGroundY + 0.004); w1.y = max(w1.y, uGroundY + 0.004);
        vec4 v0 = viewMatrix * w0, v1 = viewMatrix * w1;
        vec2 d = v0.xy - v1.xy; float dl = length(d); d = dl > 1e-6 ? d / dl : vec2(0.0, 1.0); vec2 n = vec2(-d.y, d.x);
        vec3 vp = v0.xyz + vec3(d * position.x * uSize.y * (0.3 + s) + n * position.y * uSize.x, 0.0);
        float rim = exp(-pow((seed.z - 0.8) / 0.2, 2.0));
        vA = s * smoothstep(0.0, 0.06, life) * (1.0 - smoothstep(0.45, 0.95, life)) * step(600.0, rpm) * (1.0 - g * 0.5) * (0.45 + 0.55 * rim);
        vUv = uv; vDepth = -vp.z; gl_Position = projectionMatrix * vec4(vp, 1.0);
      }`,
    fragmentShader: `uniform vec3 uColor; uniform float uAlpha, uSoft; uniform sampler2D tDepth; uniform vec2 uCam, uRes; varying float vA; varying vec2 vUv; varying float vDepth;
      #include <packing>
      void main() {
        float a = (1.0 - smoothstep(0.3, 1.0, length(vUv * 2.0 - 1.0))) * vA;
        #ifdef SOFT
          float z = texture2D(tDepth, gl_FragCoord.xy / uRes).x; float sceneD = -perspectiveDepthToViewZ(z, uCam.x, uCam.y);
          a *= smoothstep(0.0, uSoft, sceneD - vDepth);
        #endif
        gl_FragColor = vec4(uColor, a * uAlpha); }`,
    transparent: true, depthWrite: false, depthTest: true, defines: { SOFT: '' },
  });
  const m = new THREE.Mesh(geo, air.mat); m.frustumCulled = false; m.renderOrder = 4; m.visible = false; m.userData.noShadow = true; m.userData.noPart = true; m.userData.noPick = true;
  air.mesh = m; air.N = N; return m;
}
function updateAirflow(dtSim, dtReal) {
  const m = air.mesh; if (!m) return;
  const on = S.air && S.explodeT < 0.2 && S.mode !== 'cut' && !(S.theater && S.theater.broken);
  let vis = false;
  D.motors.forEach((mo, i) => { const s = mo.rpm / RPM_MAX; if (mo.rpm > 600) vis = true; air.phase[i] = (air.phase[i] + dtSim * (0.4 + 3.6 * s)) % 1000; air.mat.uniforms.uRotor.value[i].copy(mo.group.matrixWorld); air.mat.uniforms.uRpm.value.setComponent(i, on ? mo.rpm : 0); });
  if (!air.cols && D.motors[0] && D.motors[0].group) buildAirColumns();
  if (air.cols) air.cols.forEach((c, i) => { const mo = D.motors[i]; const k = on ? mo.rpm / RPM_MAX : 0; c.material.uniforms.uK.value = k; c.visible = on && vis && mo.rpm > 600; air.colT[i] += dtSim * (1 + 3 * k); c.material.uniforms.uT.value = air.colT[i]; });
  m.visible = on && vis;
  if (!m.visible) return;
  const u = air.mat.uniforms; u.uPhase.value.set(air.phase[0], air.phase[1], air.phase[2], air.phase[3]); if (air.windOverride) u.uWind.value.copy(air.windOverride); else u.uWind.value.copy(body.v).negate(); u.uTime.value += dtSim;
  u.uCam.value.set(camera.near, camera.far); u.uRes.value.set(W * DPR, H * DPR);
}
function airflowTheme(dark) { if (air.cols) for (const c of air.cols) { c.material.uniforms.uColor.value.set(dark ? 0x8fc9ff : 0x2f6fe8); c.material.uniforms.uA.value = dark ? 1.3 : 1; c.material.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending; c.material.needsUpdate = true; }
  if (!air.mat) return; air.mat.uniforms.uColor.value.set(dark ? 0x8fc9ff : 0x3b7df7); air.mat.uniforms.uAlpha.value = dark ? 0.36 : 0.30; air.mat.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending; air.mat.needsUpdate = true; }
