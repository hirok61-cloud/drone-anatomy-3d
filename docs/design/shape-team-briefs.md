# 形づくりの分担と指示（続きから再開するための控え）

書式と作法は `shape-authoring.md`。ここには「誰に何を作らせるか」を残す。
**同時に動かすのは4名まで**（12名同時で5時間枠を使い切り、全員が途中で落ちた）。形づくりは Opus、主役級だけ最上位モデル。
担当者への指示には必ず入れる: 最初に手引きとお手本(butterfly/snake)を読む／作ってよいのは `src/shapes/<担当id>.json` と `docs/review/shapes/<担当id>.png` だけ／
エンジン・ラボ・ほかの形・git・サーバーに触れない／1形につき4〜7回撮って直す（大きい画像 z=1 は仕上げだけ）／特定作品のキャラクターに似せない／
ほかの形と言葉を重ねない（全体の一覧を渡す）／報告は形ごとに 動き・自己評価(5点)・弱点・エンジンへの要望。

## できたもの（2026-09-20 時点で 68種＋言葉の表 350行）
第1波: dragon, dragon_rise, butterfly, snake ／ whale, dolphin, fish, turtle, octopus, jellyfish ／ cat, dog, rabbit, fox, bear, panda ／ words.tsv
第2波: fireworks, xmastree, present, cake, pumpkin, koinobori, torii, fuji ／ ninja, robot, ghost, witch, alien, angel, dinosaur, unicorn ／ rocket, airplane, helicopter, car, train, ship ／ ufo, saturn, earth, moon, astronaut, sun, rainbow
第3波: heart, star, note, crown, smile, balloon, daruma, wave ／ sakura, sunflower, tulip, maple, tree, clover, snowflake, snowman ／ bird, owl, penguin, crab, frog, bee, elephant
担当者の自己評価で弱めのもの（直しの候補）: helicopter(4.0・胴が丸パン) / bee(3.5・蜂と断定しにくい) / daruma(4.0) / ninja(4.0) / unicorn(4.0・脚が柱) / dragon_rise(3.5)

## まだ作っていないもの
- **大きな動物**: giraffe, lion, horse, tiger, monkey（絵文字の形で読めるので後回しにした）
- 追加の候補: knight きし／pirate かいぞく／mermaid にんぎょ／samurai さむらい／phoenix ほうおう／penguin 以外の季節もの（かどまつ・ひなまつり・たなばた）

## 担当者から出た要望
対応済み: すき間の検査は溝だけ／10点未満の参考表示／動きの mirror／spine の bind／細い線は中心1列／報告だけモード(--report)／b の色相くずれ／gallery の ids 指定
### 未対応
1. ラボの「すき間が細い」が厳しすぎる: 爪・炎・角の股のような V 字の谷まで数える。向かい合う縁が平行に続く「溝」だけにする（輪郭に沿った距離 ÷ すき間の幅 が大きいものだけ）。
2. 点が少ない部品の段階表示（3点未満=警告／10点未満=注意）。
3. 動きの mirror: 左右の耳・腕を別の位相で振るとき、支点を自動で写す指定（いまは tag/mtag を分けて swing を2本書く）。
4. spine の結びつけ先の範囲指定（曲がりの内側の脚が向かいの胴に結びつく。龍は「部分の背骨の2本目の spine」で回避している）。
5. 細い線（ひげ・角）は1200機で点が2列になり管に見える。線幅が点の間隔より細いときは中心に1列で置く。
6. 同音の言葉（くも・あめ・はな・たこ）は先着1つしか引けない。候補を選べる仕組み。
7. 閉じた曲線の band / fins（土星の輪・太陽の光を1部品で書きたい。いまは半分ずつ2本、または star で代用）。
8. 線(s/sw)にグラデーション。band の端のまるめ。
9. `edge:false` のつなぎ用部品に機体を割り当てない指定（merge）。
10. --report に「最小すき間の実測値」「部品ごとの輪郭の点の数」。
