import Hashi from '../src/iframeClient';
import { events, nameSpace } from '../src/hashiBase';

describe('Hashi iframeClient', () => {
  let hashi;
  beforeEach(() => {
    window.name = nameSpace;
    hashi = new Hashi();
  });
  describe('constructor method', () => {
    it('should bind a listener to a readycheck event to send a ready event', () => {
      hashi.mediator.sendMessage = jest.fn();
      return new Promise(resolve => {
        hashi.mediator.registerMessageHandler({
          nameSpace,
          event: events.READYCHECK,
          callback: () => {
            resolve();
          },
        });
        hashi.mediator.sendLocalMessage({ nameSpace, event: events.READYCHECK });
      }).then(() => {
        expect(hashi.mediator.sendMessage).toHaveBeenCalledWith({
          nameSpace,
          event: events.READY,
          data: true,
        });
      });
    });
    it('should bind a listener to a ready event to call the setScripts callback', () => {
      expect(hashi.mediator.__messageHandlers[nameSpace][events.READY].length).toBe(1);
    });
    it('should call the loadPage method when the ready event is triggered', () => {
      const loadPage = jest.fn();
      hashi.mediator.__messageHandlers[nameSpace][events.READY] = [loadPage];
      hashi.mediator.sendMessage = jest.fn();
      return new Promise(resolve => {
        hashi.mediator.registerMessageHandler({
          nameSpace,
          event: events.READY,
          callback: () => {
            resolve();
          },
        });
        hashi.mediator.sendLocalMessage({ nameSpace, event: events.READY });
      }).then(() => {
        expect(loadPage).toHaveBeenCalled();
      });
    });
  });
});
