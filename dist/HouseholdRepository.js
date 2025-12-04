/**
 * Household Repository
 * 世帯データの操作を担当
 */

/**
 * 新しい世帯登録番号を生成
 * @return {string} 世帯登録番号
 */
function generateHouseholdId() {
  const sheet = getHouseholdSheet();
  const data = sheet.getDataRange().getValues();
  let maxId = 0;

  // ヘッダー行(1行目)をスキップ
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const idStr = row[0]; // HH00001形式
    if (idStr && idStr.startsWith('HH')) {
      const num = parseInt(idStr.substring(2), 10);
      if (!isNaN(num) && num > maxId) {
        maxId = num;
      }
    }
  }

  return generateId('HH', maxId + 1);
}

/**
 * 世帯データを取得（世帯・保護者・生徒すべて）
 * @param {string} householdId - 世帯登録番号
 * @return {object} 世帯データ
 */
function getHouseholdData(householdId) {
  const household = getHouseholdRecord(householdId);
  const guardians = getGuardiansByHousehold(householdId);
  const students = getStudentsByHousehold(householdId);

  return {
    household: household,
    guardians: guardians,
    students: students
  };
}

/**
 * 世帯レコードを取得
 * @param {string} householdId - 世帯登録番号
 * @return {object|null} 世帯レコード
 */
function getHouseholdRecord(householdId) {
  const sheet = getHouseholdSheet();
  const data = sheet.getDataRange().getValues();
  let latestRecord = null;
  let maxVersion = 0;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0] === householdId) {
      const version = row[12]; // バージョン列
      if (version > maxVersion) {
        maxVersion = version;
        latestRecord = {
          householdId: row[0],
          coreHouseholdId: row[1],
          registeredAt: row[2],
          updatedAt: row[3],
          editCode: row[4],
          postalCode: row[5],
          prefecture: row[6],
          city: row[7],
          street: row[8],
          building: row[9],
          notes: row[10],
          integrationStatus: row[11]
        };
      }
    }
  }

  return latestRecord;
}

/**
 * 世帯データを保存（新規登録）
 * @param {object} formData - フォームデータ
 * @return {object} 保存結果
 */
function saveHouseholdData(formData) {
  const householdId = generateHouseholdId();
  const editCode = generateEditCode();
  const now = getCurrentDateTime();
  const nowStr = formatDateTime(now);

  // 世帯マスタに保存
  saveHouseholdRecord({
    householdId: householdId,
    coreHouseholdId: '',
    registeredAt: nowStr,
    updatedAt: nowStr,
    editCode: editCode,
    postalCode: formData.household.postalCode,
    prefecture: formData.household.prefecture,
    city: normalizeAddress(formData.household.city),
    street: normalizeAddress(formData.household.street),
    building: normalizeAddress(formData.household.building),
    notes: formData.household.notes,
    integrationStatus: ''
  }, formData.guardians[0].email);

  // 保護者を保存
  formData.guardians.forEach(guardian => {
    saveGuardianRecord(householdId, guardian);
  });

  // 生徒を保存
  formData.students.forEach(student => {
    saveStudentRecord(householdId, student);
  });

  return {
    success: true,
    householdId: householdId,
    editCode: editCode
  };
}

/**
 * 世帯レコードを保存
 * @param {object} household - 世帯データ
 * @param {string} userEmail - 更新者メールアドレス
 * @param {number} version - バージョン番号
 * @param {boolean} deleted - 削除フラグ
 */
function saveHouseholdRecord(household, userEmail, version, deleted) {
  const sheet = getHouseholdSheet();
  const now = formatDateTime(getCurrentDateTime());

  sheet.appendRow([
    household.householdId,
    household.coreHouseholdId,
    household.registeredAt,
    household.updatedAt,
    household.editCode,
    household.postalCode,
    household.prefecture,
    household.city,
    household.street,
    household.building,
    household.notes,
    household.integrationStatus,
    version || 1, // バージョン
    deleted || false, // 削除フラグ
    now, // 更新日時
    userEmail || (household.guardians && household.guardians[0] ? household.guardians[0].email : '') // 更新者メール
  ]);
}

/**
 * 世帯の全バージョン履歴を取得（デバッグ用）
 * @param {string} householdId - 世帯ID
 * @return {Array} 履歴データ
 */
function getHouseholdVersions(householdId) {
  const sheet = getHouseholdSheet();
  const data = sheet.getDataRange().getValues();
  const versions = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0] === householdId) {
      versions.push({
        version: row[12],
        deleted: row[13],
        updatedAt: row[14]
      });
    }
  }
  return versions.sort((a, b) => b.version - a.version);
}

/**
 * メールアドレスから世帯を検索
 * @param {string} email - メールアドレス
 * @return {object|null} 世帯データ（見つからない場合はnull）
 */
function findHouseholdByEmail(email) {
  Logger.log('findHouseholdByEmail called with: ' + email);
  // 保護者シートから検索
  const guardianSheet = getGuardianSheet();
  const guardianData = guardianSheet.getDataRange().getValues();
  Logger.log('Guardian sheet rows: ' + guardianData.length);

  for (let i = 1; i < guardianData.length; i++) {
    const row = guardianData[i];
    const householdId = row[0];
    const contactEmail = row[11]; // 連絡用メール
    
    // Logger.log('Checking guardian row ' + i + ': ' + contactEmail);

    if (contactEmail === email) {
      Logger.log('Found in guardian sheet: ' + householdId);
      return getHouseholdData(householdId);
    }
  }

  // 生徒シートから検索
  const studentSheet = getStudentSheet();
  const studentData = studentSheet.getDataRange().getValues();
  Logger.log('Student sheet rows: ' + studentData.length);

  for (let i = 1; i < studentData.length; i++) {
    const row = studentData[i];
    const householdId = row[0];
    const contactEmail = row[8]; // 連絡用メール

    // Logger.log('Checking student row ' + i + ': ' + contactEmail);

    if (contactEmail === email) {
      Logger.log('Found in student sheet: ' + householdId);
      return getHouseholdData(householdId);
    }
  }

  Logger.log('Email not found in any sheet');
  return null;
}
