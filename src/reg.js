// ===== 制度レイヤー（行政利用向け追加案 A） =====
// A1 部品の制度タグ / A2 重量区分 / A3 教則の章対応 / A4 場面と制度 / A5 立入管理措置（whatif.js の tachiiri） / A6 事故報告の記述例
// 方針: 判定はしない。「求められている」「確認する」で止め、根拠（教則の章）と確認先を必ず添える。文言は data.js の REG 系の表に1か所で持つ。
function regOn() { const v = store.get('reg'); return v == null ? S.depth === 'full' : v === '1'; }   // 既定: くわしくでオン、はじめてでオフ
function setReg(on) {
  store.set('reg', on ? '1' : '0'); syncRegToggle();
  renderDetail(); buildMishapCards(); buildWhatifCards();
  if (S.scale && typeof renderMassBar === 'function') { renderMassBar(S.selected && S.selected.key); regGhosts(true); }
  if (typeof whatif !== 'undefined' && whatif.active && typeof onWhatifChanged === 'function') onWhatifChanged();
  if (typeof theater !== 'undefined' && (theater.active || theater.done) && typeof onTheaterChanged === 'function') onTheaterChanged();
}
function syncRegToggle() { const on = regOn(); for (const x of $$('.tgl[data-t=reg]')) { x.classList.toggle('on', on); x.setAttribute('aria-pressed', String(on)); } }
const regSrc = (id) => { const s = REG_SOURCES[id] || REG_SOURCES.mlit; return `<a href="${s.url}" target="_blank" rel="noopener">${s.name}</a>`; };
function kyChip(ky) { if (!ky) return ''; const first = String(ky).split(' ')[0]; const title = KYOSOKU.chapters[first] ? `教則${KYOSOKU.ver} ${first} ${KYOSOKU.chapters[first]}` : `教則${KYOSOKU.ver}`; return `<i class="ky" title="${title}">教則 ${ky}</i>`; }
const regDate = () => `<p class="reg-date">${REG_DATE}の制度に基づく案文。最新は各確認先で。教則は${KYOSOKU.ver}（${KYOSOKU.note}）。</p>`;

// ---- A1 部品の解説に出す「制度では」 ----
function regSection(key) {
  const rows = REG[key]; if (!regOn() || !rows) return '';
  return `<section class="reg"><h4>⚖ 制度では</h4><ul>${rows.map(r => `<li>${r.text}<small>${kyChip(r.ky)} 確認先: ${regSrc(r.src)}</small></li>`).join('')}</ul>${regDate()}</section>`;
}
function partKyChip(key) { return regOn() && KY_PART[key] ? kyChip(KY_PART[key]) : ''; }

// ---- A4 もしもの最終カードに出す1行 ----
function regLine(id) {
  const r = WHATIF_REG[id]; if (!regOn() || !r) return '';
  return `<div class="reg-line"><b>⚖ 制度では</b><p>${r.text}</p><small>${kyChip(r.ky)} 確認先: ${regSrc(r.src)}</small></div>`;
}

// ---- A6 報告するなら（劇場の終わり・もしもの最終カード） ----
function reportFold(example) {
  if (!regOn()) return '';
  const R = REG_REPORT;
  return `<details class="rep"><summary>⚖ 報告するなら</summary>
    <p class="rep-h">報告の義務がある目安（航空法の事故等の報告）</p>
    <ul><li><b>事故:</b> ${R.accident.join('／')}</li><li><b>重大インシデント:</b> ${R.incident.join('／')}</li></ul>
    <p>${R.how}</p>
    ${example ? `<p class="rep-h">記述例（部品名は画面と同じ言葉で）</p><div class="rep-q">${example}</div>` : ''}
    <p class="rep-h">報告に書く項目</p><p>${R.items}</p>
    <p class="rep-h">罰則</p><p>${R.law}</p>
    <small>${kyChip('2.3 / 3.1')} 出典: 無人航空機の事故及び重大インシデントの報告要領（国土交通省航空局）／確認先: ${regSrc(R.src)}・${regSrc('dips')}・${regSrc('jtsb')}</small>${regDate()}</details>`;
}

// ---- A3 教則の対応表（授業・説明会のポップから） ----
// 2つの向きを持つ: 「画面から引く」= この画面は教則のどこか / 「章から引く」= この章を教えるならどの画面か。
// 講師はシラバス（章）から準備を始めるので、既定は章から引く向きにする。
const kyView = { mode: 'chapter', chap: '4' };
const kyChapNames = KYOSOKU.chapterNames;
function kySections(c) { return Object.entries(KYOSOKU.chapters).filter(([k]) => k.startsWith(c + '.')); }
function kyPartsOf(sec) { return Object.keys(KY_PART).filter(k => KY_PART[k] === sec && PARTS[k]); }

