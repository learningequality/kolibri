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
    this.__setData = this.__setData.bind(this);
  }
  initialize(contentState, userData) {
    /*
     * userData should be an object with the following keys, all optional:
     * userId: <user ID>,
     * userFullName: <user's full name>,
     * progress: <current progress between 0 and 1>,
     * complete: <boolean of whether complete or not>,
     * timeSpent: <time spent in seconds>,
     * language: <language code>,
     */
    this.__setData(contentState, userData);
    this.__setListeners();
    // Set this here so that any time the inner frame declares it is ready
    // it can reinitialize its SandboxEnvironment.
    this.on(this.events.READY, () => {
      this.__setData(this.data, this.userData);
      this.mediator.sendMessage({ nameSpace, event: events.READY, data: true });
    });
    this.mediator.sendMessage({ nameSpace, event: events.READYCHECK, data: true });
  }

  updateData({ contentState, userData }) {
    // Make a quick copy of the contentState and userData that is passed in.
    // Can do this as all contentState that is coming in should be JSON
    // compatible in the first place, if not, we have other problems.
    if (userData) {
      userData = JSON.parse(JSON.stringify(userData));
      this.userData = userData;
    }
    if (contentState) {
      contentState = JSON.parse(JSON.stringify(contentState));
    }
    Object.keys(this.storage).forEach(key => {
      const storage = this.storage[key];
      if (contentState && contentState[storage.nameSpace]) {
        storage.setData(contentState[storage.nameSpace]);
      }
      if (userData) {
        storage.setUserData(userData);
      }
    });
  }

  getProgress() {
    // Return any calculated progress from the storage APIs
    // So far, only the SCORM shim supports this
    // If no progress has been reported, this will be null.
    return this.storage.SCORM.__calculateProgress();
  }

  __setData(contentState, userData) {
    this.updateData({ contentState, userData });
    if (this.now) {
      this.storage.cookie.setNow(this.now());
    }
  }
  __setListeners() {
    Object.keys(this.storage).forEach(key => {
      const storage = this.storage[key];
      storage.on(events.STATEUPDATE, () => {
        this.mediator.sendLocalMessage({ nameSpace, event: events.STATEUPDATE, data: this.data });
      });
    });
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

  onProgressUpdate(callback) {
    this.on(events.PROGRESSUPDATE, callback);
  }
}
