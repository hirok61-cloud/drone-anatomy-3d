# ドローンの構造 — 3Dビジュアライザー

550クラスのクアッドコプターを部品単位で分解・透視・断面表示できる、単一HTMLの3D教材。
モデルは外部ファイルを使わず、すべて three.js のコードから手続き的に生成しています。

**公開URL**: https://drone-anatomy-3d.hiro-k61.workers.dev/

## できること

- **部品をクリックすると解説**（役割・構造・仕様例・点検ポイント）。全40種
- **分解スライダー** — 組み立て順に部品が離れていく
- **4つの表示モード** — 通常 / X線 / 線画 / 断面（モーター内部とバッテリーのセルが見える）
- **飛行の原理** — ホバリング・上昇・前進・横移動・旋回で、各モーターの増減速を矢印と％で可視化
- 単独表示・非表示、視点プリセット、ラベル、ライト/ダーク対応、スマホ対応

## 構成

| パス | 役割 |
| --- | --- |
| `src/data.js` | 部品の解説テキストと仕様値、飛行モードの定義 |
| `src/materials.js` | 手続き生成テクスチャ（カーボン綾織・基板・ラベル）と材質 |
| `src/drone.js` | 全部品のジオメトリ生成と組み立て |
| `src/app.js` | 描画・ポストプロセス・操作・UI |
| `src/style.css`, `src/index.html` | スタイルとテンプレート |
| `public/index.html` | **生成物**。これをCloudflareが配信する |
| `artifact.html` | **生成物**。Claude Artifact 用の本文断片 |

`src/` を編集して `python3 build.py` を実行すると、2つの生成物が作り直されます。
**生成物を直接編集しないこと。**

## 開発

```sh
python3 build.py
python3 -m http.server 8941 --directory public
```

## デプロイ

`main` への push で Cloudflare Workers に自動デプロイされます。手動で上げる場合:

```sh
npx wrangler@latest deploy
```

### デプロイ

`main` に push すると **Cloudflare Workers Builds** が自動でデプロイする（2026-09-11 接続済み）。

- ビルドコマンドは**空**。このリポジトリに `package.json` は無く、`public/index.html` は
  コミット済みの生成物をそのまま配信する
- デプロイコマンドは `npx wrangler deploy`、ルートディレクトリは `/`
- 手動で上げたいときは `npx wrangler@latest deploy`

`src/` を直したのに `python3 build.py` を忘れると、**古い `public/index.html` がそのまま
デプロイされてしまう**。これを防ぐため GitHub Actions（`.github/workflows/deploy.yml`）が
push のたびに再ビルドして差分が無いか検査する。差分があれば赤バツで知らせる。
このワークフローは検査専用で、デプロイはしない（`CLOUDFLARE_API_TOKEN` 未設定のため）。

## 授業・説明会モード
- `?lesson=class45`（45分授業）/ `?lesson=town10`（10分住民説明会）で台本つきで開きます。`&step=N` で途中の段落から。設定 › 授業・説明会 からも開始できます。
