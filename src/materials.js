// ===== 手続き生成テクスチャと材質 =====
function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function mulberry(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function canvasTex(c, { repeat = [1, 1], srgb = true, aniso = 8, wrap = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (wrap) { t.wrapS = t.wrapT = THREE.RepeatWrapping; } else { t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; }
  t.repeat.set(repeat[0], repeat[1]);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  t.needsUpdate = true;
  return t;
}

// ---- カーボン綾織(2/2ツイル): カラー・法線・粗さマップ ----
function carbonTextures() {
  const S = 256, tow = 32;
  const col = makeCanvas(S, S), nrm = makeCanvas(S, S), rgh = makeCanvas(S, S);
  const cImg = col.getContext('2d').createImageData(S, S);
  const rImg = rgh.getContext('2d').createImageData(S, S);
  const H = new Float32Array(S * S);
  const rnd = mulberry(7);
  const strand = new Float32Array(S); for (let i = 0; i < S; i++) strand[i] = 0.92 + 0.08 * Math.sin(i * 1.9) * Math.sin(i * 0.37 + 1);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = Math.floor(x / tow), j = Math.floor(y / tow);
    const m = ((i - j) % 4 + 4) % 4;
    const weftTop = m < 2; // 横糸が上
    let across, along, shade;
    if (weftTop) {
      const yc = (j + 0.5) * tow; across = 1 - Math.pow((y - yc) / (tow / 2), 2);
      const i0 = i - m; const u = (x - i0 * tow) / (2 * tow); along = Math.pow(Math.sin(Math.PI * u), 0.6);
      shade = across * (0.55 + 0.45 * along) * strand[y % S];
    } else {
      const xc = (i + 0.5) * tow; across = 1 - Math.pow((x - xc) / (tow / 2), 2);
      const mm = ((j - i) % 4 + 4) % 4; const j0 = j - (mm < 2 ? mm : mm - 2); // 縦糸の浮きの起点
      const u = ((y - j0 * tow) / (2 * tow) % 1 + 1) % 1; along = Math.pow(Math.sin(Math.PI * u), 0.6);
      shade = across * (0.45 + 0.45 * along) * strand[x % S];
    }
    shade = Math.max(0, Math.min(1, shade));
    const idx = (y * S + x);
    H[idx] = across * (0.4 + 0.6 * along);
    const g = 18 + 70 * shade + 6 * rnd();
    cImg.data[idx * 4] = g * 0.94; cImg.data[idx * 4 + 1] = g; cImg.data[idx * 4 + 2] = g * 1.06; cImg.data[idx * 4 + 3] = 255;
    const r = 255 * (0.16 + 0.16 * (1 - shade));
    rImg.data[idx * 4] = r; rImg.data[idx * 4 + 1] = r; rImg.data[idx * 4 + 2] = r; rImg.data[idx * 4 + 3] = 255;
  }
  col.getContext('2d').putImageData(cImg, 0, 0);
  rgh.getContext('2d').putImageData(rImg, 0, 0);
  const nImg = nrm.getContext('2d').createImageData(S, S);
  const k = 2.2;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const xl = (x - 1 + S) % S, xr = (x + 1) % S, yu = (y - 1 + S) % S, yd = (y + 1) % S;
    const dx = (H[y * S + xr] - H[y * S + xl]) * k, dy = (H[yd * S + x] - H[yu * S + x]) * k;
    const len = Math.hypot(dx, dy, 1);
    const idx = (y * S + x) * 4;
    nImg.data[idx] = (-dx / len * 0.5 + 0.5) * 255; nImg.data[idx + 1] = (dy / len * 0.5 + 0.5) * 255; nImg.data[idx + 2] = (1 / len * 0.5 + 0.5) * 255; nImg.data[idx + 3] = 255;
  }
  nrm.getContext('2d').putImageData(nImg, 0, 0);
  return { col, nrm, rgh };
}

