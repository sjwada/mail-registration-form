import { store } from '../state/store.js';
import { runServerFunction } from '../infra/api.js';
import { validateForm } from '../domain/validation.js';
import { addGuardian, removeGuardian } from './components/guardian.js';
import { addStudent, removeStudent } from './components/student.js';

// ============================================
// UI Utilities
// ============================================
function showLoading(show) {
  const loading = document.getElementById('loading');
  const form = document.getElementById('registrationForm');
  if (loading) loading.style.display = show ? 'block' : 'none';
  if (form) form.style.display = show ? 'none' : 'block';
}

function showMessage(message, type) {
  const messageDiv = document.getElementById('message');
  if (!messageDiv) return;
  
  messageDiv.className = 'alert alert-' + type;
  messageDiv.textContent = message;
  messageDiv.style.display = 'block';

  if (type === 'success') {
    setTimeout(() => {
      messageDiv.style.display = 'none';
    }, 3000);
  }
}

// ============================================
// Mode Switching
// ============================================
export function handleModeChange() {
  const modeInput = document.querySelector('input[name="mode"]:checked');
  if (!modeInput) return;

  const mode = modeInput.value;
  store.setState({ mode });

  const editAuthSection = document.getElementById('editAuthSection');
  const householdSection = document.getElementById('householdSection');
  const guardiansSection = document.getElementById('guardiansSection');
  const studentsSection = document.getElementById('studentsSection');
  const notesSection = document.getElementById('notesSection');
  const submitSection = document.getElementById('submitSection');

  if (mode === 'new') {
    if (editAuthSection) editAuthSection.style.display = 'none';
    if (householdSection) householdSection.style.display = 'block';
    if (guardiansSection) guardiansSection.style.display = 'block';
    if (studentsSection) studentsSection.style.display = 'block';
    if (notesSection) notesSection.style.display = 'block';
    if (submitSection) submitSection.style.display = 'block';

    const state = store.getState();
    if (state.guardianCount === 0) addGuardian();
    if (state.studentCount === 0) addStudent();
  } else {
    if (editAuthSection) editAuthSection.style.display = 'block';
    if (householdSection) householdSection.style.display = 'none';
    if (guardiansSection) guardiansSection.style.display = 'none';
    if (studentsSection) studentsSection.style.display = 'none';
    if (notesSection) notesSection.style.display = 'none';
    if (submitSection) submitSection.style.display = 'none';
  }
}

// ============================================
// Authentication
// ============================================
export async function authenticateEdit() {
  const email = document.getElementById('authEmail').value.trim();
  const editCode = document.getElementById('editCode').value.trim();

  if (!email) {
    showMessage('メールアドレスを入力してください。', 'danger');
    return;
  }

  if (!editCode) {
    showMessage('編集コードを入力してください。', 'danger');
    return;
  }

  showLoading(true);

  try {
    const result = await runServerFunction('authenticateWithEditCode', email, editCode);
    console.log('authenticateWithEditCode result:', result);
    showLoading(false);
    
    if (!result) {
      throw new Error('サーバーからの応答がありません。');
    }

    if (result.success) {
      let data = result.householdData;
      // データがJSON文字列の場合はパースしてオブジェクトに戻します
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch (e) {
          console.error('Failed to parse householdData JSON:', e);
        }
      }
      loadHouseholdData(data);
      showMessage('認証に成功しました。', 'success');
    } else {
      showMessage(result.message, 'danger');
    }
  } catch (error) {
    showLoading(false);
    console.error('Authentication error:', error);
    showMessage('エラーが発生しました: ' + error.message, 'danger');
  }
}

export async function requestMagicLink() {
  const email = document.getElementById('authEmail').value.trim();

  if (!email) {
    showMessage('メールアドレスを入力してください。', 'danger');
    return;
  }

  showLoading(true);

  try {
    const result = await runServerFunction('requestMagicLink', email);
    showLoading(false);
    if (result.success) {
      showMessage(result.message, 'success');
    } else {
      showMessage(result.message, 'danger');
    }
  } catch (error) {
    showLoading(false);
    showMessage('エラーが発生しました: ' + error.message, 'danger');
  }
}

