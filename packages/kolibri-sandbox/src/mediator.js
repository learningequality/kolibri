import { v4 as uuidv4 } from 'uuid';
import { events, MessageStatuses } from './base';

function isUndefined(x) {
  return typeof x === 'undefined';
}

/*
 * This class manages all message listening and sending from the postMessage
 * layer. All interfaces that need to message via the postMessage layer should
 * do so via an instance of this class.
 */

class Mediator {
  /**
   * Listen for messages on this window, and send them to the remote.
   * @param {Window} remote - The window messages are sent to
   * @param {object} [options] - Which messages to accept
   * @param {Window} [options.source] - The only window whose messages are handled.
   * Not for the sandbox side, which also hears the content frame it hosts.
   */
  constructor(remote, { source = null } = {}) {
    this.local = window;
    this.remote = remote;
    this.source = source;
    this.__boundHandleMessage = this.handleMessage.bind(this);
    this.local.addEventListener('message', this.__boundHandleMessage);
    this.__messageHandlers = {};
  }

  // Remove the window message listener and drop all registered handlers.
  destroy() {
    this.local.removeEventListener('message', this.__boundHandleMessage);
    this.__messageHandlers = {};
  }

  handleMessage(message) {
    if (this.source && message.source !== this.source) {
      return;
    }
    const { nameSpace, event, data } = message.data;
    // nameSpace and event should be defined, otherwise, it's not our message!
    if (isUndefined(nameSpace) || isUndefined(event)) {
      return;
    }
    this.dispatch({ nameSpace, event, data });
  }

  // Run this mediator's own handlers for a message, without posting it to a window.
  dispatch({ nameSpace, event, data }) {
    const handlers = this.__messageHandlers[nameSpace]?.[event];
    if (handlers) {
      handlers.forEach(callback => {
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
    this.local.postMessage({ event, data, nameSpace }, '*');
  }

  sendMessage({ event, data, nameSpace }) {
    this.remote.postMessage({ event, data, nameSpace }, '*');
  }

  // Send a request and resolve with the DATARETURNED reply carrying its message_id.
  sendMessageAwaitReply({ event, data, nameSpace }) {
    return new Promise((resolve, reject) => {
      const msgId = uuidv4();
      const self = this;
      function handler(message) {
        if (message.message_id === msgId && message.type === 'response') {
          if (message.status == MessageStatuses.SUCCESS) {
            resolve(message.data);
          } else if (message.status === MessageStatuses.FAILURE && message.err) {
            reject(message.err);
          } else {
            // Otherwise something unspecified happened
            reject();
          }
          try {
            self.removeMessageHandler({
              nameSpace,
              event: events.DATARETURNED,
              callback: handler,
            });
          } catch (e) {
            // eslint-disable-next-line no-console
            console.log(e);
          }
        }
      }
      this.registerMessageHandler({
        nameSpace,
        event: events.DATARETURNED,
        callback: handler,
      });
      data.message_id = msgId;
      this.sendMessage({ event, data, nameSpace });
    });
  }

  registerMessageHandler({ event, nameSpace, callback } = {}) {
    if (typeof callback !== 'function' || isUndefined(event) || isUndefined(nameSpace)) {
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
