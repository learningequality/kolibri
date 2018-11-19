export default class BaseShim {
  constructor(mediator) {
    this.__mediator = mediator;
  }

  sendMessage(event, data) {
    this.__mediator.sendMessage({ nameSpace: this.nameSpace, event, data });
  }

  on(event, callback) {
    if (!Object.values(this.events).includes(event)) {
      throw ReferenceError(`${event} is not a valid event name for ${this.nameSpace}`);
    }
    this.__mediator.registerMessageHandler({ nameSpace: this.nameSpace, event, callback });
  }

  off(event, callback) {
    if (!Object.values(this.events).includes(event)) {
      throw ReferenceError(`${event} is not a valid event name for ${this.nameSpace}`);
    }
    this.__mediator.removeMessageHandler({ nameSpace: this.nameSpace, event, callback });
  }
}
