// ===== UI: タブ・扉・解説・ラベル・スティック・入力 =====
const LIST_ORDER = ['frameTop', 'frameBottom', 'regMark', 'arm', 'armClamp', 'motorMount', 'standoff', 'screws', 'motor', 'bell', 'stator', 'winding', 'magnet', 'shaft', 'motorBase', 'prop', 'propNut', 'propAdapter', 'esc', 'fc', 'pdb', 'capacitor', 'buzzer', 'battery', 'cells', 'batteryTray', 'xt60', 'balance', 'strap', 'wiring', 'gps', 'remoteId', 'rx', 'vtx', 'telemetry', 'led', 'gimbal', 'camera', 'damper', 'landingGear'];
const SUB = { bell: 'motor', stator: 'motor', winding: 'motor', magnet: 'motor', shaft: 'motor', motorBase: 'motor', cells: 'battery', propNut: 'prop', propAdapter: 'prop' };
const PER_MOTOR = new Set(['motor', 'prop', 'esc', 'arm', 'bell', 'stator', 'winding', 'magnet', 'shaft', 'motorBase', 'propNut', 'propAdapter', 'led', 'armClamp', 'motorMount']);
const ICON = {
  eye: '<svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 10s3-5.5 8-5.5 8 5.5 8 5.5-3 5.5-8 5.5S2 10 2 10z"/><circle cx="10" cy="10" r="2.4"/></svg>',
  eyeOff: '<svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l14 14M8.6 8.7A2.4 2.4 0 0 0 11.3 11.4M6.2 6.3C3.6 7.9 2 10 2 10s3 5.5 8 5.5c1.5 0 2.8-.5 3.9-1.1M9 4.6C9.3 4.5 9.7 4.5 10 4.5c5 0 8 5.5 8 5.5s-.7 1.3-2 2.6"/></svg>',
};
const ACCENT = new THREE.Color(0xef6a2d), HOVER_L = new THREE.Color(0x1b1f27), HOVER_D = new THREE.Color(0xffffff), UP_COLOR = new THREE.Color(0xef6a2d), DROP_COLOR = new THREE.Color(0x9aa0a8);
const store = { get: k => { try { return localStorage.getItem('drone3d.' + k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem('drone3d.' + k, v); } catch (e) {} } };
let toastTimer = 0;
function showToast(msg, ms = 2500) { const t = $('#toast'); t.textContent = msg; t.hidden = false; t.classList.remove('hide'); clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.classList.add('hide'); setTimeout(() => { t.hidden = true; }, 320); }, ms); }
function segSet(seg, attr, val) { for (const b of $$('button', seg)) { const on = b.dataset[attr] === String(val); b.classList.toggle('on', on); if (b.getAttribute('role') === 'tab' || b.parentElement.getAttribute('role') === 'radiogroup') b.setAttribute('aria-selected', on); } }

// ---------- 説明カード ----------
function renderNote(o) {
  const card = $('#noteCard'); if (!o) { card.hidden = true; return; }
  $('#noteTitle').textContent = o.title || ''; const b = $('#noteBadge'); if (o.badge) { b.textContent = o.badge; b.hidden = false; } else b.hidden = true;
  $('#noteBody').innerHTML = o.html || ''; const acts = $('#noteActions'); acts.innerHTML = '';
  for (const a of (o.actions || [])) { const btn = document.createElement('button'); btn.textContent = a.label; if (a.primary) btn.classList.add('primary'); btn.onclick = a.fn; acts.appendChild(btn); }
  acts.hidden = !(o.actions && o.actions.length); card.hidden = false; card.scrollTop = 0; card.dataset.kind = o.kind || '';
  if (o.onClose) card._onClose = o.onClose; else card._onClose = null;
}
$('#noteClose').addEventListener('click', () => { const c = $('#noteCard'); if (c._onClose) c._onClose(); c.hidden = true; });

