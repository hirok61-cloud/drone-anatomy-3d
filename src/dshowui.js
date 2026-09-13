// ===== ショーの読み面と操作列 =====
// 説明が増えるほど、いちばん狭い窓（説明カード）に足したくなる。それをやると夜空が消える。
// 増えた文字は「いま空いている面」へ回す:
//   ・ライブ帯（#noteCard.mini）… いま何が起きているか。1〜2行
//   ・操作列（ドックの空き）    … 項目の選択と3Dの出し入れ。夜空を1pxも削らない
//   ・読み面（#dshowPanel）      … しくみ7・きまり8・この1機の全文。開いたときだけ出る
const dsUI = { open: false, tab: 'how', pick: null };

// ---------- 操作列 ----------
function dshowChipsBuild() {
  const box = $('#dsHowChips'); if (!box || box.childElementCount) return;
  for (const h of DSHOW_HOW) {
    const b = document.createElement('button');
    b.dataset.ds = h.id; b.setAttribute('aria-pressed', 'false');
    b.setAttribute('aria-label', h.head);
    b.innerHTML = `<span aria-hidden="true">${h.no}</span>${h.chip}`;   /* 7項目すべてが3Dを持つので、印は情報を持たない */
    b.addEventListener('click', () => dshowPick(dsUI.pick === h.id ? null : h.id));
    box.appendChild(b);
  }
}
// 項目を選ぶ = 3Dの見え方が1つ変わる＋読み面がその項目へ飛ぶ。
// 選んでいる間は自動送りを止める（下で図形が入れ替わると、いま何の話か分からなくなる）
function dshowPick(id) {
  dsUI.pick = id || null;
  // カードを畳んだまま項目を選ぶと、3Dだけが変わって説明がどこにも出ない。開き直す
  if (dsUI.pick && !dsUI.open && typeof setNoteMini === 'function') {
    const card = $('#noteCard');
    if (card && (card.hidden || card.classList.contains('mini'))) { card.hidden = false; setNoteMini(false); }
  }
  for (const b of $$('#dsHowChips button')) {
    const on = b.dataset.ds === dsUI.pick;
    b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on));
    if (on) b.scrollIntoView({ inline: 'nearest', block: 'nearest' });   /* 横スクロールの端で隠れないように */
  }
  const h = DSHOW_HOW.find(x => x.id === dsUI.pick);
  if (typeof dshowLayer === 'function') dshowLayer(h ? h.layer : null);
  // ③時計だけは例外。図形が移り変わらないと時計のずれは現れないので、自動送りを続ける
  dshowAuto(h && h.layer === 'sync' ? true : (!dsUI.pick && !dsUI.open ? null : false));
  if (dsUI.open) { dsUI.tab = 'how'; dsRenderPanel(); if (h) { const el = $('#ds-' + h.id); if (el) el.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });   /* start だと押したボタンが画面外へ飛び、取り消し方が分からなくなる */ } }
  updateDshowVals();
}
// 自動送り: null=もとに戻す / true=入 / false=切
function dshowAuto(on) {
  dshow.auto = on == null ? !reduceMotion : !!on;
  const b = $('#dsAuto'); if (b) { b.classList.toggle('on', dshow.auto); b.setAttribute('aria-pressed', String(dshow.auto)); }
  updateDshowVals();
}

