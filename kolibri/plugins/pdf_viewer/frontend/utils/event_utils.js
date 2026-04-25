import Vue from 'vue';

class EventBus {
  constructor() {
    this._eventDispatcher = new Vue();
  }

  /**
   * Proxy to the Vue object that is the global dispatcher.
   * @param {string} eventName - Name of the event to emit.
   * @param {...unknown} args - Payload arguments forwarded to listeners.
   */
  emit(eventName, ...args) {
    this._eventDispatcher.$emit(eventName, ...args);
  }
  /**
   * Proxy to the Vue object that is the global dispatcher.
   * @param {string} event - Name of the event to subscribe to.
   * @param {Function} callback - Listener invoked when the event fires.
   */
  on(event, callback) {
    this._eventDispatcher.$on(event, callback);
  }
  /**
   * Proxy to the Vue object that is the global dispatcher.
   * Takes any arguments and passes them on.
   * @param {string} event - Name of the event to subscribe to once.
   * @param {Function} callback - Listener invoked once when the event fires.
   */
  once(event, callback) {
    this._eventDispatcher.$once(event, callback);
  }
  /**
   * Proxy to the Vue object that is the global dispatcher.
   * @param {string} event - Name of the event to unsubscribe from.
   * @param {Function} callback - The previously-subscribed listener to remove.
   */
  off(event, callback) {
    this._eventDispatcher.$off(event, callback);
  }
}

export { EventBus };
