/**
 * メールサービス
 * 各種メール送信を担当
 */

/**
 * 確認メールを送信（登録完了時）
 * @param {string} email - 送信先メールアドレス
 * @param {object} householdData - 世帯データ
 * @param {string} editCode - 編集コード
 */
function sendConfirmationEmail(email, householdData, editCode) {
  const subject = `【${CONFIG.EMAIL_FROM_NAME}】登録完了のお知らせ`;

  const body = `
ご登録ありがとうございます。

以下の編集コードは、登録内容を変更する際に必要です。
大切に保管してください。

編集コード: ${editCode}

【ご登録内容】
${formatHouseholdSummary(householdData)}

--------------------------------
このメールに心当たりがない場合は、お手数ですが削除してください。

${CONFIG.EMAIL_FROM_NAME}
  `.trim();

  GmailApp.sendEmail(email, subject, body);
  Logger.log(`確認メールを送信しました: ${email}`);
}

/**
 * 管理者通知メールを送信（新規登録時）
 * @param {object} householdData - 世帯データ
 */
function sendAdminNotificationEmail(householdData) {
  const subject = `【新規登録】保護者情報が登録されました`;

  const body = `
新しい保護者情報が登録されました。

${formatHouseholdDetail(householdData)}

Spreadsheetを確認してください：
https://docs.google.com/spreadsheets/d/${CONFIG.SPREADSHEET_ID}/edit

--------------------------------
${CONFIG.EMAIL_FROM_NAME}
  `.trim();

  GmailApp.sendEmail(CONFIG.ADMIN_EMAIL, subject, body);
  Logger.log(`管理者通知メールを送信しました: ${CONFIG.ADMIN_EMAIL}`);
}

/**
 * 編集完了通知メールを送信（全保護者宛）
 * @param {Array} guardians - 保護者の配列
 * @param {Date} updatedAt - 更新日時
 */
function sendEditNotificationEmails(guardians, updatedAt) {
  const subject = `【${CONFIG.EMAIL_FROM_NAME}】登録内容が変更されました`;

  const updatedAtStr = formatDateTime(updatedAt);

  const body = `
登録内容が変更されました。

変更日時: ${updatedAtStr}

ご自身で変更された場合は、このメールは無視してください。

心当たりがない場合は、お手数ですが下記までお問い合わせください。
${CONFIG.ADMIN_EMAIL}

--------------------------------
${CONFIG.EMAIL_FROM_NAME}
  `.trim();

  guardians.forEach(guardian => {
    if (guardian.email) {
      GmailApp.sendEmail(guardian.email, subject, body);
      Logger.log(`編集通知メールを送信しました: ${guardian.email}`);
    }
  });
}

/**
 * Magic Link送信
 * @param {string} email - 送信先メールアドレス
 * @param {string} token - Magic Linkトークン
 */
function sendMagicLinkEmail(email, token) {
  const expiryTime = new Date();
  expiryTime.setMinutes(expiryTime.getMinutes() + CONFIG.MAGIC_LINK_EXPIRY_MINUTES);
  const expiryTimeStr = formatDateTime(expiryTime);

  const magicLinkUrl = `${CONFIG.DEPLOYMENT_URL}?edit=${token}&expires=${expiryTime.getTime()}`;

  const subject = `【${CONFIG.EMAIL_FROM_NAME}】編集リンクの送信`;

  const body = `
登録内容を編集するためのリンクです。

以下のリンクをクリックして編集画面にアクセスしてください。

${magicLinkUrl}

有効期限: ${expiryTimeStr}（${CONFIG.MAGIC_LINK_EXPIRY_MINUTES}分間有効）

このリンクは一度のみ使用できます。

--------------------------------
このメールに心当たりがない場合は、お手数ですが削除してください。

${CONFIG.EMAIL_FROM_NAME}
  `.trim();

  GmailApp.sendEmail(email, subject, body);
  Logger.log(`Magic Linkを送信しました: ${email}`);
}

/**
 * 世帯データのサマリーをフォーマット（確認メール用）
 * @param {object} householdData - 世帯データ
 * @return {string} フォーマットされた文字列
 */
function formatHouseholdSummary(householdData) {
  let summary = '';

  // 保護者
  const guardianNames = householdData.guardians.map(g =>
    `${g.lastName} ${g.firstName}様（${g.relationship}）`
  ).join('、');
  summary += `保護者: ${guardianNames}\n`;

  // 生徒
  const studentNames = householdData.students.map(s =>
    `${s.lastName} ${s.firstName}様（${s.graduationYear}年卒業予定）`
  ).join('、');
  summary += `生徒: ${studentNames}`;

  return summary;
}

/**
 * 世帯データの詳細をフォーマット（管理者通知用）
 * @param {object} householdData - 世帯データ
 * @return {string} フォーマットされた文字列
 */
function formatHouseholdDetail(householdData) {
  let detail = '';

  // 世帯情報
  detail += `【世帯情報】\n`;
  detail += `世帯登録番号: ${householdData.household.householdId}\n`;
  detail += `住所: 〒${householdData.household.postalCode}\n`;
  detail += `      ${householdData.household.prefecture}${householdData.household.city}${householdData.household.street}\n`;
  if (householdData.household.building) {
    detail += `      ${householdData.household.building}\n`;
  }
  detail += `\n`;

  // 保護者
  detail += `【保護者】\n`;
  householdData.guardians.forEach((g, index) => {
    detail += `${index + 1}. ${g.lastName} ${g.firstName}（${g.lastNameKana} ${g.firstNameKana}）\n`;
    detail += `   続柄: ${g.relationship}\n`;
    detail += `   優先順位: ${g.contactPriority}\n`;
    detail += `   メール: ${g.email}\n`;
    detail += `   携帯: ${g.mobilePhone || '未登録'}, 自宅: ${g.homePhone || '未登録'}\n`;
  });
  detail += `\n`;

  // 生徒
  detail += `【生徒】\n`;
  householdData.students.forEach((s, index) => {
    detail += `${index + 1}. ${s.lastName} ${s.firstName}（${s.lastNameKana} ${s.firstNameKana}）\n`;
    detail += `   卒業予定: ${s.graduationYear}年\n`;
    detail += `   メール: ${s.email}\n`;
    detail += `   携帯: ${s.mobilePhone || '未登録'}\n`;
  });

  return detail;
}
