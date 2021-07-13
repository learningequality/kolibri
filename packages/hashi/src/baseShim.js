import { events } from './hashiBase';

export default class BaseShim {
  constructor(mediator) {
    this.__mediator = mediator;
    this.events = Object.assign({}, events);
    this.__nowDiff = 0;
    this.__setNowDiff = this.__setNowDiff.bind(this);
    this.on(this.events.NOW, this.__setNowDiff);
  }

  setData(data) {
    this.__setData(data);
    this.stateUpdated();
  }

  setUserData(data) {
    if (this.__setUserData) {
      this.__setUserData(data);
      this.userDataUpdated();
    }
  }

  // Because we are persisting data across multiple client devices
  // it can be helpful to have a single source of truth for timestamps
  // that we persist. As such, we allow the setting of a time difference
  // to allow our Hashi internal timestamps to be set relative to the
  // current time on the Kolibri server.
  // This may be no more accurate than the time on the client device,
  // but at least it is consistent across client devices.
  __now() {
    return new Date(Date.now() + this.__nowDiff);
  }

  __setNowDiff(nowDiff) {
    this.__nowDiff = nowDiff;
  }

  setNow(now) {
    this.__setNowDiff(new Date(now).getTime() - Date.now());
    this.sendMessage(this.events.NOW, this.__nowDiff);
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

  stateUpdated() {
    this.sendMessage(this.events.STATEUPDATE, this.data);
  }

  userDataUpdated() {
    this.sendMessage(this.events.USERDATAUPDATE, this.userData);
  }
}
