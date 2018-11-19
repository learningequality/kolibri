/*
 * This class manages all message listening and sending from the postMessage
 * layer. All interfaces that need to message via the postMessage layer should
 * import the object defined herein.
 */

class Mediator {
  constructor(remote) {
    this.local = window;
    this.remote = remote;
    this.local.addEventListener('message', this.handleMessage.bind(this));
    this.__messageHandlers = {};
  }

  handleMessage(ev) {
    try {
      // Do a try catch so that if anything doesn't match up to what we expect
      // we just abort and no harm done!
      const { nameSpace, event, data } = JSON.parse(ev.data);
      if (this.__messageHandlers[nameSpace] && this.__messageHandlers[nameSpace][event]) {
        this.__messageHandlers[nameSpace][event].forEach(callback => callback(data));
      }
    } catch (e) {
      return;
    }
  }

  sendMessage({ event, data, nameSpace }) {
    const message = {
      event,
      data,
      nameSpace,
    };
    this.remote.postMessage(JSON.stringify(message), '*');
  }

  registerMessageHandler({ event, nameSpace, callback }) {
    if (!this.__messageHandlers[nameSpace]) {
      this.__messageHandlers[nameSpace] = {};
    }
    if (!this.__messageHandlers[nameSpace][event]) {
      this.__messageHandlers[nameSpace][event] = [];
    }
    this.__messageHandlers[nameSpace][event].push(callback);
  }

  removeMessageHandler({ event, nameSpace, callback }) {
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
