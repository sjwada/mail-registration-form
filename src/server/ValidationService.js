/**
 * ValidationService
 * 
 * Centralized validation logic for household data.
 * Used by both RegistrationService and UpdateService.
 */

class ValidationService {
  /**
   * Validate household form data
   * @param {object} formData 
   * @returns {Result<boolean, Error>}
   */
  static validate(formData) {
    return Result.fromTry(() => {
       const errors = [];
       
       // 1. Login Email (Required)
       if (!formData.household.loginEmail) {
         errors.push('ログイン用メールアドレスは必須です。');
       } else if (!isValidEmail(formData.household.loginEmail)) {
         errors.push('ログイン用メールアドレスの形式が正しくありません。');
       }
       
       // 2. Basic Presence
       if (!formData.guardians || formData.guardians.length === 0) {
         errors.push('保護者を最低1人登録してください。');
       }
       if (!formData.students || formData.students.length === 0) {
         errors.push('生徒を最低1人登録してください。');
       }
       
       const postalCodeRegex = /^\\d{3}-?\\d{4}$/;
       const phoneRegex = /^0\\d{1,4}-?\\d{1,4}-?\\d{3,4}$/;

       // 3. Guardians
       const priorities = [];
       formData.guardians.forEach((g, i) => {
          // Guardian 1 (index 0): address required, homePhone OR mobilePhone required
          if (i === 0) {
            // Guardian 1 must have address (always displayed)
            if (!g.postalCode || !g.prefecture || !g.city || !g.street) {
              errors.push(`保護者(${i+1}): 住所は必須です。`);
            }
            if (g.postalCode && !postalCodeRegex.test(g.postalCode)) {
              errors.push(`保護者(${i+1}): 郵便番号の形式が不正です。`);
            }
            // Phone: homePhone OR mobilePhone required
            if (!g.mobilePhone && !g.homePhone) {
              errors.push(`保護者(${i+1}): 携帯電話または自宅電話番号が必須です。`);
            }
          }
          
          // Phone format validation (all guardians)
          if (g.mobilePhone && !phoneRegex.test(g.mobilePhone)) {
            errors.push(`保護者(${i+1}): 携帯電話番号の形式が不正です。`);
          }
          if (g.homePhone && !phoneRegex.test(g.homePhone)) {
            errors.push(`保護者(${i+1}): 自宅電話番号の形式が不正です。`);
          }
          
          if (g.contactPriority) priorities.push(parseInt(g.contactPriority));
          
          // Separate address validation (guardian 2+)
          if (i > 0 && g.postalCode) {
             if (!g.prefecture || !g.city || !g.street) {
               errors.push(`保護者(${i+1}): 住所を記入する場合は必須項目を全て埋めてください。`);
             }
             if (!postalCodeRegex.test(g.postalCode)) {
               errors.push(`保護者(${i+1}): 郵便番号の形式が不正です。`);
             }
          }
       });

       // Priority Check
       if (formData.guardians.length > 1) {
          const unique = new Set(priorities);
          if (unique.size !== formData.guardians.length) {
            errors.push('保護者の連絡優先順位が重複しています。');
          }
          for (let k = 1; k <= formData.guardians.length; k++) {
             if (!priorities.includes(k)) {
               errors.push(`保護者の連絡優先順位は1からの連番である必要があります(${k}が欠番)。`);
             }
          }
       }

       // 4. Students
       formData.students.forEach((s, i) => {
          if (s.mobilePhone && !phoneRegex.test(s.mobilePhone)) {
            errors.push(`生徒(${i+1}): 携帯電話番号の形式が不正です。`);
          }
          if (s.postalCode) {
             if (!s.prefecture || !s.city || !s.street) {
               errors.push(`生徒(${i+1}): 住所を記入する場合は必須項目を全て埋めてください。`);
             }
             if (!postalCodeRegex.test(s.postalCode)) {
               errors.push(`生徒(${i+1}): 郵便番号の形式が不正です。`);
             }
          }
       });

       if (errors.length > 0) {
         throw new Error(errors.join('\\n'));
       }
       return true;
    });
  }
}

if (typeof exports !== 'undefined') {
  exports.ValidationService = ValidationService;
}
