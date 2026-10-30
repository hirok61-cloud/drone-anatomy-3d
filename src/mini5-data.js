// ===== DJI Mini 5 Pro のデータ（機種の判定は model.js） =====
// 実寸(m)で作り、縮尺は1。公式の3Dモデル・寸法図は公開されていないので、形は公式の製品写真・取扱説明書の図から読んだ値（docs/reference/2026-10-29-mini5pro-shape.md）。
const MN5_K = 1;
const MN5_DATE = '2026年10月時点';
const MN5_SRC = {
  product: { name: 'DJI 公式 Mini 5 Pro 製品ページ', url: 'https://www.dji.com/jp/mini-5-pro' },
  specs: { name: 'DJI 公式 Mini 5 Pro 仕様', url: 'https://www.dji.com/jp/mini-5-pro/specs' },
  faq: { name: 'DJI 公式 Mini 5 Pro よくある質問', url: 'https://www.dji.com/jp/mini-5-pro/faq' },
  manual: { name: 'DJI Mini 5 Pro ユーザーマニュアル v1.0（2025年9月）', url: 'https://dl.djicdn.com/downloads/DJI_Mini_5_Pro/UM/20251210/DJI_Mini_5_Pro_User_Manual_ja.pdf' },
  safety: { name: 'DJI Mini 5 Pro 安全ガイドライン（DJI RC-N3付属）', url: 'https://dl.djicdn.com/downloads/DJI_Mini_5_Pro/SG/2025/DJI_Mini_5_Pro_Safety_Guidelines_DJI_RC-N3_30lang.pdf' },
  store: { name: 'DJIストア「DJI Mini 5 Pro」', url: 'https://store.dji.com/jp/product/dji-mini-5-pro' },
  prop: { name: 'DJIストア「DJI Mini 5 Pro プロペラ」', url: 'https://store.dji.com/jp/product/dji-mini-5-pro-propellers' },
  ridList: { name: '国土交通省「適合しているとして届出があったリモートID機器等の一覧」', url: 'https://www.mlit.go.jp/koku/content/001484158.pdf' },
  certList: { name: '国土交通省「型式認証を取得している無人航空機一覧」（令和8年6月19日現在）', url: 'https://www.mlit.go.jp/koku/content/002008366.pdf' },
};
// 「公式」=DJIの仕様・製品ページ・FAQ、「取説」=ユーザーマニュアル、「図」=取説の図からの読み取り、「写真」=公式写真からの読み取り、「推定」=それ以外
const MN5_PARTS = {
  body: {
    name: '機体本体（胴体）', en: 'Airframe body', group: 'frame', count: 1,
    role: '電装とバッテリーを収める胴。真上から見ると前が広く、真ん中がくびれ、後ろがまた少し広い形（写真）。前の下にジンバル、前面と肩に魚眼のビジョンセンサー、前面に前向きLiDAR、後ろの上面に電源ボタンと残量LEDがある。',
    structure: ['前の肩が最も高く、上面は後ろへくさび形に下がる（写真）', '後ろの下半分にバッテリーが入る（取説の図）', '防水ではない（公式FAQ）', '形と寸法は公式写真と取説の図から読んだ推定。内部の配置は例'],
    spec: [['離陸重量', '249.9 g（±4 g・公式。Plus バッテリーでは249 gを超える・DJIストア）'], ['折りたたみ時', '157 × 95 × 68 mm（プロペラなし・公式）'], ['展開時', '304 × 380 × 91 mm（プロペラあり・公式）'], ['最大傾斜角度', '38°（公式）'], ['動作環境温度', '−10〜40 ℃（公式）']],
    check: ['外殻の割れ・変形', 'センサーの窓の汚れ・傷', '通気口をふさがない'],
    tip: '置いたときは前脚の先と電池の底の後ろ角で立ち、機首が少し上を向く（写真からの推定で約15°）。',
  },
  frontArm: {
    name: '前アーム', en: 'Front arm', group: 'frame', count: 2,
    role: '前の2つのモーターを支える腕。胴の前部の側面からほぼ水平に外へ伸び、先に脚（ランディングギア）が付く。畳むときは下へ振り下ろして後ろへ回し、胴の下の段で裏返しに収める（取説の図）。',
    structure: ['展開は後アーム → 前アームの順（取説の図）', '畳むとモーターが下・脚が上を向く（写真）', '左前アームの前側の面に「MINI 5 PRO」の文字（写真）'],
    check: ['展開しきっているか', 'ヒンジのガタ', 'ひび'],
  },
  rearArm: {
    name: '後アーム', en: 'Rear arm', group: 'frame', count: 2,
    role: '後ろの2つのモーターを支える腕。胴の後部の側面から斜め後ろへ伸び、後ろのモーターは前より高い位置で回る（写真からの推定で約15mm）。ほぼ垂直の軸で前へ回し、胴の上の段に沿わせて畳む。',
    structure: ['後方右アームを展開すると、初期設定で電源が入る（取説）', '後方右アームを折りたたむと、自動で電源オフのカウントダウンが始まる（取説）', '先のポッドの下に機体ステータスインジケーター（取説の図）', '後アームに脚はない（取説の図・写真）'],
    check: ['展開しきっているか', 'ヒンジのガタ', 'ひび'],
    tip: '開くと電源が入り、畳むと電源が切れる。準備と片付けがアームの開け閉めだけで済む。',
  },
  landingGear: {
    name: 'ランディングギア（アンテナ内蔵）', en: 'Landing gear (antennas)', group: 'gear', count: 2,
    role: '前アームの先から下へ伸びる板状の脚。中にアンテナを収めている（取説の部品名「ランディングギア（アンテナ内蔵）」）。',
    structure: ['前脚にアンテナが入る（取説）。映像伝送は O4+・アンテナ4本（2T4R・公式）', '先はL字の足（写真）'],
    spec: [['映像伝送', 'O4+（公式）'], ['最大伝送距離（日本）', '10 km（障害物・電波干渉なし・公式）'], ['ライブビュー', '1080p / 30fps・60fps（公式）']],
    check: ['ひび・欠け（中のアンテナを守っている）'],
    tip: '安全ガイドラインの日本語の仕様欄には「日本国内では、2.4GHz 帯のみ使用可能」とある。',
  },
  motor: {
    name: 'ブラシレスモーター', en: 'Brushless motor', group: 'prop', count: 4,
    role: 'プロペラを回すアウターローター式のモーター。対角の2基が同じ向きに回り、隣どうしは逆向きに回って回転の反動を打ち消す。',
    structure: ['外側の缶（ベル）ごと回るアウターローター', '図の歯と磁石の数は550クラスと同じ12N14Pで簡略化'],
    spec: [['型番・出力', '公式資料に記載なし'], ['回転方向', '公式資料に記載なし（図の向きは一般的な例）']],
    check: ['手で回して引っかかりがないか', '異音', '飛行後の温度'],
  },
  bell: { name: 'ベル（ローター）', en: 'Bell (rotor)', group: 'prop', count: 4, role: '磁石を内側に貼った回る缶。プロペラはこの上に取り付く。', check: ['打痕', '砂の噛み込み'] },
  stator: { name: 'ステーター（固定子）', en: 'Stator', group: 'prop', count: 4, role: '回らない鉄心。巻線に電流を流して磁界を作る。', check: ['（分解しない）異音で気づく'] },
  winding: { name: '巻線', en: 'Windings', group: 'prop', count: 4, role: 'ステーターの歯に巻いた銅線。ESCが順番に電流を流して回転磁界を作る。', check: ['焦げ臭さ'] },
  magnet: { name: '永久磁石', en: 'Magnets', group: 'prop', count: 4, role: 'ベルの内側に並ぶN極とS極の磁石。', check: ['（分解しない）'] },
  shaft: { name: 'シャフトとベアリング', en: 'Shaft & bearings', group: 'prop', count: 4, role: 'ベルの回転を支える軸と軸受け。', check: ['ガタ・ゴリ感'] },
  motorBase: { name: 'モーターベース', en: 'Motor base', group: 'prop', count: 4, role: 'ステーターを支え、アームに固定する土台。', check: ['固定のゆるみ'] },
  prop: {
    name: 'クイックリリースプロペラ', en: 'Quick-release propeller', group: 'prop', count: 4,
    role: '工具なしで付け外しできる2枚羽根のプロペラ。モーターの穴に脚を合わせて押し込み、ひねって固定する（取説の図）。羽根は根元で折れる。',
    structure: ['プロペラとモーターのカラーマークを合わせて取り付ける（取説）', 'A（オレンジの印）が右前と左後、B（グレー）が左前と右後（取説の図）', '畳むときは両手で2枚の中央を持ち、同時に内側へ押す（取説）'],
    spec: [['直径 × ピッチ', '6.0 × 2.8 インチ（DJIストア。直径は換算で約15.2 cm）'], ['重さ', '約 2.8 g / 枚（DJIストア）']],
    check: ['欠け・ひび・変形', 'カラーマークの組み合わせ', 'ロックがかかっているか'],
  },
  esc: { name: 'ESC（電子速度制御器）', en: 'ESC', group: 'elec', count: 1, role: 'バッテリーの直流を、モーターを回す三相の電流に変えて回転数を調整する。', structure: ['胴の中の基板（この図の位置は例）'], check: ['電源を入れたときの音'] },
  battery: {
    name: 'インテリジェントフライトバッテリー', en: 'Intelligent Flight Battery', group: 'elec', count: 1,
    role: '機体の電気のもと。胴の後ろの下半分に後ろから差し込み、左右のバックルで固定する（取説の図）。標準と、容量の大きい Plus の2種類がある。',
    structure: ['リチウムイオン（LiNiMnCoO2・公式）', 'カチッと音がするまで差し込む（取説）', 'Plus を付けると機体の重量は249 gを超える（DJIストア）'],
    spec: [['標準', '2788 mAh・7 V・19.52 Wh・約71.2 g・最大36分（公式）'], ['Plus', '4680 mAh・7.16 V・33.51 Wh・約117 g・最大52分（公式）'], ['充電（機体経由・65W）', '標準 約69分／Plus 約94分（公式）']],
    check: ['膨らみ・傷', 'バックルが左右とも固定されているか', '充電は 5〜40 ℃で（公式）'],
    tip: 'Plus は重さが標準の約1.6倍で、飛べる時間は36分から52分に延びる。代わりに機体は249 gを超える。',
  },
  cells: { name: 'セル', en: 'Cells', group: 'elec', count: 1, role: 'バッテリーの中身のリチウムイオンセル。セルの数と組み方は公式資料に記載なし（公称 7 V なので2直列と考えられる・推定）。', check: ['（分解しない）外装の膨らみで異常に気づく'] },
  batteryBuckle: { name: 'バッテリーバックル', en: 'Battery buckles', group: 'elec', count: 2, role: 'バッテリーの左右の側面にあるつまみ。両側を押しながら後ろへ引くと外れる（取説の図）。', check: ['左右ともしっかり固定されているか'] },
  batteryLed: { name: '電源ボタンとバッテリー残量LED', en: 'Power button & battery LEDs', group: 'elec', count: 1, role: '機体の後ろの上面のボタンと4つのLED（取説の図）。1回押すと残量を表示し、押してから長押しすると電源が入る・切れる（取説）。', check: ['飛行前に残量を確認'] },
  ports: { name: 'USB-C ポートと microSD スロット', en: 'USB-C & microSD', group: 'elec', count: 1, role: '機体の後ろの面の充電・データ転送の口と、記録用カードの差し込み口（取説の図）。本体内にも42 GBのストレージがある（公式）。', check: ['ふたの閉まり', 'USB-C使用中はアームを開いても電源が入らない（取説）'] },
  fc: {
    name: 'フライトコントローラー', en: 'Flight controller', group: 'elec', count: 1,
    role: '機体の頭脳。ジャイロ・加速度・GNSS・ビジョンの情報から姿勢と位置を計算し、4基のモーターの回転数を決める。',
    structure: ['胴の中（この図の位置は例）'],
    spec: [['ホバリング精度', '垂直 ±0.1 m・水平 ±0.3 m（ビジョン）／±0.5 m（衛星）（公式）'], ['最大水平速度', '18 m/s（標準・Sモード・無風・公式）']],
    check: ['起動時の自己診断（ステータスインジケーター）', 'コンパスの較正'],
  },
  gnss: { name: 'GNSS', en: 'GNSS', group: 'nav', count: 1, role: '衛星の電波から位置を求める。GPS・Galileo・BeiDou を使い、L1とL5の2つの周波数を受ける（公式）。', structure: ['胴の中（外からは見えない・写真。この図の位置は例）'], spec: [['衛星', 'GPS + Galileo + BeiDou（公式）']], check: ['離陸前に衛星をつかんでいるか'] },
  lidar: {
    name: '前向きLiDAR', en: 'Forward LiDAR', group: 'nav', count: 1,
    role: 'レーザーを当てて前方の物までの距離を測る。暗い夜でも前の障害物を測れる（公式）。',
    structure: ['前面の左右の魚眼の内側の黒い窓2つ（取説の図・写真）', 'クラス1レーザー製品の安全基準を満たす（取説）', '明るい光の下では正常に働かない（公式FAQ）'],
    spec: [['夜間の測定範囲', '0.5〜25 m（反射率10%超・公式）'], ['視野', '上下・左右とも 60°（公式）']],
    check: ['窓の汚れ・傷'],
  },
  vision: {
    name: '全方向ビジョンシステム', en: 'Omnidirectional vision', group: 'nav', count: 4,
    role: '魚眼のカメラで、前後左右と上の障害物までの距離を測る（公式）。ぶつかる前に止まったり避けたりする。',
    structure: ['前面の左右と、肩の左右（斜め上・横向き）の魚眼（取説の図・写真）', '公式は「前方と後方に魚眼レンズを搭載し、前後左右、上方を検知」', 'スポーツモードでは障害物回避が働かない（取説）'],
    spec: [['前方・後方', '0.5〜18 m（公式）'], ['側方', '0.5〜12 m（公式）'], ['上方', '0.5〜18 m（公式）'], ['視野（前後左右）', '水平90°・垂直72°（公式）']],
    check: ['窓の汚れ', '1ルクス以下の暗さや模様のない面は苦手（公式）'],
  },
  visionDown: { name: '下方ビジョンシステム', en: 'Downward vision', group: 'nav', count: 2, role: '底面の2つのカメラ。地面の模様を見て位置を保つ（取説）。', structure: ['位置の保持は高度 0.5〜30 m で最もよく働く（取説）'], spec: [['測定範囲', '0.3〜14 m・前後106°×左右90°（公式）']], check: ['窓の汚れ'] },
  ir3d: { name: '3D 赤外線検知システム', en: '3D infrared sensing', group: 'nav', count: 1, role: '機体の下で赤外線を使って地面までの距離を測る（公式）。', structure: ['底面の2つに仕切られた横長の窓（取説の図・写真）', 'クラス1レーザー製品の安全基準を満たす（取説）'], spec: [['測定範囲', '0.3〜8 m（反射率10%超・公式）']], check: ['窓の汚れ'] },
  auxLight: { name: '補助ライト', en: 'Auxiliary light', group: 'nav', count: 1, role: '底面のライト。暗い所で下方ビジョンを助ける。高さ5 m未満の暗い所で初期設定で自動で点く（取説）。', check: ['点灯するか'] },
  statusLed: { name: '機体ステータスインジケーター', en: 'Status indicators', group: 'nav', count: 2, role: '後アームの先のポッドの下の灯り（取説の図）。緑のゆっくり点滅＝GNSS有効、緑の2回点滅＝ビジョン有効、黄のすばやい点滅＝送信機の信号喪失、赤の点灯＝重大なエラー、など。モーターが回ると緑に点滅する（取説）。', check: ['離陸前に色を見る', '補助ライトを使うときはアームのLEDを遮らない（取説）'] },
  remoteId: { name: 'リモートID', en: 'Remote ID', group: 'nav', count: 1, role: '登録記号・位置・高度などを電波で発信する。Mini 5 Pro は機体に内蔵（国土交通省の届出一覧）。', structure: ['この図の位置は例'], check: ['飛行前に作動状況を確かめる（法定の点検項目）'] },
  gimbal: {
    name: 'ジンバル', en: 'Gimbal', group: 'payload', count: 1,
    role: 'カメラの揺れを打ち消す3軸のジンバル。ロールを大きく回せるので、機体を傾けずに縦向きの写真・動画が撮れる。上へ55°まで向けられる（公式）。',
    structure: ['3軸（チルト・ロール・パン・公式）', '機首の下に吊り下げ（取説の図）', '下の縦の円筒・U字のヨーク・左右の円筒・頭の中の順につながる（写真からの推定）', '電源を入れる前にストレージカバーを外す（取説）'],
    spec: [['操作できる範囲', 'チルト −90°〜55°・ロール −180°〜45°（公式）'], ['機械的な範囲', 'チルト −135°〜80°・ロール −230°〜95°・パン ±25°（公式）'], ['最大制御速度', 'チルト 100°/秒（公式）'], ['角度ぶれ範囲', '±0.005°（公式）']],
    check: ['ストレージカバーを外したか', '電源が入っている間に手で動かさない'],
    tip: '公式の「225°の柔軟なジンバル回転」は、操作できるロールの幅（−180°〜45°）と一致する（公式の値からの計算）。',
  },
  camMain: {
    name: 'カメラ', en: 'Camera', group: 'payload', count: 1,
    role: '1インチの大きなセンサーを持つ1台のカメラ。暗い所でも細部まで描写できる（公式）。48mmの中望遠モードは、同じカメラで2倍に寄せて撮る（公式）。',
    structure: ['レンズの横に「E24／F1.8」、下に「1-INCH」の文字（写真）', 'カメラは1台（公式の仕様に載るカメラは1つ）'],
    spec: [['センサー', '1インチ CMOS・有効5000万画素（公式）'], ['焦点距離', '24 mm 相当（公式）'], ['絞り', 'f/1.8（公式）'], ['画角（FOV）', '84°（公式）'], ['フォーカス', '0.5 m〜∞（公式）'], ['動画', '最大 4K / 120fps（スローモーション・公式）']],
    check: ['レンズの汚れ'],
  },
  regMark: { name: '登録記号', en: 'Registration mark', group: 'safety', count: 1, role: '国に登録した機体の番号。100g以上の機体は登録が必要で、25kg未満は文字の高さ3mm以上で表示する。', structure: ['この図の番号と位置は例'], check: ['はがれ・かすれ'] },
};
const MN5_LIST_ORDER = ['body', 'frontArm', 'rearArm', 'landingGear', 'motor', 'bell', 'stator', 'winding', 'magnet', 'shaft', 'motorBase', 'prop', 'esc', 'battery', 'cells', 'batteryBuckle', 'batteryLed', 'ports', 'fc',
  'gnss', 'lidar', 'vision', 'visionDown', 'ir3d', 'auxLight', 'statusLed', 'remoteId', 'gimbal', 'camMain', 'regMark'];
