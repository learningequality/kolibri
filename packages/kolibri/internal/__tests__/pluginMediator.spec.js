import Vue from 'vue';
import { currentLanguage } from '../../utils/i18n';
import mediatorFactory from '../pluginMediator';

if (!Object.prototype.hasOwnProperty.call(global, 'Intl')) {
  global.Intl = require('intl');
  require('intl/locale-data/jsonp/en.js');
}

describe('Mediator', function () {
  let mediator, kolibriModule, facade;
  beforeEach(function () {
    facade = {};
    mediator = mediatorFactory({ Vue, facade });
  });
  afterEach(function () {
    mediator = undefined;
    facade = undefined;
  });
  describe('kolibriModule registry', function () {
    it('should be empty', function () {
      expect(mediator._kolibriModuleRegistry).toEqual({});
    });
  });
  describe('callback registry', function () {
    it('should be empty', function () {
      expect(mediator._callbackRegistry).toEqual({});
    });
  });
  describe('event dispatcher', function () {
    it('should be a Vue object', function () {
      expect(mediator._eventDispatcher.$on).toBeInstanceOf(Function);
      expect(mediator._eventDispatcher.$emit).toBeInstanceOf(Function);
      expect(mediator._eventDispatcher.$once).toBeInstanceOf(Function);
      expect(mediator._eventDispatcher.$off).toBeInstanceOf(Function);
    });
  });
  describe('language asset registry', function () {
    it('should be empty', function () {
      expect(mediator._languageAssetRegistry).toEqual({});
    });
  });
  describe('registerKolibriModuleSync method', function () {
    let _registerMultipleEvents, _registerOneTimeEvents, emit;
    beforeEach(function () {
      _registerMultipleEvents = jest.spyOn(mediator, '_registerMultipleEvents');
      _registerOneTimeEvents = jest.spyOn(mediator, '_registerOneTimeEvents');
      emit = jest.spyOn(mediator, 'emit');
    });
    afterEach(function () {
      mediator._kolibriModuleRegistry = {};
      _registerMultipleEvents.mockRestore();
      _registerOneTimeEvents.mockRestore();
      emit.mockRestore();
    });
    describe('called with valid input', function () {
      let consoleMock;
      beforeAll(() => {
        consoleMock = jest.spyOn(console, 'info').mockImplementation();
      });
      afterAll(() => {
        consoleMock.mockRestore();
      });
      beforeEach(function () {
        kolibriModule = { name: 'test', ready: () => {} };
        mediator.registerKolibriModuleSync(kolibriModule);
      });
      it('should call the _registerMultipleEvents method', function () {
        expect(_registerMultipleEvents).toHaveBeenCalled();
      });
      it('should pass the kolibriModule to the _registerMultipleEvents method', function () {
        expect(_registerMultipleEvents).toHaveBeenCalledWith(kolibriModule);
      });
      it('should call the _registerOneTimeEvents method', function () {
        expect(_registerOneTimeEvents).toHaveBeenCalled();
      });
      it('should pass the kolibriModule to the _registerOneTimeEvents method', function () {
        expect(_registerOneTimeEvents).toHaveBeenCalledWith(kolibriModule);
      });
      it('should call the emit method', function () {
        expect(emit).toHaveBeenCalled();
      });
      it('should pass the kolibriModule to the emit method', function () {
        expect(emit).toHaveBeenCalledWith('kolibri_register', kolibriModule);
      });
      it('should put the kolibriModule into the kolibriModule registry', function () {
        expect(mediator._kolibriModuleRegistry[kolibriModule.name]).toEqual(kolibriModule);
      });
    });
    describe('called with invalid input', function () {
      beforeEach(function () {
        kolibriModule = undefined;
        try {
          mediator.registerKolibriModuleSync(kolibriModule);
        } catch (e) {} // eslint-disable-line no-empty
      });
      it('should raise an error', function () {
        function testCall() {
          mediator.registerKolibriModuleSync(kolibriModule);
        }
        expect(testCall).toThrow(TypeError);
      });
      it('should call the _registerMultipleEvents method', function () {
        expect(_registerMultipleEvents).toHaveBeenCalled();
      });
      it('should pass the kolibriModule to the _registerMultipleEvents method', function () {
        expect(_registerMultipleEvents).toHaveBeenCalledWith(kolibriModule);
      });
      // _registerOneTimeEvents is not being called
      xit('should call the _registerOneTimeEvents method', function () {
        expect(_registerOneTimeEvents).toHaveBeenCalled();
      });
      xit('should pass the kolibriModule to the _registerOneTimeEvents method', function () {
        expect(_registerOneTimeEvents).toHaveBeenCalledWith(kolibriModule);
      });
      it('should not call the trigger method', function () {
        expect(emit).not.toHaveBeenCalled();
      });
      it('should leave the kolibriModule registry empty', function () {
        expect(mediator._kolibriModuleRegistry).toEqual({});
      });
    });
  });
  describe('_registerEvents method', function () {
    it('should not throw a TypeError due to incorrect assignment of this when the eventListenerMethod is called', function () {
      function testCall() {
        mediator._registerEvents(
          {
            name: 'test',
            events: {
              event: 'method',
            },
          },
          'events',
          mediator._registerRepeatedEventListener,
        );
      }
      expect(testCall).not.toThrow();
    });
  });
  describe('_registerMultipleEvents method', function () {
    let _registerRepeatedEventListener;
    beforeEach(function () {
      _registerRepeatedEventListener = jest.spyOn(mediator, '_registerRepeatedEventListener');
    });
    afterEach(function () {
      _registerRepeatedEventListener.mockRestore();
    });
    describe('called with valid but empty input', function () {
      beforeEach(function () {
        kolibriModule = {
          name: 'test',
        };
        mediator._registerMultipleEvents(kolibriModule);
      });
      it('should not call listener registration', function () {
        expect(_registerRepeatedEventListener).not.toHaveBeenCalled();
      });
    });
    describe('called with valid input with event object', function () {
      beforeEach(function () {
        kolibriModule = {
          name: 'test',
          events: {
            event: 'method',
          },
        };
        mediator._registerMultipleEvents(kolibriModule);
      });
      afterEach(function () {
        kolibriModule = undefined;
      });
      it('should call listener registration', function () {
        expect(_registerRepeatedEventListener).toHaveBeenCalled();
      });
      it('should pass event, kolibriModule, and method to listener registration', function () {
        expect(_registerRepeatedEventListener).toHaveBeenCalledWith(
          'event',
          kolibriModule,
          'method',
        );
      });
    });
    describe('called with valid input with event ', function () {
      beforeEach(function () {
        kolibriModule = {
          name: 'test',
          events: () => ({ event: 'method' }),
        };
        mediator._registerMultipleEvents(kolibriModule);
      });
      afterEach(function () {
        kolibriModule = undefined;
      });
      it('should call listener registration', function () {
        expect(_registerRepeatedEventListener).toHaveBeenCalled();
      });
      it('should pass event, kolibriModule, and method to listener registration', function () {
        expect(_registerRepeatedEventListener).toHaveBeenCalledWith(
          'event',
          kolibriModule,
          'method',
        );
      });
    });
    describe('called with invalid input', function () {
      it('should throw a TypeError', function () {
        function testCall() {
          mediator._registerMultipleEvents(undefined);
        }
        expect(testCall).toThrow(TypeError);
      });
    });
  });
  describe('_registerOneTimeEvents method', function () {
    let _registerOneTimeEventListener;
    beforeEach(function () {
      _registerOneTimeEventListener = jest.spyOn(mediator, '_registerOneTimeEventListener');
    });
    afterEach(function () {
      _registerOneTimeEventListener.mockRestore();
    });
    describe('called with valid but empty input', function () {
      beforeEach(function () {
        kolibriModule = {
          name: 'test',
        };
        mediator._registerOneTimeEvents(kolibriModule);
      });
      it('should not call listener registration', function () {
        expect(_registerOneTimeEventListener).not.toHaveBeenCalled();
      });
    });
    describe('called with valid input with event object', function () {
      beforeEach(function () {
        kolibriModule = {
          name: 'test',
          once: () => ({ event: 'method' }),
        };
        mediator._registerOneTimeEvents(kolibriModule);
      });
      afterEach(function () {
        kolibriModule = undefined;
      });
      it('should call listener registration', function () {
        expect(_registerOneTimeEventListener).toHaveBeenCalled();
      });
      it('should pass event, kolibriModule, and method to listener registration', function () {
        expect(_registerOneTimeEventListener).toHaveBeenCalledWith(
          'event',
          kolibriModule,
          'method',
        );
      });
    });
    describe('called with valid input with event ', function () {
      beforeEach(function () {
        kolibriModule = {
          name: 'test',
          once: {
            event: 'method',
          },
        };
        mediator._registerOneTimeEvents(kolibriModule);
      });
      afterEach(function () {
        kolibriModule = undefined;
      });
      it('should call listener registration', function () {
        expect(_registerOneTimeEventListener).toHaveBeenCalled();
      });
      it('should pass event, kolibriModule, and method to listener registration', function () {
        expect(_registerOneTimeEventListener).toHaveBeenCalledWith(
          'event',
          kolibriModule,
          'method',
        );
      });
    });
    describe('called with invalid input', function () {
      it('should throw a TypeError', function () {
        function testCall() {
          mediator._registerOneTimeEvents(undefined);
        }
        expect(testCall).toThrow(TypeError);
      });
    });
  });
  describe('_registerRepeatedEventListener method', function () {
    let stub, event, method;
    beforeEach(function () {
      stub = jest.spyOn(mediator, '_registerEventListener');
      event = 'event';
      kolibriModule = { name: 'test' };
      method = 'method';
      mediator._registerRepeatedEventListener(event, kolibriModule, method);
    });
    afterEach(function () {
      stub.mockRestore();
    });
    it('should call _registerEventListener method', function () {
      expect(stub).toHaveBeenCalled();
    });
    it('should pass three args to _registerEventListener method', function () {
      expect(stub).toHaveBeenCalledWith(event, kolibriModule, method, expect.any(Function));
    });
  });
  describe('_registerOneTimeEventListener method', function () {
    let stub, event, method;
    beforeEach(function () {
      event = 'event';
      kolibriModule = { name: 'test' };
      method = 'method';
    });
    afterEach(function () {
      stub.mockRestore();
    });
    it('should call _registerEventListener method', function () {
      stub = jest.spyOn(mediator, '_registerEventListener');
      mediator._registerOneTimeEventListener(event, kolibriModule, method);
      expect(stub).toHaveBeenCalled();
    });
    it('should pass three args to _registerEventListener method', function () {
      stub = jest.spyOn(mediator, '_registerEventListener');
      mediator._registerOneTimeEventListener(event, kolibriModule, method);
      expect(stub).toHaveBeenCalledWith(event, kolibriModule, method, expect.any(Function));
    });
    it('should properly invoke the listenToOnce with this set to the Mediator event object', function () {
      function testCall() {
        mediator._registerOneTimeEventListener(event, kolibriModule, method);
      }
      expect(testCall).not.toThrow();
    });
  });
  describe('_registerEventListener method', function () {
    let spy, event, method;
    beforeEach(function () {
      spy = jest.fn();
      event = 'event';
      kolibriModule = { name: 'test' };
      method = 'method';
      mediator._registerEventListener(event, kolibriModule, method, spy);
    });
    it('should put a callback  in the callback registry', function () {
      expect(mediator._callbackRegistry.test.event.method).toBeInstanceOf(Function);
    });
    it('should call listen method', function () {
      expect(spy).toHaveBeenCalled();
    });
    it('should pass at least one arg to listen method', function () {
      expect(spy).toHaveBeenCalledWith(event, expect.any(Function));
    });
  });
  describe('stopListening method', function () {
    let stub, event, method;
    beforeEach(function () {
      stub = jest.spyOn(mediator._eventDispatcher, '$off');
      event = 'event';
      kolibriModule = { name: 'test' };
      method = 'method';
    });
    afterEach(function () {
      stub.mockRestore();
    });
    describe('when no callback registered', function () {
      it('should not call stopListening when no callback registered', function () {
        mediator.stopListening(event, kolibriModule, method);
        expect(stub).not.toHaveBeenCalled();
      });
    });
    describe('when callback is registered', function () {
      let callback;
      beforeEach(function () {
        callback = function () {};
        const obj = {};
        mediator._callbackRegistry[kolibriModule.name] = obj;
        obj[event] = {};
        obj[event][method] = callback;
        mediator.stopListening(event, kolibriModule, method);
      });
      it('should call $off', function () {
        expect(stub).toHaveBeenCalled();
      });
      it('should pass two args to $off method', function () {
        expect(stub).toHaveBeenCalledWith(event, callback);
      });
      it('should remove the callback from the registry', function () {
        const registry = mediator._callbackRegistry;
        const callback = registry[kolibriModule.name][event][method];
        expect(typeof callback === 'undefined').toEqual(true);
      });
    });
  });
  describe('emit method', function () {
    let stub;
    beforeEach(function () {
      stub = jest.spyOn(mediator._eventDispatcher, '$emit');
    });
    afterEach(function () {
      mediator._eventDispatcher.$emit.mockRestore();
    });
    it('should call the event dispatcher $emit', function () {
      mediator.emit('yo');
      expect(stub).toHaveBeenCalled();
    });
    it('should proxy all arguments to the event dispatcher $emit', function () {
      const arg1 = 'this';
      const arg2 = 'that';
      const arg3 = ['four'];
      mediator.emit(arg1, arg2, arg3);
      expect(stub).toHaveBeenCalledWith(arg1, arg2, arg3);
    });
  });
  describe('registerLanguageAssets method', function () {
    const moduleName = 'test';
    const messageMap = {
      test: 'test message',
    };
    let spy;
    beforeEach(function () {
      Vue.registerMessages = jest.fn();
      spy = Vue.registerMessages;
      document.body.innerHTML =
        '<template data-i18n="' + moduleName + '">' + JSON.stringify(messageMap) + '</template>';
    });
    afterEach(function () {
      spy.mockRestore();
    });
    it('should call Vue.registerMessages once', function () {
      mediator.registerLanguageAssets(moduleName);
      expect(spy).toHaveBeenCalledTimes(1);
    });
    it('should call Vue.registerMessages with arguments currentLanguage and messageMap', function () {
      mediator.registerLanguageAssets(moduleName);
      expect(spy).toHaveBeenCalledWith(currentLanguage, messageMap);
    });
  });
});
