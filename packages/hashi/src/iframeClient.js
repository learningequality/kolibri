import Mediator from './mediator';
import LocalStorage from './localStorage';
import SessionStorage from './sessionStorage';
import Cookie from './cookie';
import { events, nameSpace } from './hashiBase';
import patchXMLHttpRequest from './monkeyPatchXMLHttpRequest';
import patchCrossOrigin from './monkeyPatchCORSMediaElements';
import loadCurrentPage from './loadCurrentPage';

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

    // Initialize the local storage
    try {
      this.localStorage.iframeInitialize();
    } catch (e) {} // eslint-disable-line no-empty

    this.sessionStorage = new SessionStorage(this.mediator);

    try {
      this.sessionStorage.iframeInitialize();
    } catch (e) {} // eslint-disable-line no-empty

    this.cookie = new Cookie(this.mediator);

    try {
      this.cookie.iframeInitialize();
    } catch (e) {} // eslint-disable-line no-empty

    patchXMLHttpRequest();

    patchCrossOrigin();

    this.mediator.registerMessageHandler({
      nameSpace,
      event: events.READY,
      callback: loadCurrentPage,
    });

    // Send a ready message in case the outer Hashi has already initialized
    this.mediator.sendMessage({ nameSpace, event: events.READY, data: true });

    // Set up a listener for a ready check event in case the iframe hashi has
    // initialized first.
    this.mediator.registerMessageHandler({
      nameSpace,
      event: events.READYCHECK,
      callback: () => {
        this.mediator.sendMessage({ nameSpace, event: events.READY, data: true });
      },
    });
  }
}
