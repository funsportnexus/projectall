# projectall セットアップ手順

## 1. GitHub Project を作成
- タイトル例: `fun sport nexus master`
- repo: `funsportnexus/projectall`

## 2. Project フィールドを追加
### Event
- 2026-03 オリセン（実績）
- 2026-10 名古屋大学
- 2026-12 オリセン
- Common

### Category
- Program
- Partner
- Venue
- Operation
- PR
- LP
- Entry
- Survey
- Sponsor
- Admin

### Priority
- High
- Medium
- Low

### Status
- Backlog
- Ready
- In Progress
- Waiting External
- Blocked
- Done

### Phase
- Planning
- Confirming
- Producing
- Recruiting
- Operating
- Review

### Source
- New
- From 2026-03 asset
- External request
- Internal request

### 追加フィールド
- Due: Date
- Owner: Text
- Notes: Text

## 3. 推奨ビュー
### Master Table
- Layout: Table
- Group: Event
- Sort: Due asc

### Board
- Layout: Board
- Column: Status
- Filter: `is:issue`

### 2026-10 名古屋大学
- Filter: `is:issue Event:"2026-10 名古屋大学"`

### 2026-12 オリセン
- Filter: `is:issue Event:"2026-12 オリセン"`

### High Priority Open
- Filter: `is:issue Priority:High -Status:Done`

## 4. Auto-add 設定
- repo: `funsportnexus/projectall`
- filter: `is:issue` または `is:issue label:"fsn"`

## 5. Actions Variables / Secrets
### Variables
- `PROJECT_OWNER` = `funsportnexus`
- `PROJECT_NUMBER` = 作成した Project の番号

### Secret
- `PROJECT_READ_TOKEN` = fine-grained PAT
  - Repository access: `projectall`
  - Permissions:
    - Issues: Read
    - Metadata: Read
    - Projects: Read

## 6. GitHub Pages 設定
- Settings > Pages > Source を `GitHub Actions` に変更

## 7. 初回実行
- `Export Project to JSON` を手動実行
- `Deploy Pages` を実行

## 注意
- Auto-add は既存Issueには遡及しません
- 既存Issueは初回のみ手動で Project に追加してください
- `docs/app.js` は既存アプリの差し替え用の最小例です
