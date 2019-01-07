import Mediator from '../src/mediator';

describe('Mediator', () => {
  let mediator;
  beforeEach(() => {
    mediator = new Mediator(window);
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
      console.debug = jest.fn(); // eslint-disable-line no-console
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
    it('should call a registered callback even if another callback registered for the same event errors', () => {
      console.debug = jest.fn(); // eslint-disable-line no-console
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
  });
  describe('sendLocalMessage method', () => {
    it('should send a message with data', () => {
      return new Promise(resolve => {
        const data = 'testData';
        const nameSpace = 'testNameSpace';
        const event = 'testEvent';
        window.addEventListener('message', ev => {
          expect(ev.data.data).toEqual(data);
          resolve();
        });
        mediator.sendLocalMessage({
          data,
          event,
          nameSpace,
        });
      });
    });
    it('should send a message with event', () => {
      return new Promise(resolve => {
        const data = 'testData';
        const nameSpace = 'testNameSpace';
        const event = 'testEvent';
        window.addEventListener('message', ev => {
          expect(ev.data.event).toEqual(event);
          resolve();
        });
        mediator.sendLocalMessage({
          data,
          event,
          nameSpace,
        });
      });
    });
    it('should send a message with nameSpace', () => {
      return new Promise(resolve => {
        const data = 'testData';
        const nameSpace = 'testNameSpace';
        const event = 'testEvent';
        window.addEventListener('message', ev => {
          expect(ev.data.nameSpace).toEqual(nameSpace);
          resolve();
        });
        mediator.sendLocalMessage({
          data,
          event,
          nameSpace,
        });
      });
    });
  });
  describe('sendMessage method', () => {
    it('should send a message with data', () => {
      return new Promise(resolve => {
        const data = 'testData';
        const nameSpace = 'testNameSpace';
        const event = 'testEvent';
        window.addEventListener('message', ev => {
          expect(ev.data.data).toEqual(data);
          resolve();
        });
        mediator.sendMessage({
          data,
          event,
          nameSpace,
        });
      });
    });
    it('should send a message with event', () => {
      return new Promise(resolve => {
        const data = 'testData';
        const nameSpace = 'testNameSpace';
        const event = 'testEvent';
        window.addEventListener('message', ev => {
          expect(ev.data.event).toEqual(event);
          resolve();
        });
        mediator.sendMessage({
          data,
          event,
          nameSpace,
        });
      });
    });
    it('should send a message with nameSpace', () => {
      return new Promise(resolve => {
        const data = 'testData';
        const nameSpace = 'testNameSpace';
        const event = 'testEvent';
        window.addEventListener('message', ev => {
          expect(ev.data.nameSpace).toEqual(nameSpace);
          resolve();
        });
        mediator.sendMessage({
          data,
          event,
          nameSpace,
        });
      });
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
