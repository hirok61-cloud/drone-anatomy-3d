// ===== 授業・説明会モード (パッケージ⑨) =====
// 台本を右に固定し、段落ごとに視点と表示を切り替える。答えは画面が出さず、隣の人との会話に残す。
const lesson = { def: null, hover: false, saved: null, clockAcc: 0, swipe: null };
const quiz = { active: false, key: null, recent: [], t: 0, revealed: false, saved: null };

function lessonStep() { return lesson.def && S.lesson ? lesson.def.steps[S.lesson.step] : null; }
function fmtClock(sec) { sec = Math.max(0, Math.floor(sec)); return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`; }

// ---------- 開始 / 終了 ----------
function startLesson(id, step = 0) {
  const def = LESSONS.find(l => l.id === id); if (!def) return;
  if (S.lesson) stopLesson(true);
  lesson.def = def; lesson.saved = { depth: S.depth, tab: S.tab };
  S.lesson = { id, step: -1, startedAt: performance.now() };
  if (def.depth && S.depth !== def.depth) setDepth(def.depth);
  document.body.classList.add('lesson');
  $('#inspector').hidden = true; $('#inspector').classList.remove('open');
  const panel = $('#lesson'); panel.hidden = false; if (narrow()) panel.classList.add('open');
  $('#lessonName').textContent = def.name; $('#lessonAud').textContent = def.audience || '';
  $('#inspToggle').textContent = t('ui.script');
  $('#lessonSteps').innerHTML = def.steps.map((st, i) => `<div class="step" role="button" tabindex="0" data-i="${i}"><div class="st-head"><span class="st-t">${fmtClock(st.t * 60)}</span><b>${st.title}</b><span class="st-min">${st.min}分</span></div><p class="say">${st.say}</p>${st.ask ? `<p class="ask">${st.ask}</p>` : ''}${st.expect ? `<details><summary>想定回答</summary><p>${st.expect}</p></details>` : ''}</div>`).join('');
  gotoStep(clamp(step | 0, 0, def.steps.length - 1));
}
function stopLesson(silent) {
  if (!S.lesson) return;
  resetStage(); S.labelOnly = null; buildLabels();
  const saved = lesson.saved; S.lesson = null; lesson.def = null; lesson.hover = false;
  document.body.classList.remove('lesson');
  $('#lesson').hidden = true; $('#lesson').classList.remove('open'); $('#inspector').hidden = false; $('#inspToggle').textContent = t('ui.parts');
  $('#lessonSel').hidden = true;
  if (saved && saved.depth !== S.depth) setDepth(saved.depth);
  setTab('see');
  const u = new URL(location.href); u.searchParams.delete('lesson'); u.searchParams.delete('step'); history.replaceState(null, '', u);
  syncBodyMode();
}

// 段落の前に舞台をまっさらに戻す（前の段落の気流・シアター・質問が残らないように）
function resetStage() {
  if (quiz.active) quizStop();
  if (theater.active) stopTheaterUI();
  if (S.expert && typeof expertStop === 'function') expertStop(true);
  if (whatif.active) stopWhatifUI();
  if (S.question) { clearQuestion(); renderNote(null); }
  if (S.flight) setFlight(null);
  if (S.use) setUse(null);
  if (S.scale) setScale(false);
  if (S.explode > 0) setExplode(0);
  if (S.mode !== 'normal') setMode('normal');
  if (S.selected) select(null);
  setSticks(false);
  if (S.air) { S.air = false; for (const x of $$('.tgl[data-t=air]')) { x.classList.remove('on'); x.setAttribute('aria-pressed', 'false'); } }
  if (S.slow) { setTimeScale(1); for (const x of $$('.tgl[data-t=slow]')) { x.classList.remove('on'); x.setAttribute('aria-pressed', 'false'); } }
  lesson.hover = false; setPower(0, true);
  $('#coach').hidden = true; S.labelOnly = null; buildLabels();
}

function gotoStep(n) {
  if (!S.lesson || !lesson.def) return;
  const steps = lesson.def.steps; n = clamp(n, 0, steps.length - 1);
  S.lesson.step = n; S.lesson.stepAt = performance.now(); const st = steps[n];
  resetStage();
  if (st.view) { segSet($('#viewCol'), 'v', st.view); setView(st.view); }
  runAct(st.act || {});
  renderLessonPanel();
  const u = new URL(location.href); u.searchParams.set('lesson', lesson.def.id); u.searchParams.set('step', String(n)); history.replaceState(null, '', u);
}
function runAct(a) {
  // 未実装の機能を指すキーは黙って飛ばす
  if (a.alive) { setTab('see'); lesson.hover = true; setPower(0.5, true); syncBodyMode(); }
  if (a.question && typeof askQuestion === 'function') askQuestion(a.question);
  if (a.power != null && !a.alive) { setTab('fly'); setPower(a.power, true); }
  if (a.air) { S.air = true; for (const x of $$('.tgl[data-t=air]')) { x.classList.add('on'); x.setAttribute('aria-pressed', 'true'); } }
  if (a.flight && typeof setFlight === 'function') { setTab('fly'); setFlight(a.flight); }
  if (a.sticks != null && typeof setSticks === 'function') setSticks(!!a.sticks);
  if (a.explode != null) { setTab('see'); setExplode(a.explode); }
  if (a.theater && typeof startTheaterUI === 'function') { setTab('mishap'); startTheaterUI(a.theater); }
  if (a.whatif && typeof startWhatifUI === 'function') { setTab('mishap'); startWhatifUI(a.whatif); }
  if (a.use && typeof setUse === 'function') { setTab('use'); setUse(a.use); }
  if (a.scale && typeof setScale === 'function') { setTab('use'); setScale(true); }
  if (a.select) { const p = partsOf(a.select)[0]; if (p) { select(p, true, { quiet: true }); focusOn(partsOf(a.select).map(x => x.obj), { pull: true }); } }
  if (a.coach) showCoach(a.coach, '', null, null);
  if (a.quiz) quizStart();
}

function renderLessonPanel() {
  if (!S.lesson) return;
  const n = S.lesson.step, steps = lesson.def.steps;
  for (const el of $$('#lessonSteps .step')) { const on = +el.dataset.i === n; el.classList.toggle('on', on); if (on) el.setAttribute('aria-current', 'step'); else el.removeAttribute('aria-current'); }
  const cur = $(`#lessonSteps .step[data-i="${n}"]`); if (cur) cur.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
  $('#lessonPrev').disabled = n === 0; $('#lessonNext').disabled = n >= steps.length - 1;
  $('#lessonPos').textContent = `${n + 1} / ${steps.length}`;
  tickLessonClock(0, true);
}
function tickLessonClock(dt, force) {
  if (!S.lesson) return;
  lesson.clockAcc += dt; if (!force && lesson.clockAcc < 1) return; lesson.clockAcc = 0;
  const el = $('#lessonClock'); if (!el) return;
  const sec = (performance.now() - S.lesson.startedAt) / 1000, st = lessonStep();
  const remain = st ? st.min * 60 - (performance.now() - (S.lesson.stepAt || S.lesson.startedAt)) / 1000 : 0;
  el.innerHTML = `<b>${remain >= 0 ? '残り ' + fmtClock(remain) : '超過 ' + fmtClock(-remain)}</b><span>${fmtClock(sec)} / ${fmtClock(lesson.def.total * 60)}</span>`;   // 超過しても赤くしない（叱らない）
}
// 選んだ部品の名前を台本パネルの上に1行（右パネルが台本に差し替わっているため）
function renderLessonSel() {
  const box = $('#lessonSel'); if (!box) return;
  const p = S.selected; if (!S.lesson || !p) { box.hidden = true; return; }
  box.innerHTML = `<b>${partName(p)}</b><span>${partRole(p.key)}</span>${hasSpeech ? '<button class="icon-btn sm speak" id="lessonSpeak" aria-label="読み上げ">🔊</button>' : ''}`;
  box.hidden = false; const sp = $('#lessonSpeak'); if (sp) sp.onclick = () => speakPart(p);
}