// ---------- タブ ----------
// 「同時に1つ」の対象（質問・飛行デモ・用途・重さ・シアター・もしも・クイズ）を、keep 以外すべて止める
function stopOthers(keep, arg) {
  if (keep !== 'quiz' && typeof quiz !== 'undefined' && quiz.active) quizStop();
  if (typeof codexClearGlow === 'function') codexClearGlow();   // 今日の一部品の光を先に消す(あとから塗る色を消してしまわないように)
  if (keep !== 'theater' && (theater.active || theater.done)) stopTheaterUI();
  if (keep !== 'whatif' && whatif.active) stopWhatifUI();
  // 質問の act が起こす飛行デモは質問の一部なので、そのときは質問を残す
  const qOwnsFlight = keep === 'flight' && S.question && S.question.act && S.question.act.flight === arg;
  if (keep !== 'question' && S.question && !qOwnsFlight) { clearQuestion(); if ($('#noteCard').dataset.kind === 'question') renderNote(null); }
  if (keep !== 'flight' && S.flight) setFlight(null);
  if (keep !== 'use' && S.use) setUse(null);
  if (keep !== 'scale' && S.scale) setScale(false);
  if (keep !== 'expert' && S.expert && typeof expertStop === 'function') expertStop();
}
function setTab(tab) {
  $('#coach').hidden = true;
  if ((theater.active || theater.done) && tab !== 'theater') { stopTheaterUI(); }
  if (whatif.active && tab !== 'theater') { stopWhatifUI(); }
  S.tab = tab; segSet($('#tabs'), 'tab', tab);
  for (const row of $$('.ctx-row')) row.hidden = row.dataset.tab !== tab;
  if (tab === 'fly') { if (S.explode > 0.02) { setExplode(0); showToast('分解をもどしました'); } if (S.mode === 'cut') setMode('normal'); }
  if (tab !== 'fly') { setSticks(false); if (S.power > 0 && !theater.active) setPower(0, true); if (S.flight) setFlight(null); }
  if (tab !== 'use' && S.use) setUse(null);
  if (tab !== 'use' && S.scale) setScale(false);
  if (tab !== 'expert' && S.expert) expertStop(true);
  if (tab === 'expert' && !S.expert) expertStart(store.get('expertMode') || 'sensors');
  if (tab === 'mishap') { if (!store.get('mishapSeen')) { showToast('まちがえた機体を飛ばして、どこが壊れるか見てみよう', 3200); store.set('mishapSeen', '1'); } }
  syncBodyMode();
}
$('#tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setTab(b.dataset.tab); });

// ---------- はじめて / くわしく ----------
function setDepth(d) {
  S.depth = d; store.set('depth', d); document.body.classList.toggle('full', d === 'full'); segSet($('#depthSeg'), 'd', d); $('#coach').hidden = true;
  buildList(); renderDetail(); buildLabels(); buildMishapCards(); buildAsk(); updateBigBand(); if (S.scale) renderMassBar(S.selected && S.selected.key);
  buildWhatifCards();
  if (d === 'full') showToast('くわしく: 部品40種の仕様例と点検ポイントも見られます'); 
}
$('#depthSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setDepth(b.dataset.d); });

// ---------- モード / 分解 / モーター ----------
function setMode(m) { const was = S.mode; S.mode = m; segSet($('#modeSeg'), 'mode', m); applyMode(); applyBlueprint(); if (m !== was) { if (m === 'cut') { setView('inside'); showToast('断面: モーター1つとバッテリーを半分に切った断面を見ています'); } else showToast({ normal: 'ふつうの見え方', xray: 'すけて見る: 外側を透かして中の部品が見えます', wire: '線だけ: 形の輪郭だけを見ます', blueprint: '設計図: 40部品をすべて見た人だけの見え方です' }[m]); } }
$('#modeSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setMode(b.dataset.mode); });
const explodeEl = $('#explode');
explodeEl.addEventListener('input', () => { S.explodeAt = performance.now(); S.explode = explodeEl.value / 100; S.explodeT = S.explode; $('#explodeVal').textContent = explodeEl.value + '%'; explodePullBack(); S.shadowDirty = S.csDirty = true; });
function explodePullBack() { if (S.explode < 0.35 || S.explodedCam) return; S.explodedCam = true; S.explodeFrame = true; }
function setExplode(v) { S.explode = v; S.explodeAt = performance.now(); explodeEl.value = Math.round(v * 100); $('#explodeVal').textContent = Math.round(v * 100) + '%'; explodePullBack(); }
function setPower(p, silent) { S.power = p; segSet($('#powerSeg'), 'p', p); const b = $('#powerBtn'); b.textContent = p > 0 ? t('stop') : t('power'); b.classList.toggle('primary', p === 0); syncBodyMode();
  if (p > 0 && !silent && !store.get('coachFlick') && S.tab === 'fly') setTimeout(() => { if (S.power > 0 && body.mode === 'free') showCoach('機体をはじいてみよう', '浮いている機体を指やマウスでさっとはじくと、傾いたぶんを頭脳（FC）がモーターの速さで直します。', null, () => store.set('coachFlick', '1')); }, 2500); }
$('#powerBtn').addEventListener('click', () => setPower(S.power > 0 ? 0 : (S.depth === 'full' ? (parseFloat($('#powerSeg .on')?.dataset.p) || 0.5) : 0.5)));
$('#powerSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setPower(parseFloat(b.dataset.p)); });
function syncBodyMode() {
  if (theater.active) return setBodyMode('theater');
  if (S.flight) return setBodyMode('demo');
  if (S.power > 0 && (S.tab === 'fly' || S.scale || alive.on || (S.lesson && lesson.hover) || S.expert === 'sensors')) return setBodyMode('free');
  setBodyMode('idle');
}
// 飛行の原理
function setFlight(f) {
  if (f) stopOthers('flight', f);
  S.flight = f; body.t = 0; for (const b of $$('#flightChips button')) b.classList.toggle('on', b.dataset.f === f);
  if (f && S.power === 0) setPower(0.5, true);
  syncBodyMode();
  if (f) { const d = FLIGHT[f]; renderNote({ kind: 'flight', title: d.name, html: `<p>${d.note}</p><div class="mtab" id="fnTab"></div>`, onClose: () => setFlight(null) }); controls.autoRotate = false; }
  else if ($('#noteCard').dataset.kind === 'flight') renderNote(null);
}
$('#flightChips').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; setFlight(S.flight === b.dataset.f ? null : b.dataset.f); });
function updateFlightTab() { const tab = $('#fnTab'); if (!tab) return; const mean = Math.max(1, D.motors.reduce((a, m) => a + m.pct, 0) / 4); tab.innerHTML = D.motors.map((mo, i) => { const pct = Math.round(mo.pct); const cls = mo.pct > mean * 1.03 ? 'up' : mo.pct < mean * 0.97 ? 'down' : ''; return `<div class="${cls}"><b>${MOTOR_INFO[i].id} ${pct}%</b>${MOTOR_INFO[i].pos} · ${MOTOR_INFO[i].dir === 'CW' ? '↻' : '↺'}${MOTOR_INFO[i].dir}</div>`; }).join(''); }
// トグル
document.addEventListener('click', e => {
  const b = e.target.closest('.tgl'); if (!b) return;
  const t = b.dataset.t; const on = !b.classList.contains('on');
  for (const x of $$(`.tgl[data-t="${t}"]`)) { x.classList.toggle('on', on); x.setAttribute('aria-pressed', String(on)); }
  if (t === 'labels') { S.labels = on; S.labelsTouched = true; }
  else if (t === 'arrows') { S.arrows = on; if (on) showLegend(); }
  else if (t === 'slow') { setTimeScale(on ? 1 / 50 : 1); if (on) { if (S.power === 0) setPower(0.5); showLegend(); } }
  else if (t === 'air') { S.air = on; if (on) { if (S.power === 0) setPower(0.5); if (!store.get('airSeen')) { showToast('プロペラが空気を下に押しています。押した分だけ、機体は上に押し返されます。', 3600); store.set('airSeen', '1'); } } }
  else if (t === 'sticks') setSticks(on);
  else if (t === 'tilt') setTilt(on);
  else if (t === 'shadows') { S.shadows = on; applyMode(); }
  else if (t === 'alive') setAlive(on);
  else if (t === 'speakAuto') setSpeakAuto(on);
  else if (t === 'big') setBig(on);
});
function showLegend() { if ($('#noteCard').dataset.kind === 'flight' || $('#noteCard').dataset.kind === 'question') return;
  renderNote({ kind: 'legend', title: 'まわる向きのしるし', badge: S.slow ? '1/50のはやさ' : null, html: `<div class="legend"><span class="ccw"><b>↺ 反時計まわり(CCW)</b></span> しま模様の羽・翼端が青緑<br><span class="cw"><b>↻ 時計まわり(CW)</b></span> 無地の羽・翼端が青<br>白い印が上を向いていれば正しい向きに付いています<br><b>灯火</b> 前・左 <span style="color:#ff3b30">●</span>赤 / 前・右 <span style="color:#22c55e">■</span>緑 / 後ろ ◆白</div>` }); }

// ---------- 視点列 ----------
$('#viewCol').addEventListener('click', e => { const b = e.target.closest('button[data-v]'); if (!b) return; segSet($('#viewCol'), 'v', b.dataset.v); setView(b.dataset.v); });
$('#fsBtn').addEventListener('click', () => { const el = document.documentElement; if (document.fullscreenElement) document.exitFullscreen(); else if (el.requestFullscreen) el.requestFullscreen(); else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen(); });

// ---------- 部品一覧 / 解説 ----------
function buildList() {
  const list = $('#partList'); let html = '';
  if (S.depth === 'simple') { for (const k of SIMPLE_KEYS) html += `<div class="row" data-key="${k}" tabindex="0" role="button"><span class="nm">${partName(k)}</span><span class="cnt"></span><span></span></div>`; $('#partCount').textContent = `${SIMPLE_KEYS.length} 部品`; }
  else {
    for (const g of GROUPS) { const keys = LIST_ORDER.filter(k => PARTS[k] && PARTS[k].group === g.id); html += `<div class="grp" style="--c:${g.color}"><i></i>${g.name}</div>`;
      for (const k of keys) { const d = PARTS[k]; const hid = partsOf(k).some(p => p.hidden); html += `<div class="row${SUB[k] ? ' sub' : ''}${hid ? ' off' : ''}" data-key="${k}" tabindex="0" role="button"><span class="nm">${partName(k)}</span><span class="cnt">${d.count > 1 ? '×' + d.count : ''}</span><button class="eye" aria-label="${d.name}の表示切替">${hid ? ICON.eyeOff : ICON.eye}</button></div>`; } }
    $('#partCount').textContent = `${LIST_ORDER.length} 部品`;
  }
  list.innerHTML = html;
  for (const row of $$('#partList .row')) row.classList.toggle('on', !!S.selected && row.dataset.key === S.selected.key);
}
$('#partList').addEventListener('click', e => { const row = e.target.closest('.row'); if (!row) return; const key = row.dataset.key; if (e.target.closest('.eye')) { toggleHidden(key); return; } select(partsOf(key)[0], true); });
$('#partList').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { const row = e.target.closest('.row'); if (row) { e.preventDefault(); select(partsOf(row.dataset.key)[0], true); } } });
$('#inspBack').addEventListener('click', () => select(null));
function toggleHidden(key) { const ps = partsOf(key); const h = !ps.some(p => p.hidden); for (const p of ps) p.hidden = h; applyVisibility(); buildList(); renderDetail(); }
function onVisibilityChanged() {
  const hiddenKeys = [...new Set(D.parts.filter(p => p.hidden).map(p => p.key))];
  if (S.isolated) showToast(`${PARTS[S.isolated].name} だけを表示中`); else if (hiddenKeys.length) showToast(`非表示: ${hiddenKeys.map(k => PARTS[k].name).join('・')}`);
}
function select(p, all = false, opts = {}) {
  if (p && typeof quiz !== 'undefined' && quiz.active && !opts.fromQuiz) { showToast(S.lang === 'en' ? 'During the quiz, use "Show the name"' : 'クイズ中は「答えを見る」まで選べません'); return; }
  S.selected = p; S.selAll = !!(p && all); S.lastSelect = performance.now();
  outlineSel.selectedObjects = p ? (all ? partsOf(p.key).map(x => x.obj) : [p.obj]) : [];
  if (S.hovered) { setTint(S.hovered, HOVER_L, 0); S.hovered = null; }
  applyMode();
  for (const row of $$('#partList .row')) row.classList.toggle('on', !!p && row.dataset.key === p.key);
  renderDetail();
  if (p && narrow() && !opts.quiet && !S.lesson) (S.expert ? $('#expert') : $('#inspector')).classList.add('open');
  if (S.lesson) renderLessonSel();
  if (S.expert) renderExpertSel();
  if (S.scale) renderMassBar(p && p.key);
  codexOnSelect(p); updateBigBand();
  if (p && alive.speakAuto && !opts.quiet) speakPart(p);
}
function renderDetail() {
  const box = $('#detail'), p = S.selected, body_ = $('#inspBody');
  if (!p) { box.hidden = true; box.innerHTML = ''; body_.classList.remove('detail'); $('#inspBack').hidden = true; $('#inspTitle').textContent = '部品'; return; }
  const d = PARTS[p.key], g = GROUPS.find(x => x.id === d.group), simple = S.depth === 'simple', sd = SIMPLE[p.key];
  const inst = PER_MOTOR.has(p.key) && !S.selAll ? ` · ${MOTOR_INFO[p.idx].id}（${MOTOR_INFO[p.idx].pos}・${MOTOR_INFO[p.idx].dir === 'CW' ? '↻' : '↺'}${MOTOR_INFO[p.idx].dir}）` : '';
  const hidden = partsOf(p.key).some(x => x.hidden);
  let h = `<div class="d-group" style="--c:${g.color}"><i></i>${g.name}</div><div class="d-title"><h3>${partName(p)}</h3>${hasSpeech ? '<button id="detailSpeak" class="icon-btn sm speak" aria-label="読み上げ" title="読み上げ">🔊</button>' : ''}</div><p class="d-en">${S.lang === 'en' ? d.name : d.en}${d.count > 1 ? ` · ×${d.count}` : ''}${inst}</p>`;
  h += codexHead(p.key);
  h += `<div class="d-actions"><button id="dFocus" class="primary">${t('ui.focus')}</button>${simple ? '' : `<button id="dIsolate">${S.isolated === p.key ? '単独表示を解除' : '単独表示'}</button><button id="dHide">${hidden ? '表示する' : '非表示'}</button>`}</div>`;
  h += `<section><h4>${t('sec.role')}</h4><p>${simple && sd ? partRole(p.key) : d.role}</p></section>`;
  if (!simple || !langEntry(p.key)) h += langNote();
  h += codexTriviaRow(p.key);
  if (simple && sd) h += `<div class="analogy"><b>${t('sec.analogy')}</b>${partAnalogy(p.key)}</div>`;
  if (!simple && (p.key === 'motor' || p.key === 'prop' || p.key === 'esc')) h += `<section><h4>配置と回転方向（上から見て）</h4><div class="mtab">${MOTOR_INFO.map(m => `<div class="${m.dir.toLowerCase()}"><b>${m.id} ${m.dir === 'CW' ? '↻' : '↺'}${m.dir}</b>${m.pos}</div>`).join('')}</div></section>`;
  if (d.structure && S.lang === 'en' && simple && langEntry(p.key)) h += langNote();
  if (d.structure) h += `<section><h4>${t('sec.structure')}</h4><ul>${d.structure.slice(0, simple ? 3 : 9).map(s => `<li>${s}</li>`).join('')}</ul></section>`;
  if (!simple && d.spec) h += `<details><summary>仕様例</summary><dl class="spec">${d.spec.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl></details>`;
  if (!simple && d.check) h += `<section class="check"><h4>点検ポイント</h4><ul>${d.check.map(s => `<li>${s}</li>`).join('')}</ul></section>`;
  if (!simple && d.tip) h += `<div class="tipbox"><b>Note</b>${d.tip}</div>`;
  if (simple) h += `<div class="d-actions" style="margin-top:14px"><button id="dMore">${t('ui.more')}</button></div>`;
  box.innerHTML = h; box.hidden = false; box.scrollTop = 0; body_.classList.add('detail'); $('#inspBack').hidden = false; $('#inspTitle').textContent = '';
  $('#dFocus').onclick = () => focusOn(S.selAll ? partsOf(p.key).map(x => x.obj) : [p.obj]);
  const iso = $('#dIsolate'); if (iso) iso.onclick = () => { S.isolated = S.isolated === p.key ? null : p.key; applyVisibility(); renderDetail(); if (S.isolated) focusOn(partsOf(p.key).map(x => x.obj)); };
  const hd = $('#dHide'); if (hd) hd.onclick = () => toggleHidden(p.key);
  const more = $('#dMore'); if (more) more.onclick = () => setDepth('full');
  const sp = $('#detailSpeak'); if (sp) sp.onclick = () => speakPart(p);
  const tg = $('#triviaGo'); if (tg) tg.onclick = () => triviaAct(p.key);
}

