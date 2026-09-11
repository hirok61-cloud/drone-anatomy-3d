// ===== 気流の粒子 (GPU完結: 位置は頂点シェーダの時間関数) =====
const air = { mesh: null, N: 0, phase: [0, 0, 0, 0], mat: null, groundY: -0.158 };
function buildAirflow(N) {
  if (air.mesh) { air.mesh.geometry.dispose(); }
  const NR = 4;
  const geo = new THREE.InstancedBufferGeometry().copy(new THREE.PlaneGeometry(1, 1)); geo.instanceCount = N * NR;
  const seed = new Float32Array(N * NR * 4);
  for (let i = 0; i < N * NR; i++) seed.set([i % NR, Math.random(), 0.12 + 0.83 * Math.sqrt(Math.random()), Math.random() * 6.2832], i * 4);
  geo.setAttribute('seed', new THREE.InstancedBufferAttribute(seed, 4));
  if (!air.mat) air.mat = new THREE.ShaderMaterial({
    uniforms: { uPhase: { value: new THREE.Vector4() }, uRpm: { value: new THREE.Vector4() }, uDir: { value: new THREE.Vector4(1, -1, 1, -1) }, uRotor: { value: [0, 1, 2, 3].map(() => new THREE.Matrix4()) },
      uWind: { value: new THREE.Vector3() }, uR: { value: 0.152 }, uSize: { value: new THREE.Vector2(0.0022, 0.05) }, uColor: { value: new THREE.Color(0x3b7df7) }, uAlpha: { value: 0.28 }, uGroundY: { value: -0.158 },
      tDepth: { value: null }, uCam: { value: new THREE.Vector2(0.02, 40) }, uRes: { value: new THREE.Vector2(1, 1) }, uSoft: { value: 0.02 }, uTime: { value: 0 } },
    vertexShader: `attribute vec4 seed; uniform vec4 uPhase, uRpm, uDir; uniform mat4 uRotor[4]; uniform vec3 uWind; uniform float uR, uGroundY, uTime; uniform vec2 uSize;
      varying float vA; varying vec2 vUv; varying float vDepth;
      vec3 flow(float life, float r0, float a0, float dir, float s) {
        float y = 0.043 + mix(0.006, -0.42, life);
        float rel = y - 0.043;
        float c = mix(1.0, 0.70, min(1.0, -rel / 0.30));
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
        vA = s * smoothstep(0.0, 0.10, life) * (1.0 - smoothstep(0.35, 0.95, life)) * step(600.0, rpm) * (1.0 - g * 0.5);
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
  D.motors.forEach((mo, i) => { const s = mo.rpm / RPM_MAX; if (mo.rpm > 600) vis = true; air.phase[i] = (air.phase[i] + dtSim * (0.35 + 1.4 * s)) % 1000; air.mat.uniforms.uRotor.value[i].copy(mo.group.matrixWorld); air.mat.uniforms.uRpm.value.setComponent(i, on ? mo.rpm : 0); });
  m.visible = on && vis;
  if (!m.visible) return;
  const u = air.mat.uniforms; u.uPhase.value.set(air.phase[0], air.phase[1], air.phase[2], air.phase[3]); u.uWind.value.copy(body.v).negate(); u.uTime.value += dtSim;
  u.uCam.value.set(camera.near, camera.far); u.uRes.value.set(W * DPR, H * DPR);
}
function airflowTheme(dark) { if (!air.mat) return; air.mat.uniforms.uColor.value.set(dark ? 0x8fc9ff : 0x3b7df7); air.mat.uniforms.uAlpha.value = dark ? 0.6 : 0.55; air.mat.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending; air.mat.needsUpdate = true; }
