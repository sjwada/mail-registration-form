/**
 * Application Service
 * アプリケーションロジック（データの整合性チェック、更新フロー制御など）を担当
 */

/**
 * 世帯データ更新
 * @param {string} householdId - 世帯登録番号
 * @param {object} formData - フォームデータ
 * @return {object} 処理結果
 */
function updateHouseholdData(householdId, formData) {
  try {
    // バリデーション
    const validationResult = validateFormData(formData);
    if (!validationResult.valid) {
      return { success: false, message: validationResult.message };
    }

    // 変更検知
    const oldHousehold = getHouseholdRecord(householdId);
    const oldGuardians = getGuardiansByHousehold(householdId);
    const oldStudents = getStudentsByHousehold(householdId);

    const hasChanges = checkForChanges(formData, oldHousehold, oldGuardians, oldStudents);

    if (!hasChanges) {
      return {
        success: true,
        message: '変更内容がなかったため、更新はスキップされました。'
      };
    }

    // 新しいバージョン番号を決定
    const currentVersion = getLatestVersion('世帯マスタ', 0, householdId);
    const newVersion = currentVersion + 1;

    // 新しいデータを保存（世帯登録番号は維持）
    const now = getCurrentDateTime();
    const nowStr = formatDateTime(now);
    const userEmail = formData.guardians[0].email;

    // 世帯マスタを更新
    saveHouseholdRecord({
      householdId: householdId,
      coreHouseholdId: oldHousehold.coreHouseholdId,
      registeredAt: oldHousehold.registeredAt,
      updatedAt: nowStr,
      editCode: oldHousehold.editCode,
      postalCode: formData.household.postalCode,
      prefecture: formData.household.prefecture,
      city: normalizeAddress(formData.household.city),
      street: normalizeAddress(formData.household.street),
      building: normalizeAddress(formData.household.building),
      notes: formData.household.notes,
      integrationStatus: oldHousehold.integrationStatus
    }, userEmail, newVersion);

    // 保護者・生徒を保存
    formData.guardians.forEach(guardian => {
      saveGuardianRecord(householdId, guardian, userEmail, newVersion);
    });

    formData.students.forEach(student => {
      saveStudentRecord(householdId, student, userEmail, newVersion);
    });

    // 削除されたレコードの処理（今回のリストに含まれていないものを論理削除）
    softDeleteGuardiansNotInList(householdId, formData.guardians, userEmail, newVersion);
    softDeleteStudentsNotInList(householdId, formData.students, userEmail, newVersion);

    // 全保護者に変更通知メール送信
    sendEditNotificationEmails(formData.guardians, now);

    return {
      success: true,
      message: '登録内容を更新しました。'
    };

  } catch (error) {
    Logger.log('更新エラー: ' + error.toString());
    return {
      success: false,
      message: 'エラーが発生しました。'
    };
  }
}

/**
 * フォームデータのバリデーション
 * @param {object} formData - フォームデータ
 * @return {object} バリデーション結果
 */
function validateFormData(formData) {
  // 保護者チェック
  if (!formData.guardians || formData.guardians.length === 0) {
    return { valid: false, message: '保護者を最低1人登録してください。' };
  }

  const postalCodeRegex = /^\d{3}-?\d{4}$/;
  const phoneRegex = /^0\d{1,4}-?\d{1,4}-?\d{3,4}$/;

  // 世帯の郵便番号チェック
  if (formData.household.postalCode && !postalCodeRegex.test(formData.household.postalCode)) {
    return { valid: false, message: '世帯の郵便番号の形式が正しくありません。' };
  }

  // 保護者のバリデーション
  const priorities = [];
  for (let guardian of formData.guardians) {
    // 電話番号チェック（携帯または自宅のどちらか必須）
    if (!guardian.mobilePhone && !guardian.homePhone) {
      return {
        valid: false,
        message: '保護者の携帯電話番号または自宅電話番号のどちらか1つは必須です。'
      };
    }

    if (guardian.mobilePhone && !phoneRegex.test(guardian.mobilePhone)) {
      return { valid: false, message: '保護者の携帯電話番号の形式が正しくありません。' };
    }

    if (guardian.homePhone && !phoneRegex.test(guardian.homePhone)) {
      return { valid: false, message: '保護者の自宅電話番号の形式が正しくありません。' };
    }

    // 連絡優先順位の収集
    if (guardian.contactPriority) {
      priorities.push(guardian.contactPriority);
    }

    // 個別住所チェック
    if (guardian.postalCode) {
      if (!guardian.prefecture || !guardian.city || !guardian.street) {
        return {
          valid: false,
          message: '個別の住所を登録する場合は、都道府県、市区町村、町名・番地・号は必須です。'
        };
      }
      if (!postalCodeRegex.test(guardian.postalCode)) {
        return { valid: false, message: '保護者の郵便番号の形式が正しくありません。' };
      }
    }
  }

  // 連絡優先順位の整合性チェック
  if (formData.guardians.length > 1) {
    const uniquePriorities = new Set(priorities);
    if (uniquePriorities.size !== formData.guardians.length) {
      return { valid: false, message: '保護者の連絡優先順位が重複しています。' };
    }
    // 1から人数分までの連番かチェック（簡易的）
    for (let i = 1; i <= formData.guardians.length; i++) {
      if (!priorities.includes(i)) {
        return { valid: false, message: '保護者の連絡優先順位が正しくありません。' };
      }
    }
  }

  // 生徒チェック
  if (!formData.students || formData.students.length === 0) {
    return { valid: false, message: '生徒を最低1人登録してください。' };
  }

  // 生徒のバリデーション
  for (let student of formData.students) {
    if (student.mobilePhone && !phoneRegex.test(student.mobilePhone)) {
      return { valid: false, message: '生徒の携帯電話番号の形式が正しくありません。' };
    }

    // 個別住所チェック
    if (student.postalCode) {
      if (!student.prefecture || !student.city || !student.street) {
        return {
          valid: false,
          message: '生徒の個別の住所を登録する場合は、都道府県、市区町村、町名・番地・号は必須です。'
        };
      }
      if (!postalCodeRegex.test(student.postalCode)) {
        return { valid: false, message: '生徒の郵便番号の形式が正しくありません。' };
      }
    }
  }

  return { valid: true };
}

