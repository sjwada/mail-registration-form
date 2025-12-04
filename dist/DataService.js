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
  const normalizeStr = (val) => String(val || '').trim();
  const normalizePhone = (val) => String(val || '').replace(/-/g, '').trim();

  // 1. 世帯情報の比較
  if (
    normalizePhone(formData.household.postalCode) !== normalizePhone(oldHousehold.postalCode) ||
    normalizeStr(formData.household.prefecture) !== normalizeStr(oldHousehold.prefecture) ||
    normalizeAddress(normalizeStr(formData.household.city)) !== normalizeAddress(normalizeStr(oldHousehold.city)) ||
    normalizeAddress(normalizeStr(formData.household.street)) !== normalizeAddress(normalizeStr(oldHousehold.street)) ||
    normalizeAddress(normalizeStr(formData.household.building)) !== normalizeAddress(normalizeStr(oldHousehold.building)) ||
    normalizeStr(formData.household.notes) !== normalizeStr(oldHousehold.notes)
  ) {
    Logger.log('Household change detected');
    return true;
  }

  // 2. 保護者の比較
  if (formData.guardians.length !== oldGuardians.length) {
    Logger.log('Guardian count change: new=' + formData.guardians.length + ', old=' + oldGuardians.length);
    return true;
  }

  for (const newGuardian of formData.guardians) {
    if (!newGuardian.guardianId) {
      Logger.log('New guardian added');
      return true;
    }

    const oldGuardian = oldGuardians.find(g => g.guardianId === newGuardian.guardianId);
    if (!oldGuardian) {
      Logger.log('Old guardian not found: ' + newGuardian.guardianId);
      return true;
    }

    // フィールド比較
    if (
      normalizeStr(newGuardian.relationship) !== normalizeStr(oldGuardian.relationship) ||
      normalizeStr(newGuardian.contactPriority) !== normalizeStr(oldGuardian.contactPriority) ||
      normalizeStr(newGuardian.contactMethod || '電話') !== normalizeStr(oldGuardian.contactMethod || '電話') ||
      normalizeStr(newGuardian.lastName) !== normalizeStr(oldGuardian.lastName) ||
      normalizeStr(newGuardian.firstName) !== normalizeStr(oldGuardian.firstName) ||
      normalizeStr(newGuardian.lastNameKana) !== normalizeStr(oldGuardian.lastNameKana) ||
      normalizeStr(newGuardian.firstNameKana) !== normalizeStr(oldGuardian.firstNameKana) ||
      normalizeStr(newGuardian.email) !== normalizeStr(oldGuardian.email) ||
      normalizeStr(newGuardian.meetingEmail) !== normalizeStr(oldGuardian.meetingEmail) ||
      normalizePhone(newGuardian.mobilePhone) !== normalizePhone(oldGuardian.mobilePhone) ||
      normalizePhone(newGuardian.homePhone) !== normalizePhone(oldGuardian.homePhone) ||
      normalizePhone(newGuardian.postalCode) !== normalizePhone(oldGuardian.postalCode) ||
      normalizeStr(newGuardian.prefecture) !== normalizeStr(oldGuardian.prefecture) ||
      normalizeAddress(normalizeStr(newGuardian.city)) !== normalizeAddress(normalizeStr(oldGuardian.city)) ||
      normalizeAddress(normalizeStr(newGuardian.street)) !== normalizeAddress(normalizeStr(oldGuardian.street)) ||
      normalizeAddress(normalizeStr(newGuardian.building)) !== normalizeAddress(normalizeStr(oldGuardian.building))
    ) {
      Logger.log('Guardian change detected for ' + newGuardian.guardianId);
      // 詳細ログ（デバッグ用）
      if (normalizePhone(newGuardian.postalCode) !== normalizePhone(oldGuardian.postalCode)) {
        Logger.log('PostalCode mismatch: new=' + newGuardian.postalCode + ', old=' + oldGuardian.postalCode);
      }
      return true;
    }
  }

  // 3. 生徒の比較
  if (formData.students.length !== oldStudents.length) {
    Logger.log('Student count change');
    return true;
  }

  for (const newStudent of formData.students) {
    if (!newStudent.studentId) {
      Logger.log('New student added');
      return true;
    }

    const oldStudent = oldStudents.find(s => s.studentId === newStudent.studentId);
    if (!oldStudent) {
      Logger.log('Old student not found: ' + newStudent.studentId);
      return true;
    }

    if (
      normalizeStr(newStudent.lastName) !== normalizeStr(oldStudent.lastName) ||
      normalizeStr(newStudent.firstName) !== normalizeStr(oldStudent.firstName) ||
      normalizeStr(newStudent.lastNameKana) !== normalizeStr(oldStudent.lastNameKana) ||
      normalizeStr(newStudent.firstNameKana) !== normalizeStr(oldStudent.firstNameKana) ||
      normalizeStr(newStudent.graduationYear) !== normalizeStr(oldStudent.graduationYear) ||
      normalizeStr(newStudent.email) !== normalizeStr(oldStudent.email) ||
      normalizeStr(newStudent.classEmail) !== normalizeStr(oldStudent.classEmail) ||
      normalizePhone(newStudent.mobilePhone) !== normalizePhone(oldStudent.mobilePhone) ||
      normalizePhone(newStudent.postalCode) !== normalizePhone(oldStudent.postalCode) ||
      normalizeStr(newStudent.prefecture) !== normalizeStr(oldStudent.prefecture) ||
      normalizeAddress(normalizeStr(newStudent.city)) !== normalizeAddress(normalizeStr(oldStudent.city)) ||
      normalizeAddress(normalizeStr(newStudent.street)) !== normalizeAddress(normalizeStr(oldStudent.street)) ||
      normalizeAddress(normalizeStr(newStudent.building)) !== normalizeAddress(normalizeStr(oldStudent.building))
    ) {
      Logger.log('Student change detected for ' + newStudent.studentId);
      return true;
    }
  }

  return false;
}
