import Vue from 'vue';

class EventBus {
  constructor() {
    this._eventDispatcher = new Vue();
  }

  /**
   * Proxy to the Vue object that is the global dispatcher.
   * @param {string} eventName
   * @param {...any} args
   */
  emit(eventName, ...args) {
    this._eventDispatcher.$emit(eventName, ...args);
  }
  /**
   * Proxy to the Vue object that is the global dispatcher.
   * @param {string} event
   * @param {function} callback
   */
  on(event, callback) {
    this._eventDispatcher.$on(event, callback);
  }
  /**
   * Proxy to the Vue object that is the global dispatcher.
   * Takes any arguments and passes them on.
   * @param {string} event
   * @param {function} callback
   */
  once(event, callback) {
    this._eventDispatcher.$once(event, callback);
  }
  /**
   * Proxy to the Vue object that is the global dispatcher.
   * @param {string} event
   * @param {function} callback
   */
  off(event, callback) {
    this._eventDispatcher.$off(event, callback);
  }
}

export { EventBus };
