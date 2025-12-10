/**
 * UpdateService (Application Layer)
 * 
 * Orchestrates the "Update Household" use case.
 * - Change Detection (TODO)
 * - Data Persistence (Versioning)
 * - Notifications (TODO)
 */
// const { HouseholdRepositoryClean } = require('./domain/repository/HouseholdRepositoryClean');
// const { Result } = require('./shared/Result');

class UpdateService {
  constructor(householdRepo) {
    this.householdRepo = householdRepo || new HouseholdRepositoryClean();
  }

  /**
   * Update household data.
   * @param {object} formData (DTO from frontend)
   * @returns {Result<object, Error>}
   */
  update(formData) {
    // 1. Validation (Delegate to RegistrationService-like logic or standalone)
    // For now, assume basic validity or reuse RegistrationService._validate?
    // We should ideally reuse validation logic.
    // But for this step, we trust the repo to handle saving.
    
    // 2. Map Frontend DTO to Domain Entity (if mismatch exists)
    // Actually, Repo expects a similar structure but checks logical IDs.
    
    // 3. Save (Repository handles versioning)
    return this.householdRepo.save(formData)
       .map(result => {
           // Success
           
           // Send Notification Email (Side Effect)
           try {
             // Use current time as approximation of update time
             sendEditNotificationEmails(formData.guardians, new Date());
           } catch (e) {
             console.error("Failed to send email: " + e.toString());
             // Suppress email error to ensure save success is returned
           }

           return {
               householdId: result.householdId,
               version: result.version
           };
       })
       .flatMap(ctx => {
           // Fetch the fully persisted updated data
           return this.householdRepo.getHouseholdData(ctx.householdId)
             .map(fullData => {
                 return {
                     success: true,
                     message: '修正内容を保存しました。',
                     householdId: ctx.householdId,
                     version: ctx.version,
                     householdData: fullData
                 };
             });
       });
  }
}

if (typeof exports !== 'undefined') {
  exports.UpdateService = UpdateService;
}
