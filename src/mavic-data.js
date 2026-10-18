// ===== DJI Mavic 4 Pro のデータ（機種の判定は model.js） =====
// 実寸(m)で作り、縮尺は1（550クラスと同じ舞台にそのままの大きさで載る）。
const MAVIC_K = 1;
const MAVIC_DATE = '2026年10月時点';
const MAVIC_SRC = {
  specs: { name: 'DJI 公式 Mavic 4 Pro 仕様', url: 'https://www.dji.com/jp/mavic-4-pro/specs' },
  product: { name: 'DJI 公式 Mavic 4 Pro 製品ページ', url: 'https://www.dji.com/jp/mavic-4-pro' },
  manual: { name: 'DJI Mavic 4 Pro ユーザーマニュアル v1.2（2025年9月25日）', url: 'https://dl.djicdn.com/downloads/mavic-4-pro/20250925/DJI_Mavic_4_Pro_User_Manual_v1.2_ja.pdf' },
  prop: { name: 'フジヤカメラ「DJI Mavic 4 Pro プロペラ」（直径・ピッチ・重さの表記）', url: 'https://www.fujiya-camera.co.jp/shop/g/gC6937224109988/' },
  review: { name: 'TechRadar「DJI Mavic 4 Pro review」（魚眼センサー6基）', url: 'https://www.techradar.com/cameras/drones/dji-mavic-pro-4-review' },
  portal: { name: '国土交通省 飛行許可・承認申請ポータル（カテゴリーⅡ）', url: 'https://www.mlit.go.jp/koku/permitapproval/' },
};
// 「公式」=DJIの仕様ページ、「取説」=ユーザーマニュアル、「販売店」=販売店の表記、「推定」=写真・寸法からの推定
const MAVIC_PARTS = {
  body: {
    name: '機体本体（胴体）', en: 'Airframe body', group: 'frame', count: 1,
    role: 'バッテリー・電装・ジンバルを収める胴。空気抵抗が小さくなるよう、角を丸めた流線形にしている。4本のアームは胴のヒンジで折りたためる。',
    structure: ['前にジンバルと前向きLiDAR、上にバッテリー、下に3D赤外線検知システムと補助ライト（取説の各部名称）', '中にフライトコントローラー・ESC・映像伝送（O4+）を収める', '胴の形と細部は写真からの推定'],
    spec: [['離陸重量', '約 1063 g（公式）'], ['折りたたみ時', '257.6 × 124.8 × 103.4 mm（プロペラなし・公式）'], ['展開時', '328.7 × 390.5 × 135.2 mm（プロペラなし・公式）'], ['動作環境温度', '−10〜40 ℃（公式）']],
    check: ['外殻の割れ・変形', '通気口がふさがれていないか（取説）', 'センサーの窓の汚れ・傷'],
    tip: '展開すると約17.4L、折りたたむと約3.4Lの箱に収まる。体積はおよそ5分の1になる（公式の寸法からの計算）。',
  },
  frontArm: {
    name: '前アーム', en: 'Front arm', group: 'frame', count: 2,
    role: '前の2つのモーターを支える腕。胴の横のヒンジで水平に回り、胴の脇へ折りたためる。下にランディングギア（アンテナ内蔵）とフロントLEDがある。',
    structure: ['胴のヒンジで水平に回る（畳む向きは例）', 'バッテリーを抜き差しする前に、前アームを展開する（前向きLiDARを傷めないため・取説）'],
    check: ['展開しきっているか', 'ヒンジのガタ', 'ひび'],
  },
  rearArm: {
    name: '後アーム', en: 'Rear arm', group: 'frame', count: 2,
    role: '後ろの2つのモーターを支える腕。前アームより低い位置にあり、斜めに回って胴の下側へ折りたためる。後方右アームを展開すると機体の電源が入る（初期設定・取説）。',
    structure: ['アーム展開による電源オンは初期設定で有効、アーム折りたたみによる電源オフは初期設定で無効（取説）', '前アームと高さをずらしてあり、畳んでも重ならない（推定）'],
    check: ['展開しきっているか', 'ヒンジのガタ', 'ひび'],
    tip: '開くと電源が入るので、準備の手順が「開く → 確かめる」のひと続きになる。',
  },
  landingGear: {
    name: 'ランディングギア（アンテナ内蔵）', en: 'Landing gear (antennas)', group: 'gear', count: 2,
    role: '前アームの下の脚。着地を支えるとともに、中に映像伝送のアンテナを収めている（取説の各部名称）。脚の先は地面から離れた位置にあるので、アンテナが機体の陰になりにくい。',
    structure: ['脚の中にアンテナ（取説）', '映像伝送は O4+（公式）'],
    spec: [['映像伝送', 'O4+（公式）'], ['最大伝送距離（日本）', '15 km（障害物・電波干渉なし・公式）'], ['建物の多い所', '約 0〜0.7 km（障害物・干渉あり・公式）']],
    check: ['ひび・欠け（中のアンテナを守っている）'],
    tip: '最大15kmは障害物も電波干渉もない理想の値。建物が多い所の目安は0〜0.7kmと公式の仕様にも書かれている。',
  },
  motor: {
    name: 'ブラシレスモーター', en: 'Brushless motor', group: 'prop', count: 4,
    role: 'プロペラを回すアウターローター式のモーター。対角の2基が同じ向きに回り、隣どうしは逆向きに回って回転の反動を打ち消す。',
    structure: ['外側の缶（ベル）ごと回るアウターローター', '図の歯と磁石の数は550クラスと同じ12N14Pで簡略化'],
    spec: [['型番・出力', '非公表'], ['回転方向', '隣どうしが逆（並びは一般的な例）']],
    check: ['手で回して引っかかりがないか', '異音', '飛行後の温度'],
    tip: '飛行後は、前方モーターの温度が後方より高くなるのが正常（取説）。前へ進むときは機首を下げた姿勢になり、前の2基の負担が増えることが一因と考えられる。',
  },
  bell: { name: 'ベル（ローター）', en: 'Bell (rotor)', group: 'prop', count: 4, role: '磁石を内側に貼った回る缶。プロペラはこの上に取り付く。', check: ['打痕', '砂の噛み込み'] },
  stator: { name: 'ステーター（固定子）', en: 'Stator', group: 'prop', count: 4, role: '回らない鉄心。巻線に電流を流して磁界を作る。', check: ['（分解しない）異音で気づく'] },
  winding: { name: '巻線', en: 'Windings', group: 'prop', count: 4, role: 'ステーターの歯に巻いた銅線。ESCが順番に電流を流して回転磁界を作る。', check: ['焦げ臭さ'] },
  magnet: { name: '永久磁石', en: 'Magnets', group: 'prop', count: 4, role: 'ベルの内側に並ぶN極とS極の磁石。', check: ['（分解しない）'] },
  shaft: { name: 'シャフトとベアリング', en: 'Shaft & bearings', group: 'prop', count: 4, role: 'ベルの回転を支える軸と軸受け。', check: ['ガタ・ゴリ感'] },
  motorBase: { name: 'モーターベース', en: 'Motor base', group: 'prop', count: 4, role: 'ステーターを支え、アームに固定する土台。', check: ['固定のゆるみ'] },
  prop: {
    name: 'クイックリリースプロペラ', en: 'Quick-release propeller', group: 'prop', count: 4,
    role: '工具なしで付け外しできる2枚羽根のプロペラ。モーターに押し込んで回すとロックされる。羽根は根元で折れるので、アームと一緒に畳める。',
    structure: ['プロペラとモーターのカラーマークを合わせて取り付ける（取説）', '押し込んで回してロック', '羽根は根元のヒンジで折れる'],
    spec: [['直径 × ピッチ', '10.5 × 5.8 インチ（約26.7 × 14.7 cm・販売店）'], ['重さ', '約 11.8 g / 枚（販売店）']],
    check: ['欠け・ひび・変形（古いものは使わない・取説）', 'カラーマークの組み合わせ', 'ロックがかかっているか'],
    tip: '取説は「DJI公式のプロペラのみを使い、複数の種類を混ぜない」としている。羽根の形が違うと、4基の推力のつり合いが崩れる。',
  },
  esc: {
    name: 'ESC（電子速度制御器）', en: 'ESC', group: 'elec', count: 1,
    role: 'バッテリーの直流を、モーターを回す三相の電流に変えて回転数を調整する。電源を入れたときにESCの動作音に異常がないか確かめる（取説）。',
    structure: ['胴の中の基板（この図の位置は例）'],
    check: ['電源を入れたときの音'],
  },
  battery: {
    name: 'インテリジェントフライトバッテリー', en: 'Intelligent Flight Battery', group: 'elec', count: 1,
    role: '機体の電気のもと。残量・温度・セルの電圧を自分で監視する。胴の上に収まり、左右のバックルで固定する。',
    structure: ['リチウムイオン 4S（LiNiMnCoO2・公式）', 'カチッと音がするまで差し込む（取説）', '抜き差しの前に前アームを展開する（取説）'],
    spec: [['容量', '6654 mAh（公式）'], ['公称電圧', '14.32 V（公式）'], ['電力量', '95.3 Wh（公式）'], ['重さ', '約 332 g（公式）'], ['最大飛行時間', '51 分（公式）'], ['充電時間', '約 51 分（240W アダプター・公式）']],
    check: ['膨らみ・傷', 'バックルがロックされているか', '電源が入ったまま抜き差ししない（取説）'],
    tip: '3か月以上充放電しないと性能が落ちるので、少なくとも3か月に1回は満充電する（取説）。輸送のときは30%以下に放電しておくのが推奨。',
  },
  cells: { name: 'セル', en: 'Cells', group: 'elec', count: 1, role: 'バッテリーの中身。4本を直列（4S）につなぎ、14.32Vを作る。材料は LiNiMnCoO2（三元系・公式）。', check: ['（分解しない）外装の膨らみで異常に気づく'] },
  batteryBuckle: {
    name: 'バッテリーバックル', en: 'Battery buckles', group: 'elec', count: 2,
    role: 'バッテリーの左右にあるつまみ。バッテリーを胴に固定し、押すと外れる（取説の各部名称）。',
    check: ['左右とも戻っているか（片側だけだと飛行中に浮く）'],
  },
  batteryLed: {
    name: '電源ボタンとバッテリー残量LED', en: 'Power button & battery LEDs', group: 'elec', count: 1,
    role: 'バッテリーの電源ボタンと残量を示す4つのLED。ボタンを1回押すとバッテリーが起動し、残量が表示される（取説）。',
    check: ['飛行前に残量を確認'],
  },
  ports: { name: 'USB-C ポートと microSD スロット', en: 'USB-C & microSD', group: 'elec', count: 1, role: '充電・データ転送のUSB-Cと、写真・動画を記録するmicroSDカードの差し込み口（取説の各部名称）。本体内にもストレージ（64GB・利用可能 約42GB・公式）がある。', check: ['ふたの閉まり', 'USB-C使用中はアームを開いても電源が入らない（取説）'] },
  fc: {
    name: 'フライトコントローラー', en: 'Flight controller', group: 'elec', count: 1,
    role: '機体の頭脳。ジャイロ・加速度・GNSS・ビジョンシステムの情報から姿勢と位置を計算し、4基のモーターの回転数を決める。',
    structure: ['胴の中（この図の位置は例）'],
    spec: [['ホバリング精度', '垂直 ±0.1 m・水平 ±0.3 m（ビジョン）／±0.5 m（衛星）（公式）'], ['最大傾斜角度', '35°（公式）']],
    check: ['起動時の自己診断（ステータスインジケーター）', 'コンパスの較正'],
  },
  gnss: { name: 'GNSS', en: 'GNSS', group: 'nav', count: 1, role: '衛星の電波から位置を求める。GPS・Galileo・BeiDou の3つを使う（公式）。', structure: ['胴の上側の中（この図の位置は例）'], spec: [['衛星', 'GPS + Galileo + BeiDou（公式）']], check: ['離陸前に衛星をつかんでいるか'] },
  lidar: {
    name: '前向きLiDAR', en: 'Forward LiDAR', group: 'nav', count: 1,
    role: 'レーザーを当てて前方の物までの距離を測る。暗くてカメラが見えにくい夜でも、前の障害物を測れる。',
    structure: ['機首の上（この図の位置は例）', 'クラス1レーザー製品の安全基準を満たす（取説）'],
    spec: [['夜間の測定範囲', '0.5〜25 m（反射率10%超・公式）']],
    check: ['窓の汚れ・傷'],
  },
  vision: {
    name: '全方向ビジョンシステム', en: 'Omnidirectional vision', group: 'nav', count: 6,
    role: '魚眼のカメラで周りの障害物との距離を測り、ぶつかる前に止まったり避けたりする。GNSSが弱いときは位置の保持にも使う。',
    structure: ['低照度対応の魚眼センサー6基（レビュー記事）', '配置はこの図では胴の四隅と下面（推定）', 'スポーツモードでは無効になる（取説）'],
    spec: [['測定範囲', '前 0.5〜24 m・後 0.5〜22 m・横 0.5〜21 m・上 0.5〜18 m・下 0.5〜17 m（公式）']],
    check: ['窓の汚れ', '模様のない床・水面・電線は苦手（取説）'],
    tip: '取説は、送電線や吊り橋のようなケーブル構造、枝や電線のような細い物は正しく見分けられないとしている。ビジョンがあっても操縦者の確認は欠かせない。',
  },
  ir3d: { name: '3D 赤外線検知システム', en: '3D infrared sensing', group: 'nav', count: 1, role: '機体の下で赤外線を使って地面までの距離を測る。着陸や低い所での位置保持を助ける。', structure: ['機体の下面（取説）', 'クラス1レーザー製品の安全基準を満たす（取説）'], spec: [['測定範囲', '0.3〜8 m（反射率10%超・公式）']], check: ['窓の汚れ'] },
  auxLight: { name: '補助ライト', en: 'Auxiliary light', group: 'nav', count: 1, role: '機体の下の白いライト。暗い所で下方ビジョンシステムを助ける。高さ5m未満の暗い所で自動で点く（取説）。', check: ['点灯するか'] },
  led: {
    name: 'フロントLED', en: 'Front LEDs', group: 'nav', count: 2,
    role: '前アームの下の灯り。電源が入ってモーターが止まっている間は緑に点いて機首の向きを示す。モーターが回ると緑に点滅する（取説）。',
    structure: ['撮影中は自動で消える設定がある（取説）'],
    check: ['点灯するか'],
  },
  statusLed: { name: '機体ステータスインジケーター', en: 'Status indicator', group: 'nav', count: 1, role: '機体の状態を色と点滅で知らせる。緑のゆっくり点滅＝GNSS有効、黄のすばやい点滅＝送信機の信号喪失、赤の点灯＝重大なエラー、など（取説）。', structure: ['後アームの下（この図の位置は例）'], check: ['離陸前に色を見る'] },
  remoteId: { name: 'リモートID', en: 'Remote ID', group: 'nav', count: 1, role: '登録記号・位置・高度などを電波で発信する。登録した機体は原則として備えることが求められる。', structure: ['内蔵かどうかは販売国の仕様で確認（この図の位置は例）'], check: ['飛行前に作動状況を確かめる（法定の点検項目）'] },
  gimbal: {
    name: 'インフィニティジンバル', en: 'Infinity gimbal', group: 'payload', count: 1,
    role: 'カメラの揺れを打ち消す3軸のジンバル。ロールの軸が大きく回るので、機体を傾けずに縦向きの撮影ができ、上向き70°まで向けられる。',
    structure: ['3軸（チルト・ロール・パン・公式）', '「360°回転するインフィニティジンバル」（公式）', '機械的な可動範囲はロール −90°〜450°（公式）'],
    spec: [['操作可能範囲', 'チルト −90°〜70°・ロール −40°〜400°（公式）'], ['機械的可動範囲', 'チルト −164°〜160°・ロール −90°〜450°・パン −22°〜22°（公式）']],
    check: ['電源オンの前にストレージカバーを外す（取説）', '電源が入っている間に手で動かさない（取説）'],
  },
  camMain: {
    name: 'Hasselblad カメラ', en: 'Hasselblad camera', group: 'payload', count: 1,
    role: '3つのカメラのうちの主カメラ。4/3型の大きなセンサーで、暗い所でもノイズを抑えて撮れる。絞りを変えられる。',
    spec: [['センサー', '4/3型 CMOS・有効1億画素（公式）'], ['焦点距離', '28 mm 相当（公式）'], ['絞り', 'f/2.0〜f/11（公式）'], ['水平の画角', '約 65°（28mm相当からの計算）']],
    check: ['レンズの汚れ'],
  },
  camMid: {
    name: '中望遠カメラ', en: 'Medium tele camera', group: 'payload', count: 1,
    role: '70mm相当の中望遠。主カメラより狭く切り取り、遠くの被写体を大きく写す。',
    spec: [['センサー', '1/1.3インチ CMOS・有効4800万画素（公式）'], ['焦点距離', '70 mm 相当（公式）'], ['絞り', 'f/2.8（公式）'], ['水平の画角', '約 29°（計算）']],
    check: ['レンズの汚れ'],
  },
  camTele: {
    name: '望遠カメラ', en: 'Tele camera', group: 'payload', count: 1,
    role: '168mm相当の望遠。近づかずに遠くを撮れるので、人や物から距離をとったまま撮影できる。',
    spec: [['センサー', '1/1.5インチ CMOS・有効5000万画素（公式）'], ['焦点距離', '168 mm 相当（公式）'], ['絞り', 'f/2.8（公式）'], ['水平の画角', '約 12°（計算）']],
    check: ['レンズの汚れ'],
    tip: '画角が狭いほど、機体のわずかな揺れも大きく写る。望遠ほどジンバルの働きが大事になる。',
  },
  regMark: { name: '登録記号', en: 'Registration mark', group: 'safety', count: 1, role: '国に登録した機体の番号。100g以上の機体は登録が必要で、25kg未満は文字の高さ3mm以上で表示する。', structure: ['この図の番号と位置は例'], check: ['はがれ・かすれ'] },
};
const MAVIC_LIST_ORDER = ['body', 'frontArm', 'rearArm', 'landingGear', 'motor', 'bell', 'stator', 'winding', 'magnet', 'shaft', 'motorBase', 'prop', 'esc', 'battery', 'cells', 'batteryBuckle', 'batteryLed', 'ports', 'fc',
  'gnss', 'lidar', 'vision', 'ir3d', 'auxLight', 'led', 'statusLed', 'remoteId', 'gimbal', 'camMain', 'camMid', 'camTele', 'regMark'];
