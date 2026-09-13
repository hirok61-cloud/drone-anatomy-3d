// 音の検証（Web Audio は実時間で動くので、待ちを挟んで測る）
const log = []; const A = (c, ...m) => { if (!c) log.push('FAIL ' + m.join(' ')); };
const d = window.__d, S2 = window.__sound;
A(!!S2, '音のAPIが出ている'); if (!S2) { return log; }
const { snd, sndOn, sndBeep } = S2;
A(!snd.ready, '押されるまで AudioContext を作らない');
sndOn(true);
A(snd.ready && snd.ctx, '入にすると作られる');
const an = snd.ctx.createAnalyser(); an.fftSize = 2048; snd.master.connect(an);
const td = new Float32Array(an.fftSize);
const rms = () => { an.getFloatTimeDomainData(td); let s = 0; for (const v of td) s += v * v; return Math.sqrt(s / td.length); };
const wait = (ms) => new Promise(r => setTimeout(r, ms));
// 回転数と音の高さ
d.S.power = 0.5; d.step(1.5, 30); await wait(400);
const hz = snd.mot.map(m => m.osc.frequency.value);
A(Math.abs(hz[0] - 4500 / 60 * 2) < 20, '高さ = 回転数/60 × 羽根2枚', hz[0].toFixed(0));
A(new Set(hz.map(h => h.toFixed(1))).size === 4, '4基の高さがわずかに違う（うなり）');
const rHover = rms(); A(rHover > 0.005, 'ホバリングで音が出ている', rHover.toFixed(4));
d.S.power = 1.0; d.step(1.5, 30); await wait(400);
const rFull = rms(); A(rFull > rHover * 1.8, '全開のほうが大きい', rHover.toFixed(4), rFull.toFixed(4));
A(rFull < 0.35, '大きすぎない（割れない）', rFull.toFixed(4));
// 止めれば無音
d.S.power = 0; d.step(2.5, 30); await wait(500);
A(rms() < 0.004, '止めたら静か', rms().toFixed(5));
// 風
if (window.__weather) { window.__weather.setWeather('cold'); d.step(2.5, 30); await wait(300);
  A(snd.wind.gain.gain.value > 0.01, '風の音が出る', snd.wind.gain.gain.value.toFixed(4));
  window.__weather.setWeather(null); d.step(1.5, 30); await wait(300);
  A(snd.wind.gain.gain.value < 0.004, '空もようを切ると風も止む'); }
// 警報
document.querySelector('#tabs [data-tab=mishap]').click(); d.step(0.3, 30);
{ const b = [...document.querySelectorAll('#whatifCards button')].find(x => /電波/.test(x.textContent)); if (b) b.click(); }
d.step(0.5, 30);
{ let hit = 0; for (let i = 0; i < 16; i++) { d.step(0.25, 30); if (snd.alarm.gain.gain.value > 0.02) hit++; }
  A(snd.alarmKind === 'signal', '電波切れの警報が選ばれる', snd.alarmKind);
  A(hit > 0 && hit < 16, '鳴りっぱなしではなく断続する', hit); }
snd.alarmT = 12; d.step(0.2, 30); A(snd.alarm.gain.gain.value < 0.02, '9秒で止まる');
if (typeof stopWhatif === 'function') stopWhatif(true);
// 音を切る → ブザーだけは鳴る
sndOn(false); await wait(700);
A(!snd.on, '切にできる');
sndBeep(1.0); await wait(200);
{ let mx = 0; for (let i = 0; i < 8; i++) { d.step(0.08, 30); await wait(60); mx = Math.max(mx, rms()); }
  A(mx > 0.005, '音が切でもブザーは鳴る', mx.toFixed(4)); }
await wait(1300); d.step(0.2, 30); await wait(250); d.step(0.2, 30);
A(snd.ctx.state === 'suspended', '鳴り終わったら止まる', snd.ctx.state);
log.length ? log : 'H OK';
