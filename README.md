# Fun Sport Nexus タスク推進アプリ

Claudeで作成したタスク管理表を、GitHubに置いてそのまま使える静的Webアプリ構成にしたものです。

## ファイル構成

```text
.
├─ index.html
├─ styles.css
├─ app.js
├─ data/
│  ├─ tasks.js
│  ├─ tasks.json
│  └─ tasks.csv
└─ source/
   └─ FSN_タスク管理表_20260406.xlsx
```

## 使い方

1. このフォルダ一式をGitHubリポジトリに配置
2. `index.html` をルートに置いたまま commit / push
3. GitHub Pages を有効化
4. 公開URLを開く

## GitHub Pages の設定例

- Repository の `Settings`
- `Pages`
- `Build and deployment` の `Source` を **Deploy from a branch**
- Branch を **main** / Folder を **/(root)** に設定
- Save

数十秒〜数分後に公開URLが発行されます。

## データ更新方法

### タスク内容を直接編集したい場合
- `data/tasks.json` を編集
- `data/tasks.js` も同じ内容に更新

`tasks.js` は、ローカルでダブルクリックしても開けるように、JSONをJavaScript変数として読み込むためのファイルです。

### アプリ上で更新した内容について
- ステータス・担当・メモ・追加タスクはブラウザのローカルストレージに保存されます
- 別PCや別ブラウザへ移す場合は、アプリの **JSONバックアップ出力 / 取込** を使ってください

## 補足

- ビルド不要の静的サイトです
- サーバーサイドやDBは未使用です
- 共同編集が必要になったら、次段階で Firebase / Supabase / GitHub Issues 連携に拡張できます

## 初回運用でやること

- GitHub Pages を公開する
- `2026-10 名古屋大学` の High タスクに担当とメモを入れる
- LP / Entry / Sponsor の追加候補タスクを必要分だけ登録する
- JSONバックアップの保存ルールを決める
