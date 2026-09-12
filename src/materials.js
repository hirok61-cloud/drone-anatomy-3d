// ===== 手続き生成テクスチャと材質 (v2: 製品レンダリング品質) =====
function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function mulberry(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const smoothstepJS = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

let MAX_ANISO = 8;
function canvasTex(c, { repeat = [1, 1], srgb = true, aniso = MAX_ANISO, wrap = true, offset = null } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = wrap ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  t.repeat.set(repeat[0], repeat[1]); if (offset) t.offset.set(offset[0], offset[1]);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso; t.needsUpdate = true;
  return t;
}
// 高さ場から法線マップ(タイル前提)
function normalFromHeight(H, S, k) {
  const c = makeCanvas(S, S), g = c.getContext('2d'), img = g.createImageData(S, S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const xl = (x - 1 + S) % S, xr = (x + 1) % S, yu = (y - 1 + S) % S, yd = (y + 1) % S;
    const dx = (H[y * S + xr] - H[y * S + xl]) * k, dy = (H[yd * S + x] - H[yu * S + x]) * k;
    const len = Math.hypot(dx, dy, 1), i = (y * S + x) * 4;
    img.data[i] = (-dx / len * 0.5 + 0.5) * 255; img.data[i + 1] = (dy / len * 0.5 + 0.5) * 255; img.data[i + 2] = (1 / len * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0); return c;
}

// ---- カーボン綾織(2/2ツイル): カラー・法線・粗さ・異方性 ----
function carbonTextures() {
  const S = 256, tow = 32;
  const col = makeCanvas(S, S), rgh = makeCanvas(S, S), ani = makeCanvas(S, S);
  const cImg = col.getContext('2d').createImageData(S, S), rImg = rgh.getContext('2d').createImageData(S, S), aImg = ani.getContext('2d').createImageData(S, S);
  const H = new Float32Array(S * S), rnd = mulberry(7);
  const strand = new Float32Array(S); for (let i = 0; i < S; i++) strand[i] = 0.92 + 0.08 * Math.sin(i * 1.9) * Math.sin(i * 0.37 + 1);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = Math.floor(x / tow), j = Math.floor(y / tow), m = ((i - j) % 4 + 4) % 4, weftTop = m < 2;
    let across, along, shade;
    if (weftTop) { const yc = (j + 0.5) * tow; across = 1 - Math.pow((y - yc) / (tow / 2), 2); const i0 = i - m; const u = (x - i0 * tow) / (2 * tow); along = Math.pow(Math.sin(Math.PI * u), 0.6); shade = across * (0.55 + 0.45 * along) * strand[y % S]; }
    else { const xc = (i + 0.5) * tow; across = 1 - Math.pow((x - xc) / (tow / 2), 2); const mm = ((j - i) % 4 + 4) % 4; const j0 = j - (mm < 2 ? mm : mm - 2); const u = ((y - j0 * tow) / (2 * tow) % 1 + 1) % 1; along = Math.pow(Math.sin(Math.PI * u), 0.6); shade = across * (0.45 + 0.45 * along) * strand[x % S]; }
    shade = Math.max(0, Math.min(1, shade));
    const idx = y * S + x; H[idx] = across * (0.4 + 0.6 * along);
    const gval = 12 + 60 * shade + 5 * rnd();
    cImg.data[idx * 4] = gval * 0.94; cImg.data[idx * 4 + 1] = gval; cImg.data[idx * 4 + 2] = gval * 1.06; cImg.data[idx * 4 + 3] = 255;
    const r = 255 * (0.30 + 0.25 * (1 - shade)); rImg.data[idx * 4] = r; rImg.data[idx * 4 + 1] = r; rImg.data[idx * 4 + 2] = r; rImg.data[idx * 4 + 3] = 255;
    // 異方性: 繊維方向 (横糸=U方向 / 縦糸=V方向)、B=強さ
    aImg.data[idx * 4] = weftTop ? 255 : 128; aImg.data[idx * 4 + 1] = weftTop ? 128 : 255; aImg.data[idx * 4 + 2] = 255; aImg.data[idx * 4 + 3] = 255;
  }
  col.getContext('2d').putImageData(cImg, 0, 0); rgh.getContext('2d').putImageData(rImg, 0, 0); ani.getContext('2d').putImageData(aImg, 0, 0);
  return { col, nrm: normalFromHeight(H, S, 1.6), rgh, ani };
}
function noiseCanvas(S, lo, hi, seed = 3) {
  const c = makeCanvas(S, S), g = c.getContext('2d'), img = g.createImageData(S, S), rnd = mulberry(seed);
  for (let i = 0; i < S * S; i++) { const v = 255 * (lo + (hi - lo) * rnd()); img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255; }
  g.putImageData(img, 0, 0); return c;
}
// 巻線: 0.5mmピッチの平行線 → 法線マップ
function windingNormal() {
  const S = 128, H = new Float32Array(S * S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) H[y * S + x] = 0.5 + 0.5 * Math.cos((y / S) * Math.PI * 2 * 16);
  return normalFromHeight(H, S, 3.0);
}
// 切削アルミの旋盤目 → 法線
function brushNormal() {
  const S = 128, H = new Float32Array(S * S), rnd = mulberry(11);
  const rows = new Float32Array(S); for (let y = 0; y < S; y++) rows[y] = rnd();
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) H[y * S + x] = rows[y] * 0.6 + 0.4 * Math.sin(y * 0.9) * Math.sin(x * 0.05);
  return normalFromHeight(H, S, 0.8);
}

