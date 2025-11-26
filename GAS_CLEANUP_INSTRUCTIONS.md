# GASファイル削除手順

## 問題
GAS側に古い階層構造のファイルが残っており、新しいフラット構造のファイルとの競合が発生しています。

## エラー内容
```
Exception: 「index」という HTML ファイルは見つかりませんでした。
（行 46、ファイル「src/backend/Code」）
```

## 解決手順

### 1. GASエディタを開く
https://script.google.com/home/projects/1uHUskvQbgkvgGIxXKkJaaT8Xshb8yhCaieMtN8ttFWoUEmA_zUSzdiC2/edit

### 2. 古いファイルを削除
左側のファイルリストで、以下のファイルパターンを**すべて削除**してください：
- `backend/`で始まるすべてのファイル
  - `backend/Code.gs`
  - `backend/Config.gs`
  - `backend/DataService.gs`
  - `backend/InitializeSheet.gs`
  - `backend/MailService.gs`
  - `backend/Utils.gs`
- `frontend/`で始まるすべてのファイル
  - `frontend/index.html`
  - `frontend/confirm.html`  
  - `frontend/complete.html`
  - `frontend/css/style.html`
  - `frontend/js/script.html`

### 3. 確認  
削除後、以下のファイルだけが残っているはずです：
- `Code.gs` (階層なし)
- `Config.gs`
- `DataService.gs`
- `InitializeSheet.gs`
- `MailService.gs`
- `Utils.gs`
- `index.html`
- `confirm.html`
- `complete.html`
- `style.html`
- `script.html`
- `appsscript.json`

### 4. 再プッシュ
削除完了後、私が`clasp push --force`を実行します。
