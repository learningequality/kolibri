import Mediator from './mediator';
import LocalStorage from './localStorage';
import SessionStorage from './sessionStorage';
import Cookie from './cookie';
import { events, nameSpace } from './hashiBase';

export default class Hashi {
  constructor() {
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

    this.loadPage = this.loadPage.bind(this);

    // Override the open method to add the X-Requested-With
    // header properly for any requests to the server.
    // Do this to ensure that the Django side `is_ajax` check
    // is appropriately set.
    XMLHttpRequest.prototype.origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function() {
      this.origOpen.apply(this, arguments);
      this.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    };

    this.mediator.registerMessageHandler({
      nameSpace,
      event: events.READY,
      callback: this.loadPage,
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
  loadPage() {
    const req = new XMLHttpRequest();
    req.addEventListener('load', () => {
      this.setContent(req.responseText);
    });
    req.open('GET', window.location.href);
    req.send();
  }
  setContent(contents) {
    window.document.open();
    window.document.write(contents);
    window.document.close();
  }
}
