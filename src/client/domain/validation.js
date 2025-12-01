/**
 * Validates the registration form data.
 * @returns {boolean} True if valid, false otherwise.
 */
export function validateForm() {
  // Check guardian phone numbers
  const guardians = document.querySelectorAll('.guardian-card');
  for (let card of guardians) {
    const id = card.id;
    const mobile = card.querySelector(`[name="mobile_phone_${id}"]`).value;
    const home = card.querySelector(`[name="home_phone_${id}"]`).value;

    if (!mobile && !home) {
      // We need a way to show messages. For now, we'll return an object with error details or throw.
      // But to keep it simple and compatible with existing logic, we might need to pass a callback or return a result object.
      return { valid: false, message: '保護者の携帯電話または自宅電話のどちらか1つは必須です。' };
    }
  }

  return { valid: true };
}
