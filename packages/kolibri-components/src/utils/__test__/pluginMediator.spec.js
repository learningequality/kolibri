import Vue from 'vue';
import mediatorFactory from '../pluginMediator';

if (!Object.prototype.hasOwnProperty.call(global, 'Intl')) {
  global.Intl = require('intl');
  require('intl/locale-data/jsonp/en.js');
}

describe('Mediator', function() {
  let mediator, kolibriModule, facade;
  const kolibriModuleName = 'test';
  beforeEach(function() {
    facade = {};
    mediator = mediatorFactory({ Vue, facade });
  });
  afterEach(function() {
    mediator = undefined;
    facade = undefined;
  });
  describe('kolibriModule registry', function() {
    it('should be empty', function() {
      expect(mediator._kolibriModuleRegistry).toEqual({});
    });
  });
  describe('callback buffer', function() {
    it('should be empty', function() {
      expect(mediator._callbackBuffer).toEqual({});
    });
  });
  describe('callback registry', function() {
    it('should be empty', function() {
      expect(mediator._callbackRegistry).toEqual({});
    });
  });
  describe('async callback registry', function() {
    it('should be empty', function() {
      expect(mediator._asyncCallbackRegistry).toEqual({});
    });
  });
  describe('event dispatcher', function() {
    it('should be a Vue object', function() {
      expect(mediator._eventDispatcher.$on).toBeInstanceOf(Function);
      expect(mediator._eventDispatcher.$emit).toBeInstanceOf(Function);
      expect(mediator._eventDispatcher.$once).toBeInstanceOf(Function);
      expect(mediator._eventDispatcher.$off).toBeInstanceOf(Function);
    });
  });
  describe('language asset registry', function() {
    it('should be empty', function() {
      expect(mediator._languageAssetRegistry).toEqual({});
    });
  });
  describe('registerKolibriModuleSync method', function() {
    let _registerMultipleEvents, _registerOneTimeEvents, emit, _executeCallbackBuffer;
    beforeEach(function() {
      _registerMultipleEvents = jest.spyOn(mediator, '_registerMultipleEvents');
      _registerOneTimeEvents = jest.spyOn(mediator, '_registerOneTimeEvents');
      emit = jest.spyOn(mediator, 'emit');
      _executeCallbackBuffer = jest.spyOn(mediator, '_executeCallbackBuffer');
    });
    afterEach(function() {
      mediator._kolibriModuleRegistry = {};
      _registerMultipleEvents.mockRestore();
      _registerOneTimeEvents.mockRestore();
      emit.mockRestore();
      _executeCallbackBuffer.mockRestore();
    });
    describe('called with valid input', function() {
      beforeEach(function() {
        kolibriModule = { name: 'test', ready: () => {} };
        mediator.registerKolibriModuleSync(kolibriModule);
      });
      it('should call the _registerMultipleEvents method', function() {
        expect(_registerMultipleEvents).toHaveBeenCalled();
      });
      it('should pass the kolibriModule to the _registerMultipleEvents method', function() {
        expect(_registerMultipleEvents).toHaveBeenCalledWith(kolibriModule);
      });
      it('should call the _registerOneTimeEvents method', function() {
        expect(_registerOneTimeEvents).toHaveBeenCalled();
      });
      it('should pass the kolibriModule to the _registerOneTimeEvents method', function() {
        expect(_registerOneTimeEvents).toHaveBeenCalledWith(kolibriModule);
      });
      it('should call the emit method', function() {
        expect(emit).toHaveBeenCalled();
      });
      it('should pass the kolibriModule to the emit method', function() {
        expect(emit).toHaveBeenCalledWith('kolibri_register', kolibriModule);
      });
      it('should call the _executeCallbackBuffer method', function() {
        expect(_executeCallbackBuffer).toHaveBeenCalled();
      });
      it('should call pass the kolibriModule to the _executeCallbackBuffer method', function() {
        expect(_executeCallbackBuffer).toHaveBeenCalledWith(kolibriModule);
      });
      it('should put the kolibriModule into the kolibriModule registry', function() {
        expect(mediator._kolibriModuleRegistry[kolibriModule.name]).toEqual(kolibriModule);
      });
    });
    describe('called with invalid input', function() {
      beforeEach(function() {
        kolibriModule = undefined;
        try {
          mediator.registerKolibriModuleSync(kolibriModule);
        } catch (e) {} // eslint-disable-line no-empty
      });
      it('should raise an error', function() {
        function testCall() {
          mediator.registerKolibriModuleSync(kolibriModule);
        }
        expect(testCall).toThrow(TypeError);
      });
      it('should call the _registerMultipleEvents method', function() {
        expect(_registerMultipleEvents).toHaveBeenCalled();
      });
      it('should pass the kolibriModule to the _registerMultipleEvents method', function() {
        expect(_registerMultipleEvents).toHaveBeenCalledWith(kolibriModule);
      });
      // _registerOneTimeEvents is not being called
      xit('should call the _registerOneTimeEvents method', function() {
        expect(_registerOneTimeEvents).toHaveBeenCalled();
      });
      xit('should pass the kolibriModule to the _registerOneTimeEvents method', function() {
        expect(_registerOneTimeEvents).toHaveBeenCalledWith(kolibriModule);
      });
      it('should not call the trigger method', function() {
        expect(emit).not.toHaveBeenCalled();
      });
      it('should not call the _executeCallbackBuffer method', function() {
        expect(_executeCallbackBuffer).not.toHaveBeenCalled();
      });
      it('should leave the kolibriModule registry empty', function() {
        expect(mediator._kolibriModuleRegistry).toEqual({});
      });
    });
  });
  describe('_registerEvents method', function() {
    it('should not throw a TypeError due to incorrect assignment of this when the eventListenerMethod is called', function() {
      function testCall() {
        mediator._registerEvents(
          {
            name: 'test',
            events: {
              event: 'method',
            },
          },
          'events',
          mediator._registerRepeatedEventListener
        );
      }
      expect(testCall).not.toThrow();
    });
  });
  describe('_registerMultipleEvents method', function() {
    let _registerRepeatedEventListener;
    beforeEach(function() {
      _registerRepeatedEventListener = jest.spyOn(mediator, '_registerRepeatedEventListener');
    });
    afterEach(function() {
      _registerRepeatedEventListener.mockRestore();
    });
    describe('called with valid but empty input', function() {
      beforeEach(function() {
        kolibriModule = {
          name: 'test',
        };
        mediator._registerMultipleEvents(kolibriModule);
      });
      it('should not call listener registration', function() {
        expect(_registerRepeatedEventListener).not.toHaveBeenCalled();
      });
    });
    describe('called with valid input with event object', function() {
      beforeEach(function() {
        kolibriModule = {
          name: 'test',
          events: {
            event: 'method',
          },
        };
        mediator._registerMultipleEvents(kolibriModule);
      });
      afterEach(function() {
        kolibriModule = undefined;
      });
      it('should call listener registration', function() {
        expect(_registerRepeatedEventListener).toHaveBeenCalled();
      });
      it('should pass event, kolibriModule, and method to listener registration', function() {
        expect(_registerRepeatedEventListener).toHaveBeenCalledWith(
          'event',
          kolibriModule,
          'method'
        );
      });
    });
    describe('called with valid input with event ', function() {
      beforeEach(function() {
        kolibriModule = {
          name: 'test',
          events: () => ({ event: 'method' }),
        };
        mediator._registerMultipleEvents(kolibriModule);
      });
      afterEach(function() {
        kolibriModule = undefined;
      });
      it('should call listener registration', function() {
        expect(_registerRepeatedEventListener).toHaveBeenCalled();
      });
      it('should pass event, kolibriModule, and method to listener registration', function() {
        expect(_registerRepeatedEventListener).toHaveBeenCalledWith(
          'event',
          kolibriModule,
          'method'
        );
      });
    });
    describe('called with invalid input', function() {
      it('should throw a TypeError', function() {
        function testCall() {
          mediator._registerMultipleEvents(undefined);
        }
        expect(testCall).toThrow(TypeError);
      });
    });
  });
  describe('_registerOneTimeEvents method', function() {
    let _registerOneTimeEventListener;
    beforeEach(function() {
      _registerOneTimeEventListener = jest.spyOn(mediator, '_registerOneTimeEventListener');
    });
    afterEach(function() {
      _registerOneTimeEventListener.mockRestore();
    });
    describe('called with valid but empty input', function() {
      beforeEach(function() {
        kolibriModule = {
          name: 'test',
        };
        mediator._registerOneTimeEvents(kolibriModule);
      });
      it('should not call listener registration', function() {
        expect(_registerOneTimeEventListener).not.toHaveBeenCalled();
      });
    });
    describe('called with valid input with event object', function() {
      beforeEach(function() {
        kolibriModule = {
          name: 'test',
          once: () => ({ event: 'method' }),
        };
        mediator._registerOneTimeEvents(kolibriModule);
      });
      afterEach(function() {
        kolibriModule = undefined;
      });
      it('should call listener registration', function() {
        expect(_registerOneTimeEventListener).toHaveBeenCalled();
      });
      it('should pass event, kolibriModule, and method to listener registration', function() {
        expect(_registerOneTimeEventListener).toHaveBeenCalledWith(
          'event',
          kolibriModule,
          'method'
        );
      });
    });
    describe('called with valid input with event ', function() {
      beforeEach(function() {
        kolibriModule = {
          name: 'test',
          once: {
            event: 'method',
          },
        };
        mediator._registerOneTimeEvents(kolibriModule);
      });
      afterEach(function() {
        kolibriModule = undefined;
      });
      it('should call listener registration', function() {
        expect(_registerOneTimeEventListener).toHaveBeenCalled();
      });
      it('should pass event, kolibriModule, and method to listener registration', function() {
        expect(_registerOneTimeEventListener).toHaveBeenCalledWith(
          'event',
          kolibriModule,
          'method'
        );
      });
    });
    describe('called with invalid input', function() {
      it('should throw a TypeError', function() {
        function testCall() {
          mediator._registerOneTimeEvents(undefined);
        }
        expect(testCall).toThrow(TypeError);
      });
    });
  });
  describe('_registerRepeatedEventListener method', function() {
    let stub, event, method;
    beforeEach(function() {
      stub = jest.spyOn(mediator, '_registerEventListener');
      event = 'event';
      kolibriModule = { name: 'test' };
      method = 'method';
      mediator._registerRepeatedEventListener(event, kolibriModule, method);
    });
    afterEach(function() {
      stub.mockRestore();
    });
    it('should call _registerEventListener method', function() {
      expect(stub).toHaveBeenCalled();
    });
    it('should pass three args to _registerEventListener method', function() {
      expect(stub).toHaveBeenCalledWith(event, kolibriModule, method, expect.any(Function));
    });
  });
  describe('_registerOneTimeEventListener method', function() {
    let stub, event, method;
    beforeEach(function() {
      event = 'event';
      kolibriModule = { name: 'test' };
      method = 'method';
    });
    afterEach(function() {
      stub.mockRestore();
    });
    it('should call _registerEventListener method', function() {
      stub = jest.spyOn(mediator, '_registerEventListener');
      mediator._registerOneTimeEventListener(event, kolibriModule, method);
      expect(stub).toHaveBeenCalled();
    });
    it('should pass three args to _registerEventListener method', function() {
      stub = jest.spyOn(mediator, '_registerEventListener');
      mediator._registerOneTimeEventListener(event, kolibriModule, method);
      expect(stub).toHaveBeenCalledWith(event, kolibriModule, method, expect.any(Function));
    });
    it('should properly invoke the listenToOnce with this set to the Mediator event object', function() {
      function testCall() {
        mediator._registerOneTimeEventListener(event, kolibriModule, method);
      }
      expect(testCall).not.toThrow();
    });
  });
  describe('_registerEventListener method', function() {
    let spy, event, method;
    beforeEach(function() {
      spy = jest.fn();
      event = 'event';
      kolibriModule = { name: 'test' };
      method = 'method';
      mediator._registerEventListener(event, kolibriModule, method, spy);
    });
    it('should put a callback  in the callback registry', function() {
      expect(mediator._callbackRegistry.test.event.method).toBeInstanceOf(Function);
    });
    it('should call listen method', function() {
      expect(spy).toHaveBeenCalled();
    });
    it('should pass at least one arg to listen method', function() {
      expect(spy).toHaveBeenCalledWith(event, expect.any(Function));
    });
  });
  describe('stopListening method', function() {
    let stub, event, method;
    beforeEach(function() {
      stub = jest.spyOn(mediator._eventDispatcher, '$off');
      event = 'event';
      kolibriModule = { name: 'test' };
      method = 'method';
    });
    afterEach(function() {
      stub.mockRestore();
    });
    describe('when no callback registered', function() {
      it('should not call stopListening when no callback registered', function() {
        mediator.stopListening(event, kolibriModule, method);
        expect(stub).not.toHaveBeenCalled();
      });
    });
    describe('when callback is registered', function() {
      let callback;
      beforeEach(function() {
        callback = function() {};
        const obj = {};
        mediator._callbackRegistry[kolibriModule.name] = obj;
        obj[event] = {};
        obj[event][method] = callback;
        mediator.stopListening(event, kolibriModule, method);
      });
      it('should call $off', function() {
        expect(stub).toHaveBeenCalled();
      });
      it('should pass two args to $off method', function() {
        expect(stub).toHaveBeenCalledWith(event, callback);
      });
      it('should remove the callback from the registry', function() {
        const registry = mediator._callbackRegistry;
        const callback = registry[kolibriModule.name][event][method];
        expect(typeof callback === 'undefined').toEqual(true);
      });
    });
  });
  describe('_executeCallbackBuffer method', function() {
    let spy, args;
    beforeEach(function() {
      spy = jest.fn();
      kolibriModule = {
        name: 'test',
        method: spy,
      };
      args = ['this', 'that'];
      mediator._callbackBuffer.test = [
        {
          method: 'method',
          args: args,
        },
      ];
      mediator._executeCallbackBuffer(kolibriModule);
    });
    it('should call the callback ', function() {
      expect(spy).toHaveBeenCalled();
    });
    it('should pass the args to the callback ', function() {
      expect(spy).toHaveBeenLastCalledWith(...args);
    });
    it('should remove the entry from callback registry', function() {
      expect(typeof mediator._callbackBuffer.test === 'undefined').toEqual(true);
    });
  });
  describe('registerKolibriModuleAsync method', function() {
    let stub;
    beforeEach(function() {
      const kolibriModuleUrls = ['test.js', 'test1.js'];
      const events = {
        event: 'method',
      };
      const once = {
        once: 'once_method',
      };
      stub = jest.spyOn(mediator._eventDispatcher, '$on');
      mediator.registerKolibriModuleAsync(kolibriModuleName, kolibriModuleUrls, events, once);
    });
    afterEach(function() {
      stub.mockRestore();
    });
    it('should add create a callback buffer for the kolibriModule', function() {
      expect(typeof mediator._callbackBuffer[kolibriModuleName] !== 'undefined').toEqual(true);
    });
    it('should put two entries in the async callback registry', function() {
      expect(mediator._asyncCallbackRegistry[kolibriModuleName].length).toEqual(2);
    });
    it('should put a callback  in each entry in the async callback registry', function() {
      const registry = mediator._asyncCallbackRegistry;
      expect(registry[kolibriModuleName][0].callback).toBeInstanceOf(Function);
      expect(registry[kolibriModuleName][1].callback).toBeInstanceOf(Function);
    });
    it('should call $on twice', function() {
      expect(stub).toHaveBeenCalledTimes(2);
    });
    it('should pass both events to $on', function() {
      expect(stub).toHaveBeenCalledWith('event', expect.any(Function));
      expect(stub).toHaveBeenCalledWith('once', expect.any(Function));
    });
    describe('async callbacks', function() {
      let args;
      beforeEach(function() {
        args = ['this', 'that'];
        mediator._asyncCallbackRegistry[kolibriModuleName][0].callback(...args);
      });
      it('should add an entry to the callback buffer when called', function() {
        expect(mediator._callbackBuffer[kolibriModuleName].length).toEqual(1);
      });
      it('should add args in the callback buffer when called', function() {
        expect(mediator._callbackBuffer[kolibriModuleName][0].args).toEqual(args);
      });
    });
  });
  describe('_clearAsyncCallbacks method', function() {
    let event, stub, callback;
    beforeEach(function() {
      kolibriModule = {
        name: 'test',
      };
      event = 'event';
      callback = function() {};
      mediator._asyncCallbackRegistry[kolibriModule.name] = [
        {
          event: event,
          callback: callback,
        },
      ];
      stub = jest.spyOn(mediator._eventDispatcher, '$off');
      mediator._clearAsyncCallbacks(kolibriModule);
    });
    afterEach(function() {
      stub.mockRestore();
    });
    it('should clear the callbacks', function() {
      expect(typeof mediator._asyncCallbackRegistry[kolibriModule.name] === 'undefined').toEqual(
        true
      );
    });
    it('should call $off once', function() {
      expect(stub).toHaveBeenCalledTimes(1);
    });
    it('should call $off with two args', function() {
      expect(stub).toHaveBeenCalledWith(event, callback);
    });
  });
  describe('emit method', function() {
    let stub;
    beforeEach(function() {
      stub = jest.spyOn(mediator._eventDispatcher, '$emit');
    });
    afterEach(function() {
      mediator._eventDispatcher.$emit.mockRestore();
    });
    it('should call the event dispatcher $emit', function() {
      mediator.emit('yo');
      expect(stub).toHaveBeenCalled();
    });
    it('should proxy all arguments to the event dispatcher $emit', function() {
      const arg1 = 'this';
      const arg2 = 'that';
      const arg3 = ['four'];
      mediator.emit(arg1, arg2, arg3);
      expect(stub).toHaveBeenCalledWith(arg1, arg2, arg3);
    });
  });
  describe('registerLanguageAssets method', function() {
    const moduleName = 'test';
    const language = 'test_lang';
    const messageMap = {
      test: 'test message',
    };
    let spy;
    beforeEach(function() {
      spy = jest.spyOn(Vue, 'registerMessages');
    });
    afterEach(function() {
      spy.mockRestore();
    });
    it('should call Vue.registerMessages once', function() {
      mediator.registerLanguageAssets(moduleName, language, messageMap);
      expect(spy).toHaveBeenCalledTimes(1);
    });
    it('should call Vue.registerMessages with arguments language and messageMap', function() {
      mediator.registerLanguageAssets(moduleName, language, messageMap);
      expect(spy).toHaveBeenCalledWith(language, messageMap);
    });
  });
});
