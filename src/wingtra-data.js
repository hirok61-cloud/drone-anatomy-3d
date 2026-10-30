// ===== Wingtra WingtraRAY のデータ（機種の判定は model.js） =====
// 実寸(m)で作り、縮尺 WT_K で縮める（尾で立つと全高が約0.72mあり、ほかの機種と同じ画に収めるため）。
// 形は取扱説明書 V1.0 の寸法図と公式写真から（docs/reference/2026-10-30-wingtraray-shape.md）。事実は docs/reference/2026-10-30-wingtraray-facts.md。
const WT_K = 0.4;
const WT_DATE = '2026年10月時点';
const WT_SRC = {
  spec: { name: 'WingtraRAY 技術仕様書（2026年2月 v2.7・販売店の配布版）', url: 'https://sitech-im.com/wp-content/uploads/2026/07/WingtraRAY-Technical-Specifications-with-SITECH-Intermountain.pdf' },
  manual: { name: 'WingtraRAY User Manual V1.0（2026年8月20日）', url: 'https://knowledge.wingtra.com/en/wingtraray-user-manual' },
  start: { name: 'Wingtra ナレッジベース「Getting started with WingtraRAY」', url: 'https://knowledge.wingtra.com/en/getting-started-with-wingtraray' },
  product: { name: 'Wingtra 公式 WingtraRAY 製品ページ', url: 'https://wingtra.com/ray/' },
  radar: { name: 'Wingtra ナレッジベース「Obstacle avoidance」', url: 'https://knowledge.wingtra.com/en/obstacle-avoidance-faqs' },
  chute: { name: 'Wingtra ナレッジベース「Wingtra Parachute Guide」', url: 'https://knowledge.wingtra.com/en/parachute-safety-guide' },
  trans: { name: 'Wingtra ナレッジベース「How the transition height affects the flight time」（前の機種のアプリ WingtraPilot での計画の記事）', url: 'https://knowledge.wingtra.com/en/how-transition-height-impacts-flight-time' },
  drive: { name: 'Wingtra ナレッジベース「WingtraRAY Drivetrain Replacement」', url: 'https://knowledge.wingtra.com/en/wingtraray-drivetrain-replacement' },
  gen2: { name: 'Wingtra 公式 WingtraOne GEN II 製品ページ', url: 'https://wingtra.com/wingtraone-gen-ii-drone/' },
  kyosoku: { name: '国土交通省「無人航空機の飛行の安全に関する教則」第5版（令和8年7月7日公布）', url: 'https://www.mlit.go.jp/common/002010810.pdf' },
  certList: { name: '国土交通省「型式認証を取得している無人航空機一覧」（令和8年6月19日現在）', url: 'https://www.mlit.go.jp/koku/content/002008366.pdf' },
  ridList: { name: '国土交通省「適合しているとして届出があったリモートID機器等の一覧」', url: 'https://www.mlit.go.jp/koku/content/001484158.pdf' },
  regYoryo: { name: '国土交通省「無人航空機登録要領」', url: 'https://www.mlit.go.jp/koku/content/001442849.pdf' },
  ana: { name: 'AeroTime「ANA Holdings and Wingtra partner to deploy advanced drone services in Japan」（報道）', url: 'https://www.aerotime.aero/articles/ana-holdings-and-wingtra-partner-to-deploy-advanced-drone-services-in-japan/amp' },
};
// 「公式」=Wingtraの仕様書・製品ページ・ナレッジベース、「取説」=ユーザーマニュアル、「図」=取説の図からの読み取り、「写真」=公式写真からの読み取り、「推定」=それ以外
const WT_PARTS = {
  body: {
    name: '胴体（主翼と一体）', en: 'Fuselage (blended wing body)', group: 'frame', count: 1,
    role: '電池・電装・カメラを収める真ん中の胴。主翼と継ぎ目なくつながった一体の部品で、背中が盛り上がり、腹は平ら（写真）。前に電池室、腹の前寄りにカメラ（ペイロード）、腹の後ろ寄りにパラシュート室がある（取説）。',
    structure: ['寸法図では胴の厚みは167 mm、機首から後端までは702 mm（取説の図）', '持つときは翼の前縁・モーターの取り付け部・後ろの板を持つ。操縦翼面はつかまない（取説）', '形は寸法図と公式写真から起こした。内部の配置は例'],
    spec: [['最大離陸重量', '5.2 kg（公式）'], ['翼幅', '125 cm（公式。寸法図では1242 mm）'], ['機体寸法', '125 × 68 × 12 cm（尾翼〈立てるときの脚〉を除く・仕様書）'], ['防じん防水', 'IP53（公式）'], ['動作環境温度', '−10〜40 ℃（公式）']],
    check: ['ひび・割れ・へこみ', '電池室・ペイロード・パラシュート室のふたの閉まり'],
    tip: '仕様書の「125 × 68 × 12 cm」は、前の機種 WingtraOne GEN II の公表値と同じ数字。寸法図の前後702 mm・厚み167 mmとは合わない（調べた範囲では理由は不明）。',
  },
  wing: {
    name: '主翼', en: 'Wing', group: 'frame', count: 1,
    role: '巡航中に機体の重さを支える翼。翼が揚力で重さを支えるので、プロペラは空気の抵抗に打ち勝つぶんだけ推力を出せばよく、少ない電気で長く飛べる。前縁はほぼまっすぐで、後縁は外側で丸く前へ回り込む（写真）。',
    structure: ['水平の尾翼の無い「全翼機」に近い形（背中に縦の尾翼が1枚）', '右翼の上面に「RAY」、左翼に「wingtra」の文字（写真）', '翼の端は下へ曲がってウイングレットにつながる（写真）'],
    spec: [['翼幅', '125 cm（公式）'], ['巡航速度', '16〜22 m/s で自動調整（公式）。多くの場合 19 m/s（取説）'], ['巡航の上昇・下降', '8 / 8 m/s（公式）'], ['最大バンク角', '55°（取説）']],
    check: ['前縁の傷・へこみ', '表面の割れ'],
    tip: '揚力は速さの2乗に比例する。遷移で速くなるにつれて、重さを支える役がプロペラから翼へ移っていく。',
  },
  noseCone: {
    name: 'ノーズコーン', en: 'Nose cone', group: 'frame', count: 1,
    role: '機首の濃い灰のカバー。電池室と機体のSDカードスロットを覆い、磁石で付く（取説・ナレッジベース）。前向きのレーダーはこの先に入っている（ナレッジベース）。',
    structure: ['工具なしで外れる（磁石・ナレッジベース）', 'ノーズコーンを付けずに飛んではいけない（取説）', '日差しの強い日は電池の日よけにもなる（ナレッジベース）'],
    spec: [['重さ', '59 ± 3 g（取説）']],
    check: ['しっかり付いているか', 'ひび・傷（中にレーダーがある）'],
  },
  tailFin: {
    name: '尾翼（立てるときの脚を兼ねる）', en: 'Tail fin (landing fin)', group: 'gear', count: 1,
    role: '背中の後ろに立つ1枚の板。飛行中は安定のための尾翼、地上では着陸して立つための支えになる（取説）。',
    structure: ['下から上へ滑らせて「カチッ」と鳴るまで差し込む。工具はいらない（ナレッジベース）', 'ハードケースに入れるときは外す（ナレッジベース）', '動く舵ではない（取説の「動く操縦翼面は2枚」からの読み取り）'],
    spec: [['重さ', '92 ± 5 g（取説）'], ['寸法図', '尾翼の先から脚の先まで 622 mm（取説の図）']],
    check: ['確実に差し込まれているか', '先の欠け'],
  },
  winglet: {
    name: 'ウイングレット', en: 'Winglets (landing gear)', group: 'gear', count: 2,
    role: '翼の端から下へ曲がる板。取説の部品名は「着陸脚を一体化したウイングレット」で、先の黒い棒が着陸の脚になる（取説）。',
    structure: ['翼に対して直角を保ちながら滑らせて差し込む（ナレッジベース）', 'ソフトバッグに入れるときは外す（ナレッジベース）'],
    spec: [['重さ', '左右1組で 152 ± 8 g（取説）']],
    check: ['差し込みのガタ', '割れ'],
  },
  landingRod: {
    name: '脚の棒', en: 'Landing rods', group: 'gear', count: 2,
    role: 'ウイングレットの下の端から後ろ下へ伸びる黒い棒。尾で立つときの接地点になる（寸法図・写真）。',
    structure: ['寸法図の横から見た図で、翼に対して後ろ下へ約23°（図からの読み取り）', '立つときは左右の棒の先と尾（バンパー・尾翼の先）で支える（寸法図からの推定）'],
    check: ['曲がり・割れ', '先のすり減り'],
    tip: '強い風と凸凹の地面では倒れることがある。ふつうは擦り傷程度で、機体の頑丈さは損なわれない（公式）。',
  },
  tailBumper: { name: '尾部バンパー', en: 'Tail bumper', group: 'gear', count: 1, role: '胴の後ろの端の濃い灰のキャップ。尾から着地するときの衝撃をやわらげる（取説）。', check: ['割れ・すり減り'] },
  elevon: {
    name: '操縦翼面（エレボン）', en: 'Control surfaces (elevons)', group: 'ctrl', count: 2,
    role: '翼の後ろの左右2枚の動く板。サーボで動かす（取説）。巡航中は、2枚を同じ向きに動かして機首を上げ下げし、逆向きに動かして左右に傾く（全翼機の一般的な動かし方・推定）。ホバー中は、プロペラの風を曲げて姿勢を変える（推定）。',
    structure: ['左右1枚ずつ、計2枚（取説）', 'Wingtraの資料では「control surfaces」「Flaps」と呼ぶ。「エレボン」は昇降舵と補助翼を兼ねる舵の一般名', '上面の後ろ半分が濃い灰（写真）', 'ヒンジの線は後退のない直線（写真）'],
    check: ['ヒンジやすき間に挟まった草・ごみ（着陸で挟まることがある・取説）', '離陸前の自動チェックで舵の動きと力を確かめる（取説）', '持つときに操縦翼面をつかまない（取説）'],
    tip: '巡航の舵とホバーの舵が同じ2枚。どちらの向きで飛んでいても、2枚の動かし方の組み合わせで姿勢を作る。',
  },
  servo: {
    name: 'サーボ', en: 'Servos', group: 'ctrl', count: 2,
    role: '操縦翼面を動かす小さなモーター（取説「サーボで動かす操縦翼面」）。フライトコントローラーが決めた角度まで舵を動かす。',
    structure: ['地上でサーボに異常な負荷がかかっていないかも見張る（取説）', '巡航中にサーボが1つ故障すると、その場で戻りの遷移をして、すぐ着陸する（取説）', 'この図の位置とリンクの形は例'],
    check: ['離陸前の自動チェック'],
  },
  motor: {
    name: 'ブラシレスモーター', en: 'Brushless motor', group: 'prop', count: 2,
    role: 'プロペラを回すモーター。ホバーでは2基で機体の重さを持ち上げ、巡航では空気の抵抗に打ち勝つ推力を出す。',
    structure: ['左右2基。左右で回る向きが逆（取説）', 'モーターの色の帯: 左が赤・右が緑（ナレッジベース「WingtraRAY Drivetrain Replacement」）', 'モーター・プロペラ・基板が「ドライブトレイン」として一式で交換される（取説の予備部品）', '図の歯と磁石の数は550クラスと同じで簡略化'],
    spec: [['最大回転数', '8500 rpm（取説）'], ['型番・出力', '公式資料に記載なし']],
    check: ['異音・引っかかり', '離陸の前に各モーターを短く2回ずつ回して自動で確かめる（取説）'],
  },
  bell: { name: 'ベル（ローター）', en: 'Bell (rotor)', group: 'prop', count: 2, role: '磁石を内側に貼った回る缶。前にプロペラが付く。', check: ['打痕', '砂の噛み込み'] },
  stator: { name: 'ステーター（固定子）', en: 'Stator', group: 'prop', count: 2, role: '回らない鉄心。巻線に電流を流して磁界を作る。', check: ['（分解しない）異音で気づく'] },
  winding: { name: '巻線', en: 'Windings', group: 'prop', count: 2, role: 'ステーターの歯に巻いた銅線。ESCが順番に電流を流して回転磁界を作る。', check: ['焦げ臭さ'] },
  magnet: { name: '永久磁石', en: 'Magnets', group: 'prop', count: 2, role: 'ベルの内側に並ぶN極とS極の磁石。', check: ['（分解しない）'] },
  shaft: { name: 'シャフトとベアリング', en: 'Shaft & bearings', group: 'prop', count: 2, role: 'ベルの回転を支える軸と軸受け。', check: ['ガタ・ゴリ感'] },
  motorBase: { name: 'モーターベース', en: 'Motor base', group: 'prop', count: 2, role: 'ステーターを支え、ゴンドラに固定する土台。', check: ['固定のゆるみ'] },
  prop: {
    name: 'プロペラ', en: 'Propellers', group: 'prop', count: 2,
    role: '2枚羽根の固定のプロペラ。翼の前縁より前にあり、機体を引っ張る（寸法図・写真）。トルクスT10のねじ2本で留める（取説）。',
    structure: ['左右で回る向きが違う専用品。ハブの色をモーターの帯の色（赤・緑）に合わせて付ける（取説・ナレッジベース）', '取説の本文は「pusher（押す形）」と書くが、図と写真では翼の前で引っ張る形', '標準品は標高2500 mまで。高い所用の灰色のプロペラもある（取説・ナレッジベース）'],
    spec: [['直径', '355 mm（取説の図）'], ['表示', '14 × 10（取説の写真の刻印・インチ）'], ['回転方向', '左右で逆（取説）。どちらが時計回りかは記載なし（図の向きは推定）']],
    check: ['欠け・ひび', '色の組み合わせ', 'ねじのゆるみ'],
  },
  nacelle: { name: 'モーターゴンドラ', en: 'Motor nacelle', group: 'prop', count: 2, role: '翼の前縁から前へ突き出て、モーターを支える筒（写真）。下面は濃い灰、上面は後ろへ細るふくらみ。', structure: ['モーターの軸は機体の中心から 315 mm（取説の図）', 'モーターの取り付け部は持ってよい場所（取説）'], check: ['ひび', 'モーターの固定'] },
  esc: { name: 'ESC（電子速度制御器）', en: 'ESC', group: 'elec', count: 2, role: '電池の直流をモーターを回す三相の電流に変え、回転数を決める。', structure: ['予備部品のドライブトレインの写真で、モーターに基板が付いている（取説）', 'この図はゴンドラの中に置いた例'], check: ['（分解しない）'] },
  battery: {
    name: 'フライトバッテリー', en: 'Flight batteries', group: 'elec', count: 2,
    role: '機首の電池室に2個並べて前から差し込み、間の十字のつまみを直角に回して留める（取説）。2個1組で使い、1個が壊れても残りの1個で安全に着陸できる設計（取説・製品ページ）。',
    structure: ['取っ手を内側に向けて差し込む。コネクタには差し込むだけでつながる（取説）', '前の面に残量LED、「1234A」「1234B」のような組の刻印（ナレッジベース）', '機体に入れたまま置いておくと過放電する（ナレッジベース）'],
    spec: [['型番', 'WRB01（公式）'], ['容量', '99 Wh（公式）'], ['電圧・構成', '公称 30.8 V・8セル直列（公式）'], ['大きさ・重さ', '108 × 69 × 55 mm・525 g（公式）'], ['充電', '1組 約1時間（公式）'], ['離陸できる電池の温度', '10〜45 ℃（範囲外は離陸できない・公式）']],
    check: ['膨らみ・傷', '2個の組の刻印がそろっているか', 'つまみが回りきっているか'],
    tip: '仕様書は「リチウムポリマー」、取説とナレッジベースは「Li-Ion」と書いている（資料の食い違い）。',
  },
  cells: { name: 'セル', en: 'Cells', group: 'elec', count: 2, role: '電池の中身。8セルを直列につないで公称 30.8 V（公式）。', check: ['（分解しない）外装の膨らみで異常に気づく'] },
  batteryLatch: { name: '電池のつまみ（ラッチ）', en: 'Battery latch', group: 'elec', count: 1, role: '2個の電池の間の十字のつまみ。押し下げて直角に回すと電池が留まる（ナレッジベース）。', check: ['回しきっているか'] },
  powerButton: { name: '電源ボタンとLEDリング', en: 'Power button & LED ring', group: 'elec', count: 1, role: '電池室の中央のボタン。押すと周りのLEDリングが光り、長押しで電源が入る（起動音・ナレッジベース）。電源はノーズコーンを外してから入れ・切りする（取説）。この図の位置は取説の図と写真から。', check: ['飛行の後、アプリが「電源を切ってよい」と出してから切る（取説）'] },
  fc: {
    name: 'フライトコントローラー', en: 'Flight controller', group: 'elec', count: 1,
    role: '機体の頭脳。ホバー・遷移・巡航を自動で切り替え、2基のモーターと2枚の操縦翼面を同時に動かして姿勢を保つ。遷移はいつも自動（取説）。',
    structure: ['電池・IMU・GNSS・気圧計は、1つが故障しても続けられるよう予備を持つ冗長な構成（取説）', 'この図の位置は例'],
    spec: [['着陸精度', '2 m 未満（公式）'], ['ホバーの上昇・下降', '6 / 2.5 m/s（公式）']],
    check: ['離陸前の自動チェック（地形との離隔・ジオゾーン・通信・電池・水平・GNSS・ペイロード・SDカード・リモートID・舵面など。取説）'],
  },
  gnss: {
    name: 'GNSS（PPK）', en: 'GNSS (PPK)', group: 'nav', count: 1,
    role: '衛星の電波で位置を求める。全機に高精度のGNSSボードとアンテナがあり、飛んだ後の計算（PPK）で写真の位置をcm単位に補正する（公式）。',
    structure: ['GPS（L1・L2）・GLONASS（L1・L2）・Galileo（L1）・BeiDou（L1）を使い、冗長な構成（公式）', 'アンテナの位置は公表されていない。図は背中の黒い円盤をアンテナと見た推定'],
    spec: [['絶対精度', '3 cm（PPK・公式）']],
    check: ['離陸前の自動チェック'],
    tip: 'GNSSが使えなくなると、内蔵の航法装置だけで約25秒、離陸地点の方へ飛び、それでも位置がわからなければその場でホバーに戻って着陸する（取説）。',
  },
  radar: {
    name: '前向きレーダー', en: 'Forward radar', group: 'nav', count: 1,
    role: 'ノーズコーンの先に入っている（ナレッジベース）。巡航中に、前の建物・クレーン・塔・岩壁など止まっている障害物を見つけると、避けて離陸地点へ戻る（仕様書）。',
    structure: ['ホバー中は空を向くので働かない（巡航中だけ・ナレッジベース）', '木や細い電線は見つけにくい（仕様書）', 'ベータ版の機能（ナレッジベース）'],
    spec: [['周波数', '60〜64 GHz（仕様書。取説は 60〜60.25 GHz）'], ['検知距離', '100 m（仕様書）'], ['更新', '30 Hz・仮想アンテナ12（仕様書）']],
    check: ['ノーズコーンの汚れ・傷'],
  },
  distSensor: { name: '尾の距離センサー', en: 'Tail distance sensor', group: 'nav', count: 1, role: '尾の後ろの端の小さなセンサー。尾から着地するとき、地面までの距離を測って着地をなめらかにする（取説・リリースノート）。', structure: ['取説の各部名称の「Distance sensor」「Tail distance sensor」', '図の大きさと形は例'], check: ['窓の汚れ'] },
  telemetry: {
    name: 'テレメトリーのアンテナ', en: 'Telemetry antennas', group: 'nav', count: 1,
    role: 'タブレットにつないだテレメトリーモジュールと、2.4 GHzで直接やりとりする（公式）。アンテナは主翼の中にある（取説の予備部品の説明）。',
    structure: ['周波数をとびとびに変える方式（FHSS）・見通しで最大 10 km（公式）', 'LTEの回線の部品も載っているが、取説 V1.0 の時点では使えない（取説）', '図の位置は例'],
    spec: [['周波数', '2.4016〜2.4776 GHz（公式）'], ['出力', '19.8 dBm EIRP（仕様書）']],
    check: ['通信の状態（離陸前の自動チェック）'],
  },
  remoteId: { name: 'リモートID', en: 'Remote ID', group: 'nav', count: 1, role: '機体の番号・位置・高さ・速さなどを電波で発信する。Wi-Fi Beacon（2.4 GHz）で送る（取説）。', structure: ['図の位置は例'], check: ['飛行前に作動を確かめる'] },
  payload: {
    name: 'ペイロード（カメラ・図は MAP61）', en: 'Payload (camera)', group: 'payload', count: 1,
    role: '腹の前寄りに工具なしで付け替えるカメラなどの機材。機体の中に収まる（公式。一部のペイロードはレンズがカバーから突き出る・取説）。巡航中は地面を真下へ撮る（MAP61 だけは前へ15°傾けて撮る・公式）。',
    structure: ['6種類: MAP61・SURVEY61・INSPECT・SURVEY24（カラー）、RedEdge-P（マルチスペクトル）、LIDAR（仕様書）', '前の端のつまみで留める（仕様書は「twist-lock」）', '機体から最大 80 W の電源をもらう（公式）'],
    spec: [['MAP61', '6100万画素フルサイズ・17 mm・横93°×縦70°（公式）'], ['高度120 mの地上画素寸法', '2.7 cm/px（MAP61・公式）'], ['1回の飛行で撮れる広さ', '550 ha（MAP61・高度120 m・公式）']],
    check: ['確実に留まっているか', 'レンズの汚れ', 'カメラのSDカード'],
  },
  camLens: { name: 'カメラの窓', en: 'Camera window', group: 'payload', count: 1, role: '腹のプレートの丸い窓。ここから地面を撮る。', check: ['汚れ・傷'] },
  parachute: {
    name: 'パラシュート（オプション）', en: 'Parachute (add-on)', group: 'safety', count: 1,
    role: '腹の後ろ寄りの専用の室に入れる追加の装備（取説）。電源の喪失や制御の喪失などで自動で開き、手動でも開ける。開くときは機体の電源を切り、ふたと傘をバネで押し出す（取説）。',
    structure: ['重さ250 g。付けても外形は変わらない（取説）', 'ふたに赤い警告の三角（取説）', '3年ごと、または一度開いたら点検と詰め直し（公式）', '米国の人の上を飛ぶ区分（Cat.3）や欧州 C6 の運用で必要（取説）'],
    spec: [['最低展開高度', '45 m（公式）'], ['降下速度', '平均 4 m/s（公式）'], ['重さ', '250 g（取説）']],
    check: ['点検の期限', '手動トリガー装置の電池と無線'],
  },
  regMark: { name: '登録記号', en: 'Registration mark', group: 'safety', count: 1, role: '国に登録した機体の番号。100g以上の機体は登録が必要で、25kg未満は文字の高さ3mm以上で表示する。', structure: ['この図の番号と位置は例'], check: ['はがれ・かすれ'] },
};
const WT_LIST_ORDER = ['body', 'wing', 'noseCone', 'tailFin', 'winglet', 'landingRod', 'tailBumper', 'elevon', 'servo', 'motor', 'bell', 'stator', 'winding', 'magnet', 'shaft', 'motorBase', 'prop', 'nacelle', 'esc',
  'battery', 'cells', 'batteryLatch', 'powerButton', 'fc', 'gnss', 'radar', 'distSensor', 'telemetry', 'remoteId', 'payload', 'camLens', 'parachute', 'regMark'];
