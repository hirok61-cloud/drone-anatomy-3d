// ことばを形にする（形のエンジンとショーへの組み込み）の検証
// 前提: 読み込み直後のページ。レッスンモード（?lesson=）ではないこと
const log = []; const A = (c, ...m) => { if (!c) log.push('FAIL ' + m.join(' ')); };
const d = window.__d, DS = window.__dshow, ds = DS.dshow, E = window.__dshape;
const wait = (ms) => new Promise(r => setTimeout(r, ms));
A(!!E, '形のエンジンが出ている'); if (!E) return log;
d.noRender = true; d.step(0.4, 30);

// ---- 言葉の正規化 ----
A(E.dshapeNorm('ドラゴン！') === E.dshapeNorm('どらごん'), '正規化: カタカナと記号');
A(E.dshapeNorm('ＤＲＡＧＯＮ') === 'dragon', '正規化: 全角英字と大文字', E.dshapeNorm('ＤＲＡＧＯＮ'));
A(E.dshapeNorm(' さ く ら ') === 'さくら', '正規化: 空白');
A(E.dshapeResolve('ぜったいにないことば') === null, '知らない言葉は形にしない');
A(E.dshapeResolve('') === null, '空は形にしない');

// ---- 形の定義はすべて点にできる ----
const list = E.dshapeList();
A(list.length >= 2, '形が登録されている', list.length);
{ const owner = new Map();
  for (const def of list) {
    A(/^[a-z0-9_]+$/.test(def.id) && def.name && Array.isArray(def.keys) && def.keys.length, `${def.id}: id・name・keys がある`);
    for (const k of [def.name].concat(def.keys)) { const nk = E.dshapeNorm(k); if (!nk) continue;
      A(!owner.has(nk) || owner.get(nk) === def.id, `言葉「${k}」が ${owner.get(nk)} と ${def.id} で重なっている`); owner.set(nk, def.id);
      const r = E.dshapeResolve(k); A(r && r.kind === 'lib' && r.def.id === def.id, `${def.id}: 「${k}」で引ける`, r && r.def && r.def.id); }
    for (const n of [1200, 3200]) {
      let sh = null; try { sh = E.dshapeMake({ kind: 'lib', def }, n, {}); } catch (e) { A(false, `${def.id}: 例外 ${e.message}`); }
      A(!!sh, `${def.id}: ${n}機で作れる`); if (!sh) continue;
      A(sh.bx.length === n && sh.by.length === n && sh.col.length === n * 3, `${def.id}: ちょうど ${n} 点`);
      let ok = true, mx = 0, cmin = 9, cmax = -9;
      for (let i = 0; i < n; i++) { if (!isFinite(sh.bx[i]) || !isFinite(sh.by[i])) ok = false; mx = Math.max(mx, Math.abs(sh.bx[i]), Math.abs(sh.by[i]));
        for (let k = 0; k < 3; k++) { const c = sh.col[i * 3 + k]; if (!isFinite(c)) ok = false; cmin = Math.min(cmin, c); cmax = Math.max(cmax, c); } }
      A(ok, `${def.id}: 位置と色が数として正しい`);
      A(mx > 0.98 && mx < 1.02, `${def.id}: 止まった形は 1 に収まっている`, mx.toFixed(3));
      A(cmin >= 0 && cmax <= 1.6, `${def.id}: 色の範囲`, cmin.toFixed(2), cmax.toFixed(2));
      { let bright = 0; for (let i = 0; i < n; i++) if (Math.max(sh.col[i * 3], sh.col[i * 3 + 1], sh.col[i * 3 + 2]) > 0.5) bright++;
        A(bright > n * 0.5, `${def.id}: 半分以上の機体がはっきり光る（暗い色ばかりでない）`, (bright / n).toFixed(2)); }
      A(sh.pitch > 0.008 && sh.pitch < 0.2, `${def.id}: 点の間隔`, sh.pitch.toFixed(4));
      A(sh.box[0] <= sh.half[0] * 1.36 + 1e-6 && sh.box[1] <= sh.half[1] * 1.36 + 1e-6, `${def.id}: 動きの幅が大きすぎない`, sh.box.map(v => v.toFixed(2)).join('×'), sh.half.map(v => v.toFixed(2)).join('×'));
      A(sh.half[0] / sh.half[1] > 0.55 && sh.half[0] / sh.half[1] < 1.8, `${def.id}: 縦横比`, (sh.half[0] / sh.half[1]).toFixed(2));
      if (n === 1200) {   // 動かしても崩れない・はみ出さない
        const P = new Float32Array(n * 2), C = new Float32Array(n * 3); let fin = true, out = 0;
        for (const t of [0, 0.37, 1.1, 2.9, 7.3]) { E.dshapePose(sh, t, P, C);
          for (let i = 0; i < n; i++) { if (!isFinite(P[i * 2]) || !isFinite(P[i * 2 + 1]) || !isFinite(C[i * 3])) fin = false; if (Math.abs(P[i * 2]) > sh.box[0] * 1.12 || Math.abs(P[i * 2 + 1]) > sh.box[1] * 1.12) out++; } }
        A(fin, `${def.id}: 動かしても数として正しい`); A(out < n * 0.01, `${def.id}: 動いても枠に収まる`, out);
        // 同じ入力なら同じ結果（機体の割り当てが毎回変わらない）
        const sh2 = E.dshapeMake({ kind: 'lib', def }, n, {}); let same = true; for (let i = 0; i < n; i += 17) if (sh.bx[i] !== sh2.bx[i] || sh.by[i] !== sh2.by[i]) same = false;
        A(same, `${def.id}: 何度作っても同じ配置`);
        // 動きを減らす設定では動かさない
        const st = E.dshapeMake({ kind: 'lib', def }, n, { still: true }); A(st && st.anims.length === 0 && st.colAnims.length === 0 && !st.colLive, `${def.id}: still で動きなし`);
      }
    }
  } }