// ============================================
// Data Loading
// ============================================
// ============================================
// Data Loading
// ============================================
export function loadHouseholdData(householdData) {
  // Hide auth section and mode selection
  const editAuthSection = document.getElementById('editAuthSection');
  if (editAuthSection) editAuthSection.style.display = 'none';

  const modeSections = document.querySelectorAll('.form-section');
  if (modeSections.length > 0) {
    modeSections[0].style.display = 'none';
  }

  // Show form sections
  document.getElementById('householdSection').style.display = 'block';
  document.getElementById('guardiansSection').style.display = 'block';
  document.getElementById('studentsSection').style.display = 'block';
  document.getElementById('notesSection').style.display = 'block';
  document.getElementById('submitSection').style.display = 'block';

  // Change submit button text
  const submitBtn = document.querySelector('#submitSection button[type="submit"]');
  if (submitBtn) {
    submitBtn.textContent = '更新';
  }

  store.setState({ mode: 'edit' });

  // Household info
  if (householdData.household) {
    const h = householdData.household;
    // Store householdId in state for update
    store.setState({ householdId: h.householdId });
    
    document.getElementById('postalCode').value = h.postalCode || '';
    document.getElementById('prefecture').value = h.prefecture || '';
    document.getElementById('city').value = h.city || '';
    document.getElementById('street').value = h.street || '';
    document.getElementById('building').value = h.building || '';
    document.getElementById('notes').value = h.notes || '';
  }

  // Guardians
  document.getElementById('guardiansList').innerHTML = '';
  store.setState({ guardianCount: 0 });
  if (householdData.guardians && householdData.guardians.length > 0) {
    householdData.guardians.forEach(guardian => {
      addGuardian(guardian);
    });
  }

  // Students
  document.getElementById('studentsList').innerHTML = '';
  store.setState({ studentCount: 0 });
  if (householdData.students && householdData.students.length > 0) {
    householdData.students.forEach(student => {
      addStudent(student);
    });
  }
}

// ============================================
// Form Submission
// ============================================
// ============================================
// Form Submission
// ============================================
export function collectFormData() {
  const formData = {
    household: {
      postalCode: document.getElementById('postalCode').value,
      prefecture: document.getElementById('prefecture').value,
      city: document.getElementById('city').value,
      street: document.getElementById('street').value,
      building: document.getElementById('building').value,
      notes: document.getElementById('notes').value
    },
    guardians: [],
    students: []
  };

  document.querySelectorAll('.guardian-card').forEach(card => {
    const id = card.id;
    // Helper to safely get value
    const getVal = (name) => {
        const el = card.querySelector(`[name="${name}"]`);
        return el ? el.value : '';
    };

    // Check if separate address is enabled
    const separateAddressCheckbox = document.getElementById(`separate_address_${id}`);
    const useSeparateAddress = separateAddressCheckbox && separateAddressCheckbox.checked;

    formData.guardians.push({
      guardianId: getVal(`guardianId_${id}`), // Collect hidden ID
      relationship: getVal(`relationship_${id}`),
      contactPriority: getVal(`priority_${id}`) ? parseInt(getVal(`priority_${id}`)) : '',
      contactMethod: getVal(`contact_method_${id}`),
      lastName: getVal(`last_name_${id}`),
      firstName: getVal(`first_name_${id}`),
      lastNameKana: getVal(`last_name_kana_${id}`),
      firstNameKana: getVal(`first_name_kana_${id}`),
      email: getVal(`email_${id}`),
      meetingEmail: getVal(`meeting_email_${id}`),
      mobilePhone: getVal(`mobile_phone_${id}`),
      homePhone: getVal(`home_phone_${id}`),
      // Address fields - clear if not using separate address
      postalCode: useSeparateAddress ? getVal(`postalCode_${id}`) : '',
      prefecture: useSeparateAddress ? getVal(`prefecture_${id}`) : '',
      city: useSeparateAddress ? getVal(`city_${id}`) : '',
      street: useSeparateAddress ? getVal(`street_${id}`) : '',
      building: useSeparateAddress ? getVal(`building_${id}`) : ''
    });
  });

  document.querySelectorAll('.student-card').forEach(card => {
    const id = card.id;
    const getVal = (name) => {
        const el = card.querySelector(`[name="${name}"]`);
        return el ? el.value : '';
    };

    // Check if separate address is enabled
    const separateAddressCheckbox = document.getElementById(`separate_address_s_${id}`);
    const useSeparateAddress = separateAddressCheckbox && separateAddressCheckbox.checked;

    formData.students.push({
      studentId: getVal(`studentId_${id}`), // Collect hidden ID
      lastName: getVal(`s_last_name_${id}`),
      firstName: getVal(`s_first_name_${id}`),
      lastNameKana: getVal(`s_last_name_kana_${id}`),
      firstNameKana: getVal(`s_first_name_kana_${id}`),
      graduationYear: getVal(`graduation_year_${id}`),
      email: getVal(`s_email_${id}`),
      classEmail: getVal(`s_class_email_${id}`),
      mobilePhone: getVal(`s_mobile_phone_${id}`),
      // Address fields - clear if not using separate address
      postalCode: useSeparateAddress ? getVal(`postalCode_s_${id}`) : '',
      prefecture: useSeparateAddress ? getVal(`prefecture_s_${id}`) : '',
      city: useSeparateAddress ? getVal(`city_s_${id}`) : '',
      street: useSeparateAddress ? getVal(`street_s_${id}`) : '',
      building: useSeparateAddress ? getVal(`building_s_${id}`) : ''
    });
  });

  return formData;
}