const WT_SUB = { bell: 'motor', stator: 'motor', winding: 'motor', magnet: 'motor', shaft: 'motor', motorBase: 'motor', cells: 'battery', camLens: 'payload' };
const WT_PER_MOTOR = ['motor', 'prop', 'bell', 'stator', 'winding', 'magnet', 'shaft', 'motorBase', 'nacelle', 'esc'];
// モーターの並び。前（機首の側）から見た回転方向は羽根の形からの推定（公式は「左右で逆」とだけ記載）
const WT_MOTOR_INFO = [{ id: 'M1', pos: '右', dir: 'CCW' }, { id: 'M2', pos: '左', dir: 'CW' }];
// 「とばす」の飛行の原理は、尾で立ったままのホバー。舵の分担は一般的な「モーター2基＋舵面2枚」のテールシッターの原理からの推定
const WT_FLIGHT = {
  hover: { name: 'ホバリング', mult: [1, 1],
    note: '機首を真上に向け、2つのプロペラの推力の合計で重さを支える。翼は立っているので揚力はほとんど出ない。2つは逆向きに回り、回転の反動を打ち消し合う。' },
  climb: { name: '上昇', mult: [1.25, 1.25],
    note: '2つとも速くする。ホバーでの上昇は最大 6 m/s、下降は最大 2.5 m/s（公式）。' },
  pitch: { name: '前進（腹の向きへ）', mult: [1, 1],
    note: 'プロペラの風が当たっている2枚の操縦翼面を同じ向きに動かすと、風の曲がる向きの反対へ尾が押され、機体が腹（カメラの側）へ傾いてそちらへ進む。2基のモーターの回転差では、この向きには傾けられない（舵の分担は一般的なテールシッターの原理からの推定）。' },
  roll: { name: '右へ移動', mult: [0.88, 1.12],
    note: '左のモーター（M2）を速く、右（M1）を遅くすると、機体が右へ傾いて右へ進む（推定）。' },
  yaw: { name: '右旋回', mult: [1, 1],
    note: '2枚の操縦翼面を逆向きに動かすと、プロペラの風の曲がり方が左右で逆になり、機体が縦の軸のまわりに回る。モーターの回転差を使うと横に傾いてしまうので、この向きは舵で回す（推定）。' },
};
const WT_SIMPLE = {
  prop:   { role: '回って空気を後ろへ送り、機体を引っ張ります。浮くときは真上へ、飛ぶときは前へ。', analogy: '昔の飛行機の先頭で回るプロペラ' },
  wing:   { role: '速く飛ぶと、翼が機体を持ち上げます。だから長く飛べます。', analogy: '紙飛行機の翼' },
  elevon: { role: '翼の後ろの動く板。曲げると機体の向きが変わります。', analogy: '船のかじ' },
  battery: { role: '電気のもと。2個で1組です。', analogy: 'スマホの電池を、もっと強くしたもの' },
  fc:     { role: '機体の頭脳。浮く・飛ぶを自分で切り替えます。', analogy: '自転車に乗るときの「小脳」' },
  tailFin: { role: '立つときの足と、まっすぐ飛ぶための板です。', analogy: '矢の羽根' },
  payload: { role: '地面を撮るカメラ。前へ飛ぶとき、ほぼ真下を向きます。', analogy: '空飛ぶ地図づくりのカメラ' },
  radar:  { role: '前の障害物を見つける目。前へ進んで飛んでいる間だけ働きます。', analogy: '車の自動ブレーキのレーダー' },
};
const WT_SIMPLE_NAME = { prop: 'プロペラ', wing: 'つばさ', elevon: 'うごく板（舵）', battery: 'バッテリー', fc: '頭脳（FC）', tailFin: '尾翼', payload: 'カメラ', radar: 'レーダー' };
const WT_TRIVIA = {
  body: '置くときは尾を下にして立て、風と平行にし、周りに2 m以上の空きをとる（取説）。',
  wing: 'ホバー中の電池の減りは巡航の6〜7倍速い（ナレッジベース。前の機種のアプリ向けの記事）。だから遷移の高さは「障害物より20 m上」を守りつつ、高すぎないほうがよい。',
  elevon: 'ホバー中は機首が空を向いているので、アプリで「前」を押すと腹（カメラ）の方へ動く（取説）。',
  battery: '電池は2個で1組。1個が壊れても、残りの1個で安全に着陸できる（取説）。',
  radar: 'レーダーは鼻先にあるので、ホバー中は空を向いてしまい働かない（ナレッジベース）。',
  prop: '片方のモーターの帯は赤、もう片方は緑。プロペラのハブの色を合わせて付ける（取説・ナレッジベース）。',
  parachute: 'パラシュートは開くまでに高さが要る。最低展開高度は45 mなので、パラシュート付きでは計画の最低の高さも45 mになる（取説）。',
  tailFin: '尾翼は、飛行中は機体を安定させる板、地上では立つための脚を兼ねる（取説）。',
  landingRod: '地上の風が5〜8 m/sだと着陸で倒れることがあり、8 m/sを超えると飛ばないよう勧めている（公式）。',
  payload: 'MAP61 で高度120 m なら、1回の飛行で550 ha を撮れる（公式）。東京ドーム約118個分（計算）。',
};
const WT_TRIVIA_ACT = { wing: { alt: 'flight' }, tailFin: { alt: 'flight' }, elevon: { alt: 'elevon' }, battery: { alt: 'battery' }, noseCone: { alt: 'battery' }, payload: { alt: 'payload' }, parachute: { alt: 'chute' }, radar: { alt: 'radar' } };
// 制度の注記（判定はせず「求められている」「確認できなかった」で止める。公開されている資料だけ）
const WT_REG = {
  body: [
    { text: '登録の重さ（機体本体とバッテリーの合計）は100 g以上なので、国の登録が必要。登録要領は機体の「種類」を飛行機・回転翼航空機などから選ぶとしているが、垂直離着陸ができる固定翼の機体をどれで登録するかを書いた公開資料は、調べた範囲では見つからなかった。', ky: '3.1', src: 'wtReg' },
    { text: '教則（第5版）は、技能証明の種類の限定について、「パワードリフト機」の飛行には回転翼航空機（マルチローター）と飛行機の両方の種類の限定に係る資格が必要としている（3.1）。パワードリフト機は、回転翼航空機のように垂直に離着陸でき、巡航中は飛行機のように前へ飛ぶ機体と説明されている（4.1）。WingtraRAY がパワードリフト機に当たるかを国が示した公開資料は、調べた範囲では確認できなかった。', ky: '3.1', src: 'wtKyosoku' },
    { text: 'WingtraRAY は、令和8年6月19日現在の型式認証の一覧に載っていない。', ky: '3.1', src: 'wtCert' },
    { text: '2026年3月に ANAホールディングスとウイングトラが、日本での測量・点検のサービスを検討する覚書を結び、国内の販売代理店契約や型式認証の取得支援を協議・検討していると報じられた（報道）。', ky: '3.1', src: 'wtAna' },
  ],
  fc: [{ text: '取説は、昼間だけ飛ばす設計で灯火を持たないとしている。夜間の飛行はできない（取説）。', ky: '3.1', src: 'wtManual' }],
  remoteId: [{ text: 'WingtraRAY は、国土交通省の「届出があったリモートID機器等の一覧」（令和8年7月8日更新）に載っていない。取説はリモートIDを日本での飛行にも必要なものとして挙げ、Wi-Fi Beacon で発信するとしている。', ky: '3.1', src: 'wtRid' }],
  telemetry: [
    { text: '2.4 GHz帯の無線を免許なしで使うには、技適を受けた機器であることが必要（教則）。取説に載る認証の番号は米国（FCC）とカナダ（IC）のもので、日本の技適の有無は確認できなかった。', ky: '3.2', src: 'wtKyosoku' },
    { text: '携帯電話（LTE）を機体に載せて上空で使うには、携帯電話の事業者の上空用のプランなどの手続きが要る（教則）。WingtraRAY のLTEの回線は、取説 V1.0 の時点では使えない。', ky: '3.2', src: 'wtKyosoku' },
  ],
  radar: [{ text: '60 GHz帯のレーダーについて、Wingtra は「レーダーの使用が許される国で有効」とし、日本での扱いは書いていない（ナレッジベース）。日本で使えるかは確認できなかった。', ky: '3.2', src: 'wtRadar' }],
  parachute: [{ text: 'パラシュートの手動トリガー装置は国ごとに周波数の設定が違い、使えない国もある（ナレッジベース）。日本で使う周波数は確認できなかった。', ky: '3.2', src: 'wtChute' }],
  payload: [{ text: '撮影した映像をインターネットで公開するときは、人の顔や表札、車のナンバーなどが写り込まないよう配慮することが求められる。写り込んだときはぼかしなどを入れる（総務省のガイドライン）。', ky: '3.2', src: 'soumuPriv' }],
};
const WT_KY_PART = { body: '4.1', wing: '4.1', noseCone: '4.1', tailFin: '4.1', winglet: '4.1', landingRod: '4.1', tailBumper: '4.1', elevon: '4.1', servo: '4.4', motor: '4.4', bell: '4.4', stator: '4.4', winding: '4.4', magnet: '4.4',
  shaft: '4.6', motorBase: '4.1', prop: '4.4', nacelle: '4.1', esc: '4.4', battery: '4.4', cells: '4.4', batteryLatch: '4.6', powerButton: '4.4', fc: '4.4', gnss: '4.5', radar: '4.5', distSensor: '4.5', telemetry: '4.5',
  remoteId: '3.1', payload: '4.4', camLens: '4.4', parachute: '4.4', regMark: '3.1' };

