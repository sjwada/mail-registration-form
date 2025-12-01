/**
 * Wrapper for google.script.run that returns a Promise.
 * @param {string} functionName - The name of the server-side function to call.
 * @param {...any} args - Arguments to pass to the server-side function.
 * @returns {Promise<any>} - A Promise that resolves with the result or rejects with an error.
 */
export function runServerFunction(functionName, ...args) {
  return new Promise((resolve, reject) => {
    google.script.run
      .withSuccessHandler(resolve)
      .withFailureHandler(reject)
      [functionName](...args);
  });
}
