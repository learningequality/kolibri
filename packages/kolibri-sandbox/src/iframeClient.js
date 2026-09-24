import Mediator from './mediator';
import { events, nameSpace } from './base';

/**
 * @typedef {import('./SandboxHandler').default} SandboxHandler
 */

const logging = console; //eslint-disable-line no-console

/*
 * This class is initialized inside the context of a sandboxed iframe.
 * It provides shims for various APIs that would otherwise be blocked
 * inside a sandboxed iframe context, and communicates persistent data
 * via window.postMessage, to allow for persistence between sessions
 * without violating Same-Origin policies.
 *
 * Content-type specific handling (H5P, Bloom, etc.) is done via pluggable
 * handlers loaded dynamically based on content type.
 */
export default class SandboxEnvironment {
  constructor() {
    // Initialize the Mediator to listen to send messages on the parent of
    // this window (i.e. the iframe parent)
    this.mediator = new Mediator(window.parent);

    // Handler state for pluggable handler system
    this.handler = null;
    this.iframe = null;

    this.mediator.registerMessageHandler({
      nameSpace,
      event: events.MAINREADY,
      callback: data => this.createIframe(data),
    });

    this.mediator.registerMessageHandler({
      nameSpace,
      event: events.USERDATAUPDATE,
      callback: userData => this.handler?.setUserData(userData),
    });

    // Set up a listener for a ready check event.
    this.mediator.registerMessageHandler({
      nameSpace,
      event: events.READYCHECK,
      callback: () => {
        this.mediator.sendMessage({ nameSpace, event: events.IFRAMEREADY, data: true });
      },
    });

    // At this point we are ready, so send the message, in case we missed the
    // the ready check request.
    this.mediator.sendMessage({ nameSpace, event: events.IFRAMEREADY, data: true });
  }

  /**
   * Called by SandboxHandler.register from a handler script.
   * @param {SandboxHandler} handler - The handler instance to register
   */
  registerHandler(handler) {
    this.handler = handler;
  }

  /**
   * Load a handler script from a URL and wait for it to register.
   * @param {string} url - URL to the handler script
   * @returns {Promise<void>}
   */
  _loadHandler(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;

      // A classic script that throws while evaluating still fires load, not error.
      script.onload = () => {
        if (this.handler) {
          resolve();
        } else {
          reject(
            new Error(
              `Handler script loaded but did not register: ${url} - ` +
                'call register() on the handler class at module scope',
            ),
          );
        }
      };

      script.onerror = () => {
        reject(new Error(`Failed to load handler script: ${url}`));
      };
      document.head.appendChild(script);
    });
  }

  /**
   * Install the handler's shims on the content window.
   * @param {Window} contentWindow - The calling window
   */
  initializeIframe(contentWindow) {
    // Ignore any other iframes the content may have generated.
    if (!this.handler || !this.iframe || contentWindow !== this.iframe.contentWindow) {
      return;
    }
    try {
      this.handler._initializeShims(contentWindow);
    } catch (e) {
      // Called from the content document's own <head>, outside createIframe's catch,
      // so this is the only place a shimming failure can be reported from.
      logging.error('Shimming APIs failed, data will not persist:', e);
      this.mediator.sendMessage({
        nameSpace,
        event: events.ERROR,
        data: { message: e.message, error: 'HANDLER_ERROR' },
      });
    }
  }

  /**
   * The message zip_wsgi's error page carries, if the content frame is showing one.
   * @returns {string|null}
   */
  _loadingError() {
    const meta = this.iframe.contentDocument?.head?.querySelector('meta[name="sandbox-error"]');
    return meta ? meta.getAttribute('content') : null;
  }

  /**
   * Build the iframe for the content. Main answers every IFRAMEREADY with MAINREADY,
   * and this frame sends IFRAMEREADY twice, so only the first MAINREADY builds.
   * @param {object} options - Options as sent with MAINREADY
   * @param {string} options.contentNamespace - Namespace for content storage
   * @param {string} [options.startUrl] - URL to the content entry point
   * @param {string} [options.handlerUrl] - URL to the content type's handler script
   * @param {object} [options.contentState] - Saved state keyed by shim name
   * @param {object} [options.userData] - The learner's user data
   * @param {number} options.now - Current server time
   * @returns {Promise<void>} Resolves when the content has loaded, or failed to
   */
  async createIframe({
    contentNamespace,
    startUrl = '',
    handlerUrl = null,
    contentState = {},
    userData = {},
    now,
  } = {}) {
    if (this.iframe) {
      return;
    }
    this.contentNamespace = contentNamespace;
    this.iframe = document.createElement('iframe');
    this.iframe.style.border = 0;
    this.iframe.style.padding = 0;
    this.iframe.style.margin = 0;
    this.iframe.style.position = 'absolute';
    this.iframe.style.width = '100%';
    this.iframe.height = '100%';
    document.body.appendChild(this.iframe);
    // Fires on every navigation of the frame, not only the entry point: a broken link
    // followed inside a zip lands on the same zip_wsgi error body. A listener rather
    // than onload, which handlers assign for their own load detection.
    this.iframe.addEventListener('load', () => {
      const error = this._loadingError();
      if (error) {
        this.mediator.sendMessage({
          nameSpace,
          event: events.ERROR,
          data: { message: error, error: 'LOADING_ERROR' },
        });
      }
    });
    this.mediator.sendMessage({ nameSpace, event: events.LOADING, data: true });

    try {
      // Load the content-type specific handler
      if (!handlerUrl) {
        throw new Error('handlerUrl is required - each content type must provide its own handler');
      }

      await this._loadHandler(handlerUrl);

      this.handler.setNow(now);

      // Restore the saved session before the content loads, so the shims already
      // hold it by the time the content's own scripts read them.
      this.handler.setData(contentState);
      this.handler.setUserData(userData);

      // After restoring, so it carries the restored progress.
      this.mediator.sendMessage({
        nameSpace,
        event: events.HANDLER_REGISTRATION,
        data: { progress: this.handler.getProgress() },
      });

      // Initialize content via handler - handler is responsible for setting iframe.src
      // and returning a promise that resolves when content is loaded
      await this.handler.init(this.iframe, startUrl);

      // The load listener has already reported an entry point that failed.
      if (!this._loadingError()) {
        this.mediator.sendMessage({ nameSpace, event: events.LOADING, data: false });
      }
    } catch (e) {
      logging.error('Handler loading/initialization failed:', e);
      this.mediator.sendMessage({
        nameSpace,
        event: events.ERROR,
        data: { message: e.message, error: 'HANDLER_ERROR' },
      });
    }
  }
}
