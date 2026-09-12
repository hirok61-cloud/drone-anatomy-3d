// ===== 図鑑とカード (パッケージ⑦) =====
// 見た部品を静かに数え、今日の一部品をうっすら光らせ、記念写真を持ち帰れるようにする。
// バッジ・称号・ランキング・音は作らない（数字ひとつと控えめな光だけ）。
const codex = { seen: new Set(), today: null, pending: null, done: false, t: 0, litKey: null, total: 40 };

function codexLoad() {
  try { const a = JSON.parse(store.get('codex') || '[]'); if (Array.isArray(a)) codex.seen = new Set(a.filter(k => PARTS[k])); } catch (e) { codex.seen = new Set(); }
  codex.done = store.get('codexDone') === '1';
}
function codexSave() { try { store.set('codex', JSON.stringify([...codex.seen])); } catch (e) {} }

// 日付から今日の一部品を決める（端末内で完結。通信も乱数も使わない）
function codexToday() {
  const now = new Date();
  const s = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  let h = 0; for (let i = 0; i < s.length; i++) h += s.charCodeAt(i);
  return LIST_ORDER[h % LIST_ORDER.length];
}

function codexMark(key) {
  if (!key || !PARTS[key] || codex.seen.has(key)) return;
  codex.seen.add(key); codexSave(); renderCodexCount(true);
  if (codex.seen.size >= codex.total && !codex.done) codexUnlock();
}
function codexOnSelect(p) { codex.pending = p && PARTS[p.key] && !codex.seen.has(p.key) ? { key: p.key, at: performance.now() } : null; }

