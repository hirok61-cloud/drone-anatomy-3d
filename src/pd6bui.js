// ===== 機種の切り替え と PD6B-CAT3 の固有の動き =====
// 固有の動き: たたむ（アームとプロペラ）・電池交換（ホットスワップ）・荷物を置く（ボックスリリース）・パラシュート・付け替え（腰下ユニット）・大きさ
const pd6b = { variant: 'cargo', fold: 0, foldTo: 0, act: null, sizeOn: false, person: null, ghost: null, chuteK: 0, chuteTo: 0, pendingPower: false };

// ---------- 状態の問い合わせ (ui.js / live.js から呼ばれる) ----------
function pd6bBusy() { return IS_PD6B && (pd6b.foldTo > 0 || pd6b.fold > 0.001 || !!pd6b.act || pd6b.chuteTo > 0 || pd6b.sizeOn); }   /* 大きさは床に立つ人と並べるので着地させる */
function pd6bShadowExtra() { return (pd6b.sizeOn ? 0.45 : 0) + (pd6b.act && pd6b.act.id === 'drop' ? 0.1 : 0); }
function pd6bBlockPower() {
  if (!IS_PD6B) return false;
  if (pd6b.act) { pd6bStop(); return false; }
  if (pd6b.fold > 0.001 || pd6b.foldTo > 0) { pd6b.foldTo = 0; pd6b.pendingPower = true; syncPdChips(); if ($('#noteCard').dataset.kind === 'pd6b-fold') renderNote(null); showToast('アームを広げてから回します'); return true; }
  return false;
}
function pd6bOnTab(tab) {
  if (!IS_PD6B) return;
  if (tab !== 'see') { pd6bStop(); if (pd6b.chuteTo > 0) setChute(false, true); if (pd6b.sizeOn) setSize(false, true); if (($('#noteCard').dataset.kind || '').startsWith('pd6b-')) renderNote(null); }   /* 「みる」の重ね絵・カードを「とばす」へ持ち込まない */
  if (tab === 'fly' && (pd6b.foldTo > 0 || pd6b.fold > 0.001)) { pd6b.foldTo = 0; syncPdChips(); showToast('アームを広げました'); }
}