// Global variable to store form data for confirmation
let pendingFormData = null;

export function showConfirmation(formData) {
  pendingFormData = formData;
  
  const contentDiv = document.getElementById('confirmationContent');
  if (!contentDiv) return;

  let html = '<div class="confirmation-details">';

  // 世帯情報
  html += '<h3>📍 ご自宅住所</h3>';
  html += `<p>〒${formData.household.postalCode}<br>`;
  html += `${formData.household.prefecture} ${formData.household.city} ${formData.household.street} ${formData.household.building}</p>`;
  if (formData.household.notes) {
    html += `<p><strong>備考:</strong><br>${formData.household.notes.replace(/\n/g, '<br>')}</p>`;
  }
  html += '<hr>';

  // 保護者情報
  html += '<h3>👨‍👩‍👧‍👦 保護者情報</h3>';
  formData.guardians.forEach((g, index) => {
    html += `<div class="mb-3"><strong>保護者${index + 1}: ${g.lastName} ${g.firstName}</strong>`;
    html += `<br>カナ: ${g.lastNameKana} ${g.firstNameKana}`;
    html += `<br>続柄: ${g.relationship}`;
    html += `<br>連絡優先順位: ${g.contactPriority}位`;
    html += `<br>連絡方法: ${g.contactMethod}`;
    if (g.mobilePhone) html += `<br>携帯電話: ${g.mobilePhone}`;
    if (g.homePhone) html += `<br>自宅電話: ${g.homePhone}`;
    html += `<br>Email: ${g.email}`;
    if (g.meetingEmail) html += `<br>オンライン面談用Email: ${g.meetingEmail}`;
    if (g.postalCode) {
      html += `<br>住所: 〒${g.postalCode} ${g.prefecture} ${g.city} ${g.street} ${g.building}`;
    } else {
      html += `<br>住所: ご自宅と同じ`;
    }
    html += '</div>';
  });
  html += '<hr>';

  // 生徒情報
  html += '<h3>👨‍🎓 生徒情報</h3>';
  formData.students.forEach((s, index) => {
    html += `<div class="mb-3"><strong>生徒${index + 1}: ${s.lastName} ${s.firstName}</strong>`;
    html += `<br>カナ: ${s.lastNameKana} ${s.firstNameKana}`;
    html += `<br>卒業予定: ${s.graduationYear}年3月`;
    if (s.email) html += `<br>Email: ${s.email}`;
    if (s.classEmail) html += `<br>Classroom用Email: ${s.classEmail}`;
    if (s.mobilePhone) html += `<br>携帯電話: ${s.mobilePhone}`;
    if (s.postalCode) {
      html += `<br>住所: 〒${s.postalCode} ${s.prefecture} ${s.city} ${s.street} ${s.building}`;
    } else {
      html += `<br>住所: ご自宅と同じ`;
    }
    html += '</div>';
  });

  html += '</div>';
  contentDiv.innerHTML = html;

  // 画面切り替え
  document.getElementById('registrationForm').style.display = 'none';
  document.getElementById('confirmationSection').style.display = 'block';
  window.scrollTo(0, 0);
}