// ---------- 部品めぐり（外→内） ----------
function tourNext(dir) {
  const cur = S.selected ? TOUR_ORDER.indexOf(S.selected.key) : -1;
  let i = cur < 0 ? (dir > 0 ? 0 : TOUR_ORDER.length - 1) : (cur + dir + TOUR_ORDER.length) % TOUR_ORDER.length;
  for (let n = 0; n < TOUR_ORDER.length; n++) { const k = TOUR_ORDER[i]; const ps = partsOf(k); if (ps.length && ps.some(p => partVisible(p))) break; i = (i + dir + TOUR_ORDER.length) % TOUR_ORDER.length; }
  const k = TOUR_ORDER[i], ps = partsOf(k); if (!ps.length) return;
  if (S.mode !== 'normal') setMode('normal');
  select(ps[0], true, { quiet: true });
  S.labelOnly = new Set([k]); buildLabels();
  focusOn(ps.map(p => p.obj), { pull: true });
}

// ---------- ふたりクイズ（答えは画面が出さない） ----------
function quizStart() {
  if (quiz.active) return;
  if (typeof stopOthers === 'function') stopOthers('quiz');
  quiz.active = true; quiz.recent = []; quiz.t = 0; S.labelsSuppressed = true; S.labelOnly = null; buildLabels();
  if (S.selected) select(null);
  quizNext();
}
function quizPool() { const pool = S.depth === 'simple' ? SIMPLE_KEYS : TOUR_ORDER; return pool.filter(k => PARTS[k] && partsOf(k).some(p => partVisible(p) && effVisible(p.obj))); }
function quizNext() {
  if (!quiz.active) return;
  if (quiz.key) for (const p of partsOf(quiz.key)) setTint(p, ACCENT, 0);
  const pool = quizPool(); let cands = pool.filter(k => !quiz.recent.includes(k)); if (!cands.length) cands = pool;
  const k = cands[Math.floor(Math.random() * cands.length)]; if (!k) return;
  quiz.key = k; quiz.recent.push(k); if (quiz.recent.length > 5) quiz.recent.shift(); quiz.revealed = false; quiz.t = 0;
  focusOn(partsOf(k).map(p => p.obj), { pull: true });
  renderQuizNote();
}
function quizReveal() { if (!quiz.active) return; quiz.revealed = true; renderQuizNote(); }
function quizStop() {
  if (!quiz.active) return;
  if (quiz.key) for (const p of partsOf(quiz.key)) setTint(p, ACCENT, 0);
  quiz.active = false; quiz.key = null; S.labelsSuppressed = false; buildLabels();
  if ($('#noteCard').dataset.kind === 'quiz') renderNote(null);
}
function stepQuiz(dtReal) {
  if (!quiz.active || !quiz.key) return;
  quiz.t += dtReal; const k = reduceMotion ? 0.6 : 0.6 + 0.3 * Math.sin(quiz.t * 2 * Math.PI / 1.2);   // 0.3〜0.9
  for (const p of partsOf(quiz.key)) setTint(p, ACCENT, k);
}
function renderQuizNote() {
  const en = S.lang === 'en', k = quiz.key;
  const title = en ? 'What do you think this is?' : S.lang === 'easy' ? 'ここ、なんだと おもう？' : 'ここ、なんだと思う？';
  const html = quiz.revealed
    ? `<p class="quiz-ans"><b>${partName(k)}</b></p><p>${partRole(k)}</p>`
    : `<p>${en ? 'Tell the person next to you the name and the job of the glowing part. The screen will not say if you are right.' : S.lang === 'easy' ? 'ひかっている ぶひんの なまえと やくわりを、となりの 人に せつめいして みよう。' : '光っている部品の名前と役割を、隣の人に説明してみよう。画面は答え合わせをしません。'}</p>`;
  const actions = [];
  if (!quiz.revealed) actions.push({ label: en ? 'Show the name' : '答えを見る', primary: true, fn: quizReveal });
  actions.push({ label: en ? 'Next one ›' : 'つぎの問題 ›', fn: quizNext });
  actions.push({ label: en ? 'Finish' : 'おわる', fn: quizStop });
  renderNote({ kind: 'quiz', title, html, actions, onClose: quizStop });
}