/**
 * 変更があるかチェックする
 */
function checkForChanges(formData, oldHousehold, oldGuardians, oldStudents) {
  // 1. 世帯情報の比較
  if (
    String(formData.household.postalCode || '') !== String(oldHousehold.postalCode || '') ||
    String(formData.household.prefecture || '') !== String(oldHousehold.prefecture || '') ||
    normalizeAddress(formData.household.city || '') !== normalizeAddress(oldHousehold.city || '') ||
    normalizeAddress(formData.household.street || '') !== normalizeAddress(oldHousehold.street || '') ||
    normalizeAddress(formData.household.building || '') !== normalizeAddress(oldHousehold.building || '') ||
    String(formData.household.notes || '') !== String(oldHousehold.notes || '')
  ) {
    return true;
  }

  // 2. 保護者の比較
  // 数が違うなら変更あり
  if (formData.guardians.length !== oldGuardians.length) return true;

  // 各保護者を比較
  for (const newGuardian of formData.guardians) {
    // 新規追加（IDがない）なら変更あり
    if (!newGuardian.guardianId) return true;

    const oldGuardian = oldGuardians.find(g => g.guardianId === newGuardian.guardianId);
    // IDが見つからない（ありえないはずだが）なら変更あり
    if (!oldGuardian) return true;

    // フィールド比較
    if (
      String(newGuardian.relationship || '') !== String(oldGuardian.relationship || '') ||
      String(newGuardian.contactPriority || '') !== String(oldGuardian.contactPriority || '') ||
      String(newGuardian.contactMethod || '電話') !== String(oldGuardian.contactMethod || '電話') ||
      String(newGuardian.lastName || '') !== String(oldGuardian.lastName || '') ||
      String(newGuardian.firstName || '') !== String(oldGuardian.firstName || '') ||
      String(newGuardian.lastNameKana || '') !== String(oldGuardian.lastNameKana || '') ||
      String(newGuardian.firstNameKana || '') !== String(oldGuardian.firstNameKana || '') ||
      String(newGuardian.email || '') !== String(oldGuardian.email || '') ||
      String(newGuardian.meetingEmail || '') !== String(oldGuardian.meetingEmail || '') ||
      String(newGuardian.mobilePhone || '') !== String(oldGuardian.mobilePhone || '') ||
      String(newGuardian.homePhone || '') !== String(oldGuardian.homePhone || '') ||
      String(newGuardian.postalCode || '') !== String(oldGuardian.postalCode || '') ||
      String(newGuardian.prefecture || '') !== String(oldGuardian.prefecture || '') ||
      normalizeAddress(newGuardian.city || '') !== normalizeAddress(oldGuardian.city || '') ||
      normalizeAddress(newGuardian.street || '') !== normalizeAddress(oldGuardian.street || '') ||
      normalizeAddress(newGuardian.building || '') !== normalizeAddress(oldGuardian.building || '')
    ) {
      return true;
    }
  }

  // 3. 生徒の比較
  if (formData.students.length !== oldStudents.length) return true;

  for (const newStudent of formData.students) {
    if (!newStudent.studentId) return true;

    const oldStudent = oldStudents.find(s => s.studentId === newStudent.studentId);
    if (!oldStudent) return true;

    if (
      String(newStudent.lastName || '') !== String(oldStudent.lastName || '') ||
      String(newStudent.firstName || '') !== String(oldStudent.firstName || '') ||
      String(newStudent.lastNameKana || '') !== String(oldStudent.lastNameKana || '') ||
      String(newStudent.firstNameKana || '') !== String(oldStudent.firstNameKana || '') ||
      String(newStudent.graduationYear || '') !== String(oldStudent.graduationYear || '') ||
      String(newStudent.email || '') !== String(oldStudent.email || '') ||
      String(newStudent.classEmail || '') !== String(oldStudent.classEmail || '') ||
      String(newStudent.mobilePhone || '') !== String(oldStudent.mobilePhone || '') ||
      String(newStudent.postalCode || '') !== String(oldStudent.postalCode || '') ||
      String(newStudent.prefecture || '') !== String(oldStudent.prefecture || '') ||
      normalizeAddress(newStudent.city || '') !== normalizeAddress(oldStudent.city || '') ||
      normalizeAddress(newStudent.street || '') !== normalizeAddress(oldStudent.street || '') ||
      normalizeAddress(newStudent.building || '') !== normalizeAddress(oldStudent.building || '')
    ) {
      return true;
    }
  }

  return false;
}
