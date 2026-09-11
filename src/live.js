// ===== 生きている機体と、みんなの土台 (パッケージ⑧) =====
// A: 開いた瞬間からホバーし、ポインタの方へ数度だけ向く  B: 大きく読む  C: 日本語／やさしい日本語／English  D: 読み上げ
const alive = { want: false, since: 0, on: false, forcedOff: false, big: false, speakAuto: false, prevLabels: null, prevFs: null };
const hasSpeech = 'speechSynthesis' in window && typeof SpeechSynthesisUtterance === 'function';

// ---------- A. 生きている機体 ----------
function aliveWanted() {
  if (!S.alive || alive.forcedOff) return false;
  return S.tab === 'see' && !S.selected && S.explode < 0.02 && S.mode === 'normal' && !S.question && !theater.active && !whatif.active && !S.lesson && !S.scale && !S.use && !(typeof quiz !== 'undefined' && quiz.active);
}
function stepAlive(dtReal) {
  const w = aliveWanted();
  if (w !== alive.want) {
    alive.want = w; alive.since = 0;
    // 他の機能（重さ・シアター・もしも・授業・とばす）が電源を持っているときは切らない。みるタブ内で条件が外れたときだけ着陸させる
    if (!w && alive.on) { alive.on = false; body.lookYaw = null; if (S.power > 0 && S.tab === 'see' && !S.scale && !theater.active && !whatif.active && !S.lesson) setPower(0, true); else syncBodyMode(); }
  }
  alive.since += dtReal;
  if (w && !alive.on && alive.since >= 0.8) { alive.on = true; setPower(0.5, true); syncBodyMode(); }
}
function setAlive(on) {
  S.alive = !!on; store.set('alive', on ? '1' : '0');
  for (const x of $$('.tgl[data-t=alive]')) { x.classList.toggle('on', S.alive); x.setAttribute('aria-pressed', String(S.alive)); }
}
function updateLookYaw(clientX, clientY) {
  if (!alive.on || reduceMotion) { body.lookYaw = null; return; }
  const w = new THREE.Vector3(); if (!screenToDronePlane(clientX, clientY, w)) { body.lookYaw = null; return; }
  const dx = w.x - body.px, dz = w.z - body.pz, dist = Math.hypot(dx, dz);
  if (dist > 0.6 || dist < 0.02) { body.lookYaw = 0; return; }
  body.lookYaw = -clamp(Math.atan2(dx, -dz), -0.07, 0.07);   // 機首は −z。+yaw は機首を −x へ振るので符号を反転
}
function aliveQuality(level) {
  alive.forcedOff = level <= 1;
  const n = $('#aliveNote'); if (n) n.hidden = !alive.forcedOff;
  for (const x of $$('.tgl[data-t=alive]')) x.disabled = alive.forcedOff;
}

// ---------- C. 言語 ----------
function t(path) {
  const walk = (o) => path.split('.').reduce((a, k) => (a && a[k] != null ? a[k] : undefined), o);
  const v = walk(I18N[S.lang] || I18N.ja); if (v != null && typeof v !== 'object') return v;
  const j = walk(I18N.ja); return j != null && typeof j !== 'object' ? j : path;
}
function langEntry(key) { const L = I18N[S.lang]; return L && L.parts ? L.parts[key] : null; }
function partName(pk) {
  const key = pk && pk.key ? pk.key : pk; const d = PARTS[key]; if (!d) return '';
  const e = langEntry(key);
  if (S.depth === 'simple') return (e && e.name) || SIMPLE_NAME[key] || d.name;
  return S.lang === 'en' ? (d.en || d.name) : d.name;
}
function firstSentence(s) { const i = s.indexOf('。'); return i > 0 ? s.slice(0, i + 1) : s; }
function partRole(key) {
  const e = langEntry(key), sd = SIMPLE[key];
  if (S.depth === 'simple' && (e || sd)) return (e && e.role) || (sd && sd.role) || '';
  return firstSentence(PARTS[key].role || '');
}
function partAnalogy(key) { const e = langEntry(key), sd = SIMPLE[key]; return (e && e.analogy) || (sd && sd.analogy) || ''; }
function qText(q) { const L = I18N[S.lang]; return (L && L.questions && L.questions[q.id]) || q.q; }
function langNote() { return S.lang === 'en' ? '<p class="lang-note">— Japanese only —</p>' : ''; }
function setLastText(el, text) {
  // <i></i>名 のように装飾子を持つボタンは最後のテキストノードだけ差し替える
  let node = null; for (const c of el.childNodes) if (c.nodeType === 3 && c.textContent.trim()) node = c;
  if (node) node.textContent = text; else el.textContent = text;
}
function applyLang() {
  document.documentElement.lang = S.lang === 'en' ? 'en' : 'ja';
  for (const el of $$('[data-i18n]')) setLastText(el, t(el.dataset.i18n));
  segSet($('#langSeg'), 'lang', S.lang);
  const pb = $('#powerBtn'); if (pb) pb.textContent = S.power > 0 ? t('stop') : t('power');
  buildList(); buildLabels(); buildAsk(); renderDetail(); updateBigBand();
  if (S.question && $('#noteCard').dataset.kind === 'question') $('#noteTitle').textContent = qText(S.question);
}
function setLang(l) { if (!I18N[l]) l = 'ja'; S.lang = l; store.set('lang', l); if (hasSpeech) speechSynthesis.cancel(); applyLang(); }

