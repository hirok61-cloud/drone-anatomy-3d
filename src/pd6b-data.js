// ===== PD6B-CAT3 のデータ（機種の判定は model.js） =====
// 実寸(m)で作った PD6B を、550クラスと同じ舞台(床・影・カメラ)に載せるための縮尺。スキッドの底(-0.53m)を床(-0.158)に合わせる
const PD6B_K = 0.158 / 0.53;
const PD6B_DATE = '2026年10月時点';
const PD6B_SRC = {
  mlit: { name: '国土交通省 報道発表「無人航空機の第一種型式認証の申請を受け付けました」(2023年11月10日)', url: 'https://www.mlit.go.jp/report/press/kouku11_hh_000115.html' },
  official: { name: 'Prodrone 製品ページ PD6B-Type3（CAT3のベース機）', url: 'https://www.prodrone.com/products/pd6b-type3' },
  news: { name: 'Prodrone ニュース「JMS2026のSTATION Aiブースに出展」(2026年10月12日)', url: 'https://www.prodrone.com/news/20261013' },
  logi: { name: 'LOGISTICS TODAY「プロドローン、型式認証目指す大型機を公開」(2025年6月5日)', url: 'https://www.logi-today.com/787585' },
  parasafe: { name: '日本化薬 PARASAFE（ドローン用パラシュート）', url: 'https://www.parasafe.jp/' },
  license: { name: '国土交通省 無人航空機操縦者技能証明（限定変更）', url: 'https://www.mlit.go.jp/koku/level4/license/' },
  portal: { name: '国土交通省 飛行許可・承認申請ポータル（カテゴリーⅡ）', url: 'https://www.mlit.go.jp/koku/permitapproval/' },
};