// ---------- 動きの入口 ----------
function pd6bAction(id) {
  if (!IS_PD6B) return;
  if (S.tab !== 'see') setTab('see');
  if (id === 'about') { if (pd6b.act) pd6bStop(); if (pd6b.chuteTo > 0) setChute(false, true); if (pd6b.sizeOn) setSize(false, true); renderPdAbout(); pdFrame([D.root], { pull: true }); return; }   /* 説明だけを見せる。前の重ね絵を残さない */
  // 同時に1つ: 傘を開いたまま箱を置く・大きさを比べたまま付け替える、のような重ね方はさせない
  if (id !== 'chute' && pd6b.chuteTo > 0) setChute(false, true);
  if (id !== 'size' && pd6b.sizeOn) setSize(false, true);
  if (id === 'size') { if (pd6b.act) pd6bStop(); setSize(!pd6b.sizeOn); return; }
  if (id === 'chute') { if (!(pd6b.chuteTo > 0) && (pd6b.foldTo > 0 || pd6b.fold > 0.001)) { pd6b.foldTo = 0; showToast('アームを広げてから開きます'); } setChute(!(pd6b.chuteTo > 0)); return; }
  if (pd6b.act) pd6bStop();
  stopOthers('alt');
  if (S.explode > 0.02) setExplode(0);
  if (S.mode === 'cut') setMode('normal');
  if (id === 'fold') {
    pd6b.foldTo = pd6b.foldTo > 0 ? 0 : 1; pd6b.pendingPower = false;
    if (pd6b.foldTo > 0 && S.power > 0) setPower(0, true);
    renderPdNote('fold'); syncPdChips(); return;
  }
  if (pd6b.foldTo > 0 || pd6b.fold > 0.001) { pd6b.foldTo = 0; syncPdChips(); showToast('アームを広げてから始めます'); }
  if (S.power > 0) setPower(0, true);
  if (id === 'drop' && pd6b.variant !== 'cargo') { pd6bSetVariant('cargo'); }
  if (id === 'unit') { pd6b.act = { id, t: 0, from: pd6b.variant, to: pd6b.variant === 'cargo' ? 'survey' : 'cargo', swapped: false }; renderPdNote('unit'); syncPdChips(); pdFrame([D.root], { pull: true, margin: 1.2 }); return; }
  if (id === 'swap') { pd6b.act = { id, t: 0, p: D.parts.filter(p => p.key === 'battery')[1] }; renderPdNote('swap'); syncPdChips(); return; }
  if (id === 'drop') { for (const th of D.arrows.thrust) th.userData.forceHide = true; pd6b.act = { id, t: 0, body: true }; syncBodyMode(); renderPdNote('drop'); syncPdChips(); pdFrame([D.root], { pull: false, margin: 1.5 }); return; }
}
function pd6bStop() {
  if (!IS_PD6B || !pd6b.act) return;
  const a = pd6b.act; pd6b.act = null;
  if (a.id === 'swap' && a.p) { a.p.anim = null; a.p.animReset = true; setTint(a.p, PD_OLD, 0); }
  if (a.id === 'drop') {
    for (const th of D.arrows.thrust) th.userData.forceHide = false;
    D.boxPart.anim = null; D.boxPart.animReset = true; for (const c of D.latchPart.claws) c.g.rotation.z = 0;
    for (const mo of D.motors) { mo.rpmTarget = null; mo.rpmRate = null; } body.py = 0; body.vyF = 0;
  }
  if (a.id === 'unit') { for (const p of [D.boxPart, D.latchPart, D.svPart]) { p.anim = null; p.animReset = true; } if (!a.swapped) pd6bSetVariant(a.to); }
  syncBodyMode(); syncPdChips();
  const kind = $('#noteCard').dataset.kind; if (kind === 'pd6b-' + a.id) renderNote(null);
}
function pd6bSetVariant(v) {
  pd6b.variant = v;
  for (const p of D.parts) if (PARTS[p.key] && PARTS[p.key].variant) p.hidden = PARTS[p.key].variant !== v;
  if (S.selected && PARTS[S.selected.key] && PARTS[S.selected.key].variant && PARTS[S.selected.key].variant !== v) select(null);
  if (S.isolated && PARTS[S.isolated] && PARTS[S.isolated].variant && PARTS[S.isolated].variant !== v) S.isolated = null;
  applyVisibility(); buildList();
}
function syncPdChips() {
  const set = (id, on, label) => { const b = $(`#pdChips [data-pd="${id}"]`); if (!b) return; b.classList.toggle('on', !!on); if (b.hasAttribute('aria-pressed')) b.setAttribute('aria-pressed', String(!!on)); if (label) b.textContent = label; };
  set('fold', pd6b.foldTo > 0, pd6b.foldTo > 0 ? 'ひろげる' : 'たたむ');
  set('chute', pd6b.chuteTo > 0); set('size', pd6b.sizeOn);
  set('swap', pd6b.act && pd6b.act.id === 'swap'); set('drop', pd6b.act && pd6b.act.id === 'drop');
  set('unit', false, pd6b.variant === 'cargo' ? '測量用に付け替え' : '物流用に付け替え');
}

