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

    // 新しいバージョン番号を決定
    const currentVersion = getLatestVersion('世帯マスタ', 0, householdId);
    const newVersion = currentVersion + 1;

    // 新しいデータを保存（世帯登録番号は維持）
    const now = getCurrentDateTime();
    const nowStr = formatDateTime(now);
    const userEmail = formData.guardians[0].email;

    // 世帯マスタを更新
    const oldHousehold = getHouseholdRecord(householdId);
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
