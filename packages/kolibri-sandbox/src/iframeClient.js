import Mediator from './mediator';
import { events, nameSpace } from './base';
import { loadHandler } from './handlerLoader';

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

    this.lastSentHeight = null;

    // Handler state for pluggable handler system
    this.handler = null;
    this._handlerRegistrationResolver = null;

    // The build in flight, and the handler it is building, so createIframe can
    // serialise against it.
    this._building = null;
    this._buildingHandlerUrl = null;

    // Expose self globally for handler self-registration
    window.SandboxEnvironment = this;

    this.createIframe = this.createIframe.bind(this);

    this.mediator.registerMessageHandler({
      nameSpace,
      event: events.MAINREADY,
      callback: data => {
        this.createIframe(data);
      },
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
   * Called by SandboxHandler constructor to register itself.
   * @param {SandboxHandler} handler - The handler instance registering itself
   */
  registerHandler(handler) {
    this.handler = handler;

    // Resolve any pending registration promise from loadHandler
    if (this._handlerRegistrationResolver) {
      this._handlerRegistrationResolver();
      this._handlerRegistrationResolver = null;
    }
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
      this.handler._initializeShims(contentWindow, {
        contentNamespace: this.contentNamespace,
      });
    } catch (e) {
      logging.debug(e);
      logging.log('Shimming APIs failed, data will not persist');
    }
  }

  clearIframe() {
    try {
      document.body.removeChild(this.iframe);
    } catch (e) {} // eslint-disable-line no-empty
    this.lastSentHeight = null;
    if (this.handler) {
      this.handler.destroy();
      // The shims registered on our mediator, which outlives them, so they have to
      // be unsubscribed or they keep taking the next handler's state.
      this.handler._destroyShims();
      this.handler = null;
    }
  }

  /**
   * Build the iframe for a piece of content, one build at a time.
   *
   * Main re-sends MAINREADY on every IFRAMEREADY, so the same build arrives more
   * than once, and content can change while a build is still in flight. Both would
   * otherwise interleave inside _buildIframe's awaits: the earlier run resumes to
   * find this.iframe and this.handler replaced, and initializes its successor's
   * iframe. So drop an exact repeat, and let a build finish before replacing it.
   * @param {object} options - Options as sent with MAINREADY
   * @returns {Promise<void>} Resolves when the content has loaded, or failed to
   */
  async createIframe(options = {}) {
    while (this._building) {
      if (options.handlerUrl === this._buildingHandlerUrl) {
        return this._building;
      }
      await this._building;
    }
    this._buildingHandlerUrl = options.handlerUrl ?? null;
    this._building = this._buildIframe(options).finally(() => {
      this._building = null;
      this._buildingHandlerUrl = null;
    });
    return this._building;
  }

  async _buildIframe({
    contentNamespace,
    startUrl = '',
    handlerUrl = null,
    contentState = {},
    userData = {},
    now = null,
  } = {}) {
    if (this.iframe) {
      this.clearIframe();
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
    this.mediator.sendMessage({ nameSpace, event: events.LOADING, data: true });

    try {
      // Load the content-type specific handler
      if (!handlerUrl) {
        throw new Error('handlerUrl is required - each content type must provide its own handler');
      }

      await loadHandler(handlerUrl, this);
      if (!this.handler) {
        throw new Error('Handler script loaded but did not register');
      }

      // Emit registration BEFORE loading content (security: establish contract first)
      const registration = this.handler.getRegistration();
      this.mediator.sendMessage({
        nameSpace,
        event: events.HANDLER_REGISTRATION,
        data: registration,
      });

      if (now != null) {
        this.handler.setNow(now);
      }

      // Restore the saved session before the content loads, so the shims already
      // hold it by the time the content's own scripts read them.
      this.handler.setData(contentState);
      this.handler.setUserData(userData);

      // Initialize content via handler - handler is responsible for setting iframe.src
      // and returning a promise that resolves when content is loaded
      await this.handler.init(this.iframe, startUrl, { contentNamespace });

      // Only readable while contentWindow is live; a transiently-null window
      // just means no error meta, not that loading should hang.
      const error = this.iframe.contentWindow
        ? this.iframe.contentDocument?.head?.querySelector('meta[name="sandbox-error"]')
        : null;
      if (error) {
        this.mediator.sendMessage({
          nameSpace,
          event: events.ERROR,
          data: { message: error.getAttribute('content'), error: 'LOADING_ERROR' },
        });
      } else {
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
