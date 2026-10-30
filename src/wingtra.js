// ===== Wingtra WingtraRAY の手続き生成 =====
// 寸法: 取扱説明書 V1.0 の寸法図（平面: 全幅1242・前後702・プロペラ直径355・モーター軸は中心から315 ／ 側面: 胴の厚み167・機首〜脚の先721・尾翼の先〜脚の先622）と、
// 公式の真上の写真から読んだ平面形（docs/reference/2026-10-30-wingtraray-shape.md）。高さ方向（胴の上下・尾翼・ウイングレットと脚の棒）は寸法図の側面図から測った。
// 座標は巡航の姿勢の mm（x=右・y=背中・z=後ろ、機首=−Z。原点＝機首から280mm後ろの翼弦面）を wtP() で m に直す。
// 置いたときは尾で立つ（機首が真上・腹が −Z）。姿勢は入れ物 pose が持ち、機体は sg（縮尺 WT_K）の中に巡航の姿勢のまま作る。
const wtP = (x, y, z) => V3(x / 1000, y / 1000, z / 1000);
function wtMaterials(M) {
  const phy = (o) => new THREE.MeshPhysicalMaterial(o), std = (o) => new THREE.MeshStandardMaterial(o);
  const sans = '-apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif';
  const decalT = (c) => std({ map: canvasTex(c, { wrap: false }), roughness: 0.4, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const decal = (c) => std({ map: canvasTex(c, { wrap: false }), roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const txt = (w, h, lines, font, col, bg = null) => pd6bCanvas(w, h, (g, W, H) => { if (bg) { g.fillStyle = bg; g.fillRect(0, 0, W, H); } g.fillStyle = col; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; lines.forEach((l, i) => g.fillText(l, W / 2, H * (i + 0.5) / lines.length + 2)); });
  const warn = pd6bCanvas(128, 128, (g, W, H) => { g.fillStyle = '#d62b2b'; g.beginPath(); g.moveTo(W / 2, 10); g.lineTo(W - 8, H - 14); g.lineTo(8, H - 14); g.closePath(); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(W / 2, 34); g.lineTo(W - 30, H - 26); g.lineTo(30, H - 26); g.closePath(); g.fill(); g.fillStyle = '#d62b2b'; g.font = 'bold 44px ' + sans; g.textAlign = 'center'; g.fillText('!', W / 2, H - 34); });
  // 文字は枠いっぱいに描く（枠の縦横比を文字に合わせ、貼る面の大きさは長さで決める）
  const measure = (text, font) => { const g = makeCanvas(8, 8).getContext('2d'); g.font = font; return g.measureText(text).width; };
  const fitTxt = (text, font, col, H = 128, pad = 4) => pd6bCanvas(Math.ceil(measure(text, font)) + pad * 2, H, (g, W2, H2) => { g.fillStyle = col; g.font = font; g.textBaseline = 'middle'; g.fillText(text, pad, H2 / 2 + 4); });
  const wtFont = `700 78px ${sans}`, wt = pd6bCanvas(Math.ceil(measure('wingtra', wtFont)) + 104, 104, (g, W2, H) => { g.strokeStyle = g.fillStyle = '#1a1a1a'; g.lineWidth = 8; g.beginPath(); g.arc(44, H / 2, 36, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.moveTo(26, H / 2 - 6); g.lineTo(44, H / 2 + 18); g.lineTo(62, H / 2 - 18); g.stroke(); g.font = wtFont; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('wingtra', 96, H / 2 + 4); });
  return {
    orange: phy({ color: 0xe8650a, roughness: 0.3, metalness: 0, clearcoat: 0.85, clearcoatRoughness: 0.16 }),   /* 鮮やかな橙・強いつや（写真） */
    dark: phy({ color: 0x2a3035, roughness: 0.52, metalness: 0.05, clearcoat: 0.3, clearcoatRoughness: 0.45 }),   /* 青みの濃い灰（機首まわり・腹・前縁の下・エレボンの後ろ・尾翼） */
    nose: phy({ color: 0x23282c, roughness: 0.1, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.04 }),   /* ノーズコーンは強い光沢 */
    black: phy({ color: 0x151618, roughness: 0.45, metalness: 0.1 }),
    carbon: phy({ color: 0x151618, roughness: 0.32, metalness: 0.25, clearcoat: 0.6, clearcoatRoughness: 0.3 }),
    bell: phy({ color: 0x18191b, metalness: 0.4, roughness: 0.36, clearcoat: 0.4, clearcoatRoughness: 0.3 }),
    prop: Object.assign(phy({ color: 0x141517, roughness: 0.5, metalness: 0, clearcoat: 0.3, clearcoatRoughness: 0.4, side: THREE.DoubleSide }), { userData: { flatTint: true } }),
    red: std({ color: 0xc0262d, metalness: 0.55, roughness: 0.32 }), green: std({ color: 0x2e9e4f, metalness: 0.55, roughness: 0.32 }),   /* 左＝赤・右＝緑（公式） */
    glass: phy({ color: 0x07090d, roughness: 0.05, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, iridescence: 0.5, iridescenceIOR: 1.3 }),
    lensRing: phy({ color: 0x1d1f23, metalness: 0.8, roughness: 0.3 }),
    lensBack: new THREE.MeshBasicMaterial({ color: 0x020305 }),
    bay: phy({ color: 0x14171a, roughness: 0.75, metalness: 0.05 }),
    warn: decal(warn),
    brandRay: decalT(fitTxt('RAY´', `italic 900 104px ${sans}`, '#1a1a1a')),
    brandWt: decalT(wt),
    regLabel: decal(txt(512, 96, ['JU 1234 5678'], 'bold 60px "SF Mono", Menlo, monospace', '#17181b', '#f4f4f2')),
    cellCode: decalT(txt(256, 64, ['1234A'], `600 40px ${sans}`, '#c8ccd0')),
    fov: new THREE.MeshBasicMaterial({ color: 0xa06cf5, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }),
    radar: new THREE.MeshBasicMaterial({ color: 0x14b8a6, transparent: true, opacity: 0.13, depthWrite: false, side: THREE.DoubleSide }),
    canopy: phy({ color: 0xf2f2ee, roughness: 0.8, metalness: 0, side: THREE.DoubleSide }),
    canopyRed: phy({ color: 0xd8342c, roughness: 0.8, metalness: 0, side: THREE.DoubleSide }),
    line: new THREE.LineBasicMaterial({ color: 0x8b939f, transparent: true, opacity: 0.8 }),
  };
}

function buildWingtra(M) {
  const K = WT_K, P = wtP, mm = (v) => v / 1000;
  const root = new THREE.Group(); root.name = 'drone';
  const pose = new THREE.Group(); pose.name = 'wtPose'; root.add(pose);   // 姿勢（立てる・寝かせる・遷移）
  const sg = new THREE.Group(); sg.name = 'wingtra'; sg.scale.setScalar(K); pose.add(sg);
  const parts = [], pick = [], wires = [], motors = [];
  const G = motorGeometries(), X = wtMaterials(M);
  const idxCount = {};
  // 分解の量は見た目の m（縮尺前）で書き、入れ物の縮尺で割って登録する
  function reg(obj, key, explode, opts = {}) {
    const idx = (idxCount[key] = (idxCount[key] || 0) + 1) - 1;
    const ex = opts.local ? explode.clone() : explode.clone().divideScalar(K);
    const p = { key, idx, obj, home: obj.position.clone(), homeQuat: obj.quaternion.clone(), explode: ex, meshes: [], coarse: !!opts.coarse, label: opts.label || null, hidden: false, anim: null };
    obj.userData.part = p;
    obj.traverse(m => { if (m.isMesh && !m.userData.noPart) { p.meshes.push(m); if (!m.userData.fine) m.userData.fine = p; if (opts.coarse) m.userData.coarse = p; if (!m.userData.noPick) pick.push(m); } });
    parts.push(p); return p;
  }
  const noPart = (o) => { o.traverse(c => { c.userData.noPart = true; c.userData.noPick = true; c.userData.noAO = true; c.castShadow = false; }); return o; };
  const atP = (o, x, y, z) => { o.position.copy(P(x, y, z)); return o; };
  const box = (w, h, d, r, mat, x, y, z) => atP(mesh(rboxGeo(mm(w), mm(h), mm(d), mm(r)), mat), x, y, z);
  const plane = (w, h, mat) => mesh(new THREE.PlaneGeometry(mm(w), mm(h)), mat, { cast: false });
  const toM = (g) => g.scale(0.001, 0.001, 0.001);

  // ---------- 形の道具（mm で作って m に直す） ----------
  // 翼型: NACA 4桁の厚み分布（後縁を閉じる係数）＋弱いキャンバー。x は翼弦比、返すのは翼弦で割った上面・下面の高さ
  const AF = (x, t, m = 0.016, p = 0.38) => { const yt = 5 * t * (0.2969 * Math.sqrt(x) - 0.1260 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1036 * x ** 4);
    const yc = x < p ? m / (p * p) * (2 * p * x - x * x) : m / ((1 - p) ** 2) * ((1 - 2 * p) + 2 * p * x - x * x); return [yc + yt, yc - yt]; };
  const INC = Math.tan(DEG(3)), incY = (z) => -(z - 140) * INC;   // 取り付け角 約3°（側面図で翼の前縁が後縁よりわずかに高い）
  // 断面を並べた面: st[i] = { x, y, le, te, t, nx, ny, f0, f1 }。翼弦は z 方向、厚みは (nx, ny) の向き。f0〜f1 は翼弦のどの範囲を作るか（エレボンの切り分け）
  function foilLoft(st, nc = 26, capA = true, capB = true) {
    const rings = []; let sides = null;   // 点ごとに上面(+1)・下面(−1)を覚えておき、塗り分けに使う（面の向きで決めると前縁のまわりがギザギザになる）
    for (const s of st) {
      const f0 = s.f0 || 0, f1 = s.f1 == null ? 1 : s.f1, ch = s.te - s.le, nx = s.nx || 0, ny = s.ny == null ? 1 : s.ny, pts = [];
      // 翼弦の分け方（両端に寄せる）。塗り分けの境目（su: 上面・sl: 下面）があれば、そこに点を置いて三角形が境目をまたがないようにする
      const cos = (a, b, n) => { const r = []; for (let k = 0; k <= n; k++) r.push(a + (b - a) * (1 - Math.cos(Math.PI * k / n)) / 2); return r; };
      const xsOf = (sp) => sp == null ? cos(f0, f1, nc) : [...cos(f0, sp, nc / 2), ...cos(sp, f1, nc / 2).slice(1)];
      const xu = xsOf(s.su), xl = xsOf(s.sl);
      const put = (xc, up) => { const [yu, yl] = AF(xc, s.t); const h = (up ? yu : yl) * ch, z = s.le + xc * ch, yo = (s.y || 0) + (s.noInc ? 0 : incY(z)) * (s.incK == null ? 1 : s.incK); pts.push([s.x + nx * h, yo + ny * h, z]); };
      for (let k = nc; k >= 0; k--) put(xu[k], true);
      const nu = pts.length; for (let k = f0 > 0 ? 0 : 1; k <= nc; k++) put(xl[k], false);
      rings.push(pts); if (!sides) sides = pts.map((_, i) => i < nu ? 1 : -1);
    }
    return stitch(rings, capA, capB, true, sides);
  }
  // 輪を順につないだ面。flipRing=true は翼（輪が上面→前→下面の順）、false は胴（輪が右→上→左→下の順）
  function stitch(rings, capA, capB, foil, sides) {
    const n = rings[0].length, pos = [], idx = [], sd = [];
    for (const r of rings) r.forEach((p, i) => { pos.push(p[0], p[1], p[2]); sd.push(sides ? sides[i] : 0); });
    for (let i = 0; i < rings.length - 1; i++) for (let j = 0; j < n; j++) { const a = i * n + j, b = i * n + (j + 1) % n, c = a + n, d = b + n; if (foil) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c); }
    const cap = (k, dir) => { const r = rings[k]; let cx = 0, cy = 0, cz = 0; for (const p of r) { cx += p[0]; cy += p[1]; cz += p[2]; } const ci = pos.length / 3; pos.push(cx / n, cy / n, cz / n); sd.push(0);
      // 面の向きは隣の輪の中心から離れる側へ
      const o = rings[k === 0 ? 1 : k - 1]; let ox = 0, oy = 0, oz = 0; for (const p of o) { ox += p[0]; oy += p[1]; oz += p[2]; } const out = [cx / n - ox / n, cy / n - oy / n, cz / n - oz / n];
      const p0 = r[0], p1 = r[1], e1 = [p0[0] - cx / n, p0[1] - cy / n, p0[2] - cz / n], e2 = [p1[0] - cx / n, p1[1] - cy / n, p1[2] - cz / n];
      const nn = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]], same = nn[0] * out[0] + nn[1] * out[1] + nn[2] * out[2] > 0;
      for (let j = 0; j < n; j++) { const a = k * n + j, b = k * n + (j + 1) % n; if (same) idx.push(ci, a, b); else idx.push(ci, b, a); } };
    if (capA) cap(0); if (capB) cap(rings.length - 1);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); if (sides) g.setAttribute('side', new THREE.Float32BufferAttribute(sd, 1)); g.setIndex(idx); g.computeVertexNormals(); return g;
  }
  // 胴の断面（超楕円・上下で丸みを変える）を Catmull-Rom でつないだ面。S = [[z, 半幅, 上端, 下端, 上の丸み, 下の丸み]]（mm）
  const crs = (S, u) => { const n = S.length - 1, i = Math.min(n - 1, Math.max(0, Math.floor(u))), t = u - i;
    const p0 = S[Math.max(0, i - 1)], p1 = S[i], p2 = S[i + 1], p3 = S[Math.min(n, i + 2)];
    return p1.map((_, k) => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t * t + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t * t * t)); };
  function podLoft(S, capA, capB, sub = 4, around = 72) {
    const rings = [], N = (S.length - 1) * sub;
    for (let k = 0; k <= N; k++) { const [z, w, top, bot, nt, nb] = crs(S, k / sub), mid = (top + bot) / 2, r = [];
      for (let j = 0; j < around; j++) { const a = j / around * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), e = s >= 0 ? nt : nb;
        r.push([w * Math.sign(c) * Math.abs(c) ** (2 / e), s >= 0 ? mid + (top - mid) * Math.abs(s) ** (2 / e) : mid - (mid - bot) * Math.abs(s) ** (2 / e), z]); }
      rings.push(r); }
    return stitch(rings, capA, capB, false);
  }
  // 三角形ごとに材質を塗り分ける（重心と面の向き、翼なら上面・下面で決める）。fn(重心x,y,z, 法線x,y,z, 上下) → 材質の番号
  function paint(g, fn) {
    const pos = g.attributes.position, nrm = g.attributes.normal, sda = g.attributes.side, idx = g.index.array, tris = [[], [], []];
    for (let t = 0; t < idx.length; t += 3) { let cx = 0, cy = 0, cz = 0, nx = 0, ny = 0, nz = 0, sd = 0;
      for (let k = 0; k < 3; k++) { const v = idx[t + k]; cx += pos.getX(v); cy += pos.getY(v); cz += pos.getZ(v); nx += nrm.getX(v); ny += nrm.getY(v); nz += nrm.getZ(v); if (sda) sd += sda.getX(v); }
      tris[fn(cx / 3, cy / 3, cz / 3, nx, ny, nz, sd / 3)].push(idx[t], idx[t + 1], idx[t + 2]); }
    const all = [].concat(...tris); g.setIndex(all); g.clearGroups(); let s = 0; tris.forEach((tr, m) => { if (tr.length) g.addGroup(s, tr.length, m); s += tr.length; }); return g;
  }
  // 右の部品の形を左へ写す（面の向きを保つ）
  const mirrorX = (g) => { const m = g.clone(); m.scale(-1, 1, 1); const ix = m.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } m.index.needsUpdate = true; m.computeVertexNormals(); return m; };

  // ---------- 平面形（右半分・mm。真上の写真から）。翼弦の前縁 le・後縁 te ----------
  const PLAN = [[0, -280, 422], [50, -264, 421], [80, -228, 400], [100, -188, 380], [120, -113, 368], [132, -90, 366], [140, -78, 361], [200, -78, 361], [260, -76, 355], [300, -74, 351], [345, -72, 344],
    [360, -71, 342], [400, -67, 335], [440, -62, 324], [480, -57, 308], [500, -54, 296], [520, -52, 284], [540, -49, 264], [560, -46, 235], [567, -45, 222], [575, -44, 204]];
  const planAt = (x) => { for (let i = 0; i < PLAN.length - 1; i++) if (x <= PLAN[i + 1][0]) { const a = PLAN[i], b = PLAN[i + 1], t = (x - a[0]) / (b[0] - a[0]); return [lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; } const l = PLAN[PLAN.length - 1]; return [l[1], l[2]]; };
  const tAt = (x) => x < 140 ? 0.15 : x < 400 ? lerp(0.137, 0.13, (x - 140) / 260) : lerp(0.13, 0.15, (x - 400) / 175);   // 翼の厚み比（付け根 約60mm・推定）
  const HINGE = 178, EL_IN = 132, EL_OUT = 567;   // エレボンのヒンジ線（後退なし）と内端・外端（写真）
  const darkTop = (x) => x < 210 ? 366 - (x - 132) * (128 / 78) : 238;   // エレボンの上面、これより後ろが濃い灰（写真の「スウッシュ」）
  const bandLE = (x) => x < 140 || x > 540 ? 0 : 125 * (1 - (x - 140) / 400);   // 翼の下面、前縁から後ろへの濃い灰の帯

  // ---------- 胴（ノーズコーン＋中央の胴）。高さは寸法図の側面図（機首の先の高さ基準を翼弦面へ −15mm）----------
  // [z, 半幅, 上端, 下端, 上の丸み, 下の丸み]。背中が盛り上がり、腹は平らぎみ（写真）。最も厚い所で167mm（寸法図）
  const POD = [[-279.6, 8, -13, -17, 2, 2], [-276, 30, -6, -23, 2, 2], [-270, 41, 5, -33, 2, 2], [-264, 50, 13, -38, 2, 2.1], [-249, 63, 32, -48, 2, 2.2], [-228, 80, 49, -58, 2, 2.3], [-218, 85, 55, -62, 2, 2.4],
    [-188, 100, 68, -69, 2.1, 2.6], [-143, 111, 80, -75, 2.1, 2.9]];
  const BODY = [[-143, 111, 80, -75, 2.1, 2.9], [-113, 118, 83, -76, 2.0, 3.0], [-77, 124, 86, -78, 1.9, 3.1], [-11, 126, 87, -79, 1.8, 3.2], [60, 127, 84, -78, 1.8, 3.2], [111, 128, 78, -76, 1.8, 3.2],
    [163, 128, 67, -73, 1.8, 3.1], [214, 125, 57, -68, 1.8, 3.0], [266, 118, 44, -61, 1.8, 2.9], [317, 108, 26, -51, 1.9, 2.7], [369, 95, 8, -38, 2.0, 2.5], [400, 80, -1, -33, 2.1, 2.3], [422, 62, -7, -30, 2.2, 2.2]];
  const bodyAt = (z) => { for (let i = 0; i < BODY.length - 1; i++) if (z <= BODY[i + 1][0]) return crs(BODY, i + clamp((z - BODY[i][0]) / (BODY[i + 1][0] - BODY[i][0]), 0, 1)); return BODY[BODY.length - 1].slice(); };
  const topAt = (z) => bodyAt(z)[2], botAt = (z) => bodyAt(z)[3];
  const bodyG = new THREE.Group();
  { // 中央の胴: 背中は橙。黒い襟（ノーズの継ぎ目から背中の中央へV字）と、腹（パラシュートのふたの後ろまで）は濃い灰。前の切り口（電池室の面）も濃い灰
    const g = paint(podLoft(BODY, true, false), (x, y, z, nx, ny, nz) => { if (z < -140 && nz < -0.5) return 1; if (ny < -0.25 && z < 343) return 1; if (z > 401) return 1; return 0; });   /* 尾の後端は上から見ても濃い灰のキャップ（写真） */
    bodyG.add(mesh(toM(g), [X.orange, X.dark]));
    // 中央の翼（胴の両脇から主翼の付け根へつながる肩と、尾の「ダックテール」）
    const st = []; for (const x of [0, 25, 50, 65, 80, 90, 100, 110, 120, 126, 132]) { const [le0, te] = planAt(x), le = Math.max(le0, -140); st.push({ x, le, te, t: x < 100 ? 0.14 : 0.15, y: 0, sl: (343 - le) / (te - le) }); }   /* 前はノーズコーンの継ぎ目より後ろから（前へ延ばすとノーズを突き抜ける） */
    const cb = paint(foilLoft(st, 30, false, true), (x, y, z, nx, ny, nz, sd) => ((sd < 0 && z < 342.5) || z > 401) ? 1 : 0);
    const cbL = mirrorX(cb); bodyG.add(mesh(toM(cb), [X.orange, X.dark])); bodyG.add(mesh(toM(cbL), [X.orange, X.dark]));   /* 左は mm のうちに写してから縮める */
  }
  // 胴の表面に沿わせた薄い面（黒い襟・背中の円盤・腹の板）。三角形ごとの塗り分けだと縁がギザギザになり、平らな板だと曲面から浮くため
  const surfY = (x, z, top) => { const [, w, tp, bt, nt, nb] = bodyAt(z), mid = (tp + bt) / 2, n = top ? nt : nb, c = Math.min(1, Math.abs(x) / w) ** (n / 2), s = Math.sqrt(Math.max(0, 1 - c * c)); return top ? mid + (tp - mid) * s ** (2 / n) : mid - (mid - bt) * s ** (2 / n); };
  function surf(at, NU, NV, top, off) { const pos = [], idx = [];   // at(u, v) → [x, z]（mm）。top=true は背中、false は腹
    for (let i = 0; i <= NU; i++) for (let j = 0; j <= NV; j++) { const [x, z] = at(i / NU, j / NV); pos.push(x, surfY(x, z, top) + (top ? off : -off), z); }
    for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) { const a = i * (NV + 1) + j, b = a + 1, c = a + NV + 1, d = c + 1; if (top) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return toM(g); }
  // 背中の黒い襟: ノーズの継ぎ目から背中の中央へ V 字に後ろへ伸び、黒い円盤を包む所まで来る（写真）
  { const hw = (z) => Math.max((-80 - z) + 4, Math.abs(z + 70) < 41 ? Math.sqrt(41 * 41 - (z + 70) ** 2) : 0);
    bodyG.add(mesh(surf((u, v) => { const z = lerp(-143.5, -29.5, u); return [lerp(-1, 1, v) * hw(z), z]; }, 40, 24, true, 0.45), X.dark)); }
  // 背中: 黒い円盤（GNSSと推定）は別部品。小さな丸・中心の合わせ目・尾翼のレール
  bodyG.add(atP(mesh(cylGeo(mm(12.5), mm(12.5), mm(2), 24), X.orange), 0, topAt(48) - 0.4, 48)); bodyG.add(atP(mesh(cylGeo(mm(8.5), mm(8.5), mm(2.4), 20), X.black), 0, topAt(48) - 0.2, 48));
  bodyG.add(mesh(surf((u, v) => [lerp(-0.6, 0.6, v), lerp(-28, 205, u)], 30, 1, true, 0.5), X.black));   // 背中の中心の合わせ目
  { const rings = []; for (let z = 211; z <= 379; z += 6) { const w = z < 250 ? 12 + (z - 211) * 0.33 : 25, y0 = topAt(z), h = w / 2; rings.push([[h, y0 - 1.5, z], [h, y0 + 2.5, z], [h - 2, y0 + 4, z], [2 - h, y0 + 4, z], [-h, y0 + 2.5, z], [-h, y0 - 1.5, z]]); }   // 尾翼のレール（1本の細長い形）
    bodyG.add(mesh(toM(stitch(rings, true, true, false)), X.dark)); }
  // 腹: 前のハッチ（用途は資料に無い）。継ぎ目の色だけ少し変える
  bodyG.add(mesh(surf((u, v) => [lerp(-70, 70, v), lerp(-99, -41, u)], 10, 14, false, 0.35), X.bay));
  sg.add(bodyG); reg(bodyG, 'body', V3(0, 0, 0), { label: P(-60, 60, 120) });

  // ---------- ノーズコーン（磁石で付く濃い灰のドーム。中に前向きレーダー）----------
  const nose = new THREE.Group(); nose.add(mesh(toM(podLoft(POD, true, false)), X.nose));
  const radar = new THREE.Group(); radar.add(box(42, 34, 3, 2, M.pcbEdge, 0, -15, -262)); radar.add(box(14, 14, 1.6, 1, M.chip, 0, -15, -264)); nose.add(radar);   // レーダーはノーズの中（ノーズといっしょに外れる）
  sg.add(nose); reg(radar, 'radar', V3(0, 0, -0.10), { label: P(0, -15, -265) }); const nosePart = reg(nose, 'noseCone', V3(0, 0, -0.16), { label: P(60, 30, -230) });

  // ---------- 主翼（右・左）と エレボン ----------
  const wingSt = [], elSt = [];
  for (const x of [132, 136, 140, 150, 160, 170, 185, 200, 210, 230, 260, 300, 330, 345, 360, 400, 440, 480, 500, 520, 540, 555, 560, 564, 567, 567.01, 571, 575]) {
    const [le, te] = planAt(x), inEl = x >= EL_IN && x <= EL_OUT, fh = (HINGE - le) / (te - le);
    const f1 = inEl ? fh : 1, bl = bandLE(x) / (te - le); wingSt.push({ x, le, te, t: tAt(x), f1, sl: clamp(bl > 0.004 ? bl : 0.02, 0.01, f1 - 0.02) });
    if (inEl && x < 567.005) { const xe = x === EL_IN ? EL_IN + 1 : x === 567 ? EL_OUT - 1 : x, f0 = fh + 0.004; elSt.push({ x: xe, le, te, t: tAt(x), f0, su: clamp((darkTop(xe) - le) / (te - le), f0 + 0.01, 0.985) }); }
  }
  const wingPaint = (x, y, z, nx, ny, nz, sd) => (sd < 0 && z < planAt(x)[0] + bandLE(x) - 0.5) ? 1 : 0;
  const wingR = paint(foilLoft(wingSt, 28, true, false), wingPaint);
  const wingL = mirrorX(wingR), wingG = new THREE.Group(); wingG.add(mesh(toM(wingR), [X.orange, X.dark])); wingG.add(mesh(toM(wingL), [X.orange, X.dark]));
  sg.add(wingG); reg(wingG, 'wing', V3(0, 0, 0), { label: P(-420, 30, 60) });
  // 文字（上面。機首側が文字の上）: 右翼に「RAY´」、左翼に「wingtra」（写真）
  { const t = plane(170, 170 * X.brandRay.map.image.height / X.brandRay.map.image.width, X.brandRay); t.rotation.x = -Math.PI / 2; atP(t, 463, AF(0.5, tAt(463))[0] * 380 + incY(144) + 0.6, 144); t.userData.noPick = true; wingG.add(t); }
  { const t = plane(155, 155 * X.brandWt.map.image.height / X.brandWt.map.image.width, X.brandWt); t.rotation.x = -Math.PI / 2; atP(t, -465, AF(0.5, tAt(465))[0] * 380 + incY(138) + 0.6, 138); t.userData.noPick = true; wingG.add(t); }
  // エレボン（ヒンジ線のまわりに回る。舵角 δ>0 で後縁が下がる）
  const elevons = [];
  { const elR = paint(foilLoft(elSt, 16), (x, y, z, nx, ny, nz, sd) => (sd > 0 && z > darkTop(x) + 0.3) ? 1 : 0);
    const hy = (() => { const [le, te] = planAt(350), xc = (HINGE - le) / (te - le), [yu, yl] = AF(xc, tAt(350)); return (yu + yl) / 2 * (te - le) + incY(HINGE); })();
    for (const sx of [1, -1]) {
      const g = sx > 0 ? elR.clone() : mirrorX(elR); g.translate(0, -hy, -HINGE);
      const hinge = new THREE.Group(); atP(hinge, 0, hy, HINGE); sg.add(hinge);
      const el = mesh(toM(g), [X.orange, X.dark]); hinge.add(el);
      for (const xx of [210, 470]) hinge.add(atP(mesh(new THREE.BoxGeometry(mm(8), mm(3), mm(10)), X.dark), sx * xx, 0, 4));   // ヒンジの金具（例）
      const ep = reg(hinge, 'elevon', V3(sx * 0.02, 0.01, 0.07), { label: sx > 0 ? P(360, 8, 80) : null }); ep.hinge = hinge;   /* ラベルの位置は部品の中の座標（ヒンジから） */
      elevons.push({ g: hinge, sx, part: ep, d: 0 });
      // サーボ（翼の中・位置は例）とリンク
      const sv = new THREE.Group(); sv.add(box(23, 12, 26, 2, M.chip, sx * 300, 2, 120)); sv.add(box(2, 2, 40, 0.8, M.steel, sx * 315, -6, 158));
      sg.add(sv); reg(sv, 'servo', V3(sx * 0.0, 0.07, 0.0), { label: sx > 0 ? P(300, 8, 120) : null });
    }
  }

  // ---------- ウイングレット（翼端から下へ曲がる・脚の棒つき）。寸法図の側面と真上の写真から ----------
  // 曲げの中心 (575, −34)・半径34 で外へ回り込み、そのあと真下へ。前縁は大きく後退しながら下り、下端は流線形の筒（キャップ）、そこから脚の棒が後ろ下へ約23°
  const wlSt = [], RB_W = 34;
  { const ARC = 7, RB = 34; for (let k = 0; k <= ARC; k++) { const ph = (k / ARC) * Math.PI / 2; wlSt.push({ ph, x: 575 + RB * Math.sin(ph), y: -RB + RB * Math.cos(ph) }); }   /* 外面が翼幅 1242〜1250 mm の端（±621〜625）に来る曲げ */
    for (const y of [-50, -70, -92, -115, -138, -160]) wlSt.push({ ph: Math.PI / 2, x: 609 - (-RB - y) * 0.03, y }); }   /* 板の下端は翼弦面から約160mm下（寸法図） */
  const wlStations = wlSt.map((s) => { const u = clamp(-s.y / 160, 0, 1), le = -44 + 216 * u ** 1.1, te = 204 + Math.max(0, -RB_W - s.y) * 0.39, ch = te - le;   /* 前縁は大きく後退しながら下りる。後縁は約24°後ろへ傾く（寸法図） */
    return { x: s.x, y: s.y + incY((le + te) / 2) * (1 - u), le, te, t: clamp(lerp(tAt(575) * 248, 20, u ** 0.6) / ch, 0.07, 0.30), nx: Math.sin(s.ph), ny: Math.cos(s.ph), noInc: true }; });
  const wlR = toM(paint(foilLoft(wlStations, 18, false, true), () => 0));
  const capR = (() => { const g = lathe([[0, -48], [6, -40], [9.5, -20], [10, 10], [8.5, 35], [5, 50], [0, 56]].map(([r, y]) => [mm(r), mm(y)]), 20); g.rotateX(Math.PI / 2 + Math.atan2(78, 186)); g.translate(mm(607), mm(-140), mm(208)); return g; })();
  const ROD0 = [607, -158, 252], ROD1 = [607, -240, 442];
  const rodGeo = (() => { const a = P(...ROD0), b = P(...ROD1), d = b.clone().sub(a), g = cylGeo(mm(4), mm(4), d.length(), 12); g.translate(0, d.length() / 2, 0); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, d.normalize())); g.translate(a.x, a.y, a.z); return g; })();
  const winglets = [], rods = [];
  for (const sx of [1, -1]) {
    const wl = new THREE.Group(); wl.add(mesh(sx > 0 ? wlR : mirrorX(wlR), X.orange)); wl.add(mesh(sx > 0 ? capR : mirrorX(capR), X.dark));
    sg.add(wl); reg(wl, 'winglet', V3(sx * 0.07, 0, 0), { label: sx > 0 ? P(615, -70, 120) : null }); winglets.push(wl);
    const rd = new THREE.Group(); rd.add(mesh(sx > 0 ? rodGeo : mirrorX(rodGeo), X.carbon)); rd.add(atP(mesh(new THREE.SphereGeometry(mm(5), 12, 8), M.rubber), sx * ROD1[0], ROD1[1], ROD1[2]));
    sg.add(rd); reg(rd, 'landingRod', V3(sx * 0.05, -0.03, 0.06), { label: sx > 0 ? P(607, -205, 360) : null }); rods.push(rd);
  }

  // ---------- 尾翼（背中の1枚。着陸と直立の支えも兼ねる）。寸法図の側面: 先端は翼弦面から約381mm・後縁はほぼ垂直 ----------
  const fin = new THREE.Group();
  { const pts = [[225, 38], [236, 62], [250, 100], [268, 160], [288, 232], [308, 300], [325, 350], [336, 374], [346, 382], [372, 383], [380, 377], [378, 300], [375, 200], [372, 100], [369, 22], [366, 4], [300, 18]];
    const sh = polyShape(pts.map(([z, y]) => [mm(z), mm(y)]));
    const g = new THREE.ExtrudeGeometry(sh, { depth: mm(14), bevelEnabled: true, bevelThickness: mm(1.5), bevelSize: mm(1.5), bevelSegments: 2, curveSegments: 6 });
    const pos = g.attributes.position; for (let i = 0; i < pos.count; i++) { const zz = pos.getX(i), yy = pos.getY(i), d = pos.getZ(i) - mm(7); const taper = lerp(1, 0.42, clamp((yy - mm(40)) / mm(340), 0, 1)); pos.setXYZ(i, d * taper, yy, zz); }
    const ix = g.index ? g.index.array : null; if (ix) { for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } } else { const p = pos.array; for (let i = 0; i < p.length; i += 9) for (let k = 0; k < 3; k++) { const t = p[i + 3 + k]; p[i + 3 + k] = p[i + 6 + k]; p[i + 6 + k] = t; } }
    g.computeVertexNormals(); fin.add(mesh(g, X.dark));
    fin.add(atP(mesh(cylGeo(mm(2.2), mm(2.2), mm(15), 10).rotateZ(Math.PI / 2), M.steel), 0, 120, 352)); fin.add(atP(mesh(cylGeo(mm(2.2), mm(2.2), mm(15), 10).rotateZ(Math.PI / 2), M.steel), 0, 230, 360));   // ねじ2つ（写真）
  }
  sg.add(fin); const finPart = reg(fin, 'tailFin', V3(0, 0.10, 0.03), { label: P(0, 260, 345) });
  // 尾部バンパー（濃い灰の台形のキャップ）と、尾の距離センサー（着地の制御に使う）
  const bumper = box(125, 26, 24, 8, X.dark, 0, -19, 411); sg.add(bumper); reg(bumper, 'tailBumper', V3(0, 0, 0.05), { label: P(0, 0, 13) });
  const dist = new THREE.Group(); { const y = topAt(392) + 2.5; dist.add(box(14, 6, 12, 2.5, X.black, 0, y, 392)); dist.add(atP(mesh(new THREE.SphereGeometry(mm(3.2), 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2), X.glass), 0, y, 398)); }   /* 尾翼の付け根のすぐ後ろ・後ろ向き（立てると地面を向く。取説の図） */
  sg.add(dist); reg(dist, 'distSensor', V3(0, 0.03, 0.05), { label: P(0, topAt(392) + 4, 398) });

  // ---------- 腹: ペイロード（MAP61の例）・パラシュートのふた ----------
  const payload = new THREE.Group();
  { payload.add(mesh(surf((u, v) => [lerp(-92.5, 92.5, v), lerp(-16, 189, u)], 20, 16, false, 0.7), X.dark));   // 腹の曲面に沿うプレート
    payload.add(box(170, 84, 190, 10, X.bay, 0, -22, 86));   // 胴の中に収まるカメラの箱（外からは見えない）
    payload.add(box(20, 4, 12, 3, X.black, 0, botAt(-24) - 1.2, -24)); payload.add(box(6, 1, 4, 1, M.ledGreen, 0, botAt(-24) - 3.2, -24));   // つまみ（緑の目印）
    payload.add(box(12, 3, 6, 1.5, X.dark, 0, botAt(191) - 0.6, 191));
  }
  const lens = new THREE.Group(); { const by = botAt(110) - 1.6; atP(lens, 0, by, 110);
    lens.add(mesh(cylGeo(mm(32.5), mm(32.5), mm(2), 40), X.black)); lens.add(at(mesh(new THREE.TorusGeometry(mm(28), mm(1.2), 8, 40).rotateX(Math.PI / 2), X.lensRing), 0, mm(-1), 0));
    const gl = mesh(new THREE.SphereGeometry(mm(24), 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), X.glass); gl.scale.y = 0.25; gl.rotation.x = Math.PI; at(gl, 0, mm(-0.8), 0); lens.add(gl);
    payload.add(lens); }
  sg.add(payload); reg(lens, 'camLens', V3(0, -0.03, 0), { label: V3(0, -0.004, 0) });
  const payPart = reg(payload, 'payload', V3(0, -0.14, 0), { coarse: true, label: P(0, botAt(60) - 2, 40) });
  const chute = new THREE.Group();
  { chute.add(mesh(surf((u, v) => [lerp(-80, 80, v), lerp(200, 338, u)], 14, 14, false, 0.7), X.dark)); chute.add(box(16, 2.4, 6, 2, X.bay, 0, botAt(201) - 0.2, 201));   // 腹の曲面に沿うふた
    const w = plane(26, 26, X.warn); w.rotation.x = Math.PI / 2; w.rotation.z = Math.PI; atP(w, 0, botAt(280) - 1.0, 280); w.userData.noPick = true; chute.add(w);
    chute.add(box(150, 40, 120, 10, X.canopyRed, 0, botAt(270) + 26, 269)); }   // 中の傘の包み（オプション・胴の中）
  sg.add(chute); const chutePart = reg(chute, 'parachute', V3(0, -0.10, 0.03), { label: P(0, botAt(270) - 2, 290) });

  // ---------- 機首の電池室（ノーズを外すと見える）: 電池2本を前から差し、間の十字のラッチを90°回して留める ----------
  const bats = [];
  for (const sx of [1, -1]) {
    const b = new THREE.Group(); const cx = sx * 41; atP(b, cx, 4, -90);   // 入れ物を電池の中心に置く（断面の面が電池の中を通る）
    const shell = new THREE.Group(); b.add(shell); shell.add(box(69, 55, 108, 5, X.black, 0, 0, 0));   // ケース（中のセルは X線で見える）。前の面は電池室の面の1mm前
    shell.add(atP(mesh(new THREE.TorusGeometry(mm(14), mm(2.4), 8, 20, Math.PI).rotateX(-Math.PI / 2), X.black), 0, 0, -54.2));   // 取っ手のループ（前へ出る）
    for (let k = 0; k < 5; k++) shell.add(atP(mesh(cylGeo(mm(1.6), mm(1.6), mm(1), 10).rotateX(Math.PI / 2), M.ledGreen), -14 + k * 7, 20, -54.4));   // 残量LED 5つ（写真）
    const t = plane(28, 7, X.cellCode); t.rotation.y = Math.PI; atP(t, 0, -20, -54.3); t.userData.noPick = true; shell.add(t);
    const cells = box(62, 48, 100, 4, M.cell, 0, 0, 1); b.add(cells);
    sg.add(b); reg(cells, 'cells', V3(0, 0, 0)); const bp = reg(b, 'battery', V3(sx * 0.05, 0, -0.20), { coarse: true, label: sx > 0 ? P(0, 26, -20) : null }); bp.shell = shell; bats.push(bp);
  }
  const latch = new THREE.Group(); atP(latch, 0, 4, -147); latch.add(box(10, 46, 6, 2, X.dark, 0, 0, 0)); latch.add(box(30, 9, 6, 2, X.dark, 0, 0, 0));   // 十字のつまみ（中心で回る）
  sg.add(latch); const latchPart = reg(latch, 'batteryLatch', V3(0, 0, -0.14), { label: P(0, 16, -3) });
  const pwr = new THREE.Group(); pwr.add(atP(mesh(cylGeo(mm(7), mm(7), mm(3), 24).rotateX(Math.PI / 2), X.black), 0, -36, -145)); const ring = atP(mesh(new THREE.TorusGeometry(mm(8.5), mm(1.2), 8, 28), M.ledWhite), 0, -36, -146); pwr.add(ring); pwr.userData.ring = ring;
  sg.add(pwr); reg(pwr, 'powerButton', V3(0, -0.03, -0.12), { label: P(0, -36, -147) });

  // ---------- 内部の電装（位置は例）----------
  const fc = box(70, 6, 90, 2, M.aluBrushDark, 0, 40, 60); sg.add(fc); reg(fc, 'fc', V3(0, 0.10, 0), { label: V3(0, mm(4), 0) });
  const gnss = new THREE.Group(); { const disc = (R) => (u, v) => [R * u * Math.cos(v * Math.PI * 2), -70 - R * u * Math.sin(v * Math.PI * 2)];   /* 回る向きをそろえて面を上へ向ける */ gnss.add(mesh(surf(disc(35.5), 8, 48, true, 0.75), X.lensRing)); gnss.add(mesh(surf(disc(33.5), 8, 48, true, 1.0), X.black)); }   // 背中の黒い円盤（曲面に沿わせる。縁の細い輪）
  gnss.add(box(40, 6, 40, 2, M.gpsBody, 0, topAt(-70) - 8, -70));
  sg.add(gnss); reg(gnss, 'gnss', V3(0, 0.12, 0), { label: P(0, topAt(-70) + 2, -70) });
  const tele = new THREE.Group(); for (const sx of [1, -1]) tele.add(box(60, 2, 10, 1, M.pcbEdge, sx * 470, 4, 60));
  sg.add(tele); reg(tele, 'telemetry', V3(0, 0.06, 0), { label: P(470, 4, 60) });
  const rid = box(26, 4, 20, 1, M.plasticGray, -40, 40, 140); sg.add(rid); reg(rid, 'remoteId', V3(0, 0.08, 0.02));

  // ---------- モーター・プロペラ ×2（牽引式・前縁から前へ出るゴンドラの先）----------
  // M1 = 右（前から見て反時計回り）、M2 = 左（時計回り）。回転方向は羽根の形からの推定（公式は「左右で逆」とだけ記載）
  const R_PROP = 177.5, pScale = R_PROP / 1000 / 0.152, MOTOR_Y = -6;
  const PG = { ccw: propGeometry(1).scale(pScale, 0.9, pScale), cw: propGeometry(-1).scale(pScale, 0.9, pScale) };
  const ARMS = [{ id: 'M1', sx: 1, dir: 1, ring: X.green }, { id: 'M2', sx: -1, dir: -1, ring: X.red }];
  ARMS.forEach((A, k) => {
    const mx = A.sx * 315;   // モーターの軸は中心から 315 mm（寸法図）
    // ゴンドラ: 前縁から前へ出る丸い筒、上面の後ろへ細るフェアリング、下面の濃い灰のポッド（写真）
    const nac = new THREE.Group();
    { const g = lathe([[0, -2], [20, 0], [23, 10], [23, 38], [22, 60], [19, 80], [14, 100], [7, 118], [0, 124]].map(([r, y]) => [mm(r), mm(y)]), 28); g.rotateX(Math.PI / 2); g.translate(mm(mx), mm(MOTOR_Y), mm(-115));
      nac.add(mesh(paint(g, (x, y, z, nx, ny) => ny < -0.3 ? 1 : 0), [X.orange, X.dark]));
      const f = lathe([[0, 0], [11, 8], [12, 22], [9, 42], [4, 58], [0, 64]].map(([r, y]) => [mm(r), mm(y)]), 20); f.rotateX(Math.PI / 2); f.scale(1, 0.75, 1); f.translate(mm(mx), mm(28), mm(-88)); nac.add(mesh(f, X.orange));
      nac.add(atP(mesh(cylGeo(mm(23.5), mm(23.5), mm(8), 32).rotateX(Math.PI / 2), A.ring), mx, MOTOR_Y, -111));   // 色の帯（左＝赤・右＝緑）
    }
    sg.add(nac); reg(nac, 'nacelle', V3(0, -0.04, 0.02), { label: k === 0 ? P(mx, MOTOR_Y - 26, -80) : null });
    const esc = box(30, 6, 44, 1.5, M.pcbEdge, mx, MOTOR_Y, -72); esc.add(atP(mesh(new THREE.BoxGeometry(mm(8), mm(2), mm(8)), M.chip), 0, 4, 0).translateX(0)); sg.add(esc); reg(esc, 'esc', V3(0, -0.06, 0.03), { label: k === 0 ? V3(0, mm(4), 0) : null });
    const mg = new THREE.Group(); mg.name = 'motor'; atP(mg, mx, MOTOR_Y, -115); mg.rotation.x = -Math.PI / 2; sg.add(mg);   // 局所の +Y が機首の向き（推力の向き）
    const core = new THREE.Group(); core.scale.set(1.37, 0.97, 1.37); mg.add(core);   // 外径 約48mm・長さ 約30mm（写真から）
    const base = new THREE.Group(); base.add(mesh(cylGeo(0.0105, 0.0105, 0.004).translate(0, 0.002, 0), M.aluDark)); base.add(mesh(hardLathe([[0.0046, 0.004], [0.0052, 0.004], [0.0052, 0.022], [0.0046, 0.022], [0.0046, 0.004]], 32), M.aluDark)); core.add(base); reg(base, 'motorBase', V3(0, 0, 0), { local: true });
    const stator = at(mesh(G.teeth, M.lamination), 0, 0.013, 0); stator.castShadow = false; core.add(stator); reg(stator, 'stator', V3(0, 0.03, 0), { local: true });
    const coils = at(mesh(G.coils, M.copper), 0, 0.013, 0); coils.castShadow = false; core.add(coils); reg(coils, 'winding', V3(0, 0.03, 0), { local: true });
    const mags = at(mesh(G.magnets, M.magnet), 0, 0.013, 0); mags.castShadow = false; core.add(mags); reg(mags, 'magnet', V3(0, 0.07, 0), { local: true });
    const bell = new THREE.Group(); bell.add(at(mesh(G.bellWall, X.bell), 0, 0.005, 0)); bell.add(at(mesh(G.bellTop, X.bell), 0, 0.0295, 0)); bell.add(at(mesh(cylGeo(0.0118, 0.0118, 0.0012, 36), X.bell), 0, 0.0306, 0)); core.add(bell); reg(bell, 'bell', V3(0, 0.07, 0), { local: true });
    const shaft = new THREE.Group(); shaft.add(at(mesh(cylGeo(0.002, 0.002, 0.036, 16), M.steel), 0, 0.016, 0)); shaft.add(at(mesh(G.bearing, M.steel), 0, 0.005, 0)); core.add(shaft); reg(shaft, 'shaft', V3(0, 0.07, 0), { local: true });
    // プロペラ（2枚羽根・固定・黒）。トルクスのねじ2本で留める。ハブに色の印
    const PY = mm(33);
    const propG = new THREE.Group(); propG.name = 'prop'; at(propG, 0, PY, 0); mg.add(propG);
    const hub = mesh(cylGeo(mm(9), mm(10), mm(9), 24), X.black); at(hub, 0, mm(-1), 0); propG.add(hub);
    propG.add(at(mesh(cylGeo(mm(5), mm(5), mm(1.2), 16), A.ring), 0, mm(3.6), 0));
    const pm = mesh(A.dir > 0 ? PG.ccw : PG.cw, X.prop); propG.add(pm);
    const ghosts = [0, 1].map(() => { const gm = X.prop.clone(); gm.transparent = true; gm.opacity = 0.35; gm.depthWrite = false; const gh = new THREE.Mesh(A.dir > 0 ? PG.ccw : PG.cw, gm); gh.visible = false; gh.userData.noPart = true; gh.userData.noPick = true; propG.add(gh); return gh; });
    reg(propG, 'prop', V3(0, 0.07, 0), { local: true, label: k === 0 ? V3(mm(120), 0, 0) : null });
    const disc = new THREE.Mesh(new THREE.CircleGeometry(mm(R_PROP), 64), (A.dir > 0 ? M.propDiscCCW : M.propDiscCW).clone()); disc.rotation.x = -Math.PI / 2; disc.userData.noAO = true; at(disc, 0, PY, 0);
    disc.renderOrder = 5; disc.userData.noPart = true; disc.userData.noPick = true; mg.add(disc);
    const mp = reg(mg, 'motor', V3(0, 0, -0.07), { coarse: true, label: k === 0 ? V3(mm(30), mm(10), 0) : null });
    const ua = new THREE.Group(); ua.position.set(0, PY, 0); ua.scale.setScalar(1 / K); mg.add(ua);
    motors.push({ group: mg, prop: propG, propMesh: pm, blades: [pm], hinges: [], ghosts, disc, bell, mags, shaft, adapter: hub, dir: A.dir, arm: nac, id: A.id, u: V3(mx / 1000 * K, 0, 0), part: mp, arrowAnchor: ua, sx: A.sx });
  });
  // 登録記号（例: 左翼の下面）
  const rm = plane(80, 15, X.regLabel); rm.rotation.x = Math.PI / 2; atP(rm, -330, AF(0.4, tAt(330))[1] * 400 + incY(120) - 0.5, 120); sg.add(rm); reg(rm, 'regMark', V3(0, -0.04, 0));

  // ---------- 説明用の重ね絵（部品には数えない）----------
  // カメラの撮影範囲（MAP61: 横93°・進行方向に −20°〜50°＝前へ15°傾けた70°。公式）。長さは見やすさのため
  const fovG = new THREE.Group(); fovG.visible = false; sg.add(fovG);
  { const L = 0.72 / K, a1 = Math.tan(DEG(46.5)) * L, zf = -Math.tan(DEG(50)) * L, zb = Math.tan(DEG(20)) * L, o = P(0, botAt(110) - 2, 110);
    const g = new THREE.BufferGeometry(); const v = [o.x, o.y, o.z, -a1, o.y - L, o.z + zf, a1, o.y - L, o.z + zf, a1, o.y - L, o.z + zb, -a1, o.y - L, o.z + zb];
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.setIndex([0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 1, 1, 3, 2, 1, 4, 3]); g.computeVertexNormals();
    const m = new THREE.Mesh(g, X.fov); m.renderOrder = 7; fovG.add(m);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(g), new THREE.LineBasicMaterial({ color: 0xa06cf5, transparent: true, opacity: 0.55 })); fovG.add(edges);
    noPart(fovG); }
  // 前向きレーダーの検知（巡航中だけ・前方 100 m。図は概念図で、範囲の形は資料に無い）
  const radarG = new THREE.Group(); radarG.visible = false; sg.add(radarG);
  { const L = 0.75 / K, g = new THREE.ConeGeometry(Math.tan(DEG(30)) * L, L, 40, 1, true); g.rotateX(Math.PI / 2); g.translate(0, mm(-15), mm(-282) - L / 2);
    const m = new THREE.Mesh(g, X.radar); m.renderOrder = 7; radarG.add(m); noPart(radarG); }
  // パラシュート（開いたとき。腹の後ろのふたから出る。形と大きさは例）
  const canopy = new THREE.Group(); canopy.visible = false;   // 場面に置く（機体の下に吊る形）。大きさは見た目の m
  { const R = 0.45, H = 0.26;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(R, 32, 10, 0, Math.PI * 2, 0, Math.PI * 0.42), X.canopy); dome.scale.y = H / R / 0.75; canopy.add(dome);
    for (let k = 0; k < 8; k += 2) { const s = new THREE.Mesh(new THREE.SphereGeometry(R * 1.003, 6, 10, k / 8 * Math.PI * 2, Math.PI / 4, 0, Math.PI * 0.42), X.canopyRed); s.scale.copy(dome.scale); canopy.add(s); }
    const rim = R * Math.sin(Math.PI * 0.42), ry = R * Math.cos(Math.PI * 0.42) * dome.scale.y, lines = [];
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; lines.push(Math.cos(a) * rim, ry, Math.sin(a) * rim, 0, -0.55, 0); }
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3)); canopy.add(new THREE.LineSegments(lg, X.line));
    canopy.userData.dome = dome; noPart(canopy); canopy.traverse(c => { if (c.isMesh) c.castShadow = true; }); }

  // ---------- 矢印 ----------
  const arrows = { thrust: [], rot: [], move: null, yaw: null, lift: [] };
  motors.forEach(mo => {
    const th = arrowMesh(0xffffff, 0.045, 0.0028); th.position.set(0, 0.008, 0); th.visible = false; mo.arrowAnchor.add(th); arrows.thrust.push(th);
    const rot = rotationArc(mo.dir, 0.075); rot.position.set(0, 0.012, 0); rot.visible = false; mo.arrowAnchor.add(rot); arrows.rot.push(rot);
  });
  // 主翼の揚力（遷移と巡航で伸びる）。翼の上面から背中の向きへ
  for (const sx of [1, -1]) { const a = arrowMesh(0x22c55e, 0.05, 0.0034); a.position.copy(P(sx * 330, 35, 40)); a.scale.setScalar(1 / K); a.visible = false; sg.add(a); arrows.lift.push(a); }
  const move = arrowMesh(0xef6a2d, 0.11, 0.004); move.visible = false; root.add(move); arrows.move = move;
  const yawA = rotationArc(-1, 0.17); yawA.position.set(0, -0.02, 0); yawA.visible = false; root.add(yawA); arrows.yaw = yawA;
  const cgMarker = new THREE.Group(); cgMarker.visible = false; root.add(cgMarker);

  return { root, sg, pose, halfSpan: 0.625 * K, focusMin: 0.2, parts, pick, wires, motors, legs: [], arrows, batPart: bats[0], bats, G, cgMarker, personGroup: null,
    tailsitter: true, tiltLift: 1.4, elevons, winglets, rods, finPart, nosePart, payPart, chutePart, latchPart, pwr, fovG, radarG, canopy,
    rotor: { R: mm(R_PROP) * K, y0: 0 }, moveR: 0.30, moveY: 0.12, rpmScale: 1.1 };
}
