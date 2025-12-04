/**
 * Guardian Repository
 * 保護者データの操作を担当
 */

/**
 * 新しい保護者登録番号を生成
 * @return {string} 保護者登録番号
 */
function generateGuardianId() {
  const sheet = getGuardianSheet();
  const data = sheet.getDataRange().getValues();
  let maxId = 0;

  // ヘッダー行(1行目)をスキップ
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const idStr = row[1]; // G00001形式
    if (idStr && idStr.startsWith('G')) {
      const num = parseInt(idStr.substring(1), 10);
      if (!isNaN(num) && num > maxId) {
        maxId = num;
      }
    }
  }

  return generateId('G', maxId + 1);
}

/**
 * 世帯に属する保護者を取得
 * @param {string} householdId - 世帯登録番号
 * @return {Array} 保護者の配列
 */
function getGuardiansByHousehold(householdId) {
  const sheet = getGuardianSheet();
  const data = sheet.getDataRange().getValues();
  const guardians = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0] === householdId) {
      guardians.push({
        householdId: row[0],
        guardianId: row[1],
        coreGuardianId: row[2],
        relationship: row[3],
        relationshipOther: row[4],
        contactPriority: row[5],
        contactMethod: row[6],
        lastName: row[7],
        firstName: row[8],
        lastNameKana: row[9],
        firstNameKana: row[10],
        email: row[11],
        meetingEmail: row[12],
        mobilePhone: row[13],
        homePhone: row[14],
        postalCode: row[15],
        prefecture: row[16],
        city: row[17],
        street: row[18],
        building: row[19],
        version: row[20],
        deleted: row[21]
      });
    }
  }

  // 最新バージョンかつ削除されていないレコードのみを返す
  return filterLatestRecords(guardians, 'guardianId');
}

/**
 * 保護者レコードを保存
 * @param {string} householdId - 世帯登録番号
 * @param {object} guardian - 保護者データ
 * @param {string} userEmail - 更新者メール
 * @param {number} version - バージョン
 * @param {boolean} deleted - 削除フラグ
 */
function saveGuardianRecord(householdId, guardian, userEmail, version, deleted) {
  const sheet = getGuardianSheet();
  const guardianId = guardian.guardianId || generateGuardianId();
  const now = formatDateTime(getCurrentDateTime());

  const nextRow = sheet.getLastRow() + 1;
  
  // 携帯電話(N列: 14番目)、自宅電話(O列: 15番目)、郵便番号(P列: 16番目)の書式をテキストに設定
  sheet.getRange(nextRow, 14, 1, 3).setNumberFormat('@');

  const rowData = [
    householdId,
    guardianId,
    '', // 基幹保護者ID
    guardian.relationship,
    guardian.relationshipOther || '',
    guardian.contactPriority,
    guardian.contactMethod || '電話',
    guardian.lastName,
    guardian.firstName,
    guardian.lastNameKana,
    guardian.firstNameKana,
    guardian.email,
    guardian.meetingEmail || '',
    guardian.mobilePhone || '',
    guardian.homePhone || '',
    guardian.postalCode || '',
    guardian.prefecture || '',
    normalizeAddress(guardian.city || ''),
    normalizeAddress(guardian.street || ''),
    normalizeAddress(guardian.building || ''),
    version || 1, // バージョン
    deleted || false, // 削除フラグ
    now, // 更新日時
    userEmail || guardian.email // 更新者メール
  ];

  sheet.getRange(nextRow, 1, 1, rowData.length).setValues([rowData]);

  return guardianId;
}

/**
 * 指定された保護者リストに含まれない保護者を論理削除
 * @param {string} householdId - 世帯ID
 * @param {Array} currentGuardians - 現在（更新後）の保護者リスト
 * @param {string} userEmail - 更新者メール
 * @param {number} newVersion - 新しいバージョン番号
 */
function softDeleteGuardiansNotInList(householdId, currentGuardians, userEmail, newVersion) {
  const existingGuardians = getGuardiansByHousehold(householdId);
  const currentGuardianIds = currentGuardians.map(g => g.guardianId).filter(id => id);

  existingGuardians.forEach(existing => {
    if (!currentGuardianIds.includes(existing.guardianId)) {
      // 削除された保護者として保存
      saveGuardianRecord(householdId, existing, userEmail, newVersion, true);
    }
  });
}
