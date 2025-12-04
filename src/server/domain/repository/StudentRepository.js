/**
 * Student Repository
 * 生徒データの操作を担当
 */

/**
 * 新しい生徒登録番号を生成
 * @return {string} 生徒登録番号
 */
function generateStudentId() {
  const sheet = getStudentSheet();
  const data = sheet.getDataRange().getValues();
  let maxId = 0;

  // ヘッダー行(1行目)をスキップ
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const idStr = row[1]; // S00001形式
    if (idStr && idStr.startsWith('S')) {
      const num = parseInt(idStr.substring(1), 10);
      if (!isNaN(num) && num > maxId) {
        maxId = num;
      }
    }
  }

  return generateId('S', maxId + 1);
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

  const nextRow = sheet.getLastRow() + 1;
  
  // 携帯電話(K列: 11番目)の書式をテキストに設定
  sheet.getRange(nextRow, 11).setNumberFormat('@');
  // 郵便番号(M列: 13番目)の書式をテキストに設定
  sheet.getRange(nextRow, 13).setNumberFormat('@');

  const rowData = [
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
  ];

  sheet.getRange(nextRow, 1, 1, rowData.length).setValues([rowData]);

  return studentId;
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
