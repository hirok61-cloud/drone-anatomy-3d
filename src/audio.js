// ===== 音 =====
// 音源ファイルは持たない。すべて Web Audio で合成する（単一HTMLで配る教材なので、
// 数百KBの音声を data URI で抱えるより、数KBのコードで作るほうが軽い）。
//
// 鳴らすもの
//   ・モーター4基 … ブレード通過周波数（回転数/60 × 羽根の枚数）。4基の回転差でうなりが出る
//   ・プロペラの風切り … 回転数でカットオフが上がる帯域雑音
//   ・空もようの風 … 風速でカットオフとゲインが動く帯域雑音
//   ・警報 … 圧電ブザーに近い矩形波。もしもの場面ごとに鳴り方を変える
//   ・ショーの群れ … 3200機の遠いざわめき（実際、遠いのでほとんど聞こえない）
//
// 既定は切。講習で勝手に鳴ると困るので、押されるまで AudioContext も作らない。
const snd = {
  ctx: null, ready: false, on: false, vol: 0.55,
  master: null, mot: [], air: null, wind: null, alarm: null, swarm: null,
  alarmKind: null, alarmT: 0, beepUntil: 0,
};
const SND_BLADES = 2;              // 羽根の枚数。これ×毎秒回転数が音の高さになる
const SND_TAU = 0.04;              // 値を寄せる時定数。毎フレーム代入すると段差のノイズが出る

// 2秒ぶんの白色雑音。風の音はこれを帯域で切って作る
function sndNoiseBuf(ctx) {
  const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}
