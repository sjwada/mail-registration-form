import { store } from '../../state/store.js';

/**
 * Adds a student form fields.
 * @param {object} data - Optional data to pre-fill.
 */
export function addStudent(data = null) {
  const state = store.getState();
  const studentCount = state.studentCount + 1;
  store.setState({ studentCount });

  const id = 'student_' + studentCount;
  const hasSeparateAddress = data && (data.postalCode || data.prefecture || data.city || data.street);

  const html = `
    <div class="student-card fade-in" id="${id}">
      <div class="card-header">
        <h3>生徒${studentCount}</h3>
        ${studentCount > 1 ? `<button type="button" class="btn btn-danger btn-sm remove-btn" data-remove-student="${id}">削除</button>` : ''}
      </div>
      
      <div class="form-row">
        <div class="form-group col-md-6">
          <label>姓 <span class="required">*</span></label>
          <input type="text" class="form-control" name="s_last_name_${id}" value="${data ? data.lastName : ''}" required>
        </div>
        <div class="form-group col-md-6">
          <label>名 <span class="required">*</span></label>
          <input type="text" class="form-control" name="s_first_name_${id}" value="${data ? data.firstName : ''}" required>
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-group col-md-6">
          <label>フリガナ（姓） <span class="required">*</span></label>
          <input type="text" class="form-control" name="s_last_name_kana_${id}" value="${data ? data.lastNameKana : ''}" pattern="[ァ-ヶー]+" required>
        </div>
        <div class="form-group col-md-6">
          <label>フリガナ（名） <span class="required">*</span></label>
          <input type="text" class="form-control" name="s_first_name_kana_${id}" value="${data ? data.firstNameKana : ''}" pattern="[ァ-ヶー]+" required>
        </div>
      </div>
      
      <div class="form-group">
        <label>高校卒業（予定）年 <span class="required">*</span></label>
        <select class="form-control" name="graduation_year_${id}" required>
          <option value="">選択</option>
          ${generateYearOptions(data ? data.graduationYear : null)}
        </select>
      </div>
      
      <div class="form-group">
        <label>連絡用メールアドレス <span class="required">*</span></label>
        <input type="email" class="form-control" name="s_email_${id}" value="${data ? data.email : ''}" required>
      </div>
      
      <div class="form-group">
        <label>オンライン授業用メールアドレス（任意）</label>
        <input type="email" class="form-control" name="s_class_email_${id}" value="${data ? data.classEmail || '' : ''}">
        <small class="form-text">💡 PC/タブレットで確認しやすいメールアドレス推奨</small>
      </div>
      
      <div class="form-group">
        <label>携帯電話番号（任意）</label>
        <input type="tel" class="form-control" name="s_mobile_phone_${id}" value="${data ? data.mobilePhone || '' : ''}" placeholder="090-1234-5678">
        <small class="form-text">📱 お持ちの場合は必ず入力してください</small>
      </div>

       <!-- Address Input -->
      <div class="form-group mt-3">
        <div class="form-check">
          <input class="form-check-input" type="checkbox" id="separate_address_s_${id}" data-toggle-address="s_${id}" ${hasSeparateAddress ? 'checked' : ''}>
          <label class="form-check-label" for="separate_address_s_${id}">
            ご自宅と異なる住所を登録する（寮生活等）
          </label>
        </div>
      </div>
      
      <div id="address_fields_s_${id}" style="display: ${hasSeparateAddress ? 'block' : 'none'};" class="bg-light p-3 rounded">
        <div class="form-row">
          <div class="form-group col-md-4">
            <label>郵便番号</label>
            <input type="text" id="postalCode_s_${id}" name="postalCode_s_${id}" class="form-control" placeholder="123-4567" maxlength="8" value="${data ? data.postalCode || '' : ''}">
            <button type="button" class="btn btn-sm btn-secondary mt-1" data-search-address="s_${id}">住所検索</button>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group col-md-4">
            <label>都道府県</label>
            <select id="prefecture_s_${id}" name="prefecture_s_${id}" class="form-control">
              <option value="">選択</option>
              ${generatePrefectureOptions(data ? data.prefecture : '')}
            </select>
          </div>
          <div class="form-group col-md-8">
            <label>市区町村</label>
            <input type="text" id="city_s_${id}" name="city_s_${id}" class="form-control" value="${data ? data.city || '' : ''}">
          </div>
        </div>
        <div class="form-group">
          <label>町名・番地・号</label>
          <input type="text" id="street_s_${id}" name="street_s_${id}" class="form-control" value="${data ? data.street || '' : ''}">
        </div>
        <div class="form-group">
          <label>建物名・部屋番号</label>
          <input type="text" id="building_s_${id}" name="building_s_${id}" class="form-control" value="${data ? data.building || '' : ''}">
        </div>
      </div>
    </div>
  `;

  document.getElementById('studentsList').insertAdjacentHTML('beforeend', html);
}

/**
 * Removes a student.
 * @param {string} id - The ID of the student element to remove.
 */
export function removeStudent(id) {
  if (confirm('この生徒を削除しますか？')) {
    document.getElementById(id).remove();
  }
}

/**
 * Generates year options for graduation year.
 * @param {string} selectedYear - The selected year.
 * @returns {string} HTML options string.
 */
function generateYearOptions(selectedYear) {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = -5; i <= 10; i++) {
    const year = currentYear + i;
    const selected = selectedYear && selectedYear === year.toString() ? 'selected' : '';
    years.push(`<option value="${year}" ${selected}>${year}年</option>`);
  }
  return years.join('');
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
