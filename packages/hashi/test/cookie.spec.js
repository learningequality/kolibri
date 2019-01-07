import Mediator from '../src/mediator';
import Cookie from '../src/cookie';

const emptyData = {
  rootCookies: {},
  byPath: {},
};

describe('The hashi cookie shim', () => {
  let cookie;
  let mediator;
  beforeEach(() => {
    mediator = new Mediator(window);
    cookie = new Cookie(mediator);
  });
  describe('__clearData method', () => {
    it('should set the __data attribute to the empty base object', () => {
      cookie.__data = {};
      cookie.__clearData();
      expect(cookie.__data).toEqual(emptyData);
    });
  });
  describe('__removeExpiredCookies method', () => {
    it('should remove any expired cookies from the rootCookies', () => {
      const testData = cookie.__data;
      testData.rootCookies['test'] = {
        value: 'test',
        expires: new Date(Date.now() - 10),
      };
      expect(cookie.__removeExpiredCookies(testData)).toEqual(emptyData);
    });
    it('should remove any expired cookies from the byPath cookies', () => {
      const testData = cookie.__data;
      testData.byPath['test/path'] = {
        test: {
          value: 'test',
          expires: new Date(Date.now() - 10),
        },
      };
      expect(cookie.__removeExpiredCookies(testData)).toEqual(emptyData);
    });
  });
  describe('__setData method', () => {
    it('should call __removeExpiredCookies if the data is of valid form', () => {
      cookie.__removeExpiredCookies = jest.fn();
      cookie.__setData(emptyData);
      expect(cookie.__removeExpiredCookies).toHaveBeenCalledWith(emptyData);
    });
    it('should call __clearData if the data is of invalid form', () => {
      cookie.__clearData = jest.fn();
      cookie.__setData({});
      expect(cookie.__clearData).toHaveBeenCalled();
    });
  });
  describe('iframeInitialize method', () => {
    it('should assign a property with a getter of the cookie __getCookies method to document.cookie', () => {
      cookie.iframeInitialize();
      expect(Object.getOwnPropertyDescriptor(document, 'cookie').get).toEqual(cookie.__getCookies);
    });
    it('should assign a property with a setter of the cookie __setItem method to document.cookie', () => {
      cookie.iframeInitialize();
      expect(Object.getOwnPropertyDescriptor(document, 'cookie').set).toEqual(cookie.__setItem);
    });
  });
  describe('data getter', () => {
    it('should return a copy of the current __data object', () => {
      expect(cookie.data).not.toBe(cookie.__data);
    });
    it('should return an exact copy of the current __data object if empty', () => {
      expect(cookie.data).toEqual(cookie.__data);
    });
    it('should remove session only cookies from the current __data object for root cookies', () => {
      cookie.__data.rootCookies['test'] = {
        value: 'test',
        expires: 'session',
      };
      expect(cookie.data).toEqual(emptyData);
    });
    it('should remove session only cookies from the current __data object for by path cookies', () => {
      cookie.__data.byPath['test/path'] = {
        test: {
          value: 'test',
          expires: 'session',
        },
      };
      expect(cookie.data).toEqual(emptyData);
    });
    it('should return future expiring cookies from the current __data object for root cookies', () => {
      cookie.__data.rootCookies['test'] = {
        value: 'test',
        expires: new Date(Date.now() + 1000000),
      };
      expect(cookie.data).toEqual(cookie.__data);
    });
    it('should return future expiring cookies from the current __data object for by path cookies', () => {
      cookie.__data.byPath['test/path'] = {
        test: {
          value: 'test',
          expires: new Date(Date.now() + 1000000),
        },
      };
      expect(cookie.data).toEqual(cookie.__data);
    });
    it('should remove expired cookies from the current __data object for root cookies', () => {
      cookie.__data.rootCookies['test'] = {
        value: 'test',
        expires: new Date(Date.now() - 1000000),
      };
      expect(cookie.data).toEqual(emptyData);
    });
    it('should remove expired cookies from the current __data object for by path cookies', () => {
      cookie.__data.byPath['test/path'] = {
        test: {
          value: 'test',
          expires: new Date(Date.now() - 1000000),
        },
      };
      expect(cookie.data).toEqual(emptyData);
    });
  });
  describe('__now method', () => {
    it('should return a Date object', () => {
      expect(cookie.__now()).toBeInstanceOf(Date);
    });
    it('should return a Date object offset by the __nowDiff value of cookie', () => {
      cookie.__nowDiff = 1000;
      Date.now = jest.fn(() => 0);
      expect(cookie.__now()).toEqual(new Date(1000));
    });
  });
  describe('setNow method', () => {
    it('should set the __nowDiff value to the difference between now and the passed in now', () => {
      Date.now = jest.fn(() => 0);
      cookie.setNow(new Date(1000));
      expect(cookie.__nowDiff).toEqual(1000);
    });
    it('should send a message with the NOW event', () => {
      return new Promise(resolve => {
        mediator.registerMessageHandler({
          nameSpace: cookie.nameSpace,
          event: cookie.events.NOW,
          callback: () => {
            resolve();
          },
        });
        cookie.setNow(new Date(1000));
      });
    });
    it('should send a message with the __nowDiff value', () => {
      Date.now = jest.fn(() => 0);
      return new Promise(resolve => {
        mediator.registerMessageHandler({
          nameSpace: cookie.nameSpace,
          event: cookie.events.NOW,
          callback: nowDiff => {
            expect(nowDiff).toEqual(1000);
            resolve();
          },
        });
        cookie.setNow(new Date(1000));
      });
    });
  });
  describe('__getCookies method', () => {
    it('should return an empty string when data is empty', () => {
      expect(cookie.__getCookies()).toEqual('');
    });
    it('should return a string with the root cookie values with only one root cookie', () => {
      cookie.__data.rootCookies['test'] = {
        value: 'test',
        expires: new Date(Date.now() - 1000000),
      };
      expect(cookie.__getCookies()).toEqual('test=test');
    });
    it('should return a string with the root cookie values with only root cookies', () => {
      cookie.__data.rootCookies['test1'] = {
        value: 'test',
        expires: new Date(Date.now() - 1000000),
      };
      cookie.__data.rootCookies['test2'] = {
        value: 'test',
        expires: new Date(Date.now() - 1000000),
      };
      expect(cookie.__getCookies()).toEqual('test1=test; test2=test');
    });
    it('should return a string with root cookie values overwritten by appropriate path specific cookies', () => {
      const path = '/test/this';
      history.replaceState({}, '', path);
      cookie.__data.rootCookies['test1'] = {
        value: 'test',
        expires: new Date(Date.now() - 1000000),
      };
      cookie.__data.rootCookies['test2'] = {
        value: 'test',
        expires: new Date(Date.now() - 1000000),
      };
      cookie.__data.byPath[path] = {
        test1: {
          value: 'testing!',
          expires: new Date(Date.now() - 1000000),
        },
      };
      expect(cookie.__getCookies()).toEqual('test1=testing!; test2=test');
    });
    it('should return a string with root cookie values not overwritten by inappropriate path specific cookies', () => {
      const path = '/test/this';
      history.replaceState({}, '', path);
      cookie.__data.rootCookies['test1'] = {
        value: 'test',
        expires: new Date(Date.now() - 1000000),
      };
      cookie.__data.rootCookies['test2'] = {
        value: 'test',
        expires: new Date(Date.now() - 1000000),
      };
      cookie.__data.byPath[path + '/that'] = {
        test1: {
          value: 'testing!',
          expires: new Date(Date.now() - 1000000),
        },
      };
      expect(cookie.__getCookies()).toEqual('test1=test; test2=test');
    });
  });
  describe('__setItem method', () => {
    it('should add an entry for a cookie with a session expiry by default', () => {
      cookie.__setItem('test=test');
      expect(cookie.__data).toEqual({
        rootCookies: {
          test: {
            value: 'test',
            expires: 'session',
          },
        },
        byPath: {},
      });
    });
    it('should add an entry for a cookie with a set expiry in the future', () => {
      const date = new Date();
      cookie.__setItem('test=test; expires=' + date.toISOString());
      expect(cookie.__data).toEqual({
        rootCookies: {
          test: {
            value: 'test',
            expires: date,
          },
        },
        byPath: {},
      });
    });
    it('should ignore expires for a cookie with a non valid date expiry', () => {
      cookie.__setItem('test=test; expires=notadate');
      expect(cookie.__data).toEqual({
        rootCookies: {
          test: {
            value: 'test',
            expires: 'session',
          },
        },
        byPath: {},
      });
    });
    it('should delete an entry for a cookie with a set expiry in the past', () => {
      const date = new Date(Date.now() - 100000);
      cookie.__data.rootCookies['test'] = {
        value: 'test',
        expires: 'session',
      };
      cookie.__setItem('test=test; expires=' + date.toISOString());
      expect(cookie.__data).toEqual(emptyData);
    });
    it('should add an entry for a cookie with a max-age', () => {
      Date.now = jest.fn(() => 0);
      cookie.__setItem('test=test; max-age=1000');
      expect(cookie.__data).toEqual({
        rootCookies: {
          test: {
            value: 'test',
            expires: new Date(1000),
          },
        },
        byPath: {},
      });
    });
    it('should ignore max-age for a cookie with a NaN max-age set', () => {
      Date.now = jest.fn(() => 0);
      cookie.__setItem('test=test; max-age=test');
      expect(cookie.__data).toEqual({
        rootCookies: {
          test: {
            value: 'test',
            expires: 'session',
          },
        },
        byPath: {},
      });
    });
    it('should delete an entry for a cookie with a max-age of 0', () => {
      cookie.__data.rootCookies['test'] = {
        value: 'test',
        expires: 'session',
      };
      cookie.__setItem('test=test; max-age=0');
      expect(cookie.__data).toEqual(emptyData);
    });
    it('should set an entry for a cookie with a path value', () => {
      cookie.__setItem('test=test; path=testPath');
      expect(cookie.__data).toEqual({
        rootCookies: {},
        byPath: {
          testPath: {
            test: {
              value: 'test',
              expires: 'session',
            },
          },
        },
      });
    });
    it('should call stateUpdated if valid cookie set', () => {
      cookie.stateUpdated = jest.fn();
      cookie.__setItem('test=test');
      expect(cookie.stateUpdated).toHaveBeenCalled();
    });
  });
  describe('__removeItem method', () => {
    it('should remove an item from the rootCookies', () => {
      cookie.__data.rootCookies['test'] = {
        value: 'test',
        expires: new Date(Date.now() + 1000000),
      };
      cookie.__removeItem('test');
      expect(cookie.__data).toEqual(emptyData);
    });
    it('should not remove an item from the rootCookies if a path is specified', () => {
      const testData = {
        value: 'test',
        expires: new Date(Date.now() + 1000000),
      };
      cookie.__data.rootCookies['test'] = testData;
      cookie.__removeItem('test', 'test/path');
      expect(cookie.__data.rootCookies).toEqual({ test: testData });
    });
    it('should remove an item from a subpath', () => {
      cookie.__data.byPath['test/path'] = {
        test: {
          value: 'test',
          expires: new Date(Date.now() + 1000000),
        },
      };
      cookie.__removeItem('test', 'test/path');
      expect(cookie.__data).toEqual(emptyData);
    });
    it('should not remove an item from a subpath if no path is specified', () => {
      const testData = {
        value: 'test',
        expires: new Date(Date.now() + 1000000),
      };
      cookie.__data.byPath['test/path'] = {
        test: testData,
      };
      cookie.__removeItem('test');
      expect(cookie.__data.byPath['test/path']).toEqual({ test: testData });
    });
    it('should call stateUpdated', () => {
      cookie.stateUpdated = jest.fn();
      cookie.__removeItem('test');
      expect(cookie.stateUpdated).toHaveBeenCalled();
    });
  });
});