// ---------- 印刷（線画の穴埋め図 + ふりかえりカード） ----------
async function buildPrintSheet() {
  const sheet = $('#printSheet'); const def = lesson.def || LESSONS[0];
  const wasMode = S.mode, wasLabels = S.labels;
  if (S.mode !== 'wire') { S.mode = 'wire'; applyMode(); applyBlueprint(); }
  if (typeof renderOnce === 'function') renderOnce();
  const url = renderer.domElement.toDataURL('image/jpeg', 0.92);
  // ラベル位置（updateLabels と同じ計算）
  const cw = renderer.domElement.width, ch = renderer.domElement.height, sc = cw / 1600;   // 撮った画像の実寸に合わせる
  const keys = (S.depth === 'simple' ? SIMPLE_KEYS : LIST_ORDER).filter(k => D.parts.some(p => p.key === k && (p.label || p.labelObj)));
  const pts = [];
  for (const k of keys) {
    const p = D.parts.find(x => x.key === k && (x.label || x.labelObj)); if (!p) continue;
    const a = p.labelObj ? p.labelObj.getWorldPosition(new THREE.Vector3()) : p.obj.localToWorld(new THREE.Vector3().copy(p.label));
    const pr = a.project(camera); if (pr.z > 1 || Math.abs(pr.x) > 0.95 || Math.abs(pr.y) > 0.95) continue;   // 画面外の部品には線を引かない
    pts.push({ key: k, x: (pr.x + 1) / 2 * cw, y: (1 - pr.y) / 2 * ch });
  }
  if (wasMode !== 'wire') { S.mode = wasMode; applyMode(); applyBlueprint(); }
  S.labels = wasLabels;
  // 番号バッジは左右の余白に縦に並べ、引き出し線でつなぐ
  const left = pts.filter(p => p.x < cw / 2).sort((a, b) => a.y - b.y), right = pts.filter(p => p.x >= cw / 2).sort((a, b) => a.y - b.y);
  const place = (arr, x) => { const n = arr.length, gap = Math.min(ch / 8, ch * 0.83 / Math.max(1, n)); const y0 = ch / 2 - gap * (n - 1) / 2; arr.forEach((p, i) => { p.bx = x; p.by = y0 + gap * i; }); };
  place(left, cw * 0.045); place(right, cw * 0.955);
  const ordered = [...left, ...right]; ordered.forEach((p, i) => { p.n = i + 1; });
  const f = (v) => (v * sc).toFixed(1);
  const svg = ordered.map(p => `<line x1="${p.bx.toFixed(0)}" y1="${p.by.toFixed(0)}" x2="${p.x.toFixed(0)}" y2="${p.y.toFixed(0)}" stroke="#000" stroke-width="${f(2.5)}"/><circle cx="${p.x.toFixed(0)}" cy="${p.y.toFixed(0)}" r="${f(6)}" fill="#000"/><circle cx="${p.bx.toFixed(0)}" cy="${p.by.toFixed(0)}" r="${f(28)}" fill="#fff" stroke="#000" stroke-width="${f(3)}"/><text x="${p.bx.toFixed(0)}" y="${(p.by + 12 * sc).toFixed(0)}" text-anchor="middle" font-size="${f(34)}" font-weight="700" fill="#000">${p.n}</text>`).join('');
  const blanks = ordered.map(p => `<li><span class="fill-num">${p.n}</span><span class="fill-line"></span></li>`).join('');
  const review = [...(def.review || []), '今日いちばん「おっ」と思ったこと'].map((q, i) => `<li><p>${q}</p><div class="rv-box"></div></li>`).join('');
  sheet.innerHTML = `
    <header class="ps-head"><h1>ドローンの構造 — ワークシート</h1><div class="ps-meta"><span>${def.name}</span><span>____年__月__日</span><span>名前 ______________</span></div></header>
    <section class="ps-fig"><div class="ps-figwrap"><img src="${url}" alt="機体の線画"><svg viewBox="0 0 ${cw} ${ch}" aria-hidden="true">${svg}</svg></div>
      <p class="ps-cap">番号の部品の名前を書こう。</p><ol class="ps-fill">${blanks}</ol></section>
    <section class="ps-review"><h2>ふりかえり</h2><ol>${review}</ol></section>
    ${regOn() ? kyosokuSheetHtml() + reportSheetHtml() : ''}
    <footer class="ps-foot">${location.origin + location.pathname}${def ? `?lesson=${def.id}` : ''}</footer>`;
  return sheet;
}
async function printSheet() { await buildPrintSheet(); window.print(); }

