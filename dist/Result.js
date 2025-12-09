/**
 * Functional Result Type (Monad)
 * 
 * Represents the result of an operation that can either succeed (Ok) or fail (Err).
 * Enables "Railway Oriented Programming" - chaining operations without messy error checks.
 * 
 * @example
 * // Instead of:
 * // try {
 * //   const data = getData();
 * //   if (!data) throw new Error("No data");
 * //   const processed = process(data);
 * //   save(processed);
 * // } catch (e) { ... }
 * //
 * // Use:
 * // getData()
 * //   .map(process)
 * //   .flatMap(save)
 * //   .match({
 * //     ok: val => console.log("Success"),
 * //     err: err => console.error("Failed", err)
 * //   });
 */
class Result {
  constructor(isOk, value, error) {
    this._isOk = isOk;
    this._value = value;
    this._error = error;
    Object.freeze(this); // Immutable
  }

  /**
   * Create a Success result
   * @param {any} value 
   */
  static ok(value) {
    return new Result(true, value, null);
  }

  /**
   * Create a Failure result
   * @param {any} error 
   */
  static err(error) {
    return new Result(false, null, error);
  }

  /**
   * Wrapper for try-catch blocks
   * @param {Function} fn Function that might throw
   */
  static fromTry(fn) {
    try {
      return Result.ok(fn());
    } catch (e) {
      return Result.err(e);
    }
  }

  /**
   * Returns true if this is a Success result
   */
  isOk() {
    return this._isOk;
  }

  /**
   * Returns true if this is a Failure result
   */
  isErr() {
    return !this._isOk;
  }

  /**
   * Transform the value if Ok, otherwise return Err as is.
   * @param {Function} fn (value) => newValue
   */
  map(fn) {
    if (this._isOk) {
      try {
        return Result.ok(fn(this._value));
      } catch (e) {
        return Result.err(e);
      }
    }
    return Result.err(this._error);
  }

  /**
   * Chain a function that returns another Result.
   * @param {Function} fn (value) => Result
   */
  flatMap(fn) {
    if (this._isOk) {
      try {
        const result = fn(this._value);
        if (!(result instanceof Result)) {
          return Result.err(new Error("flatMap callback must return a Result"));
        }
        return result;
      } catch (e) {
        return Result.err(e);
      }
    }
    return Result.err(this._error);
  }

  /**
   * Handle both cases (Pattern Matching)
   * @param {Object} handlers { ok: (val) => any, err: (error) => any }
   */
  match(handlers) {
    if (this._isOk) {
      return handlers.ok(this._value);
    } else {
      return handlers.err(this._error);
    }
  }
  
  /**
   * Unwrap the value or return a default
   * @param {any} defaultValue 
   */
  getOrElse(defaultValue) {
    return this._isOk ? this._value : defaultValue;
  }

  /**
   * Unwrap the value or throw the error
   */
  unwrap() {
    if (this._isOk) {
      return this._value;
    }
    throw this._error;
  }
}

// Global Export for GAS
// In GAS, top-level functions/classes are global, but standard JS modules need export.
// We'll trust the GAS build system (or concatenation) to handle this class.
// If using modules, we would validly export it, but for raw GAS usage:
if (typeof exports !== 'undefined') {
  exports.Result = Result;
}
