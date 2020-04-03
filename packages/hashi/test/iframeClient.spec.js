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
    it('should bind a listener to a ready event to call the executePage callback', () => {
      expect(hashi.mediator.__messageHandlers[nameSpace][events.READY].length).toBe(1);
    });
    it('should call the executePage method when the ready event is triggered', () => {
      const executePage = jest.fn();
      hashi.mediator.__messageHandlers[nameSpace][events.READY] = [executePage];
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
        expect(executePage).toHaveBeenCalled();
      });
    });
  });
});