// 帯域雑音の1系統（風・風切り・群れで使い回す）
function sndNoiseVoice(ctx, buf, to, { freq, q, type = 'bandpass' }) {
  const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain(); g.gain.value = 0;
  src.connect(f); f.connect(g); g.connect(to); src.start();
  return { src, filt: f, gain: g };
}
function sndBuild() {
  if (snd.ready) return true;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  const ctx = new AC();
  const master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
  const buf = sndNoiseBuf(ctx);
  // モーター: のこぎり波（整数倍音を全部含む）を低域で切る。回転が上がるほど開く
  for (let i = 0; i < 4; i++) {
    const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 40;
    const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 300; filt.Q.value = 0.9;
    const gain = ctx.createGain(); gain.gain.value = 0;
    let out = gain;
    if (ctx.createStereoPanner) { const pan = ctx.createStereoPanner(); pan.pan.value = 0; gain.connect(pan); out = pan; }
    osc.connect(filt); filt.connect(gain); out.connect(master); osc.start();
    // 4基をきっちり同じ高さで鳴らすと機械の合成音になる。実機は個体差があって、
    // わずかな差が「うなり」になる。これが無いと、いくら倍音を足しても本物に聞こえない
    snd.mot.push({ osc, filt, gain, pan: out === gain ? null : out, det: 1 + (i - 1.5) * 0.0052 });
  }
  snd.air = sndNoiseVoice(ctx, buf, master, { freq: 900, q: 0.7 });    // 羽根が空気を切る音
  snd.wind = sndNoiseVoice(ctx, buf, master, { freq: 420, q: 0.45 });  // 空もようの風
  snd.swarm = sndNoiseVoice(ctx, buf, master, { freq: 260, q: 1.1 });  // 遠い群れ
  { const osc = ctx.createOscillator(); osc.type = 'square'; osc.frequency.value = 2700;   // 圧電ブザーの実機に近い高さ
    const gain = ctx.createGain(); gain.gain.value = 0;
    osc.connect(gain); gain.connect(master); osc.start();
    snd.alarm = { osc, gain }; }
  snd.ctx = ctx; snd.master = master; snd.ready = true;
  return true;
}
function sndOn(on) {
  on = !!on;
  if (on && !sndBuild()) { showToast('この端末では音を出せません'); return; }
  snd.on = on;
  for (const x of $$('.tgl[data-t="sound"]')) { x.classList.toggle('on', on); x.setAttribute('aria-pressed', String(on)); }
  store.set('sound', on ? '1' : '');
  if (!snd.ready) return;
  if (on && snd.ctx.state === 'suspended') snd.ctx.resume();
  const t = snd.ctx.currentTime;
  snd.master.gain.cancelScheduledValues(t);
  snd.master.gain.setTargetAtTime(on ? snd.vol : 0, t, 0.05);
  // 止めるのは遅らせる。ただしその間にブザーを押されたら止めない（押した音が落ちる）
  if (!on) setTimeout(() => { if (!snd.on && performance.now() >= snd.beepUntil && snd.ctx.state === 'running') snd.ctx.suspend(); }, 400);
}
function sndVol(v) {
  snd.vol = clamp(v, 0, 1); store.set('soundVol', String(Math.round(snd.vol * 100)));
  if (snd.ready && snd.on) snd.master.gain.setTargetAtTime(snd.vol, snd.ctx.currentTime, 0.05);
}
// 警報の鳴り方。場面ごとに変える（実機のブザーも、何が起きたかで鳴り分ける）
// 返すのは 0〜1 の開き具合
function sndAlarmEnv(kind, t) {
  if (kind === 'signal') { const u = t % 1.5; return u < 0.14 || (u > 0.26 && u < 0.40) ? 1 : 0; }      // 短く2回
  if (kind === 'battery') { const u = t % 0.9; return u < 0.34 ? 1 : 0; }                                // ゆっくり連続
  if (kind === 'gps') { const u = t % 2.0; return u < 0.10 || (u > 0.20 && u < 0.30) || (u > 0.40 && u < 0.50) ? 1 : 0; }   // 短く3回
  if (kind === 'test') { const u = t % 0.6; return u < 0.22 ? 1 : 0; }                                   // 部品の「鳴らしてみる」
  return 0;
}
// ブザーの部品から鳴らす。音が切のときでも、押した人の意思なので鳴らす
function sndBeep(sec = 1.8) {
  if (!sndBuild()) { showToast('この端末では音を出せません'); return false; }
  // resume は非同期。止まっている間は ctx.currentTime が進まないので、
  // 明けてから鳴らし始めないと最初のひと鳴りが落ちる
  const go = () => {
    snd.beepUntil = performance.now() + sec * 1000; snd.alarmT = 0;
    if (!snd.on) snd.master.gain.setTargetAtTime(snd.vol, snd.ctx.currentTime, 0.03);
  };
  if (snd.ctx.state === 'suspended') { const pr = snd.ctx.resume(); if (pr && pr.then) pr.then(go, go); else go(); }
  else go();
  return true;
}
// 毎フレーム、いまの状態を音に写す
function stepSound(dtReal) {
  if (!snd.ready) return;
  const beep = performance.now() < snd.beepUntil;
  if (!snd.on && !beep) {
    if (snd.alarmKind) snd.alarmKind = null;
    // ブザーが鳴り終わったら止める。オシレーターを回したままにすると電池を食う
    if (snd.ctx.state === 'running' && performance.now() - snd.beepUntil > 700) { snd.master.gain.value = 0; snd.ctx.suspend(); }
    return;
  }
  const ctx = snd.ctx, t = ctx.currentTime, T = SND_TAU;
  if (!snd.on && beep) {   // 「鳴らしてみる」だけの間は、ブザー以外を黙らせる
    for (const m of snd.mot) m.gain.gain.setTargetAtTime(0, t, T);
    snd.air.gain.gain.setTargetAtTime(0, t, T);
    snd.wind.gain.gain.setTargetAtTime(0, t, T);
    snd.swarm.gain.gain.setTargetAtTime(0, t, T);
  } else {
    // ---- モーター4基 ----
    let sum = 0;
    for (let i = 0; i < 4; i++) {
      const mo = D.motors[i], m = snd.mot[i], rpm = mo.rpm; sum += rpm;
      const k = clamp(rpm / RPM_MAX, 0, 1);
      m.osc.frequency.setTargetAtTime(Math.max(24, rpm / 60 * SND_BLADES * m.det), t, T);
      m.filt.frequency.setTargetAtTime(260 + rpm * 0.46, t, T);
      // 静かなところは静かに、上げると効いてくる。2乗だとホバリングが静かすぎる（全開との差が12dB）
      m.gain.gain.setTargetAtTime(Math.pow(k, 1.5) * 0.125, t, T);
      if (m.pan) m.pan.pan.setTargetAtTime(clamp(mo.u.x * 0.55, -1, 1), t, 0.12);
    }
    const avg = sum / 4;
    // ---- 羽根が空気を切る音 ----
    { const k = clamp(avg / RPM_MAX, 0, 1);
      snd.air.filt.frequency.setTargetAtTime(500 + k * 2600, t, T);
      snd.air.gain.gain.setTargetAtTime(Math.pow(k, 1.6) * 0.070, t, T); }
    // ---- 空もようの風 ----
    { let spd = 0;
      // 聞こえるのは「その場に立っている人の耳元の風」なので、機体の高度ではなく人の高さで測る
      if (typeof weather === 'object' && weather.on && typeof windAt === 'function') spd = windAt(1.5).spd;
      else if (typeof whatif === 'object' && whatif.active && whatif.def && whatif.def.id === 'wind') spd = 6 + 3 * Math.sin(performance.now() * 0.0016);
      // 飛行を中止する目安の5m/sで、ホバリングのモーター音と同じくらいに聞こえる大きさ
      let k = clamp(spd / 9, 0, 1);
      // ダウンバーストは「急に音が来て、急に去る」のが怖さの本体。
      // windAt の水平成分だけでは吹き降ろしの真下が静かになってしまうので、強さを直接使う
      if (typeof weather === 'object' && weather.on && weather.burstEnv > 0) k = Math.max(k, weather.burstEnv * 0.92);
      snd.wind.filt.frequency.setTargetAtTime(300 + k * 900, t, T);
      snd.wind.gain.gain.setTargetAtTime(Math.pow(k, 1.4) * 0.18, t, 0.12); }
    // ---- ショーの群れ（遠いので、ほとんど聞こえないのが正しい）----
    { const on = typeof dshow === 'object' && dshow.on && dshow.pts;
      snd.swarm.gain.gain.setTargetAtTime(on ? 0.035 : 0, t, 0.30);
      if (on) snd.swarm.filt.frequency.setTargetAtTime(240 + 40 * Math.sin(dshow.t * 0.7), t, 0.20); }
  }
  // ---- 警報 ----
  let kind = null;
  if (beep) kind = 'test';
  else if (typeof whatif === 'object' && whatif.active && whatif.def) {
    // 段は人が進めるので、段では区切らない。場面に入った時点でもう起きていること
    if (whatif.def.id === 'signal' || whatif.def.id === 'battery' || whatif.def.id === 'gps') kind = whatif.def.id;
  }
  if (kind !== snd.alarmKind) { snd.alarmKind = kind; snd.alarmT = 0; }
  snd.alarmT += dtReal;
  if (kind && kind !== 'test' && snd.alarmT > 9) kind = null;   /* 実機は復帰まで鳴り続けるが、読んでいる間ずっとだとうるさい */
  if (kind) {
    snd.alarm.osc.frequency.setTargetAtTime(kind === 'gps' ? 2100 : 2700, t, 0.02);
    snd.alarm.gain.gain.setTargetAtTime(sndAlarmEnv(kind, snd.alarmT) * 0.085, t, 0.006);   /* 立ち上がりを速く。鈍いと警報に聞こえない */
  } else {
    snd.alarm.gain.gain.setTargetAtTime(0, t, 0.02);
  }
  if (!snd.on && !beep) snd.master.gain.setTargetAtTime(0, t, 0.05);
}
function initSound() {
  const v = store.get('soundVol'); if (v) snd.vol = clamp(parseInt(v, 10) / 100, 0, 1);
  const sl = $('#volSlider'); if (sl) { sl.value = String(Math.round(snd.vol * 100)); sl.addEventListener('input', () => sndVol(parseInt(sl.value, 10) / 100)); }
  if (store.get('sound')) {
    sndOn(true);
    // 読み込み直後はブラウザが音を止める。最初に画面を触ったところで開ける
    if (snd.ctx && snd.ctx.state === 'suspended') {
      const wake = () => { if (snd.on && snd.ctx.state === 'suspended') snd.ctx.resume(); };
      document.addEventListener('pointerdown', wake, { once: true });
      document.addEventListener('keydown', wake, { once: true });
    }
  }   /* 前に入れた人は次も鳴る。初めての人は切のまま */
  window.__sound = { snd, sndOn, sndVol, sndBeep, stepSound };
}
