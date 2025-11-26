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
  
  // アクセス制限チェック
  if (!isValidToken(token) && !edit) {
    return HtmlService.createHtmlOutput('アクセスが拒否されました。正しいURLでアクセスしてください。');
  }
  
  if (!isAccessPeriodValid() && !edit) {
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
  try {
    // 重複チェック
    const primaryGuardian = formData.guardians.find(g => g.contactPriority === 1);
    if (!primaryGuardian) {
      return { success: false, message: '連絡優先順位1位の保護者が設定されていません。' };
    }
    
    const existingHousehold = findHouseholdByEmail(primaryGuardian.email);
    if (existingHousehold) {
      return { 
        success: false, 
        message: 'このメールアドレスは既に登録されています。編集モードをご利用ください。',
        duplicate: true
      };
    }
    
    // バリデーション
    const validationResult = validateFormData(formData);
    if (!validationResult.valid) {
      return { success: false, message: validationResult.message };
    }
    
    // データ保存
    const result = saveHouseholdData(formData);
    
    // 確認メール送信
    const householdData = getHouseholdData(result.householdId);
    sendConfirmationEmail(primaryGuardian.email, householdData, result.editCode);
    
    // 管理者通知
    sendAdminNotificationEmail(householdData);
    
    return {
      success: true,
      message: '登録が完了しました。確認メールをご確認ください。',
      householdId: result.householdId
    };
    
  } catch (error) {
    Logger.log('登録エラー: ' + error.toString());
    return {
      success: false,
      message: 'エラーが発生しました。時間をおいて再度お試しください。'
    };
  }
}

/**
 * 編集コードで認証
 * @param {string} email - メールアドレス
 * @param {string} editCode - 編集コード
 * @return {object} 認証結果
 */
function authenticateWithEditCode(email, editCode) {
  try {
    const householdData = findHouseholdByEmail(email);
    
    if (!householdData) {
      return { 
        success: false, 
        message: 'メールアドレスが見つかりませんでした。' 
      };
    }
    
    if (householdData.household.editCode !== editCode) {
      return { 
        success: false, 
        message: '編集コードが正しくありません。' 
      };
    }
    
    return {
      success: true,
      message: '認証に成功しました。',
      householdData: householdData
    };
    
  } catch (error) {
    Logger.log('認証エラー: ' + error.toString());
    return {
      success: false,
      message: 'エラーが発生しました。'
    };
  }
}

/**
 * Magic Link送信
 * @param {string} email - メールアドレス
 * @return {object} 処理結果
 */
function requestMagicLink(email) {
  try {
    const householdData = findHouseholdByEmail(email);
    
    if (!householdData) {
      return { 
        success: false, 
        message: 'メールアドレスが見つかりませんでした。' 
      };
    }
    
    const token = generateMagicLinkToken();
    const expiryTime = new Date();
    expiryTime.setMinutes(expiryTime.getMinutes() + CONFIG.MAGIC_LINK_EXPIRY_MINUTES);
    
    // トークンをPropertiesServiceに保存（一時保存）
    const properties = PropertiesService.getScriptProperties();
    properties.setProperty(
      'magiclink_' + token, 
      JSON.stringify({
        householdId: householdData.household.householdId,
        expires: expiryTime.getTime()
      })
    );
    
    // Magic Link送信
    sendMagicLinkEmail(email, token);
    
    return {
      success: true,
      message: '編集リンクをメールで送信しました。メールをご確認ください。'
    };
    
  } catch (error) {
    Logger.log('Magic Link送信エラー: ' + error.toString());
    return {
      success: false,
      message: 'エラーが発生しました。'
    };
  }
}

/**
 * Magic Linkトークン検証
 * @param {string} token - トークン
 * @param {string} expiresStr - 有効期限（タイムスタンプ文字列）
 * @return {object|null} 世帯データまたはnull
 */
function validateMagicLinkToken(token, expiresStr) {
  try {
    const properties = PropertiesService.getScriptProperties();
    const dataStr = properties.getProperty('magiclink_' + token);
    
    if (!dataStr) {
      return null;
    }
    
    const data = JSON.parse(dataStr);
    const now = new Date().getTime();
    
    // 有効期限チェック
    if (now > data.expires) {
      // 期限切れのトークンを削除
      properties.deleteProperty('magiclink_' + token);
      return null;
    }
    
    // トークン使用後は削除（ワンタイム）
    properties.deleteProperty('magiclink_' + token);
    
    // 世帯データを取得
    return getHouseholdData(data.householdId);
    
  } catch (error) {
    Logger.log('Magic Link検証エラー: ' + error.toString());
    return null;
  }
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
    
    // 既存データを削除
    deleteHouseholdData(householdId);
    
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
    });
    
    // 保護者・生徒を保存
    formData.guardians.forEach(guardian => {
      saveGuardianRecord(householdId, guardian);
    });
    
    formData.students.forEach(student => {
      saveStudentRecord(householdId, student);
    });
    
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
 * 世帯データを削除（保護者・生徒含む）
 * @param {string} householdId - 世帯登録番号
 */
function deleteHouseholdData(householdId) {
  // 世帯マスタから削除
  deleteFromSheet(getHouseholdSheet(), householdId, 0);
  
  // 保護者から削除
  deleteFromSheet(getGuardianSheet(), householdId, 0);
  
  // 生徒から削除
  deleteFromSheet(getStudentSheet(), householdId, 0);
}

/**
 * シートから指定IDのデータを削除
 * @param {Sheet} sheet - シート
 * @param {string} value - 検索値
 * @param {number} columnIndex - 検索列のインデックス
 */
function deleteFromSheet(sheet, value, columnIndex) {
  const data = sheet.getDataRange().getValues();
  const rowsToDelete = [];
  
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][columnIndex] === value) {
      rowsToDelete.push(i + 1);
    }
  }
  
  rowsToDelete.forEach(row => {
    sheet.deleteRow(row);
  });
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
  
  // 保護者の電話番号チェック（携帯または自宅のどちらか必須）
  for (let guardian of formData.guardians) {
    if (!guardian.mobilePhone && !guardian.homePhone) {
      return { 
        valid: false, 
        message: '保護者の携帯電話番号または自宅電話番号のどちらか1つは必須です。' 
      };
    }
  }
  
  // 生徒チェック
  if (!formData.students || formData.students.length === 0) {
    return { valid: false, message: '生徒を最低1人登録してください。' };
  }
  
  // その他のバリデーションは省略（フロントエンドでも実施）
  
  return { valid: true };
}
