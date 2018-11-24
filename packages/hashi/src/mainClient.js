import Mediator from './mediator';
import LocalStorage from './localStorage';
import Cookie from './cookie';
import { events, nameSpace } from './hashiBase';

export default class Hashi {
  constructor({ iframe, now } = {}) {
    this.events = events;
    this.iframe = iframe;
    this.mediator = new Mediator(this.iframe.contentWindow);
    this.storage = {
      localStorage: new LocalStorage(this.mediator),
      cookie: new Cookie(this.mediator),
    };
    this.now = now;
    this.ready = false;
    this.on(this.events.READY, () => {
      this.ready = true;
    });
    this.__setData = this.__setData.bind(this);
  }
  initialize(data) {
    // Make a quick copy of the data that is passed in.
    // Can do this as all data that is coming in should be JSON
    // compatible in the first place, if not, we have other problems.
    data = JSON.parse(JSON.stringify(data || {}));
    if (this.ready) {
      this.__setData(data);
    } else {
      this.on(this.events.READY, () => {
        this.__setData(data);
      });
      this.mediator.sendMessage({ nameSpace, event: events.READYCHECK, data: true });
    }
  }
  __setData(data) {
    Object.keys(this.storage).forEach(key => {
      const storage = this.storage[key];
      storage.setData(data[storage.nameSpace]);
      storage.on(events.STATEUPDATE, () => {
        this.mediator.sendLocalMessage({ nameSpace, event: events.STATEUPDATE, data: this.data });
      });
    });
    if (this.now) {
      this.storage.cookie.setNow(this.now());
    }
    this.mediator.sendMessage({ nameSpace, event: events.READY, data: true });
  }
  get data() {
    const data = {};
    Object.keys(this.storage).forEach(key => {
      const storage = this.storage[key];
      // Make a quick copy of the data that is being exposed
      // to prevent direct access to the stored data.
      data[storage.nameSpace] = JSON.parse(JSON.stringify(storage.data));
    });
    return data;
  }
  on(event, callback) {
    if (!Object.values(events).includes(event)) {
      throw ReferenceError(`${event} is not a valid event name for ${nameSpace}`);
    }
    this.mediator.registerMessageHandler({ nameSpace, event, callback });
  }

  onStateUpdate(callback) {
    this.on(events.STATEUPDATE, callback);
  }
}
