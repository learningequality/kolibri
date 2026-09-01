/**
 * Base class for sandbox shims.
 *
 * Shims provide API compatibility layers for content running in the sandbox.
 * For example, xAPI or SCORM shims allow content to use these APIs while
 * the sandbox intercepts and handles the calls.
 *
 * Usage:
 *   import SandboxShim from 'kolibri-sandbox/SandboxShim';
 *
 *   export class MyShim extends SandboxShim {
 *     static shimName = 'myShim';
 *
 *     static events = { MYEVENT: 'myevent' };
 *
 *     iframeInitialize(contentWindow) {
 *       contentWindow.myAPI = { ... };
 *     }
 *   }
 */
import { events } from './base';

/**
 * @typedef {import('./mediator').default} Mediator
 */

export class SandboxShim {
  /**
   * Unique identifier for this shim.
   * Must be overridden in subclass.
   * @type {string}
   */
  static shimName = null;

  /**
   * Whether this shim does anything with the learner's user data. Main only sends
   * USERDATAUPDATE to the shims that declare it, so it isn't broadcast to every
   * shim on every tick.
   * @type {boolean}
   */
  static consumesUserData = false;

  /**
   * Events this shim exchanges with its content, beyond the shared set in base.js.
   * Merged into `this.events`, which on() and off() validate against, so a shim can
   * subscribe to an event that means nothing outside its own namespace.
   * @type {object}
   */
  static events = {};

  /**
   * Wire the shim to the mediator.
   * @param {Mediator} mediator - The mediator instance for message passing
   */
  constructor(mediator) {
    this.__mediator = mediator;
    this.events = Object.assign({}, events, this.constructor.events);
    this.__nowDiff = 0;
    // Everything a shim subscribes to goes through on(), so recording here is what
    // lets destroy() unsubscribe a shim whose own events we know nothing about.
    this.__subscriptions = [];

    if (!this.constructor.shimName) {
      throw new Error(`${this.constructor.name} must define static shimName`);
    }

    // Use shimName as the namespace for message passing
    this.nameSpace = this.constructor.shimName;

    // State persisted by Kolibri between sessions, and the learner's user data. A
    // shim that computes either rather than storing it declares accessors instead,
    // as Cookie does - its live jar holds more than it persists.
    this.data = {};
    this.userData = {};

    // Every shim stores both the same way, so subscribe here rather than leaving
    // each subclass to remember to. Subclasses that need to do more than store what
    // they are handed override __setData or __setUserData.
    this.__setData = this.__setData.bind(this);
    this.__setUserData = this.__setUserData.bind(this);
    this.on(this.events.STATEUPDATE, this.__setData);
    this.on(this.events.USERDATAUPDATE, this.__setUserData);
  }

  /**
   * Initialize the shim on the content window.
   * Override in subclass to patch APIs on the content window.
   *
   * Install unconditionally. This runs before the content's own scripts, so a
   * shim that returns early because some backing state is not ready yet leaves
   * the content permanently unshimmed, with no error at the point of failure.
   * Resolve backing state at access time instead — via a getter or accessor on
   * the installed API — and throw there if it is genuinely missing.
   * @param {Window} contentWindow - Window object to patch the shim's APIs onto
   * @param {object} options - Initialization options
   * @param {string} options.contentNamespace - Namespace for content storage
   */
  // eslint-disable-next-line no-unused-vars
  iframeInitialize(contentWindow, options) {
    // Default implementation does nothing
    // Subclasses should override to set up their APIs
  }

  /**
   * Unsubscribe the shim. The mediator outlives the shim - a handler swap replaces
   * the shims but not the mediator they registered on - so a shim left subscribed
   * keeps taking state pushed for its successor.
   */
  destroy() {
    for (const { event, callback } of this.__subscriptions) {
      this.off(event, callback);
    }
    this.__subscriptions = [];
  }

  /**
   * Optional: Return progress calculated by this shim.
   * @returns {number|null} Progress value between 0 and 1, or null if not applicable
   */
  getProgress() {
    return null;
  }

  /**
   * Handler for state pushed from main. A shim that needs to do more than store what
   * it is handed, or that computes its state rather than holding it, declares a `data`
   * setter - see Cookie and BaseStorage. Override this only to refuse the restore
   * outright, as SessionStorage does.
   * @param {object} data - This shim's persisted state
   */
  __setData(data = {}) {
    this.data = data;
  }

  setData(data) {
    this.__setData(data);
    this.stateUpdated();
  }

  /**
   * Handler for user data pushed from main. As with __setData, customise through a
   * `userData` setter rather than overriding this.
   * @param {object} userData - The learner's user data
   */
  __setUserData(userData = {}) {
    this.userData = userData;
  }

  setUserData(data) {
    this.__setUserData(data);
  }

  /**
   * Whether this shim consumes user data, so main can address it selectively.
   * @returns {boolean}
   */
  get consumesUserData() {
    return this.constructor.consumesUserData;
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

  setNow(now) {
    this.__nowDiff = new Date(now).getTime() - Date.now();
  }

  sendMessage(event, data) {
    this.__mediator.sendMessage({ nameSpace: this.nameSpace, event, data });
  }

  on(event, callback) {
    if (!Object.values(this.events).includes(event)) {
      throw ReferenceError(`${event} is not a valid event name for ${this.nameSpace}`);
    }
    this.__mediator.registerMessageHandler({ nameSpace: this.nameSpace, event, callback });
    this.__subscriptions.push({ event, callback });
  }

  off(event, callback) {
    if (!Object.values(this.events).includes(event)) {
      throw ReferenceError(`${event} is not a valid event name for ${this.nameSpace}`);
    }
    this.__mediator.removeMessageHandler({ nameSpace: this.nameSpace, event, callback });
  }

  /**
   * Send state update to main client.
   * Always sends { state }, with optional progress if getProgress() returns non-null.
   */
  stateUpdated() {
    const data = { state: this.data };
    const progress = this.getProgress();
    if (progress !== null) {
      data.progress = progress;
    }
    this.sendMessage(this.events.STATEUPDATE, data);
  }
}

export default SandboxShim;
