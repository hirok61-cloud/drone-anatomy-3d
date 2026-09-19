#!/bin/zsh
# 形のラボを画面なしの Chrome で開いて、1枚の画像にする。
#   tools/shapelab.sh <出力.png> "<クエリ>" [幅] [高さ]
#   例: tools/shapelab.sh /tmp/butterfly.png "shape=butterfly"
#       tools/shapelab.sh /tmp/all.png "view=gallery&n=2200" 1500 1400
# 開発サーバー（http://127.0.0.1:8941 がプロジェクト直下を配信）が動いている前提。
# Chrome は撮影のあとも終了しないことがあるので、画像ができたのを見届けてからこちらで止める。
OUT="$1"; Q="$2"
# 既定は小さめの画像（読む量が半分以下で済む）。細部まで見たいときは、クエリに z=1 を足す（1500x1000 になる）
if [[ "$Q" != *"z="* && "$Q" != *"view="* && -z "$3" ]]; then Q="$Q&z=0.66"; W=1010; H=760
elif [[ "$Q" == *"z=1"* && -z "$3" ]]; then W=1500; H=1000
else W="${3:-1500}"; H="${4:-1000}"; fi
if [[ -z "$OUT" || -z "$Q" ]]; then echo "使い方: tools/shapelab.sh <出力.png> \"shape=<id>\" [幅] [高さ]"; exit 2; fi
if ! curl -s -o /dev/null --max-time 3 "http://127.0.0.1:8941/tools/shapelab.html"; then echo "開発サーバー(8941)に届きません"; exit 3; fi
rm -f "$OUT"
UD=$(mktemp -d)
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --no-first-run --no-default-browser-check --disable-background-networking --disable-component-update \
  --user-data-dir="$UD" --window-size=$W,$H --screenshot="$OUT" \
  "http://127.0.0.1:8941/tools/shapelab.html?$Q" >/dev/null 2>&1 &
PID=$!
last=-1
for i in {1..80}; do
  sleep 0.5
  if [[ -s "$OUT" ]]; then sz=$(stat -f %z "$OUT"); if [[ "$sz" == "$last" ]]; then break; fi; last=$sz; fi
  if ! kill -0 $PID 2>/dev/null; then break; fi
done
kill $PID 2>/dev/null; sleep 0.2; kill -9 $PID 2>/dev/null
pkill -f "user-data-dir=$UD" 2>/dev/null
rm -rf "$UD"
[[ -s "$OUT" ]] && echo "保存: $OUT" || { echo "撮影に失敗しました"; exit 4; }
