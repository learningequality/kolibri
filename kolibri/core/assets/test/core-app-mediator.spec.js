/* eslint-env mocha */
import { expect } from 'chai';
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
  beforeEach(function() {
    this.mediator = new Mediator();
  });
  afterEach(function() {
    delete this.mediator;
  });
  describe('kolibriModule registry', function() {
    it('should be empty', function() {
      expect(this.mediator._kolibriModuleRegistry).to.deep.equal({});
    });
  });
  describe('callback buffer', function() {
    it('should be empty', function() {
      expect(this.mediator._callbackBuffer).to.deep.equal({});
    });
  });
  describe('callback registry', function() {
    it('should be empty', function() {
      expect(this.mediator._callbackRegistry).to.deep.equal({});
    });
  });
  describe('async callback registry', function() {
    it('should be empty', function() {
      expect(this.mediator._asyncCallbackRegistry).to.deep.equal({});
    });
  });
  describe('event dispatcher', function() {
    it('should be a Vue object', function() {
      expect(this.mediator._eventDispatcher.$on).to.be.instanceOf(Function);
      expect(this.mediator._eventDispatcher.$emit).to.be.instanceOf(Function);
      expect(this.mediator._eventDispatcher.$once).to.be.instanceOf(Function);
      expect(this.mediator._eventDispatcher.$off).to.be.instanceOf(Function);
    });
  });
  describe('language asset registry', function() {
    it('should be empty', function() {
      expect(this.mediator._languageAssetRegistry).to.deep.equal({});
    });
  });
  describe('registerKolibriModuleSync method', function() {
    beforeEach(function() {
      this._registerMultipleEvents = sinon.stub(this.mediator, '_registerMultipleEvents');
      this._registerOneTimeEvents = sinon.stub(this.mediator, '_registerOneTimeEvents');
      this.emit = sinon.stub(this.mediator, 'emit');
      this._executeCallbackBuffer = sinon.stub(this.mediator, '_executeCallbackBuffer');
    });
    afterEach(function() {
      this.mediator._kolibriModuleRegistry = {};
      this._registerMultipleEvents.restore();
      this._registerOneTimeEvents.restore();
      this.emit.restore();
      this._executeCallbackBuffer.restore();
    });
    describe('called with valid input', function() {
      beforeEach(function() {
        this.kolibriModule = { name: 'test', ready: () => {} };
        this.mediator.registerKolibriModuleSync(this.kolibriModule);
      });
      it('should call the _registerMultipleEvents method', function() {
        expect(this._registerMultipleEvents.called).to.be.true;
      });
      it('should pass the kolibriModule to the _registerMultipleEvents method', function() {
        expect(this._registerMultipleEvents.calledWith(this.kolibriModule)).to.be.true;
      });
      it('should call the _registerOneTimeEvents method', function() {
        expect(this._registerOneTimeEvents.called).to.be.true;
      });
      it('should pass the kolibriModule to the _registerOneTimeEvents method', function() {
        expect(this._registerOneTimeEvents.calledWith(this.kolibriModule)).to.be.true;
      });
      it('should call the emit method', function() {
        expect(this.emit.called).to.be.true;
      });
      it('should pass the kolibriModule to the emit method', function() {
        expect(this.emit.calledWith('kolibri_register', this.kolibriModule)).to.be.true;
      });
      it('should call the _executeCallbackBuffer method', function() {
        expect(this._executeCallbackBuffer.called).to.be.true;
      });
      it('should call pass the kolibriModule to the _executeCallbackBuffer method', function() {
        expect(this._executeCallbackBuffer.calledWith(this.kolibriModule)).to.be.true;
      });
      it('should put the kolibriModule into the kolibriModule registry', function() {
        expect(this.mediator._kolibriModuleRegistry[this.kolibriModule.name]).to.deep.equal(
          this.kolibriModule
        );
      });
    });
    describe('called with invalid input', function() {
      beforeEach(function() {
        this.kolibriModule = undefined;
        try {
          this.mediator.registerKolibriModuleSync(this.kolibriModule);
        } catch (e) {} // eslint-disable-line no-empty
      });
      it('should raise an error', function() {
        function testCall() {
          this.mediator.registerKolibriModuleSync(this.kolibriModule);
        }
        expect(testCall).to.throw(TypeError);
      });
      it('should call the _registerMultipleEvents method', function() {
        expect(this._registerMultipleEvents.called).to.be.true;
      });
      it('should pass the kolibriModule to the _registerMultipleEvents method', function() {
        expect(this._registerMultipleEvents.calledWith(this.kolibriModule)).to.be.true;
      });
      it('should call the _registerOneTimeEvents method', function() {
        expect(this._registerOneTimeEvents.called).to.be.true;
      });
      it('should pass the kolibriModule to the _registerOneTimeEvents method', function() {
        expect(this._registerOneTimeEvents.calledWith(this.kolibriModule)).to.be.true;
      });
      it('should not call the trigger method', function() {
        expect(!this.emit.called).to.be.true;
      });
      it('should not call the _executeCallbackBuffer method', function() {
        expect(!this._executeCallbackBuffer.called).to.be.true;
      });
      it('should leave the kolibriModule registry empty', function() {
        expect(this.mediator._kolibriModuleRegistry).to.deep.equal({});
      });
    });
  });
  describe('_registerEvents method', function() {
    it('should not throw a TypeError due to incorrect assignment of this when the eventListenerMethod is called', function() {
      const self = this;
      function testCall() {
        self.mediator._registerEvents(
          {
            name: 'test',
            events: {
              event: 'method',
            },
          },
          'events',
          self.mediator._registerRepeatedEventListener
        );
      }
      expect(testCall).to.not.throw();
    });
  });
  describe('_registerMultipleEvents method', function() {
    beforeEach(function() {
      this._registerRepeatedEventListener = sinon.stub(
        this.mediator,
        '_registerRepeatedEventListener'
      );
    });
    afterEach(function() {
      this._registerRepeatedEventListener.restore();
    });
    describe('called with valid but empty input', function() {
      beforeEach(function() {
        this.kolibriModule = {
          name: 'test',
        };
        this.mediator._registerMultipleEvents(this.kolibriModule);
      });
      it('should not call listener registration', function() {
        expect(!this._registerRepeatedEventListener.called).to.be.true;
      });
    });
    describe('called with valid input with event object', function() {
      beforeEach(function() {
        this.kolibriModule = {
          name: 'test',
          events: {
            event: 'method',
          },
        };
        this.mediator._registerMultipleEvents(this.kolibriModule);
      });
      afterEach(function() {
        delete this.kolibriModule;
      });
      it('should call listener registration', function() {
        expect(this._registerRepeatedEventListener.called).to.be.true;
      });
      it('should pass event, kolibriModule, and method to listener registration', function() {
        sinon.assert.calledWith(
          this._registerRepeatedEventListener,
          'event',
          this.kolibriModule,
          'method'
        );
      });
    });
    describe('called with valid input with event ', function() {
      beforeEach(function() {
        this.kolibriModule = {
          name: 'test',
          events: () => ({ event: 'method' }),
        };
        this.mediator._registerMultipleEvents(this.kolibriModule);
      });
      afterEach(function() {
        delete this.kolibriModule;
      });
      it('should call listener registration', function() {
        expect(this._registerRepeatedEventListener.called).to.be.true;
      });
      it('should pass event, kolibriModule, and method to listener registration', function() {
        sinon.assert.calledWith(
          this._registerRepeatedEventListener,
          'event',
          this.kolibriModule,
          'method'
        );
      });
    });
    describe('called with invalid input', function() {
      it('should throw a TypeError', function() {
        function testCall() {
          this.mediator._registerMultipleEvents(undefined);
        }
        expect(testCall).to.throw(TypeError);
      });
    });
  });
  describe('_registerOneTimeEvents method', function() {
    beforeEach(function() {
      this._registerOneTimeEventListener = sinon.stub(
        this.mediator,
        '_registerOneTimeEventListener'
      );
    });
    afterEach(function() {
      this._registerOneTimeEventListener.restore();
    });
    describe('called with valid but empty input', function() {
      beforeEach(function() {
        this.kolibriModule = {
          name: 'test',
        };
        this.mediator._registerOneTimeEvents(this.kolibriModule);
      });
      it('should not call listener registration', function() {
        expect(!this._registerOneTimeEventListener.called).to.be.true;
      });
    });
    describe('called with valid input with event object', function() {
      beforeEach(function() {
        this.kolibriModule = {
          name: 'test',
          once: () => ({ event: 'method' }),
        };
        this.mediator._registerOneTimeEvents(this.kolibriModule);
      });
      afterEach(function() {
        delete this.kolibriModule;
      });
      it('should call listener registration', function() {
        expect(this._registerOneTimeEventListener.called).to.be.true;
      });
      it('should pass event, kolibriModule, and method to listener registration', function() {
        sinon.assert.calledWith(
          this._registerOneTimeEventListener,
          'event',
          this.kolibriModule,
          'method'
        );
      });
    });
    describe('called with valid input with event ', function() {
      beforeEach(function() {
        this.kolibriModule = {
          name: 'test',
          once: {
            event: 'method',
          },
        };
        this.mediator._registerOneTimeEvents(this.kolibriModule);
      });
      afterEach(function() {
        delete this.kolibriModule;
      });
      it('should call listener registration', function() {
        expect(this._registerOneTimeEventListener.called).to.be.true;
      });
      it('should pass event, kolibriModule, and method to listener registration', function() {
        sinon.assert.calledWith(
          this._registerOneTimeEventListener,
          'event',
          this.kolibriModule,
          'method'
        );
      });
    });
    describe('called with invalid input', function() {
      it('should throw a TypeError', function() {
        function testCall() {
          this.mediator._registerOneTimeEvents(undefined);
        }
        expect(testCall).to.throw(TypeError);
      });
    });
  });
  describe('_registerRepeatedEventListener method', function() {
    beforeEach(function() {
      this.stub = sinon.stub(this.mediator, '_registerEventListener');
      this.event = 'event';
      this.kolibriModule = { name: 'test' };
      this.method = 'method';
      this.mediator._registerRepeatedEventListener(this.event, this.kolibriModule, this.method);
    });
    afterEach(function() {
      this.stub.restore();
    });
    it('should call _registerEventListener method', function() {
      expect(this.stub.called).to.be.true;
    });
    it('should pass three args to _registerEventListener method', function() {
      expect(this.stub.calledWith(this.event, this.kolibriModule, this.method)).to.be.true;
    });
  });
  describe('_registerOneTimeEventListener method', function() {
    beforeEach(function() {
      this.event = 'event';
      this.kolibriModule = { name: 'test' };
      this.method = 'method';
    });
    afterEach(function() {
      this.stub.restore();
    });
    it('should call _registerEventListener method', function() {
      this.stub = sinon.stub(this.mediator, '_registerEventListener');
      this.mediator._registerOneTimeEventListener(this.event, this.kolibriModule, this.method);
      expect(this.stub.called).to.be.true;
    });
    it('should pass three args to _registerEventListener method', function() {
      this.stub = sinon.stub(this.mediator, '_registerEventListener');
      this.mediator._registerOneTimeEventListener(this.event, this.kolibriModule, this.method);
      expect(this.stub.calledWith(this.event, this.kolibriModule, this.method)).to.be.true;
    });
    it('should properly invoke the listenToOnce with this set to the Mediator event object', function() {
      const self = this;
      function testCall() {
        self.mediator._registerOneTimeEventListener(self.event, self.kolibriModule, self.method);
      }
      expect(testCall).not.to.throw();
    });
  });
  describe('_registerEventListener method', function() {
    beforeEach(function() {
      this.spy = sinon.spy();
      this.event = 'event';
      this.kolibriModule = { name: 'test' };
      this.method = 'method';
      this.mediator._registerEventListener(this.event, this.kolibriModule, this.method, this.spy);
    });
    it('should put a callback  in the callback registry', function() {
      expect(this.mediator._callbackRegistry.test.event.method instanceof Function).to.be.true;
    });
    it('should call listen method', function() {
      expect(this.spy.called).to.be.true;
    });
    it('should pass at least one arg to listen method', function() {
      expect(this.spy.calledWith(this.event)).to.be.true;
    });
  });
  describe('stopListening method', function() {
    beforeEach(function() {
      this.stub = sinon.stub(this.mediator._eventDispatcher, '$off');
      this.event = 'event';
      this.kolibriModule = { name: 'test' };
      this.method = 'method';
    });
    afterEach(function() {
      this.stub.restore();
    });
    describe('when no callback registered', function() {
      it('should not call stopListening when no callback registered', function() {
        this.mediator.stopListening(this.event, this.kolibriModule, this.method);
        expect(!this.stub.called).to.be.true;
      });
    });
    describe('when callback is registered', function() {
      beforeEach(function() {
        this.callback = function() {};
        const obj = {};
        this.mediator._callbackRegistry[this.kolibriModule.name] = obj;
        obj[this.event] = {};
        obj[this.event][this.method] = this.callback;
        this.mediator.stopListening(this.event, this.kolibriModule, this.method);
      });
      it('should call $off', function() {
        expect(this.stub.called).to.be.true;
      });
      it('should pass two args to $off method', function() {
        expect(this.stub.calledWith(this.event, this.callback)).to.be.true;
      });
      it('should remove the callback from the registry', function() {
        const registry = this.mediator._callbackRegistry;
        const callback = registry[this.kolibriModule.name][this.event][this.method];
        expect(typeof callback === 'undefined').to.be.true;
      });
    });
  });
  describe('_executeCallbackBuffer method', function() {
    beforeEach(function() {
      this.spy = sinon.spy();
      this.kolibriModule = {
        name: 'test',
        method: this.spy,
      };
      this.args = ['this', 'that'];
      this.mediator._callbackBuffer.test = [
        {
          method: 'method',
          args: this.args,
        },
      ];
      this.mediator._executeCallbackBuffer(this.kolibriModule);
    });
    it('should call the callback ', function() {
      expect(this.spy.called).to.be.true;
    });
    it('should pass the args to the callback ', function() {
      expect(this.spy.lastCall.args).to.deep.equal(this.args);
    });
    it('should remove the entry from callback registry', function() {
      expect(typeof this.mediator._callbackBuffer.test === 'undefined').to.be.true;
    });
  });
  describe('registerKolibriModuleAsync method', function() {
    beforeEach(function() {
      this.kolibriModuleName = 'test';
      this.kolibriModuleUrls = ['test.js', 'test1.js'];
      this.events = {
        event: 'method',
      };
      this.once = {
        once: 'once_method',
      };
      this.stub = sinon.stub(this.mediator._eventDispatcher, '$on');
      this.mediator.registerKolibriModuleAsync(
        this.kolibriModuleName,
        this.kolibriModuleUrls,
        this.events,
        this.once
      );
    });
    afterEach(function() {
      this.stub.restore();
    });
    it('should add create a callback buffer for the kolibriModule', function() {
      expect(typeof this.mediator._callbackBuffer[this.kolibriModuleName] !== 'undefined').to.be
        .true;
    });
    it('should put two entries in the async callback registry', function() {
      expect(this.mediator._asyncCallbackRegistry[this.kolibriModuleName].length).to.equal(2);
    });
    it('should put a callback  in each entry in the async callback registry', function() {
      const registry = this.mediator._asyncCallbackRegistry;
      expect(registry[this.kolibriModuleName][0].callback instanceof Function).to.be.true;
      expect(registry[this.kolibriModuleName][1].callback instanceof Function).to.be.true;
    });
    it('should call $on twice', function() {
      expect(this.stub.calledTwice).to.be.true;
    });
    it('should pass both events to $on', function() {
      expect(this.stub.calledWith('event')).to.be.true;
      expect(this.stub.calledWith('once')).to.be.true;
    });
    describe('async callbacks', function() {
      beforeEach(function() {
        this.args = ['this', 'that'];
        this.mediator._asyncCallbackRegistry[this.kolibriModuleName][0].callback(this.args);
      });
      it('should add an entry to the callback buffer when called', function() {
        expect(this.mediator._callbackBuffer[this.kolibriModuleName].length).to.equal(1);
      });
      it('should add args in the callback buffer when called', function() {
        expect(this.mediator._callbackBuffer[this.kolibriModuleName].args).to.deep.equal(this.arg);
      });
    });
  });
  describe('_clearAsyncCallbacks method', function() {
    beforeEach(function() {
      this.kolibriModule = {
        name: 'test',
      };
      this.event = 'event';
      this.callback = function() {};
      this.mediator._asyncCallbackRegistry[this.kolibriModule.name] = [
        {
          event: this.event,
          callback: this.callback,
        },
      ];
      this.stub = sinon.stub(this.mediator._eventDispatcher, '$off');
      this.mediator._clearAsyncCallbacks(this.kolibriModule);
    });
    afterEach(function() {
      this.stub.restore();
    });
    it('should clear the callbacks', function() {
      expect(typeof this.mediator._asyncCallbackRegistry[this.kolibriModule.name] === 'undefined')
        .to.be.true;
    });
    it('should call $off once', function() {
      expect(this.stub.calledOnce).to.be.true;
    });
    it('should call $off with two args', function() {
      expect(this.stub.calledWith(this.event, this.callback)).to.be.true;
    });
  });
  describe('emit method', function() {
    beforeEach(function() {
      this.stub = sinon.stub(this.mediator._eventDispatcher, '$emit');
    });
    afterEach(function() {
      this.mediator._eventDispatcher.$emit.restore();
    });
    it('should call the event dispatcher $emit', function() {
      this.mediator.emit();
      expect(this.stub.called).to.be.true;
    });
    it('should proxy all arguments to the event dispatcher $emit', function() {
      const arg1 = 'this';
      const arg2 = 'that';
      const arg3 = ['four'];
      this.mediator.emit(arg1, arg2, arg3);
      expect(this.stub.alwaysCalledWith(arg1, arg2, arg3)).to.be.true;
    });
  });
  describe('registerLanguageAssets method', function() {
    const moduleName = 'test';
    const language = 'test_lang';
    const messageMap = {
      test: 'test message',
    };
    beforeEach(function() {
      this.spy = sinon.stub(Vue, 'registerMessages');
    });
    afterEach(function() {
      this.spy.restore();
    });
    it('should call Vue.registerMessages once', function() {
      this.mediator.registerLanguageAssets(moduleName, language, messageMap);
      expect(this.spy.calledOnce).to.be.true;
    });
    it('should call Vue.registerMessages with arguments language and messageMap', function() {
      this.mediator.registerLanguageAssets(moduleName, language, messageMap);
      expect(this.spy.calledWithExactly(language, messageMap)).to.be.true;
    });
  });
});