// 部品の解説。「公式」=メーカー公表値、「国交省」=型式認証申請時の発表値、「写真から推定」=展示機の外観からの推定
const PD6B_PARTS = {
  hubTop: {
    name: 'センターハブ上板', en: 'Hub top plate', group: 'frame', count: 1,
    role: '機体中央の天板。バッテリー4本の差し込み口があり、GNSSアンテナ・通信アンテナ・パラシュートがここに並ぶ。6本のアームの付け根をまとめる骨格の上面でもある。',
    structure: ['バッテリーの取っ手が天面に出て、上から抜き差しできる配置', '機首側の中央にGNSSアンテナ、後方右にパラシュートの筒（展示機）', '金属の削り出し板で、機器の取付面と骨格を兼ねる（外観から）'],
    spec: [['外形', '約 400 × 400 mm（写真から推定）'], ['根拠', 'JMS2026の展示機の外観']],
    check: ['バッテリー差込口の異物・変形', '天面の機器の固定ネジのゆるみ', 'ひび・打痕'],
    tip: '重い機器を機体の中心に集めるほど、機体を傾けるのに必要な力（慣性モーメント）が小さくなり、姿勢をすばやく直せる。',
  },
  hubBody: {
    name: 'センターハブ（胴体）', en: 'Center hub', group: 'frame', count: 1,
    role: '6本のアームが集まる機体の中心。中にフライトコントローラー・電源基板・無線機を収め、下面で腰下ユニットを受ける。',
    structure: ['バッテリー4本を縦に収めるケースを兼ねる', '電装を内部に収める。防水・防塵はIP44（公式）', '下面に腰下ユニットのピン受けが4か所'],
    spec: [['機体重量', '20.0 kg（バッテリー4本込み・公式）'], ['最大離陸重量', '約 45 kg（国交省）'], ['防水・防塵', 'IP44（公式）']],
    check: ['ケースの割れ・パッキンの傷み（防水性能が落ちる）', '腰下ユニットのピン受けのガタ', '通気口・コネクター部の汚れ'],
    tip: 'IP44は「直径1mm以上の固形物が入らない」「あらゆる方向からの水の飛まつに耐える」という保護等級。雨の中を飛べるかどうかは、等級ではなく取扱説明書の運用範囲で確かめる。',
  },
  arm: {
    name: 'アーム', en: 'Arm (CFRP tube)', group: 'frame', count: 6,
    role: 'モーターを機体の中心から同じ距離に保つ腕。6本が60°おきに並ぶヘキサコプター（6発機）で、向かい合うモーターの中心距離（モーター軸間）は1,623mm。',
    structure: ['カーボンの丸パイプ（太さは写真から約45mm）', '付け根の折りたたみ継手で畳める', '中に動力線と信号線を通す'],
    spec: [['本数', '6本（60°間隔）'], ['モーター軸間距離', '1,623 mm（公式）'], ['展開時の大きさ', '2,181 × 2,398 mm（公式）']],
    check: ['曲がり・割れ・繊維のささくれ', '継手まわりのガタ', '展開したときにロックが確実にかかるか'],
    tip: '550クラスの「550」も、この1,623mmも同じ「モーター軸間の距離」。この機体は550クラスのおよそ3倍の大きさになる。',
  },
  foldJoint: {
    name: '折りたたみ継手', en: 'Folding joint', group: 'frame', count: 6,
    role: 'アームを付け根で折りたたむ関節。運ぶときは直径945mmの円柱に収まり、現場ではワンタッチで広げられる（ベース機 PD6B-Type3 の公式値）。',
    structure: ['アームの付け根のヒンジ（蝶番）とロック', '広げた位置でアームを固定するラッチ', '畳む向き・角度は公表資料で確認できないため、この図は上向きに畳む例'],
    spec: [['折りたたみ時', 'φ945 mm の円柱内（公式）'], ['展開', 'ワンタッチ（公式）']],
    check: ['ロックが最後までかかっているか（手で引いて確かめる）', 'ヒンジのガタ・摩耗', '配線が折り目で挟まれていないか'],
    tip: '折りたたみ機では、ロックのかけ忘れがそのまま空中分解につながる。広げたら1本ずつ手で引いて確かめるのが基本。',
  },
  motorMount: {
    name: 'モーターマウント', en: 'Motor mount', group: 'frame', count: 6,
    role: 'アームの先端にモーターを固定する台座。プロペラの推力をアームへ伝える。最大離陸重量45kgでホバリングすると、1基あたり約74N（約7.5kg分）を支える。',
    structure: ['アームの管を抱えるクランプと、モーターを載せる板', '下にESC、横に灯火を抱える（展示機）'],
    spec: [['1基あたりの推力（ホバリング）', '約 74 N（45kg × 9.8 ÷ 6・計算値）']],
    check: ['クランプのゆるみ（モーター面が傾く）', '板のひび'],
  },
  motor: {
    name: 'ブラシレスモーター（大型）', en: 'Brushless motor', group: 'prop', count: 6,
    role: 'プロペラを直接回す大型のアウターローター式モーター。6基のうち3基が時計回り、3基が反時計回りで、回転の反動（反トルク）を打ち消し合う。',
    structure: ['外側の缶（ベル）ごと回るアウターローター', '直径30インチのプロペラを直接駆動する（減速ギアなし）', '図の歯と磁石の数は550クラスと同じ12N14Pで簡略化（実機の大型モーターはもっと多い）'],
    spec: [['方式', 'アウターローター・ブラシレスDC'], ['型番・出力', '非公表'], ['回転方向', '3基ずつ逆回転（並びは一般的なヘキサXの例）']],
    check: ['手で回して異音・引っかかりがないか', '飛行後の温度の偏り', 'ベアリングのガタ', '固定ネジのゆるみ'],
    tip: '同じ推力なら、大きなプロペラをゆっくり回すほうが電力が少なくて済む。だから大型機は「大径プロペラ＋低回転・高トルクのモーター」を使う。',
  },
  bell: {
    name: 'ベル（ローター）', en: 'Bell (rotor)', group: 'prop', count: 6,
    role: '磁石を内側に貼った回る缶。プロペラはこの上に固定される。',
    structure: ['アルミの削り出し', '内側に永久磁石が並ぶ'],
    check: ['打痕・へこみ（磁石とステーターが擦れる）', '磁石の浮き'],
  },
  stator: {
    name: 'ステーター（固定子）', en: 'Stator', group: 'prop', count: 6,
    role: '回らない鉄心。歯に巻いた銅線に電流を流して磁界を作り、ベルの磁石を引っぱる。',
    structure: ['薄い電磁鋼板を重ねた積層鉄心（渦電流の損失を減らす）'],
    check: ['錆・汚れ（屋外の大型機は特に）'],
  },
  winding: {
    name: '巻線', en: 'Windings', group: 'prop', count: 6,
    role: 'ステーターの歯に巻かれた銅線。ESCが順番に電流を流して回転磁界を作る。',
    structure: ['エナメル線を歯ごとに巻く', '3相（U・V・W）'],
    check: ['焦げ・変色（過電流のしるし）'],
  },
  magnet: {
    name: '永久磁石', en: 'Magnets', group: 'prop', count: 6,
    role: 'ベルの内側に並ぶN極とS極の磁石。ステーターの磁界に引かれてベルが回る。',
    structure: ['ネオジム磁石が一般的'],
    check: ['欠け・浮き'],
  },
  shaft: {
    name: 'シャフトとベアリング', en: 'Shaft & bearings', group: 'prop', count: 6,
    role: 'ベルの回転を支える軸と軸受け。大きなプロペラの重さと推力を受ける。',
    check: ['ガタ・ゴリ感', '水や砂の侵入'],
  },
  motorBase: {
    name: 'モーターベース', en: 'Motor base', group: 'prop', count: 6,
    role: 'ステーターを支え、モーターをマウントにネジで固定する土台。',
    check: ['固定ネジのゆるみ'],
  },
  prop: {
    name: '折りたたみプロペラ', en: 'Folding propeller (30 in)', group: 'prop', count: 6,
    role: '直径30インチ（約76cm）のカーボン製プロペラ。根元のヒンジで折りたためるので、アームと一緒に小さく畳める。回り始めると遠心力で自然に開いて一直線になる。',
    structure: ['カーボン繊維の2枚羽根', '根元をクランプのヒンジで挟む折りたたみ式', '6基ぶんの回転面の合計は約2.7m²'],
    spec: [['直径', '30 インチ（762 mm・公式）'], ['回転面積（6基の合計）', '約 2.74 m²（計算値）'], ['ディスク荷重', '約 16 kg/m²（45kgの場合・計算値）']],
    check: ['欠け・割れ・層間はく離', 'ヒンジの動きが軽いか（固着していると2枚の開き方がそろわない）', '取付の向き（時計回り用・反時計回り用）'],
    tip: '同じ計算で、550クラス（12インチ×4枚・約2.4kg）のディスク荷重は約8kg/m²。PD6B-CAT3は満載のとき、1m²あたりその約2倍の重さを空気で支えている。',
  },
  propClamp: {
    name: 'プロペラクランプ（折りたたみ金具）', en: 'Folding prop clamp', group: 'prop', count: 6,
    role: '2枚の羽根をモーターに固定し、ヒンジで折りたためるようにする金具。',
    structure: ['上下2枚の板で羽根の根元を挟む', '羽根ごとにヒンジのボルトが1本'],
    check: ['ヒンジボルトのゆるみ・摩耗', '羽根の根元の割れ'],
  },
  esc: {
    name: 'ESC（電子速度制御器）', en: 'ESC', group: 'prop', count: 6,
    role: 'バッテリーの直流を、モーターを回す三相の電流に変えて回転数を調整する。大電流で熱を持つため、プロペラの吹きおろしが当たるアーム先端に置かれている。',
    structure: ['モーターの直下の箱（展示機の写真から推定）', '放熱フィン付きのケース', 'フライトコントローラーの指令で出力を細かく変える'],
    spec: [['配置', 'アーム先端・モーターの下（写真から推定）']],
    check: ['ケースの割れ・浸水', '配線の焼け・コネクターのゆるみ', '飛行後の温度'],
  },
  battery: {
    name: 'インテリジェントバッテリー', en: 'Smart battery', group: 'elec', count: 4,
    role: '残量・温度・セルの電圧を自分で監視して機体へ伝えるバッテリー。4本を天面から差し込む。電源を入れたまま交換できる「ホットスワップ」に対応（公式）。',
    structure: ['天面の取っ手で上へ抜き差しする', '電池の管理回路（BMS）を内蔵', '4本とも機体重量20.0kgに含まれる（公式）'],
    spec: [['本数', '4本（公式）'], ['交換', 'ホットスワップ対応（公式）'], ['容量・電圧', '非公表']],
    check: ['膨らみ・傷・端子の焦げ', '4本の残量と温度がそろっているか', '差し込みのロック'],
    tip: 'ホットスワップは一般に「全部を一度に抜かない」ことで電源を切らずに交換する仕組み。頭脳が再起動しないので、起動と初期化を待たずに次の飛行へ移れる（具体的な手順は取扱説明書で確認）。',
  },
  cells: {
    name: 'セル（電池の素子）', en: 'Cells', group: 'elec', count: 4,
    role: 'バッテリーの中身。小さな電池（セル）を直列・並列につないで、必要な電圧と容量を作る。',
    structure: ['セルの種類と構成は非公表'],
    check: ['（分解しない）外装の膨らみで異常を見つける'],
  },
  powerConn: {
    name: '電源コネクター', en: 'Power connectors', group: 'elec', count: 1,
    role: '大電流を流すための太いコネクター。展示機では天面の左側に橙色のコネクターが4つ並んでいた。',
    structure: ['抜けにくい形状の大電流用コネクター', '用途の割り当ては写真から推定（バッテリー系統の接続）'],
    spec: [['根拠', '展示機の写真（用途は推定）']],
    check: ['焦げ・変色', '差し込みの浅さ', 'ピンの曲がり'],
  },
  pdb: {
    name: '電源基板', en: 'Power distribution', group: 'elec', count: 1,
    role: 'バッテリー4本の電力をまとめ、6基のESCと電装に分ける。1本が抜かれても電気が途切れないよう、複数の系統をまとめる役目も持つ。',
    structure: ['センターハブの内部（外からは見えない）', 'この図の配置は構成例'],
    check: ['（分解しない）飛行前の電圧表示で確かめる'],
  },
  fc: {
    name: 'フライトコントローラー', en: 'Flight controller', group: 'elec', count: 1,
    role: '機体の頭脳。ジャイロ・加速度・GNSSの情報から姿勢と位置を計算し、6基のモーターの回転数を決める。PRODRONEの独自開発（公式）。',
    structure: ['センターハブの内部（この図の位置は構成例）', '離陸から着陸までの自動飛行に対応（公式）', '故障したときの振る舞いも含めて、設計が安全基準に合うかを確かめるのが型式認証'],
    spec: [['開発', '独自開発（公式）'], ['自動飛行', '離陸〜着陸（公式）']],
    check: ['起動時の自己診断の結果', 'センサーの較正（コンパス・加速度）', 'ファームウェアの版'],
    tip: '6発機は、4発機に比べて「1基の推力が落ちたとき、残りで補える余地」を設計で持たせやすい。どこまで耐えられるかは機体ごとの設計と試験による。',
  },
  wiring: {
    name: '配線', en: 'Wiring', group: 'elec', count: 6,
    role: 'アームの中を通る動力線と信号線。折りたたみ継手をまたぐので、曲げに強い取り回しが要る。',
    structure: ['動力線（太い）と信号線（細い）', '継手の部分はたるみを持たせる'],
    check: ['継手部分の被覆の傷', 'コネクターのゆるみ'],
  },
  gps: {
    name: 'GNSSアンテナ', en: 'GNSS antenna', group: 'nav', count: 1,
    role: '衛星の電波から機体の位置を求める。天面の機首寄りに載り、矢印を機首に向けて取り付ける（展示機）。',
    structure: ['空がよく見える天面の最も高い位置に置く', '電流の流れる動力線から離して置く（磁気の影響を避ける）'],
    spec: [['位置', '天面・機首寄り（展示機）']],
    check: ['取付の向き（矢印）', 'ケーブルのゆるみ', '近くに金属・磁石を置いていないか'],
  },
  antenna: {
    name: '通信アンテナ', en: 'Comm antennas', group: 'nav', count: 2,
    role: '機体と地上をつなぐ無線のアンテナ。PD6B-Type3はLTE通信をオプションで載せられる（公式）。展示機では天面前方に黒い筒が2本並んでいた。',
    structure: ['天面前方の2本（用途の割り当ては写真から推定）', '2本を離して置くと、機体の向きが変わっても電波を拾いやすい'],
    spec: [['オプション', 'LTE・GCS対応（公式）']],
    check: ['折れ・ゆるみ', 'ケーブルの断線'],
  },
  rxAnt: {
    name: '送受信アンテナ', en: 'Control link antennas', group: 'nav', count: 2,
    role: '操縦信号とテレメトリーのアンテナ（写真から推定）。左右のアームの付け根に1本ずつ立てて、片方が機体の陰になってももう片方で受ける。',
    structure: ['左右に離して置くダイバーシティ配置', 'オプションの「操舵信号多重化」は、操縦の信号経路を複数持たせて途切れにくくするもの（公式のオプション名）'],
    check: ['折れ・ゆるみ', '先端がカーボンに触れていないか'],
  },
  remoteId: {
    name: 'リモートID', en: 'Remote ID', group: 'nav', count: 1,
    role: '機体の登録記号・位置・高度などを電波で発信し続ける装置。登録した機体は、原則として備えることが求められる。',
    structure: ['内蔵か外付けかは機体による（この図の位置は例）'],
    check: ['飛行前に作動状況を確かめる（法定の点検項目）'],
  },
  tof: {
    name: 'ToFセンサー', en: 'ToF sensor', group: 'nav', count: 1,
    role: '光を当てて、跳ね返ってくるまでの時間から距離を測るセンサー。PD6B-Type3は「ToFセンサーによる対象物検知」を備える（公式）。',
    structure: ['機首側の下（写真から推定）', '光の飛行時間（Time of Flight）で距離を測る'],
    spec: [['機能', '対象物の検知（公式）']],
    check: ['窓の汚れ・傷（測れなくなる）'],
  },
  led: {
    name: '灯火', en: 'Navigation lights', group: 'nav', count: 6,
    role: '機体の向きと姿勢を遠くから見分けるための灯り。前の左が赤、前の右が緑、そのほかが白（この図の配色）。',
    structure: ['モーターマウントの下（配置は写真から推定）'],
    check: ['点灯・点滅', 'カバーの割れ'],
  },
  parachute: {
    name: 'パラシュート', en: 'Parachute (PARASAFE)', group: 'safety', count: 1,
    role: '機体が飛べなくなったときに傘を開き、落ちる速さを下げて、地上の人や物への衝撃を小さくする安全装置。展示機には日本化薬の「PARASAFE」が載っていた。',
    structure: ['筒の中に傘を畳んで収める', '火薬の力で傘を押し出し、低い高度でも素早く開く（PARASAFEの方式）', '天面の後方右（展示機）'],
    spec: [['製品', '日本化薬 PARASAFE（展示機）'], ['この機体用の型式', '非公表'], ['参考', '25kg級用 PS CA12-01：傘の面積11m²・降下速度6m/s（理論値）・最低展開高度30m（同社発表）']],
    check: ['筒の固定', '使用期限・点検時期', '電気の接続'],
    tip: '仮に45kgの機体を6m/sまで落とせたとすると（25kg級用製品の理論値を当てはめた計算）、運動エネルギーは約0.8kJ。50mから落ちた場合（約31m/s・空気抵抗なし）の約22kJの、およそ27分の1になる。この機体用の傘での降下速度は非公表。',
  },
  regMark: {
    name: '登録記号', en: 'Registration mark', group: 'safety', count: 1,
    role: '国に登録した機体の番号。最大離陸重量25kg以上の機体は、文字の高さ25mm以上で表示する（25kg未満は3mm以上）。',
    structure: ['取り外しにくく、外から見やすい場所に表示する', 'この図の番号と位置は例'],
    spec: [['文字の高さ', '25 mm以上（最大離陸重量25kg以上の場合）']],
    check: ['はがれ・かすれ'],
  },
  lowerMount: {
    name: '腰下ユニット取付部', en: 'Lower-unit mount', group: 'payload', count: 1,
    role: '機体の下半分（腰下ユニット）を付け替えるための取付部。ピン4か所の差し替えで交換できる（一部例外あり・公式）。',
    structure: ['標準の腰下ユニットは「測量用」「物流ボックス リリース型」「物流ボックス 引き出し型」の3種類（公式）', '用途に合わせて、同じ上半分を使い回せる'],
    spec: [['交換', 'ピン4か所（公式）'], ['標準ユニット', '測量用・物流ボックス2種（公式）']],
    check: ['ピンが最後まで差さっているか', 'ピン穴の摩耗'],
  },
  cargoBox: {
    name: '物流ボックス', en: 'Cargo box', group: 'payload', count: 1, variant: 'cargo',
    role: '荷物を入れる箱。機体の真下、重心の下に荷物が来るので、積んでも傾きにくい。最大積載重量は約20kg（国交省・申請時）。',
    structure: ['白い箱を腰下ユニットが抱える', 'リリース型は、着陸したあと箱を切り離して置いていける', '2025年の一般公開時の報道では最大積載重量18kg'],
    spec: [['最大積載重量', '約 20 kg（国交省・申請時）／18 kg（2025年6月の報道）'], ['箱の大きさ', '約 400 × 360 × 400 mm（写真から推定）']],
    check: ['荷物の固定と重心（偏ると傾く）', '箱の割れ', 'ふたの閉まり'],
  },
  boxLatch: {
    name: 'ボックスリリース機構', en: 'Box release latch', group: 'payload', count: 1, variant: 'cargo',
    role: '物流ボックスをつかみ、着陸したあとに離す爪。人が箱を受け取りに行かなくても荷物を置いていける。',
    structure: ['箱の四隅をつかむ爪（この図の形は例）', '飛行中に開かないことが最も大事'],
    check: ['爪が確実に閉じているか', '作動の確認（荷物を積む前に）'],
  },
  surveyUnit: {
    name: '測量ユニット', en: 'Survey unit (LiDAR)', group: 'payload', count: 1, variant: 'survey',
    role: '腰下ユニットを測量用に付け替えると、LiDAR（レーザー測距）やカメラを積める。PD6B-Type3はLiDAR・可視カメラ・赤外線カメラなどを搭載できる（公式）。',
    structure: ['レーザーを回しながら当てて、地形を点の集まり（点群）として測る', 'この図の形は例'],
    spec: [['搭載例', 'LiDAR・可視カメラ・赤外線カメラ・スポットライト・スピーカー（公式）']],
    check: ['センサー窓の汚れ', '取付の傾き（測量の誤差になる）'],
  },
  landingGear: {
    name: '脚（降着装置）', en: 'Landing gear', group: 'gear', count: 2,
    role: '着陸のときに機体を支える。腰下ユニットと一体で、荷物の箱を囲む枠にもなる。全高は676mm（標準スキッド装着時・公式）。',
    structure: ['左右2組の脚', '前後の脚を横の桟でつなぐ', '荷物の箱が脚の間に収まる'],
    spec: [['全高', '676 mm（標準スキッド・公式）']],
    check: ['曲がり・割れ', '取付ピンのゆるみ'],
  },
  skid: {
    name: 'スキッド', en: 'Skids', group: 'gear', count: 2,
    role: '地面に接するそり。前後に長く、着陸の衝撃と横すべりを受け止める。',
    structure: ['前後に長い管', '両端にゴムの足'],
    check: ['ゴムの足の脱落', '曲がり'],
  },
};
const PD6B_LIST_ORDER = ['hubTop', 'hubBody', 'arm', 'foldJoint', 'motorMount', 'motor', 'bell', 'stator', 'winding', 'magnet', 'shaft', 'motorBase', 'prop', 'propClamp', 'esc',
  'battery', 'cells', 'powerConn', 'pdb', 'fc', 'wiring', 'gps', 'antenna', 'rxAnt', 'remoteId', 'tof', 'led', 'parachute', 'regMark', 'lowerMount', 'cargoBox', 'boxLatch', 'surveyUnit', 'landingGear', 'skid'];