function pcbCanvas(w, h, title, seed) {
  const c = makeCanvas(w, h), g = c.getContext('2d'), rnd = mulberry(seed);
  g.fillStyle = '#101517'; g.fillRect(0, 0, w, h);
  // 配線パターン
  g.strokeStyle = '#1d2a2b'; g.lineWidth = 3; g.lineCap = 'round';
  for (let n = 0; n < 60; n++) {
    let x = rnd() * w, y = rnd() * h; g.beginPath(); g.moveTo(x, y);
    for (let s = 0; s < 4; s++) { const d = [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]][Math.floor(rnd() * 8)]; const L = 20 + rnd() * 90; x += d[0] * L; y += d[1] * L; g.lineTo(x, y); }
    g.stroke();
  }
  // ビア/パッド
  for (let n = 0; n < 120; n++) { const x = rnd() * w, y = rnd() * h; g.fillStyle = '#2a3436'; g.beginPath(); g.arc(x, y, 3.5, 0, 7); g.fill(); g.fillStyle = '#c9a54e'; g.beginPath(); g.arc(x, y, 2, 0, 7); g.fill(); }
  // 取付穴(金メッキリング)
  const m = 0.085 * w;
  for (const [x, y] of [[m, m], [w - m, m], [m, h - m], [w - m, h - m]]) { g.fillStyle = '#c9a54e'; g.beginPath(); g.arc(x, y, w * 0.045, 0, 7); g.fill(); g.fillStyle = '#0b0d0e'; g.beginPath(); g.arc(x, y, w * 0.03, 0, 7); g.fill(); }
  // シルク印刷
  g.fillStyle = '#e8e9ea'; g.font = `bold ${w * 0.055}px -apple-system, Helvetica, sans-serif`; g.textAlign = 'center';
  g.fillText(title, w / 2, h * 0.16);
  g.font = `${w * 0.04}px -apple-system, Helvetica, sans-serif`;
  const labels = ['M1', 'M2', 'M3', 'M4', 'UART1', 'UART2', 'GPS', 'RX', 'BAT', '5V', 'GND', 'LED'];
  for (let i = 0; i < labels.length; i++) g.fillText(labels[i], w * (0.18 + 0.64 * ((i % 4) / 3)), h * (0.3 + 0.16 * Math.floor(i / 4)) + h * 0.45 * 0);
  // 機首矢印
  g.beginPath(); g.moveTo(w * 0.5, h * 0.20); g.lineTo(w * 0.46, h * 0.27); g.lineTo(w * 0.54, h * 0.27); g.closePath(); g.fill();
  return c;
}

function batteryLabel() {
  const w = 512, h = 192, c = makeCanvas(w, h), g = c.getContext('2d');
  g.fillStyle = '#26282d'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#f3f4f6'; g.fillRect(0, 0, w, 44);
  g.fillStyle = '#26282d'; g.font = 'bold 26px -apple-system, Helvetica, sans-serif'; g.textAlign = 'left';
  g.fillText('LiPo  6S  22.2V', 16, 32);
  g.fillStyle = '#f3f4f6'; g.font = 'bold 64px -apple-system, Helvetica, sans-serif'; g.fillText('5000', 16, 118); g.font = 'bold 30px -apple-system, Helvetica, sans-serif'; g.fillText('mAh', 190, 118);
  g.font = 'bold 36px -apple-system, Helvetica, sans-serif'; g.fillText('25C', 300, 118);
  g.fillStyle = '#9aa0a8'; g.font = '16px -apple-system, Helvetica, sans-serif'; g.fillText('111 Wh · 640 g · USE ONLY WITH A LiPo BALANCE CHARGER', 16, 160);
  // 注意マーク
  g.fillStyle = '#f5b400'; g.beginPath(); g.moveTo(440, 62); g.lineTo(470, 116); g.lineTo(410, 116); g.closePath(); g.fill();
  g.fillStyle = '#26282d'; g.font = 'bold 34px -apple-system, Helvetica, sans-serif'; g.textAlign = 'center'; g.fillText('!', 440, 110);
  return c;
}

function escLabel() {
  const w = 256, h = 96, c = makeCanvas(w, h), g = c.getContext('2d');
  g.fillStyle = '#17181b'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#e6e7ea'; g.font = 'bold 30px -apple-system, Helvetica, sans-serif'; g.textAlign = 'left';
  g.fillText('ESC 40A', 14, 40); g.font = '18px -apple-system, Helvetica, sans-serif'; g.fillStyle = '#a4a8b0'; g.fillText('BLHeli_32 · 3-6S · DShot600', 14, 72);
  return c;
}

