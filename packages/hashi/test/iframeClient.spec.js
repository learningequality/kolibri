import Hashi from '../src/iframeClient';
import { events, nameSpace } from '../src/hashiBase';

describe('Hashi iframeClient', () => {
  let hashi;
  let mockXHR;
  beforeEach(() => {
    class mockXHRClass {
      constructor() {
        mockXHR = this;
        this.readyState = 4;
        this.responseText = '<html></html>';
      }
    }
    mockXHRClass.prototype.open = jest.fn();
    mockXHRClass.prototype.send = jest.fn();
    mockXHRClass.prototype.addEventListener = jest.fn();
    mockXHRClass.prototype.setRequestHeader = jest.fn();
    window.XMLHttpRequest = mockXHRClass;
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
      expect(hashi.mediator.__messageHandlers[nameSpace][events.READY]).toEqual([hashi.loadPage]);
    });
    it('should call the loadPage method when the ready event is triggered', () => {
      const loadPageMock = jest.fn();
      hashi.mediator.__messageHandlers[nameSpace][events.READY] = [loadPageMock];
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
        expect(loadPageMock).toHaveBeenCalled();
      });
    });
  });
  describe('loadPage method', () => {
    it('should add an onload event listener', () => {
      hashi.loadPage();
      expect(mockXHR.addEventListener.mock.calls[0][0]).toEqual('load');
    });
    it('should open a GET request to the current window URL', () => {
      hashi.loadPage();
      expect(mockXHR.origOpen).toHaveBeenCalledWith('GET', window.location.href);
    });
    it('should call send', () => {
      hashi.loadPage();
      expect(mockXHR.send).toHaveBeenCalledWith();
    });
    it('should call setRequestHeader on the request to set X-Requested-With to XMLHttpRequest', () => {
      hashi.loadPage();
      expect(mockXHR.setRequestHeader).toHaveBeenCalledWith('X-Requested-With', 'XMLHttpRequest');
    });
  });
});
