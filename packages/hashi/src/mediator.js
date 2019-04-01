/*
 * This class manages all message listening and sending from the postMessage
 * layer. All interfaces that need to message via the postMessage layer should
 * do so via an instance of this class.
 */

class Mediator {
  constructor(remote) {
    this.local = window;
    this.remote = remote;
    this.local.addEventListener('message', this.handleMessage.bind(this));
    this.__messageHandlers = {};
  }

  handleMessage(ev) {
    const { nameSpace, event, data } = ev.data;
    // nameSpace and event should be defined, otherwise, it's not our message!
    if (typeof nameSpace === 'undefined' || typeof event === 'undefined') {
      return;
    }
    if (this.__messageHandlers[nameSpace] && this.__messageHandlers[nameSpace][event]) {
      this.__messageHandlers[nameSpace][event].forEach(callback => {
        try {
          callback(data);
        } catch (e) {
          /* eslint-disable no-console */
          console.debug(`Error while executing callback for ${nameSpace} for event ${event}`);
          console.debug(e);
          /* eslint-enable no-console */
        }
      });
    }
  }

  sendLocalMessage({ event, data, nameSpace } = {}) {
    const message = {
      event,
      data,
      nameSpace,
    };
    this.local.postMessage(message, '*');
  }

  sendMessage({ event, data, nameSpace }) {
    const message = {
      event,
      data,
      nameSpace,
    };
    this.remote.postMessage(message, '*');
  }

  registerMessageHandler({ event, nameSpace, callback } = {}) {
    if (
      typeof callback !== 'function' ||
      typeof event === 'undefined' ||
      typeof nameSpace === 'undefined'
    ) {
      return;
    }
    if (!this.__messageHandlers[nameSpace]) {
      this.__messageHandlers[nameSpace] = {};
    }
    if (!this.__messageHandlers[nameSpace][event]) {
      this.__messageHandlers[nameSpace][event] = [];
    }
    this.__messageHandlers[nameSpace][event].push(callback);
  }

  removeMessageHandler({ event, nameSpace, callback } = {}) {
    if (!this.__messageHandlers[nameSpace]) {
      return;
    }
    if (!this.__messageHandlers[nameSpace][event]) {
      return;
    }
    if (callback) {
      const index = this.__messageHandlers[nameSpace][event].indexOf(callback);
      if (index > -1) {
        return this.__messageHandlers[nameSpace][event].splice(index, 1);
      }
    }
    // no callback specified, remove all callbacks
    this.__messageHandlers[nameSpace][event] = [];
  }
}

export default Mediator;