const MN5_SUB = { bell: 'motor', stator: 'motor', winding: 'motor', magnet: 'motor', shaft: 'motor', motorBase: 'motor', cells: 'battery', batteryBuckle: 'battery', camMain: 'gimbal' };
const MN5_PER_MOTOR = ['motor', 'prop', 'bell', 'stator', 'winding', 'magnet', 'shaft', 'motorBase'];
const MN5_SIMPLE = {
  prop:     { role: '回って空気を下に押します。工具なしで付け外しできます。', analogy: '扇風機の羽根を下に向けて、自分が浮くようなもの' },
  motor:    { role: 'プロペラを回す力の元。隣どうしが逆向きに回ります。', analogy: 'ミニ四駆のモーターを、もっと強く静かにしたもの' },
  frontArm: { role: 'モーターを支える腕。たたむと手のひらに乗る大きさになります。', analogy: '折りたたみ傘の骨' },
  battery:  { role: '電気のもと。後ろから差し込み、最大36分飛べます。', analogy: 'スマホの電池を、もっと強くしたもの' },
  fc:       { role: '機体の頭脳。傾きと位置を測って、4つのモーターの速さを決めます。', analogy: '自転車に乗るときの「小脳」' },
  gimbal:   { role: 'カメラの揺れを打ち消す首。カメラを縦にも回せます。', analogy: '走りながらでもコップの水をこぼさない手首' },
  camMain:  { role: '大きなセンサーのカメラ。暗い所でもきれいに撮れます。', analogy: '空飛ぶ高級コンパクトカメラ' },
  vision:   { role: '周りを見て、ぶつかる前に止まる目です。', analogy: '車の自動ブレーキのカメラ' },
};
const MN5_SIMPLE_NAME = { prop: 'プロペラ', motor: 'モーター', frontArm: 'アーム', battery: 'バッテリー', fc: '頭脳（FC）', gimbal: 'ジンバル', camMain: 'カメラ', vision: 'センサー' };
const MN5_TRIVIA = {
  body: '公式の離陸重量は 249.9 g（±4 g）。日本の登録は「機体本体とバッテリーの重さの合計」が100 g以上なら必要なので、この機体も登録の対象になる。',
  rearArm: '後方右のアームを開くと電源が入り、畳むと電源オフのカウントダウンが始まる（取説）。',
  gimbal: 'ロールを −180°〜45° の範囲で回せる。範囲は公式。機体を傾けずに縦向きの映像が撮れる（縦向きにする角度は資料に無く、この図は −90° としている）。',
  camMain: '48mm 中望遠モードは別のカメラではなく、1インチのカメラで2倍に寄せて撮る（公式）。',
  lidar: '前向きLiDARは、1ルクス未満の暗さでも前の障害物を検知できる（公式FAQ）。',
  battery: 'Plus バッテリーにすると最大飛行時間は52分。そのかわり機体は249 gを超える（公式・DJIストア）。',
  landingGear: '脚の中にアンテナが入っている（取説）。前脚と電池の底で立つので、置くと機首が少し上を向く（写真からの推定）。',
  statusLed: 'ステータスインジケーターは後ろの2本のアームの先にある（取説の図）。',
};
const MN5_TRIVIA_ACT = { rearArm: { alt: 'fold' }, frontArm: { alt: 'fold' }, gimbal: { alt: 'gimbal' }, camMain: { alt: 'fov' }, vision: { alt: 'sense' }, lidar: { alt: 'sense' }, battery: { alt: 'battery' } };
const MN5_REG = {
  body: [
    { text: '機体本体とバッテリーを合わせた重さが100g以上なので、国の登録が必要（公式の離陸重量は249.9 g）。海外で「250g未満」として扱われる区分は、日本の登録の基準とは別のもの。', ky: '3.1', src: 'reg' },
    { text: 'Mini 5 Pro は、令和8年6月19日現在の型式認証の一覧に載っていない。', ky: '3.1', src: 'mn5Cert' },
  ],
  remoteId: [{ text: 'Mini 5 Pro はリモートIDを機体に内蔵していると届け出られている（国土交通省の一覧・2025/9/13）。', ky: '3.1', src: 'mn5Rid' }],
  landingGear: [{ text: '映像伝送（O4+）は、日本国内では2.4GHz帯のみ使用可能（安全ガイドラインの日本語の仕様欄）。技適を受けた機器なら免許のいらない小電力の無線局として使える（総務省）。', ky: '3.2', src: 'soumuDrone' }],
  camMain: [{ text: '撮影した映像をインターネットで公開するときは、人の顔や表札、車のナンバーなどが写り込まないよう配慮することが求められる。写り込んだときはぼかしなどを入れる（総務省のガイドライン）。', ky: '3.2', src: 'soumuPriv' }],
};
const MN5_KY_PART = { body: '4.1', frontArm: '4.1', rearArm: '4.1', landingGear: '4.5', motor: '4.4', bell: '4.4', stator: '4.4', winding: '4.4', magnet: '4.4', shaft: '4.6', motorBase: '4.1', prop: '4.4', esc: '4.4',
  battery: '4.4', cells: '4.4', batteryBuckle: '4.6', batteryLed: '4.4', ports: '4.4', fc: '4.4', gnss: '4.5', lidar: '4.5', vision: '4.5', visionDown: '4.5', ir3d: '4.5', auxLight: '4.5', statusLed: '4.4', remoteId: '3.1', gimbal: '4.4', camMain: '4.4', regMark: '3.1' };

