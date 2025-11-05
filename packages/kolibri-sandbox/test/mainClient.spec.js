import Sandbox from '../src/mainClient';
import { events, nameSpace } from '../src/base';

describe('Sandbox mainClient', () => {
  let sandbox;
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
    sandbox = new Sandbox({ iframe: iframeProxy });
  });
  describe('initialize method', () => {
    it('should call __setData immediately', () => {
      const data = {};
      const userData = {};
      sandbox.__setData = jest.fn();
      sandbox.initialize(data, userData);
      expect(sandbox.__setData).toHaveBeenCalledWith(data, userData);
    });
    it('should fire a ready check', () => {
      sandbox.mediator.sendMessage = jest.fn();
      sandbox.initialize();
      expect(sandbox.mediator.sendMessage).toHaveBeenCalledWith({
        nameSpace,
        event: events.READYCHECK,
        data: true,
      });
    });
    it('should call __setData once the iframe ready event is fired', () => {
      const data = {};
      const userData = {};
      return new Promise(resolve => {
        sandbox.mediator.sendMessage = jest.fn();
        sandbox.initialize(data, userData);
        sandbox.on(events.IFRAMEREADY, () => {
          resolve();
        });
        sandbox.__setData = jest.fn();
        sandbox.mediator.sendLocalMessage({ nameSpace, event: events.IFRAMEREADY, data: true });
      }).then(() => {
        expect(sandbox.__setData).toHaveBeenCalledWith(sandbox.data, userData);
      });
    });
    it('should call __setData once a second iframe ready event is fired', () => {
      const data = {};
      const userData = {};
      sandbox.mediator.sendMessage = jest.fn();
      sandbox.initialize(data, userData);
      return new Promise(resolve => {
        sandbox.__setData = jest.fn();
        sandbox.on(events.IFRAMEREADY, () => {
          resolve();
        });
        sandbox.mediator.sendLocalMessage({ nameSpace, event: events.IFRAMEREADY, data: true });
      }).then(() => {
        expect(sandbox.__setData).toHaveBeenCalledWith(sandbox.data, userData);
      });
    });
    it('should call __setData once a second iframe ready event is fired with any updated data', () => {
      const data = {};
      const userData = {};
      const updatedUserData = { userId: 'test' };
      sandbox.mediator.sendMessage = jest.fn();
      sandbox.initialize(data, userData);
      return new Promise(resolve => {
        sandbox.__setData = jest.fn();
        sandbox.updateData({
          contentState: { localStorage: { test: 'this' } },
          userData: updatedUserData,
        });
        sandbox.on(events.IFRAMEREADY, () => {
          resolve();
        });
        sandbox.mediator.sendLocalMessage({ nameSpace, event: events.IFRAMEREADY, data: true });
      }).then(() => {
        expect(sandbox.__setData).toHaveBeenCalledWith(sandbox.data, updatedUserData);
      });
    });
    it('should call mediator sendMessage with the readycheck event', () => {
      const data = {};
      const userData = {};
      sandbox.mediator.sendMessage = jest.fn();
      sandbox.initialize(data, userData);
      expect(sandbox.mediator.sendMessage).toHaveBeenCalledWith({
        nameSpace,
        event: events.READYCHECK,
        data: true,
      });
    });
  });
  describe('__setData method', () => {
    it('should call setData on each storage object', () => {
      sandbox.mediator.sendMessage = jest.fn();
      const data = {};
      Object.keys(sandbox.storage).forEach(key => {
        const storage = sandbox.storage[key];
        data[storage.nameSpace] = {
          test: storage.nameSpace,
        };
        storage.setData = jest.fn();
      });
      sandbox.__setData(data);
      Object.keys(sandbox.storage).forEach(key => {
        const storage = sandbox.storage[key];
        expect(storage.setData).toHaveBeenCalledWith(data[storage.nameSpace]);
      });
    });
    it('should call setNow on the cookie storage if now is defined', () => {
      sandbox.mediator.sendMessage = jest.fn();
      const data = {};
      sandbox.storage.cookie.setNow = jest.fn();
      sandbox.now = jest.fn(() => 'test');
      sandbox.__setData(data);
      expect(sandbox.storage.cookie.setNow).toHaveBeenCalledWith('test');
    });
    it('should not call setNow on the cookie storage if now is undefined', () => {
      sandbox.mediator.sendMessage = jest.fn();
      const data = {};
      sandbox.storage.cookie.setNow = jest.fn();
      sandbox.__setData(data);
      expect(sandbox.storage.cookie.setNow).not.toHaveBeenCalled();
    });
    it('should set the userData if it is defined', () => {
      sandbox.mediator.sendMessage = jest.fn();
      const data = {};
      const userData = {};
      sandbox.__setData(data, userData);
      expect(sandbox.userData).toEqual(userData);
    });
  });
  describe('__setListeners method', () => {
    it('should call on with the stateupdate event', () => {
      sandbox.mediator.sendMessage = jest.fn();
      Object.keys(sandbox.storage).forEach(key => {
        const storage = sandbox.storage[key];
        storage.on = jest.fn();
      });
      sandbox.__setListeners();
      Object.keys(sandbox.storage).forEach(key => {
        const storage = sandbox.storage[key];
        expect(storage.on.mock.calls[0][0]).toEqual(events.STATEUPDATE);
      });
    });
  });
  describe('data getter', () => {
    it('should return the data from each of the storage objects in a namespaced object', () => {
      sandbox.mediator.sendMessage = jest.fn();
      const data = {};
      const cookie = sandbox.storage.cookie;
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
      const localStorage = sandbox.storage.localStorage;
      const localStorageData = {
        test: localStorage.nameSpace,
      };
      data[localStorage.nameSpace] = localStorageData;
      localStorage.setData(localStorageData);
      const SCORM = sandbox.storage.SCORM;
      const SCORMData = {
        cmi: {
          core: {
            lesson_status: 'passed',
          },
        },
      };
      data[SCORM.nameSpace] = SCORMData;
      SCORM.setData(SCORMData);
      const xAPI = sandbox.storage.xAPI;
      const xAPIData = {
        statements: [],
      };
      data[xAPI.nameSpace] = xAPIData;
      xAPI.setData(xAPIData);
      const H5P = sandbox.storage.H5P;
      const H5PData = {
        random: {
          data: 123,
        },
      };
      data[H5P.nameSpace] = H5PData;
      H5P.setData(H5PData);
      expect(sandbox.data).toEqual(data);
    });
  });
  describe('on method', () => {
    it('should throw a reference error if an invalid event is set', () => {
      expect(sandbox.on).toThrow(ReferenceError);
    });
    it('should call the mediator registerMessageHandler method', () => {
      sandbox.mediator.registerMessageHandler = jest.fn();
      const callback = jest.fn();
      sandbox.on(events.IFRAMEREADY, callback);
      expect(sandbox.mediator.registerMessageHandler).toHaveBeenCalledWith({
        nameSpace,
        event: events.IFRAMEREADY,
        callback,
      });
    });
  });
  describe('onStateUpdate method', () => {
    it('should call the on method with the STATEUPDATE event', () => {
      sandbox.on = jest.fn();
      const callback = jest.fn();
      sandbox.onStateUpdate(callback);
      expect(sandbox.on).toHaveBeenCalledWith(events.STATEUPDATE, callback);
    });
  });
});
