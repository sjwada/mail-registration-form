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
    showLoading(false);
    if (result.success) {
      loadHouseholdData(result.householdData);
      showMessage('認証に成功しました。', 'success');
    } else {
      showMessage(result.message, 'danger');
    }
  } catch (error) {
    showLoading(false);
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

    formData.guardians.push({
      relationship: getVal(`relationship_${id}`),
      contactPriority: parseInt(getVal(`priority_${id}`)),
      contactMethod: getVal(`contact_method_${id}`),
      lastName: getVal(`last_name_${id}`),
      firstName: getVal(`first_name_${id}`),
      lastNameKana: getVal(`last_name_kana_${id}`),
      firstNameKana: getVal(`first_name_kana_${id}`),
      email: getVal(`email_${id}`),
      meetingEmail: getVal(`meeting_email_${id}`),
      mobilePhone: getVal(`mobile_phone_${id}`),
      homePhone: getVal(`home_phone_${id}`),
      // Address fields
      postalCode: getVal(`postalCode_${id}`),
      prefecture: getVal(`prefecture_${id}`),
      city: getVal(`city_${id}`),
      street: getVal(`street_${id}`),
      building: getVal(`building_${id}`)
    });
  });

  document.querySelectorAll('.student-card').forEach(card => {
    const id = card.id;
    const getVal = (name) => {
        const el = card.querySelector(`[name="${name}"]`);
        return el ? el.value : '';
    };

    formData.students.push({
      lastName: getVal(`s_last_name_${id}`),
      firstName: getVal(`s_first_name_${id}`),
      lastNameKana: getVal(`s_last_name_kana_${id}`),
      firstNameKana: getVal(`s_first_name_kana_${id}`),
      graduationYear: getVal(`graduation_year_${id}`),
      email: getVal(`s_email_${id}`),
      classEmail: getVal(`s_class_email_${id}`),
      mobilePhone: getVal(`s_mobile_phone_${id}`),
      // Address fields
      postalCode: getVal(`postalCode_s_${id}`),
      prefecture: getVal(`prefecture_s_${id}`),
      city: getVal(`city_s_${id}`),
      street: getVal(`street_s_${id}`),
      building: getVal(`building_s_${id}`)
    });
  });

  return formData;
}

export async function handleSubmit(e) {
  e.preventDefault();

  const validation = validateForm();
  if (!validation.valid) {
    if (validation.message) showMessage(validation.message, 'danger');
    return;
  }

  const formData = collectFormData();
  showLoading(true);

  try {
    const result = await runServerFunction('submitRegistration', formData);
    showLoading(false);
    if (result.success) {
      showMessage(result.message, 'success');
      // Redirect to complete page (implementation pending)
      window.top.location.href = result.redirectUrl || 'complete'; 
    } else {
      showMessage(result.message, 'danger');
    }
  } catch (error) {
    showLoading(false);
    showMessage('エラーが発生しました: ' + error.message, 'danger');
  }
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
