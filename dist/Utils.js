/**
 * ユーティリティ関数
 */

/**
 * 一意のIDを生成
 * @param {string} prefix - プレフィックス（例: 'HH', 'G', 'S'）
 * @param {number} sequenceNumber - 連番
 * @return {string} 生成されたID
 */
function generateId(prefix, sequenceNumber) {
  return prefix + String(sequenceNumber).padStart(5, '0');
}

/**
 * 編集コードを生成（小文字英数字6桁）
 * @return {string} 編集コード
 */
function generateEditCode() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Magic Linkトークンを生成
 * @return {string} トークン
 */
function generateMagicLinkToken() {
  return Utilities.getUuid();
}

/**
 * 現在日時を取得
 * @return {Date} 現在日時
 */
function getCurrentDateTime() {
  return new Date();
}

/**
 * 日付を文字列に変換
 * @param {Date} date - 日付オブジェクト
 * @return {string} YYYY-MM-DD HH:mm:ss形式の文字列
 */
function formatDateTime(date) {
  return Utilities.formatDate(date, 'Asia/Tokyo', 'yyyy-MM-dd HH:mm:ss');
}

/**
 * メールアドレスの形式チェック
 * @param {string} email - メールアドレス
 * @return {boolean} 正しい形式ならtrue
 */
function isValidEmail(email) {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 電話番号の形式チェック（ハイフン含む）
 * @param {string} phone - 電話番号
 * @return {boolean} 正しい形式ならtrue
 */
function isValidPhone(phone) {
  if (!phone) return false;
  const phoneRegex = /^[0-9]{2,4}-[0-9]{2,4}-[0-9]{3,4}$/;
  return phoneRegex.test(phone);
}

/**
 * フリガナの形式チェック（カタカナのみ）
 * @param {string} kana - フリガナ
 * @return {boolean} カタカナのみならtrue
 */
function isValidKana(kana) {
  if (!kana) return false;
  const kanaRegex = /^[ァ-ヶー]+$/;
  return kanaRegex.test(kana);
}

/**
 * 住所の正規化（全角数字・ハイフン・長音を半角に変換）
 * @param {string} text - 住所テキスト
 * @return {string} 正規化されたテキスト
 */
function normalizeAddress(text) {
  if (!text) return text;
  
  // 全角数字を半角に変換
  text = text.replace(/[０-９]/g, function(s) {
    return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
  });
  
  // 全角ハイフンを半角に変換
  text = text.replace(/[－―‐]/g, '-');
  
  // 数字の間の長音記号を半角ハイフンに変換
  text = text.replace(/([0-9０-９])ー([0-9０-９])/g, '$1-$2');
  
  return text;
}

/**
 * アクセス期間チェック
 * @return {boolean} 受付期間内ならtrue
 */
function isAccessPeriodValid() {
  const now = new Date();
  const startDate = new Date(CONFIG.ALLOW_START_DATE);
  const endDate = new Date(CONFIG.ALLOW_END_DATE);
  endDate.setHours(23, 59, 59, 999); // 終了日の23:59:59まで有効
  
  return now >= startDate && now <= endDate;
}

/**
 * URLトークンチェック
 * @param {string} token - URLトークン
 * @return {boolean} 正しいトークンならtrue
 */
function isValidToken(token) {
  return token === CONFIG.ACCESS_TOKEN;
}

/**
 * HTMLテンプレート内で別のファイルをインクルードするための関数
 * @param {string} filename - ファイル名
 * @return {string} ファイルの内容
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