// ---------- ラベル / モーターバッジ ----------
let labelEls = [];
function buildLabels() {
  $('#labels').innerHTML = ''; $('#leaders').innerHTML = '';
  const keys = S.depth === 'simple' ? new Set(SIMPLE_KEYS) : null;
  labelEls = D.parts.filter(p => (p.label || p.labelObj) && (!keys || keys.has(p.key) || (S.labelOnly && S.labelOnly.has(p.key))) && (!S.price || PRICE[p.key])).map(p => {
    const el = document.createElement('button'); el.className = 'lbl'; el.textContent = S.price ? '¥' + PRICE[p.key].toLocaleString() : partName(p); el.type = 'button';
    el.tabIndex = -1; el.addEventListener('click', () => select(p, true)); $('#labels').appendChild(el);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line'), dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); dot.setAttribute('r', '3'); $('#leaders').append(line, dot);
    return { p, el, line, dot, w: 0, h: 0, x: 0, y: 0, ax: 0, ay: 0, show: false };
  });
}
const badgeEls = D.motors.map((mo, i) => { const el = document.createElement('div'); el.className = 'mbadge'; el.hidden = true; $('#badges').appendChild(el); return { mo, el, i }; });
function updateLabels() {
  const camDist = camera.position.distanceTo(controls.target);
  const forced = !!S.labelOnly || (S.scale && S.price);   // ⑩: 特定の部品だけを強制表示 / ⑥: ¥表示中は価格ラベルを必ず出す
  const live = body.mode !== 'idle' && !forced && !(S.scale && S.price) && !((alive.on || (S.lesson && lesson.hover)) && body.mode === 'free' && !body.hold && !body.stick.active);   // ¥表示中は価格ラベルを出す   // ⑧: 生きているだけならラベルは出す
  for (const L of labelEls) {
    const p = L.p;
    let show = (forced || (S.labels && !S.labelsSuppressed)) && !live && partVisible(p) && effVisible(p.obj) && (!S.labelOnly || S.labelOnly.has(p.key));
    if (show && camDist < 0.5 && !(S.selected && S.selected.key === p.key)) show = false;
    if (show && !forced && S.depth === 'full' && camDist > 1.0 && !SIMPLE_KEYS.includes(p.key) && !(S.selected && S.selected.key === p.key)) show = false;   // 引きの画では主要8枚だけ
    if (show) {
      const a = p.labelObj ? p.labelObj.getWorldPosition(tmpV) : p.obj.localToWorld(tmpV.copy(p.label));
      const depth = a.distanceTo(camera.position) - camDist; const pr = tmpV2.copy(a).project(camera);
      if (pr.z > 1) show = false; else {
        L.ax = (pr.x + 1) / 2 * W; L.ay = (1 - pr.y) / 2 * H;
        let dx = L.ax - W / 2, dy = L.ay - H / 2; const len = Math.hypot(dx, dy); if (len < 24) { dx = 0; dy = -1; } else { dx /= len; dy /= len; }
        const off = 70 + 90 * Math.abs(dx); const rightLim = narrow() ? W - 70 : W - 344 - 40 - 60;
        L.x = clamp(L.ax + dx * off, 70, rightLim); L.y = clamp(L.ay + dy * off, 90, H - 130); L.dim = depth > 0.07;
        if (!L.w) { L.w = L.el.offsetWidth; L.h = L.el.offsetHeight; }
      }
    }
    L.show = show;
  }
  const vis = labelEls.filter(L => L.show);
  for (let it = 0; it < 6; it++) for (let i = 0; i < vis.length; i++) for (let j = i + 1; j < vis.length; j++) { const a = vis[i], b = vis[j]; const ox = (a.w + b.w) / 2 + 8 - Math.abs(a.x - b.x), oy = (a.h + b.h) / 2 + 6 - Math.abs(a.y - b.y); if (ox > 0 && oy > 0) { const s = a.y < b.y ? -1 : 1; a.y += s * oy / 2; b.y -= s * oy / 2; } }
  for (const L of labelEls) {
    L.el.style.display = L.show ? '' : 'none'; L.line.style.display = L.dot.style.display = L.show ? '' : 'none'; if (!L.show) continue;
    L.el.style.transform = `translate(${L.x.toFixed(1)}px, ${L.y.toFixed(1)}px) translate(-50%,-50%)`; L.el.classList.toggle('dim', L.dim); L.el.classList.toggle('on', !!S.selected && S.selected.key === L.p.key);
    let vx = L.ax - L.x, vy = L.ay - L.y; const vl = Math.hypot(vx, vy) || 1; vx /= vl; vy /= vl; const t = Math.min(L.w / 2 / Math.max(1e-3, Math.abs(vx)), L.h / 2 / Math.max(1e-3, Math.abs(vy)));
    L.line.setAttribute('x1', (L.x + vx * t).toFixed(1)); L.line.setAttribute('y1', (L.y + vy * t).toFixed(1)); L.line.setAttribute('x2', L.ax.toFixed(1)); L.line.setAttribute('y2', L.ay.toFixed(1)); L.dot.setAttribute('cx', L.ax.toFixed(1)); L.dot.setAttribute('cy', L.ay.toFixed(1));
    L.line.classList.toggle('dim', L.dim); L.dot.classList.toggle('dim', L.dim);
  }
  // モーターの%バッジ
  for (const B of badgeEls) {
    const show = (live || S.scale) && B.mo.rpm > 100 && partVisible(B.mo.part) && !theater.active;
    B.el.hidden = !show; if (!show) continue;
    const a = B.mo.group.localToWorld(tmpV.set(0, 0.10, 0)); const pr = tmpV2.copy(a).project(camera); if (pr.z > 1) { B.el.hidden = true; continue; }
    const x = clamp((pr.x + 1) / 2 * W, 60, W - 60), y = clamp((1 - pr.y) / 2 * H, 40, H - 40); B.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%,-50%)`;
    const pct = Math.round(B.mo.pct), mean = Math.max(1, D.motors.reduce((a, m) => a + m.pct, 0) / 4), up = B.mo.pct > mean * 1.03, dn = B.mo.pct < mean * 0.97; B.el.classList.toggle('up', up); B.el.classList.toggle('down', dn); B.el.classList.toggle('over', !!(S.scale && scale.share[B.i] > SCALE_OVER));
    B.el.innerHTML = S.depth === 'simple' && !S.scale ? (up ? 'はやい ▲' : dn ? 'おそい ▼' : 'ふつう') : `${MOTOR_INFO[B.i].id} ${pct}% ${up ? '▲' : dn ? '▼' : ''}<small>${MOTOR_INFO[B.i].pos} ${MOTOR_INFO[B.i].dir === 'CW' ? '↻' : '↺'}</small>`;
  }
}

// ---------- coach / 質問 ----------
function showCoach(text, sub, go, later) { const c = $('#coach'); $('#coachText').textContent = text; $('#coachSub').textContent = sub || ''; c.hidden = false; $('#coachGo').hidden = !go; $('#coachGo').onclick = () => { c.hidden = true; if (go) go(); }; $('#coachLater').onclick = () => { c.hidden = true; if (later) later(); }; if (!go) $('#coachLater').textContent = 'わかった'; else $('#coachLater').textContent = 'あとで'; }
function buildAsk() {
  const list = $('#askList'); list.innerHTML = QUESTIONS.slice(0, 6).map(q => `<button class="ask" data-q="${q.id}"><span class="q">？</span>${qText(q)}</button>`).join('') + `<button class="more" id="askMore">${S.lang === 'en' ? 'More questions ▾' : S.lang === 'easy' ? 'ほかの しつもん ▾' : 'ほかの質問 ▾'}</button><div id="askRest" hidden>${QUESTIONS.slice(6).map(q => `<button class="ask" data-q="${q.id}"><span class="q">？</span>${qText(q)}</button>`).join('')}</div>`;
  $('#askMore').onclick = () => { $('#askRest').hidden = false; $('#askMore').hidden = true; };
}
$('#askBtn').addEventListener('click', e => { e.stopPropagation(); const p = $('#askPop'); p.hidden = !p.hidden; $('#settings').hidden = true; });
$('#askList').addEventListener('click', e => { const b = e.target.closest('.ask'); if (!b) return; $('#askPop').hidden = true; askQuestion(b.dataset.q); });
document.addEventListener('click', e => { if (!e.target.closest('#askPop') && !e.target.closest('#askBtn')) $('#askPop').hidden = true; if (!e.target.closest('#settings') && !e.target.closest('#settingsBtn')) $('#settings').hidden = true; });
let qPulse = null;
function clearQuestion() {
  if (!S.question) return; const q = S.question; S.question = null; if (qPulse) { clearInterval(qPulse); qPulse = null; }
  for (const k of q.parts) for (const p of partsOf(k)) setTint(p, ACCENT, 0); if (!S.selected) outlineSel.selectedObjects = [];
  if (q.act && q.act.flight && S.flight === q.act.flight) setFlight(null);
  // 質問が入れた気流・ゆっくり・矢印は、質問を閉じるときに戻す（自分で入れたものは残す）
  const on = q._turnedOn || {};
  if (on.air) { S.air = false; for (const x of $$('.tgl[data-t=air]')) { x.classList.remove('on'); x.setAttribute('aria-pressed', 'false'); } }
  if (on.slow) { setTimeScale(1); for (const x of $$('.tgl[data-t=slow]')) { x.classList.remove('on'); x.setAttribute('aria-pressed', 'false'); } }
  if (on.arrows) { S.arrows = false; for (const x of $$('.tgl[data-t=arrows]')) { x.classList.remove('on'); x.setAttribute('aria-pressed', 'false'); } }
  q._turnedOn = null;
}
function askQuestion(id) {
  const q = QUESTIONS.find(x => x.id === id); if (!q) return;
  clearQuestion(); stopOthers('question'); S.question = q; if (q.act) setSticks(false);
  const objs = q.parts.flatMap(k => partsOf(k).map(p => p.obj)); if (!S.selected) outlineSel.selectedObjects = objs;
  let n = 0; qPulse = setInterval(() => { n++; const k = n % 2 ? 0.7 : 0; for (const key of q.parts) for (const p of partsOf(key)) setTint(p, ACCENT, k); if (n >= 4) { clearInterval(qPulse); qPulse = null; for (const key of q.parts) for (const p of partsOf(key)) setTint(p, ACCENT, 0.25); } }, 260);
  focusOn(objs, { pull: true });
  const a = q.act || {}; q._turnedOn = { air: !!a.air && !S.air, slow: !!a.slow && !S.slow, arrows: !!a.arrows && !S.arrows };
  if (a.power != null && S.power === 0) { setTab('fly'); setPower(a.power, true); }
  if (a.air) { S.air = true; for (const x of $$('.tgl[data-t=air]')) x.classList.add('on'); }
  if (a.slow) { setTimeScale(1 / 50); for (const x of $$('.tgl[data-t=slow]')) x.classList.add('on'); }
  if (a.arrows) { S.arrows = true; for (const x of $$('.tgl[data-t=arrows]')) x.classList.add('on'); }
  if (a.flight) { setTab('fly'); setFlight(a.flight); }
  const actions = [];
  actions.push({ label: S.lang === 'en' ? `About ${partName(q.parts[0])} ›` : `${partName(q.parts[0])}をくわしく ›`, fn: () => select(partsOf(q.parts[0])[0], true) });
  if (hasSpeech) actions.push({ label: '🔊', fn: () => speak(`${qText(q)}。${q.a}`) });
  if (a.theater) actions.push({ label: 'やってみる ▶', primary: true, fn: () => { setTab('mishap'); startTheaterUI(a.theater); } });
  const idx = QUESTIONS.indexOf(q); actions.push({ label: 'つぎの質問 ›', fn: () => askQuestion(QUESTIONS[(idx + 1) % QUESTIONS.length].id) });
  renderNote({ kind: 'question', title: qText(q), html: `<p>${q.a}</p>${langNote()}`, actions, onClose: () => { clearQuestion(); } });
  syncBodyMode();
}

// ---------- 用途 ----------
const useMat = new THREE.MeshPhysicalMaterial({ color: 0x3b7df7, transparent: true, opacity: 0.38, roughness: 0.4, metalness: 0, depthWrite: false, side: THREE.DoubleSide });
const ghostGroup = new THREE.Group(); ghostGroup.userData.noShadow = true; D.root.add(ghostGroup); const ghostCache = {};
function buildUseChips() { $('#useChips').innerHTML = USES.map(u => `<button data-u="${u.id}">${u.name}</button>`).join(''); }
$('#useChips').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setUse(S.use === b.dataset.u ? null : b.dataset.u); });
$('#useReset').addEventListener('click', () => setUse(null));
function num(s) { const m = String(s).match(/[\d.]+/g); return m ? parseFloat(m[m.length - 1]) : 0; }
function setUse(id) {
  if (id) stopOthers('use');
  if (S.use) { const prev = USES.find(u => u.id === S.use); for (const k of prev.up) for (const p of partsOf(k)) setTint(p, UP_COLOR, 0); for (const k of (prev.drop || [])) for (const p of partsOf(k)) { setTint(p, DROP_COLOR, 0); } for (const c of ghostGroup.children) c.visible = false; }
  S.use = id; for (const b of $$('#useChips button')) b.classList.toggle('on', b.dataset.u === id); $('#useReset').hidden = !id;
  if (!id) { if ($('#noteCard').dataset.kind === 'use') renderNote(null); applyMode(); return; }
  const u = USES.find(x => x.id === id);
  for (const k of u.up) for (const p of partsOf(k)) setTint(p, UP_COLOR, 0.8);
  for (const k of (u.drop || [])) for (const p of partsOf(k)) setTint(p, DROP_COLOR, 1.0);
  if (!ghostCache[id]) { ghostCache[id] = u.ghost.map(g => { const m = buildGhost(g, useMat); ghostGroup.add(m); return m; }); }
  for (const m of ghostCache[id]) m.visible = true;
  applyMode();
  const addKg = num(u.weight), baseKg = 2.4, t0 = 20, t1 = num(u.time);
  const html = `<p><b>${u.tagline}</b></p><p>${u.how}</p>
    <div class="bar"><span>重さ</span><i class="cmp" style="--w0:${baseKg / (baseKg + addKg) * 100}%;--w:100%"></i><span>${baseKg} kg + ${String(u.weight).replace(/^\+/, '')}</span></div>
    <div class="bar"><span>飛べる時間</span><i class="cmp" style="--w0:100%;--w:${t1 / t0 * 100}%"></i><span>${u.time}</span></div>
    <div class="keys"><span><i style="background:var(--ink3)"></i>そのまま</span><span><i style="background:${'#ef6a2d'}"></i>大きく・強く</span><span><i style="background:#3b7df7;opacity:.6"></i>新しく付ける</span>${u.drop ? '<span><i style="background:#9aa0a8"></i>外す</span>' : ''}</div>
    ${S.depth === 'full' ? `<p style="margin-top:8px;font-size:12.5px;color:var(--ink2)">追加: ${u.ghost.filter((g, i, a) => a.findIndex(x => x.name === g.name) === i).map(g => g.name).join('・')}<br>強化: ${u.up.map(k => PARTS[k].name).join('・')}</p>` : ''}`;
  renderNote({ kind: 'use', title: u.name, html, actions: [{ label: 'もどす', fn: () => setUse(null) }], onClose: () => setUse(null) });
}

// ---------- もしも(シアター) ----------
function buildMishapCards() { const list = S.depth === 'simple' ? MISHAPS.filter(m => ['propReverse', 'drop', 'motorOut'].includes(m.id)) : MISHAPS; $('#mishapCards').innerHTML = list.map(m => `<button data-m="${m.id}"><b>${m.short}</b>${m.name}</button>`).join(''); }
$('#mishapCards').addEventListener('click', e => { const b = e.target.closest('button'); if (b) startTheaterUI(b.dataset.m); });
function buildWhatifCards() { $('#whatifCards').innerHTML = WHATIF.map(w => `<button data-w="${w.id}"><b>${w.icon} ${w.name}</b>${w.short || w.intro.slice(0, 22)}</button>`).join(''); }
$('#whatifCards').addEventListener('click', e => { const b = e.target.closest('button'); if (b) startWhatifUI(b.dataset.w); });
function startWhatifUI(id) {
  stopOthers('whatif'); if (S.flight) setFlight(null); clearQuestion(); select(null); setSticks(false); if (S.explode > 0) setExplode(0); if (S.mode !== 'normal') setMode('normal'); if (S.scale) setScale(false); if (S.use) setUse(null);
  $('#coach').hidden = true; startWhatif(id); document.body.classList.add('theater'); $('#inspector').inert = true; $('#topbar').inert = true; $('#inspector').classList.remove('open');
  S.tab = 'theater'; for (const row of $$('.ctx-row')) row.hidden = row.dataset.tab !== 'theater'; segSet($('#tabs'), 'tab', 'mishap');
  for (const b of $$('#whatifCards button')) b.classList.toggle('on', b.dataset.w === id);
}
function stopWhatifUI() {
  stopWhatif(true); document.body.classList.remove('theater'); $('#inspector').inert = false; $('#topbar').inert = false; camHome();
  setPower(0, true); renderNote(null); S.tab = 'mishap'; for (const row of $$('.ctx-row')) row.hidden = row.dataset.tab !== 'mishap';
  for (const b of $$('#whatifCards button')) b.classList.remove('on'); syncBodyMode();
}
function onWhatifChanged() {
  if (!whatif.active) return;
  const d = whatif.def, si = whatifStageIndex();
  $('#thStages').innerHTML = WHATIF_STAGES.map((n, i) => `<span class="${i < si ? 'done' : i === si ? 'on' : ''}">${n}</span>`).join('');
  const nb = $('#thNext'); nb.hidden = whatif.phase !== 0;   // 最終段はカードの「もう一度」と ✕ やめる で足りる
  nb.textContent = '機体の反応を見る ▶';
  $('#thSlow').hidden = true;
  let html = '', actions = [];
  if (whatif.phase === 0) html = `<p>${d.intro}</p>`;
  else if (whatif.phase === 1) html = `<p>${d.reaction}</p>`;
  else if (whatif.phase === 2) html = `<p>${d.reaction}</p><ol class="parts-seq">${whatif.seq.map((k, i) => `<li class="${i === whatif.seq.length - 1 ? 'lit' : ''}"><b>${partName(k)}</b>${d.partNotes[k] || ''}</li>`).join('')}</ol>`;
  else html = `<div class="two-col"><div><h4>機体ができること</h4><ul>${d.can.map(t => `<li>${t}</li>`).join('')}</ul></div><div><h4>人がやること</h4><ul>${d.human.map(t => `<li>${t}</li>`).join('')}</ul></div></div><p class="caveat">${d.caveat}</p>`;
  if (whatif.phase === 3) actions = [{ label: 'もう一度', fn: () => whatifRestart() }];
  renderNote({ kind: 'whatif', title: `${d.icon} ${d.name}`, badge: WHATIF_STAGES[si], html, actions });
}
function startTheaterUI(id) {
  stopOthers('theater'); if (whatif.active) { stopWhatif(true); for (const b of $$('#whatifCards button')) b.classList.remove('on'); }
  if (S.flight) setFlight(null); clearQuestion(); select(null); setSticks(false); if (S.explode > 0) setExplode(0); if (S.mode === 'cut') setMode('normal');
  $('#coach').hidden = true; startTheater(id); document.body.classList.add('theater'); $('#inspector').inert = true; $('#topbar').inert = true; $('#inspector').classList.remove('open'); S.tab = 'theater'; for (const row of $$('.ctx-row')) row.hidden = row.dataset.tab !== 'theater'; segSet($('#tabs'), 'tab', 'mishap');
  for (const b of $$('#mishapCards button')) b.classList.toggle('on', b.dataset.m === id);
}
function stopTheaterUI() { stopTheater(true); document.body.classList.remove('theater'); $('#inspector').inert = false; $('#topbar').inert = false; camHome(); setPower(0, true); renderNote(null); S.tab = 'mishap'; for (const row of $$('.ctx-row')) row.hidden = row.dataset.tab !== 'mishap'; for (const b of $$('#mishapCards button')) b.classList.remove('on'); syncBodyMode(); }
$('#thQuit').addEventListener('click', () => { if (whatif.active) stopWhatifUI(); else stopTheaterUI(); });
$('#thNext').addEventListener('click', () => {
  if (whatif.active) { if (whatif.phase === 3) stopWhatifUI(); else whatifNext(); return; }
  if (theater.done || !theater.active) { stopTheaterUI(); return; } theaterNext();
});
function onTheaterChanged() {
  $('#thSlow').hidden = false;   // ⑩が隠したものを戻す
  if (!theater.active && !theater.done) return;
  const si = theaterStageIndex(); $('#thStages').innerHTML = TH_STAGES.map((n, i) => `<span class="${i < si ? 'done' : i === si ? 'on' : ''}">${n}</span>`).join('');
  const nb = $('#thNext'); nb.hidden = !theater.waiting;
  nb.textContent = theater.phase === 'setup' ? 'とばしてみる ▶' : theater.phase === 'broken' ? 'どの点検で防げた？ ›' : theater.phase === 'prevent' ? 'なおして元にもどす ›' : 'とじる';
  const d = theater.def; const brokenList = theater.red.length ? `<div class="chips" style="margin-top:8px">${[...new Set(theater.red.map(p => p.key))].map(k => `<button data-bk="${k}">${PARTS[k].name}</button>`).join('')}</div>` : '';
  renderNote({ kind: 'theater', title: d.short, badge: TH_STAGES[si], html: `<p>${theater.subtitle}</p>${theater.phase === 'broken' ? brokenList : ''}${theater.phase === 'prevent' ? `<p style="margin-top:6px;color:var(--ink2)">${d.result}</p>` : ''}`, actions: theater.phase === 'prevent' ? [{ label: `${PARTS[d.checkPart].name}の点検を見る`, fn: () => { setDepth('full'); select(partsOf(d.checkPart)[0], true); } }] : [] });
  for (const b of $$('#noteBody [data-bk]')) b.onclick = () => select(partsOf(b.dataset.bk)[0], true);
  if (theater.done) { document.body.classList.remove('theater'); $('#inspector').inert = false; $('#topbar').inert = false; }
}

// ---------- 仮想スティック / 傾け ----------
const STICK_MAP = { 1: { L: { v: 'pitch', h: 'yaw' }, R: { v: 'thr', h: 'roll' } }, 2: { L: { v: 'thr', h: 'yaw' }, R: { v: 'pitch', h: 'roll' } } };
const AXIS_LBL = { pitch: ['前', '後'], yaw: ['←向き', '向き→'], thr: ['上', '下'], roll: ['←左', '右→'] };
let stickMode = ['1', '2'].includes(store.get('stickMode')) ? store.get('stickMode') : '1';
function setSticks(on) { S.sticks = on; for (const x of $$('.tgl[data-t=sticks]')) x.classList.toggle('on', on); $('#sticks').hidden = !on; if (on) { if (S.power === 0) setPower(0.5, true); if (!store.get('stickSeen')) { showToast('スティックをたおすと、4つのモーターがそれぞれ違う速さになります。', 3600); store.set('stickSeen', '1'); } } else { body.stick.active = false; body.stick.x = body.stick.y = body.stick.yaw = body.stick.thr = 0; } labelSticks(); }
function labelSticks() { for (const side of ['L', 'R']) { const map = STICK_MAP[stickMode][side]; const el = $(side === 'L' ? '#stickL' : '#stickR'); el.querySelector('.lbl.t').textContent = AXIS_LBL[map.v][0]; el.querySelector('.lbl.b').textContent = AXIS_LBL[map.v][1]; el.querySelector('.lbl.l').textContent = AXIS_LBL[map.h][0]; el.querySelector('.lbl.r').textContent = AXIS_LBL[map.h][1]; } }
$('#modeSeg2').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; stickMode = b.dataset.m; store.set('stickMode', stickMode); segSet($('#modeSeg2'), 'm', stickMode); labelSticks(); });
for (const side of ['L', 'R']) {
  const el = $(side === 'L' ? '#stickL' : '#stickR'), knob = el.querySelector('.knob'); let active = null;
  const setVal = (nx, ny) => { const map = STICK_MAP[stickMode][side]; const st = body.stick; const dz = 0.06; const mag = Math.hypot(nx, ny); if (mag < dz) { nx = ny = 0; } else if (mag > 1) { nx /= mag; ny /= mag; }
    st[map.h === 'yaw' ? 'yaw' : 'x'] = nx; st[map.v === 'thr' ? 'thr' : 'y'] = -ny; st.active = Math.abs(st.x) + Math.abs(st.y) + Math.abs(st.yaw) + Math.abs(st.thr) > 0; knob.style.transform = `translate(${nx * 30}px, ${ny * 30}px)`; };
  el.addEventListener('pointerdown', e => { active = e.pointerId; el.setPointerCapture(e.pointerId); const r = el.getBoundingClientRect(); setVal((e.clientX - r.left - r.width / 2) / 34, (e.clientY - r.top - r.height / 2) / 34); S.lastInteract = performance.now(); });
  el.addEventListener('pointermove', e => { if (active !== e.pointerId) return; const r = el.getBoundingClientRect(); setVal((e.clientX - r.left - r.width / 2) / 34, (e.clientY - r.top - r.height / 2) / 34); });
  const end = e => { if (active !== e.pointerId) return; active = null; setVal(0, 0); knob.style.transition = 'transform .18s cubic-bezier(.32,.72,0,1)'; setTimeout(() => knob.style.transition = '', 200); };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
}
// 端末の傾き
const tiltF = { b0: 0, g0: 0, x: 0, y: 0, ready: false, samples: [] };
if (window.DeviceOrientationEvent && isMobile) $('#tiltBtn').hidden = false;
async function setTilt(on) {
  if (on) {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      if (!store.get('tiltExplained')) { for (const x of $$('.tgl[data-t=tilt]')) { x.classList.remove('on'); x.setAttribute('aria-pressed', 'false'); } showCoach('スマホをかたむけて操縦します', '次に出る画面で「許可」を押してください。水平に持った位置が基準になります。', () => { store.set('tiltExplained', '1'); setTilt(true); }); return; }
      try { const r = await DeviceOrientationEvent.requestPermission(); if (r !== 'granted') { showToast('iPhoneの「設定」›「アプリ」›「Safari」›「モーションと画面の向きのアクセス」をオンにして、もう一度押してください', 5000); on = false; } } catch (e) { on = false; } }
    if (on) { tiltF.ready = false; tiltF.samples = []; window.addEventListener('deviceorientation', onTiltEvent); if (S.power === 0) setPower(0.5, true); showToast('スマホをかたむけて操縦します。水平に持った位置が基準です。', 3200); }
  } else { window.removeEventListener('deviceorientation', onTiltEvent); body.tilt.active = false; body.tilt.x = body.tilt.y = 0; }
  S.tilt = on; for (const x of $$('.tgl[data-t=tilt]')) { x.classList.toggle('on', on); x.setAttribute('aria-pressed', String(on)); }
}
function onTiltEvent(e) {
  if (e.beta == null) return;
  if (!tiltF.ready) { tiltF.samples.push([e.beta, e.gamma]); if (tiltF.samples.length >= 15) { tiltF.b0 = tiltF.samples.reduce((a, s) => a + s[0], 0) / 15; tiltF.g0 = tiltF.samples.reduce((a, s) => a + s[1], 0) / 15; tiltF.ready = true; } return; }
  const dz = v => Math.sign(v) * Math.max(0, (Math.abs(v) - 0.12) / 0.88);
  const gx = dz(clamp((e.gamma - tiltF.g0) / 25, -1, 1)), gy = dz(clamp(-(e.beta - tiltF.b0) / 25, -1, 1));
  const now = e.timeStamp || performance.now(); const dtE = Math.min(0.1, Math.max(0.001, (now - (tiltF.last || now)) / 1000)); tiltF.last = now;
  const k = 1 - Math.exp(-dtE / 0.08), slew = 4.8 * dtE;
  tiltF.x += clamp((gx - tiltF.x) * k, -slew, slew); tiltF.y += clamp((gy - tiltF.y) * k, -slew, slew);
  body.tilt.x = tiltF.x; body.tilt.y = tiltF.y; body.tilt.active = S.tilt;
}
document.addEventListener('visibilitychange', () => { if (document.hidden && S.tilt) setTilt(false); });

// ---------- 3Dのポインタ操作 (押す/はじく/選ぶ/回す) ----------
const ray = new THREE.Raycaster(); const ptr = new THREE.Vector2(); const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
function pickAt(x, y) {
  ptr.set((x / W) * 2 - 1, -(y / H) * 2 + 1); ray.setFromCamera(ptr, camera);
  const hits = ray.intersectObjects(D.pick, false); const detail = S.mode === 'cut' || S.explodeT > 0.25;
  for (const h of hits) { const m = h.object; if (!effVisible(m)) continue; if (m.userData.wire && S.explodeT > 0.25) continue; const fine = m.userData.fine; if (!fine) continue; return detail ? fine : (m.userData.coarse || fine); }
  return null;
}
function screenToDronePlane(x, y, out) { ptr.set((x / W) * 2 - 1, -(y / H) * 2 + 1); ray.setFromCamera(ptr, camera); plane.constant = -(body.py + 0.02); return ray.ray.intersectPlane(plane, out); }
let pend = null, hoverAt = null, push = null;
canvas.addEventListener('pointerdown', e => {
  S.lastInteract = performance.now(); $('#coach').hidden = true;
  if (S.scale && scaleTryDrag(e)) { e.stopImmediatePropagation(); return; }
  const hit = pickAt(e.clientX, e.clientY);
  if (hit && body.mode === 'free' && !theater.active) {
    e.stopImmediatePropagation(); controls.enabled = false; canvas.setPointerCapture(e.pointerId);
    const w = new THREE.Vector3(); screenToDronePlane(e.clientX, e.clientY, w);
    push = { id: e.pointerId, x0: e.clientX, y0: e.clientY, w0: w.clone(), hist: [[w.clone(), performance.now()]], t0: performance.now(), hit, moved: 0 };
    canvas.classList.add('push'); return;
  }
  pend = theater.active ? null : { x: e.clientX, y: e.clientY, t: performance.now(), hit };
}, { capture: true });
canvas.addEventListener('pointermove', e => {
  if (push && e.pointerId === push.id) {
    const w = new THREE.Vector3(); if (!screenToDronePlane(e.clientX, e.clientY, w)) return;
    push.hist.push([w.clone(), performance.now()]); while (push.hist.length > 2 && performance.now() - push.hist[0][1] > 80) push.hist.shift();
    const d = w.clone().sub(push.w0); d.y = 0; const px = Math.hypot(e.clientX - push.x0, e.clientY - push.y0); push.moved = Math.max(push.moved, px); if (d.length() > 1e-4) holdBody(d.normalize(), px); return;
  }
  if (e.pointerType === 'mouse') { hoverAt = { x: e.clientX, y: e.clientY }; updateLookYaw(e.clientX, e.clientY); }
});
canvas.addEventListener('pointerleave', () => { body.lookYaw = null; });
const endPush = e => {
  if (!push || e.pointerId !== push.id) return;
  const h0 = push.hist[0], h1 = push.hist[push.hist.length - 1]; const dt = Math.max(1, h1[1] - h0[1]) / 1000; const v = h1[0].clone().sub(h0[0]).divideScalar(dt); v.y = 0;
  const age = performance.now() - push.t0;
  const hold = body.hold; body.hold = null;
  if (alive.on && push.moved < 8 && age < 350 && push.hit) { const hit = push.hit; push = null; controls.enabled = true; canvas.classList.remove('push'); select(hit, true); return; }   // 生きている機体を軽くタップ = 選ぶ
  if (hold && hold.th > 1e-4) { const k = 9.81 * Math.tan(hold.th) * 0.12; body.vx += hold.x / hold.th * k; body.vz += hold.z / hold.th * k; }  // 溜めの解放
  if (age < 350 && v.length() > 0.25) flickBody(v); else if (v.length() > 0.6) flickBody(v.multiplyScalar(0.5));
  if (!store.get('flicked')) { store.set('flicked', '1'); showToast('押された側のモーターが速くなって、元の姿勢にもどりました。', 3200); }
  push = null; controls.enabled = true; canvas.classList.remove('push');
};
canvas.addEventListener('pointerup', e => { endPush(e); if (!pend) return; const moved = Math.hypot(e.clientX - pend.x, e.clientY - pend.y), dt = performance.now() - pend.t; const hit = pend.hit; pend = null; if (moved < 6 && dt < 700) { if (hit) select(hit, false); else if (S.selected) select(null); } });
canvas.addEventListener('pointercancel', endPush);
canvas.addEventListener('dblclick', e => { if (body.mode === 'free' || theater.active) return; const p = pickAt(e.clientX, e.clientY); if (p) focusOn([p.obj]); });
canvas.addEventListener('pointerleave', () => { hoverAt = null; if (S.hovered) { setTint(S.hovered, HOVER_L, 0); S.hovered = null; } canvas.classList.remove('pick'); });
function updateHover() {
  if (!hoverAt) return; const p = pickAt(hoverAt.x, hoverAt.y); hoverAt = null;
  if (p === S.hovered) return;
  if (S.hovered && !S.use && !theater.active) setTint(S.hovered, HOVER_L, 0);
  S.hovered = p;
  if (p && p !== S.selected && !S.use && !theater.active && !S.question) setTint(p, themeDark ? HOVER_D : HOVER_L, 0.25);
  if (alive.big) updateBigBand();
  canvas.classList.toggle('pick', !!p);
}
// キーボード
document.addEventListener('keydown', e => {
  if (e.target.matches && e.target.matches('input, textarea, select')) return; const k = e.key.toLowerCase();
  if (S.lesson && lessonKey(e)) return;
  if (quiz.active && e.key === 'Escape') { quizStop(); return; }
  if ((theater.active || whatif.active) && k !== 'escape') return;   // 再生中は表示モード等のキーを受けない
  if ((S.scale || S.expert) && (k === 'e' || /^[1-4]$/.test(k))) return;
  if (k === 'escape' && (!$('#askPop').hidden || !$('#settings').hidden)) { $('#askPop').hidden = true; $('#settings').hidden = true; return; }
  if (e.key === '?') { const st = $('#settings'); st.hidden = false; $('#askPop').hidden = true; const dt = st.querySelector('details'); if (dt) dt.open = true; return; }
  if (k === '1') setMode('normal'); else if (k === '2') setMode('xray'); else if (k === '3') setMode('wire'); else if (k === '4') setMode('cut');
  else if (k === 'e') setExplode(S.explode > 0.5 ? 0 : 1);
  else if (k === 'l') $('#viewCol .tgl[data-t=labels]').click();
  else if (k === 'a') $('.ctx-row .tgl[data-t=air]').click();
  else if (k === 's') $('.ctx-row .tgl[data-t=slow]').click();
  else if (k === ' ') { e.preventDefault(); if (S.tab !== 'fly') setTab('fly'); setPower(S.power === 0 ? 0.5 : 0); }
  else if (k === 'r') { segSet($('#viewCol'), 'v', 'iso'); setView('iso'); }
  else if (k === 'f' && S.selected) focusOn(S.selAll ? partsOf(S.selected.key).map(x => x.obj) : [S.selected.obj]);
  else if (k === 'escape') { if (theater.active) stopTheaterUI(); else if (S.question) { clearQuestion(); renderNote(null); } else if (S.flight) setFlight(null); else if (S.selected) select(null); else $('#inspector').classList.remove('open'); }
});

// ---------- 設定 ----------
$('#settingsBtn').addEventListener('click', e => { e.stopPropagation(); const st = $('#settings'); st.hidden = !st.hidden; $('#settingsBtn').setAttribute('aria-expanded', String(!st.hidden)); $('#askPop').hidden = true; });
$('#themeSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; segSet($('#themeSeg'), 'th', b.dataset.th); if (b.dataset.th === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = b.dataset.th; applyTheme(); });
$('#fontSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; segSet($('#fontSeg'), 'f', b.dataset.f); document.documentElement.style.setProperty('--fs', b.dataset.f); });
$('#qualitySeg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; segSet($('#qualitySeg'), 'q', b.dataset.q); S.quality = b.dataset.q; if (b.dataset.q !== 'auto') applyQuality(parseInt(b.dataset.q, 10)); });
$('#envSlider').addEventListener('input', e => { S.envMul = e.target.value / 100; applyTheme(); });
$('#expSlider').addEventListener('input', e => { S.exposureMul = e.target.value / 100; applyTheme(); });
// モバイルシート
$('#inspToggle').addEventListener('click', () => (S.lesson ? $('#lesson') : S.expert ? $('#expert') : $('#inspector')).classList.add('open'));
$('#inspClose').addEventListener('click', () => $('#inspector').classList.remove('open'));
{ const insp = $('#inspector'), grab = insp.querySelector('.grabber'); let drag = null;   /* $('.grabber') だと DOM 先頭の専門シートのつまみを掴んでしまう */
  grab.addEventListener('pointerdown', e => { drag = { y0: e.clientY, hist: [[e.clientY, performance.now()]] }; grab.setPointerCapture(e.pointerId); insp.classList.add('dragging'); });
  grab.addEventListener('pointermove', e => { if (!drag) return; const dy = Math.max(0, e.clientY - drag.y0); insp.style.transform = `translateY(${dy}px)`; drag.hist.push([e.clientY, performance.now()]); if (drag.hist.length > 6) drag.hist.shift(); });
  const end = e => { if (!drag) return; const dy = Math.max(0, e.clientY - drag.y0); const h0 = drag.hist[0], h1 = drag.hist[drag.hist.length - 1]; const v = (h1[0] - h0[0]) / Math.max(1, h1[1] - h0[1]); insp.classList.remove('dragging'); insp.style.transform = ''; if (v > 0.5 || dy > insp.offsetHeight * 0.4) insp.classList.remove('open'); drag = null; };
  grab.addEventListener('pointerup', end); grab.addEventListener('pointercancel', end); }
new ResizeObserver(() => document.documentElement.style.setProperty('--dock-h', $('#dock').offsetHeight + 'px')).observe($('#dock'));

function onThemeChanged(dark) { airflowTheme(dark); }
function onQualityChanged(level) { if (air.mesh && air.N !== Q.particles) rebuildAirflow(); $('#perfInfo').textContent = `品質 ${level}`; }
function onResized() {
  if (S.scale) { if (D.personGroup) D.personGroup.visible = !compact(); renderMassBar(S.selected && S.selected.key); } for (const L of labelEls) L.w = 0; if (!S.labelsTouched) { S.labels = !narrow(); for (const x of $$('.tgl[data-t=labels]')) x.classList.toggle('on', S.labels); } }
function initUI() {
  buildUseChips(); buildAsk(); buildMishapCards(); buildWhatifCards(); labelSticks(); segSet($('#modeSeg2'), 'm', stickMode);
  const d = store.get('depth') === 'full' ? 'full' : 'simple'; setDepth(d);
  if (d === 'simple' && !store.get('coach')) setTimeout(() => showCoach(FIRST_QUESTION.q, FIRST_QUESTION.hint, () => { store.set('coach', '1'); askQuestion(FIRST_QUESTION.qid); }, () => store.set('coach', '1')), 1200);
}