function kyosokuHtml() {
  const modeSeg = `<div class="seg small ky-seg" role="radiogroup" aria-label="引く向き"><button data-kv="chapter" class="${kyView.mode === 'chapter' ? 'on' : ''}">章から引く</button><button data-kv="screen" class="${kyView.mode === 'screen' ? 'on' : ''}">画面から引く</button></div>`;
  if (kyView.mode === 'screen') {
    const rows = KY_TAB.map(r => `<tr><td>${r.screen}</td><td>${r.ky.map(k => kyChip(k)).join(' ')}</td><td>${r.note}</td></tr>`).join('');
    return `${modeSeg}<p>この教材のどの画面が、教則${KYOSOKU.ver}のどの章にあたるかの一覧です。</p><div class="tbl"><table class="ky-tbl"><tr><th>画面</th><th>教則の章</th><th>備考</th></tr>${rows}</table></div>${kyFoot()}`;
  }
  const chapSeg = `<div class="seg small ky-chap" role="radiogroup" aria-label="章">${['2', '3', '4', '5', '6'].map(c => `<button data-kc="${c}" class="${kyView.chap === c ? 'on' : ''}">第${c}章</button>`).join('')}</div>`;
  const body = kySections(kyView.chap).map(([sec, title]) => {
    const js = KY_JUMP[sec] || [], ps = kyPartsOf(sec);
    return `<section class="ky-sec">
      <h4><i class="ky">教則 ${sec}</i><span>${title}</span></h4>
      ${js.length ? `<div class="ky-go">${js.map((j, i) => `<button data-kg="${sec}" data-ki="${i}" title="${j.note || ''}">${j.label}${j.note ? `<small>${j.note}</small>` : ''}</button>`).join('')}</div>` : '<p class="ky-none">この節にあたる画面はまだありません</p>'}
      ${ps.length ? `<p class="ky-parts">この節の部品: ${ps.map(k => `<button class="ky-part" data-kp="${k}">${PARTS[k].name}</button>`).join('')}</p>` : ''}
      ${js.length ? `<button class="ky-copy" data-kcp="${sec}">この節のリンクをコピー</button>` : ''}
    </section>`;
  }).join('');
  return `${modeSeg}<p class="ky-lead">第${kyView.chap}章 ${kyChapNames[kyView.chap]}。節を選ぶと、その話をするときに出せる画面が並びます。押すとその画面に切り替わります。</p>${chapSeg}${body}${kyFoot()}`;
}
const kyFoot = () => `<p class="ky-src"><a href="${KYOSOKU.url}" target="_blank" rel="noopener">教則${KYOSOKU.ver}（PDF・国土交通省）</a></p>${regDate()}`;

function showKyosokuTable(mode) {
  if (mode) kyView.mode = mode;
  renderNote({ kind: 'kyosoku', title: `教則${KYOSOKU.ver}との対応`, html: kyosokuHtml(), actions: [{ label: '閉じる', fn: () => renderNote(null) }] });
  bindKyosoku();
}
function bindKyosoku() {
  const box = $('#noteBody'); if (!box) return;
  box.onclick = (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.kv) { kyView.mode = b.dataset.kv; showKyosokuTable(); return; }
    if (b.dataset.kc) { kyView.chap = b.dataset.kc; showKyosokuTable(); return; }
    if (b.dataset.kp) { renderNote(null); gotoState({ tab: 'see', part: b.dataset.kp, focus: true }); return; }
    if (b.dataset.kcp) { kyCopyLinks(b.dataset.kcp, b); return; }
    if (b.dataset.kg) {
      const j = (KY_JUMP[b.dataset.kg] || [])[+b.dataset.ki]; if (!j) return;
      renderNote(null);
      if (j.act === 'preflight') { openPreflight(); return; }
      gotoState(j.go || {}, { sceneDelay: 260 });
      showToast(`教則 ${b.dataset.kg} → ${j.label}`, 2600);
    }
  };
}
async function kyCopyLinks(sec, btn) {
  const list = (KY_JUMP[sec] || []).filter(j => j.go);
  const title = KYOSOKU.chapters[sec] || '';
  const text = [`教則${KYOSOKU.ver} ${sec} ${title}`, ...list.map(j => `${j.label}\t${stateUrl(j.go)}`)].join('\n');
  try { await navigator.clipboard.writeText(text); btn.textContent = 'コピーしました'; setTimeout(() => { btn.textContent = 'この節のリンクをコピー'; }, 1800); }
  catch (e) { showToast('コピーできませんでした。共有ボタン（🔗）から1つずつどうぞ', 3200); }
}

function kyosokuSheetHtml() {   // 印刷シート用
  return `<section class="ps-ky"><h2>教則${KYOSOKU.ver}との対応</h2><ul>${KY_TAB.map(r => `<li><b>${r.screen}</b> — ${r.ky.join('、')}（${r.note}）</li>`).join('')}</ul><p class="ps-small">${KYOSOKU.note}。章番号は版で変わるため、最新版で照合すること。</p></section>`;
}
function reportSheetHtml() {   // 印刷シート用の報告書メモ
  const R = REG_REPORT;
  return `<section class="ps-rep"><h2>報告書メモ（事故等の報告に書く項目）</h2>
    <p class="ps-small">報告の義務がある目安 — 事故: ${R.accident.join('／')}。重大インシデント: ${R.incident.join('／')}。${R.how}</p>
    <ol class="ps-repl">${['発生日時（西暦・24時間制）', '発生場所（地図を添付）', '登録記号・機体の種類と型式', '飛行の目的・区分（特定飛行の別、許可・承認の番号）', '経過（何が起きたか、時系列で）', '損壊した部位（部品名）', '負傷者の有無と状況', 'その後の対応（救護・通報・飛行中止）'].map(t => `<li><span>${t}</span><span class="fill-line"></span></li>`).join('')}</ol></section>`;
}

