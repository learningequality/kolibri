import 'mutationobserver-shim';
import Sandbox from '../src/iframeClient';
import { events, nameSpace } from '../src/base';

describe('Sandbox iframeClient', () => {
  let sandbox;
  beforeEach(() => {
    window.name = nameSpace;
    sandbox = new Sandbox();
  });
  describe('constructor method', () => {
    it('should bind a listener to a readycheck event to send a ready event', () => {
      sandbox.mediator.sendMessage = jest.fn();
      return new Promise(resolve => {
        sandbox.mediator.registerMessageHandler({
          nameSpace,
          event: events.READYCHECK,
          callback: () => {
            resolve();
          },
        });
        sandbox.mediator.sendLocalMessage({ nameSpace, event: events.READYCHECK });
      }).then(() => {
        expect(sandbox.mediator.sendMessage).toHaveBeenCalledWith({
          nameSpace,
          event: events.IFRAMEREADY,
          data: true,
        });
      });
    });
    it('should bind a listener to a ready event to call the createIframe callback', () => {
      expect(sandbox.mediator.__messageHandlers[nameSpace][events.MAINREADY].length).toBe(1);
    });
    it('should call the createIframe method when the main ready event is triggered', () => {
      const createIframe = jest.fn();
      sandbox.mediator.__messageHandlers[nameSpace][events.MAINREADY] = [createIframe];
      sandbox.mediator.sendMessage = jest.fn();
      return new Promise(resolve => {
        sandbox.mediator.registerMessageHandler({
          nameSpace,
          event: events.MAINREADY,
          callback: () => {
            resolve();
          },
        });
        sandbox.mediator.sendLocalMessage({ nameSpace, event: events.MAINREADY });
      }).then(() => {
        expect(createIframe).toHaveBeenCalled();
      });
    });
  });
});