// ---- ショーの中で ----
document.querySelector('#tabs [data-tab=fly]').click(); d.step(0.3, 30);
document.getElementById('showBtn').click(); d.step(1.2, 30);
A(ds.on, 'ショーが始まる');
DS.dshowSetMode('auto'); DS.dshowSetText(''); d.step(0.3, 30);
window.__dsui.dshowAuto(false);   /* 確かめている最中に自動で次の図形へ進まないように */
const settle = () => { for (let i = 0; i < 40 && !(ds.phase === 'hold' && ds.forceFig < 0); i++) d.step(0.25, 30); d.step(0.6, 30); };   /* 指定の図形に着くまで待つ */
const ext = () => { let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (let i = 0; i < ds.n; i++) { const x = ds.to[i * 3], y = ds.to[i * 3 + 1]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } return { x0, x1, y0, y1 }; };
{ const ok = DS.dshowSetText('ちょうちょ'); settle();
  A(ok === true, '形: 受け付ける');
  A(DS.DSHOW_FIGS[ds.fig].id === 'custom' && !!ds.shape, '形: すぐその図形へ飛び、形として出る');
  A(DS.dshowFigName() === 'ちょう', '形: 名前が形のものになる', DS.dshowFigName());
  A(document.getElementById('noteBadge').textContent === 'ちょう', '形: 札にも名前が出る', document.getElementById('noteBadge').textContent);
  A(/位置と色/.test(document.getElementById('dshowBody').textContent), '形: 説明が形のものになる');
  const e = ext(), R = DS.DSHOW_R, H = DS.DSHOW_H;
  A(e.x1 - e.x0 > 1.2 && e.y1 - e.y0 > 1.2, '形: 広がりがある', (e.x1 - e.x0).toFixed(2), (e.y1 - e.y0).toFixed(2));
  A(e.x0 > -ds.fitX && e.x1 < ds.fitX && e.y1 < H + ds.fitY * 0.80 && e.y0 > H - ds.fitY * 0.80, '形: 見える範囲に収まる', [e.x0, e.x1, e.y0, e.y1].map(v => v.toFixed(2)).join(' '));
  const cols = new Set(); for (let i = 0; i < ds.n; i += 3) cols.add([0, 1, 2].map(k => Math.round(ds.colTo[i * 3 + k] * 6)).join(','));
  A(cols.size >= 4, '形: 1機ずつ色が違う', cols.size);
  const a = Array.from(ds.to.slice(0, 30)); d.step(0.6, 30); const b = Array.from(ds.to.slice(0, 30));
  A(a.some((v, i) => Math.abs(v - b[i]) > 1e-4), '形: 静止中も動いている');
  A(ds.shape.glow >= 0.36 && ds.shape.glow <= 1, '形: 灯りの大きさが点の間隔から決まる', ds.shape.glow);
  A(Math.abs(ds.glowF - ds.shape.glow) < 0.2, '形: 灯りの大きさが効いている', ds.glowF.toFixed(2));
  // 地上のしくみ（⑥ジオフェンス）を見せているあいだは、ほかの図形と同じ枠の内側へ縮む
  { window.__dsui.dshowPick('fail'); d.step(2.0, 30); const f = ext();
    A(f.x0 > -R * 1.10 && f.x1 < R * 1.10 && f.y1 < H + R * 0.96 && f.y0 > H - R * 1.02, '形: ジオフェンスの枠の内側に収まる', [f.x0, f.x1, f.y0, f.y1].map(v => v.toFixed(2)).join(' '));
    window.__dsui.dshowPick(null); window.__dsui.dshowAuto(false); d.step(2.0, 30); const g2 = ext();
    A(g2.x1 - g2.x0 >= f.x1 - f.x0 - 0.35, '形: しくみを消すと元の大きさへ戻る', (g2.x1 - g2.x0).toFixed(2), (f.x1 - f.x0).toFixed(2)); } }
