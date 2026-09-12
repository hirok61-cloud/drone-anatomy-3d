// ===== 飛行前点検チェックリスト（印刷） =====
// 部品40種がすでに持っている check[] を、飛行前の動線の順に並べ替えて紙に出す。
// 画面と同じ部品名で書くので、「この名前の部品が、どこにあって、なぜ点検するのか」を3Dに戻って確かめられる。
// 制度の判定はしない。記録の欄は様式そのものではなく、書く項目を思い出すための下書き。
const preflight = { detail: 'short', logs: true };

// みじかい版は現場で上から潰せる量に絞る。'*' を付けた項目と core の部品だけが残る。
// law（法令・教則・様式に列挙）と、この機体の追加（extra と部品の点検ポイント）は、紙の上でも見出しで分ける。
function preflightSections() {
  const full = preflight.detail === 'full';
  const keep = (t) => full || t[0] === '*';
  const strip = (t) => t.replace(/^\*/, '');
  return PREFLIGHT.map(sec => ({
    ...sec,
    law: (sec.law || []).filter(keep).map(strip),
    add: [
      ...(sec.extra || []).filter(keep).map(t => ({ t: strip(t) })),
      ...(sec.keys || []).filter(k => PARTS[k] && (full || (sec.core || []).includes(k))).flatMap(k =>
        (full ? PARTS[k].check : PARTS[k].check.slice(0, 1)).map((t, i) => ({ t, name: i === 0 ? PARTS[k].name : '' }))),
    ],
  })).filter(sec => sec.law.length || sec.add.length);
}
const preflightCount = (full) => {
  const keep = (t) => full || t[0] === '*';
  return PREFLIGHT.reduce((a, sec) => a + (sec.law || []).filter(keep).length + (sec.extra || []).filter(keep).length
    + (sec.keys || []).filter(k => PARTS[k] && (full || (sec.core || []).includes(k))).reduce((b, k) => b + (full ? PARTS[k].check.length : 1), 0), 0);
};

function preflightSheetHtml() {
  const secs = preflightSections();
  const n = secs.reduce((a, s) => a + s.law.length + s.add.length, 0);
  const li = (t, name) => `<li><span class="pf-box"></span><span class="pf-t">${name ? `<b>${name}</b>` : ''}${t}</span></li>`;
  const body = secs.map((sec, si) => `<section class="pf-sec">
    <h2><span class="pf-n">${si + 1}</span>${sec.name}${sec.ky ? `<em>${/^\d/.test(sec.ky) ? '教則 ' : ''}${sec.ky}</em>` : ''}</h2>
    ${sec.note ? `<p class="ps-small">${sec.note}</p>` : ''}
    ${sec.law.length ? `<ul class="pf-list">${sec.law.map(t => li(t)).join('')}</ul>` : ''}
    ${sec.add.length ? `<p class="pf-sub">この機体の追加（取扱説明書に基づく例。法令が列挙している項目ではない）</p><ul class="pf-list pf-add">${sec.add.map(r => li(r.t, r.name)).join('')}</ul>` : ''}
  </section>`).join('');
  const logs = preflight.logs ? `<section class="pf-log">
    <h2><span class="pf-n">記</span>飛行日誌へ書き写す</h2>
    <p class="ps-small">飛行日誌は「飛行記録」「日常点検記録」「点検整備記録」の3つ。特定飛行をするときは備え付けと記載が求められます。<b>この紙は日常点検記録（様式2）そのものではありません。</b>終わったらこの欄から様式2へ書き写してください。不具合を見つけて直したときは、その記録は点検整備記録（様式3）に書きます。</p>
    <div class="pf-two">
      <div><h3>日常点検記録（様式2）に書くこと</h3><ol class="ps-repl">${['実施の年月日・場所', '実施者の氏名', '点検項目ごとの結果', '特記事項'].map(t => `<li><span>${t}</span><span class="fill-line"></span></li>`).join('')}</ol>
        <p class="ps-small">様式2の点検項目は、機体全般／プロペラ／フレーム／通信系統／推進系統／電源系統／自動制御系統／操縦装置／バッテリー・燃料 の9つ。追加の項目を書く空欄もあります。</p></div>
      <div><h3>飛行記録（様式1）に書くこと</h3><ol class="ps-repl">${['飛行の年月日', '飛行させた者の氏名', '飛行の概要', '離陸と着陸の時刻・場所', '飛行時間', '総飛行時間', '不具合とその措置'].map(t => `<li><span>${t}</span><span class="fill-line"></span></li>`).join('')}</ol></div>
    </div>
  </section>` : '';
  return `
    <header class="ps-head"><h1>飛行前の点検・確認シート</h1>
      <div class="ps-meta"><span>${REG_DATE}の制度に基づく</span><span>${preflight.detail === 'full' ? 'くわしい' : 'みじかい'}版・${n}項目</span><span>教則${KYOSOKU.ver}に対応</span></div>
      <div class="pf-head">
        <div><span>年月日</span><i></i></div><div><span>場所</span><i></i></div>
        <div><span>機体（型式）</span><i></i></div><div><span>登録記号</span><i></i></div>
        <div><span>操縦者</span><i></i></div><div><span>点検者</span><i></i></div>
      </div>
    </header>
    <p class="pf-lead">上から順に □ を埋めます。<b>白い □ は法令・教則・様式に列挙されている項目</b>、<b>灰色の □ はこの機体の追加</b>です。異常があればその場で飛行を中止し、特記事項に書いてください。部品名は3D教材の画面と同じ言葉です。</p>
    ${body}
    <section class="pf-note"><h2><span class="pf-n">特</span>特記事項（不具合の内容と箇所、行った措置）</h2><div class="pf-freebox"></div></section>
    ${logs}
    <footer class="ps-foot">${PREFLIGHT_LAW}<br>${PREFLIGHT_NOTE}<br>確認先: ${REG_SOURCES.mlit.name} ${REG_SOURCES.mlit.url} ／ ${REG_SOURCES.log.name} ${REG_SOURCES.log.url}<br>${location.origin + location.pathname}</footer>`;
}

