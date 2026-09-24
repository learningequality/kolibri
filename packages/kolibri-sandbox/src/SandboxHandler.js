/**
 * Base class for sandbox handlers.
 *
 * Handlers are content-type-specific code that runs inside the sandboxed iframe.
 * They are responsible for initializing and managing content rendering.
 *
 * Usage:
 *   import SandboxHandler from 'kolibri-sandbox/SandboxHandler';
 *
 *   export default class MyHandler extends SandboxHandler {
 *     static shims = [MyShim];
 *
 *     async init(iframe, startUrl) {
 *       // Initialize content
 *     }
 *   }
 *
 * Handler scripts register their handler class at the module level:
 *
 *   MyHandler.register();
 */

import LocalStorage from './localStorage';
import SessionStorage from './sessionStorage';
import Cookie from './cookie';
import IndexedDBShim from './indexedDBShim';

/**
 * @typedef {import('./iframeClient').default} SandboxEnvironment
 * @typedef {import('./SandboxShim').default} SandboxShim
 */

export default class SandboxHandler {
  /**
   * Base shims that are always included for all handlers.
   * These provide common storage API replacements.
   * @type {Array<typeof SandboxShim>}
   */
  static baseShims = [LocalStorage, SessionStorage, Cookie, IndexedDBShim];

  /**
   * Array of SandboxShim subclasses this handler requires.
   * Override in subclass to add custom shims.
   * @type {Array<typeof SandboxShim>}
   */
  static shims = [];

  /**
   * Construct this handler and register it with the sandbox environment.
   * @throws {Error} If window.sandbox is not set.
   */
  static register() {
    const sandbox = window.sandbox;
    if (!sandbox) {
      throw new Error(
        'SandboxHandler requires a sandbox environment. ' +
          'Load the handler script inside the sandbox iframe.',
      );
    }
    sandbox.registerHandler(new this(sandbox));
  }

  /**
   * Bind the handler to its sandbox environment and instantiate its shims.
   * @param {SandboxEnvironment} sandbox - The sandbox environment instance
   */
  constructor(sandbox) {
    this.sandbox = sandbox;
    this.mediator = sandbox.mediator;
    this.shims = {};
    for (const ShimClass of [...this.constructor.baseShims, ...this.constructor.shims]) {
      this.shims[ShimClass.shimName] = new ShimClass(this.mediator);
    }
  }

  /**
   * Initialize content in the iframe.
   * Override in subclass.
   * @param {HTMLIFrameElement} iframe - The content iframe
   * @param {string} startUrl - URL to the content entry point
   * @returns {Promise<void>}
   */
  // eslint-disable-next-line no-unused-vars
  async init(iframe, startUrl) {
    throw new Error('Subclass must implement init()');
  }

  /**
   * Called by sandbox to initialize shims on the content window.
   *
   * Every shim is attempted, so one failure does not cost the content the others.
   *
   * Only the handler's own shims are fatal. A base shim redefines an ambient browser
   * API - IndexedDBShim replaces contentWindow.indexedDB, Cookie replaces
   * document.cookie - and those throw where the browser blocks storage, which costs
   * persistence but not the session. Raising there would take the whole content
   * session down with it, including progress and time tracking.
   * @param {Window} contentWindow - The iframe's content window
   * @throws {Error} If one of the handler's own shims failed to initialize.
   * @private
   */
  _initializeShims(contentWindow) {
    const { contentNamespace } = this.sandbox;
    const fatal = new Set(this.constructor.shims.map(ShimClass => ShimClass.shimName));
    const failed = [];
    for (const shim of Object.values(this.shims)) {
      const shimName = shim.constructor.shimName;
      try {
        shim.initialize(contentWindow, { contentNamespace });
      } catch (e) {
        console.error(`Failed to initialize shim ${shimName}:`, e); // eslint-disable-line no-console
        if (fatal.has(shimName)) {
          failed.push(shimName);
        }
      }
    }
    if (failed.length) {
      throw new Error(`Failed to initialize shims: ${failed.join(', ')}`);
    }
  }

  /**
   * Restore state data to shims.
   * @param {object} data - State data keyed by shim name
   */
  setData(data) {
    if (!data) return;
    for (const [name, shimData] of Object.entries(data)) {
      if (this.shims[name]) {
        this.shims[name].setData(shimData);
      }
    }
  }

  /**
   * Set user data on every shim.
   * @param {object} userData - User data object
   */
  setUserData(userData) {
    for (const shim of Object.values(this.shims)) {
      shim.setUserData(userData);
    }
  }

  /**
   * Propagate the server-corrected clock to every shim.
   * @param {number|Date} now - Current server time
   */
  setNow(now) {
    for (const shim of Object.values(this.shims)) {
      shim.setNow(now);
    }
  }

  /**
   * Progress as the shims currently hold it.
   * @returns {number|null} The first progress any shim reports, or null if none does
   */
  getProgress() {
    for (const shim of Object.values(this.shims)) {
      const progress = shim.getProgress();
      if (progress !== null) {
        return progress;
      }
    }
    return null;
  }
}
