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
import { events, nameSpace } from './base';

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
   * Show the content at a new start URL the host sends, without reloading the sandbox.
   * The host keeps showing any file it rendered: send renderFile(null), or the file the new
   * URL shows. Called only by the host, once init has resolved. A throw or rejection is
   * reported to the host as the viewer's error. Override in subclass.
   * @param {string} startUrl - URL to the new content entry point
   */
  // eslint-disable-next-line no-unused-vars
  retarget(startUrl) {}

  /**
   * Close the file the handler is showing, at the host's request: one sent with
   * renderFile or announced with setFileOverlay. For a non-image file under a host that
   * listens to goBack, the viewer emits goBack instead of calling closeFile. Called only
   * by the host, once init has resolved. A throw or rejection is reported to the host as
   * the viewer's error. Override in subclass.
   */
  closeFile() {}

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
   * Ask the host for something only it can serve, answered by the viewer's onHandlerRequest.
   * @param {object} request - Structured-cloneable request data
   * @returns {Promise<unknown>} Resolves with the host's answer; rejects with an Error carrying
   * the host's message when the host fails or has no answerer
   */
  requestFromHost(request) {
    return this.mediator.request({ nameSpace, event: events.HANDLER_REQUESTED, data: request });
  }

  /**
   * Tell the host which page the content now shows, relayed as the viewer's nowShowing event.
   * @param {string} page - Identifies the page, in the handler's own terms
   */
  reportShowing(page) {
    this.mediator.sendMessage({ nameSpace, event: events.NOW_SHOWING, data: page });
  }

  /**
   * Ask a host that renders files (useSandbox's renderFiles) to show one in place of the
   * sandbox, or to stop showing it.
   * @param {object|null} file - The file, or null to return to the sandbox
   * @param {Blob|ArrayBuffer|Uint8Array} file.data - The file's bytes. A Blob crosses to
   * the host without its bytes being copied
   * @param {string} file.mimetype - Its type. The host shows only raster images, audio and
   * video a viewer plays, and PDF when a PDF viewer is enabled, and ignores any other type.
   * Audio and video types need a plain subtype with no parameters, e.g. not
   * `video/mp4; codecs=…`
   * @param {string} [file.name] - An image's alt text; a generic label when absent
   * @param {boolean} [file.hasPrevious] - Whether the host offers a way back from it
   */
  renderFile(file) {
    this.mediator.sendMessage({ nameSpace, event: events.RENDER_FILE, data: file });
  }

  /**
   * Tell the host whether the handler shows a file over its own content, so it offers a
   * way back that calls closeFile.
   * @param {boolean} open - Whether a file is showing
   */
  setFileOverlay(open) {
    this.mediator.sendMessage({ nameSpace, event: events.FILE_OVERLAY, data: open });
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