// ---------- 入力 ----------
function lessonKey(e) {
  if (!S.lesson) return false;
  const k = e.key;
  if (k === 'ArrowRight' || k === ' ' || k === 'PageDown') { e.preventDefault(); gotoStep(S.lesson.step + 1); return true; }
  if (k === 'ArrowLeft' || k === 'PageUp') { e.preventDefault(); gotoStep(S.lesson.step - 1); return true; }
  if (k === 'Tab') { e.preventDefault(); tourNext(e.shiftKey ? -1 : 1); return true; }
  if (k === 'q' || k === 'Q') { if (quiz.active) quizStop(); else quizStart(); return true; }
  if (k === 'Escape') {
    if (quiz.active) { quizStop(); return true; }
    if (theater.active || whatif.active || S.question || S.selected) return false;   // まずは中の物を閉じる
    lessonEndAsk(); return true;
  }
  return false;
}
function lessonEndAsk() { showCoach('授業モードを終了しますか', '台本を閉じて、ふつうの画面に戻ります', () => stopLesson(), null); $('#coachGo').textContent = '終了する'; }
function bindLessonSheet() {
  bindSheet($('#lesson'));   /* peek / open / tall の3段(ui.js) */
  // 段落リスト上の左右スワイプで前後
  const steps = $('#lessonSteps');
  steps.addEventListener('pointerdown', e => { if (e.pointerType !== 'touch') return; lesson.swipe = { x0: e.clientX, y0: e.clientY, t0: performance.now() }; });
  steps.addEventListener('pointerup', e => { const s = lesson.swipe; lesson.swipe = null; if (!s) return; const dx = e.clientX - s.x0, dy = e.clientY - s.y0, dt = performance.now() - s.t0; if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5 && dt < 600) gotoStep(S.lesson.step + (dx < 0 ? 1 : -1)); });
}

