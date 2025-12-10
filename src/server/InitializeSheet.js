/**
 * Spreadsheet初期化スクリプト
 * 
 * このスクリプトをGASエディタで実行すると、
 * 3つのシートにヘッダー行を自動設定します。
 */

function initializeSpreadsheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 3つのシートを作成（既存シートを削除する前に）
  createHouseholdSheet(ss);
  createGuardianSheet(ss);
  createStudentSheet(ss);

  // 古いシートを削除（新しい3つのシート以外）
  const allSheets = ss.getSheets();
  const newSheetNames = ['世帯マスタ', '保護者', '生徒'];
  allSheets.forEach(sheet => {
    if (!newSheetNames.includes(sheet.getName())) {
      ss.deleteSheet(sheet);
    }
  });

  Logger.log('Spreadsheetの初期化が完了しました');
}

/**
 * 世帯マスタシートを作成
 */
function createHouseholdSheet(ss) {
  const sheet = ss.insertSheet('世帯マスタ');

  const headers = [
    '世帯登録番号',
    '基幹世帯ID',
    '登録日時',
    '最終更新日時',
    '編集コード',
    'ログイン用メールアドレス',
    '備考',
    '連携ステータス',
    'バージョン',
    '削除フラグ',
    '更新日時',
    '更新者メール'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);

  Logger.log('世帯マスタシートを作成しました');
}

/**
 * 保護者シートを作成
 */
function createGuardianSheet(ss) {
  const sheet = ss.insertSheet('保護者');

  const headers = [
    '世帯登録番号',
    '保護者登録番号',
    '基幹保護者ID',
    '続柄',
    '続柄その他詳細',
    '連絡優先順位',
    '連絡手段',
    '姓',
    '名',
    'フリガナ姓',
    'フリガナ名',
    '連絡用メール',
    'オンライン面談用メール',
    '携帯電話番号',
    '自宅電話番号',
    '保護者郵便番号',
    '保護者都道府県',
    '保護者市区町村',
    '保護者町名・番地・号',
    '保護者建物名・部屋番号',
    'バージョン',
    '削除フラグ',
    '更新日時',
    '更新者メール'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);

  Logger.log('保護者シートを作成しました');
}

/**
 * 生徒シートを作成
 */
function createStudentSheet(ss) {
  const sheet = ss.insertSheet('生徒');

  const headers = [
    '世帯登録番号',
    '生徒登録番号',
    '基幹生徒ID',
    '姓',
    '名',
    'フリガナ姓',
    'フリガナ名',
    '高校卒業予定年',
    '連絡用メール',
    'オンライン授業用メール',
    '携帯電話番号',
    '住所フラグ',
    '生徒郵便番号',
    '生徒都道府県',
    '生徒市区町村',
    '生徒町名・番地・号',
    '生徒建物名・部屋番号',
    'バージョン',
    '削除フラグ',
    '更新日時',
    '更新者メール'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);

  Logger.log('生徒シートを作成しました');
}