export function handleBack() {
  document.getElementById('confirmationSection').style.display = 'none';
  document.getElementById('registrationForm').style.display = 'block';
  window.scrollTo(0, 0);
}

export async function handleFinalSubmit() {
  if (!pendingFormData) return;

  showLoading(true);
  document.getElementById('confirmationSection').style.display = 'none';

  try {
    const state = store.getState();
    let result;

    if (state.mode === 'edit') {
      if (!state.householdId) {
        throw new Error('世帯IDが見つかりません。');
      }
      // Call update function in edit mode
      result = await runServerFunction('updateHouseholdData', state.householdId, pendingFormData);
    } else {
      // Call submit function in new mode
      result = await runServerFunction('submitRegistration', pendingFormData);
    }

    showLoading(false);
    showLoading(false);
    if (result.success) {
      // Auto-Login Flow
      showMessage(result.message, 'success');
      
      // Parse returned data
      let data = result.householdData;
      if (typeof data === 'string') {
          try {
              data = JSON.parse(data);
          } catch(e) {
              console.error("Failed to parse result data", e);
          }
      }

      if (data) {
          // Switch to Edit Mode immediately
          document.getElementById('confirmationSection').style.display = 'none';
          loadHouseholdData(data); // This shows the form sections again
          window.scrollTo(0, 0);
          
          // Optional: Show a "Welcome" toast or modal? 
          // For now, showMessage is enough.
          showMessage('登録が完了しました。マイページへ移動しました。', 'success');
      } else {
           // Fallback if no data returned (should not happen with new server logic)
           document.getElementById('confirmationSection').innerHTML = `
            <div class="text-center py-5">
              <h2 class="text-success mb-4">送信完了</h2>
              <p>${result.message}</p>
              <p>この画面を閉じてください。</p>
            </div>
          `;
          document.getElementById('confirmationSection').style.display = 'block';
      }

    } else {
      showMessage(result.message, 'danger');
      // エラー時はフォームに戻る
      document.getElementById('registrationForm').style.display = 'block';
    }
  } catch (error) {
    showLoading(false);
    showMessage('エラーが発生しました: ' + error.message, 'danger');
    document.getElementById('registrationForm').style.display = 'block';
  }
}

export async function handleSubmit(e) {
  e.preventDefault();

  const validation = validateForm();
  if (!validation.valid) {
    if (validation.message) showMessage(validation.message, 'danger');
    return;
  }

  const formData = collectFormData();
  showConfirmation(formData);
}

// ============================================
// Address Search
// ============================================
export async function searchAddress(postalCodeInputId, prefectureId, cityId, streetId) {
  const postalCodeInput = document.getElementById(postalCodeInputId);
  if (!postalCodeInput) return;

  const postalCode = postalCodeInput.value.replace(/-/g, '');
  if (postalCode.length !== 7) {
    showMessage('郵便番号は7桁で入力してください。', 'danger');
    return;
  }

  showLoading(true);

  try {
    const response = await fetch('https://zipcloud.ibsnet.co.jp/api/search?zipcode=' + postalCode);
    const data = await response.json();
    showLoading(false);

    if (data.results) {
      const result = data.results[0];
      document.getElementById(prefectureId).value = result.address1;
      document.getElementById(cityId).value = result.address2;
      document.getElementById(streetId).value = result.address3;
      showMessage('住所を自動入力しました。', 'success');
    } else {
      showMessage('郵便番号が見つかりませんでした。', 'danger');
    }
  } catch (error) {
    showLoading(false);
    console.error('住所検索エラー:', error);
    showMessage('住所検索に失敗しました。', 'danger');
  }
}

export function toggleAddress(id) {
    const checkbox = document.getElementById(`separate_address_${id}`);
    const fields = document.getElementById(`address_fields_${id}`);
    if (checkbox && fields) {
        fields.style.display = checkbox.checked ? 'block' : 'none';
    }
}
