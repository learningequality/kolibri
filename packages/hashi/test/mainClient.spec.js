import Hashi from '../src/mainClient';
import { events, nameSpace } from '../src/hashiBase';

describe('Hashi mainClient', () => {
  let hashi;
  let iframe;
  beforeEach(() => {
    iframe = document.createElement('iframe');
    iframe.name = nameSpace;
    hashi = new Hashi({ iframe });
  });
  describe('constructor method', () => {
    it('should set ready to false', () => {
      expect(hashi.ready).toBe(false);
    });
    it('should bind a listener to a ready event to set ready to true on the Hashi object', () => {
      return new Promise(resolve => {
        hashi.on(events.READY, () => {
          resolve();
        });
        hashi.mediator.sendLocalMessage({ nameSpace, event: events.READY });
      }).then(() => {
        expect(hashi.ready).toBe(true);
      });
    });
  });
  describe('initialize method', () => {
    it('should call __setData immediately if ready is true', () => {
      const data = {};
      hashi.ready = true;
      hashi.__setData = jest.fn();
      hashi.initialize(data);
      expect(hashi.__setData).toHaveBeenCalledWith(data);
    });
    it('should fire a ready check if ready is false', () => {
      hashi.mediator.sendMessage = jest.fn();
      hashi.initialize();
      expect(hashi.mediator.sendMessage).toHaveBeenCalledWith({
        nameSpace,
        event: events.READYCHECK,
        data: true,
      });
    });
    it('should call __setData once a ready event is fired', () => {
      const data = {};
      return new Promise(resolve => {
        hashi.__setData = jest.fn();
        hashi.mediator.sendMessage = jest.fn();
        hashi.initialize(data);
        expect(hashi.__setData).not.toHaveBeenCalled();
        hashi.on(events.READY, () => {
          resolve();
        });
        hashi.mediator.sendLocalMessage({ nameSpace, event: events.READY, data: true });
      }).then(() => {
        expect(hashi.__setData).toHaveBeenCalledWith(data);
      });
    });
    it('should call __setData once a second ready event is fired, even if ready was already set to true by the first', () => {
      const data = {};
      hashi.mediator.sendMessage = jest.fn();
      hashi.ready = true;
      hashi.initialize(data);
      return new Promise(resolve => {
        hashi.__setData = jest.fn();
        hashi.mediator.sendMessage = jest.fn();
        expect(hashi.__setData).not.toHaveBeenCalled();
        hashi.on(events.READY, () => {
          resolve();
        });
        hashi.mediator.sendLocalMessage({ nameSpace, event: events.READY, data: true });
      }).then(() => {
        expect(hashi.__setData).toHaveBeenCalledWith(data);
      });
    });
  });
  describe('__setData method', () => {
    it('should call setData on each storage object', () => {
      hashi.mediator.sendMessage = jest.fn();
      const data = {};
      Object.keys(hashi.storage).forEach(key => {
        const storage = hashi.storage[key];
        data[storage.nameSpace] = {
          test: storage.nameSpace,
        };
        storage.setData = jest.fn();
      });
      hashi.__setData(data);
      Object.keys(hashi.storage).forEach(key => {
        const storage = hashi.storage[key];
        expect(storage.setData).toHaveBeenCalledWith(data[storage.nameSpace]);
      });
    });
    it('should call on with the stateupdate event', () => {
      hashi.mediator.sendMessage = jest.fn();
      const data = {};
      Object.keys(hashi.storage).forEach(key => {
        const storage = hashi.storage[key];
        storage.on = jest.fn();
      });
      hashi.__setData(data);
      Object.keys(hashi.storage).forEach(key => {
        const storage = hashi.storage[key];
        expect(storage.on.mock.calls[0][0]).toEqual(events.STATEUPDATE);
      });
    });
    it('should call setNow on the cookie storage if now is defined', () => {
      hashi.mediator.sendMessage = jest.fn();
      const data = {};
      hashi.storage.cookie.setNow = jest.fn();
      hashi.now = jest.fn(() => 'test');
      hashi.__setData(data);
      expect(hashi.storage.cookie.setNow).toHaveBeenCalledWith('test');
    });
    it('should not call setNow on the cookie storage if now is undefined', () => {
      hashi.mediator.sendMessage = jest.fn();
      const data = {};
      hashi.storage.cookie.setNow = jest.fn();
      hashi.__setData(data);
      expect(hashi.storage.cookie.setNow).not.toHaveBeenCalled();
    });
    it('should call mediator sendMessage with the ready event', () => {
      hashi.mediator.sendMessage = jest.fn();
      const data = {};
      hashi.__setData(data);
      expect(hashi.mediator.sendMessage).toHaveBeenCalledWith({
        nameSpace,
        event: events.READY,
        data: true,
      });
    });
  });
  describe('data getter', () => {
    it('should return the data from each of the storage objects in a namespaced object', () => {
      hashi.mediator.sendMessage = jest.fn();
      const data = {};
      const cookie = hashi.storage.cookie;
      const cookieData = {
        rootCookies: {
          test: {
            value: 'test',
            expires: String(new Date(Date.now() + 1000000)),
          },
        },
        byPath: {},
      };
      data[cookie.nameSpace] = cookieData;
      cookie.setData(cookieData);
      const localStorage = hashi.storage.localStorage;
      const localStorageData = {
        test: localStorage.nameSpace,
      };
      data[localStorage.nameSpace] = localStorageData;
      localStorage.setData(localStorageData);
      expect(hashi.data).toEqual(data);
    });
  });
  describe('on method', () => {
    it('should throw a reference error if an invalid event is set', () => {
      expect(hashi.on).toThrowError(ReferenceError);
    });
    it('should call the mediator registerMessageHandler method', () => {
      hashi.mediator.registerMessageHandler = jest.fn();
      const callback = jest.fn();
      hashi.on(events.READY, callback);
      expect(hashi.mediator.registerMessageHandler).toHaveBeenCalledWith({
        nameSpace,
        event: events.READY,
        callback,
      });
    });
  });
  describe('onStateUpdate method', () => {
    it('should call the on method with the STATEUPDATE event', () => {
      hashi.on = jest.fn();
      const callback = jest.fn();
      hashi.onStateUpdate(callback);
      expect(hashi.on).toHaveBeenCalledWith(events.STATEUPDATE, callback);
    });
  });
});
