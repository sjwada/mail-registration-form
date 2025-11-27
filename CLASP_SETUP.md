# Clasp セットアップ手順

## 前提条件
- Claspがインストール済み（確認済み：v3.0.6-alpha）
- Googleアカウントでログイン済み

## 手順

### 1. Claspにログイン（初回のみ）
```bash
clasp login
```
ブラウザが開くので、Googleアカウントで認証してください。

### 2. GASプロジェクトを作成
SpreadsheetのGASエディタで新しいプロジェクトを作成済みの場合：

#### 方法A: 既存のGASプロジェクトと連携（推奨）
1. SpreadsheetのGASエディタを開く
2. **プロジェクトの設定**（歯車アイコン）をクリック
3. **スクリプトID**をコピー
4. ローカルで以下を実行：
```bash
cd C:\Users\s-wada\GitHub\mail-registration-form
clasp clone <スクリプトID>
```

#### 方法B: 新しいGASプロジェクトを作成
```bash
cd C:\Users\s-wada\GitHub\mail-registration-form
clasp create --type standalone --title "保護者メール登録システム"
```

### 3. .clasp.jsonを設定
Cloneまたはcreateが成功すると、`.clasp.json`が自動生成されます。

内容を確認：
```json
{
  "scriptId": "YOUR_SCRIPT_ID",
  "rootDir": "./src"
}
```

rootDirを設定することで、src配下のファイルのみをGASにpushできます。

### 4. ファイルをGASにpush
```bash
clasp push
```

初回pushの確認メッセージが出たら `y` を入力。

### 5. GASエディタで確認
```bash
clasp open-script
```

ブラウザでGASエディタが開き、pushしたファイルが表示されます。

### 6. SpreadsheetにGASプロジェクトを紐付け（方法Bの場合のみ）

GASエディタで：
1. 「Resources」→「Advanced Google Services」で必要なAPIを有効化
2. Spreadsheetと紐付けるため、SpreadsheetのIDをConfig.gsに設定済み

---

## 日常的な開発フロー

### ローカルで編集 → GASにデプロイ
```bash
# ファイルを編集後
clasp push
```

### GASで編集 → ローカルに反映
```bash
clasp pull
```

### GASエディタを開く
```bash
clasp open-script
```

### デプロイ（Webアプリとして公開）
```bash
clasp deploy
```

---

## トラブルシューティング

### エラー: "User has not enabled the Apps Script API"
1. https://script.google.com/home/usersettings にアクセス
2. "Google Apps Script API" をONにする

### .clasp.jsonが見つからない
Cloneまたはcreateを実行してください。

---

次のステップ：
1. 上記の方法AまたはBでClaspセットアップ
2. `clasp push`でファイルをGASにアップロード
3. GASエディタで動作確認
