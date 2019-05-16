import Mediator from './mediator';
import LocalStorage from './localStorage';
import Cookie from './cookie';
import { events, nameSpace } from './hashiBase';

/*
 * This is the main entry point for interacting with the Hashi library.
 * Import this client in order to wrap an iframe that has an instance of
 * the 'SandboxEnvironment' class (found inside iframeClient.js) inside of it.
 * When an iframe has been wrapped, then this class can be initialized to set initial
 * data, and allow the iframe to setup its own environment and start running
 * a contained HTML5 app.
 */
export default class MainClient {
  constructor({ iframe, now } = {}) {
    this.events = events;
    this.iframe = iframe;
    if (this.iframe.name !== nameSpace) {
      throw ReferenceError(
        `Iframe passed to Hashi must have been initialized with name attribute ${nameSpace}`
      );
    }
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
    // Set this here, regardless of whether it is already ready or not
    // in case the page inside the iframe navigates to a new page
    // and hence has to reset its local state and reinitialize its
    // SandboxEnvironment.
    this.on(this.events.READY, () => {
      this.__setData(data);
    });
    if (this.ready) {
      this.__setData(data);
    } else {
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
