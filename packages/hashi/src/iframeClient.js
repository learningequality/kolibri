import Mediator from './mediator';
import LocalStorage from './localStorage';
import SessionStorage from './sessionStorage';
import Cookie from './cookie';
import SCORM from './SCORM';
import { events, nameSpace } from './hashiBase';
import patchXMLHttpRequest from './monkeyPatchXMLHttpRequest';
import patchCrossOrigin from './monkeyPatchCORSMediaElements';
import { executePage } from './replaceScript';

/*
 * This class is initialized inside the context of a sandboxed iframe.
 * It provides shims for various APIs that would otherwise be blocked
 * inside a sandboxed iframe context, and communicates persistent data
 * via window.postMessage, to allow for persistence between sessions
 * without violating Same-Origin policies.
 */
export default class SandboxEnvironment {
  constructor() {
    if (window.name !== nameSpace) {
      throw new ReferenceError('Running Hashi outside of a managed iframe');
    }

    // Initialize the Mediator to listen to send messages on the parent of
    // this window (i.e. the iframe parent)
    this.mediator = new Mediator(window.parent);

    this.localStorage = new LocalStorage(this.mediator);

    // Initialize the local storage
    this.localStorage.iframeInitialize();

    this.sessionStorage = new SessionStorage(this.mediator);

    this.sessionStorage.iframeInitialize();

    this.cookie = new Cookie(this.mediator);

    this.cookie.iframeInitialize();

    this.SCORM = new SCORM(this.mediator);

    this.SCORM.iframeInitialize();

    patchXMLHttpRequest();

    patchCrossOrigin();

    this.mediator.registerMessageHandler({
      nameSpace,
      event: events.READY,
      // Get all script tags that have been wrapped in templates
      // by the backend, and then execute them in order.
      // This causes any script execution to be deferred until Hashi has
      // initalized the local environment.
      callback: executePage,
    });

    // Set up a listener for a ready check event.
    this.mediator.registerMessageHandler({
      nameSpace,
      event: events.READYCHECK,
      callback: () => {
        this.mediator.sendMessage({ nameSpace, event: events.READY, data: true });
      },
    });

    // At this point we are ready, so send the message, in case we misssed the
    // the ready check request.
    this.mediator.sendMessage({ nameSpace, event: events.READY, data: true });
  }
}
