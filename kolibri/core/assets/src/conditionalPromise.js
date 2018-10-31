/**
 * Conditional Promise
 */
export default class ConditionalPromise {
  /**
   * Create a conditional promise - like a promise, but with an additional method 'only'
   * that allows for chaining resolve/reject handlers that will only be called if a
   * certain condition pertains.
   */
  constructor(...args) {
    if ([...args].length) {
      this._promise = new Promise(...args);
    }
  }

  catch(...args) {
    this._promise = this._promise.catch(...args);
    return this;
  }

  then(...args) {
    this._promise = this._promise.then(...args);
    return this;
  }

  /**
   * When the promise resolves, call resolve function, only if continueCheck evaluates to true.
   * @param {Function} continueCheck - Function that returns a Boolean,
   * @param {Function} resolve - Function to call if the Promise succeeds.
   * @param {FUnction} reject - Function to call if the Promise fails.
   */
  only(continueCheck, resolve, reject) {
    this._promise.then(
      success => {
        if (continueCheck() && resolve) {
          return resolve(success);
        }
        return success;
      },
      error => {
        if (continueCheck() && reject) {
          return reject(error);
        }
        return error;
      }
    );
    return this;
  }

  /**
   * Equivalent of Promise.all, but return a ConditionalPromise instead.
   * @param {Array<Promise>|Array<ConditionalPromise>} promises - an array of Promises
   */
  static all(promises) {
    const conditionalPromise = new ConditionalPromise();
    conditionalPromise._promise = Promise.all(promises);
    return conditionalPromise;
  }

  static resolve(value) {
    const conditionalPromise = new ConditionalPromise();
    conditionalPromise._promise = Promise.resolve(value);
    return conditionalPromise;
  }
}
