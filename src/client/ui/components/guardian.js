import { store } from '../../state/store.js';

/**
 * Adds a guardian form fields.
 * @param {object} data - Optional data to pre-fill.
 */
export function addGuardian(data = null) {
  const state = store.getState();
  const guardianCount = state.guardianCount + 1;
  store.setState({ guardianCount });

  const id = 'guardian_' + guardianCount;
  const hasSeparateAddress = data && (data.postalCode || data.prefecture || data.city || data.street);

  const html = `
    <div class="guardian-card fade-in" id="${id}">
      <div class="card-header">
        <h3>保護者${guardianCount}</h3>
        ${guardianCount > 1 ? `<button type="button" class="btn btn-danger btn-sm remove-btn" data-remove-guardian="${id}">削除</button>` : ''}
      </div>
      
      <div class="form-row">
        <div class="form-group col-md-4">
          <label>続柄 <span class="required">*</span></label>
          <select class="form-control" name="relationship_${id}" required>
            <option value="">選択</option>
            <option value="父" ${data && data.relationship === '父' ? 'selected' : ''}>父</option>
            <option value="母" ${data && data.relationship === '母' ? 'selected' : ''}>母</option>
            <option value="祖父" ${data && data.relationship === '祖父' ? 'selected' : ''}>祖父</option>
            <option value="祖母" ${data && data.relationship === '祖母' ? 'selected' : ''}>祖母</option>
            <option value="その他" ${data && data.relationship === 'その他' ? 'selected' : ''}>その他</option>
          </select>
        </div>
        <div class="form-group col-md-4">
          <label>連絡優先順位 <span class="required">*</span></label>
          <select class="form-control priority-select" name="priority_${id}" required>
            <!-- Dynamically generated -->
          </select>
        </div>
        <div class="form-group col-md-4">
          <label>連絡手段</label>
          <select class="form-control" name="contact_method_${id}">
            <option value="携帯電話" ${!data || data.contactMethod === '携帯電話' ? 'selected' : ''}>携帯電話</option>
            <option value="自宅電話" ${data && data.contactMethod === '自宅電話' ? 'selected' : ''}>自宅電話</option>
            <option value="メール" ${data && data.contactMethod === 'メール' ? 'selected' : ''}>メール</option>
          </select>
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-group col-md-6">
          <label>姓 <span class="required">*</span></label>
          <input type="text" class="form-control" name="last_name_${id}" value="${data ? data.lastName : ''}" required>
        </div>
        <div class="form-group col-md-6">
          <label>名 <span class="required">*</span></label>
          <input type="text" class="form-control" name="first_name_${id}" value="${data ? data.firstName : ''}" required>
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-group col-md-6">
          <label>フリガナ（姓） <span class="required">*</span></label>
          <input type="text" class="form-control" name="last_name_kana_${id}" value="${data ? data.lastNameKana : ''}" pattern="[ァ-ヶー]+" required>
        </div>
        <div class="form-group col-md-6">
          <label>フリガナ（名） <span class="required">*</span></label>
          <input type="text" class="form-control" name="first_name_kana_${id}" value="${data ? data.firstNameKana : ''}" pattern="[ァ-ヶー]+" required>
        </div>
      </div>
      
      <div class="form-group">
        <label>連絡用メールアドレス <span class="required">*</span></label>
        <input type="email" class="form-control" name="email_${id}" value="${data ? data.email : ''}" required>
      </div>
      
      <div class="form-group">
        <label>オンライン面談用メールアドレス（任意）</label>
        <input type="email" class="form-control" name="meeting_email_${id}" value="${data ? data.meetingEmail || '' : ''}">
        <small class="form-text">💡 PC/タブレットで確認しやすいメールアドレス推奨</small>
      </div>
      
      <div class="form-row">
        <div class="form-group col-md-6">
          <label>携帯電話番号</label>
          <input type="tel" class="form-control" name="mobile_phone_${id}" value="${data ? data.mobilePhone || '' : ''}" placeholder="090-1234-5678">
        </div>
        <div class="form-group col-md-6">
          <label>自宅電話番号</label>
          <input type="tel" class="form-control" name="home_phone_${id}" value="${data ? data.homePhone || '' : ''}" placeholder="03-1234-5678">
        </div>
      </div>
      <small class="form-text">📞 携帯電話または自宅電話のどちらか1つは必ず入力してください</small>

      <!-- Address Input -->
      <div class="form-group mt-3">
        <div class="form-check">
          <input class="form-check-input" type="checkbox" id="separate_address_${id}" data-toggle-address="${id}" ${hasSeparateAddress ? 'checked' : ''}>
          <label class="form-check-label" for="separate_address_${id}">
            ご自宅と異なる住所を登録する（単身赴任等）
          </label>
        </div>
      </div>
      
      <div id="address_fields_${id}" style="display: ${hasSeparateAddress ? 'block' : 'none'};" class="bg-light p-3 rounded">
        <div class="form-row">
          <div class="form-group col-md-4">
            <label>郵便番号</label>
            <input type="text" id="postalCode_${id}" name="postalCode_${id}" class="form-control" placeholder="123-4567" maxlength="8" value="${data ? data.postalCode || '' : ''}">
            <button type="button" class="btn btn-sm btn-secondary mt-1" data-search-address="${id}">住所検索</button>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group col-md-4">
            <label>都道府県</label>
            <select id="prefecture_${id}" name="prefecture_${id}" class="form-control">
              <option value="">選択</option>
              ${generatePrefectureOptions(data ? data.prefecture : '')}
            </select>
          </div>
          <div class="form-group col-md-8">
            <label>市区町村</label>
            <input type="text" id="city_${id}" name="city_${id}" class="form-control" value="${data ? data.city || '' : ''}">
          </div>
        </div>
        <div class="form-group">
          <label>町名・番地・号</label>
          <input type="text" id="street_${id}" name="street_${id}" class="form-control" value="${data ? data.street || '' : ''}">
        </div>
        <div class="form-group">
          <label>建物名・部屋番号</label>
          <input type="text" id="building_${id}" name="building_${id}" class="form-control" value="${data ? data.building || '' : ''}">
        </div>
      </div>
    </div>
  `;

  document.getElementById('guardiansList').insertAdjacentHTML('beforeend', html);
  updateGuardianPriorities();
}

/**
 * Removes a guardian.
 * @param {string} id - The ID of the guardian element to remove.
 */
export function removeGuardian(id) {
  if (confirm('この保護者を削除しますか？')) {
    document.getElementById(id).remove();
    updateGuardianPriorities();
  }
}

/**
 * Updates the guardian priority options.
 */
export function updateGuardianPriorities() {
  const guardians = document.querySelectorAll('.guardian-card');
  const count = guardians.length;
  
  guardians.forEach(card => {
    const select = card.querySelector('.priority-select');
    const currentValue = select.value;
    
    let options = '';
    for (let i = 1; i <= count; i++) {
      options += `<option value="${i}" ${currentValue == i ? 'selected' : ''}>${i}</option>`;
    }
    select.innerHTML = options;
  });
}

/**
 * Generates prefecture options.
 * @param {string} selectedPrefecture - The selected prefecture.
 * @returns {string} HTML options string.
 */
function generatePrefectureOptions(selectedPrefecture) {
  const prefectures = [
    "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
    "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
    "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県",
    "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県",
    "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県",
    "徳島県", "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県",
    "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"
  ];
  
  return prefectures.map(pref => 
    `<option value="${pref}" ${selectedPrefecture === pref ? 'selected' : ''}>${pref}</option>`
  ).join('');
}
