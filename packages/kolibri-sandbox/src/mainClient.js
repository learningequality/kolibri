import Mediator from './mediator';
import { events, nameSpace } from './base';

/*
 * This is the main entry point for interacting with the Hashi library.
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
   * @param {HTMLIFrameElement} options.iframe - The iframe to wrap
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
    this.mediator = new Mediator(this.iframe.contentWindow);
    this.now = now;
    this.ready = false;
    this.contentNamespace = null;
    this.startUrl = null;
    this.handlerUrl = null;
    this.registration = null;
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

    // Initialize _shimData from contentState
    this._shimData = {};
    if (contentState) {
      for (const [ns, data] of Object.entries(contentState)) {
        this._shimData[ns] = JSON.parse(JSON.stringify(data));
      }
    }

    this.contentNamespace = contentNamespace;
    this.startUrl = startUrl;
    this.handlerUrl = handlerUrl;

    this.iframe.style.width = '100%';

    // Bugfix for Chrome: Force update of iframe width. If this is not done the
    // document size may not be updated before the content resizes.
    this.iframe.getBoundingClientRect();

    // Set this here so that any time the inner frame declares it is ready
    // it can reinitialize its SandboxEnvironment.
    this.on(this.events.IFRAMEREADY, () => {
      // Update remote reference - contentWindow may have changed after iframe navigation,
      // and is transiently null while the document swap is in flight. Bail rather than
      // clobber the remote with null; the iframe re-announces once it settles.
      const contentWindow = this.iframe.contentWindow;
      if (!contentWindow) {
        return;
      }
      this.mediator.remote = contentWindow;
      this.ready = true;
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

    // Handle registration events from iframe
    this.on(events.HANDLER_REGISTRATION, registration => {
      this.registration = registration;

      // Set up state update listeners for each registered shim
      for (const shimName of registration.shims) {
        if (!this._shimData[shimName]) {
          this._shimData[shimName] = {};
        }

        // Repeated IFRAMEREADY re-fires this; drop the prior handler so STATEUPDATE
        // isn't registered, and emitted, twice.
        this.mediator.removeMessageHandler({
          nameSpace: shimName,
          event: events.STATEUPDATE,
        });

        this.mediator.registerMessageHandler({
          nameSpace: shimName,
          event: events.STATEUPDATE,
          callback: data => {
            // Data is always { state, progress? }
            this._shimData[shimName] = data.state;
            const progress = Number(data.progress);
            if (!isNaN(progress)) {
              this._iframeProgress = progress;
            }

            // Emit local state update event for consumer to receive
            this.mediator.sendLocalMessage({
              nameSpace,
              event: events.STATEUPDATE,
              data: this.data,
            });
          },
        });
      }
    });
  }

  updateData({ contentState, userData }) {
    // Make a quick copy of the contentState and userData that is passed in.
    // Can do this as all contentState that is coming in should be JSON
    // compatible in the first place, if not, we have other problems.
    if (userData) {
      this._userData = JSON.parse(JSON.stringify(userData));
    }
    if (contentState) {
      for (const [ns, data] of Object.entries(contentState)) {
        this._shimData[ns] = JSON.parse(JSON.stringify(data));
      }
    }
    this._sendDataToShims({ contentState, userData });
  }

  /*
   * The shims live inside the iframe, so anything that changes after the MAINREADY
   * handshake only reaches them by message. Each shim listens on its own namespace,
   * and its handler takes the bare state/user data - only the shim-to-main direction
   * wraps state alongside progress.
   */
  _sendDataToShims({ contentState, userData }) {
    const userDataShims = new Set(this.registration?.userDataShims ?? []);
    for (const shimName of this.registration?.shims ?? []) {
      if (contentState && shimName in contentState) {
        this.mediator.sendMessage({
          nameSpace: shimName,
          event: events.STATEUPDATE,
          data: this._shimData[shimName],
        });
      }
      if (userData && userDataShims.has(shimName)) {
        this.mediator.sendMessage({
          nameSpace: shimName,
          event: events.USERDATAUPDATE,
          data: this._userData,
        });
      }
    }
  }

  getProgress() {
    return this._iframeProgress;
  }

  get data() {
    // Return a copy of the shim data to prevent direct access
    return JSON.parse(JSON.stringify(this._shimData));
  }

  get userData() {
    return this._userData;
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
