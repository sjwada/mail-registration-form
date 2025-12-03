# 保護者メールアドレス登録システム

Google Apps Script (GAS) を使用した保護者・生徒情報登録フォームシステム

## プロジェクト概要

学校向けの保護者・生徒情報登録フォーム。
世帯単位で複数の保護者・複数の生徒を登録可能。

## 技術スタック

- **バックエンド**: Google Apps Script (GAS)
- **データベース**: Google Spreadsheet
- **フロントエンド**: HTML5 + CSS3 + JavaScript
- **デプロイ**: Clasp
- **バージョン管理**: Git

## クイックスタート

### コード変更後のデプロイ

```bash
# ビルド + Clasp push（通常）
npm run push

# ビルド + Git add/commit/push（Clasp使用不可の場合）
npm run git-push
```

詳細は [DEVELOPMENT_WORKFLOW.md](DEVELOPMENT_WORKFLOW.md) を参照してください。

## プロジェクト構造

```
mail-registration-form/
├── src/                    # ソースコード（GAS + HTML）
│   ├── Code.js            # メインアプリケーションロジック
│   ├── Config.js          # システム設定
│   ├── DataService.js     # データ操作サービス
│   ├── MailService.js     # メール送信サービス
│   ├── Utils.js           # ユーティリティ関数
│   ├── InitializeSheet.js # スプレッドシート初期化
│   ├── index.html         # 登録フォーム
│   ├── confirm.html       # 確認画面
│   ├── complete.html      # 完了画面
│   ├── style.html         # CSSスタイル
│   ├── script.html        # クライアントサイドJS
│   └── appsscript.json    # GAS設定ファイル
├── .clasp.json            # Clasp設定（gitignore）
├── .gitignore
├── CLASP_SETUP.md         # Claspセットアップ手順
├── SPREADSHEET_SETUP.md   # スプレッドシート設定手順
├── TESTING_GUIDE.md       # テスト手順
├── DEVELOPMENT_WORKFLOW.md # 開発ワークフロー
└── README.md              # このファイル
```

## 機能状況

### ✅ 実装済み（フェーズ 1）

- 新規登録フォーム
- 編集・再登録機能
  - 編集コード認証
  - Magic Link 認証
- メール通知機能
- レスポンシブデザイン（PC/スマホ対応）
- データ保存・更新・削除機能

### 🔄 テスト中

- 各機能の動作確認
- バグ修正

### 📋 予定（フェーズ 2）

- 管理者ダッシュボード
- データ管理・分析機能
- CSV エクスポート

## セットアップ

### 1. 前提条件

- Node.js と npm がインストール済み
- Clasp がインストール済み（`npm install -g @google/clasp`）
- Google アカウント

### 2. Clasp セットアップ

詳細は [CLASP_SETUP.md](CLASP_SETUP.md) を参照してください。

```bash
# Claspにログイン
clasp login

# プロジェクトをクローン（既存のGASプロジェクトがある場合）
clasp clone <スクリプトID>

# または新規作成
clasp create --type standalone --title "保護者メール登録システム"
```

### 3. スプレッドシートの初期化

詳細は [SPREADSHEET_SETUP.md](SPREADSHEET_SETUP.md) を参照してください。

1. `Config.js` の `SPREADSHEET_ID` を設定
2. `clasp push` でコードをアップロード
3. GAS エディタで `initializeSpreadsheet` 関数を実行

### 4. 設定ファイルの編集

`src/Config.js` を編集して以下を設定：

- `SPREADSHEET_ID`: スプレッドシートの ID
- `ACCESS_TOKEN`: アクセストークン
- `ADMIN_EMAIL`: 管理者メールアドレス
- その他の設定項目

### 5. デプロイ

#### テスト環境（開発用）

1. GAS エディタを開く（`clasp open-script`）
2. 「デプロイ」→「新しいデプロイ」
3. 種類：「ウェブアプリ」
4. 説明：「テスト環境」
5. アクセスできるユーザー：「自分のみ」
6. デプロイ URL をメモ

#### 本番環境

1. テスト完了後、同様の手順で本番デプロイを作成
2. アクセスできるユーザー：「全員」
3. デプロイ URL に `?token=<ACCESS_TOKEN>` を付けて配布

## 開発ワークフロー

詳細は [DEVELOPMENT_WORKFLOW.md](DEVELOPMENT_WORKFLOW.md) を参照してください。

```bash
# ローカルで編集後、GASにプッシュ
clasp push

# テストデプロイメントURLでテスト
# 変更は即座に反映されます

# GASエディタを開く
clasp open-script

# GASからローカルに反映（必要に応じて）
clasp pull
```

## テスト

詳細は [TESTING_GUIDE.md](TESTING_GUIDE.md) を参照してください。

主なテスト項目：

- 新規登録フロー
- 編集フロー（編集コード認証）
- Magic Link フロー
- メール送信機能
- データ保存・更新・削除

## ライセンス

Private