// ---- A2 重量区分（質量バーの目盛りと床のシルエット） ----
function massRegHtml(totalG) {
  if (!regOn()) return '';
  const lg = (g) => ((Math.log10(g) - 1) / (Math.log10(60000) - 1) * 100).toFixed(1);   // 10g〜60kg の対数軸
  return `<div class="axis"><i class="tick" style="left:${lg(100)}%"><b>100 g</b><span>登録・航空法の対象</span></i><i class="tick me" style="left:${lg(totalG)}%"><b>この機体 ${(totalG / 1000).toFixed(2)} kg</b></i><i class="tick" style="left:${lg(25000)}%"><b>25 kg</b><span>カテゴリーⅡA・保険</span></i></div>
    <p>100g未満は「模型航空機」で、登録の対象ではないが空港周辺や150m以上など一部の規制は受ける。100g以上は登録（有効期間3年）と特定飛行の規制の対象。25kg以上は登録記号25mm以上、特定飛行はカテゴリーⅡA（許可・承認の審査がより厳格）、第三者賠償責任保険への加入が求められる。</p>
    <small>${kyChip('3.1')} 確認先: ${regSrc('reg')}・${regSrc('permit')}</small>`;
}
const regGhost = { grp: null };
function regGhosts(on) {
  const want = on && regOn() && S.scale;
  if (want && !regGhost.grp) {
    // 25kg級の機体の足元の目安（直径1.5m の輪）と、100g級の機体（手のひらサイズの箱）。実測ではなく区分の大きさの感覚を示すもの
    const g = new THREE.Group(); g.userData.noShadow = true;
    const ringGeo = new THREE.TorusGeometry(0.75, 0.004, 8, 128); const ringMat = new THREE.MeshBasicMaterial({ color: 0x8b939f, transparent: true, opacity: 0.55, toneMapped: false });
    const ring = new THREE.Mesh(ringGeo, ringMat); ring.rotation.x = Math.PI / 2; ring.position.y = -0.156; ring.userData.noPick = ring.userData.noAO = ring.userData.noShadow = true;
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.03, 0.10), new THREE.MeshStandardMaterial({ color: 0xb8bec8, roughness: 0.8, transparent: true, opacity: 0.85 }));
    box.position.set(0.62, -0.143, 0.30); box.userData.noPick = box.userData.noAO = true; box.castShadow = true;
    const rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.004, 16), box.material); for (const [x, z] of [[-0.04, -0.04], [0.04, -0.04], [-0.04, 0.04], [0.04, 0.04]]) { const r = rotor.clone(); r.position.set(0.62 + x, -0.125, 0.30 + z); r.userData.noPick = r.userData.noAO = true; g.add(r); }
    g.add(ring); g.add(box); g.userData.box = box; g.userData.ring = ring; scene.add(g); regGhost.grp = g;
  }
  if (regGhost.grp) regGhost.grp.visible = want;
  S.shadowDirty = S.csDirty = S.aoDirty = true;
}

// ---- 出典一覧（設定） ----
function renderRegSources() {
  const box = $('#regSources'); if (!box) return;
  box.innerHTML = `<p>制度の記述は${REG_DATE}の案文で、判定はしません。最新の内容は各確認先で確かめてください。教則は${KYOSOKU.ver}（${KYOSOKU.note}）を参照しています。</p><ul class="src-list">${Object.values(REG_SOURCES).map(s => `<li><a href="${s.url}" target="_blank" rel="noopener">${s.name}</a></li>`).join('')}<li><a href="${KYOSOKU.url}" target="_blank" rel="noopener">無人航空機の飛行の安全に関する教則 ${KYOSOKU.ver}（PDF）</a></li></ul>`;
}

function initReg() {
  syncRegToggle(); renderRegSources();
  const pop = $('#lessonPop'); if (pop && !$('#kyBtn')) { const b = document.createElement('button'); b.className = 'course ky-course'; b.id = 'kyBtn'; b.innerHTML = `<b>教則${KYOSOKU.ver}との対応表</b><span>登録講習機関・講師向け。章を選ぶと、その話に出せる画面が並びます</span>`; b.addEventListener('click', e => { e.stopPropagation(); pop.hidden = true; showKyosokuTable(); }); const foot = pop.querySelector('.pop-foot'); if (foot) pop.insertBefore(b, foot); else pop.appendChild(b); }
  window.__reg = { regOn, setReg, regGhosts, showKyosokuTable, kyView, KY_TAB, KY_JUMP, KY_PART, KYOSOKU, REG, WHATIF_REG };
}
