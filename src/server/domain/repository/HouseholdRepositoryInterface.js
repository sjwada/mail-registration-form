/**
 * HouseholdRepositoryInterface (Domain Layer)
 * 
 * Defines the contract for Household data access.
 * Implementation must return Result objects.
 * This ensures the domain is decoupled from the storage mechanism.
 */
class HouseholdRepositoryInterface {
  /**
   * Find a household by registered email.
   * @param {string} email 
   * @returns {Result<Household|null, Error>}
   */
  findByEmail(email) {
    throw new Error("Method 'findByEmail' must be implemented.");
  }

  /**
   * Save a household (create or update).
   * @param {Household} household 
   * @returns {Result<string, Error>} Returns successful ID
   */
  save(household) {
    throw new Error("Method 'save' must be implemented.");
  }
}

if (typeof exports !== 'undefined') {
  exports.HouseholdRepositoryInterface = HouseholdRepositoryInterface;
}