// 文字のまま
{ DS.dshowSetMode('text'); settle();
  A(DS.DSHOW_FIGS[ds.fig].id === 'custom' && !ds.shape, '文字のまま: 形にしない');
  A(DS.dshowFigName() === 'あなたの文字', '文字のまま: 名前', DS.dshowFigName());
  DS.dshowSetMode('auto'); settle();
  A(!!ds.shape, '形にする: 形へ戻る'); }
// 形の無い言葉は文字になる
{ const ok = DS.dshowSetText('おめでとう'); settle();
  A(ok === true && !ds.shape && DS.DSHOW_FIGS[ds.fig].id === 'custom', '形の無い言葉: 文字で出る');
  const e = ext(); A(e.x1 - e.x0 > e.y1 - e.y0, '形の無い言葉: 横に長い'); }
// 絵文字そのもの（端末に絵文字が無い環境では文字へ落ちる。どちらでも受け付けること）
{ const ok = DS.dshowSetText('🐧'); settle();
  A(ok === true && DS.DSHOW_FIGS[ds.fig].id === 'custom', '絵文字: 受け付ける');
  if (ds.shape) { A(ds.shape.sh.kind === 'emoji', '絵文字: 絵文字から作った形'); A(/の形$/.test(DS.dshowFigName()), '絵文字: 名前', DS.dshowFigName()); } }
// 言葉の表（あれば）
{ const r = E.dshapeResolve('りんご'); if (r) A(r.kind === 'emoji' || r.kind === 'lib', '言葉の表: りんごが引ける'); }
// 図形が先へ進んだら、形の扱いは終わる
{ DS.dshowNext(); settle();
  A(DS.DSHOW_FIGS[ds.fig].id !== 'custom' && !ds.shape, '次の図形: 形の動きを持ち越さない', DS.DSHOW_FIGS[ds.fig].id); }
// 画像から（端末の中だけで点にする）
{ const cv = document.createElement('canvas'); cv.width = 400; cv.height = 300; const c = cv.getContext('2d');
  c.fillStyle = '#fff'; c.fillRect(0, 0, 400, 300); c.fillStyle = '#e8312a'; c.beginPath(); c.arc(200, 150, 110, 0, 7); c.fill(); c.fillStyle = '#1c4fd6'; c.fillRect(150, 70, 100, 160);
  const blob = await new Promise(r => cv.toBlob(r, 'image/png')), file = new File([blob], 'logo.png', { type: 'image/png' });
  const sent = []; const of = window.fetch, ox = XMLHttpRequest.prototype.open, ob = navigator.sendBeacon;
  window.fetch = (...a) => { sent.push(String(a[0])); return of(...a); }; XMLHttpRequest.prototype.open = function (...a) { sent.push(String(a[1])); return ox.apply(this, a); }; navigator.sendBeacon = (...a) => { sent.push(String(a[0])); return true; };
  DS.dshowSetImage(file); await wait(700); settle();
  window.fetch = of; XMLHttpRequest.prototype.open = ox; navigator.sendBeacon = ob;
  A(sent.length === 0, '画像: どこにも送信しない', sent.join(' '));
  A(!!ds.shape && ds.shape.sh.kind === 'image', '画像: 形になる');
  A(DS.dshowFigName() === 'あなたの画像', '画像: 名前', DS.dshowFigName());
  A(/外部に送信されず/.test(document.getElementById('dshowBody').textContent), '画像: 説明に「送信しない」がある');
  // 白い背景は抜けている（四隅に機体がいない）
  if (ds.shape) { const sh = ds.shape.sh; let corner = 0; for (let i = 0; i < sh.n; i++) if (Math.abs(sh.bx[i]) > 0.9 && Math.abs(sh.by[i]) > 0.62) corner++; A(corner === 0, '画像: 単色の背景は抜く', corner); }
  let stored = false; try { for (let i = 0; i < localStorage.length; i++) { const v = localStorage.getItem(localStorage.key(i)) || ''; if (v.indexOf('data:image') >= 0) stored = true; } } catch (e) {}
  A(!stored, '画像: 保存しない');
  DS.dshowSetImage(new File(['x'], 'a.txt', { type: 'text/plain' })); A(ds.shape && ds.shape.sh.kind === 'image', '画像: 画像でないファイルは受け付けない（前の形のまま）'); }
