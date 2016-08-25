class ConditionalPromise {
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
    this._promise.catch(...args);
    return this;
  }

  then(...args) {
    this._promise.then(...args);
    return this;
  }

  only(continueCheck, resolve, reject) {
    /*
     * When the promise resolves, call resolve function, only if continueCheck evaluates to true.
     * @param {continueCheck} Function - Function that returns a Boolean,
     * @param {resolve} Function - Function to call if the Promise succeeds.
     * @param {reject} Function - Function to call if the Promise fails.
     */
    this._promise.then((success) => {
      if (continueCheck() && resolve) {
        resolve(success);
      }
    }, (error) => {
      if (continueCheck() && reject) {
        reject(error);
      }
    });
    return this;
  }

  static all(promises) {
    /*
     * Equivalent of Promise.all, but return a ConditionalPromise instead.
     * @param {promises} [Promise|ConditionalPromise] - an array of Promises
     */
    const conditionalPromise = new ConditionalPromise();
    conditionalPromise._promise = Promise.all(promises);
    return conditionalPromise;
  }
}

module.exports = ConditionalPromise;