function propLabel(dir) {
  const S = 512, c = makeCanvas(S, S), g = c.getContext('2d');
  g.fillStyle = '#17171a'; g.fillRect(0, 0, S, S);
  if (dir < 0) { g.translate(S, 0); g.scale(-1, 1); }
  g.save(); g.translate(120, 430); g.rotate(-Math.PI / 2);
  g.fillStyle = '#8f9096'; g.font = 'bold 44px -apple-system, Helvetica, sans-serif'; g.textAlign = 'left';
  g.fillText(`12×4.5  ${dir > 0 ? 'CCW' : 'CW'}`, 0, 0); g.restore();
  return c;
}

function gpsTop() {
  const S = 256, c = makeCanvas(S, S), g = c.getContext('2d');
  g.fillStyle = '#e6e7ea'; g.fillRect(0, 0, S, S);
  g.fillStyle = '#2b2e34'; g.beginPath(); g.moveTo(128, 34); g.lineTo(104, 78); g.lineTo(152, 78); g.closePath(); g.fill();
  g.font = 'bold 30px -apple-system, Helvetica, sans-serif'; g.textAlign = 'center'; g.fillText('GNSS', 128, 150);
  g.font = '18px -apple-system, Helvetica, sans-serif'; g.fillStyle = '#6b7079'; g.fillText('COMPASS', 128, 178);
  return c;
}

function bellSlotAlpha() {
  const w = 512, h = 64, c = makeCanvas(w, h), g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = '#000';
  const n = 9; for (let k = 0; k < n; k++) { const x = (k + 0.5) * w / n; g.beginPath(); g.roundRect(x - 7, 18, 14, 28, 7); g.fill(); }
  return c;
}
function bellTopAlpha() {
  const S = 256, c = makeCanvas(S, S), g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, S, S); g.fillStyle = '#000';
  for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + Math.PI / 6, hw = 0.19; g.beginPath(); g.arc(128, 128, 116, a - hw, a + hw); g.arc(128, 128, 70, a + hw, a - hw, true); g.closePath(); g.fill(); }
  return c;
}
function propDisc() {
  const S = 256, c = makeCanvas(S, S), g = c.getContext('2d');
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, 'rgba(20,20,24,0)'); grd.addColorStop(0.18, 'rgba(20,20,24,0.05)'); grd.addColorStop(0.55, 'rgba(20,20,24,0.28)'); grd.addColorStop(0.9, 'rgba(20,20,24,0.38)'); grd.addColorStop(1, 'rgba(20,20,24,0)');
  g.fillStyle = grd; g.fillRect(0, 0, S, S);
  return c;
}
function laminationCanvas() {
  const S = 64, c = makeCanvas(S, S), g = c.getContext('2d');
  for (let y = 0; y < S; y += 4) { g.fillStyle = (y / 4) % 2 ? '#3b3d42' : '#26282c'; g.fillRect(0, y, S, 4); }
  return c;
}
function strapCanvas() {
  const S = 64, c = makeCanvas(S, S), g = c.getContext('2d');
  g.fillStyle = '#1e1f23'; g.fillRect(0, 0, S, S);
  g.strokeStyle = '#2c2e33'; g.lineWidth = 1; for (let i = 0; i < S; i += 4) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, S); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(S, i); g.stroke(); }
  return c;
}