// ---- 基板: カラー・金属度・粗さを同時生成 ----
function pcbCanvases(w, h, title, seed, arrow = true) {
  const map = makeCanvas(w, h), met = makeCanvas(w, h), rgh = makeCanvas(w, h);
  const g = map.getContext('2d'), gm = met.getContext('2d'), gr = rgh.getContext('2d'), rnd = mulberry(seed);
  g.fillStyle = '#0f1416'; g.fillRect(0, 0, w, h); gm.fillStyle = '#000'; gm.fillRect(0, 0, w, h); gr.fillStyle = '#5a5a5a'; gr.fillRect(0, 0, w, h);
  g.strokeStyle = '#1b2628'; g.lineWidth = w * 0.006; g.lineCap = 'round';
  for (let n = 0; n < 70; n++) { let x = rnd() * w, y = rnd() * h; g.beginPath(); g.moveTo(x, y); for (let s = 0; s < 4; s++) { const d = [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]][Math.floor(rnd() * 8)]; const L = (20 + rnd() * 90) * w / 512; x += d[0] * L; y += d[1] * L; g.lineTo(x, y); } g.stroke(); }
  const pad = (x, y, r) => { g.fillStyle = '#2a3436'; g.beginPath(); g.arc(x, y, r * 1.6, 0, 7); g.fill(); g.fillStyle = '#d4b45c'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); gm.fillStyle = '#fff'; gm.beginPath(); gm.arc(x, y, r, 0, 7); gm.fill(); gr.fillStyle = '#3a3a3a'; gr.beginPath(); gr.arc(x, y, r, 0, 7); gr.fill(); };
  for (let n = 0; n < 140; n++) pad(rnd() * w, rnd() * h, w * 0.004);
  const m = 0.085 * w;
  for (const [x, y] of [[m, m], [w - m, m], [m, h - m], [w - m, h - m]]) { pad(x, y, w * 0.045); g.fillStyle = '#0b0d0e'; g.beginPath(); g.arc(x, y, w * 0.03, 0, 7); g.fill(); gm.fillStyle = '#000'; gm.beginPath(); gm.arc(x, y, w * 0.03, 0, 7); gm.fill(); }
  g.fillStyle = '#e8e9ea'; g.font = `bold ${w * 0.055}px -apple-system, Helvetica, sans-serif`; g.textAlign = 'center'; g.fillText(title, w / 2, h * 0.16);
  gr.fillStyle = '#9a9a9a'; gr.font = g.font; gr.textAlign = 'center'; gr.fillText(title, w / 2, h * 0.16);
  g.font = `${w * 0.04}px -apple-system, Helvetica, sans-serif`;
  const labels = ['M1', 'M2', 'M3', 'M4', 'UART1', 'UART2', 'GPS', 'RX', 'BAT', '5V', 'GND', 'LED'];
  for (let i = 0; i < labels.length; i++) g.fillText(labels[i], w * (0.18 + 0.64 * ((i % 4) / 3)), h * (0.34 + 0.16 * Math.floor(i / 4)));
  if (arrow) { g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(w * 0.5, h * 0.20); g.lineTo(w * 0.44, h * 0.29); g.lineTo(w * 0.56, h * 0.29); g.closePath(); g.fill(); g.font = `bold ${w * 0.05}px -apple-system, Helvetica, sans-serif`; g.fillText('F', w * 0.5, h * 0.27 + w * 0.05); }
  return { map, met, rgh };
}

