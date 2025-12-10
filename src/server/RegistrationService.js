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
    // Pipeline: Filter Empty -> Validate -> Check Duplicate -> Save -> Send Email
    
    // 0. Filter Empty Entries (Silent Cleanup)
    formData.guardians = formData.guardians.filter(g => g.lastName && g.firstName);
    formData.students = formData.students.filter(s => s.lastName && s.firstName);
    
    return ValidationService.validate(formData)
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
      })
      .flatMap(saveResult => {
          // Fetch the fully persisted data (including generated IDs)
          return this.householdRepo.getHouseholdData(saveResult.householdId)
            .map(fullData => {
                return {
                    ...saveResult,
                    householdData: fullData
                };
            });
      });
  }

  _checkDuplicate(formData) {
    const loginEmail = formData.household.loginEmail;
    if (!loginEmail) return Result.err(new Error('ログイン用メールアドレスがありません。'));
    
    return this.householdRepo.findByEmail(loginEmail)
      .flatMap(existingData => {
         if (existingData) {
           return Result.err(new Error('このメールアドレスは既に登録されています。'));
         }
         return Result.ok(true);
      });
  }
}

if (typeof exports !== 'undefined') {
  exports.RegistrationService = RegistrationService;
}