if (IS_WT) {
  const swap = (obj, next) => { for (const k of Object.keys(obj)) delete obj[k]; Object.assign(obj, next); };
  swap(PARTS, WT_PARTS);
  GROUPS.splice(GROUPS.findIndex(g => g.id === 'prop'), 0, { id: 'ctrl', name: '操縦翼面', color: '#d4a017' });
  GROUPS.splice(GROUPS.findIndex(g => g.id === 'payload'), 0, { id: 'safety', name: '安全・表示', color: '#e5484d' });
  swap(SIMPLE, WT_SIMPLE); SIMPLE_KEYS.splice(0, SIMPLE_KEYS.length, ...Object.keys(WT_SIMPLE));
  swap(SIMPLE_NAME, WT_SIMPLE_NAME);
  swap(TRIVIA, WT_TRIVIA); swap(TRIVIA_ACT, WT_TRIVIA_ACT);
  MOTOR_INFO.splice(0, MOTOR_INFO.length, ...WT_MOTOR_INFO);
  swap(FLIGHT, WT_FLIGHT);
  { const keep = {}; for (const k of ['regMark', 'remoteId']) if (REG[k]) keep[k] = REG[k]; const reg = Object.assign(keep, WT_REG); reg.remoteId = [...(REG.remoteId || []), ...WT_REG.remoteId]; swap(REG, reg); }
  swap(KY_PART, WT_KY_PART);
  REG_SOURCES.wtReg = WT_SRC.regYoryo; REG_SOURCES.wtKyosoku = WT_SRC.kyosoku; REG_SOURCES.wtCert = WT_SRC.certList; REG_SOURCES.wtRid = WT_SRC.ridList; REG_SOURCES.wtAna = WT_SRC.ana;
  REG_SOURCES.wtManual = WT_SRC.manual; REG_SOURCES.wtRadar = WT_SRC.radar; REG_SOURCES.wtChute = WT_SRC.chute;
  for (const L of Object.values(I18N)) if (L && L.parts) for (const k of Object.keys(L.parts)) delete L.parts[k];
  Object.assign(FIND_ALIAS, { body: '胴体 ボディ 本体', wing: '翼 つばさ 主翼 揚力', elevon: 'エレボン 舵 フラップ 補助翼 昇降舵 操縦翼面', tailFin: '尾翼 フィン 脚 立てる', winglet: 'ウイングレット 翼端 脚', landingRod: '脚 棒 着陸',
    prop: '羽 はね ペラ', battery: '電池 バッテリ', noseCone: 'ノーズ 機首 カバー', payload: 'カメラ 測量 撮影 MAP61', parachute: 'パラシュート 落下傘', radar: 'レーダー 障害物', gnss: 'GPS GNSS PPK 衛星', fc: '頭脳 FC', distSensor: '距離 センサー 着陸' });
}
