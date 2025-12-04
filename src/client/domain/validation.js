/**
 * Validates the registration form data.
 * @returns {boolean} True if valid, false otherwise.
 */
export function validateForm() {
  const postalCodeRegex = /^\d{3}-?\d{4}$/;
  const phoneRegex = /^0\d{1,4}-?\d{1,4}-?\d{3,4}$/;

  // Household Postal Code
  const householdPostalCode = document.getElementById('postalCode').value;
  if (householdPostalCode && !postalCodeRegex.test(householdPostalCode)) {
    return { valid: false, message: '世帯の郵便番号の形式が正しくありません。（例: 123-4567）' };
  }

  // Check guardian phone numbers and postal codes
  const guardians = document.querySelectorAll('.guardian-card');
  for (let card of guardians) {
    const id = card.id;
    const mobile = card.querySelector(`[name="mobile_phone_${id}"]`).value;
    const home = card.querySelector(`[name="home_phone_${id}"]`).value;
    const postalCode = card.querySelector(`[name="postalCode_${id}"]`).value;

    if (!mobile && !home) {
      return { valid: false, message: '保護者の携帯電話または自宅電話のどちらか1つは必須です。' };
    }

    if (mobile && !phoneRegex.test(mobile)) {
      return { valid: false, message: '保護者の携帯電話番号の形式が正しくありません。' };
    }

    if (home && !phoneRegex.test(home)) {
      return { valid: false, message: '保護者の自宅電話番号の形式が正しくありません。' };
    }

    if (postalCode && !postalCodeRegex.test(postalCode)) {
      return { valid: false, message: '保護者の郵便番号の形式が正しくありません。' };
    }
  }

  // Check student phone numbers and postal codes
  const students = document.querySelectorAll('.student-card');
  for (let card of students) {
    const id = card.id;
    const mobile = card.querySelector(`[name="s_mobile_phone_${id}"]`).value;
    const postalCode = card.querySelector(`[name="postalCode_s_${id}"]`).value;

    if (mobile && !phoneRegex.test(mobile)) {
      return { valid: false, message: '生徒の携帯電話番号の形式が正しくありません。' };
    }

    if (postalCode && !postalCodeRegex.test(postalCode)) {
      return { valid: false, message: '生徒の郵便番号の形式が正しくありません。' };
    }
  }

  return { valid: true };
}
