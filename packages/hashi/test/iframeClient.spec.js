import Hashi from '../src/iframeClient';
import { events, nameSpace } from '../src/hashiBase';
import loadCurrentPage from '../src/loadCurrentPage';

jest.mock('../src/loadCurrentPage');

describe('Hashi iframeClient', () => {
  let hashi;
  beforeEach(() => {
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
    it('should bind a listener to a ready event to call the loadPage method', () => {
      expect(hashi.mediator.__messageHandlers[nameSpace][events.READY]).toEqual([loadCurrentPage]);
    });
    it('should call the loadPage method when the ready event is triggered', () => {
      hashi.mediator.__messageHandlers[nameSpace][events.READY] = [loadCurrentPage];
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
        expect(loadCurrentPage).toHaveBeenCalled();
      });
    });
  });
});