// ---------- 説明カード ----------
const PD_SRC_LINK = (k) => { const s = PD6B_SRC[k]; return `<a href="${s.url}" target="_blank" rel="noopener">${s.name}</a>`; };
function renderPdAbout() {
  const row = (k, v, src) => `<tr><th>${k}</th><td>${v}${src ? `<small>${src}</small>` : ''}</td></tr>`;
  const html = `<p><b>第一種型式認証をめざす、物流用の大型ヘキサコプター（6発機）。</b>2023年11月10日に国土交通省が第一種型式認証の申請を受理（国内3件目）。2026年10月のジャパンモビリティショーで展示され、同社は「取得を目指す」としています。</p>
    <table class="pd-spec">
      ${row('最大離陸重量', '約 45 kg', '国交省')}${row('最大積載重量', '約 20 kg', '国交省・申請時／2025年の報道では18kg（記事は現在閲覧できない）')}
      ${row('機体寸法', '約 2.2 × 2.4 × 0.7 m', '国交省')}${row('最大飛行速度', '約 12 m/s（約43km/h）', '国交省')}${row('最大飛行時間', '約 30 分', '国交省')}
      ${row('機体重量', '20.0 kg（バッテリー4本込み）', '公式・PD6B-Type3')}${row('モーター軸間', '1,623 mm', '公式')}${row('プロペラ', '30 インチ × 6', '公式')}
      ${row('折りたたみ時', 'φ945 mm の円柱内', '公式')}${row('防水・防塵', 'IP44', '公式')}
    </table>
    <h4>550クラスとのちがい</h4>
    <ul class="pd-diff"><li><b>4発 → 6発</b>：1基の推力が落ちても残りで補う余地を設計で持たせやすい</li><li><b>2.4kg → 45kg</b>：25kg以上なので登録記号の文字は25mm以上、カテゴリーⅡでも許可・承認が要る</li><li><b>12 → 30インチ</b>：大きな羽根をゆっくり回して効率を上げる</li><li><b>腰下ユニット</b>：箱・測量機器を付け替える</li><li><b>パラシュート</b>：落ちる速さを下げる安全装置</li></ul>
    <p class="caveat">「公式」と書いた数値は、CAT3のベース機 PD6B-Type3 の公式ページの値です。この3Dモデルは、公表資料と展示機の写真から起こした教材用の再現です。内部の配置・脚や箱の寸法・アンテナの用途・畳む向きは推定を含みます（解説の「写真から推定」）。</p>
    <details class="pd-src"><summary>出典（${PD6B_DATE}）</summary><ul>${['mlit', 'official', 'news', 'parasafe'].map(k => `<li>${PD_SRC_LINK(k)}</li>`).join('')}</ul></details>`;
  renderNote({ kind: 'pd6b-about', title: 'PD6B-CAT3（プロドローン）', html, actions: [{ label: 'たたんでみる', fn: () => pd6bAction('fold') }, { label: '大きさをくらべる', fn: () => { renderNote(null); setSize(true); } }] });
}
function renderPdNote(id) {
  const N = {
    fold: () => ({ title: pd6b.foldTo > 0 ? 'アームをたたむ' : 'アームを広げる', html: `<p>プロペラの羽根を根元のヒンジで寄せてから、6本のアームを付け根の継手で畳みます。運ぶときは<b>直径945mmの円柱</b>に収まり、アームはワンタッチで広げられます（ベース機 PD6B-Type3 の公式値）。</p><p>継手の上の小さな印は、ロックがかかっていれば緑・外れていれば赤（この図の表現）。<b>広げたら1本ずつ手で引いてロックを確かめる</b>のが飛行前点検の基本です。</p><p class="caveat">畳む向き・角度は公表資料で確認できないため、上向きに畳む例で描いています。</p>`,
      actions: [{ label: pd6b.foldTo > 0 ? '広げる' : 'たたむ', primary: true, fn: () => pd6bAction('fold') }] }),
    swap: () => ({ title: 'バッテリーを入れ替える（ホットスワップ）', html: `<p id="pdSwapState" class="pd-state">給電中のバッテリー: <b>4本</b></p><p>4本のうち<b>1本だけ</b>を抜いて、充電済みの1本を差し込みます。残りの3本が電気を送り続けるので、頭脳（フライトコントローラー）は止まりません（ホットスワップ対応は公式）。</p><p class="caveat">赤くなるのが抜く1本、緑になるのが差し込む1本。入れ替える順番・本数の決まりは取扱説明書で確かめます。</p>`,
      actions: [{ label: 'もう一度', fn: () => pd6bAction('swap') }] }),
    drop: () => ({ title: '荷物を置いて離陸する', html: `<p id="pdDropState" class="pd-state">爪を開いています…</p><p>着陸したら四隅の爪を開いて物流ボックスを離し、機体だけが上昇します。受け取る人が機体に近づかなくても、荷物を置いていけます（リリース型の腰下ユニット）。</p><p class="caveat">飛行中に物を落とす「物件投下」は承認が要る特定飛行です。この図は着陸してから箱を離す例。爪の形と動きは例です。</p>`,
      actions: [{ label: 'もう一度', fn: () => pd6bAction('drop') }] }),
    unit: () => ({ title: '腰下ユニットを付け替える', html: `<p>機体の下半分（腰下ユニット）は、<b>ピン4か所の差し替え</b>で交換できます（一部例外あり・公式）。標準は「測量用」「物流ボックス リリース型」「物流ボックス 引き出し型」の3種類。</p><p>上半分（飛ぶ部分）はそのままに、用途に合わせて下半分だけを替える設計です。</p><p class="caveat">測量ユニットの形は例です。</p>`,
      actions: [{ label: pd6b.variant === 'cargo' ? '測量用にする' : '物流用にもどす', fn: () => pd6bAction('unit') }] }),
    chute: () => ({ title: 'パラシュートを開く', html: `<p>機体が飛べなくなったとき、筒から傘を押し出して開き、落ちる速さを下げます。展示機には日本化薬の「PARASAFE」が載っていました。PARASAFEは火薬の力で傘を押し出すので、低い高度でも素早く開きます。</p><p>仮に<b>45kgの機体を6m/sまで落とせたとすると</b>（25kg級用製品の理論値を当てはめた計算）、運動エネルギーは約0.8kJ。50mから落ちた場合（約31m/s・空気抵抗なし）の約22kJの、およそ27分の1です。</p><p class="caveat">傘の大きさ・色・ひもの本数は例です（この機体用の型式は非公表）。参考: 25kg級用 PS CA12-01 は傘の面積11m²・降下速度6m/s（理論値）・最低展開高度30m（同社発表）。</p>`,
      actions: [{ label: 'たたむ', fn: () => setChute(false) }], onClose: () => setChute(false) }),
    size: () => ({ title: '大きさをくらべる', html: `<p>同じ縮尺で、<b>身長170cmの人</b>と、青い半透明の<b>550クラスのクアッド</b>（対角550mm・約2.4kg）を並べています。</p><p>ベース機 PD6B-Type3 の公式値で展開時 2,181 × 2,398 mm（CAT3は国交省の発表で約2.2 × 2.4 m）。両手を広げた大人より大きく、最大離陸重量は550クラスの約19倍の約45kgです。</p>`,
      actions: [{ label: 'もどす', fn: () => setSize(false) }], onClose: () => setSize(false) }),
  };
  const o = N[id](); renderNote(Object.assign({ kind: 'pd6b-' + id }, o));
}

