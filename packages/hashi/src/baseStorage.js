/**
 * This class offers an API-compatible replacement for localStorage and sessionStorage
 * to be used when apps are run in sandbox mode.
 *
 * For more information, see: https://developer.mozilla.org/en-US/docs/Web/API/Storage
 */
import BaseShim from './baseShim';

// List out all the keys that exist on the shim itself to
// prevent accidental overwriting.
// We need to set data on the shim object to allow checks
// of object membership with 'in'
const internalKeys = ['length', 'key', 'getItem', 'setItem', 'removeItem', 'clear'];

export default class BaseStorage extends BaseShim {
  constructor(mediator) {
    super(mediator);
    this.data = {};
  }

  __setData(data = {}) {
    this.data = data;
    this.setDataToShim();
  }

  /*
   * Method to check any changes
   * in shim properties, due to direct property setting
   * deletion, etc. that has not gone through setItem or removeItem
   */
  setDataFromShim() {
    const updatedData = Object.assign({}, this.data);
    let updated = false;
    const shimKeys = Object.keys(this.shim);
    // Won't include the object methods
    shimKeys.forEach(key => {
      // Ignore internal keys
      if (!internalKeys.includes(key)) {
        const value = String(this.shim[key]);
        if (this.data[key] !== value) {
          updatedData[key] = value;
          updated = true;
        }
      }
    });
    Object.keys(this.data).forEach(key => {
      if (!shimKeys.includes(key) && !internalKeys.includes(key)) {
        delete updatedData[key];
        updated = true;
      }
    });
    if (updated) {
      this.__setData(updatedData);
      this.stateUpdated();
    }
  }

  setDataToShim() {
    if (this.shim) {
      // Assign all data that is not keyed by
      // one of our built in object keys
      // onto our shim object.
      Object.assign(
        this.shim,
        ...Object.entries(this.data)
          .filter(entry => !internalKeys.includes(entry[0]))
          .map(entry => ({ [entry[0]]: entry[1] }))
      );
      // Now remove any keys on the shim that shouldn't be there now.
      const shimProps = Object.keys(this.shim);
      shimProps.forEach(prop => {
        if (!this.data[prop]) {
          delete this.shim[prop];
        }
      });
    }
  }

  iframeInitialize() {
    this.__setShimInterface();
    Object.defineProperty(window, this.nameSpace, {
      value: this.shim,
      configurable: true,
    });
  }

  __setShimInterface() {
    const self = this;

    class Shim {
      get length() {
        self.setDataFromShim();
        return Object.keys(self.data).length;
      }

      key(index) {
        self.setDataFromShim();
        // Return null if no key defined, as per storage spec.
        return Object.keys(self.data)[index] || null;
      }

      getItem(keyName) {
        self.setDataFromShim();
        // Return null if no key defined, as per storage spec.
        return self.data[keyName] || null;
      }

      setItem(keyName, value) {
        // Can only store strings in localStorage
        // by default everything is coerced to a string
        // We follow the API to spec
        value = String(value);
        self.data[keyName] = value;
        // Also store the value on the instance itself,
        // unless it would overwrite a method.
        if (!internalKeys.includes(keyName)) {
          this[keyName] = value;
        }
        self.stateUpdated();
      }

      removeItem(keyName) {
        delete self.data[keyName];
        // Also delete the key on the instance itself,
        // unless it would overwrite a method.
        if (!internalKeys.includes(keyName)) {
          delete this[keyName];
        }
        self.stateUpdated();
      }

      clear() {
        self.data = {};
        self.stateUpdated();
      }
    }
    this.shim = new Shim();

    this.setDataToShim();

    return this.shim;
  }
}
