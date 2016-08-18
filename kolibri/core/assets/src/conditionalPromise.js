class ConditionalPromise {
  /**
   * Create a conditional promise - like a promise, but cancelable!
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

  only(cancelCheck, resolve, reject) {
    this._promise.then((success) => {
      if (cancelCheck() && resolve) {
        resolve(success);
      }
    }, (error) => {
      if (cancelCheck() && reject) {
        reject(error);
      }
    });
    return this;
  }

  static all(promises) {
    const conditionalPromise = new ConditionalPromise();
    conditionalPromise._promise = Promise.all(promises);
    return conditionalPromise;
  }
}

module.exports = ConditionalPromise;
