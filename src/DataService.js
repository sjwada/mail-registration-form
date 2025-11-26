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
        homePhone: row[14]
      });
    }
  }
  
  return guardians;
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
        building: row[16]
      });
    }
  }
  
  return students;
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
  });
  
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
 */
function saveHouseholdRecord(household) {
  const sheet = getHouseholdSheet();
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
    household.integrationStatus
  ]);
}

/**
 * 保護者レコードを保存
 * @param {string} householdId - 世帯登録番号
 * @param {object} guardian - 保護者データ
 */
function saveGuardianRecord(householdId, guardian) {
  const sheet = getGuardianSheet();
  const guardianId = generateGuardianId();
  
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
    guardian.homePhone || ''
  ]);
}

/**
 * 生徒レコードを保存
 * @param {string} householdId - 世帯登録番号
 * @param {object} student - 生徒データ
 */
function saveStudentRecord(householdId, student) {
  const sheet = getStudentSheet();
  const studentId = generateStudentId();
  
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
    student.addressFlag || 'ご自宅と同じ',
    student.postalCode || '',
    student.prefecture || '',
    normalizeAddress(student.city || ''),
    normalizeAddress(student.street || ''),
    normalizeAddress(student.building || '')
  ]);
}
