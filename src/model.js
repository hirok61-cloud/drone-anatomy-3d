// ===== 機種: 550クラス(既定) / PD6B-CAT3 / DJI Mavic 4 Pro / DJI Matrice 4 シリーズ / DJI Mini 5 Pro / WingtraRAY =====
// 機種は URL の ?model= で選ぶ（Artifact の枠内などでURLを書き換えられないときは sessionStorage を使う）。
// 切り替えはページを読み込み直す。部品・材質・カメラ・物理をまるごと作り直すほうが、実行中に差し替えるより確実なため。
const MODELS = ['q550', 'pd6b', 'mavic4', 'matrice4', 'mini5', 'wingtra'];
const MODEL = (() => {
  try { const q = new URLSearchParams(location.search).get('model'); if (q) return MODELS.includes(q) ? q : 'q550'; } catch (e) {}
  try { const s = sessionStorage.getItem('drone3d.model'); if (MODELS.includes(s)) return s; } catch (e) {}
  return 'q550';
})();
const IS_PD6B = MODEL === 'pd6b', IS_MAVIC = MODEL === 'mavic4', IS_M4 = MODEL === 'matrice4', IS_MINI5 = MODEL === 'mini5', IS_WT = MODEL === 'wingtra', IS_ALT = MODEL !== 'q550';
const MODEL_NAME = { q550: '550クラス', pd6b: 'PD6B-CAT3', mavic4: 'Mavic 4 Pro', matrice4: 'Matrice 4', mini5: 'Mini 5 Pro', wingtra: 'WingtraRAY' };
const MODEL_FULL = { q550: '550クラス クアッドコプター', pd6b: 'PD6B-CAT3（プロドローン）', mavic4: 'DJI Mavic 4 Pro', matrice4: 'DJI Matrice 4 シリーズ', mini5: 'DJI Mini 5 Pro', wingtra: 'Wingtra WingtraRAY' };
