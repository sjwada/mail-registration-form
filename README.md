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

## 主要機能

### フェーズ1（実装中）
- 新規登録フォーム
- 編集・再登録機能
- メール通知機能
- レスポンシブデザイン（PC/スマホ対応）

### フェーズ2（予定）
- 管理者ダッシュボード
- データ管理・分析機能
- CSVエクスポート

## プロジェクト構造

```
mail-registration-form/
├── src/
│   ├── backend/           # GAS バックエンド
│   │   ├── Code.gs
│   │   ├── Config.gs
│   │   ├── DataService.gs
│   │   └── MailService.gs
│   └── frontend/          # HTML/CSS/JS フロントエンド
│       ├── index.html
│       ├── confirm.html
│       ├── complete.html
│       ├── css/
│       └── js/
├── .clasp.json
├── .gitignore
├── appsscript.json
└── README.md
```

## セットアップ

（セットアップ手順は環境構築完了後に追記）

## ライセンス

Private