// ---------- 読み面 ----------
function dshowPanelOpen(on, tab) {
  const el = $('#dshowPanel'); if (!el) return;
  dsUI.open = !!on;
  if (tab) dsUI.tab = tab;
  document.body.classList.toggle('ds-read', dsUI.open);
  if (dsUI.open) {
    el.hidden = false; dsRenderPanel();
    setTimeout(() => { if (dsUI.open) setSheetState(el, 1); }, 0);   /* hidden を外した後で開く。rAF はタブが裏だと回らない */
    { const h = DSHOW_HOW.find(x => x.id === dsUI.pick);   /* 読むと宣言した以上、下で図形が変わらないほうがよい（③だけは変わらないと話が成り立たない） */
      dshowAuto(!!(h && h.layer === 'sync')); }
    $('#dsPanelTitle').focus({ preventScroll: true });
  } else {
    setSheetState(el, -1);
    setTimeout(() => { if (!dsUI.open) el.hidden = true; }, 420);
    dshowAuto(dsUI.pick ? false : null);   /* 閉じたら送りを戻す。戻さないと、読んで閉じた人の画面で図形が止まったままになる */
    const b = $('#dsRead'); if (b) b.focus({ preventScroll: true });
  }
  if (typeof dshowFrame === 'function' && dshow.on) dshowFrame(380);
}
function dsRenderPanel() {
  const body = $('#dsPanelBody'); if (!body) return;
  for (const b of $$('#dsSeg button')) { const on = b.dataset.ds === dsUI.tab; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); }
  $('#dsSeg [data-ds=reg]').hidden = false;   /* 札ごと消すと、制度の注記があること自体に気づけない */
  if (dsUI.tab === 'how') {
    body.innerHTML = DSHOW_HOW.map(h => `<section class="ds-item" id="ds-${h.id}">
        <div class="ds-head"><span class="ds-no" aria-hidden="true">${h.no}</span><h3>${h.head}</h3></div>
        <p class="ds-lead">${h.lead}</p>
        ${h.body}
        ${h.layer ? `<button class="ds-see${dsUI.pick === h.id ? ' on' : ''}" data-see="${h.id}">${dsUI.pick === h.id ? '空から消す' : '空で見る'}</button>` : ''}
        <small class="ds-src">${h.ky}</small>
      </section>`).join('') + `<p class="ds-src" style="margin-top:14px">${DSHOW_HOW_SRC}</p>`;
    body.onclick = e => {
      const b = e.target.closest('.ds-see'); if (!b) return;
      if (b.dataset.act === 'text') { dshowPanelOpen(false); dshowToggleText(true); return; }   /* 入力欄はカードに出る。読み面が空を覆っていると押した結果が見えない */
      dshowPick(dsUI.pick === b.dataset.see ? null : b.dataset.see);
    };
  } else if (dsUI.tab === 'reg' && !regOn()) {
    body.innerHTML = `<p class="hint">いまは制度の注記を出さない設定です。画面右上の「⚙」から<b>くわしく</b>に切り替えると、ここに催し・夜間・台数の要件が出ます。</p>`;
    body.onclick = null;
  } else if (dsUI.tab === 'reg') {
    body.innerHTML = `<p class="hint">${DSHOW_REG.lead}</p>
      <ul class="check">${DSHOW_REG.items.map(x => `<li>${x}</li>`).join('')}</ul>
      <p class="hint">${DSHOW_REG.outside}</p>
      <small class="ds-src">${DSHOW_REG.src}</small>`;
    body.onclick = null;
  } else {
    body.innerHTML = dshowCraftBody();
    body.onclick = null;
  }
  body.scrollTop = 0;
}

// ---------- 入口・出口 ----------
function dshowUIOn(on) {
  dshowChipsBuild();
  if (!on) { dshowPick(null); dshowPanelOpen(false); dshowAuto(null); }
  else { dsUI.pick = null; dsUI.tab = 'how'; dshowAuto(null); for (const b of $$('#dsHowChips button')) { b.classList.remove('on'); b.setAttribute('aria-pressed', 'false'); } }
}
function initDshowUI() {
  const q = $('#dsQuit'), n = $('#dsNext'), a = $('#dsAuto'), r = $('#dsRead');
  if (q) q.addEventListener('click', () => dshowOn(false));
  if (n) n.addEventListener('click', () => { dshowNext(); dshowAuto(false); });
  if (a) a.addEventListener('click', () => dshowAuto(!dshow.auto));
  if (r) r.addEventListener('click', () => dshowPanelOpen(!dsUI.open, 'how'));
  const cl = $('#dsPanelClose'); if (cl) cl.addEventListener('click', () => dshowPanelOpen(false));
  for (const b of $$('#dsSeg button')) b.addEventListener('click', () => { dsUI.tab = b.dataset.ds; dsRenderPanel(); });
  bindSheet($('#dshowPanel'));
  window.__dsui = { dsUI, dshowPanelOpen, dshowPick, dshowAuto, dsRenderPanel };
}
