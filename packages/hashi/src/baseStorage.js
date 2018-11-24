/**
 * This class offers an API-compatible replacement for localStorage and sessionStorage
 * to be used when apps are run in sandbox mode.
 *
 * For more information, see: https://developer.mozilla.org/en-US/docs/Web/API/Storage
 */
import BaseShim from './baseShim';

export default class BaseStorage extends BaseShim {
  constructor(mediator) {
    super(mediator);
    this.__data = {};
  }

  iframeInitialize() {
    Object.defineProperty(window, this.nameSpace, { value: this.__getShimInterface() });
  }

  __getShimInterface() {
    const self = this;
    return {
      get length() {
        return Object.keys(self.data).length;
      },

      key(index) {
        return Object.keys(self.data)[index];
      },

      getItem(keyName) {
        return self.__data[keyName];
      },

      setItem(keyName, value) {
        // Can only store strings in localStorage
        // by default everything is coerced to a string
        // We follow the API to spec
        self.__data[keyName] = String(value);
        self.stateUpdated();
      },

      removeItem(keyName) {
        delete self.__data[keyName];
        self.stateUpdated();
      },

      clear() {
        self.__data = {};
        self.stateUpdated();
      },
    };
  }
}