const MAVIC_SUB = { bell: 'motor', stator: 'motor', winding: 'motor', magnet: 'motor', shaft: 'motor', motorBase: 'motor', cells: 'battery', batteryBuckle: 'battery', batteryLed: 'battery', camMain: 'gimbal', camMid: 'gimbal', camTele: 'gimbal' };
const MAVIC_PER_MOTOR = ['motor', 'prop', 'bell', 'stator', 'winding', 'magnet', 'shaft', 'motorBase'];
const MAVIC_SIMPLE = {
  prop:     { role: '回って空気を下に押します。工具なしで付け外しできます。', analogy: '扇風機の羽根を下に向けて、自分が浮くようなもの' },
  motor:    { role: 'プロペラを回す力の元。隣どうしが逆向きに回ります。', analogy: 'ミニ四駆のモーターを、もっと強く静かにしたもの' },
  frontArm: { role: 'モーターを支える腕。たたむと本くらいの大きさになります。', analogy: '折りたたみ傘の骨' },
  battery:  { role: '電気のもと。上から差し込み、最大51分飛べます。', analogy: 'スマホの電池を、もっと大きく強くしたもの' },
  fc:       { role: '機体の頭脳。傾きと位置を測って、4つのモーターの速さを決めます。', analogy: '自転車に乗るときの「小脳」' },
  gimbal:   { role: 'カメラの揺れを打ち消す首。カメラを縦にも回せます。', analogy: '走りながらでもコップの水をこぼさない手首' },
  camMain:  { role: '3つあるカメラの主役。暗い所でもきれいに撮れます。', analogy: '空飛ぶ一眼カメラ' },
  vision:   { role: '周りを見て、ぶつかる前に止まる目です。', analogy: '車の自動ブレーキのカメラ' },
};
const MAVIC_SIMPLE_NAME = { prop: 'プロペラ', motor: 'モーター', frontArm: 'アーム', battery: 'バッテリー', fc: '頭脳（FC）', gimbal: 'ジンバル', camMain: 'カメラ', vision: 'センサー' };
const MAVIC_TRIVIA = {
  rearArm: '後方右のアームを開くと電源が入る。電源ボタンを押さなくても飛ぶ準備ができる（初期設定・取説）。',
  frontArm: 'バッテリーの抜き差しは前アームを開いてから。前向きLiDARを傷めないため（取説）。',
  gimbal: 'ロールの軸を大きく回せるので、機体を傾けずに縦向きの写真が撮れる。',
  camTele: '168mm相当の画角は約12°。主カメラ（約65°）の5分の1ほどの幅を切り取る。',
  vision: '暗すぎる（0.1ルクス未満）・明るすぎる（4万ルクス超）地面の近くでは、ビジョンシステムがうまく働かない（取説）。',
  battery: '95.3Whは、航空機の手荷物で目安になる100Whより少し小さい。持ち込みの決まりは航空会社で確かめる。',
  motor: '前のモーターのほうが熱くなるのは正常（取説）。',
  landingGear: '脚がアンテナの入れ物。地面から離して、電波を出しやすくしている。',
  led: '電源オンでモーターが止まっている間、フロントLEDは緑に点いて機首の向きを示す（取説）。',
};
const MAVIC_TRIVIA_ACT = { rearArm: { alt: 'fold' }, frontArm: { alt: 'fold' }, gimbal: { alt: 'gimbal' }, camMain: { alt: 'fov' }, camMid: { alt: 'fov' }, camTele: { alt: 'fov' }, vision: { alt: 'sense' }, lidar: { alt: 'sense' }, battery: { alt: 'battery' } };
const MAVIC_REG = {
  body: [
    { text: '最大離陸重量が25kg未満の機体。技能証明を受けた人が機体認証を受けた機体を飛ばすときは、カテゴリーⅡのうち人口集中地区・夜間・目視外・人や物件から30m未満の飛行で、立入管理措置と飛行マニュアルの作成などを条件に、許可・承認を不要にできる。', ky: '3.1', src: 'mavicPortal' },
    { text: 'この機体の型式認証は、2026年10月時点の検索では確認できなかった。型式認証がない機体も、検査を受けて機体認証を取る道がある（確認先で要件を確かめる）。', ky: '3.1', src: 'cert' },
  ],
  led: [
    { text: '撮影中にフロントLEDを自動で消す設定がある（取説）。夜間に飛ばすときは、機体の姿勢と方向がわかる灯火が求められるので、設定を確かめる。', ky: '4.2', src: 'permit' },
  ],
};
const MAVIC_KY_PART = { body: '4.1', frontArm: '4.1', rearArm: '4.1', landingGear: '4.5', motor: '4.4', bell: '4.4', stator: '4.4', winding: '4.4', magnet: '4.4', shaft: '4.6', motorBase: '4.1', prop: '4.4', esc: '4.4',
  battery: '4.4', cells: '4.4', batteryBuckle: '4.6', batteryLed: '4.4', ports: '4.4', fc: '4.4', gnss: '4.5', lidar: '4.5', vision: '4.5', ir3d: '4.5', auxLight: '4.5', led: '4.2', statusLed: '4.4', remoteId: '3.1', gimbal: '4.4', camMain: '4.4', camMid: '4.4', camTele: '4.4', regMark: '3.1' };

