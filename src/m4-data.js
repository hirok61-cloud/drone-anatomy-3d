// ===== DJI Matrice 4 シリーズ（4T／4E）のデータ（機種の判定は model.js） =====
// 実寸(m)で作り、縮尺は1。形は DJI 公式の3Dモデル（STEP）から寸法を取り、取説の図・公式写真で確かめた。
// 4T と 4E は機体が共通で、ジンバルの前面（カメラの組み合わせ）だけが違う。図は 4T で始め、ボタンで 4E に切り替える。
const M4_K = 1;
const M4_DATE = '2026年10月時点';
const M4_SRC = {
  product: { name: 'DJI 公式 Matrice 4シリーズ 製品ページ', url: 'https://enterprise.dji.com/jp/mobile/matrice-4-series' },
  specs: { name: 'DJI 公式 Matrice 4シリーズ 仕様', url: 'https://enterprise.dji.com/jp/matrice-4-series/specs' },
  faq: { name: 'DJI 公式 Matrice 4シリーズ よくある質問', url: 'https://enterprise.dji.com/jp/matrice-4-series/faq' },
  manual: { name: 'DJI Matrice 4シリーズ ユーザーマニュアル v1.2（2025年4月）', url: 'https://dl.djicdn.com/downloads/DJI_Matrice_4_Series/20250415/DJI_Matrice_4_Series_User_Manual_ja.pdf' },
  maint: { name: 'DJI Matrice 4 Series Maintenance Manual v1.0（英語）', url: 'https://dl.djicdn.com/downloads/DJI_Matrice_4_Series/20250227/DJI_Matrice_4_Series_Maintenance_Manual_en.pdf' },
  acc: { name: 'DJI AS1 スピーカー／AL1 スポットライト ユーザーマニュアル v1.2', url: 'https://terra-1-g.djicdn.com/6189933d30024fc1b331bffe4fe41837/matrice-4-series/UM/DJI_AS1_Speaker_and_DJI_AL1_SpotLight_User_Manual_v1.2.pdf' },
  prop: { name: 'DJIストア「Matrice 4シリーズ プロペラ」', url: 'https://store.dji.com/jp/product/dji-matrice-4-series-propellers' },
  cad: { name: 'DJI 公式 Matrice 4シリーズ 3Dモデル（M4T_v2.stp・ダウンロードページ）', url: 'https://enterprise.dji.com/jp/matrice-4-series/downloads' },
  certList: { name: '国土交通省「型式認証を取得している無人航空機一覧」（令和8年6月19日現在）', url: 'https://www.mlit.go.jp/koku/content/002008366.pdf' },
  soumuDrone: { name: '総務省 電波利用ポータル「ドローン等に用いられる無線設備について」', url: 'https://www.tele.soumu.go.jp/j/sys/others/drone/' },
  ridList: { name: '国土交通省「適合しているとして届出があったリモートID機器等の一覧」（令和8年7月8日更新）', url: 'https://www.mlit.go.jp/koku/content/001484158.pdf' },
};
// 「公式」=DJIの仕様・製品ページ・FAQ、「取説」=ユーザーマニュアル、「図」=取説の図からの読み取り、「CAD」=公式3Dモデルの実測、「推定」=それ以外の推定
const M4_PARTS = {
  body: {
    name: '機体本体（胴体）', en: 'Airframe body', group: 'frame', count: 1,
    role: 'バッテリー・電装・RTKモジュールを収める胴。前の下にジンバル、上面にアクセサリー用のE-PortとGNSSアンテナ、下面に下方ビジョンと3D赤外線センサーを持つ。4本のアームは胴の脇で折りたためる。',
    structure: ['上面は前から E-Port → セルラードングル収納部 → GNSSアンテナ → ビーコンの順（取説の図）', 'RTKモジュールを内蔵し、取り外せない（公式FAQ）', 'バッテリーは後ろから差し込む（取説の図）', '防水・防塵の保護等級はない（公式の仕様・FAQ）', '形は公式の3Dモデルから寸法を取った。内部の配置は例'],
    spec: [['離陸重量', '1219 g（標準プロペラ・バッテリーとmicroSDを含む・公式）'], ['最大離陸重量', '1420 g（標準プロペラ・公式）'], ['最大ペイロード', '200 g（公式）'], ['展開時', '約 307.0 × 387.5 × 149.5 mm（プロペラを除く・公式）'], ['折りたたみ時', '約 260.6 × 113.7 × 138.4 mm（公式）'], ['対角ホイールベース', '438.8 mm（公式）'], ['動作環境温度', '−10〜40 ℃（公式）'], ['保護等級（IP）', 'なし（公式）']],
    check: ['外殻の割れ・変形', 'センサーの窓の汚れ・傷', '雨の中で飛ばさない（防水性能はない・公式FAQ）'],
    tip: '展開すると約17.8L、折りたたむと約4.1Lの箱に収まる（公式寸法からの計算）。体積はおよそ4分の1になる。',
  },
  frontArm: {
    name: '前アーム', en: 'Front arm', group: 'frame', count: 2,
    role: '前の2つのモーターを支える腕。胴の上寄りから横へ張り出し、先のモーターの下にフロントLEDと脚がある。畳むときは水平に後ろへ回して胴の脇に沿わせる。',
    structure: ['展開は前アーム → 後アームの順（取説の準備手順）', '畳んだ前アームは胴の上側の脇に後ろ向きに沿う（取説の図）', '形と付け根の位置は公式の3Dモデルから'],
    check: ['展開しきっているか（展開しないまま電源を入れるとジンバルのセルフチェックが終わらない・公式FAQ）', 'ヒンジのガタ', 'ひび'],
  },
  rearArm: {
    name: '後アーム', en: 'Rear arm', group: 'frame', count: 2,
    role: '後ろの2つのモーターを支える腕。胴の下寄りから後ろ斜めへ伸びる。畳むときは下へ振り下ろして前へ回し、胴の下側の脇に、モーターを下に向けて収める。先にステータスインジケーターがある。',
    structure: ['畳んだ後アームはモーターが上下逆さになり、ジンバルの横の低い位置に来る（取説の図）', '回す軸の正確な向きは取説に書かれていない（この図の回し方は推定）'],
    check: ['展開しきっているか', 'ヒンジのガタ', 'ひび'],
    tip: '「アームを展開する前にモーターを始動しない」（安全ガイドライン）。機体が破損するおそれがあるため。',
  },
  landingGear: {
    name: 'ランディングギア（アンテナ内蔵）', en: 'Landing gear (antennas)', group: 'gear', count: 4,
    role: '各モーターの下に伸びる脚。4本で着地を支える。取説の部品名は「ランディングギア（アンテナ内蔵）」。',
    structure: ['映像伝送は O4 Enterprise・アンテナ8本（2T4R・公式）', '8本それぞれがどの脚に入っているかは公式資料に記載がない'],
    spec: [['映像伝送', 'O4 Enterprise（公式）'], ['アンテナ', '8本・2T4R（公式）'], ['最大伝送距離（日本）', '12 km（障害物・電波干渉なし・公式）'], ['ライブビュー', '1080p / 30fps（公式）']],
    check: ['ひび・欠け（中のアンテナを守っている）'],
    tip: '公式の仕様には「日本国内では5.8GHz帯は使用不可」と注記がある。日本で使うのは2.4GHz帯。',
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
    name: 'クイックリリースプロペラ（1157F）', en: 'Quick-release propeller', group: 'prop', count: 4,
    role: '工具なしで付け外しできる2枚羽根のプロペラ。モーターの位置に合わせて押し下げ、カチッと音がするまで回して固定する（取説）。',
    structure: ['A と B の2種類があり、対角どうしが同じ記号（取説の図。右前と左後が A、左前と右後が B）', 'A はハブの中心に白い丸の印がある（取説の図）', '羽根は根元で折れ、アームと一緒に畳める'],
    spec: [['型式', '1157F（標準）／1154F（低騒音）（公式）'], ['直径 × ピッチ', '10.8 × 5.7 インチ（標準・DJIストア）'], ['重さ', '10.8 g / 枚（標準・DJIストア）']],
    check: ['欠け・ひび・変形', 'A／B の取り付け位置', 'ロックがかかっているか'],
    tip: '交換の目安は「200時間を超える飛行、または1年使用」（メンテナンスマニュアル）。低騒音プロペラにすると最大飛行時間は49分から46分に減る（公式）。',
  },
  esc: {
    name: 'ESC（電子速度制御器）', en: 'ESC', group: 'elec', count: 1,
    role: 'バッテリーの直流を、モーターを回す三相の電流に変えて回転数を調整する。',
    structure: ['胴の中の基板（この図の位置は例）'],
    check: ['電源を入れたときの音'],
  },
  battery: {
    name: 'インテリジェントフライトバッテリー', en: 'Intelligent Flight Battery', group: 'elec', count: 1,
    role: '機体の電気のもと。胴の後ろから差し込み、左右のバックルで固定する。電源ボタンと残量LEDは後ろの端面にある（取説）。',
    structure: ['リチウムイオン 4S（公式）', 'カチッと音がするまで差し込む（取説）', '電源が入っているときは抜き差ししない（取説）', '充電は専用の充電ハブで（機体に差したままでは充電できない・公式FAQ）'],
    spec: [['容量', '6741 mAh（公式）'], ['標準電圧', '14.76 V（公式）'], ['電力量', '99.5 Wh（公式）'], ['重さ', '401 g（公式）'], ['放電率', '4C（公式）'], ['サイクル回数', '200（公式）'], ['最大飛行時間', '49 分・ホバリング 42 分（標準プロペラ・無風・公式）']],
    check: ['膨らみ・傷', 'バックルが左右とも固定されているか', '充電は 5〜40 ℃で（公式）'],
    tip: '99.5Whは、航空機の手荷物で目安になる100Whにわずかに届かない値。持ち込みの決まりは航空会社で確かめる。',
  },
  cells: { name: 'セル', en: 'Cells', group: 'elec', count: 1, role: 'バッテリーの中身。リチウムイオンのセルを4直列（4S）にして14.76Vを作る（公式）。並列の構成は公式資料に記載なし。', check: ['（分解しない）外装の膨らみで異常に気づく'] },
  batteryBuckle: { name: 'バッテリーバックル', en: 'Battery buckles', group: 'elec', count: 2, role: 'バッテリーの左右にあるつまみ。バッテリーを胴に固定し、押すと外れる（取説）。', check: ['左右ともしっかり固定されているか（固定が甘いと接触が悪くなり危険・取説）', 'バックルをつかんで機体を持たない（緩むのを防ぐ・安全ガイドライン）'] },
  batteryLed: { name: '電源ボタンとバッテリー残量LED', en: 'Power button & battery LEDs', group: 'elec', count: 1, role: 'バッテリーの後ろの端面のボタンと4つのLED。1回押すと残量を表示し、1回押してから長押しすると電源が入る（取説）。', check: ['飛行前に残量を確認'] },
  ports: { name: 'USB-C 補助ポート（E-Port Lite）と microSD スロット', en: 'E-Port Lite & microSD', group: 'elec', count: 1, role: 'USB-Cの補助ポートは、DJIのソフトや一部のPSDK機器をつなぐ口（公式）。写真・動画は microSD カードに記録する（内部ストレージはない・公式）。', structure: ['機体の後ろの下側（取説の図）'], check: ['ふたの閉まり'] },
  fc: {
    name: 'フライトコントローラー', en: 'Flight controller', group: 'elec', count: 1,
    role: '機体の頭脳。ジャイロ・加速度・GNSS・RTK・ビジョンの情報から姿勢と位置を計算し、4基のモーターの回転数を決める。',
    structure: ['胴の中（この図の位置は例）'],
    spec: [['ホバリング精度', '±0.1 m（ビジョン）／±0.5 m（GNSS）／±0.1 m（RTK）（無風または微風・公式）'], ['最大ピッチ角', '35°（公式）'], ['最大水平速度', '21 m/s（前進・無風・公式）']],
    check: ['起動時の自己診断（ステータスインジケーター）', 'コンパスの較正'],
  },
  gnss: {
    name: 'GNSS アンテナ（RTK 内蔵）', en: 'GNSS antenna / RTK', group: 'nav', count: 1,
    role: '衛星の電波を受けて位置を求める。上面の後ろ寄りのふくらみがアンテナ（取説の各部名称）。RTKを使うと、地上の基準局の補正で数cmの精度になる。',
    structure: ['RTKモジュールは内蔵で取り外せない（公式FAQ）', 'GLONASSはRTKが有効なときだけ使う（公式）'],
    spec: [['衛星', 'GPS + Galileo + BeiDou（RTK有効時は + GLONASS）（公式）'], ['RTK Fix の精度', '水平 1 cm + 1 ppm・垂直 1.5 cm + 1 ppm（公式）']],
    check: ['離陸前に衛星とRTKをつかんでいるか', 'アクセサリーでアンテナをふさがない（安全ガイドライン）'],
  },
  beacon: { name: 'ビーコン', en: 'Beacon', group: 'nav', count: 1, role: '上面の後端の灯り。夜間に機体の位置を知らせる（取説）。DJI Pilot 2 で手動で点けたり消したりする。', structure: ['夜間飛行では、ビーコンと底部の補助ライトが有効になっているか確かめる（取説）'], check: ['点灯するか'] },
  ePort: { name: 'E-Port（アクセサリーの差し込み口）', en: 'E-Port', group: 'elec', count: 1, role: '上面の前寄りにあるアクセサリー用の差し込み口。スピーカーやスポットライトなどの公式アクセサリーと、他社のPSDK機器をつなぐ（公式）。', structure: ['ホットスワップ非対応。アクセサリーは電源を入れる前に付ける（公式）', 'アクセサリーは重心を保つか、トップシェルのほぼ中央に（安全ガイドライン）'], check: ['カバーの閉まり（使わないとき）'] },
  dongleBay: { name: 'セルラードングル収納部', en: 'Cellular dongle bay', group: 'nav', count: 1, role: '別売の DJI セルラードングル2（4G）を入れる場所。4G回線でも映像伝送をつなげるようにする（公式）。', structure: ['上面、E-Port と GNSS アンテナの間（取説の図）', '取説は「一部の国・地域でのみ」使えるとしている。日本で上空で携帯電話の回線を使うには、制度上の手続きが要る（総務省）'], check: ['ふたの閉まり'] },
  vision: {
    name: '全方向ビジョンシステム', en: 'Omnidirectional vision', group: 'nav', count: 4,
    role: '魚眼のカメラを2つずつ組にして、周りの障害物までの距離を測る。ぶつかる前に止まったり避けたりする。',
    structure: ['上面の前の左右と、後ろ上の左右（取説の図）', '公式は「6つの高解像度・低照度対応魚眼ビジョンセンサー」（下方の2つを含めた数と読める）'],
    spec: [['前方・後方', '0.4〜22.5 m（デュアル）／0.4〜200 m・水平90°×垂直135°（公式）'], ['側方', '0.5〜32 m／0.5〜200 m・水平90°×垂直90°（公式）']],
    check: ['窓の汚れ', '0.5ルクス未満・4万ルクス超の地表付近、水面や細い電線は苦手（取説）'],
    tip: 'スポットライトを点けると障害物回避が働かなくなる（公式）。アクセサリーは見た目以上に機体の「目」に影響する。',
  },
  visionDown: { name: '下方ビジョンシステム', en: 'Downward vision', group: 'nav', count: 2, role: '下面の前と後ろの魚眼カメラ。地面の模様を見て位置を保つ（取説）。', structure: ['位置の保持は高度 0.5〜30 m で最もよく働く（取説）'], spec: [['測定範囲', '0.3〜18.8 m・前後左右とも160°（公式）']], check: ['窓の汚れ', '模様のない床・水面は苦手'] },
  ir3d: { name: '3D 赤外線検知システム', en: '3D infrared sensing', group: 'nav', count: 1, role: '機体の下で赤外線を使って地面までの距離を測り、下方ビジョンを補う（公式）。', structure: ['機体の下面（取説の各部名称）', '測定範囲の数値は仕様に書かれていない', 'GNSSが弱く暗い所でこれだけが働くときは、高度が地表から3mまでに制限される（取説）'], check: ['窓の汚れ'] },
  auxLight: { name: '補助ライト', en: 'Auxiliary light', group: 'nav', count: 1, role: '機体の下面の中央のライト。暗い所で下方ビジョンを助ける。高さ5m未満の暗い所で自動で点く（取説）。', check: ['点灯するか'] },
  led: {
    name: 'フロントLED', en: 'Front LEDs', group: 'nav', count: 2,
    role: '前アームのモーターの下の灯り。電源が入ってモーターが止まっている間は赤に点いて機首の向きを示し、モーターが回ると赤と緑に交互に点滅する（取説）。',
    structure: ['DJI Pilot 2 で「自動」にしていると、写真・動画の撮影中は消える（取説）'],
    check: ['点灯するか'],
  },
  statusLed: { name: '機体ステータスインジケーター', en: 'Status indicator', group: 'nav', count: 2, role: '後アームの先の灯り。機体の状態を色と点滅で知らせる。緑のゆっくり点滅＝GNSS有効、緑の2回点滅＝ビジョン有効、黄のすばやい点滅＝送信機の信号喪失、赤の点灯＝重大なエラー、など（取説）。', structure: ['左右どちらにもあるかは取説の図では確かめられない（図は両側に置いた例）'], check: ['離陸前に色を見る'] },
  remoteId: { name: 'リモートID', en: 'Remote ID', group: 'nav', count: 1, role: '登録記号・位置・高度などを電波で発信する。Matrice 4T・4E は機体に内蔵（国土交通省の届出一覧）。', structure: ['この図の位置は例'], check: ['飛行前に作動状況を確かめる（法定の点検項目）'] },
  gimbal: {
    name: 'ジンバル', en: 'Gimbal', group: 'payload', count: 1,
    role: '複数のカメラとレーザー距離計をまとめて載せた3軸のジンバル。機体の揺れを打ち消して、望遠でもぶれを抑えて撮る。',
    structure: ['3軸（チルト・ロール・パン・公式）', '送信機で操作できるのはチルト。パンは手動では操作できず（公式。MSDKのプログラムからは制御可能）、揺れの打ち消しに使う', '電源を入れる前にジンバルプロテクターを外す（取説）', '防振ゴム（ダンパー）4個で胴から浮かせている（メンテナンスマニュアル）'],
    spec: [['操作できるチルト', '4T −90°〜70°／4E −90°〜35°（公式）'], ['ソフトリミット', 'ロール ±47°・パン ±60°（公式）'], ['機械的な範囲', 'チルト 4T −140°〜113°・4E −140°〜50°、ロール ±52°、パン ±65°（公式）'], ['最大制御速度', 'チルト 100°/秒（公式）'], ['角度ぶれ範囲', '±0.007°（公式）']],
    check: ['ジンバルプロテクターを外したか', 'アームを開ききってから電源を入れる（取説）'],
  },
  camWideT: {
    variant: 't', name: '広角カメラ（4T）', en: 'Wide camera (4T)', group: 'payload', count: 1,
    role: '24mm相当の広角。全体を見渡して、探す・状況をつかむのに使う。',
    structure: ['前面の中央の丸いレンズ（取説の図）'],
    spec: [['センサー', '1/1.3インチ CMOS・有効4800万画素（公式）'], ['焦点距離', '24 mm 相当（公式）'], ['絞り', 'f/1.7（公式）'], ['画角（FOV）', '82°（公式）'], ['フォーカス', '1 m〜∞（公式）'], ['シャッター', '電子 2〜1/8000 秒（公式）']],
    check: ['レンズの汚れ'],
  },
  camWideE: {
    variant: 'e', name: '広角カメラ（4E・メカシャッター）', en: 'Wide camera (4E)', group: 'payload', count: 1,
    role: '測量向けの広角。4/3型の大きなセンサーと、メカシャッター（2〜1/2000秒・公式）を持つ。メカシャッターは、飛びながら撮るときの像のゆがみを抑えられる（一般的な知識）。',
    structure: ['前面の右下の大きな四角い窓（取説の図）', '0.5秒間隔で撮影できる（公式）'],
    spec: [['センサー', '4/3型 CMOS・有効2000万画素（公式）'], ['焦点距離', '24 mm 相当（公式）'], ['絞り', 'f/2.8〜f/11（公式）'], ['画角（FOV）', '84°（公式）'], ['シャッター', 'メカ 2〜1/2000 秒・電子 2〜1/8000 秒（公式）'], ['写真形式', 'JPEG／DNG（RAW）（公式）']],
    check: ['レンズの汚れ'],
    tip: '電子シャッターは上から順に読み出すので、速く動きながら撮ると像が斜めにゆがむ（ローリングシャッター）。測量でメカシャッターが重んじられるのはこのため（一般的な知識）。',
  },
  camMid: {
    name: '中望遠カメラ', en: 'Medium tele camera', group: 'payload', count: 1,
    role: '70mm相当の中望遠。近づかずに設備の細部を見る。公式は「10m先からでもネジや亀裂を識別」と紹介している。',
    structure: ['4T・4E 共通（公式）', '前面の右上の四角い窓（取説の図）'],
    spec: [['センサー', '1/1.3インチ CMOS・有効4800万画素（公式）'], ['焦点距離', '70 mm 相当（公式）'], ['絞り', 'f/2.8（公式）'], ['画角（FOV）', '35°（公式）'], ['フォーカス', '3 m〜∞（公式）']],
    check: ['レンズの汚れ'],
  },
  camTele: {
    name: '望遠カメラ', en: 'Tele camera', group: 'payload', count: 1,
    role: '168mm相当の望遠。公式は「最大250メートル離れた標識の細部まで」と紹介している。人や設備から距離をとったまま確かめられる。',
    structure: ['4T・4E 共通（公式）', '4T は前面の左中段の四角い窓、4E は左の大きな丸い窓（取説の図）'],
    spec: [['センサー', '1/1.5インチ CMOS・有効4800万画素（公式）'], ['焦点距離', '168 mm 相当（公式）'], ['絞り', 'f/2.8（公式）'], ['画角（FOV）', '15°（公式）'], ['デジタルズーム', '16倍（ハイブリッド112倍・公式）']],
    check: ['レンズの汚れ'],
    tip: '同じ距離から写る幅は、広角のおよそ7分の1（焦点距離の比 168/24）。わずかな揺れも大きく写るので、ジンバルの働きがいちばん効くカメラ。',
  },
  thermal: {
    variant: 't', name: '赤外線サーマルカメラ（4Tのみ）', en: 'Thermal camera (4T)', group: 'payload', count: 1,
    role: '物が出している赤外線（熱）を写す。暗闇でも人や動物、過熱した設備を見つけられる。',
    structure: ['前面の左上の丸い窓（取説の図）', '非冷却の酸化バナジウム（VOx）マイクロボロメーター（公式）'],
    spec: [['解像度', '640 × 512（スーパー解像度で 1280 × 1024・公式）'], ['焦点距離', '53 mm 相当・f/1.0（公式）'], ['画角（DFOV）', '45°（公式）'], ['波長', '8〜14 μm（公式）'], ['温度分解能', '≤ 50 mK（公式）'], ['測温範囲', '−20〜150 ℃（高ゲイン）／0〜550 ℃（低ゲイン）（公式）']],
    check: ['窓の汚れ・傷'],
    tip: 'ふつうのガラスは8〜14μmの赤外線を通さない。だからサーマルカメラの窓やレンズには、ふつうのガラスではなく、ゲルマニウムなど赤外線を通す材料が使われる（一般的な知識）。',
  },
  nir: {
    variant: 't', name: 'NIR 補助ライト（4Tのみ）', en: 'NIR auxiliary light (4T)', group: 'payload', count: 1,
    role: '人の目には見えない近赤外線で前を照らす。夜でも望遠カメラで遠くの様子を写せるようにする（公式）。',
    structure: ['前面の右下の小さな丸（取説の図）', '4T は IRカットフィルターを備え、昼も夜も使える（公式）'],
    spec: [['照射角（FOV）', '5.7° ± 0.3°（公式の仕様）'], ['照射距離', '100 m（製品ページ。100mの高さでホバリングして測定）']],
    check: ['電源が入っている間は直接見ない（安全ガイドライン）'],
  },
  laser: {
    name: 'レーザー距離計', en: 'Laser rangefinder', group: 'payload', count: 1,
    role: 'レーザーを当てて、狙った物までの距離を測る。アプリで「RNG」を有効にすると、十字線の先の物までの直線距離・高度・緯度経度・水平距離が出る（取説）。',
    structure: ['4T・4E 共通（公式）', '4T は前面の下の横長の窓、4E は左下の縦長の窓（取説の図）'],
    spec: [['測定範囲', '1800 m（反射率20%の目標・1 Hz・公式）'], ['斜めの面', '600 m（斜距離1:5・公式）'], ['ブラインドゾーン', '1 m（英語の仕様・製品ページ。日本語の仕様は「3～1 m」と表記）'], ['精度', '±(0.2 + 0.0015 × 距離) m（3 m より遠いとき・公式）']],
    check: ['電源が入っている間は直接見ない（安全ガイドライン）'],
    tip: '1800mで測ったときの誤差の目安は ±(0.2+0.0015×1800) = ±2.9 m。距離が遠いほど誤差の幅も広がる（公式の式からの計算）。',
  },
  spotlight: {
    variant: 'spot', name: 'AL1 スポットライト（別売）', en: 'AL1 Spotlight', group: 'payload', count: 1,
    role: '上面のE-Portに付ける照明。夜の捜索などで地上を照らす。ジンバルの向きに合わせて照らす向きを変えられる（公式）。',
    structure: ['E-Port に差し、手締めねじ2本で固定（AL1マニュアル）', '付けると障害物回避が制限されて迂回が使えなくなり、点けると障害物回避が働かない（AL1/AS1マニュアル・公式FAQ）'],
    spec: [['重さ', '99 g（ブラケット込み・公式）'], ['最大電力', '32 W（公式）'], ['照度', '4.3 ルクス @ 100 m・17 ルクス @ 50 m（公式）'], ['照射角', '23°（公式）']],
    check: ['取り付け前に電源を切る', '付けたらコンパスを較正（AL1マニュアル）'],
  },
  speaker: {
    variant: 'spk', name: 'AS1 スピーカー（別売）', en: 'AS1 Speaker', group: 'payload', count: 1,
    role: '上面のE-Port（スポットライトと一緒のときはその上）に付ける拡声器。避難の呼びかけや、録音・文字の読み上げ（中国語と英語のみ）を流す（公式）。',
    structure: ['スポットライトと重ねて付けられる（公式FAQ・AL1/AS1マニュアル）'],
    spec: [['重さ', '92.5 g（ブラケット込み・公式）'], ['最大音量', '114 dB @ 1 m（公式）'], ['有効放送距離', '300 m（公式）']],
    check: ['取り付け前に電源を切る', '初めて付けたらコンパスを較正（AS1マニュアル）'],
  },
  regMark: { name: '登録記号', en: 'Registration mark', group: 'safety', count: 1, role: '国に登録した機体の番号。100g以上の機体は登録が必要で、25kg未満は文字の高さ3mm以上で表示する。', structure: ['この図の番号と位置は例'], check: ['はがれ・かすれ'] },
};
const M4_LIST_ORDER = ['body', 'frontArm', 'rearArm', 'landingGear', 'motor', 'bell', 'stator', 'winding', 'magnet', 'shaft', 'motorBase', 'prop', 'esc', 'battery', 'cells', 'batteryBuckle', 'batteryLed', 'ports', 'fc',
  'gnss', 'beacon', 'ePort', 'dongleBay', 'vision', 'visionDown', 'ir3d', 'auxLight', 'led', 'statusLed', 'remoteId', 'gimbal', 'camWideT', 'camWideE', 'camMid', 'camTele', 'thermal', 'nir', 'laser', 'spotlight', 'speaker', 'regMark'];
