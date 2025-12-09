/**
 * メインアプリケーションロジック
 */

/**
 * Webアプリケーションのエントリーポイント
 * @param {object} e - リクエストパラメータ
 * @return {HtmlOutput} HTML出力
 */
function doGet(e) {

  // URLパラメータを取得
  const token = e.parameter.token || '';
  const edit = e.parameter.edit || '';
  const expires = e.parameter.expires || '';
  const debug = e.parameter.debug || '';

  // デバッグモード（テスト時にトークンチェックをスキップ）
  const isDebugMode = debug === 'true';

  // アクセス制限チェック（デバッグモード時はスキップ）
  if (!isDebugMode && !isValidToken(token) && !edit) {
    return HtmlService.createHtmlOutput('アクセスが拒否されました。正しいURLでアクセスしてください。');
  }

  if (!isDebugMode && !isAccessPeriodValid() && !edit) {
    return HtmlService.createHtmlOutput('現在、登録受付期間外です。');
  }

  // Magic Linkでのアクセス
  if (edit && expires) {
    const householdData = validateMagicLinkToken(edit, expires);
    if (householdData) {
      return createFormHtml('edit', householdData);
    } else {
      return HtmlService.createHtmlOutput('編集リンクの有効期限が切れているか、無効です。');
    }
  }

  // 通常のフォーム表示
  return createFormHtml('new', null);
}

/**
 * フォームHTMLを生成
 * @param {string} mode - 'new' または 'edit'
 * @param {object} householdData - 世帯データ（編集モードの場合）
 * @return {HtmlOutput} HTML出力
 */
function createFormHtml(mode, householdData) {
  const template = HtmlService.createTemplateFromFile('index');
  template.mode = mode;
  template.household = householdData ? householdData.household : null;
  template.guardians = householdData ? householdData.guardians : [];
  template.students = householdData ? householdData.students : [];
  template.config = {
    showContactMethodField: CONFIG.SHOW_CONTACT_METHOD_FIELD
  };

  return template.evaluate()
    .setTitle(CONFIG.EMAIL_FROM_NAME)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * 新規登録処理
 * @param {object} formData - フォームデータ
 * @return {object} 処理結果
 */
function submitRegistration(formData) {
  const service = new RegistrationService();
  const result = service.register(formData);
  
  return result.match({
    ok: (data) => ({
      success: true,
      message: '登録が完了しました。確認メールをご確認ください。',
      householdId: data.householdId
    }),
    err: (error) => {
      // Legacy frontend expects specific duplicate flag?
      // "このメールアドレスは既に登録されています" is the message.
      const isDuplicate = error.message.includes('既に登録されています');
      return {
        success: false,
        message: error.message,
        duplicate: isDuplicate
      };
    }
  });
}

/**
 * 編集コードで認証
 * @param {string} email - メールアドレス
 * @param {string} editCode - 編集コード
 * @return {object} 認証結果
 */
function authenticateWithEditCode(email, editCode) {
  Logger.log('authenticateWithEditCode called with: ' + email + ', ' + editCode);
  try {
    const householdData = findHouseholdByEmail(email);
    Logger.log('findHouseholdByEmail result: ' + (householdData ? 'found' : 'null'));

    if (!householdData) {
      Logger.log('Email not found');
      return {
        success: false,
        message: 'メールアドレスが見つかりませんでした。'
      };
    }

    if (!householdData.household) {
      Logger.log('Household data is missing household object');
       return {
        success: false,
        message: '世帯データが見つかりませんでした。'
      };
    }

    Logger.log('Stored editCode: ' + householdData.household.editCode);
    if (String(householdData.household.editCode) !== String(editCode)) {
      Logger.log('Edit code mismatch');
      return {
        success: false,
        message: '編集コードが正しくありません。'
      };
    }

    // 入力されたメールアドレスが、現在の世帯データ（保護者または生徒）に含まれているか確認
    const isActiveEmail = householdData.guardians.some(g => g.email === email) || 
                          householdData.students.some(s => s.email === email || s.classEmail === email);

    if (!isActiveEmail) {
      Logger.log('Email not found in active records');
      return {
        success: false,
        message: 'このメールアドレスは現在有効ではありません。最新のメールアドレスでログインしてください。'
      };
    }

    Logger.log('Authentication successful');
    
    // データをクライアントに送れる形式（JSON文字列）に変換します
    // これにより、GAS特有のシリアライズ問題を回避しています
    const cleanHouseholdData = JSON.parse(JSON.stringify(householdData));

    return {
      success: true,
      message: '認証に成功しました。',
      householdData: JSON.stringify(cleanHouseholdData)
    };

  } catch (error) {
    Logger.log('認証エラー: ' + error.toString() + '\n' + error.stack);
    return {
      success: false,
      message: 'エラーが発生しました: ' + error.toString()
    };
  }
}

/**
 * Magic Link送信
 * @param {string} email - メールアドレス
 * @return {object} 処理結果
 */
function requestMagicLink(email) {
  // Use the new Functional AuthService
  const authService = new AuthService();
  
  // Execute the chain
  const result = authService.requestMagicLink(email);
  
  // Handle the Result (Unwrap for legacy frontend expectation)
  return result.match({
    ok: (message) => ({
      success: true,
      message: message
    }),
    err: (error) => {
      Logger.log('AuthService Error: ' + error.message);
      return {
        success: false,
        message: error.message || 'エラーが発生しました。'
      };
    }
  });
}

/**
 * Magic Linkトークン検証
 * @param {string} token - トークン
 * @param {string} expiresStr - 有効期限（タイムスタンプ文字列）
 * @return {object|null} 世帯データまたはnull
 */
function validateMagicLinkToken(token, expiresStr) {
  const authService = new AuthService();
  const result = authService.validateToken(token);
  
  return result.match({
    ok: (data) => data,
    err: (error) => {
      Logger.log('Token Validation Error: ' + error.message);
      return null;
    }
  });
}

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
    }, null, newVersion);

    // 保護者・生徒を保存
    formData.guardians.forEach(guardian => {
      saveGuardianRecord(householdId, guardian, null, newVersion);
    });

    formData.students.forEach(student => {
      saveStudentRecord(householdId, student, null, newVersion);
    });

    // 削除されたレコードの処理（今回のリストに含まれていないものを論理削除）
    softDeleteGuardiansNotInList(householdId, formData.guardians, null, newVersion);
    softDeleteStudentsNotInList(householdId, formData.students, null, newVersion);

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
    // 個別住所チェック
    if (student.postalCode) {
      if (!student.prefecture || !student.city || !student.street) {
        return {
          valid: false,
          message: '生徒の個別の住所を登録する場合は、都道府県、市区町村、町名・番地・号は必須です。'
        };
      }
    }
  }

  return { valid: true };
}

/**
 * HTMLテンプレート内で別のファイルをインクルードするための関数
 * @param {string} filename - ファイル名
 * @return {string} ファイルの内容
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
