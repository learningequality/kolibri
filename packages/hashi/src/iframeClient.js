import URLPolyfill from 'url-polyfill'; // eslint-disable-line no-unused-vars
import Mediator from './mediator';
import LocalStorage from './localStorage';
import { events, nameSpace } from './hashiBase';

export default class Hashi {
  constructor() {
    // Initialize the Mediator to listen to send messages on the parent of
    // this window (i.e. the iframe parent)
    const mediator = new Mediator(window.parent);

    const localStorage = new LocalStorage(mediator);

    // Initialize the local storage
    localStorage.iframeInitialize();

    mediator.registerMessageHandler({
      nameSpace,
      event: events.SYNCED,
      callback: this.loadPage.bind(this),
    });

    mediator.sendMessage({ nameSpace, event: events.READY, data: true });
  }
  loadPage() {
    const req = new XMLHttpRequest();
    req.addEventListener('load', () => {
      this.setContent(req.responseText);
    });
    const getParams = new URLSearchParams(window.location.search);
    getParams.append('HashiRequest', true);
    const url = new URL(window.location.href);
    url.search = getParams.toString();
    req.open('GET', url.href);
    req.send();
  }
  setContent(contents) {
    window.document.write(contents);
  }
}
