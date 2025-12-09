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
    showContactMethodField: CONFIG.SHOW_CONTACT_METHOD_FIELD,
    showAddressInNormalMode: CONFIG.SHOW_ADDRESS_IN_NORMAL_MODE,
    emailFromName: CONFIG.EMAIL_FROM_NAME
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
      message: '登録が完了しました。',
      householdId: data.householdId,
      householdData: JSON.stringify(mapToFrontendDto(data.householdData))
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
  const authService = new AuthService();
  const result = authService.authenticate(email, editCode);

  return result.match({
    ok: (data) => {
       // Convert Clean Entity to format expected by Frontend?
       // Frontend expects objects. Repository returns objects with Japanese keys.
       // Legacy `findHouseholdByEmail` returned objects with English keys (mapped)?
       // WAIT. The Frontend `form.js` uses `data.household.postalCode`.
       // BUT data from RepositoryClean uses `data.household['ご自宅郵便番号']`.
       // PROBLEM: We need a Mapper to convert Japanese Keys -> English Keys for the Frontend!
       // Legacy `getHouseholdData` in `HouseholdRepository.js` likely did this mapping.
       // We must implement a Mapper or update Frontend.
       // Updating Frontend is risky. Better to Map in the Controller (Code.js) or Service.
       
       // Let's check `HouseholdRepository.js` logic quickly to confirm mapping.
       // Actually, the new `HouseholdRepositoryClean` returns raw API-like objects (e.g. `{'世帯登録番号': ...}`).
       // The Frontend `form.js` definitely uses `household.postalCode`.
       // We need a `EntityMapper` to convert Clean Repo results to Domain/DTO objects.
       
       // For this step, I will inline a mapping function here or in Service to ensure backward compatibility.
       // Since this is "Migrate Edit", we must return what Frontend expects.
       
       return {
         success: true,
         message: '認証に成功しました。',
         householdData: JSON.stringify(mapToFrontendDto(data))
       };
    },
    err: (error) => ({
      success: false,
      message: error.message
    })
  });
}

// Mapper to converting Repository (Japanese) -> Frontend (English)
function mapToFrontendDto(data) {
   return {
     household: {
       householdId: data.household['世帯登録番号'],
       editCode: data.household['編集コード'],
       postalCode: data.household['ご自宅郵便番号'],
       prefecture: data.household['ご自宅都道府県'],
       city: data.household['ご自宅市区町村'],
       street: data.household['ご自宅町名・番地・号'],
       building: data.household['ご自宅建物名・部屋番号'],
       notes: data.household['備考']
     },
     guardians: data.guardians.map(g => ({
       guardianId: g['保護者登録番号'],
       relationship: g['続柄'],
       contactPriority: g['連絡優先順位'],
       contactMethod: g['連絡手段'],
       lastName: g['姓'],
       firstName: g['名'],
       lastNameKana: g['フリガナ姓'],
       firstNameKana: g['フリガナ名'],
       email: g['連絡用メール'],
       meetingEmail: g['オンライン面談用メール'],
       mobilePhone: g['携帯電話番号'],
       homePhone: g['自宅電話番号'],
       postalCode: g['保護者郵便番号'],
       prefecture: g['保護者都道府県'],
       city: g['保護者市区町村'],
       street: g['保護者町名・番地・号'],
       building: g['保護者建物名・部屋番号']
     })).sort((a,b) => (a.contactPriority || 99) - (b.contactPriority || 99)),
     students: data.students.map(s => ({
       studentId: s['生徒登録番号'],
       lastName: s['姓'],
       firstName: s['名'],
       lastNameKana: s['フリガナ姓'],
       firstNameKana: s['フリガナ名'],
       graduationYear: s['高校卒業予定年'],
       email: s['連絡用メール'],
       classEmail: s['オンライン授業用メール'],
       mobilePhone: s['携帯電話番号'],
       postalCode: s['生徒郵便番号'],
       prefecture: s['生徒都道府県'],
       city: s['生徒市区町村'],
       street: s['生徒町名・番地・号'],
       building: s['生徒建物名・部屋番号']
     }))
   };
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
/**
 * 世帯データ更新
 * @param {string} householdId - 世帯登録番号
 * @param {object} formData - フォームデータ
 * @return {object} 処理結果
 */
function updateHouseholdData(householdId, formData) {
  const updateService = new UpdateService();
  
  // Inject householdId into formData if missing, to satisfy Service/Repo contract
  if (!formData.household) formData.household = {};
  formData.household.householdId = householdId;

  // Execute
  const result = updateService.update(formData);
  
  return result.match({
    ok: (res) => ({
      success: true,
      message: '登録内容を更新しました。'
    }), 
    err: (error) => {
      // Logger.log('Update Error: ' + error.message);
      return {
        success: false,
        message: '更新に失敗しました: ' + error.message
      };
    }
  });
}





/**
 * HTMLテンプレート内で別のファイルをインクルードするための関数
 * @param {string} filename - ファイル名
 * @return {string} ファイルの内容
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