const M4_SUB = { bell: 'motor', stator: 'motor', winding: 'motor', magnet: 'motor', shaft: 'motor', motorBase: 'motor', cells: 'battery', batteryBuckle: 'battery', batteryLed: 'battery', camWideT: 'gimbal', camWideE: 'gimbal', camMid: 'gimbal', camTele: 'gimbal', thermal: 'gimbal', nir: 'gimbal', laser: 'gimbal' };
const M4_PER_MOTOR = ['motor', 'prop', 'bell', 'stator', 'winding', 'magnet', 'shaft', 'motorBase'];
const M4_SIMPLE = {
  prop:     { role: '回って空気を下に押します。工具なしで付け外しできます。', analogy: '扇風機の羽根を下に向けて、自分が浮くようなもの' },
  motor:    { role: 'プロペラを回す力の元。隣どうしが逆向きに回ります。', analogy: 'ミニ四駆のモーターを、もっと強く静かにしたもの' },
  frontArm: { role: 'モーターを支える腕。たためば、機体全体が約4分の1のかさになります。', analogy: '折りたたみ傘の骨' },
  battery:  { role: '電気のもと。後ろから差し込み、最大49分飛べます。', analogy: 'スマホの電池を、もっと大きく強くしたもの' },
  fc:       { role: '機体の頭脳。傾きと位置を測って、4つのモーターの速さを決めます。', analogy: '自転車に乗るときの「小脳」' },
  gimbal:   { role: 'いくつものカメラを載せた首。揺れを打ち消します。', analogy: '走りながらでもコップの水をこぼさない手首' },
  laser:    { role: '光を当てて、遠くの物までの距離を測ります。', analogy: 'ゴルフ場で使う距離計' },
  vision:   { role: '周りを見て、ぶつかる前に止まる目です。', analogy: '車の自動ブレーキのカメラ' },
};
const M4_SIMPLE_NAME = { prop: 'プロペラ', motor: 'モーター', frontArm: 'アーム', battery: 'バッテリー', fc: '頭脳（FC）', gimbal: 'カメラとジンバル', laser: '距離計', vision: 'センサー' };
const M4_TRIVIA = {
  thermal: '4Tのサーマルカメラは、暗闇でも人の体温を写せる（一般的な知識）。公式は4Tを、電力・救命救助・公共安全・森林保全などに適するとしている。',
  laser: '狙った物までの距離を1800m先まで測れる（反射率20%の目標・公式）。見つけた人のおおよその位置（緯度経度）も出るが、取説は「あくまで参考用」としている。',
  camWideE: '4Eの広角はメカシャッター付き（公式）。4Eは測量・マッピング・土木建設・採掘などの空間計測向けとされる（公式）。',
  frontArm: '準備は「ジンバルプロテクターを外す → 前アーム → 後アーム → バッテリー → プロペラ」の順（取説）。',
  led: 'Mavic 4 Pro のフロントLEDは緑だが、Matrice 4 は赤で機首の向きを示す（それぞれの取説）。',
  battery: '99.5Whは航空機の手荷物の目安100Whにわずかに届かない。バッテリーだけで離陸重量の約3分の1（401g / 1219g）を占める。',
  gnss: 'RTKは内蔵で取り外せない（公式FAQ）。基準局の補正を受けると、水平1cm + 1ppmの精度で位置がわかる（公式）。',
  body: '防水の保護等級はない（公式）。雨の日の運用は想定されていない。',
  spotlight: 'スポットライトを点けると、障害物回避が働かなくなる（公式）。夜の捜索ほど、操縦者の目が頼りになる。',
};
const M4_TRIVIA_ACT = { frontArm: { alt: 'fold' }, rearArm: { alt: 'fold' }, gimbal: { alt: 'gimbal' }, camWideT: { alt: 'cams' }, camWideE: { alt: 'cams' }, camMid: { alt: 'cams' }, camTele: { alt: 'cams' }, thermal: { alt: 'cams' }, laser: { alt: 'laser' }, vision: { alt: 'sense' }, battery: { alt: 'battery' }, spotlight: { alt: 'acc' }, speaker: { alt: 'acc' } };
const M4_REG = {
  body: [
    { text: '機体本体とバッテリーを合わせた重さが100g以上なので、国の登録が必要。最大離陸重量は1420g（公式）で、25kg未満の区分。', ky: '3.1', src: 'reg' },
    { text: 'Matrice 4T・4E は、令和8年6月19日現在の型式認証の一覧に載っていない。同じ一覧にある第二種の「DJI Matrice 4D型／4TD型」は別の型式（AL1/AS1マニュアルでも「Matrice 4D シリーズ」として別に扱われている）で、4T・4E には当てはまらない。', ky: '3.1', src: 'm4Cert' },
  ],
  remoteId: [
    { text: 'Matrice 4T・4E はリモートIDを機体に内蔵していると届け出られている（国土交通省の一覧）。', ky: '3.1', src: 'm4Rid' },
  ],
  led: [
    { text: '撮影中にフロントLEDを自動で消す設定がある（取説）。夜間に飛ばすときは、機体の姿勢と方向がわかる灯火が求められるので、設定とビーコンを確かめる。', ky: '4.2', src: 'permit' },
  ],
  landingGear: [
    { text: '映像伝送の 5.8GHz 帯は日本では使えない（公式の仕様の注記）。日本で使う 2.4GHz 帯は、技適を受けた機器なら免許のいらない小電力の無線局として使える（総務省）。', ky: '3.2', src: 'soumuDrone' },
  ],
  camTele: [
    { text: '望遠で遠くから撮れるぶん、住宅などにカメラやズームを向けないこと、人の顔や表札などが写り込んだら削除やぼかしをすることが求められる（総務省のガイドライン）。', ky: '3.2', src: 'soumuPriv' },
  ],
};
const M4_KY_PART = { body: '4.1', frontArm: '4.1', rearArm: '4.1', landingGear: '4.5', motor: '4.4', bell: '4.4', stator: '4.4', winding: '4.4', magnet: '4.4', shaft: '4.6', motorBase: '4.1', prop: '4.4', esc: '4.4',
  battery: '4.4', cells: '4.4', batteryBuckle: '4.6', batteryLed: '4.4', ports: '4.4', fc: '4.4', gnss: '4.5', beacon: '4.2', ePort: '4.4', dongleBay: '4.5', vision: '4.5', visionDown: '4.5', ir3d: '4.5', auxLight: '4.5', led: '4.2', statusLed: '4.4', remoteId: '3.1',
  gimbal: '4.4', camWideT: '4.4', camWideE: '4.4', camMid: '4.4', camTele: '4.4', thermal: '4.4', nir: '4.4', laser: '4.5', spotlight: '4.4', speaker: '4.4', regMark: '3.1' };