const PD6B_SUB = { bell: 'motor', stator: 'motor', winding: 'motor', magnet: 'motor', shaft: 'motor', motorBase: 'motor', cells: 'battery', propClamp: 'prop', boxLatch: 'cargoBox', skid: 'landingGear' };
const PD6B_PER_MOTOR = ['motor', 'prop', 'esc', 'arm', 'bell', 'stator', 'winding', 'magnet', 'shaft', 'motorBase', 'propClamp', 'led', 'foldJoint', 'motorMount', 'wiring'];
const PD6B_SIMPLE = {
  prop:      { role: '大きな羽根で空気を下に押して、45kgの機体を浮かせます。使わないときは折りたためます。', analogy: '扇風機の羽根の、大人の腕くらいある版' },
  motor:     { role: 'プロペラを回す力の元。6つのうち半分が右回り、半分が左回りです。', analogy: '6人でこぐボート。半分ずつ逆向きにこぐとまっすぐ進む' },
  arm:       { role: 'モーターを機体の真ん中から同じ距離に支える棒。6本あります。', analogy: '傘の骨' },
  foldJoint: { role: 'アームを折りたたむ関節。たたむと直径1mくらいの筒に収まります。', analogy: '折りたたみ傘のつけ根' },
  battery:   { role: '電気のもと。4本を上から差し込み、電源を入れたまま入れ替えられます。', analogy: 'リレーのバトン。全員が同時に手を離さなければ止まらない' },
  fc:        { role: '機体の頭脳。傾きと位置を測って、6つのモーターの速さを決めます。', analogy: '自転車に乗るときの「小脳」' },
  parachute: { role: 'もしも落ちるときに傘を開いて、ゆっくり降ろす安全装置です。', analogy: '飛行機の脱出用パラシュートの、ドローン版' },
  cargoBox:  { role: '荷物を入れる箱。着陸したら箱だけ置いていけます。', analogy: '宅配便の箱を、空から玄関先へ' },
  surveyUnit: { role: '下半分を付け替えると、レーザーで地形を測る道具を積めます。', analogy: '同じ車に、荷台の代わりに測量機を載せる' },
};
const PD6B_SIMPLE_NAME = { prop: 'プロペラ', motor: 'モーター', arm: 'アーム', foldJoint: '折りたたみ', battery: 'バッテリー', fc: '頭脳（FC）', parachute: 'パラシュート', cargoBox: '荷物の箱', surveyUnit: '測量ユニット' };
const PD6B_TRIVIA = {
  arm: '6本のアームの先を結ぶと正六角形。向かい合うモーターの距離1,623mmは、軽自動車の幅（約1.48m）より長い。',
  prop: '回っていないときは羽根がだらりと折れていても、回り始めると遠心力で一直線に開く。だから折りたたみ式でも飛べる。',
  foldJoint: '広げると約2.4m、たたむと直径945mm。車に積めるかどうかが、現場で使えるかどうかを決める。',
  battery: '全部を一度に抜かなければ電源を保てる、というのがホットスワップの考え方。入れ替えの手順は取扱説明書で確かめる。',
  parachute: '傘を開くまでにも落ちる距離が要る。だから「どの高さから開けるか（最低展開高度）」が製品ごとに決まっている。',
  motor: '6発機は、どれか1基の推力が落ちても残りで補う余地を設計で持たせやすい。4発機ではどの1基も欠かせない。',
  cargoBox: '荷物は重心の真下に積む。前後左右にずれると、モーターごとの負担が偏って飛べる時間が縮む。',
  lowerMount: '上半分（飛ぶ部分）はそのままで、下半分を物流用・測量用に付け替える。1台を何役にも使う設計。',
  regMark: '25kg以上の機体は登録記号の文字を25mm以上にする。遠くからでも読めるように。',
};
const PD6B_TRIVIA_ACT = { foldJoint: { pd6b: 'fold' }, arm: { pd6b: 'fold' }, prop: { pd6b: 'fold' }, battery: { pd6b: 'swap' }, parachute: { pd6b: 'chute' }, cargoBox: { pd6b: 'drop' }, boxLatch: { pd6b: 'drop' }, lowerMount: { pd6b: 'unit' } };
// モーターの並び（上から見て）。M1から時計回り。回転方向は一般的なヘキサXの例
const PD6B_MOTOR_INFO = [
  { id: 'M1', pos: '前右', dir: 'CCW' }, { id: 'M2', pos: '右', dir: 'CW' }, { id: 'M3', pos: '後右', dir: 'CCW' },
  { id: 'M4', pos: '後左', dir: 'CW' }, { id: 'M5', pos: '左', dir: 'CCW' }, { id: 'M6', pos: '前左', dir: 'CW' },
];
// 6基の位置（機首=−Z、右=+X）。前右から時計回りに 30°, 90°, 150°, 210°, 270°, 330°
const PD6B_ARM_DEG = [30, 90, 150, 210, 270, 330];
const PD6B_U = PD6B_ARM_DEG.map(a => ({ x: Math.sin(a * Math.PI / 180), z: -Math.cos(a * Math.PI / 180) }));
const PD6B_DIR = PD6B_MOTOR_INFO.map(m => m.dir === 'CCW' ? 1 : -1);
const PD6B_FLIGHT = {
  hover: { name: 'ホバリング', mult: PD6B_U.map(() => 1),
    note: '6つのモーターが同じ推力を出し、合計が機体の重さと釣り合うと空中で止まる。隣どうしが逆回転なので、回転の反動も打ち消し合う。' },
  climb: { name: '上昇', mult: PD6B_U.map(() => 1.25),
    note: '6つとも同時に速くする。推力の合計が重さを上回ると上昇し、遅くすれば下降する。' },
  pitch: { name: '前進', mult: PD6B_U.map(u => +(1 + 0.15 * u.z / 0.866).toFixed(3)),
    note: '後ろの2つ（M3・M4）を速く、前の2つ（M1・M6）を遅くすると機首が下がる。真横の2つ（M2・M5）はそのまま。推力が前に傾き、その水平な成分で前へ進む。' },
  roll: { name: '右へ移動', mult: PD6B_U.map(u => +(1 - 0.15 * u.x).toFixed(3)),
    note: '左の3つを速く、右の3つを遅くすると、機体が右に傾いて右へ進む。真横のM2・M5の差がいちばん大きい。' },
  yaw: { name: '右旋回（ヨー）', mult: PD6B_DIR.map(d => 1 + 0.15 * d),
    note: '反時計回りの3つ（M1・M3・M5）を速く、時計回りの3つ（M2・M4・M6）を遅くする。回転の反動の釣り合いが崩れて、機体が時計回りに回る。推力の合計は変わらない。' },
};
// 制度の注記（判定はせず「求められている」「確認する」で止める）
const PD6B_REG = {
  hubBody: [
    { text: '最大離陸重量が25kg以上なので、カテゴリーⅡの飛行では、技能証明と機体認証があっても飛行の許可・承認が要る（許可・承認を不要にできる例外は総重量25kg未満に限られる）。', ky: '3.1', src: 'pd6bPortal' },
    { text: '技能証明で25kg以上の機体を飛ばすには、限定変更「最大離陸重量の拡大（25kg以上）」が要る（新規申請のときから含めることもできる）。', ky: '3.1', src: 'pd6bLicense' },
    { text: '第一種型式認証は、立入管理措置を講じずに第三者の上空を飛ぶ特定飛行（カテゴリーⅢ）を目的とした型式が対象。PD6B-CAT3は2023年11月10日に申請が受理され（国内3件目）、2026年10月時点で取得を目指している段階（同社発表）。', ky: '3.1', src: 'pd6bMlit' },
  ],
  cargoBox: [
    { text: '飛行中に物を落とす「物件投下」は承認が要る特定飛行。この図の動きは、着陸してから箱を離す例。', ky: '3.1', src: 'permit' },
  ],
};
const PD6B_KY_PART = { hubTop: '4.1', hubBody: '4.1', arm: '4.1', foldJoint: '4.6', motorMount: '4.1', motor: '4.4', bell: '4.4', stator: '4.4', winding: '4.4', magnet: '4.4', shaft: '4.6', motorBase: '4.1',
  prop: '4.4', propClamp: '4.6', esc: '4.4', battery: '4.4', cells: '4.4', powerConn: '4.4', pdb: '4.4', fc: '4.4', wiring: '4.4', gps: '4.5', antenna: '4.5', rxAnt: '4.5', remoteId: '3.1', tof: '4.5',
  led: '4.2', parachute: '4.4', regMark: '3.1', lowerMount: '4.1', cargoBox: '4.4', boxLatch: '4.6', surveyUnit: '4.4', landingGear: '4.1', skid: '4.1' };

