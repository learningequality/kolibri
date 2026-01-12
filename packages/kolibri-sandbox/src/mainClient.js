import Mediator from './mediator';
import { events, nameSpace } from './base';

/*
 * This is the main entry point for interacting with the sandbox library.
 * Import this client in order to wrap an iframe that has an instance of
 * the 'SandboxEnvironment' class (found inside iframeClient.js) inside of it.
 * When an iframe has been wrapped, then this class can be initialized to set initial
 * data, and allow the iframe to setup its own environment and start running
 * a contained HTML5 app.
 */
export default class MainClient {
  /**
   * Wrap an iframe hosting a SandboxEnvironment.
   * @param {object} options - Configuration
   * @param {HTMLIFrameElement} options.iframe - The iframe to wrap, already in the document
   * @param {Function} options.now - Required. Returns the current time; inject the
   * server-corrected clock (kolibri/utils/serverClock) so shim-written timestamps
   * stay consistent across clock-skewed devices.
   */
  constructor({ iframe, now } = {}) {
    // Checked here rather than at call time: `now()` is only invoked inside a mediator
    // callback, which swallows the TypeError, so the handshake would hang silently.
    if (typeof now !== 'function') {
      throw new TypeError('MainClient requires a `now` function returning the current time');
    }
    this.events = events;
    this.iframe = iframe;
    this.mediator = new Mediator(iframe.contentWindow, { source: iframe.contentWindow });
    this.now = now;
    this._shimData = {};
    this._userData = null;
    this._iframeProgress = null;
  }

  /**
   * Initialize content in the sandbox.
   * @param {object} contentState - Initial content state for storage shims
   * @param {object} userData - User data object with userId, userFullName, progress, etc.
   * @param {string} startUrl - URL to the content entry point
   * @param {string} contentNamespace - Namespace for content storage (usually file checksum)
   * @param {object} options - Additional options
   * @param {string} [options.handlerUrl] - URL to a sandbox handler script for pluggable handlers
   */
  initialize(contentState, userData, startUrl, contentNamespace, options = {}) {
    const { handlerUrl = null } = options;
    /*
     * userData should be an object with the following keys, all optional:
     * userId: <user ID>,
     * userFullName: <user's full name>,
     * progress: <current progress between 0 and 1>,
     * complete: <boolean of whether complete or not>,
     * timeSpent: <time spent in seconds>,
     * language: <language code>,
     */
    this._userData = userData ? JSON.parse(JSON.stringify(userData)) : {};
    this._shimData = contentState ? JSON.parse(JSON.stringify(contentState)) : {};

    this.iframe.style.width = '100%';

    // Bugfix for Chrome: Force update of iframe width. If this is not done the
    // document size may not be updated before the content resizes.
    this.iframe.getBoundingClientRect();

    // Set this here so that any time the inner frame declares it is ready
    // it can reinitialize its SandboxEnvironment.
    this.on(this.events.IFRAMEREADY, () => {
      this.mediator.sendMessage({
        nameSpace,
        event: events.MAINREADY,
        data: {
          contentNamespace,
          startUrl,
          handlerUrl,
          // Send current accumulated state, not the original contentState
          contentState: this._shimData,
          userData: this._userData,
          now: this.now(),
        },
      });
    });
    this.mediator.sendMessage({ nameSpace, event: events.READYCHECK, data: true });

    this.on(events.SHIMSTATEUPDATE, ({ shim, state, progress }) => {
      this._shimData[shim] = state;
      if (Number.isFinite(progress)) {
        this._iframeProgress = progress;
      }
      this.mediator.dispatch({ nameSpace, event: events.STATEUPDATE, data: this.data });
    });

    // MAINREADY carried user data as it was then, so resend any update made since.
    this.on(events.HANDLER_REGISTRATION, ({ progress }) => {
      if (Number.isFinite(progress)) {
        this._iframeProgress = progress;
      }
      this._sendUserData();
    });
  }

  updateData({ userData }) {
    this._userData = JSON.parse(JSON.stringify(userData));
    this._sendUserData();
  }

  _sendUserData() {
    this.mediator.sendMessage({ nameSpace, event: events.USERDATAUPDATE, data: this._userData });
  }

  getProgress() {
    return this._iframeProgress;
  }

  get data() {
    // Return a copy of the shim data to prevent direct access
    return JSON.parse(JSON.stringify(this._shimData));
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

  // Tear down the mediator's window listener so the client and its accumulated
  // shim data can be collected.
  destroy() {
    this.mediator.destroy();
  }
}