if (IS_MINI5) {
  const swap = (obj, next) => { for (const k of Object.keys(obj)) delete obj[k]; Object.assign(obj, next); };
  swap(PARTS, MN5_PARTS);
  GROUPS.splice(GROUPS.findIndex(g => g.id === 'payload'), 0, { id: 'safety', name: '登録・表示', color: '#e5484d' });
  swap(SIMPLE, MN5_SIMPLE); SIMPLE_KEYS.splice(0, SIMPLE_KEYS.length, ...Object.keys(MN5_SIMPLE));
  swap(SIMPLE_NAME, MN5_SIMPLE_NAME);
  swap(TRIVIA, MN5_TRIVIA); swap(TRIVIA_ACT, MN5_TRIVIA_ACT);
  { const keep = {}; for (const k of ['regMark', 'remoteId']) if (REG[k]) keep[k] = REG[k]; const reg = Object.assign(keep, MN5_REG); reg.remoteId = [...(REG.remoteId || []), ...MN5_REG.remoteId]; swap(REG, reg); }
  swap(KY_PART, MN5_KY_PART);
  REG_SOURCES.mn5Cert = MN5_SRC.certList; REG_SOURCES.mn5Rid = MN5_SRC.ridList;
  if (!REG_SOURCES.soumuDrone) REG_SOURCES.soumuDrone = { name: '総務省 電波利用ポータル「ドローン等に用いられる無線設備について」', url: 'https://www.tele.soumu.go.jp/j/sys/others/drone/' };
  for (const L of Object.values(I18N)) if (L && L.parts) for (const k of Object.keys(L.parts)) delete L.parts[k];
  Object.assign(FIND_ALIAS, { body: '胴体 ボディ 本体', frontArm: 'アーム 腕 たたむ', rearArm: 'アーム 腕 電源', landingGear: '脚 アンテナ', prop: '羽 はね ペラ', battery: '電池 バッテリ Plus プラス', gimbal: 'ジンバル 首 縦撮り', camMain: 'カメラ 1インチ', vision: 'センサー 魚眼 障害物', lidar: 'ライダー レーザー 障害物', ir3d: '赤外線 距離', statusLed: 'ライト LED', fc: '頭脳 FC' });
}