// 言葉を打ち直すと画像は外れる
{ DS.dshowSetText('へび'); settle(); A(!ds.img && ds.shape && ds.shape.sh.kind === 'lib', '言葉を打つと画像から言葉の形へ替わる'); }
// 縦長の画面では縦長の構図へ（龍が入っていれば）
{ const dr = E.dshapeGet('dragon'), rise = E.dshapeGet('dragon_rise');
  if (dr && rise && dr.portrait === 'dragon_rise') { const fx = ds.fitX, fy = ds.fitY; ds.text = 'ドラゴン';
    ds.fitX = 1.4; ds.fitY = 2.6; A(DS.dshowCustomSrc().def.id === 'dragon_rise', '縦長の画面: 昇り龍に切り替わる');
    ds.fitX = 3.0; ds.fitY = 2.6; A(DS.dshowCustomSrc().def.id === 'dragon', '横長の画面: 横の龍');
    ds.fitX = fx; ds.fitY = fy; } }
// 入力欄
{ DS.dshowToggleText(true); d.step(0.2, 30);
  A(!!document.querySelector('#dshowText input') && document.querySelectorAll('.ds-sugs button').length >= 2, '入力欄: おすすめの形が並ぶ');
  A(!!document.getElementById('dshowImgBtn') && document.getElementById('dshowImg').accept === 'image/*', '入力欄: 画像から作る');
  A(/外部に送信されず/.test(document.getElementById('noteBody').textContent), '入力欄: 画像を送信しない旨が書いてある');
  const chip = document.querySelector('.ds-sugs button'); chip.click(); d.step(0.4, 30);
  A(ds.text === chip.dataset.w && !!ds.shapeNext || !!ds.shape, 'おすすめを押すとその形を描く', ds.text); }
// 空にすると元の図形だけに戻る
// 移動の最中に言葉を送っても、瞬間移動せず、着いたらすぐ指定の形へ向かう
{ DS.dshowSetText('くじら'); settle(); DS.dshowNext(); d.step(1.0, 30); A(ds.phase === 'move', '移動中である');
  const before = ds.mat.uniforms.uProg.value; DS.dshowSetText('ねこ'); d.step(0.1, 30);
  A(ds.mat.uniforms.uProg.value < 0.9 && ds.mat.uniforms.uProg.value >= before, '移動中の指定: いまの移動を打ち切らない', ds.mat.uniforms.uProg.value.toFixed(2));
  d.step(2.6, 30); A(DS.DSHOW_FIGS[ds.fig].id === 'custom' && ds.phase === 'move', '移動中の指定: 着いたらすぐ向かう（自動送りが止まっていても）', DS.DSHOW_FIGS[ds.fig].id, ds.phase); settle();
  A(ds.shape && ds.shape.sh.id === 'cat', '移動中の指定: 指定の形になる'); }
{ DS.dshowSetText(''); d.step(0.3, 30); window.__dsui.dshowAuto(true); A(ds.text === '' && !ds.img, '空: 言葉も画像も外れる');
  const seen = new Set(); for (let i = 0; i < 240 && seen.size < 6; i++) { d.step(0.25, 30); seen.add(DS.DSHOW_FIGS[ds.fig].id); }
  A(!seen.has('custom'), '空: 「あなたの…」は順番から外れる', [...seen].join('/')); }
document.getElementById('showBtn').click(); d.step(1.0, 30);
d.noRender = false;
log.length ? log : 'I OK';