async function buildPreflightSheet() {
  const sheet = $('#printSheet'); sheet.innerHTML = preflightSheetHtml(); return sheet;
}
async function printPreflight() { await buildPreflightSheet(); window.print(); }

// ---------- 印刷の前に長さを選ぶ ----------
function openPreflight() {
  const short = preflightCount(false), full = preflightCount(true);
  renderNote({
    kind: 'preflight', title: '飛行前の点検・確認シート',
    html: `<p>法令と教則が挙げている確認項目を現場の動線の順に並べ、そこにこの教材の部品ごとの点検ポイントを足して印刷します。判定はしません。<b>日常点検記録（様式2）そのものではないので、終わったら様式2へ書き写してください。</b></p>
      <div class="pf-opt">
        <div class="seg small" id="pfLen" role="radiogroup" aria-label="長さ">
          <button data-pf="short" class="${preflight.detail === 'short' ? 'on' : ''}">みじかい（${short}項目）</button>
          <button data-pf="full" class="${preflight.detail === 'full' ? 'on' : ''}">くわしい（${full}項目）</button>
        </div>
        <button class="tgl ${preflight.logs ? 'on' : ''}" id="pfLogs" aria-pressed="${preflight.logs}"><i></i>飛行日誌に書く項目も付ける</button>
      </div>
      <p class="hint">みじかい版は現場で上から潰せる量、くわしい版は40部品すべての点検ポイントまで載せた版です。法令・教則に列挙された項目と、この機体の追加点検は、紙の上でも分けて並びます。</p>
      ${regDate()}`,
    actions: [
      { label: '印刷する', primary: true, fn: () => { renderNote(null); setTimeout(printPreflight, 60); } },
      { label: '画面で見る', fn: async () => { renderNote(null); await buildPreflightSheet(); document.body.classList.add('print-preview'); } },
      { label: '閉じる', fn: () => renderNote(null) },
    ],
  });
  const seg = $('#pfLen'); if (seg) seg.onclick = (e) => { const b = e.target.closest('button'); if (!b) return; preflight.detail = b.dataset.pf; segSet(seg, 'pf', b.dataset.pf); };
  const lg = $('#pfLogs'); if (lg) lg.onclick = () => { preflight.logs = !preflight.logs; lg.classList.toggle('on', preflight.logs); lg.setAttribute('aria-pressed', String(preflight.logs)); };
}

function initPreflight() {
  const pop = $('#lessonPop');
  if (pop && !$('#pfBtn')) {
    const b = document.createElement('button'); b.className = 'course pf-course'; b.id = 'pfBtn';
    b.innerHTML = '<b>飛行前の点検・確認シート</b><span>法令と教則の確認項目に、この機体の点検ポイントを足して印刷する</span>';
    b.addEventListener('click', e => { e.stopPropagation(); pop.hidden = true; openPreflight(); });
    const ky = $('#kyBtn'), foot = pop.querySelector('.pop-foot');
    pop.insertBefore(b, ky || foot || null);
  }
  window.__preflight = { preflight, openPreflight, buildPreflightSheet, preflightSections, preflightCount };
}