// ---------- パラシュート / 大きさ ----------
function setChute(on, quiet) {
  pd6b.chuteTo = on ? 1 : 0; syncPdChips();
  if (on) {
    if (pd6b.act) pd6bStop(); if (S.explode > 0.02) setExplode(0); if (S.power > 0) setPower(0, true);
    renderPdNote('chute');
    frameBox([-0.40, -0.16, -0.40], [0.45, 0.78, 0.45], [0.62, 0.26, -0.74], 1.02);   /* 開ききった傘と機体をまとめて、カードを避けて収める */
  } else {
    if ($('#noteCard').dataset.kind === 'pd6b-chute') renderNote(null);
    if (!quiet) focusOn([D.root], { pull: true });
  }
}
// 枠決め: PCでは説明カードが左側を覆うので、カードの右端から視点列までの空いた範囲の中央に被写体を寄せ、狭いぶん引く
function pdFrame(objs, opts) {
  focusOn(objs, opts);
  const card = $('#noteCard'), land = narrow() && innerHeight <= 520; if ((narrow() && !land) || !S.camSpring || card.hidden) return;   /* 縦長のスマホはカードが下にあるので帯で足りる。横向きはカードが左に立つ */
  const r = card.getBoundingClientRect(), cw = land ? canvas.clientWidth : canvas.clientWidth - 384, vc = $('#viewCol').getBoundingClientRect();
  const f0 = Math.min(r.right + 12, cw * 0.6), f1 = Math.max(f0 + 200, (land ? cw : Math.min(cw, vc.left)) - 12);
  const sp = S.camSpring, back = sp.p1.clone().sub(sp.q1), k = clamp(0.8 * cw / (f1 - f0), 1, 1.7);
  sp.p1.copy(sp.q1).addScaledVector(back, k);
  const d = sp.p1.distanceTo(sp.q1), tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
  const px = (f0 + f1) / 2 - cw / 2, right = new THREE.Vector3().crossVectors(back.normalize().negate(), camera.up).normalize();
  const shift = right.multiplyScalar(-(px / cw) * 2 * d * tanH); sp.p1.add(shift); sp.q1.add(shift);
  controls.maxDistance = Math.max(controls.maxDistance, d * 1.02);
}
// 見えない箱（材質だけ非表示）を一瞬置いて pdFrame に渡す。重ね絵（傘・画角など）は部品ではないので focusOn が数えないため
function frameBox(min, max, dir, margin) {
  const proxy = new THREE.Mesh(new THREE.BoxGeometry(max[0] - min[0], max[1] - min[1], max[2] - min[2]), new THREE.MeshBasicMaterial({ visible: false }));
  proxy.position.set((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2); scene.add(proxy);
  pdFrame([proxy], { pull: true, min: 0.08, margin: (margin || 1.1) * (narrow() ? 0.72 : 1), dir: new THREE.Vector3(...dir).normalize() });   /* 枠決めは「注目」の最短距離に縛られない */   /* スマホは帯に合わせて引くぶん、元の余白を詰める */
  scene.remove(proxy); proxy.geometry.dispose();
}
function setSize(on, quiet) {
  pd6b.sizeOn = !!on; syncPdChips();
  if (pd6b.person) pd6b.person.visible = pd6b.sizeOn; if (pd6b.ghost) pd6b.ghost.visible = pd6b.sizeOn;
  S.shadowDirty = S.csDirty = S.aoDirty = true;
  if (on && pd6b.person && pd6b.person.userData.face) pd6b.person.userData.face(camera.position.x, camera.position.z);   /* 人は見ている人の方を向かせる */
  if (on) {
    renderPdNote('size');
    const dir = new THREE.Vector3(0.45, 0.32, -0.84).normalize();   /* 視点の向きを決めておく（前の場面の向きを引き継ぐと人が手前に大写しになる） */
    pdFrame([D.root, pd6b.person, pd6b.ghost], { pull: true, margin: 1.15, dir });
  }
  else { if ($('#noteCard').dataset.kind === 'pd6b-size') renderNote(null); if (!quiet) focusOn([D.root], { pull: true }); }
}
// 550クラスの半透明の影絵（大きさの物差し。部品には数えない）
function pd6bQuadGhost() {
  const mat = new THREE.MeshPhysicalMaterial({ color: 0x3b7df7, transparent: true, opacity: 0.5, roughness: 0.4, metalness: 0, depthWrite: false, side: THREE.DoubleSide });
  const disc = mat.clone(); disc.opacity = 0.18;
  const g = new THREE.Group();
  g.add(at(mesh(rboxGeo(0.15, 0.04, 0.17, 0.01), mat), 0, 0.018, 0));
  for (const [x, z] of [[1, -1], [1, 1], [-1, 1], [-1, -1]]) {
    const u = V3(x, 0, z).normalize();
    g.add(tubeBetween(V3(u.x * 0.06, 0.02, u.z * 0.06), V3(u.x * 0.275, 0.02, u.z * 0.275), 0.008, mat, 16));
    g.add(at(mesh(cylGeo(0.0175, 0.0175, 0.035, 24), mat), u.x * 0.275, 0.05, u.z * 0.275));
    const d = mesh(new THREE.CircleGeometry(0.152, 48), disc); d.rotation.x = -Math.PI / 2; at(d, u.x * 0.275, 0.077, u.z * 0.275); g.add(d);
  }
  for (const sx of [-1, 1]) { g.add(at(mesh(cylGeo(0.006, 0.006, 0.27, 16).rotateX(Math.PI / 2), mat), sx * 0.112, -0.150, 0)); for (const sz of [-1, 1]) g.add(tubeBetween(V3(sx * 0.055, -0.006, sz * 0.045), V3(sx * 0.112, -0.148, sz * 0.088), 0.005, mat, 12)); }
  g.traverse(o => { o.castShadow = false; o.userData.noPick = true; });
  g.scale.setScalar(PD6B_K); g.position.set(-0.45, -0.158 + 0.156 * PD6B_K, -0.50); g.visible = false;
  return g;
}

// ---------- 毎フレーム ----------
const PD_OLD = new THREE.Color(0xff3b30), PD_NEW = new THREE.Color(0x22c55e);
const pdEase = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
function setLock(red) {
  for (const p of D.parts) if (p.key === 'foldJoint' && p.lock) { const m = p.lock, want = red ? M.ledRed : M.ledGreen; if (m.userData.origMat === want) continue; const was = m.userData.origMat; m.userData.origMat = want; if (m.material === was) m.material = want; }
}
function stepPd6b(dt) {
  let dirty = false;
  if (S.explode > 0.02 && pd6b.foldTo > 0) { pd6b.foldTo = 0; syncPdChips(); if ($('#noteCard').dataset.kind === 'pd6b-fold') renderNote(null); }   /* 畳んだ姿勢のまま部品を散らさない */
  { const sup = pd6b.sizeOn || pd6b.chuteTo > 0 || !!(pd6b.act && pd6b.act.id === 'drop'); if (sup !== pd6b._sup) { pd6b._sup = sup; S.labelsSuppressed = sup; } }   /* 引いた画では部品名が重なって読めないので、その間だけ隠す（PD6Bでは他にこの旗を使う機能がない） */
  // --- たたむ / 広げる ---
  if (pd6b.foldTo > pd6b.fold) {
    const spinning = D.motors.some(mo => mo.rpm > 30) || body.py > 0.003;
    if (!spinning) {
      // 羽根を畳む前に、プロペラを「羽根がアームと直角」の向きにそろえる
      let aligned = true;
      for (const mo of D.motors) { const tgt = Math.PI / 2 + Math.round((mo.angle - Math.PI / 2) / (Math.PI * 2)) * Math.PI * 2; const d = tgt - mo.angle; if (Math.abs(d) > 0.005) { aligned = false; mo.angle += d * (1 - Math.exp(-dt / 0.12)); } else mo.angle = tgt; mo.prop.rotation.y = mo.angle; }
      if (aligned || pd6b.fold > 0) pd6b.fold = Math.min(pd6b.foldTo, pd6b.fold + dt / 2.4);
      dirty = true;
    }
  } else if (pd6b.foldTo < pd6b.fold) { pd6b.fold = Math.max(pd6b.foldTo, pd6b.fold - dt / 2.4); dirty = true; }
  if (dirty || pd6b._lastFold !== pd6b.fold) {
    const f = pd6b.fold, bk = pdEase(f / 0.38), ak = pdEase((f - 0.32) / 0.68);
    D.pivots.forEach(pv => { pv.rotation.z = ak * THREE.MathUtils.degToRad(78);   /* 真上まで起こすと畳んだ羽根がハブの機器に当たる */ });
    for (const mo of D.motors) for (const h of mo.hinges) h.g.rotation.y = h.s * bk * Math.PI / 2;
    if (f >= 1 && pd6b._lastFold < 1 && pd6b.foldTo === 1) frameBox([-0.16, -0.16, -0.16], [0.16, 0.20, 0.16], [0.62, 0.42, -0.66], 1.1);   /* 畳み終えたら畳んだ大きさに寄せ直す */
    if (f === 0 && pd6b._lastFold > 0 && pd6b.foldTo === 0 && S.tab === 'see' && !pd6b.act) pdFrame([D.root], { pull: true });   /* 広げ終えたら広げた大きさで収め直す */
    setLock(f > 0.002); pd6b._lastFold = f; dirty = true;
    if (f === 0 && pd6b.foldTo === 0 && pd6b.pendingPower) { pd6b.pendingPower = false; setPower(0.5); }
  }
  // --- 動き ---
  const a = pd6b.act;
  if (a) {
    a.t += dt; const t = a.t; dirty = true;
    if (a.id === 'swap' && a.p) {
      const p = a.p; if (!p.anim) p.anim = { pos: new THREE.Vector3(), quat: new THREE.Quaternion() };
      const out = V3(Math.sign(p.home.x) || 1, 0, 0);
      let up = 0, side = 0;
      if (t < 1.3) up = pdEase(t / 1.3) * 0.30;
      else if (t < 2.2) { up = 0.30; side = pdEase((t - 1.3) / 0.9) * 0.34; }
      else if (t < 2.9) { up = 0.30; side = 0.34; }
      else if (t < 3.8) { up = 0.30; side = 0.34 * (1 - pdEase((t - 2.9) / 0.9)); }
      else if (t < 5.1) up = 0.30 * (1 - pdEase((t - 3.8) / 1.3));
      p.anim.pos.set(out.x * side, up, 0);
      setTint(p, t < 2.55 ? PD_OLD : PD_NEW, t < 0.2 ? t / 0.2 : t < 2.55 ? 0.7 : t < 5.1 ? 0.7 : Math.max(0, 0.7 * (1 - (t - 5.1) / 0.8)));
      const st = $('#pdSwapState'); if (st) st.innerHTML = t < 0.6 ? '給電中のバッテリー: <b>4本</b>' : t < 4.7 ? '給電中のバッテリー: <b>3本</b>（電源は入ったまま）' : '給電中のバッテリー: <b>4本</b>（入れ替え完了）';
      if (t > 6.0) { p.anim = null; p.animReset = true; setTint(p, PD_NEW, 0); pd6b.act = null; syncPdChips(); }
    }
    if (a.id === 'drop') {
      const bp = D.boxPart; if (!bp.anim) bp.anim = { pos: new THREE.Vector3(), quat: new THREE.Quaternion() };
      const open = t < 0.6 ? pdEase(t / 0.6) : t < 8.3 ? 1 : 1 - pdEase((t - 8.3) / 0.6);
      for (const c of D.latchPart.claws) c.g.rotation.z = c.sx * 0.75 * open;
      const fall = t < 0.6 ? 0 : t < 1.0 ? ((t - 0.6) / 0.4) ** 2 : t < 7.6 ? 1 : 1 - pdEase((t - 7.6) / 0.7);
      let py = 0;
      if (t > 2.0 && t < 4.0) py = 0.22 * pdEase((t - 2.0) / 2.0); else if (t >= 4.0 && t < 5.6) py = 0.22; else if (t >= 5.6 && t < 7.6) py = 0.22 * (1 - pdEase((t - 5.6) / 2.0));
      body.py = py; body.vyF = 0; body.px = body.pz = 0; body.tx = body.tz = 0;
      if (a.fallD == null) { const ws = bp.obj.parent.getWorldScale(new THREE.Vector3()).y; a.fallD = Math.max(0, altLowest(bp.obj) - D.root.position.y - ALT_FLOOR) / ws; }   /* 箱の下端から床までの距離（決め打ちだと床に7mm沈んでいた） */
      bp.anim.pos.set(0, -a.fallD * fall - py / PD6B_K, 0);   /* 箱は床に残す: 機体が上がったぶんだけ下げる */
      bp.obj.position.copy(bp.home).add(bp.anim.pos);   /* その場で当てる（部品の動きは次のコマの最初に当たるので、1コマ遅れて床から浮き沈みしていた） */
      for (const mo of D.motors) { mo.rpmTarget = t > 1.0 && t < 7.4 ? HOVER_RPM * 0.9 : 0; mo.rpmRate = 2.5; }
      const st = $('#pdDropState'); if (st) st.textContent = t < 0.6 ? '爪を開いています…' : t < 1.2 ? '箱が床に降りました' : t < 2.0 ? 'プロペラを回します' : t < 5.6 ? '箱を置いて上昇・ホバリング' : t < 7.6 ? 'もどって着陸します' : '爪で箱をつかみ直しました';
      if (t > 9.2) { for (const th of D.arrows.thrust) th.userData.forceHide = false; bp.anim = null; bp.animReset = true; for (const mo of D.motors) { mo.rpmTarget = null; mo.rpmRate = null; } pd6b.act = null; syncBodyMode(); syncPdChips(); }
    }
    if (a.id === 'unit') {
      const outP = a.from === 'cargo' ? [D.boxPart, D.latchPart] : [D.svPart], inP = a.to === 'cargo' ? [D.boxPart, D.latchPart] : [D.svPart];
      for (const p of [...outP, ...inP]) if (!p.anim) p.anim = { pos: new THREE.Vector3(), quat: new THREE.Quaternion() };
      if (t < 0.8) { const e = pdEase(t / 0.8); for (const p of outP) p.anim.pos.set(0, -0.04 * e, -0.75 * e); }
      else if (!a.swapped) { a.swapped = true; pd6bSetVariant(a.to); for (const p of inP) p.anim.pos.set(0, -0.04, -0.75); }
      if (t >= 0.8) { const e = pdEase((t - 0.8) / 0.9); for (const p of inP) p.anim.pos.set(0, -0.04 * (1 - e), -0.75 * (1 - e)); }
      if (t > 1.8) { for (const p of [D.boxPart, D.latchPart, D.svPart]) { p.anim = null; p.animReset = true; } pd6b.act = null; syncPdChips(); if ($('#noteCard').dataset.kind === 'pd6b-unit') renderPdNote('unit'); }
    }
  }
  // --- パラシュート ---
  if (Math.abs(pd6b.chuteTo - pd6b.chuteK) > 1e-4) {
    pd6b.chuteK = pd6b.chuteTo > pd6b.chuteK ? Math.min(1, pd6b.chuteK + dt / 0.9) : Math.max(0, pd6b.chuteK - dt / 0.5);
    const k = pd6b.chuteK, c = D.chute; c.visible = k > 0.002;
    const e = pd6b.chuteTo > 0 ? 1 - Math.pow(1 - k, 3) * (1 - 2.2 * k * (1 - k)) : k;   /* 開くときは少し行き過ぎてから落ち着く */
    c.scale.set(Math.max(0.01, e), Math.max(0.01, Math.min(1, k * 1.6)), Math.max(0.01, e));
    dirty = true;
  }
  if (dirty) S.shadowDirty = S.csDirty = S.aoDirty = true;
}

// ---------- 起動 ----------
function initPd6b() {
  camera.position.sub(controls.target).multiplyScalar(narrow() ? 1.32 : 1.15).add(controls.target);   /* スマホは帯に合わせて寄るので、翼端が切れないよう多めに引く */   /* 550クラスより一回り大きく見えるので、最初の画を少し引く */
  for (const b of $$('#pdChips [data-pd]')) b.addEventListener('click', () => pd6bAction(b.dataset.pd));
  pd6b.person = buildPerson(); pd6b.person.scale.setScalar(PD6B_K); pd6b.person.position.set(0.05, -0.158, 0.68);   /* 機体の奥に立たせ、550の影絵は手前右に置く（横一列だと説明カードに機体が隠れる） */ pd6b.person.visible = false; scene.add(pd6b.person);
  pd6b.ghost = pd6bQuadGhost(); scene.add(pd6b.ghost);
  pd6bSetVariant('cargo'); syncPdChips();
  const q = new URLSearchParams(location.search);
  if (!SHARE_KEYS.some(k => q.has(k))) setTimeout(() => { if (!$('#noteCard').dataset.kind) { renderPdAbout(); pdFrame([D.root], { pull: true }); } }, 900);   /* 共有リンクで開いたときは、その画面を優先する */
}