function batteryLabel() {
  const w = 1024, h = 384, c = makeCanvas(w, h), g = c.getContext('2d');
  g.fillStyle = '#26282d'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#f3f4f6'; g.fillRect(0, 0, w, 88);
  g.fillStyle = '#26282d'; g.font = 'bold 52px -apple-system, Helvetica, sans-serif'; g.textAlign = 'left'; g.fillText('LiPo  6S  22.2V', 32, 64);
  g.fillStyle = '#f3f4f6'; g.font = 'bold 128px -apple-system, Helvetica, sans-serif'; g.fillText('5000', 32, 236); g.font = 'bold 60px -apple-system, Helvetica, sans-serif'; g.fillText('mAh', 380, 236);
  g.font = 'bold 72px -apple-system, Helvetica, sans-serif'; g.fillText('25C', 600, 236);
  g.fillStyle = '#9aa0a8'; g.font = '32px -apple-system, Helvetica, sans-serif'; g.fillText('111 Wh · 640 g · USE ONLY WITH A LiPo BALANCE CHARGER', 32, 320);
  g.fillStyle = '#f5b400'; g.beginPath(); g.moveTo(880, 124); g.lineTo(940, 232); g.lineTo(820, 232); g.closePath(); g.fill();
  g.fillStyle = '#26282d'; g.font = 'bold 68px -apple-system, Helvetica, sans-serif'; g.textAlign = 'center'; g.fillText('!', 880, 220);
  return c;
}
function escLabel() {
  const w = 512, h = 192, c = makeCanvas(w, h), g = c.getContext('2d');
  g.fillStyle = '#17181b'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#e6e7ea'; g.font = 'bold 60px -apple-system, Helvetica, sans-serif'; g.textAlign = 'left'; g.fillText('ESC 40A', 28, 80);
  g.font = '36px -apple-system, Helvetica, sans-serif'; g.fillStyle = '#a4a8b0'; g.fillText('BLHeli_32 · 3-6S · DShot600', 28, 144);
  return c;
}
// プロペラ: 左半分=翼A(刻印+白い印) 右半分=翼B。CCWは縞、翼端に回転方向色の帯
function propTexture(dir) {
  const W = 1024, H = 512, c = makeCanvas(W, H), g = c.getContext('2d');
  g.fillStyle = '#1a1a1d'; g.fillRect(0, 0, W, H);
  if (dir > 0) { g.strokeStyle = '#3a3b40'; g.lineWidth = 6; for (let x = -H; x < W + H; x += 34) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + H * 0.6, H); g.stroke(); } }
  const tip = dir > 0 ? '#14b8a6' : '#3b7df7';
  g.fillStyle = tip; g.fillRect(0, 0, W, Math.round(H * 0.08));              // v>0.92 = 翼端8%
  g.fillStyle = '#d5d8de'; g.fillRect(0, Math.round(H * 0.11), W / 2, Math.round(H * 0.06)); // 翼Aの先端寄りの薄い印(スロー観察用)
  const draw = (mirror) => {
    g.save(); if (mirror) { g.translate(W / 2, 0); g.scale(-1, 1); }
    g.translate(60, 400); g.rotate(-Math.PI / 2);
    g.fillStyle = '#9a9ba2'; g.font = 'bold 36px -apple-system, Helvetica, sans-serif'; g.textAlign = 'left';
    g.fillText(`12×4.5  ${dir > 0 ? 'CCW' : 'CW'}`, 0, 0); g.restore();
  };
  draw(dir < 0);
  return c;
}
// 回転ブラー円盤: 翼のシルエットを角度スミア + 翼端色のリング
function propDisc(dir) {
  const S = 512, c = makeCanvas(S, S), g = c.getContext('2d'), cx = S / 2;
  g.translate(cx, cx);
  for (let k = 0; k < 48; k++) {
    g.save(); g.rotate(k / 48 * Math.PI);
    g.fillStyle = 'rgba(22,22,26,0.045)';
    g.beginPath(); g.moveTo(-cx * 0.07, 0); g.quadraticCurveTo(cx * 0.35, -cx * 0.11, cx * 0.98, -cx * 0.02); g.quadraticCurveTo(cx * 0.35, cx * 0.11, -cx * 0.07, 0); g.fill();
    g.rotate(Math.PI); g.beginPath(); g.moveTo(-cx * 0.07, 0); g.quadraticCurveTo(cx * 0.35, -cx * 0.11, cx * 0.98, -cx * 0.02); g.quadraticCurveTo(cx * 0.35, cx * 0.11, -cx * 0.07, 0); g.fill();
    g.restore();
  }
  g.strokeStyle = dir > 0 ? 'rgba(20,184,166,0.38)' : 'rgba(59,125,247,0.38)'; g.lineWidth = S * 0.035; g.beginPath(); g.arc(0, 0, cx * 0.92, 0, Math.PI * 2); g.stroke();
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
// ベル天面の刻印(型番 + 回転方向)。ExtrudeGeometryのUV(±0.0175m)に合わせて使う
function bellTopCanvas(dir) {
  const S = 512, c = makeCanvas(S, S), g = c.getContext('2d'), cx = S / 2;
  g.fillStyle = '#2a2c30'; g.fillRect(0, 0, S, S);
  g.fillStyle = '#c9cbd0'; g.font = 'bold 34px -apple-system, Helvetica, sans-serif'; g.textAlign = 'center';
  const txt = '2814 · KV450 · ', r = cx * 0.62; g.translate(cx, cx);
  for (let i = 0; i < txt.length; i++) { g.save(); g.rotate(-Math.PI / 2 + i * 0.36); g.fillText(txt[i], 0, -r); g.restore(); }
  // 回転方向の矢印(弧)
  g.strokeStyle = dir > 0 ? '#14b8a6' : '#3b7df7'; g.lineWidth = 12; g.beginPath(); g.arc(0, 0, cx * 0.30, 0.3, 4.8, dir < 0); g.stroke();
  const ea = dir < 0 ? 0.3 : 4.8, ex = Math.cos(ea) * cx * 0.30, ey = Math.sin(ea) * cx * 0.30;
  g.fillStyle = g.strokeStyle; g.beginPath(); g.moveTo(ex, ey); g.lineTo(ex + (dir < 0 ? 22 : -22) * Math.sin(ea) * -1 + 10 * Math.cos(ea), ey + 22 * Math.cos(ea) * (dir < 0 ? 1 : -1) + 10 * Math.sin(ea)); g.lineTo(ex - 10 * Math.cos(ea), ey - 10 * Math.sin(ea)); g.closePath(); g.fill();
  g.font = 'bold 40px -apple-system, Helvetica, sans-serif'; g.fillText(dir > 0 ? 'CCW' : 'CW', 0, 14);
  return c;
}
function registrationLabel() {
  const w = 1024, h = 192, c = makeCanvas(w, h), g = c.getContext('2d');
  g.fillStyle = '#f4f4f2'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#17181b'; g.font = 'bold 118px "SF Mono", Menlo, Consolas, monospace'; g.textAlign = 'center'; g.fillText('JU 1234 5678 9012', w / 2, 128);
  g.font = '30px -apple-system, Helvetica, sans-serif'; g.fillStyle = '#5d6068'; g.fillText('登録記号（例）', w / 2, 172);
  return c;
}
function armNumber(n) {
  const w = 256, h = 128, c = makeCanvas(w, h), g = c.getContext('2d');
  g.fillStyle = '#f4f4f2'; g.fillRect(0, 0, w, h); g.fillStyle = '#17181b'; g.font = 'bold 96px -apple-system, Helvetica, sans-serif'; g.textAlign = 'center'; g.fillText('M' + n, w / 2, 98);
  return c;
}
function laminationCanvas() { const S = 64, c = makeCanvas(S, S), g = c.getContext('2d'); for (let y = 0; y < S; y += 4) { g.fillStyle = (y / 4) % 2 ? '#3b3d42' : '#26282c'; g.fillRect(0, y, S, 4); } return c; }
function strapCanvas() { const S = 64, c = makeCanvas(S, S), g = c.getContext('2d'); g.fillStyle = '#1e1f23'; g.fillRect(0, 0, S, S); g.strokeStyle = '#2c2e33'; g.lineWidth = 1; for (let i = 0; i < S; i += 4) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, S); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(S, i); g.stroke(); } return c; }
function glowCanvas(core) {
  const S = 128, c = makeCanvas(S, S), g = c.getContext('2d'), grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  if (core) { grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.35, 'rgba(255,255,255,0.6)'); grd.addColorStop(1, 'rgba(255,255,255,0)'); }
  else { grd.addColorStop(0, 'rgba(255,255,255,0.5)'); grd.addColorStop(0.3, 'rgba(255,255,255,0.15)'); grd.addColorStop(1, 'rgba(255,255,255,0)'); }
  g.fillStyle = grd; g.fillRect(0, 0, S, S); return c;
}
function groundAlpha() {
  const S = 512, c = makeCanvas(S, S), g = c.getContext('2d'), grd = g.createRadialGradient(256, 256, 0, 256, 256, 256);
  grd.addColorStop(0, '#fff'); grd.addColorStop(0.46, '#fff'); grd.addColorStop(0.93, '#000'); grd.addColorStop(1, '#000');
  g.fillStyle = grd; g.fillRect(0, 0, S, S); return c;
}

