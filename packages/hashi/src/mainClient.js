import Mediator from './mediator';
import LocalStorage from './localStorage';
import { events, nameSpace } from './hashiBase';

export default class Hashi {
  constructor(iframe) {
    this.events = events;
    this.iframe = iframe;
    this.mediator = new Mediator(this.iframe.contentWindow);
    this.localStorage = new LocalStorage(this.mediator);
  }
  sync() {
    this.localStorage.sync();
    this.mediator.sendMessage({ nameSpace, event: events.SYNCED, data: true });
  }
  on(event, callback) {
    if (!Object.values(events).includes(event)) {
      throw ReferenceError(`${event} is not a valid event name for ${nameSpace}`);
    }
    this.mediator.registerMessageHandler({ nameSpace, event, callback });
  }
}