function glowCanvas() {
  const S = 128, c = makeCanvas(S, S), g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.18, 'rgba(255,255,255,0.55)'); grd.addColorStop(0.5, 'rgba(255,255,255,0.12)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, S, S);
  return c;
}
function groundCanvas(dark) {
  const S = 1024, c = makeCanvas(S, S), g = c.getContext('2d');
  g.fillStyle = dark ? '#14171c' : '#e6e8ec'; g.fillRect(0, 0, S, S);
  g.strokeStyle = dark ? 'rgba(255,255,255,0.055)' : 'rgba(20,26,40,0.075)'; g.lineWidth = 1.5;
  for (let i = 0; i <= S; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, S); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(S, i); g.stroke(); }
  const grd = g.createRadialGradient(S / 2, S / 2, S * 0.12, S / 2, S / 2, S * 0.5);
  const bg = dark ? '20,23,28' : '230,232,236';
  grd.addColorStop(0, `rgba(${bg},0)`); grd.addColorStop(1, `rgba(${bg},1)`);
  g.fillStyle = grd; g.fillRect(0, 0, S, S);
  return c;
}
function backdropCanvas(dark) {
  const c = makeCanvas(4, 512), g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, 512);
  if (dark) { grd.addColorStop(0, '#242a33'); grd.addColorStop(0.5, '#151920'); grd.addColorStop(0.62, '#101318'); grd.addColorStop(1, '#0a0c10'); }
  else { grd.addColorStop(0, '#fbfbfc'); grd.addColorStop(0.5, '#eceef2'); grd.addColorStop(0.62, '#dfe3e9'); grd.addColorStop(1, '#d3d8e0'); }
  g.fillStyle = grd; g.fillRect(0, 0, 4, 512);
  return c;
}

