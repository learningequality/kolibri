import Vue from 'vue';

class EventBus {
  constructor() {
    this._eventDispatcher = new Vue();
  }

  emit(eventName, ...args) {
    this._eventDispatcher.$emit(eventName, ...args);
  }
  on(event, callback) {
    this._eventDispatcher.$on(event, callback);
  }
  once(event, callback) {
    this._eventDispatcher.$once(event, callback);
  }
  off(event, callback) {
    this._eventDispatcher.$off(event, callback);
  }
}

export { EventBus };
