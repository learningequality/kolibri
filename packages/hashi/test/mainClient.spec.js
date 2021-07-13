import Hashi from '../src/mainClient';
import { events, nameSpace } from '../src/hashiBase';

describe('Hashi mainClient', () => {
  let hashi;
  let iframe;
  beforeEach(() => {
    iframe = document.createElement('iframe');
    iframe.name = nameSpace;
    // contentWindow is undefined on jsdom simulation of an iframe
    // so we use a proxy here to expose the local window
    // object instead.
    const iframeProxy = new Proxy(iframe, {
      get(obj, prop) {
        if (prop === 'contentWindow') {
          return window;
        }
        return obj[prop];
      },
    });
    hashi = new Hashi({ iframe: iframeProxy });
  });
  describe('initialize method', () => {
    it('should call __setData immediately', () => {
      const data = {};
      const userData = {};
      hashi.__setData = jest.fn();
      hashi.initialize(data, userData);
      expect(hashi.__setData).toHaveBeenCalledWith(data, userData);
    });
    it('should fire a ready check', () => {
      hashi.mediator.sendMessage = jest.fn();
      hashi.initialize();
      expect(hashi.mediator.sendMessage).toHaveBeenCalledWith({
        nameSpace,
        event: events.READYCHECK,
        data: true,
      });
    });
    it('should call __setData once the iframe ready event is fired', () => {
      const data = {};
      const userData = {};
      return new Promise(resolve => {
        hashi.mediator.sendMessage = jest.fn();
        hashi.initialize(data, userData);
        hashi.on(events.IFRAMEREADY, () => {
          resolve();
        });
        hashi.__setData = jest.fn();
        hashi.mediator.sendLocalMessage({ nameSpace, event: events.IFRAMEREADY, data: true });
      }).then(() => {
        expect(hashi.__setData).toHaveBeenCalledWith(hashi.data, userData);
      });
    });
    it('should call __setData once a second iframe ready event is fired', () => {
      const data = {};
      const userData = {};
      hashi.mediator.sendMessage = jest.fn();
      hashi.initialize(data, userData);
      return new Promise(resolve => {
        hashi.__setData = jest.fn();
        hashi.on(events.IFRAMEREADY, () => {
          resolve();
        });
        hashi.mediator.sendLocalMessage({ nameSpace, event: events.IFRAMEREADY, data: true });
      }).then(() => {
        expect(hashi.__setData).toHaveBeenCalledWith(hashi.data, userData);
      });
    });
    it('should call __setData once a second iframe ready event is fired with any updated data', () => {
      const data = {};
      const userData = {};
      const updatedUserData = { userId: 'test' };
      hashi.mediator.sendMessage = jest.fn();
      hashi.initialize(data, userData);
      return new Promise(resolve => {
        hashi.__setData = jest.fn();
        hashi.updateData({
          contentState: { localStorage: { test: 'this' } },
          userData: updatedUserData,
        });
        hashi.on(events.IFRAMEREADY, () => {
          resolve();
        });
        hashi.mediator.sendLocalMessage({ nameSpace, event: events.IFRAMEREADY, data: true });
      }).then(() => {
        expect(hashi.__setData).toHaveBeenCalledWith(hashi.data, updatedUserData);
      });
    });
    it('should call mediator sendMessage with the readycheck event', () => {
      const data = {};
      const userData = {};
      hashi.mediator.sendMessage = jest.fn();
      hashi.initialize(data, userData);
      expect(hashi.mediator.sendMessage).toHaveBeenCalledWith({
        nameSpace,
        event: events.READYCHECK,
        data: true,
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
    it('should set the userData if it is defined', () => {
      hashi.mediator.sendMessage = jest.fn();
      const data = {};
      const userData = {};
      hashi.__setData(data, userData);
      expect(hashi.userData).toEqual(userData);
    });
  });
  describe('__setListeners method', () => {
    it('should call on with the stateupdate event', () => {
      hashi.mediator.sendMessage = jest.fn();
      Object.keys(hashi.storage).forEach(key => {
        const storage = hashi.storage[key];
        storage.on = jest.fn();
      });
      hashi.__setListeners();
      Object.keys(hashi.storage).forEach(key => {
        const storage = hashi.storage[key];
        expect(storage.on.mock.calls[0][0]).toEqual(events.STATEUPDATE);
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
      const SCORM = hashi.storage.SCORM;
      const SCORMData = {
        cmi: {
          core: {
            lesson_status: 'passed',
          },
        },
      };
      data[SCORM.nameSpace] = SCORMData;
      SCORM.setData(SCORMData);
      const xAPI = hashi.storage.xAPI;
      const xAPIData = {
        statements: [],
      };
      data[xAPI.nameSpace] = xAPIData;
      xAPI.setData(xAPIData);
      const H5P = hashi.storage.H5P;
      const H5PData = {
        random: {
          data: 123,
        },
      };
      data[H5P.nameSpace] = H5PData;
      H5P.setData(H5PData);
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
      hashi.on(events.IFRAMEREADY, callback);
      expect(hashi.mediator.registerMessageHandler).toHaveBeenCalledWith({
        nameSpace,
        event: events.IFRAMEREADY,
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