// ---------- B. 大きく読む ----------
function setBig(on) {
  on = !!on; alive.big = on; S.big = on; store.set('big', on ? '1' : '0');
  for (const x of $$('.tgl[data-t=big]')) { x.classList.toggle('on', on); x.setAttribute('aria-pressed', String(on)); }
  const bb = $('#bigBtn'); if (bb) { bb.classList.toggle('on', on); bb.setAttribute('aria-pressed', String(on)); }
  if (on) {
    alive.prevLabels = S.labels; alive.prevFs = document.documentElement.style.getPropertyValue('--fs') || '';
    document.documentElement.style.setProperty('--fs', '1.18'); S.labels = false;
    for (const x of $$('.tgl[data-t=labels]')) { x.classList.remove('on'); x.setAttribute('aria-pressed', 'false'); }
  } else {
    document.documentElement.style.setProperty('--fs', alive.prevFs || (($('#fontSeg .on') || {}).dataset || {}).f || '1');
    if (alive.prevLabels != null) { S.labels = alive.prevLabels; for (const x of $$('.tgl[data-t=labels]')) { x.classList.toggle('on', S.labels); x.setAttribute('aria-pressed', String(S.labels)); } }
  }
  document.body.classList.toggle('big', on);
  updateBigBand();
}
function updateBigBand() {
  const band = $('#bigBand'); if (!band) return;
  const p = S.selected || S.hovered;
  if (!alive.big || !p) { band.hidden = true; return; }
  $('#bigText').textContent = partName(p); band.hidden = false;
  $('#bigSpeak').hidden = !hasSpeech;
}

// ---------- D. 読み上げ ----------
function speak(text) {
  if (!hasSpeech || !text) return false;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = { ja: 'ja-JP', easy: 'ja-JP', en: 'en-US' }[S.lang] || 'ja-JP';
    u.rate = S.lang === 'easy' ? 0.85 : 1.0;
    speechSynthesis.speak(u); return true;
  } catch (e) { return false; }
}
function speakPart(p) { if (!p) return; const key = p.key || p; speak(`${partName(key)}。${partRole(key)}`); }
function setSpeakAuto(on) {
  alive.speakAuto = !!on; store.set('speakAuto', on ? '1' : '0');
  for (const x of $$('.tgl[data-t=speakAuto]')) { x.classList.toggle('on', alive.speakAuto); x.setAttribute('aria-pressed', String(alive.speakAuto)); }
}

function initLive() {
  S.alive = store.get('alive') !== '0';
  for (const x of $$('.tgl[data-t=alive]')) { x.classList.toggle('on', S.alive); x.setAttribute('aria-pressed', String(S.alive)); }
  alive.speakAuto = store.get('speakAuto') === '1';
  for (const x of $$('.tgl[data-t=speakAuto]')) { x.classList.toggle('on', alive.speakAuto); x.setAttribute('aria-pressed', String(alive.speakAuto)); }
  if (!hasSpeech) for (const el of $$('.speak, .pop-row.speakrow')) el.hidden = true;
  S.lang = I18N[store.get('lang')] ? store.get('lang') : 'ja';
  $('#langSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setLang(b.dataset.lang); });
  $('#bigBtn').addEventListener('click', () => setBig(!alive.big));
  $('#bigSpeak').addEventListener('click', () => speakPart(S.selected || S.hovered));
  aliveQuality(S.qLevel);
  applyLang();
  if (store.get('big') === '1') setBig(true);
  window.updateBigBand = updateBigBand; window.speak = speak;   // 検証用
}
