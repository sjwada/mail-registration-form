# Clasp 認証エラーの解決方法

## 問題
`clasp push`実行時に以下のエラーが発生：
```
{"error":"invalid_grant","error_description":"reauth related error (invalid_rapt)"}
```

## 原因
Claspの認証トークンの有効期限切れまたは権限の問題。Google Workspaceアカウント（mebio-labo.com）での認証に再認証が必要です。

## 解決手順

### 1. ログアウト
```powershell
clasp logout
```

### 2. 再ログイン
```powershell
clasp login
```

ブラウザが開くので、**mebio-labo.comアカウント**でログインしてください。

### 3. 権限の確認
ログイン時に以下の権限を承認する必要があります：
- Google Apps Scriptプロジェクトへのアクセス
- Google Driveへのアクセス

### 4. 動作確認
```powershell
clasp push --force
```

## 注意事項
- Google Workspaceアカウントでログインすること（個人Googleアカウントではない）
- 組織のセキュリティポリシーで外部アプリの接続が制限されている場合、IT管理者に確認が必要
- 2段階認証が有効な場合、認証コードの入力が必要

## トラブルシューティング

### それでもエラーが出る場合
1. `~/.clasprc.json`ファイルを削除
   ```powershell
   Remove-Item $env:USERPROFILE\.clasprc.json -Force
   ```

2. 再度ログイン
   ```powershell
   clasp login
   ```

3. Google Apps Script APIが有効になっているか確認
   https://script.google.com/home/usersettings
   「Google Apps Script API」がONになっていることを確認
