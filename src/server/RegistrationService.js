/**
 * RegistrationService (Application Layer)
 * 
 * Handles persistence and business logic for new registrations.
 * Uses Result monad for flow control.
 */

// const { HouseholdRepositoryClean } = require('./domain/repository/HouseholdRepositoryClean');
// const { Result } = require('./shared/Result');

class RegistrationService {
  constructor(householdRepo) {
    this.householdRepo = householdRepo || new HouseholdRepositoryClean();
  }

  /**
   * Process a new registration.
   * @param {object} formData 
   * @returns {Result<object, Error>} { householdId, ... }
   */
  register(formData) {
    // Pipeline: Validate -> Check Duplicate -> Save -> Send Email
    
    return this._validate(formData)
      .flatMap(() => this._checkDuplicate(formData))
      .flatMap(() => this.householdRepo.save(formData))
      .flatMap(saveResult => {
         // Send Emails (Side Effects)
         return Result.fromTry(() => {
            const primaryGuardian = formData.guardians.find(g => g.contactPriority === 1);
            
            // Re-fetch clean data for email template or use formData?
            // Legacy uses re-fetched data. Let's try to pass formData + IDs since we have them.
            // Actually legacy calls `getHouseholdData` which joins sheets.
            // For robustness, let's just construct the summary from formData since we just validated it.
            // Or better, stick to legacy behavior if possible or verify consistency.
            // For "Pilot", let's use the formData we have + the ID we just generated.
            // We need to format it to look like the object `sendConfirmationEmail` expects.
            
            // Wait, legacy `sendConfirmationEmail` takes `householdData` (Aggregate).
            // `formData` structure is { household: {}, guardians: [], students: [] }.
            // `householdData` structure from Repository is { household: {}, guardians: [], students: [] }.
            // They are identical in structure! 
            // So we can just augment formData with the new ID.
            
            const householdDataForEmail = {
               household: { ...formData.household, householdId: saveResult.householdId },
               guardians: formData.guardians, // IDs are missing but maybe not needed for summary text?
               students: formData.students
            };
            
            // Send Application Email
            sendConfirmationEmail(primaryGuardian.email, householdDataForEmail, saveResult.editCode);
            
            // Send Admin Email
            sendAdminNotificationEmail(householdDataForEmail);
            
            return saveResult;
         });
      });
  }

  /**
   * Functional Validation
   */
  _validate(formData) {
    return Result.fromTry(() => {
       const errors = [];
       
       // 1. Basic Presence
       if (!formData.guardians || formData.guardians.length === 0) errors.push('保護者を最低1人登録してください。');
       if (!formData.students || formData.students.length === 0) errors.push('生徒を最低1人登録してください。');
       
       const postalCodeRegex = /^\d{3}-?\d{4}$/;
       const phoneRegex = /^0\d{1,4}-?\d{1,4}-?\d{3,4}$/;

       // Household URL check? No, postal code
       if (formData.household.postalCode && !postalCodeRegex.test(formData.household.postalCode)) {
         errors.push('世帯の郵便番号の形式が正しくありません。');
       }

       // 2. Guardians
       const priorities = [];
       formData.guardians.forEach((g, i) => {
          if (!g.mobilePhone && !g.homePhone) errors.push(`保護者(${i+1}): 携帯または自宅電話番号が必要です。`);
          if (g.mobilePhone && !phoneRegex.test(g.mobilePhone)) errors.push(`保護者(${i+1}): 携帯電話番号の形式が不正です。`);
          if (g.homePhone && !phoneRegex.test(g.homePhone)) errors.push(`保護者(${i+1}): 自宅電話番号の形式が不正です。`);
          
          if (g.contactPriority) priorities.push(parseInt(g.contactPriority));
          
          if (g.postalCode) {
             if (!g.prefecture || !g.city || !g.street) errors.push(`保護者(${i+1}): 住所を記入する場合は必須項目を全て埋めてください。`);
             if (!postalCodeRegex.test(g.postalCode)) errors.push(`保護者(${i+1}): 郵便番号の形式が不正です。`);
          }
       });

       // Priority Check
       if (formData.guardians.length > 1) {
          const unique = new Set(priorities);
          if (unique.size !== formData.guardians.length) errors.push('保護者の連絡優先順位が重複しています。');
          // Sequential?
          for (let k = 1; k <= formData.guardians.length; k++) {
             if (!priorities.includes(k)) errors.push(`保護者の連絡優先順位は1からの連番である必要があります(${k}が欠番)。`);
          }
       }

       // 3. Students
       formData.students.forEach((s, i) => {
          if (s.mobilePhone && !phoneRegex.test(s.mobilePhone)) errors.push(`生徒(${i+1}): 携帯電話番号の形式が不正です。`);
          if (s.postalCode) {
             if (!s.prefecture || !s.city || !s.street) errors.push(`生徒(${i+1}): 住所を記入する場合は必須項目を全て埋めてください。`);
             if (!postalCodeRegex.test(s.postalCode)) errors.push(`生徒(${i+1}): 郵便番号の形式が不正です。`);
          }
       });

       if (errors.length > 0) {
         throw new Error(errors.join('\n'));
       }
       return true;
    });
  }

  _checkDuplicate(formData) {
    const primary = formData.guardians.find(g => Number(g.contactPriority) === 1);
    if (!primary) return Result.err(new Error('連絡優先順位1位の保護者がいません。'));
    
    return this.householdRepo.findByEmail(primary.email)
      .flatMap(existingId => {
         if (existingId) {
           return Result.err(new Error('このメールアドレスは既に登録されています。編集モードをご利用ください。'));
         }
         return Result.ok(true);
      });
  }
}

if (typeof exports !== 'undefined') {
  exports.RegistrationService = RegistrationService;
}
