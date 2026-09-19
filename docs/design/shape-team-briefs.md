# 形づくりの分担と指示（続きから再開するための控え）

書式と作法は `shape-authoring.md`。ここには「誰に何を作らせるか」を残す。
**同時に動かすのは4名まで**（12名同時で5時間枠を使い切り、全員が途中で落ちた）。形づくりは Opus、主役級だけ最上位モデル。
担当者への指示には必ず入れる: 最初に手引きとお手本(butterfly/snake)を読む／作ってよいのは `src/shapes/<担当id>.json` と `docs/review/shapes/<担当id>.png` だけ／
エンジン・ラボ・ほかの形・git・サーバーに触れない／1形につき4〜7回撮って直す（大きい画像 z=1 は仕上げだけ）／特定作品のキャラクターに似せない／
ほかの形と言葉を重ねない（全体の一覧を渡す）／報告は形ごとに 動き・自己評価(5点)・弱点・エンジンへの要望。

## できたもの（2026-09-20 公開 48e1538）
dragon, dragon_rise, butterfly, snake ／ whale, dolphin, fish, turtle, octopus, jellyfish ／ cat, dog, rabbit, fox, bear, panda ／ 言葉の表 words.tsv（350行）
初稿のみ（落ちた担当者の置き土産。読める出来だが未仕上げ）: bird, elephant, ghost, heart, robot

## これから（優先順）
### 第2波
- **行事と景色**: fireworks はなび（絵文字は額縁つきで使えない。必須）／xmastree クリスマス・ツリー／present プレゼント／cake ケーキ・たんじょうび／pumpkin かぼちゃ・ハロウィン／koinobori こいのぼり・こどもの日／torii とりい・じんじゃ・はつもうで・おしょうがつ／fuji ふじさん・やま
- **オリジナルの類型キャラ**（依頼主の「アニメキャラも」への答え。2〜3頭身）: ninja／robot（初稿あり）／ghost（初稿あり）／witch まじょ・まほう／alien うちゅうじん／angel てんし／dinosaur きょうりゅう・ティラノ／unicorn
- **乗り物**: rocket／airplane（真上から・mirror）／helicopter／car（車輪 spin にはスポーク）／train しんかんせん・でんしゃ（特定形式に似せない）／ship ふね・ヨット
- **宇宙と空**: ufo／saturn どせい・わくせい（輪は 奥半分→球→手前半分 の順）／earth／moon つき・みかづき／astronaut／sun たいよう／rainbow にじ
### 第3波
- **記号と縁起物**: heart（初稿あり。beat）／star ほし・きらきら／note おんぷ・おんがく／crown／smile えがお／balloon／daruma だるま・ごうかく／wave なみ・うみ
- **花・木・季節**: sakura さくら・はなみ／sunflower／tulip／maple もみじ／tree き・もり（「ツリー」は xmastree）／clover よつば／snowflake ゆき／snowman
- **鳥と小さな生き物**: bird（初稿あり）／owl／penguin／crab／frog／bee
- **陸の生き物B**: elephant（初稿あり）／giraffe／lion／horse／tiger／monkey

## 担当者から出た要望（未対応。次の波の前に入れると撮り直しが減る）
1. ラボの「すき間が細い」が厳しすぎる: 爪・炎・角の股のような V 字の谷まで数える。向かい合う縁が平行に続く「溝」だけにする（輪郭に沿った距離 ÷ すき間の幅 が大きいものだけ）。
2. 点が少ない部品の段階表示（3点未満=警告／10点未満=注意）。
3. 動きの mirror: 左右の耳・腕を別の位相で振るとき、支点を自動で写す指定（いまは tag/mtag を分けて swing を2本書く）。
4. spine の結びつけ先の範囲指定（曲がりの内側の脚が向かいの胴に結びつく。龍は「部分の背骨の2本目の spine」で回避している）。
5. 細い線（ひげ・角）は1200機で点が2列になり管に見える。線幅が点の間隔より細いときは中心に1列で置く。
6. 同音の言葉（くも・あめ・はな・たこ）は先着1つしか引けない。候補を選べる仕組み。