function initLesson() {
  $('#lessonPop').innerHTML = `<h3>授業・説明会</h3>${LESSONS.map(l => `<button class="course" data-l="${l.id}"><b>${l.name}</b><span>${l.audience} · 約${l.total}分 · ${l.steps.length}段落</span></button>`).join('')}<button class="course quiz" id="quizBtn"><b>ふたりクイズだけ</b><span>光った部品の名前を隣の人に説明する。答え合わせは画面がしない</span></button><p class="pop-foot">台本パネルが開き、段落ごとに視点と表示が切り替わります。URL を共有すると同じ段落から開きます。</p>`;
  const openPop = e => { e.stopPropagation(); $('#settings').hidden = true; $('#askPop').hidden = true; $('#lessonPop').hidden = !$('#lessonPop').hidden; };
  $('#lessonBtn').addEventListener('click', openPop); const lm = $('#lessonBtnM'); if (lm) lm.addEventListener('click', openPop);
  $('#lessonPop').addEventListener('click', e => { const b = e.target.closest('.course'); if (b) { $('#lessonPop').hidden = true; startLesson(b.dataset.l, 0); } });
  document.addEventListener('click', e => { if (!e.target.closest('#lessonPop') && !e.target.closest('#lessonBtn') && !e.target.closest('#lessonBtnM')) $('#lessonPop').hidden = true; });
  $('#quizBtn').addEventListener('click', e => { e.stopPropagation(); $('#lessonPop').hidden = true; if (S.lesson) { quizStart(); return; } setTab('see'); quizStart(); });
  $('#lessonPrev').addEventListener('click', () => gotoStep(S.lesson.step - 1));
  $('#lessonNext').addEventListener('click', () => gotoStep(S.lesson.step + 1));
  $('#lessonSteps').addEventListener('click', e => { const b = e.target.closest('.step'); if (!b || e.target.closest('details')) return; gotoStep(+b.dataset.i); });
  $('#lessonQuiz').addEventListener('click', () => (quiz.active ? quizStop() : quizStart()));
  $('#lessonPrint').addEventListener('click', printSheet);
  $('#lessonEnd').addEventListener('click', lessonEndAsk);
  $('#lessonClose').addEventListener('click', () => { if (narrow()) $('#lesson').classList.remove('open'); else lessonEndAsk(); });
  $('#lessonSteps').addEventListener('keydown', e => { const b = e.target.closest('.step'); if (!b || e.target.closest('details')) return; if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); gotoStep(+b.dataset.i); } });
  bindLessonSheet();
  window.__lesson = { startLesson, stopLesson, gotoStep, tourNext, quizStart, quizStop, quizReveal, buildPrintSheet, printSheet, lesson };
  window.__quiz = quiz;
  const q = new URLSearchParams(location.search); const id = q.get('lesson');
  if (id && LESSONS.some(l => l.id === id)) startLesson(id, parseInt(q.get('step') || '0', 10) || 0);
}
