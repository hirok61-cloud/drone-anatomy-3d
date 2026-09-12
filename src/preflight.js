// ===== 飛行前点検チェックリスト（印刷） =====
// 部品40種がすでに持っている check[] を、飛行前の動線の順に並べ替えて紙に出す。
// 画面と同じ部品名で書くので、「この名前の部品が、どこにあって、なぜ点検するのか」を3Dに戻って確かめられる。
// 制度の判定はしない。記録の欄は様式そのものではなく、書く項目を思い出すための下書き。
const preflight = { detail: 'short', logs: true };   /* 保存値は initPreflight で読む（store は ui.js で宣言されるので、ここでは触れない） */

// みじかい版は現場で上から潰せる量に絞る。'*' を付けた項目と core の部品だけが残る。
// core は 'prop@0,2,1' のように、その部品の check[] のどれを採るかを書ける（先頭1件だと取り付け向きなど肝心の項目が落ちる）。
// law（法令・教則・様式に列挙）と、この機体の追加（extra と部品の点検ポイント）は、紙の上でも見出しで分ける。
const pfPick = (spec) => { const [k, idx] = String(spec).split('@'); return { k, idx: idx ? idx.split(',').map(Number) : [0] }; };
function preflightSections() {
  const full = preflight.detail === 'full';
  const keep = (t) => full || t[0] === '*';
  const strip = (t) => t.replace(/^\*/, '');
  return PREFLIGHT.map(sec => {
    const picks = (sec.core || []).map(pfPick);
    return {
      ...sec,
      law: (sec.law || []).filter(keep).map(strip),
      add: [
        ...(sec.extra || []).filter(keep).map(t => ({ t: strip(t) })),
        ...(sec.keys || []).filter(k => PARTS[k] && (full || picks.some(x => x.k === k))).flatMap(k => {
          const items = full ? PARTS[k].check.map((t, i) => i) : (picks.find(x => x.k === k).idx);
          return items.filter(i => PARTS[k].check[i]).map((i, n) => ({ t: PARTS[k].check[i], name: n === 0 ? PARTS[k].name : '' }));
        }),
      ],
    };
  }).filter(sec => sec.law.length || sec.add.length);
}
const preflightCount = (full) => {
  const keep = (t) => full || t[0] === '*';
  return PREFLIGHT.reduce((a, sec) => {
    const picks = (sec.core || []).map(pfPick);
    return a + (sec.law || []).filter(keep).length + (sec.extra || []).filter(keep).length
      + (sec.keys || []).filter(k => PARTS[k]).reduce((b, k) => b + (full ? PARTS[k].check.length : (picks.find(x => x.k === k) ? picks.find(x => x.k === k).idx.filter(i => PARTS[k].check[i]).length : 0)), 0);
  }, 0);
};
// A4 の本文域は 273mm。break-inside: avoid のぶん少し余裕を見る
function preflightPages() {
  const sheet = $('#printSheet'); const prev = sheet.getAttribute('style') || '';
  sheet.setAttribute('style', 'display:block;position:fixed;left:-10000px;top:0;width:186mm;');
  const h = sheet.scrollHeight; sheet.setAttribute('style', prev);
  return Math.max(1, Math.ceil(h * 1.06 / (273 * 96 / 25.4)));
}

function preflightSheetHtml() {
  const secs = preflightSections();
  const n = secs.reduce((a, s) => a + s.law.length + s.add.length, 0);
  const li = (t, name) => `<li><span class="pf-box"></span><span class="pf-t">${name ? `<b>${name}</b>` : ''}${t}</span><span class="pf-res"></span></li>`;
  const body = secs.map((sec, si) => `<section class="pf-sec">
    <h2><span class="pf-n">${si + 1}</span>${sec.name}${sec.ky ? `<em>${/^\d/.test(sec.ky) ? '教則 ' : ''}${sec.ky}</em>` : ''}</h2>
    ${sec.note ? `<p class="ps-small">${sec.note}</p>` : ''}
    ${sec.law.length ? `<ul class="pf-list">${sec.law.map(t => li(t)).join('')}</ul>` : ''}
    ${sec.add.length ? `<p class="pf-sub">この機体の追加（取扱説明書に基づく例。法令が列挙している項目ではない）</p><ul class="pf-list pf-add">${sec.add.map(r => li(r.t, r.name)).join('')}</ul>` : ''}
    ${sec.id === 'wx' ? '<p class="pf-meas">風速 <i></i> m/s　　気温 <i></i> ℃　　天候 <i></i></p>' : ''}
  </section>`).join('');
  const logs = preflight.logs ? `<section class="pf-log">
    <h2><span class="pf-n">記</span>飛行日誌へ書き写す</h2>
    <p class="ps-small">飛行日誌は「飛行記録」「日常点検記録」「点検整備記録」の3つ。特定飛行をするときは備え付けと記載が求められます。不具合を見つけて直したときは、その記録は点検整備記録（様式3）に書きます。</p>
    <div class="pf-two">
      <div><h3>日常点検記録（様式2）に書くこと</h3><ol class="ps-repl">${['実施の年月日・場所', '実施者の氏名', '点検項目ごとの結果', '特記事項'].map(t => `<li><span>${t}</span><span class="fill-line"></span></li>`).join('')}</ol>
        <p class="ps-small">様式2の点検項目は、機体全般／プロペラ／フレーム／通信系統／推進系統／電源系統／自動制御系統／操縦装置／バッテリー、燃料 の9つ。このシートの〔様式2: …〕がその欄にあたります。</p></div>
      <div><h3>飛行記録（様式1）に書くこと</h3><ol class="ps-repl">${['飛行の年月日', '飛行させた者の氏名', '飛行の概要', '離陸と着陸の時刻・場所', '飛行時間', '総飛行時間', '不具合とその措置'].map(t => `<li><span>${t}</span><span class="fill-line"></span></li>`).join('')}</ol></div>
    </div>
  </section>` : '';
  const home = location.protocol === 'file:' ? 'https://drone-anatomy-3d.hiro-k61.workers.dev/' : location.origin + location.pathname;
  const src = [REG_SOURCES.mlit, REG_SOURCES.log, REG_SOURCES.dips, REG_SOURCES.soumu].map(x => `${x.name} ${x.url}`).join(' ／ ');
  return `
    <header class="ps-head"><h1>運航前後の点検・確認シート</h1>
      <div class="ps-meta"><span>${REG_DATE}の制度に基づく</span><span>${preflight.detail === 'full' ? '全部' : '現場用'}・${n}項目</span><span>教則${KYOSOKU.ver}に対応</span></div>
      <div class="pf-head">
        <div><span>年月日</span><i></i></div><div><span>場所</span><i></i></div>
        <div><span>機体（型式）</span><i></i></div><div><span>登録記号</span><i></i></div>
        <div><span>操縦者</span><i></i></div><div><span>補助者</span><i></i></div>
        <div><span>点検者</span><i></i></div><div><span>飛行の区分</span><i></i></div>
      </div>
    </header>
    <p class="pf-warn"><b>この紙は現場の手控えです。日常点検記録（様式2）そのものではありません。</b>終わったら様式2へ書き写してください。</p>
    <p class="pf-lead">左の段を上から、次に右の段の順に □ を埋めます。<b>白い □ は法令・教則・様式に列挙されている項目</b>、<b>破線の □ はこの機体の追加</b>です。右端の線には結果や数値を書けます。異常があればその場で飛行を中止し、特記事項に書いてください。部品名は3D教材の画面と同じ言葉です。</p>
    ${body}
    <section class="pf-note"><h2><span class="pf-n">特</span>特記事項（不具合の内容と箇所、行った措置）</h2><div class="pf-freebox"></div></section>
    ${logs}
    <footer class="ps-foot">${PREFLIGHT_LAW}<br>確認先: ${src}<br>${home}</footer>`;
}