if (IS_M4) {
  const swap = (obj, next) => { for (const k of Object.keys(obj)) delete obj[k]; Object.assign(obj, next); };
  swap(PARTS, M4_PARTS);
  GROUPS.splice(GROUPS.findIndex(g => g.id === 'payload'), 0, { id: 'safety', name: '登録・表示', color: '#e5484d' });
  swap(SIMPLE, M4_SIMPLE); SIMPLE_KEYS.splice(0, SIMPLE_KEYS.length, ...Object.keys(M4_SIMPLE));
  swap(SIMPLE_NAME, M4_SIMPLE_NAME);
  swap(TRIVIA, M4_TRIVIA); swap(TRIVIA_ACT, M4_TRIVIA_ACT);
  { const keep = {}; for (const k of ['regMark', 'remoteId', 'led']) if (REG[k]) keep[k] = REG[k]; const reg = Object.assign(keep, M4_REG);
    reg.led = [...(REG.led || []), ...M4_REG.led]; reg.remoteId = [...(REG.remoteId || []), ...M4_REG.remoteId]; reg.body = [...M4_REG.body]; swap(REG, reg); }
  swap(KY_PART, M4_KY_PART);
  REG_SOURCES.m4Cert = M4_SRC.certList; REG_SOURCES.m4Rid = M4_SRC.ridList; REG_SOURCES.soumuDrone = M4_SRC.soumuDrone;
  for (const L of Object.values(I18N)) if (L && L.parts) for (const k of Object.keys(L.parts)) delete L.parts[k];
  Object.assign(FIND_ALIAS, { body: '胴体 ボディ 本体', frontArm: 'アーム 腕 たたむ', rearArm: 'アーム 腕', landingGear: '脚 アンテナ', prop: '羽 はね ペラ', battery: '電池 バッテリ', gimbal: 'ジンバル 首',
    camWideT: 'カメラ 広角', camWideE: 'カメラ 広角 メカシャッター 測量', camMid: 'カメラ 望遠 70mm', camTele: 'カメラ 望遠 168mm', thermal: 'サーマル 赤外線 熱 温度', nir: '赤外線 ライト 夜', laser: 'レーザー 距離計 測距 RNG',
    vision: 'センサー 魚眼 障害物', visionDown: 'センサー 下', ir3d: '赤外線 距離', led: 'ライト 灯火 LED', fc: '頭脳 FC', gnss: 'GPS RTK 衛星', spotlight: 'ライト 照明 アクセサリー', speaker: 'スピーカー 拡声 アクセサリー' });
}