function makeMaterials(maxAniso) {
  const A = Math.min(8, maxAniso || 8);
  const cf = carbonTextures();
  const carbonMap = () => canvasTex(cf.col, { aniso: A });
  const carbonNrm = () => canvasTex(cf.nrm, { srgb: false, aniso: A });
  const carbonRgh = () => canvasTex(cf.rgh, { srgb: false, aniso: A });
  const carbonMat = (repeat, { clearcoat = 0.55, ccRough = 0.22 } = {}) => {
    const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: carbonMap(), normalMap: carbonNrm(), roughnessMap: carbonRgh(), roughness: 1, metalness: 0, clearcoat, clearcoatRoughness: ccRough, normalScale: new THREE.Vector2(0.5, 0.5) });
    for (const t of [m.map, m.normalMap, m.roughnessMap]) t.repeat.set(repeat[0], repeat[1]);
    return m;
  };
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const phy = (o) => new THREE.MeshPhysicalMaterial(o);
  const M = {
    carbonPlate: carbonMat([70, 70]),
    carbonArm: carbonMat([3, 15], { clearcoat: 0.35, ccRough: 0.35 }),
    carbonLeg: carbonMat([2, 11], { clearcoat: 0.35, ccRough: 0.35 }),
    carbonMast: carbonMat([2, 6], { clearcoat: 0.35, ccRough: 0.35 }),
    alu: std({ color: 0xc4c7cc, metalness: 1, roughness: 0.34 }),
    aluDark: std({ color: 0x2e3034, metalness: 0.85, roughness: 0.42 }),
    aluOrange: std({ color: 0xe8642a, metalness: 0.7, roughness: 0.36 }),
    steel: std({ color: 0x9a9da3, metalness: 1, roughness: 0.28 }),
    copper: std({ color: 0xd98c58, metalness: 1, roughness: 0.3 }),
    magnet: std({ color: 0x33363b, metalness: 0.6, roughness: 0.5 }),
    lamination: std({ map: canvasTex(laminationCanvas(), { repeat: [24, 3], aniso: A }), metalness: 0.7, roughness: 0.55 }),
    plasticBlack: phy({ color: 0x1b1c1f, roughness: 0.5, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.3 }),
    plasticGray: phy({ color: 0xd8dade, roughness: 0.45, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.25 }),
    plasticWhite: std({ color: 0xf1f2f4, roughness: 0.6 }),
    rubber: std({ color: 0x131315, roughness: 0.92, metalness: 0 }),
    heatShrink: phy({ color: 0x121316, roughness: 0.38, clearcoat: 0.25, clearcoatRoughness: 0.35 }),
    wireBlack: std({ color: 0x141416, roughness: 0.7 }),
    wireRed: std({ color: 0xc2201e, roughness: 0.7 }),
    wireWhite: std({ color: 0xe9e9ec, roughness: 0.7 }),
    wireYellow: std({ color: 0xe0b000, roughness: 0.7 }),
    xt60: phy({ color: 0xf2c200, roughness: 0.4, clearcoat: 0.4 }),
    pcbFC: std({ map: canvasTex(pcbCanvas(512, 512, 'F7 FLIGHT CONTROLLER', 3), { aniso: A, wrap: false }), roughness: 0.55, metalness: 0.15 }),
    pcbPDB: std({ map: canvasTex(pcbCanvas(512, 512, 'PDB  120A', 9), { aniso: A, wrap: false }), roughness: 0.55, metalness: 0.15 }),
    pcbEdge: std({ color: 0x1d2325, roughness: 0.7 }),
    chip: std({ color: 0x1a1b1e, roughness: 0.45, metalness: 0.1 }),
    connector: std({ color: 0xe8e8ea, roughness: 0.6 }),
    batteryShell: phy({ color: 0x2a2c31, roughness: 0.55, clearcoat: 0.2, clearcoatRoughness: 0.5, side: THREE.DoubleSide }),
    batteryLabel: std({ map: canvasTex(batteryLabel(), { aniso: A, wrap: false }), roughness: 0.55 }),
    cell: std({ color: 0xb9bcc3, metalness: 0.85, roughness: 0.35 }),
    escLabel: std({ map: canvasTex(escLabel(), { aniso: A, wrap: false }), roughness: 0.4 }),
    strap: std({ map: canvasTex(strapCanvas(), { repeat: [10, 10], aniso: A }), roughness: 0.9 }),
    propCCW: phy({ map: canvasTex(propLabel(1), { aniso: A, wrap: false }), color: 0xffffff, roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.28, side: THREE.DoubleSide }),
    propCW: phy({ map: canvasTex(propLabel(-1), { aniso: A, wrap: false }), color: 0xffffff, roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.28, side: THREE.DoubleSide }),
    propHub: phy({ color: 0x17171a, roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.28 }),
    propDisc: new THREE.MeshBasicMaterial({ map: canvasTex(propDisc(), { wrap: false }), transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }),
    bellWall: std({ color: 0x2a2c30, metalness: 0.85, roughness: 0.4, alphaMap: canvasTex(bellSlotAlpha(), { srgb: false, aniso: A, wrap: false }), alphaTest: 0.5, side: THREE.DoubleSide }),
    bellTop: std({ color: 0x2a2c30, metalness: 0.85, roughness: 0.4, alphaMap: canvasTex(bellTopAlpha(), { srgb: false, aniso: A, wrap: false }), alphaTest: 0.5, side: THREE.DoubleSide }),
    bellSolid: std({ color: 0x2a2c30, metalness: 0.85, roughness: 0.4, side: THREE.DoubleSide }),
    gpsBody: phy({ color: 0xe9eaed, roughness: 0.4, clearcoat: 0.6, clearcoatRoughness: 0.2 }),
    gpsTop: std({ map: canvasTex(gpsTop(), { aniso: A, wrap: false }), roughness: 0.5 }),
    lens: phy({ color: 0x0a0d14, metalness: 0.3, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.6 }),
    lensRing: std({ color: 0x2b2d33, metalness: 0.9, roughness: 0.3 }),
    antennaWhite: std({ color: 0xf4f4f6, roughness: 0.5, transparent: true, opacity: 0.9 }),
    ledRed: std({ color: 0xff8080, emissive: 0xff2a1a, emissiveIntensity: 2.5, roughness: 0.3 }),
    ledGreen: std({ color: 0x9dffb0, emissive: 0x18ff4a, emissiveIntensity: 2.5, roughness: 0.3 }),
    ledWhite: std({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2.5, roughness: 0.3 }),
    ledBlue: std({ color: 0x9ec4ff, emissive: 0x2a7bff, emissiveIntensity: 2.5, roughness: 0.3 }),
    glow: (color) => new THREE.SpriteMaterial({ map: canvasTex(glowCanvas(), { wrap: false }), color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.9, toneMapped: false }),
    ground: (dark) => std({ map: canvasTex(groundCanvas(dark), { aniso: A, wrap: false }), roughness: 0.96, metalness: 0 }),
    backdrop: (dark) => new THREE.MeshBasicMaterial({ map: canvasTex(backdropCanvas(dark), { wrap: false }), side: THREE.BackSide, fog: false, toneMapped: false }),
  };
  return M;
}
