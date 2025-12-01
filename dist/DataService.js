/**
 * データサービス
 * Spreadsheetへのデータ読み書きを担当
 */

/**
 * 新しい世帯登録番号を生成
 * @return {string} 世帯登録番号
 */
function generateHouseholdId() {
  const sheet = getHouseholdSheet();
  const lastRow = sheet.getLastRow();
  const sequenceNumber = lastRow; // ヘッダー行を除いた行数
  return generateId('HH', sequenceNumber + 1);
}

/**
 * 新しい保護者登録番号を生成
 * @return {string} 保護者登録番号
 */
function generateGuardianId() {
  const sheet = getGuardianSheet();
  const lastRow = sheet.getLastRow();
  const sequenceNumber = lastRow;
  return generateId('G', sequenceNumber + 1);
}

/**
 * 新しい生徒登録番号を生成
 * @return {string} 生徒登録番号
 */
function generateStudentId() {
  const sheet = getStudentSheet();
  const lastRow = sheet.getLastRow();
  const sequenceNumber = lastRow;
  return generateId('S', sequenceNumber + 1);
}

/**
 * メールアドレスから世帯を検索
 * @param {string} email - メールアドレス
 * @return {object|null} 世帯データ（見つからない場合はnull）
 */
function findHouseholdByEmail(email) {
  // 保護者シートから検索
  const guardianSheet = getGuardianSheet();
  const guardianData = guardianSheet.getDataRange().getValues();

  for (let i = 1; i < guardianData.length; i++) {
    const row = guardianData[i];
    const householdId = row[0];
    const contactEmail = row[11]; // 連絡用メール

    if (contactEmail === email) {
      return getHouseholdData(householdId);
    }
  }

  // 生徒シートから検索
  const studentSheet = getStudentSheet();
  const studentData = studentSheet.getDataRange().getValues();

  for (let i = 1; i < studentData.length; i++) {
    const row = studentData[i];
    const householdId = row[0];
    const contactEmail = row[8]; // 連絡用メール

    if (contactEmail === email) {
      return getHouseholdData(householdId);
    }
  }

  return null;
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

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0] === householdId) {
      return {
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

  return null;
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
 * 世帯に属する生徒を取得
 * @param {string} householdId - 世帯登録番号
 * @return {Array} 生徒の配列
 */
function getStudentsByHousehold(householdId) {
  const sheet = getStudentSheet();
  const data = sheet.getDataRange().getValues();
  const students = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0] === householdId) {
      students.push({
        householdId: row[0],
        studentId: row[1],
        coreStudentId: row[2],
        lastName: row[3],
        firstName: row[4],
        lastNameKana: row[5],
        firstNameKana: row[6],
        graduationYear: row[7],
        email: row[8],
        classEmail: row[9],
        mobilePhone: row[10],
        addressFlag: row[11],
        postalCode: row[12],
        prefecture: row[13],
        city: row[14],
        street: row[15],
        building: row[16],
        version: row[17],
        deleted: row[18]
      });
    }
  }

  // 最新バージョンかつ削除されていないレコードのみを返す
  return filterLatestRecords(students, 'studentId');
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
    userEmail || household.guardians[0].email // 更新者メール
  ]);
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

  sheet.appendRow([
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
  ]);

  return guardianId;
}

/**
 * 生徒レコードを保存
 * @param {string} householdId - 世帯登録番号
 * @param {object} student - 生徒データ
 * @param {string} userEmail - 更新者メールアドレス
 * @param {number} version - バージョン番号
 * @param {boolean} deleted - 削除フラグ
 */
function saveStudentRecord(householdId, student, userEmail, version, deleted) {
  const sheet = getStudentSheet();
  const studentId = student.studentId || generateStudentId();
  const now = formatDateTime(getCurrentDateTime());

  sheet.appendRow([
    householdId,
    studentId,
    '', // 基幹生徒ID
    student.lastName,
    student.firstName,
    student.lastNameKana,
    student.firstNameKana,
    student.graduationYear,
    student.email,
    student.classEmail || '',
    student.mobilePhone || '',
    student.postalCode ? '別の住所' : 'ご自宅と同じ',
    student.postalCode || '',
    student.prefecture || '',
    normalizeAddress(student.city || ''),
    normalizeAddress(student.street || ''),
    normalizeAddress(student.building || ''),
    version || 1, // バージョン
    deleted || false, // 削除フラグ
    now, // 更新日時
    userEmail || student.email // 更新者メール
  ]);

  return studentId;
}

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

/**
 * 指定された生徒リストに含まれない生徒を論理削除
 * @param {string} householdId - 世帯ID
 * @param {Array} currentStudents - 現在（更新後）の生徒リスト
 * @param {string} userEmail - 更新者メール
 * @param {number} newVersion - 新しいバージョン番号
 */
function softDeleteStudentsNotInList(householdId, currentStudents, userEmail, newVersion) {
  const existingStudents = getStudentsByHousehold(householdId);
  const currentStudentIds = currentStudents.map(s => s.studentId).filter(id => id);

  existingStudents.forEach(existing => {
    if (!currentStudentIds.includes(existing.studentId)) {
      // 削除された生徒として保存
      saveStudentRecord(householdId, existing, userEmail, newVersion, true);
    }
  });
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