// 機種を PD6B にするとき、共通の表を PD6B の中身に入れ替える（表は const なので中身だけ差し替える）
if (IS_PD6B) {
  const swap = (obj, next) => { for (const k of Object.keys(obj)) delete obj[k]; Object.assign(obj, next); };
  swap(PARTS, PD6B_PARTS);
  GROUPS.splice(GROUPS.findIndex(g => g.id === 'payload'), 0, { id: 'safety', name: '安全装置', color: '#e5484d' });
  swap(SIMPLE, PD6B_SIMPLE); SIMPLE_KEYS.splice(0, SIMPLE_KEYS.length, ...Object.keys(PD6B_SIMPLE));
  swap(SIMPLE_NAME, PD6B_SIMPLE_NAME);
  swap(TRIVIA, PD6B_TRIVIA); swap(TRIVIA_ACT, PD6B_TRIVIA_ACT);
  MOTOR_INFO.splice(0, MOTOR_INFO.length, ...PD6B_MOTOR_INFO);
  swap(FLIGHT, PD6B_FLIGHT);
  // 制度: 登録記号・リモートID・灯火は機種を問わない注記なので残し、PD6B固有を足す
  { const keep = {}; for (const k of ['regMark', 'remoteId', 'led']) if (REG[k]) keep[k] = REG[k]; swap(REG, Object.assign(keep, PD6B_REG)); }
  swap(KY_PART, PD6B_KY_PART);
  REG_SOURCES.pd6bPortal = PD6B_SRC.portal; REG_SOURCES.pd6bLicense = PD6B_SRC.license; REG_SOURCES.pd6bMlit = PD6B_SRC.mlit;
  // やさしい日本語・英語の部品名は550クラス用なので外す（日本語の解説に戻す）
  for (const L of Object.values(I18N)) if (L && L.parts) for (const k of Object.keys(L.parts)) delete L.parts[k];
  FIND_ALIAS.foldJoint = '折り畳み ヒンジ 関節 たたむ'; FIND_ALIAS.parachute = 'パラシュート 落下傘 PARASAFE パラセーフ'; FIND_ALIAS.cargoBox = '荷物 箱 ボックス 物流';
  FIND_ALIAS.battery = '電池 バッテリ'; FIND_ALIAS.fc = '頭脳 FC'; FIND_ALIAS.tof = '距離 センサー 障害物'; FIND_ALIAS.surveyUnit = 'LiDAR ライダー 測量 点群';
}
