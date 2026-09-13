// ===== ショー専用の機体 =====
// ドローンショーの機体は、この教材の主役機（空撮向けのクアッド）とは別ものになる。
// 運ぶ荷物が「映像」から「光」に変わると、形はここまで変わる、というのを1機で見せる。
//
// 寸法は国内で実際に使われている機体に合わせた（外形310mm前後・全高113〜136mm・モーター間232〜260mm・
// 5インチ級のプロペラ・500g台）。主役機（外形854mm・モーター間550mm・約2200g）と並ぶと、横幅で約1/3になる。
//   ・レッドクリフ EMO-JP（高巨創新製）: 350×318×136mm / ホイールベース232mm / 530g / LED 0〜20W / プロペラガード搭載
//   ・ドローンショー・ジャパン DSJ MODEL-X（国産）: 310×310×113mm / モーター間260mm / 560g / RGBW
// 教則が催し場所上空に求める「危害を軽減する構造」（審査要領はプロペラガードを例に挙げる）を、
// 形として見えるようにしてある。ガードの下縁がそのまま脚（着地面）で、脚は別に付いていない。
const SD = {
  root: null, built: false, leds: [], discs: [], props: [], mat: null, light: null,
  W: 0.310, WB: 0.232, HGT: 0.113, PROP: 0.127, MASS: 530,   // 外形(m) / モーター間(m) / 全高(m) / プロペラ径(m) / 質量(g)
};
function buildShowDrone(M) {
  if (SD.built) return SD.root;
  SD.built = true;
  const g = new THREE.Group();
  const MO = 0.0820;                       // モーターの x,z（対角 0.232m）
  const RG = 0.0730, TG = 0.0030;          // ガードの輪の半径 / 太さ。外形 (0.0820+0.0730)*2 = 0.310m
  const Y_LO = 0.0030, Y_HI = 0.0530;      // 下の輪 / 上の輪の高さ。下の輪の最下点が y=0（＝着地面）
  const Y_PROP = 0.0355;
  const white = new THREE.MeshStandardMaterial({ color: 0x9aa2ad, roughness: 0.66, metalness: 0.0 });   /* 夜は機体が灯りに勝ってはいけない */
  const cage = new THREE.MeshStandardMaterial({ color: 0x8d95a0, roughness: 0.90, metalness: 0.0 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2d34, roughness: 0.42, metalness: 0.6 });
  SD.mat = { white, cage, dark };
  const put = (m, x, y, z) => { m.position.set(x, y, z); m.castShadow = false; m.receiveShadow = false; m.userData.noShadow = m.userData.noPick = m.userData.noPart = true; return m; };

  // --- 胴とアーム、電池、アンテナ（白い成形品として1つにまとめる） ---
  {
    const parts = [];
    const body = rboxGeo(0.088, 0.040, 0.106, 0.013).translate(0, 0.0430, 0);
    parts.push(body);
    for (let k = 0; k < 4; k++) {                       // アームは胴と一体成形（別部品には見せない）
      const a = Math.PI / 4 + k * Math.PI / 2;
      const arm = new THREE.BoxGeometry(0.072, 0.0068, 0.0170);
      arm.translate(0.058, 0, 0); arm.rotateY(-a); arm.translate(0, 0.0235, 0);
      parts.push(arm);
    }
    parts.push(rboxGeo(0.050, 0.016, 0.064, 0.005).translate(0, 0.0700, 0.006));           // 天面の電池パック
    parts.push(cylGeo(0.0055, 0.0055, 0.046, 16).translate(0, 0.0855, 0.040));             // RTK/GNSS のアンテナ柱
    parts.push(cylGeo(0.0088, 0.0088, 0.006, 16).translate(0, 0.1100, 0.040));             // その天冠（全高 0.113m）
    g.add(put(mesh(merged(parts), white), 0, 0, 0));
  }
  // --- プロペラガード（輪が脚を兼ねる） ---
  {
    const parts = [];
    for (let k = 0; k < 4; k++) {
      const cx = (k === 0 || k === 3 ? 1 : -1) * MO, cz = (k < 2 ? 1 : -1) * MO;
      for (const y of [Y_LO, Y_HI]) parts.push(new THREE.TorusGeometry(RG, TG, 6, 40).rotateX(Math.PI / 2).translate(cx, y, cz));
      for (let s = 0; s < 5; s++) {                     // 上下の輪をつなぐ支柱。内側（アームの来る向き）は空ける
        const a = Math.atan2(-cz, -cx) + (s - 2) * 0.62 + Math.PI;
        parts.push(cylGeo(0.0019, 0.0019, Y_HI - Y_LO, 8).translate(cx + Math.cos(a) * RG, (Y_LO + Y_HI) / 2, cz + Math.sin(a) * RG));
      }
    }
    for (let k = 0; k < 4; k++) {                       // 隣り合う輪をつなぐ横棒（外周が一続きの枠になる）
      const a0 = Math.PI / 4 + k * Math.PI / 2, a1 = a0 + Math.PI / 2;
      const p0 = new THREE.Vector3(Math.cos(a0), 0, -Math.sin(a0)).multiplyScalar(MO * Math.SQRT2);
      const p1 = new THREE.Vector3(Math.cos(a1), 0, -Math.sin(a1)).multiplyScalar(MO * Math.SQRT2);
      const mid = p0.clone().add(p1).multiplyScalar(0.5), len = p0.distanceTo(p1) - RG * 1.35;
      if (len <= 0.002) continue;
      const bar = cylGeo(0.0019, 0.0019, len, 8).rotateZ(Math.PI / 2);
      bar.rotateY(Math.atan2(p1.z - p0.z, p1.x - p0.x) * -1 + Math.PI / 2);
      parts.push(bar.translate(mid.x, Y_LO, mid.z));
    }
    g.add(put(mesh(merged(parts), cage), 0, 0, 0));
  }
  // --- モーターとプロペラ ---
  {
    const parts = [];
    for (let k = 0; k < 4; k++) {
      const cx = (k === 0 || k === 3 ? 1 : -1) * MO, cz = (k < 2 ? 1 : -1) * MO;
      parts.push(cylGeo(0.0104, 0.0110, 0.0160, 20).translate(cx, 0.0270, cz));
    }
    g.add(put(mesh(merged(parts), dark), 0, 0, 0));
    const discGeo = new THREE.CircleGeometry(SD.PROP / 2, 40).rotateX(-Math.PI / 2);
    for (let k = 0; k < 4; k++) {
      const cx = (k === 0 || k === 3 ? 1 : -1) * MO, cz = (k < 2 ? 1 : -1) * MO;
      const ccw = (k === 0 || k === 2);
      const dm = (ccw ? M.propDiscCCW : M.propDiscCW).clone(); dm.opacity = 0.13; dm.blending = THREE.AdditiveBlending; dm.toneMapped = false;   /* 飛んでいる状態。ぼかし円盤で回転を表す */
      const d = new THREE.Mesh(discGeo, dm); d.renderOrder = 5;
      g.add(put(d, cx, Y_PROP, cz)); SD.discs.push(d);
    }
  }
  // --- 灯り。これが本体で、機体はそれを運ぶ台に見えるようにする ---
  {
    const dome = new THREE.SphereGeometry(0.0170, 26, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    const up = new THREE.SphereGeometry(0.0105, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    for (const [geo, y, z, r] of [[dome, 0.0180, 0, 1], [up, 0.0632, -0.028, 0.62]]) {
      const m = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 3.0, roughness: 0.35, transparent: true, opacity: 0.94 });
      const o = put(mesh(geo, m), 0, y, z); o.userData.noAO = true; o.userData.flatTint = true;
      g.add(o); SD.leds.push({ obj: o, mat: m, scale: r });
    }
    g.add(put(mesh(cylGeo(0.0162, 0.0152, 0.0068, 24), new THREE.MeshStandardMaterial({ color: 0xb9bec7, roughness: 0.55, metalness: 0.35 })), 0, 0.0225, 0));   /* 放熱のえり */
    for (const s of SD.leds) {                          // 加算スプライトの2枚重ね（主役機の航法灯と同じ組み方）
      const core = new THREE.Sprite(M.glowCore('#ffffff')); core.scale.setScalar(0.060 * s.scale);
      const halo = new THREE.Sprite(M.glowHalo('#ffffff')); halo.scale.setScalar(0.190 * s.scale);
      for (const sp of [core, halo]) { sp.renderOrder = 6; sp.material.toneMapped = false; sp.position.copy(s.obj.position); sp.position.y += s.scale > 0.8 ? -0.006 : 0.006; g.add(sp); }
      core.material.opacity = 0.92; halo.material.opacity = 0.26;
      s.core = core; s.halo = halo;
    }
  }
  // 灯りそのものを光源にする。three.js はライトの本数が変わると材質を全部コンパイルし直すので、
  // 作るのは1回だけ。消すときは intensity を 0 にしてシーンからは外さない
  { const pl = new THREE.PointLight(0xffffff, 0.0, 0.55, 2); pl.position.set(0, 0.016, 0); pl.castShadow = false;
    g.add(pl); SD.light = pl; }
  // --- 登録記号。100g以上は1機ずつ登録して表示する。台数分すべてが対象 ---
  { const d = new THREE.Mesh(new THREE.PlaneGeometry(0.030, 0.0062), M.regLabel);
    d.rotation.x = -Math.PI / 2; g.add(put(d, 0, 0.0632, 0.030)); }

  g.visible = false; g.userData.noPart = g.userData.noPick = true;
  scene.add(g); SD.root = g;
  return g;
}
// ショーの色に合わせて灯りの色を変える（隊列と同じ色にすると「あの点のひとつがこれ」と分かる）
const _sdCol = new THREE.Color();
function showDroneColor(hex) {
  if (!SD.built) return;
  _sdCol.set(hex);
  if (SD.light) SD.light.color.copy(_sdCol);
  for (const s of SD.leds) {
    s.mat.emissive.copy(_sdCol); s.mat.color.copy(_sdCol).lerp(new THREE.Color(1, 1, 1), 0.55);
    s.core.material.color.copy(_sdCol).lerp(new THREE.Color(1, 1, 1), 0.6);
    s.halo.material.color.copy(_sdCol);
  }
}
// 姿勢は主役機と同じ計算（physics.js）で動いている。その結果をそのまま写す
function showDroneFollow() {
  if (!SD.built || !SD.root.visible) return;
  SD.root.position.copy(D.root.position);
  SD.root.quaternion.copy(D.root.quaternion);
}
function showDroneOn(on) {
  if (on) buildShowDrone(M);
  if (!SD.built) return;
  SD.root.visible = !!on;
  D.root.visible = !on;
  if (SD.light) SD.light.intensity = on ? 0.55 : 0;
  if (on) showDroneFollow();
  S.shadowDirty = S.csDirty = S.aoDirty = true;
}
