# Spreadsheet初期化手順

## ステップ2：Spreadsheet初期化

### 手順

1. **GASエディタを開く**
   ```
   https://script.google.com/home/projects/1uHUskvQbgkvgGIxXKkJaaT8Xshb8yhCaieMtN8ttFWoUEmA_zUSzdiC2/edit
   ```

2. **InitializeSheet.gsを選択**
   - 左側のファイル一覧から `InitializeSheet.gs` をクリック

3. **関数を選択**
   - 上部の関数ドロップダウン（「関数を選択」と表示されている）をクリック
   - `initializeSpreadsheet` を選択

4. **実行**
   - 「実行」ボタン（▶️）をクリック

5. **権限の承認（初回のみ）**
   - 「承認が必要です」と表示されたら、「権限を確認」をクリック
   - Googleアカウントを選択
   - 「このアプリは確認されていません」と表示される場合：
     - 「詳細」をクリック
     - 「○○（安全ではないページ）に移動」をクリック
   - 「許可」をクリック

6. **実行完了を確認**
   - 実行ログに「Spreadsheetの初期化が完了しました」と表示される

7. **Spreadsheetを確認**
   ```
   https://docs.google.com/spreadsheets/d/1Erl9e69jX7gCDjKpUE2GbL5UScKg-ZQKjWmnLP4HrgM/edit
   ```
   
   以下の3つのシートが作成されていることを確認：
   - 世帯マスタ
   - 保護者
   - 生徒
   
   各シートに適切なヘッダー行があることを確認

## 完了したら

「初期化完了しました」とお知らせください。
次のステップ（Webアプリとしてデプロイ）に進みます。
