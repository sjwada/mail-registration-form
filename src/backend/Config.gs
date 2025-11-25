/**
 * システム設定ファイル
 * 
 * このファイルで各種設定を管理します。
 */

const CONFIG = {
  // ===========================================
  // Spreadsheet設定
  // ===========================================
  SPREADSHEET_ID: '1Erl9e69jX7gCDjKpUE2GbL5UScKg-ZQKjWmnLP4HrgM',
  SHEET_HOUSEHOLD: '世帯マスタ',
  SHEET_GUARDIAN: '保護者',
  SHEET_STUDENT: '生徒',
  
  // ===========================================
  // アクセス制限設定
  // ===========================================
  // URLトークン（変更してください）
  ACCESS_TOKEN: 'secret-token-2025',
  
  // 受付期間
  ALLOW_START_DATE: '2025-04-01',  // YYYY-MM-DD形式
  ALLOW_END_DATE: '2025-12-31',    // YYYY-MM-DD形式
  
  // ===========================================
  // フォーム設定
  // ===========================================
  // 連絡手段フィールドの表示（true: 表示、false: 非表示）
  SHOW_CONTACT_METHOD_FIELD: false,
  
  // 住所の通常時表示（true: 住所を表示、false: 「住所登録済み」とのみ表示）
  SHOW_ADDRESS_IN_NORMAL_MODE: false,
  
  // ===========================================
  // メール設定
  // ===========================================
  // 管理者通知先メールアドレス
  ADMIN_EMAIL: 'admin@example.com',  // ※要変更
  
  // 送信元名
  EMAIL_FROM_NAME: '○○学校 保護者登録システム',  // ※要変更
  
  // ===========================================
  // 郵便番号API設定
  // ===========================================
  POSTAL_CODE_API_URL: 'https://zipcloud.ibsnet.co.jp/api/search',
  
  // ===========================================
  // Magic Link設定
  // ===========================================
  // Magic Linkの有効期限（分）
  MAGIC_LINK_EXPIRY_MINUTES: 30,
  
  // ===========================================
  // システム連携設定（将来使用）
  // ===========================================
  INTEGRATION_ENABLED: false,
  EXTERNAL_SYSTEM_URL: ''
};

/**
 * Spreadsheetオブジェクトを取得
 */
function getSpreadsheet() {
  return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
}

/**
 * 世帯マスタシートを取得
 */
function getHouseholdSheet() {
  return getSpreadsheet().getSheetByName(CONFIG.SHEET_HOUSEHOLD);
}

/**
 * 保護者シートを取得
 */
function getGuardianSheet() {
  return getSpreadsheet().getSheetByName(CONFIG.SHEET_GUARDIAN);
}

/**
 * 生徒シートを取得
 */
function getStudentSheet() {
  return getSpreadsheet().getSheetByName(CONFIG.SHEET_STUDENT);
}
