import Mediator from './mediator';
import LocalStorage from './localStorage';
import SessionStorage from './sessionStorage';
import Cookie from './cookie';
import SCORM from './SCORM';
import { events, nameSpace } from './hashiBase';

/*
 * This class is initialized inside the context of a sandboxed iframe.
 * It provides shims for various APIs that would otherwise be blocked
 * inside a sandboxed iframe context, and communicates persistent data
 * via window.postMessage, to allow for persistence between sessions
 * without violating Same-Origin policies.
 */
export default class SandboxEnvironment {
  constructor() {
    // Initialize the Mediator to listen to send messages on the parent of
    // this window (i.e. the iframe parent)
    this.mediator = new Mediator(window.parent);

    this.localStorage = new LocalStorage(this.mediator);

    this.sessionStorage = new SessionStorage(this.mediator);

    this.cookie = new Cookie(this.mediator);

    this.SCORM = new SCORM(this.mediator);

    // We initialize SCORM here, as the usual place for SCORM
    // to look for its API is window.parent.
    this.SCORM.iframeInitialize(window);

    this.createIframe = this.createIframe.bind(this);
    this.resizeIframe = this.resizeIframe.bind(this);

    this.mediator.registerMessageHandler({
      nameSpace,
      event: events.MAINREADY,
      // Get all script tags that have been wrapped in templates
      // by the backend, and then execute them in order.
      // This causes any script execution to be deferred until Hashi has
      // initalized the local environment.
      callback: this.createIframe,
    });

    // Set up a listener for a ready check event.
    this.mediator.registerMessageHandler({
      nameSpace,
      event: events.READYCHECK,
      callback: () => {
        this.mediator.sendMessage({ nameSpace, event: events.IFRAMEREADY, data: true });
      },
    });

    // At this point we are ready, so send the message, in case we misssed the
    // the ready check request.
    this.mediator.sendMessage({ nameSpace, event: events.IFRAMEREADY, data: true });
  }

  resizeIframe() {
    this.iframe.width = this.iframe.contentWindow.document.documentElement.scrollWidth + 'px';
    this.iframe.height = this.iframe.contentWindow.document.documentElement.scrollHeight + 'px';
  }

  initializeIframe(contentWindow) {
    // Only do anything if the contentWindow is the contentWindow of our
    // iframe - this is to prevent other generated iframes from doing anything here.
    if (contentWindow === this.iframe.contentWindow) {
      // Initialize the local storage
      this.localStorage.iframeInitialize(this.iframe.contentWindow);
      this.sessionStorage.iframeInitialize(this.iframe.contentWindow);
      this.cookie.iframeInitialize(this.iframe.contentWindow);
      this.iframe.contentWindow.addEventListener('resize', this.resizeIframe);
      this.iframe.contentWindow.addEventListener('DOMContentLoaded', this.resizeIframe, {
        once: true,
      });
    }
  }

  clearIframe() {
    try {
      this.iframe.contentWindow.removeEventListener('resize', this.resizeIframe);
    } catch (e) {} // eslint-disable-line no-empty
    try {
      document.body.removeChild(this.iframe);
    } catch (e) {} // eslint-disable-line no-empty
  }

  createIframe(srcUrl) {
    if (this.iframe) {
      this.clearIframe(this.iframe);
    }
    this.iframe = document.createElement('iframe');
    this.iframe.src = srcUrl;
    this.iframe.style = 'border: 0; padding: 0; width: 100%;';
    this.iframe.height = document.documentElement.scrollHeight;
    document.body.appendChild(this.iframe);
    this.initializeIframe(this.iframe.contentWindow);
  }
}
