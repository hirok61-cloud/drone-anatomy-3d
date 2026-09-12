// ===== 共有リンク（いま見えている画面をURLにする） =====
// 方針: 既定と違うものだけを短いキーで載せる。読み戻しの途中はトーストを出さず、最後に「どこを開いたか」を1回だけ伝える。
// 授業モードの lesson / step は lesson.js が自分で書くのでここでは触らない（消さない）。
const SHARE_KEYS = ['p', 'd', 't', 'm', 'e', 'v', 'c', 'u', 'f', 'x', 'w', 'mi', 'mass', 'price', 'iso', 'reg', 'lang'];
const share = { restoring: false };

// 注視点(3) + 向き(3) + 引き(1)。引きは viewScale()×bandK() で割った相対値なので、受け取った端末の画面に合わせて戻る
function camParam() {
  const t = controls.target, dir = camera.position.clone().sub(t); const r = dir.length() / Math.max(1e-3, viewScale() * bandK());
  dir.normalize(); const n = (x) => +x.toFixed(2);
  return [n(t.x), n(t.y), n(t.z), n(dir.x), n(dir.y), n(dir.z), n(r)].join(',');
}
function applyCam(str) {
  const a = String(str).split(',').map(Number);
  if (a.length !== 7 || a.some(x => !isFinite(x))) return false;
  const t = new THREE.Vector3(a[0], a[1], a[2]), dir = new THREE.Vector3(a[3], a[4], a[5]);
  if (dir.lengthSq() < 1e-6 || t.length() > 8) return false;
  const dist = clamp(a[6] * viewScale() * bandK(), 0.08, camMax() * 1.6);
  flyTo(t.clone().addScaledVector(dir.normalize(), dist), t, 700, false);
  return true;
}
function shareUrl() {
  const u = new URL(location.href); const q = u.searchParams;
  for (const k of SHARE_KEYS) q.delete(k);
  if (S.depth !== 'simple') q.set('d', S.depth);
  if (S.lang !== 'ja') q.set('lang', S.lang);
  if (regOn() !== (S.depth === 'full')) q.set('reg', regOn() ? '1' : '0');
  if (S.tab !== 'see' && S.tab !== 'theater') q.set('t', S.tab);
  if (S.mode !== 'normal') q.set('m', S.mode);
  if (S.explode > 0.005) q.set('e', String(Math.round(S.explode * 100)));
  if (S.view && S.view !== 'iso') q.set('v', S.view);
  if (!whatif.active && !theater.active) q.set('c', camParam());   /* 視点そのもの。画面の縦横比が違っても同じ画になるよう、引きは相対値で持つ */
  if (S.selected) q.set('p', S.selected.key);
  if (S.isolated) q.set('iso', S.isolated);
  if (S.use) q.set('u', S.use);
  if (S.flight) q.set('f', S.flight);
  if (S.expert) q.set('x', S.expert);
  if (S.scale) { q.set('mass', '1'); if (scale.price) q.set('price', '1'); }
  if (whatif.active && whatif.def) q.set('w', whatif.def.id);
  else if ((theater.active || theater.done) && theater.def) q.set('mi', theater.def.id);
  u.hash = '';
  return u.toString();
}
// トーストと共有シートに出す「この画面はどこか」の短い説明
function shareSummary() {
  const bits = [];
  if (S.selected) bits.push(partName(S.selected));
  if (whatif.active && whatif.def) bits.push('もしも: ' + whatif.def.short);
  else if ((theater.active || theater.done) && theater.def) bits.push('もしも: ' + theater.def.short);
  if (S.mode !== 'normal') bits.push({ xray: 'すけて見る', wire: '線だけ', cut: '切って見る', blueprint: '設計図' }[S.mode] || S.mode);
  if (S.explode > 0.005) bits.push(`分解 ${Math.round(S.explode * 100)}%`);
  if (S.use) { const u = USES.find(x => x.id === S.use); if (u) bits.push(u.name); }
  if (S.flight) bits.push(FLIGHT[S.flight].name);
  if (S.scale) bits.push('重さ・お金');
  if (S.expert) bits.push(EXPERT_TITLE[S.expert]);
  return bits.length ? bits.join('・') : '最初の画面';
}
function showShareNote(url) {   // クリップボードが使えないとき（古いSafari・http）は、選んでコピーできる欄を出す
  renderNote({
    kind: 'share', title: 'この画面のリンク',
    html: `<p>${shareSummary()}</p><input class="share-url" id="shareUrlBox" readonly value="${url.replace(/"/g, '&quot;')}"><p class="hint">長押し（PCでは右クリック）でコピーできます。開くと同じ画面が出ます。</p>`,
    actions: [{ label: '閉じる', fn: () => renderNote(null) }],
  });
  const box = $('#shareUrlBox'); if (box) { box.focus(); box.select(); }
}
async function shareNow() {
  const url = shareUrl(), sum = shareSummary();
  if (narrow() && navigator.share) {
    try { await navigator.share({ title: 'ドローンの構造', text: sum, url }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
  }
  try { await navigator.clipboard.writeText(url); showToast(`リンクをコピーしました（${sum}）`, 3200); return; } catch (e) { /* 権限なし・非対応 */ }
  showShareNote(url);
}

// ---------- 読み戻し ----------
function applyShare() {
  const q = new URLSearchParams(location.search);
  if (!SHARE_KEYS.some(k => q.has(k))) return false;
  const has = (k, ok) => { const v = q.get(k); return v != null && (!ok || ok.includes(v)) ? v : null; };
  share.restoring = true;
  try {
    const lang = has('lang', ['ja', 'easy', 'en']); if (lang) setLang(lang);
    const d = has('d', ['simple', 'full']); if (d) setDepth(d);
    const reg = has('reg', ['0', '1']); if (reg != null) setReg(reg === '1');
    const t = has('t', ['see', 'fly', 'use', 'mishap', 'expert']); if (t) setTab(t);
    const m = has('m', ['normal', 'xray', 'wire', 'cut', 'blueprint']); if (m && (m !== 'blueprint' || codex.done)) setMode(m);   /* 設計図は全部品を見た人だけ */
    const e = q.get('e'); if (e != null && isFinite(+e)) setExplode(clamp(+e / 100, 0, 1));
    const u = has('u', USES.map(x => x.id)); if (u) { setTab('use'); setUse(u); }
    if (q.get('mass') === '1') { setTab('use'); setScale(true); if (q.get('price') === '1') setPrice(true); }
    const f = has('f', Object.keys(FLIGHT)); if (f) { setTab('fly'); setFlight(f); }
    const x = has('x', EXPERT_MODES); if (x) { setTab('expert'); expertStart(x); }
    const iso = has('iso', LIST_ORDER); if (iso) { S.isolated = iso; applyVisibility(); }
    const p = has('p', Object.keys(PARTS)); if (p && partsOf(p).length) select(partsOf(p)[0], true);
    const v = has('v', ['iso', 'front', 'top', 'side', 'inside']), c = q.get('c');
    if (v) { S.view = v; segSet($('#viewCol'), 'v', v); if (!c) setView(v); }
    if (c) applyCam(c);   /* 視点は最後に。部品を選んでもカメラは動かないので、共有した人が見ていた画がそのまま出る */
    // 場面は絵が出てから始める（起動直後に走らせると最初の1コマを飛ばす）
    const w = has('w', WHATIF.map(x => x.id)), mi = has('mi', MISHAPS.map(x => x.id));
    if (w || mi) setTimeout(() => { if (w) startWhatifUI(w); else startTheaterUI(mi); }, 700);
  } catch (err) { console.warn('[share] 読み戻しに失敗', err); }
  share.restoring = false;
  setTimeout(() => showToast(`共有されたリンクで開きました（${shareSummary()}）`, 3600), 900);
  return true;
}

function initShare() {
  const btn = $('#shareBtn'); if (btn) btn.addEventListener('click', shareNow);
  window.__share = { shareUrl, shareSummary, shareNow, applyShare };
}
