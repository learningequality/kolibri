import Mediator from '../src/mediator';

describe('Mediator', () => {
  let mediator;
  beforeEach(() => {
    mediator = new Mediator(window);
  });
  afterEach(() => {
    mediator.destroy();
  });
  describe('handleMessage method', () => {
    it('should return undefined when an event not matching the data schema is received', () => {
      expect(mediator.handleMessage({ data: {} })).toBeUndefined();
    });
    it('should call a registered callback that matches the specified namespace and event', () => {
      const callback = jest.fn();
      const data = 'testData';
      const nameSpace = 'testNameSpace';
      const event = 'testEvent';
      mediator.__messageHandlers[nameSpace] = {
        [event]: [callback],
      };
      mediator.handleMessage({ data: { event, nameSpace, data } });
      expect(callback).toHaveBeenCalledWith(data);
    });
    it('should call a registered callback even if another callback registered for the same event errors', () => {
      jest.spyOn(console, 'debug').mockImplementation(() => {}); // eslint-disable-line no-console
      const callback = jest.fn();
      const callbackError = jest.fn(() => {
        throw new Error();
      });
      const data = 'testData';
      const nameSpace = 'testNameSpace';
      const event = 'testEvent';
      mediator.__messageHandlers[nameSpace] = {
        [event]: [callbackError, callback],
      };
      mediator.handleMessage({ data: { event, nameSpace, data } });
      expect(callback).toHaveBeenCalledWith(data);
    });
    it('should debug log if a callback registered for the same event errors', () => {
      jest.spyOn(console, 'debug').mockImplementation(() => {}); // eslint-disable-line no-console
      const callbackError = jest.fn(() => {
        throw new Error();
      });
      const data = 'testData';
      const nameSpace = 'testNameSpace';
      const event = 'testEvent';
      mediator.__messageHandlers[nameSpace] = {
        [event]: [callbackError],
      };
      mediator.handleMessage({ data: { event, nameSpace, data } });
      expect(console.debug).toHaveBeenCalledTimes(2); // eslint-disable-line no-console
    });
    describe('when restricted to a source window', () => {
      // Two main-side clients can share a window - a custom channel and the content
      // overlay opened from it - and each must only hear its own iframe.
      const message = source => ({ source, data: { event: 'e', nameSpace: 'n', data: 1 } });
      let current;
      let restricted;
      let callback;
      beforeEach(() => {
        current = {};
        restricted = new Mediator({}, { source: current });
        callback = jest.fn();
        restricted.registerMessageHandler({ event: 'e', nameSpace: 'n', callback });
      });
      afterEach(() => {
        restricted.destroy();
      });

      it('should handle a message from its source', () => {
        restricted.handleMessage(message(current));
        expect(callback).toHaveBeenCalledWith(1);
      });
      it('should ignore a message from any other window', () => {
        restricted.handleMessage(message(window));
        expect(callback).not.toHaveBeenCalled();
      });
    });
  });
  describe('dispatch method', () => {
    it('should run the matching callbacks without posting to any window', () => {
      const posted = jest.spyOn(window, 'postMessage');
      const callback = jest.fn();
      mediator.registerMessageHandler({ event: 'e', nameSpace: 'n', callback });

      mediator.dispatch({ event: 'e', nameSpace: 'n', data: 1 });

      expect(callback).toHaveBeenCalledWith(1);
      expect(posted).not.toHaveBeenCalled();
      posted.mockRestore();
    });
  });
  describe('sending to a distinct remote', () => {
    const message = { data: 'testData', event: 'testEvent', nameSpace: 'testNameSpace' };
    let remote;
    let withRemote;
    let posted;
    beforeEach(() => {
      remote = { postMessage: jest.fn() };
      withRemote = new Mediator(remote);
      posted = jest.spyOn(window, 'postMessage');
    });
    afterEach(() => {
      posted.mockRestore();
      withRemote.destroy();
    });

    it('sendLocalMessage should post the message to the local window only', () => {
      withRemote.sendLocalMessage(message);
      expect(posted).toHaveBeenCalledWith(message, '*');
      expect(remote.postMessage).not.toHaveBeenCalled();
    });
    it('sendMessage should post the message to the remote only', () => {
      withRemote.sendMessage(message);
      expect(remote.postMessage).toHaveBeenCalledWith(message, '*');
      expect(posted).not.toHaveBeenCalled();
    });
  });
  describe('registerMessageHandler method', () => {
    it('should add a callback to the array of callbacks for that nameSpace and event', () => {
      const nameSpace = 'testNameSpace';
      const event = 'testEvent';
      const callback = jest.fn();
      mediator.registerMessageHandler({ event, nameSpace, callback });
      expect(mediator.__messageHandlers).toEqual({
        [nameSpace]: {
          [event]: [callback],
        },
      });
    });
    it('should add two callbacks to the array of callbacks for that nameSpace and event when called repeatedly', () => {
      const nameSpace = 'testNameSpace';
      const event = 'testEvent';
      const callback = jest.fn();
      const callback1 = jest.fn();
      mediator.registerMessageHandler({ event, nameSpace, callback });
      mediator.registerMessageHandler({ event, nameSpace, callback: callback1 });
      expect(mediator.__messageHandlers).toEqual({
        [nameSpace]: {
          [event]: [callback, callback1],
        },
      });
    });
    it('should not add a callback to the array of callbacks for that nameSpace and event if the callback is not a function', () => {
      const nameSpace = 'testNameSpace';
      const event = 'testEvent';
      const callback = 'testcallback';
      mediator.registerMessageHandler({ event, nameSpace, callback });
      expect(mediator.__messageHandlers).toEqual({});
    });
    it('should not add a callback to the array of callbacks for that nameSpace if event is not defined', () => {
      const nameSpace = 'testNameSpace';
      const callback = jest.fn();
      mediator.registerMessageHandler({ nameSpace, callback });
      expect(mediator.__messageHandlers).toEqual({});
    });
    it('should not add a callback to the array of callbacks if nameSpace is not defined', () => {
      const callback = jest.fn();
      const event = 'testEvent';
      mediator.registerMessageHandler({ event, callback });
      expect(mediator.__messageHandlers).toEqual({});
    });
  });
  describe('removeMessageHandler method', () => {
    it('should do nothing if there are no registered handlers', () => {
      const nameSpace = 'testNameSpace';
      const event = 'testEvent';
      const callback = jest.fn();
      mediator.removeMessageHandler({ event, nameSpace, callback });
      expect(mediator.__messageHandlers).toEqual({});
    });
    it('should do nothing if there are no registered handlers for that event', () => {
      const nameSpace = 'testNameSpace';
      const event = 'testEvent';
      const callback = jest.fn();
      const testData = {
        otherEvent: [callback],
      };
      mediator.__messageHandlers[nameSpace] = testData;
      mediator.removeMessageHandler({ event, nameSpace, callback });
      expect(mediator.__messageHandlers).toEqual({
        [nameSpace]: testData,
      });
    });
    it('should do nothing if the passed in callback does not match registered handlers for that event', () => {
      const nameSpace = 'testNameSpace';
      const event = 'testEvent';
      const callback = jest.fn();
      const otherCallback = jest.fn();
      const testData = {
        [event]: [otherCallback],
      };
      mediator.__messageHandlers[nameSpace] = testData;
      mediator.removeMessageHandler({ event, nameSpace, callback });
      expect(mediator.__messageHandlers).toEqual({
        [nameSpace]: testData,
      });
    });
    it('should remove the passed in callback if it matches a registered handler for that event', () => {
      const nameSpace = 'testNameSpace';
      const event = 'testEvent';
      const callback = jest.fn();
      const otherCallback = jest.fn();
      const testData = {
        [event]: [callback, otherCallback],
      };
      mediator.__messageHandlers[nameSpace] = testData;
      mediator.removeMessageHandler({ event, nameSpace, callback });
      expect(mediator.__messageHandlers).toEqual({
        [nameSpace]: {
          [event]: [otherCallback],
        },
      });
    });
    it('should remove all callbacks if no callback passed in', () => {
      const nameSpace = 'testNameSpace';
      const event = 'testEvent';
      const callback = jest.fn();
      const otherCallback = jest.fn();
      const testData = {
        [event]: [callback, otherCallback],
      };
      mediator.__messageHandlers[nameSpace] = testData;
      mediator.removeMessageHandler({ event, nameSpace });
      expect(mediator.__messageHandlers).toEqual({
        [nameSpace]: {
          [event]: [],
        },
      });
    });
  });
});