if (IS_MAVIC) {
  const swap = (obj, next) => { for (const k of Object.keys(obj)) delete obj[k]; Object.assign(obj, next); };
  swap(PARTS, MAVIC_PARTS);
  GROUPS.splice(GROUPS.findIndex(g => g.id === 'payload'), 0, { id: 'safety', name: '登録・表示', color: '#e5484d' });
  swap(SIMPLE, MAVIC_SIMPLE); SIMPLE_KEYS.splice(0, SIMPLE_KEYS.length, ...Object.keys(MAVIC_SIMPLE));
  swap(SIMPLE_NAME, MAVIC_SIMPLE_NAME);
  swap(TRIVIA, MAVIC_TRIVIA); swap(TRIVIA_ACT, MAVIC_TRIVIA_ACT);
  // モーターの並び(M1前右・M2後右・M3後左・M4前左)と飛行の原理は550クラスと同じ4発機の考え方なのでそのまま使う
  { const keep = {}; for (const k of ['regMark', 'remoteId', 'led']) if (REG[k]) keep[k] = REG[k]; const reg = Object.assign(keep, MAVIC_REG); reg.led = [...(REG.led || []), ...MAVIC_REG.led]; swap(REG, reg); }
  swap(KY_PART, MAVIC_KY_PART);
  REG_SOURCES.mavicPortal = MAVIC_SRC.portal;
  for (const L of Object.values(I18N)) if (L && L.parts) for (const k of Object.keys(L.parts)) delete L.parts[k];
  Object.assign(FIND_ALIAS, { body: '胴体 ボディ 本体', frontArm: 'アーム 腕 たたむ', rearArm: 'アーム 腕 電源', landingGear: '脚 アンテナ', prop: '羽 はね ペラ', battery: '電池 バッテリ', gimbal: 'ジンバル 首 縦撮り', camMain: 'カメラ ハッセル 主カメラ', camMid: 'カメラ 望遠 70mm', camTele: 'カメラ 望遠 168mm', vision: 'センサー 魚眼 障害物', lidar: 'ライダー レーザー 障害物', ir3d: '赤外線 距離', led: 'ライト 灯火 LED', fc: '頭脳 FC' });
}
