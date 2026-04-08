# projectall GitHub Project + Pages integration

このフォルダは、`projectall` リポジトリを **GitHub Project を正本**、**GitHub Pages を表示専用**にするための追加ファイル一式です。

## 含まれるもの
- `.github/ISSUE_TEMPLATE/fsn-task.yml`
- `.github/workflows/export-project-to-json.yml`
- `.github/workflows/deploy-pages.yml`
- `scripts/export_project.py`
- `docs/data/tasks.json`
- `docs/app.js`
- `PROJECT_SETUP.md`

## 導入手順
1. この一式を `projectall` の対応パスへ配置
2. GitHub Project を作成
3. Variables / Secret を設定
4. GitHub Pages を `GitHub Actions` に変更
5. `Export Project to JSON` を手動実行
6. `Deploy Pages` を実行

## 補足
- `docs/app.js` は最小例です。既存の表示ロジックがある場合は、`loadTasks()` の部分だけ置き換えてください。
- 既存IssueのProject追加は初回のみ手動対応です。
