import Mediator from './mediator';
import LocalStorage from './localStorage';
import Cookie from './cookie';
import SCORM from './SCORM';
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
      SCORM: new SCORM(this.mediator),
    };
    this.now = now;
    this.ready = false;
    this.on(this.events.READY, () => {
      this.ready = true;
    });
    this.__setData = this.__setData.bind(this);
  }
  initialize(contentState) {
    /* FIXME: userData argument temporarily removed to fix the tests, as it is
     * not currently used but will be once we have a final solution.
     * userData should be an object with the following keys, all optional:
     * userId: <user ID>,
     * userFullName: <user's full name>,
     * progress: <current progress between 0 and 1>,
     * complete: <boolean of whether complete or not>,
     * timeSpent: <time spent in seconds>,
     * language: <language code>,
     */
    // Make a quick copy of the contentState that is passed in.
    // Can do this as all contentState that is coming in should be JSON
    // compatible in the first place, if not, we have other problems.
    contentState = JSON.parse(JSON.stringify(contentState || {}));
    // Set this here, regardless of whether it is already ready or not
    // in case the page inside the iframe navigates to a new page
    // and hence has to reset its local state and reinitialize its
    // SandboxEnvironment.
    this.on(this.events.READY, () => {
      this.__setData(contentState);
    });
    if (this.ready) {
      this.__setData(contentState);
    } else {
      this.mediator.sendMessage({ nameSpace, event: events.READYCHECK, data: true });
    }
  }
  __setData(contentState) {
    Object.keys(this.storage).forEach(key => {
      const storage = this.storage[key];
      storage.setData(contentState[storage.nameSpace]);
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
