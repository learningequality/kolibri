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
 *     async init(iframe, startUrl, options) {
 *       // Initialize content
 *     }
 *   }
 *
 * The handler self-registers with the sandbox environment when instantiated.
 * Handler scripts should instantiate their handler class at the module level:
 *
 *   new MyHandler(window.SandboxEnvironment);
 */

// SandboxShim is imported for documentation purposes (used in @type annotations)
// eslint-disable-next-line no-unused-vars
import { SandboxShim } from './SandboxShim';
import LocalStorage from './localStorage';
import SessionStorage from './sessionStorage';
import Cookie from './cookie';
import Kolibri from './kolibri';
import IndexedDBShim from './indexedDBShim';

/**
 * @typedef {import('./iframeClient').default} SandboxEnvironment
 */

export class SandboxHandler {
  /**
   * Base shims that are always included for all handlers.
   * These provide common storage API replacements.
   * @type {Array<typeof SandboxShim>}
   */
  static baseShims = [LocalStorage, SessionStorage, Cookie, Kolibri, IndexedDBShim];

  /**
   * Array of SandboxShim subclasses this handler requires.
   * Override in subclass to add custom shims.
   * @type {Array<typeof SandboxShim>}
   */
  static shims = [];

  /**
   * Bind the handler to its sandbox environment and instantiate its shims.
   * @param {SandboxEnvironment} sandbox - The sandbox environment instance
   */
  constructor(sandbox) {
    if (!sandbox) {
      throw new Error(
        'SandboxHandler requires a sandbox environment. ' +
          'Pass window.SandboxEnvironment when instantiating.',
      );
    }

    this.sandbox = sandbox;
    this.mediator = sandbox.mediator;
    this.shims = {};

    // Instantiate all shims (base + custom)
    const allShimClasses = [...this.constructor.baseShims, ...this.constructor.shims];

    for (const ShimClass of allShimClasses) {
      if (!ShimClass.shimName) {
        throw new Error(`Shim class ${ShimClass.name} must define static shimName`);
      }
      const shim = new ShimClass(this.mediator);
      this.shims[ShimClass.shimName] = shim;
    }

    // Self-register with sandbox
    sandbox.registerHandler(this);
  }

  /**
   * Initialize content in the iframe.
   * Override in subclass.
   * @param {HTMLIFrameElement} iframe - The content iframe
   * @param {string} startUrl - URL to the content entry point
   * @param {object} options - Initialization options
   * @param {string} options.contentNamespace - Namespace for content storage
   * @returns {Promise<void>}
   */
  // eslint-disable-next-line no-unused-vars
  async init(iframe, startUrl, options) {
    throw new Error('Subclass must implement init()');
  }

  /**
   * Clean up resources when content is unloaded.
   * Override in subclass if cleanup is needed.
   */
  destroy() {}

  /**
   * Called by sandbox to initialize shims on the content window.
   * @param {Window} contentWindow - The iframe's content window
   * @param {object} options - Initialization options
   * @param {string} options.contentNamespace - Namespace for content storage
   * @private
   */
  _initializeShims(contentWindow, { contentNamespace } = {}) {
    for (const shim of Object.values(this.shims)) {
      try {
        shim.iframeInitialize(contentWindow, { contentNamespace });
      } catch (e) {
        console.error(`Failed to initialize shim ${shim.constructor.shimName}:`, e); // eslint-disable-line no-console
      }
    }
  }

  /**
   * Called by sandbox when the content is torn down, to unsubscribe the shims.
   * Separate from destroy(), which subclasses override to release their own resources.
   * @private
   */
  _destroyShims() {
    for (const shim of Object.values(this.shims)) {
      shim.destroy();
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
   * Set user data on all shims.
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
   * Get list of registered shim names, and of those that consume user data.
   * @returns {object} Registration info with shim names
   */
  getRegistration() {
    return {
      shims: Object.keys(this.shims),
      userDataShims: Object.entries(this.shims)
        .filter(([, shim]) => shim.consumesUserData)
        .map(([name]) => name),
    };
  }
}

export default SandboxHandler;