// ================= 材質 =================
function makeMaterials(maxAniso) {
  MAX_ANISO = Math.min(16, maxAniso || 8);
  const cf = carbonTextures();
  const base = { col: canvasTex(cf.col), nrm: canvasTex(cf.nrm, { srgb: false }), rgh: canvasTex(cf.rgh, { srgb: false }), ani: canvasTex(cf.ani, { srgb: false }) };
  const carbonMat = (repeat, { clearcoat = 1.0, ccRough = 0.10, normalScale = 0.7, envMul = 1.0 } = {}) => {
    const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: base.col.clone(), normalMap: base.nrm.clone(), roughnessMap: base.rgh.clone(), anisotropyMap: base.ani.clone(),
      roughness: 1, metalness: 0, anisotropy: 0.7, clearcoat, clearcoatRoughness: ccRough, normalScale: new THREE.Vector2(normalScale, normalScale), specularIntensity: 0.6, envMapIntensity: envMul });
    for (const t of [m.map, m.normalMap, m.roughnessMap, m.anisotropyMap]) { t.repeat.set(repeat[0], repeat[1]); t.needsUpdate = true; }
    return m;
  };
  const std = (o) => new THREE.MeshStandardMaterial(o), phy = (o) => new THREE.MeshPhysicalMaterial(o);
  const noiseRgh = canvasTex(noiseCanvas(256, 0.5, 0.75), { srgb: false, repeat: [4, 4] });
  const noiseBump = canvasTex(noiseCanvas(256, 0.3, 0.7, 5), { srgb: false, repeat: [6, 6] });
  const brush = canvasTex(brushNormal(), { srgb: false, repeat: [2, 8] });
  const windNrm = canvasTex(windingNormal(), { srgb: false, repeat: [1, 1] });
  const fc = pcbCanvases(1024, 1024, 'F7 FLIGHT CONTROLLER', 3, true), pdb = pcbCanvases(1024, 1024, 'PDB  120A', 9, false);
  const pcbMat = (t) => phy({ map: canvasTex(t.map, { wrap: false }), metalnessMap: canvasTex(t.met, { srgb: false, wrap: false }), roughnessMap: canvasTex(t.rgh, { srgb: false, wrap: false }), metalness: 1, roughness: 1, clearcoat: 0.5, clearcoatRoughness: 0.3 });
  const propMat = (dir) => phy({ map: canvasTex(propTexture(dir), { wrap: false, repeat: [0.5, 1] }), color: 0xffffff, roughness: 0.62, roughnessMap: noiseRgh, metalness: 0, specularIntensity: 0.55, sheen: 0.15, sheenRoughness: 0.8, sheenColor: new THREE.Color(0x5a5c62), clearcoat: 0.08, clearcoatRoughness: 0.6, side: THREE.DoubleSide });
  const M = {
    carbonPlate: carbonMat([70, 70], { envMul: 0.85 }),
    carbonArm: carbonMat([3, 15], { clearcoat: 0.9, ccRough: 0.18, normalScale: 0.45 }),   // 樹脂層で織りが沈む巻き管
    carbonLeg: carbonMat([2, 11], { clearcoat: 0.9, ccRough: 0.18, normalScale: 0.45 }),
    carbonMast: carbonMat([2, 6], { clearcoat: 0.9, ccRough: 0.18, normalScale: 0.45 }),
    carbonEdge: std({ color: 0x141416, roughness: 0.75, metalness: 0 }),
    alu: phy({ color: 0xe8eaec, metalness: 1, roughness: 0.30, anisotropy: 0.55, anisotropyRotation: Math.PI / 2, normalMap: brush, normalScale: new THREE.Vector2(0.15, 0.15) }),
    aluBrushDark: phy({ color: 0x9a9ea6, metalness: 1, roughness: 0.45, anisotropy: 0.5, anisotropyRotation: Math.PI / 2, normalMap: brush, normalScale: new THREE.Vector2(0.15, 0.15) }),
    aluDark: phy({ color: 0x3a3d44, metalness: 0.6, roughness: 0.46, specularIntensity: 1.0, anisotropy: 0.35 }),
    aluOrange: phy({ color: 0xe0561f, metalness: 0.75, roughness: 0.40, anisotropy: 0.45 }),
    steel: phy({ color: 0xc7c9ca, metalness: 1, roughness: 0.15, anisotropy: 0.6 }),
    steelBlack: phy({ color: 0x3a3c40, metalness: 1, roughness: 0.38 }),
    copper: phy({ color: 0xf2b78f, metalness: 1, roughness: 0.28, clearcoat: 1.0, clearcoatRoughness: 0.12, normalMap: windNrm, normalScale: new THREE.Vector2(0.6, 0.6) }),
    magnet: std({ color: 0x2e3135, metalness: 0.9, roughness: 0.62 }),
    lamination: std({ map: canvasTex(laminationCanvas(), { repeat: [24, 4] }), metalness: 0.7, roughness: 0.55 }),
    plasticBlack: phy({ color: 0x2b2d32, roughness: 0.5, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.3 }),
    plasticGray: phy({ color: 0xd8dade, roughness: 0.45, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.25 }),
    plasticWhite: std({ color: 0xf1f2f4, roughness: 0.6 }),
    tpu: std({ color: 0x2a2c31, roughness: 0.85 }),
    rubber: std({ color: 0x1b1c1e, roughness: 0.92, metalness: 0 }),
    damper: phy({ color: 0xcfd4da, roughness: 0.5, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.3, sheen: 0.4, sheenRoughness: 0.6, sheenColor: new THREE.Color(0xffffff) }),
    heatShrink: phy({ color: 0x1f2124, roughness: 0.38, clearcoat: 0.25, clearcoatRoughness: 0.35 }),
    wireBlack: phy({ color: 0x1e1f23, roughness: 0.50, specularIntensity: 0.7 }),
    wireRed: phy({ color: 0xc2201e, roughness: 0.50, specularIntensity: 0.7 }),
    wireWhite: phy({ color: 0xe9e9ec, roughness: 0.50, specularIntensity: 0.7 }),
    wireYellow: phy({ color: 0xe0b000, roughness: 0.50, specularIntensity: 0.7 }),
    wireVertex: phy({ vertexColors: true, roughness: 0.55, specularIntensity: 0.7 }),
    xt60: phy({ color: 0xf2c200, roughness: 0.4, clearcoat: 0.4 }),
    pcbFC: pcbMat(fc), pcbPDB: pcbMat(pdb),
    pcbEdge: std({ color: 0x1d2325, roughness: 0.7 }),
    chip: std({ color: 0x1a1b1e, roughness: 0.45, metalness: 0.1 }),
    solder: phy({ color: 0xc9cbcf, metalness: 1, roughness: 0.25 }),
    connector: std({ color: 0xcfd3d8, roughness: 0.7 }),
    batteryShell: phy({ color: 0x25272c, roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.22, bumpMap: noiseBump, bumpScale: 0.0004, side: THREE.DoubleSide }),
    batteryLabel: std({ map: canvasTex(batteryLabel(), { wrap: false }), roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
    cell: std({ color: 0xb9bcc3, metalness: 0.85, roughness: 0.35 }),
    escLabel: std({ map: canvasTex(escLabel(), { wrap: false }), roughness: 0.4, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
    strap: phy({ map: canvasTex(strapCanvas(), { repeat: [10, 10] }), roughness: 0.85, sheen: 0.6, sheenRoughness: 0.7, sheenColor: new THREE.Color(0x8a8d93) }),
    propCCW: Object.assign(propMat(1), { userData: { flatTint: true } }), propCW: Object.assign(propMat(-1), { userData: { flatTint: true } }),
    propHub: phy({ color: 0x24252a, roughness: 0.55, roughnessMap: noiseRgh, clearcoat: 0.08, clearcoatRoughness: 0.6 }),
    propDiscCCW: new THREE.MeshBasicMaterial({ map: canvasTex(propDisc(1), { wrap: false }), transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }),
    propDiscCW: new THREE.MeshBasicMaterial({ map: canvasTex(propDisc(-1), { wrap: false }), transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }),
    bell: phy({ color: 0x34373d, metalness: 0.8, roughness: 0.34, anisotropy: 0.6, anisotropyRotation: Math.PI / 2, side: THREE.DoubleSide }),   // 旋盤目: ハイライトは軸方向に伸びる
    bellTopCCW: phy({ map: canvasTex(bellTopCanvas(1), { wrap: false, repeat: [1 / 0.035, 1 / 0.035], offset: [0.5, 0.5] }), metalness: 0.8, roughness: 0.34, side: THREE.DoubleSide }),
    bellTopCW: phy({ map: canvasTex(bellTopCanvas(-1), { wrap: false, repeat: [1 / 0.035, 1 / 0.035], offset: [0.5, 0.5] }), metalness: 0.8, roughness: 0.34, side: THREE.DoubleSide }),
    gpsBody: phy({ color: 0xe9eaed, roughness: 0.4, clearcoat: 0.6, clearcoatRoughness: 0.2 }),
    gpsTop: std({ map: canvasTex(gpsTop(), { wrap: false }), roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
    regLabel: std({ map: canvasTex(registrationLabel(), { wrap: false }), roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
    armNum: [1, 2, 3, 4].map(n => std({ map: canvasTex(armNumber(n), { wrap: false }), roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })),
    lens: phy({ color: 0x06080d, metalness: 0, roughness: 0.06, ior: 1.5, clearcoat: 1, clearcoatRoughness: 0.04, iridescence: 0.9, iridescenceIOR: 1.35, iridescenceThicknessRange: [120, 380], envMapIntensity: 1.4 }),
    lensRing: phy({ color: 0x2b2d33, metalness: 0.9, roughness: 0.3, anisotropy: 0.5 }),
    ledCover: phy({ color: 0xd9dde3, roughness: 0.4, transparent: true, opacity: 0.35, clearcoat: 0.6 }),
    antennaWhite: phy({ color: 0xf2f2f4, roughness: 0.4, clearcoat: 0.5 }),
    ledRed: std({ color: 0xff7070, emissive: 0xff2a1a, emissiveIntensity: 4.0, roughness: 0.3 }),
    ledGreen: std({ color: 0x9dffb0, emissive: 0x18ff4a, emissiveIntensity: 3.5, roughness: 0.3 }),
    ledWhite: std({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 3.5, roughness: 0.3 }),
    ledBlue: std({ color: 0x9ec4ff, emissive: 0x2a7bff, emissiveIntensity: 3.5, roughness: 0.3 }),
    glowCore: (color) => new THREE.SpriteMaterial({ map: canvasTex(glowCanvas(true), { wrap: false }), color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.9 }),
    glowHalo: (color) => new THREE.SpriteMaterial({ map: canvasTex(glowCanvas(false), { wrap: false }), color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true, opacity: 0.14 }),
    groundAlphaTex: canvasTex(groundAlpha(), { srgb: false, wrap: false }),
  };
  return M;
}