function renderCodexCount(pulse) {
  const el = $('#codexCount'); if (!el) return;
  el.textContent = `${codex.seen.size}/${codex.total}`;
  el.title = `見た部品 ${codex.seen.size} / ${codex.total}`; el.setAttribute('aria-label', `見た部品 ${codex.seen.size} / ${codex.total}`);
  if (pulse && !reduceMotion) { el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse'); }
}

function codexUnlock() {
  codex.done = true; store.set('codexDone', '1');
  const b = $('#modeSeg [data-mode=blueprint]'); if (b) b.hidden = false;
  showCoach('全部の部品を見ました', '設計図モードが使えるようになりました。見え方の「設計図」で開けます', () => setMode('blueprint'));
}

// 今日の一部品を光らせてよい状況か
function codexGlowKey() {
  const k = codex.today;
  if (!k || codex.seen.has(k)) return null;
  if (S.mode !== 'normal' || S.use || S.scale || S.question || theater.active || whatif.active || S.lesson || S.expert || (typeof quiz !== 'undefined' && quiz.active) || S.explodeT > 0.05) return null;
  if (S.selected && S.selected.key === k) return null;
  const ps = partsOf(k);
  if (!ps.length || !ps.some(p => partVisible(p) && effVisible(p.obj))) return null;
  return k;
}
function stepCodex(dtReal) {
  if (codex.pending && performance.now() - codex.pending.at > 1500) { codexMark(codex.pending.key); codex.pending = null; }
  codex.t += dtReal;
  const k = codexGlowKey();
  if (k !== codex.litKey) { if (codex.litKey) for (const p of partsOf(codex.litKey)) setTint(p, ACCENT, 0); codex.litKey = k; }
  if (!k) return;
  const amp = reduceMotion ? 0.2 : 0.225 + 0.075 * Math.sin(codex.t * 2 * Math.PI / 2.4);   // 0.15〜0.30 の呼吸
  for (const p of partsOf(k)) setTint(p, ACCENT, amp);
}

// 解説カードに差し込む断片
function codexHead(key) { return codex.today === key ? '<div class="today-badge">今日の一部品</div>' : ''; }
function codexTriviaRow(key) { if (!TRIVIA[key]) return ''; const act = typeof TRIVIA_ACT !== 'undefined' && TRIVIA_ACT[key]; return `<div class="trivia"><b>${t('sec.trivia')}</b>${TRIVIA[key]}${act ? '<button id="triviaGo" class="trivia-go">確かめる ›</button>' : ''}</div>`; }
// 豆知識の内容を機体に演じさせる
function triviaAct(key) {
  const a = TRIVIA_ACT && TRIVIA_ACT[key]; if (!a) return;
  if (a.explode != null) { setTab('see'); setExplode(a.explode); }
  else if (a.mode) { setTab('see'); setMode(a.mode); if (a.mode === 'cut' && key !== 'motor') select(partsOf(key)[0], true, { quiet: true }); }
  else if (a.question) askQuestion(a.question);
  else if (a.theater) { setTab('mishap'); startTheaterUI(a.theater); }
  else if (a.whatif) { setTab('mishap'); startWhatifUI(a.whatif); }
  else if (a.scale) { setTab('use'); setScale(true); }
  else if (a.fly) { setTab('fly'); setPower(0.5, true); if (a.coach) showCoach(a.coach, '', null, null); }
}

// ---------- 記念写真 ----------
async function codexPoster() {
  const cv = document.createElement('canvas'); cv.width = 1600; cv.height = 1200;
  const g = cv.getContext('2d');
  const dark = document.documentElement.getAttribute('data-theme') === 'dark' || (!document.documentElement.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches);
  g.fillStyle = dark ? '#12151b' : '#eef0f4'; g.fillRect(0, 0, 1600, 1200);
  const src = renderer.domElement;
  if (typeof renderOnce === 'function') renderOnce();
  const url = src.toDataURL('image/jpeg', 0.92);
  await new Promise(res => { const im = new Image(); im.onload = () => {
      const vw = narrow() ? im.width : Math.round(im.width * Math.max(0.5, (W - 384) / W));   // 右パネルの下は撮らない(見えている構図をそのまま)
      const H = 1100, sr = vw / im.height, dr = 1600 / H;   // cover
      let sw = vw, sh = im.height, sx = 0, sy = 0;
      if (sr > dr) { sw = im.height * dr; sx = (vw - sw) / 2; } else { sh = vw / dr; sy = (im.height - sh) / 2; }
      g.drawImage(im, sx, sy, sw, sh, 0, 0, 1600, H); res();
    }; im.onerror = () => res(); im.src = url; });
  // 下の帯（豆知識があれば2段）
  const p0 = S.selected, triv = p0 && TRIVIA[p0.key] ? TRIVIA[p0.key] : null; const bandY = triv ? 1060 : 1100;
  const bp = S.mode === 'blueprint';
  g.fillStyle = bp ? '#12284a' : (dark ? '#171b22' : '#ffffff'); g.fillRect(0, bandY, 1600, 1200 - bandY);
  g.fillStyle = bp ? '#dfe9ff' : '#ef6a2d'; g.fillRect(0, bandY, 1600, 3);   // 上端のアクセント線
  const F = '-apple-system, "Hiragino Sans", "Noto Sans JP", sans-serif';
  g.textBaseline = 'middle';
  g.fillStyle = bp ? '#dfe9ff' : (dark ? '#e8ebf0' : '#1b1f27'); g.font = `700 36px ${F}`; g.textAlign = 'left';
  const rowY = triv ? 1104 : 1152;
  g.fillText('ドローンの構造', 44, rowY);
  const p = S.selected;
  const name = p ? ((S.depth === 'simple' && SIMPLE_NAME[p.key]) || PARTS[p.key].name) : '550クラス クアッドコプター';
  g.fillStyle = bp ? '#ffffff' : '#ef6a2d'; g.font = `700 34px ${F}`; g.textAlign = 'center'; g.fillText(name, 800, rowY);
  const n = new Date(), ds = `${n.getFullYear()}.${String(n.getMonth() + 1).padStart(2, '0')}.${String(n.getDate()).padStart(2, '0')}`;
  g.fillStyle = bp ? '#9db3d8' : (dark ? '#8791a3' : '#7b8290'); g.font = `500 26px ${F}`; g.textAlign = 'right';
  g.fillText(`${ds}　見た部品 ${codex.seen.size}/${codex.total}`, 1556, rowY);
  if (triv) { g.fillStyle = bp ? '#b9c8e6' : (dark ? '#b3bccb' : '#4b5260'); g.font = `500 24px ${F}`; g.textAlign = 'center'; g.fillText(triv, 800, 1162, 1500); }
  return cv;
}

async function photoShare() {
  let cv; try { cv = await codexPoster(); } catch (e) { showToast('写真を作れませんでした'); return; }
  const blob = await new Promise(r => cv.toBlob(r, 'image/jpeg', 0.92));
  if (blob && navigator.canShare) {
    const file = new File([blob], 'drone-anatomy.jpg', { type: 'image/jpeg' });
    if (navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'ドローンの構造' }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
    }
  }
  $('#photoImg').src = cv.toDataURL('image/jpeg', 0.92);
  $('#photoPop').hidden = false; $('#askPop').hidden = true; $('#settings').hidden = true;
}

function initCodex() {
  codexLoad(); codex.today = codexToday(); renderCodexCount(false);
  if (codex.seen.size >= codex.total && !codex.done) { codex.done = true; store.set('codexDone', '1'); }   // 既に全部見ている状態で開いた場合は静かに解放
  const b = $('#modeSeg [data-mode=blueprint]'); if (b) b.hidden = !codex.done;
  window.codexPoster = codexPoster;   // 検証用
  $('#photoBtn').addEventListener('click', photoShare);
  $('#photoClose').addEventListener('click', () => { $('#photoPop').hidden = true; });
}

function codexClearGlow() { if (codex.litKey) { for (const p of partsOf(codex.litKey)) setTint(p, ACCENT, 0); codex.litKey = null; } }
