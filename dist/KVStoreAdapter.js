/**
 * KVStoreAdapter (Infrastructure Layer)
 * 
 * Adapter for Key-Value storage (wrapping Google Apps Script PropertiesService).
 * Used for storing temporary tokens like Magic Links.
 */

// const { Result } = require('../shared/Result');

const KVStoreAdapter = {
  /**
   * Set a value with a key.
   * @param {string} key 
   * @param {string} value 
   * @returns {Result<void>}
   */
  set: (key, value) => {
    return Result.fromTry(() => {
      PropertiesService.getScriptProperties().setProperty(key, value);
      return true;
    });
  },

  /**
   * Get a value by key.
   * @param {string} key 
   * @returns {Result<string|null>}
   */
  get: (key) => {
    return Result.fromTry(() => {
      return PropertiesService.getScriptProperties().getProperty(key);
    });
  },

  /**
   * Delete a key.
   * @param {string} key 
   * @returns {Result<void>}
   */
  delete: (key) => {
    return Result.fromTry(() => {
      PropertiesService.getScriptProperties().deleteProperty(key);
      return true;
    });
  }
};

if (typeof exports !== 'undefined') {
  exports.KVStoreAdapter = KVStoreAdapter;
}
