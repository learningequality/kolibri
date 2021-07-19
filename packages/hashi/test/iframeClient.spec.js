import 'mutationobserver-shim';
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
          event: events.IFRAMEREADY,
          data: true,
        });
      });
    });
    it('should bind a listener to a ready event to call the createIframe callback', () => {
      expect(hashi.mediator.__messageHandlers[nameSpace][events.MAINREADY].length).toBe(1);
    });
    it('should call the createIframe method when the main ready event is triggered', () => {
      const createIframe = jest.fn();
      hashi.mediator.__messageHandlers[nameSpace][events.MAINREADY] = [createIframe];
      hashi.mediator.sendMessage = jest.fn();
      return new Promise(resolve => {
        hashi.mediator.registerMessageHandler({
          nameSpace,
          event: events.MAINREADY,
          callback: () => {
            resolve();
          },
        });
        hashi.mediator.sendLocalMessage({ nameSpace, event: events.MAINREADY });
      }).then(() => {
        expect(createIframe).toHaveBeenCalled();
      });
    });
  });
});