async function buildPreflightSheet() {
  const sheet = $('#printSheet'); sheet.innerHTML = preflightSheetHtml(); return sheet;
}
async function printPreflight() { await buildPreflightSheet(); window.print(); }

// ---------- 印刷の前に長さを選ぶ ----------
function openPreflight() {
  const short = preflightCount(false), full = preflightCount(true);
  renderNote({
    kind: 'preflight', title: '運航前後の点検・確認シート',
    html: `${langNote()}<p>法令と教則が挙げている確認項目を現場の動線の順に並べ、そこにこの教材の部品ごとの点検ポイントを足して印刷します。判定はしません。<b>日常点検記録（様式2）そのものではないので、終わったら様式2へ書き写してください。</b></p>
      <div class="pf-opt">
        <div class="seg small" id="pfLen" role="radiogroup" aria-label="長さ">
          <button data-pf="short" class="${preflight.detail === 'short' ? 'on' : ''}">現場用（${short}項目）</button>
          <button data-pf="full" class="${preflight.detail === 'full' ? 'on' : ''}">全部（${full}項目）</button>
        </div>
        <button class="tgl" id="pfLogs" data-t="pfLogs" aria-pressed="${preflight.logs}"><i></i>飛行日誌に書く項目も付ける</button>
      </div>
      <p class="hint" id="pfPages">—</p>
      ${regDate()}`,
    actions: [
      { label: '印刷する', primary: true, fn: () => { renderNote(null); setTimeout(printPreflight, 60); } },
      { label: '画面で見る', fn: async () => { renderNote(null); await buildPreflightSheet(); openPreview(); } },
      { label: '閉じる', fn: () => renderNote(null) },
    ],
  });
  const showPages = async () => { await buildPreflightSheet(); const el = $('#pfPages'); if (el) el.textContent = `A4縦でおよそ ${preflightPages()} 枚。法令・教則に列挙された項目と、この機体の追加点検は、紙の上でも分けて並びます。`; };
  const seg = $('#pfLen'); if (seg) seg.onclick = (e) => { const b = e.target.closest('button'); if (!b) return; preflight.detail = b.dataset.pf; store.set('pfDetail', preflight.detail); segSet(seg, 'pf', b.dataset.pf); showPages(); };
  const lg = $('#pfLogs'); if (lg) { lg.classList.toggle('on', preflight.logs); lg.addEventListener('click', () => { preflight.logs = lg.classList.contains('on'); store.set('pfLogs', preflight.logs ? '1' : '0'); showPages(); }); }   /* on/off の付け替えは ui.js の .tgl 委譲がする */
  showPages();
}

function initPreflight() {
  preflight.detail = store.get('pfDetail') === 'full' ? 'full' : 'short';
  preflight.logs = store.get('pfLogs') !== '0';
  const pop = $('#lessonPop');
  if (pop && !$('#pfBtn')) {
    const b = document.createElement('button'); b.className = 'course pf-course'; b.id = 'pfBtn';
    b.innerHTML = '<b>運航前後の点検・確認シート</b><span>現場向け · 印刷 · 法令と教則の項目＋この機体の点検</span>';
    b.addEventListener('click', e => { e.stopPropagation(); pop.hidden = true; openPreflight(); });
    pop.appendChild(b);   /* 「配る・引く」の見出しより後ろに積む */
  }
  window.__preflight = { preflight, openPreflight, buildPreflightSheet, preflightSections, preflightCount, preflightPages, PREFLIGHT };
}
