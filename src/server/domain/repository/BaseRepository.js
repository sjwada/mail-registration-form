/**
 * Base Repository
 * 共通のデータアクセスロジックを提供
 */

/**
 * 指定されたIDの最新バージョン番号を取得
 * @param {string} sheetName - シート名
 * @param {number} idColumn - ID列のインデックス
 * @param {string} id - 検索するID
 * @return {number} 最新バージョン番号（見つからない場合は0）
 */
function getLatestVersion(sheetName, idColumn, id) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  let maxVersion = 0;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[idColumn] === id) {
      const version = row[row.length - 4]; // バージョン列（後ろから4番目）
      if (version > maxVersion) {
        maxVersion = version;
      }
    }
  }

  return maxVersion;
}

/**
 * 最新バージョンかつ削除されていないレコードのみをフィルタ
 * @param {Array} records - レコード配列
 * @param {string} idField - ID フィールド名
 * @return {Array} フィルタされたレコード配列
 */
function filterLatestRecords(records, idField) {
  const latestRecords = {};

  // 1. 各IDの最新バージョンを特定
  records.forEach(record => {
    const id = record[idField];
    const version = record.version;

    if (!latestRecords[id] || latestRecords[id].version < version) {
      latestRecords[id] = record;
    }
  });

  // 2. 削除フラグが立っているレコードを除外して配列に戻す
  return Object.values(latestRecords).filter(record => !record.deleted);
}

/**
 * レコードを論理削除（削除フラグを立てた新バージョンを追加）
 * @param {string} sheetName - シート名
 * @param {number} idColumn - ID列のインデックス
 * @param {string} id - 削除するレコードのID
 * @param {string} userEmail - 更新者のメールアドレス
 */
function markAsDeleted(sheetName, idColumn, id, userEmail) {
  const latestVersion = getLatestVersion(sheetName, idColumn, id);
  const newVersion = latestVersion + 1;
  const now = formatDateTime(getCurrentDateTime());

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();

  // 最新バージョンのレコードを見つける
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[idColumn] === id && row[row.length - 4] === latestVersion) {
      // 既存データをコピーして新バージョンとして追加
      const newRow = [...row];
      newRow[newRow.length - 4] = newVersion; // バージョン
      newRow[newRow.length - 3] = true; // 削除フラグ
      newRow[newRow.length - 2] = now; // 更新日時
      newRow[newRow.length - 1] = userEmail; // 更新者メール
      sheet.appendRow(newRow);
      break;
    }
  }
}
