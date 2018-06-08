/* eslint-env mocha */
import Vue from 'kolibri.lib.vue';
import vueintl from 'vue-intl';
import sinon from 'sinon';
import Mediator from '../src/core-app/mediator';

if (!Object.prototype.hasOwnProperty.call(global, 'Intl')) {
  global.Intl = require('intl');
  require('intl/locale-data/jsonp/en.js');
}

Vue.use(vueintl, { defaultLocale: 'en-us' });

describe('Mediator', function() {
  let mediator, kolibriModule;
  const kolibriModuleName = 'test';
  beforeEach(function() {
    mediator = new Mediator();
  });
  afterEach(function() {
    mediator = undefined;
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
      _registerMultipleEvents = sinon.stub(mediator, '_registerMultipleEvents');
      _registerOneTimeEvents = sinon.stub(mediator, '_registerOneTimeEvents');
      emit = sinon.stub(mediator, 'emit');
      _executeCallbackBuffer = sinon.stub(mediator, '_executeCallbackBuffer');
    });
    afterEach(function() {
      mediator._kolibriModuleRegistry = {};
      _registerMultipleEvents.restore();
      _registerOneTimeEvents.restore();
      emit.restore();
      _executeCallbackBuffer.restore();
    });
    describe('called with valid input', function() {
      beforeEach(function() {
        kolibriModule = { name: 'test', ready: () => {} };
        mediator.registerKolibriModuleSync(kolibriModule);
      });
      it('should call the _registerMultipleEvents method', function() {
        expect(_registerMultipleEvents.called).toEqual(true);
      });
      it('should pass the kolibriModule to the _registerMultipleEvents method', function() {
        expect(_registerMultipleEvents.calledWith(kolibriModule)).toEqual(true);
      });
      it('should call the _registerOneTimeEvents method', function() {
        expect(_registerOneTimeEvents.called).toEqual(true);
      });
      it('should pass the kolibriModule to the _registerOneTimeEvents method', function() {
        expect(_registerOneTimeEvents.calledWith(kolibriModule)).toEqual(true);
      });
      it('should call the emit method', function() {
        expect(emit.called).toEqual(true);
      });
      it('should pass the kolibriModule to the emit method', function() {
        expect(emit.calledWith('kolibri_register', kolibriModule)).toEqual(true);
      });
      it('should call the _executeCallbackBuffer method', function() {
        expect(_executeCallbackBuffer.called).toEqual(true);
      });
      it('should call pass the kolibriModule to the _executeCallbackBuffer method', function() {
        expect(_executeCallbackBuffer.calledWith(kolibriModule)).toEqual(true);
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
        expect(_registerMultipleEvents.called).toEqual(true);
      });
      it('should pass the kolibriModule to the _registerMultipleEvents method', function() {
        expect(_registerMultipleEvents.calledWith(kolibriModule)).toEqual(true);
      });
      it('should call the _registerOneTimeEvents method', function() {
        expect(_registerOneTimeEvents.called).toEqual(true);
      });
      it('should pass the kolibriModule to the _registerOneTimeEvents method', function() {
        expect(_registerOneTimeEvents.calledWith(kolibriModule)).toEqual(true);
      });
      it('should not call the trigger method', function() {
        expect(!emit.called).toEqual(true);
      });
      it('should not call the _executeCallbackBuffer method', function() {
        expect(!_executeCallbackBuffer.called).toEqual(true);
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
      _registerRepeatedEventListener = sinon.stub(mediator, '_registerRepeatedEventListener');
    });
    afterEach(function() {
      _registerRepeatedEventListener.restore();
    });
    describe('called with valid but empty input', function() {
      beforeEach(function() {
        kolibriModule = {
          name: 'test',
        };
        mediator._registerMultipleEvents(kolibriModule);
      });
      it('should not call listener registration', function() {
        expect(!_registerRepeatedEventListener.called).toEqual(true);
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
        expect(_registerRepeatedEventListener.called).toEqual(true);
      });
      it('should pass event, kolibriModule, and method to listener registration', function() {
        sinon.assert.calledWith(_registerRepeatedEventListener, 'event', kolibriModule, 'method');
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
        expect(_registerRepeatedEventListener.called).toEqual(true);
      });
      it('should pass event, kolibriModule, and method to listener registration', function() {
        sinon.assert.calledWith(_registerRepeatedEventListener, 'event', kolibriModule, 'method');
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
      _registerOneTimeEventListener = sinon.stub(mediator, '_registerOneTimeEventListener');
    });
    afterEach(function() {
      _registerOneTimeEventListener.restore();
    });
    describe('called with valid but empty input', function() {
      beforeEach(function() {
        kolibriModule = {
          name: 'test',
        };
        mediator._registerOneTimeEvents(kolibriModule);
      });
      it('should not call listener registration', function() {
        expect(!_registerOneTimeEventListener.called).toEqual(true);
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
        expect(_registerOneTimeEventListener.called).toEqual(true);
      });
      it('should pass event, kolibriModule, and method to listener registration', function() {
        sinon.assert.calledWith(_registerOneTimeEventListener, 'event', kolibriModule, 'method');
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
        expect(_registerOneTimeEventListener.called).toEqual(true);
      });
      it('should pass event, kolibriModule, and method to listener registration', function() {
        sinon.assert.calledWith(_registerOneTimeEventListener, 'event', kolibriModule, 'method');
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
      stub = sinon.stub(mediator, '_registerEventListener');
      event = 'event';
      kolibriModule = { name: 'test' };
      method = 'method';
      mediator._registerRepeatedEventListener(event, kolibriModule, method);
    });
    afterEach(function() {
      stub.restore();
    });
    it('should call _registerEventListener method', function() {
      expect(stub.called).toEqual(true);
    });
    it('should pass three args to _registerEventListener method', function() {
      expect(stub.calledWith(event, kolibriModule, method)).toEqual(true);
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
      stub.restore();
    });
    it('should call _registerEventListener method', function() {
      stub = sinon.stub(mediator, '_registerEventListener');
      mediator._registerOneTimeEventListener(event, kolibriModule, method);
      expect(stub.called).toEqual(true);
    });
    it('should pass three args to _registerEventListener method', function() {
      stub = sinon.stub(mediator, '_registerEventListener');
      mediator._registerOneTimeEventListener(event, kolibriModule, method);
      expect(stub.calledWith(event, kolibriModule, method)).toEqual(true);
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
      spy = sinon.spy();
      event = 'event';
      kolibriModule = { name: 'test' };
      method = 'method';
      mediator._registerEventListener(event, kolibriModule, method, spy);
    });
    it('should put a callback  in the callback registry', function() {
      expect(mediator._callbackRegistry.test.event.method instanceof Function).toEqual(true);
    });
    it('should call listen method', function() {
      expect(spy.called).toEqual(true);
    });
    it('should pass at least one arg to listen method', function() {
      expect(spy.calledWith(event)).toEqual(true);
    });
  });
  describe('stopListening method', function() {
    let stub, event, method;
    beforeEach(function() {
      stub = sinon.stub(mediator._eventDispatcher, '$off');
      event = 'event';
      kolibriModule = { name: 'test' };
      method = 'method';
    });
    afterEach(function() {
      stub.restore();
    });
    describe('when no callback registered', function() {
      it('should not call stopListening when no callback registered', function() {
        mediator.stopListening(event, kolibriModule, method);
        expect(!stub.called).toEqual(true);
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
        expect(stub.called).toEqual(true);
      });
      it('should pass two args to $off method', function() {
        expect(stub.calledWith(event, callback)).toEqual(true);
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
      spy = sinon.spy();
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
      expect(spy.called).toEqual(true);
    });
    it('should pass the args to the callback ', function() {
      expect(spy.lastCall.args).toEqual(args);
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
      stub = sinon.stub(mediator._eventDispatcher, '$on');
      mediator.registerKolibriModuleAsync(kolibriModuleName, kolibriModuleUrls, events, once);
    });
    afterEach(function() {
      stub.restore();
    });
    it('should add create a callback buffer for the kolibriModule', function() {
      expect(typeof mediator._callbackBuffer[kolibriModuleName] !== 'undefined').toEqual(true);
    });
    it('should put two entries in the async callback registry', function() {
      expect(mediator._asyncCallbackRegistry[kolibriModuleName].length).toEqual(2);
    });
    it('should put a callback  in each entry in the async callback registry', function() {
      const registry = mediator._asyncCallbackRegistry;
      expect(registry[kolibriModuleName][0].callback instanceof Function).toEqual(true);
      expect(registry[kolibriModuleName][1].callback instanceof Function).toEqual(true);
    });
    it('should call $on twice', function() {
      expect(stub.calledTwice).toEqual(true);
    });
    it('should pass both events to $on', function() {
      expect(stub.calledWith('event')).toEqual(true);
      expect(stub.calledWith('once')).toEqual(true);
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
      stub = sinon.stub(mediator._eventDispatcher, '$off');
      mediator._clearAsyncCallbacks(kolibriModule);
    });
    afterEach(function() {
      stub.restore();
    });
    it('should clear the callbacks', function() {
      expect(typeof mediator._asyncCallbackRegistry[kolibriModule.name] === 'undefined').toEqual(
        true
      );
    });
    it('should call $off once', function() {
      expect(stub.calledOnce).toEqual(true);
    });
    it('should call $off with two args', function() {
      expect(stub.calledWith(event, callback)).toEqual(true);
    });
  });
  describe('emit method', function() {
    let stub;
    beforeEach(function() {
      stub = sinon.stub(mediator._eventDispatcher, '$emit');
    });
    afterEach(function() {
      mediator._eventDispatcher.$emit.restore();
    });
    it('should call the event dispatcher $emit', function() {
      mediator.emit();
      expect(stub.called).toEqual(true);
    });
    it('should proxy all arguments to the event dispatcher $emit', function() {
      const arg1 = 'this';
      const arg2 = 'that';
      const arg3 = ['four'];
      mediator.emit(arg1, arg2, arg3);
      expect(stub.alwaysCalledWith(arg1, arg2, arg3)).toEqual(true);
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
      spy = sinon.stub(Vue, 'registerMessages');
    });
    afterEach(function() {
      spy.restore();
    });
    it('should call Vue.registerMessages once', function() {
      mediator.registerLanguageAssets(moduleName, language, messageMap);
      expect(spy.calledOnce).toEqual(true);
    });
    it('should call Vue.registerMessages with arguments language and messageMap', function() {
      mediator.registerLanguageAssets(moduleName, language, messageMap);
      expect(spy.calledWithExactly(language, messageMap)).toEqual(true);
    });
  });
});
