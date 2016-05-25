/* global define, it, describe, beforeEach, afterEach */

'use strict';

const assert = require('assert');
const sinon = require('sinon');
const rewire = require('rewire');

const Mediator = rewire('../src/core_app_mediator.js');

describe('Mediator', () => {
  beforeEach(() => {
    this.mediator = new Mediator();
  });
  afterEach(() => {
    delete this.mediator;
  });
  describe('kolibriModule registry', () => {
    it('should be empty', () => {
      assert.deepEqual(this.mediator._kolibriModuleRegistry, {});
    });
  });
  describe('callback buffer', () => {
    it('should be empty', () => {
      assert.deepEqual(this.mediator._callbackBuffer, {});
    });
  });
  describe('callback registry', () => {
    it('should be empty', () => {
      assert.deepEqual(this.mediator._callbackRegistry, {});
    });
  });
  describe('async callback registry', () => {
    it('should be empty', () => {
      assert.deepEqual(this.mediator._asyncCallbackRegistry, {});
    });
  });
  describe('event dispatcher', () => {
    it('should be a Vue object', () => {
      assert(this.mediator._eventDispatcher.$on instanceof Function);
      assert(this.mediator._eventDispatcher.$emit instanceof Function);
      assert(this.mediator._eventDispatcher.$once instanceof Function);
      assert(this.mediator._eventDispatcher.$off instanceof Function);
    });
  });
  describe('registerKolibriModuleSync method', () => {
    beforeEach(() => {
      this._registerMultipleEvents = sinon.stub(this.mediator, '_registerMultipleEvents');
      this._registerOneTimeEvents = sinon.stub(this.mediator, '_registerOneTimeEvents');
      this.emit = sinon.stub(this.mediator, 'emit');
      this._executeCallbackBuffer = sinon.stub(this.mediator, '_executeCallbackBuffer');
    });
    afterEach(() => {
      this.mediator._kolibriModuleRegistry = {};
      this._registerMultipleEvents.restore();
      this._registerOneTimeEvents.restore();
      this.emit.restore();
      this._executeCallbackBuffer.restore();
    });
    describe('called with valid input', () => {
      beforeEach(() => {
        this.kolibriModule = { name: 'test', ready: () => {} };
        this.mediator.registerKolibriModuleSync(this.kolibriModule);
      });
      it('should call the _registerMultipleEvents method', () => {
        assert(this._registerMultipleEvents.called);
      });
      it('should pass the kolibriModule to the _registerMultipleEvents method', () => {
        assert(this._registerMultipleEvents.calledWith(this.kolibriModule));
      });
      it('should call the _registerOneTimeEvents method', () => {
        assert(this._registerOneTimeEvents.called);
      });
      it('should pass the kolibriModule to the _registerOneTimeEvents method', () => {
        assert(this._registerOneTimeEvents.calledWith(this.kolibriModule));
      });
      it('should call the emit method', () => {
        assert(this.emit.called);
      });
      it('should pass the kolibriModule to the emit method', () => {
        assert(this.emit.calledWith('kolibri_register', this.kolibriModule));
      });
      it('should call the _executeCallbackBuffer method', () => {
        assert(this._executeCallbackBuffer.called);
      });
      it('should call pass the kolibriModule to the _executeCallbackBuffer method', () => {
        assert(this._executeCallbackBuffer.calledWith(this.kolibriModule));
      });
      it('should put the kolibriModule into the kolibriModule registry', () => {
        assert.deepEqual(
          this.mediator._kolibriModuleRegistry[this.kolibriModule.name], this.kolibriModule
        );
      });
    });
    describe('called with invalid input', () => {
      beforeEach(() => {
        this.kolibriModule = undefined;
        try {
          this.mediator.registerKolibriModuleSync(this.kolibriModule);
        } catch (e) {} // eslint-disable-line no-empty
      });
      it('should raise an error', () => {
        assert.throws(() => {
          this.mediator.registerKolibriModuleSync(this.kolibriModule);
        }, TypeError);
      });
      it('should call the _registerMultipleEvents method', () => {
        assert(this._registerMultipleEvents.called);
      });
      it('should pass the kolibriModule to the _registerMultipleEvents method', () => {
        assert(this._registerMultipleEvents.calledWith(this.kolibriModule));
      });
      it('should call the _registerOneTimeEvents method', () => {
        assert(this._registerOneTimeEvents.called);
      });
      it('should pass the kolibriModule to the _registerOneTimeEvents method', () => {
        assert(this._registerOneTimeEvents.calledWith(this.kolibriModule));
      });
      it('should not call the trigger method', () => {
        assert(!this.emit.called);
      });
      it('should not call the _executeCallbackBuffer method', () => {
        assert(!this._executeCallbackBuffer.called);
      });
      it('should leave the kolibriModule registry empty', () => {
        assert.deepEqual(this.mediator._kolibriModuleRegistry, {});
      });
    });
  });
  describe('_registerEvents method', () => {
    it('should not throw a TypeError due to incorrect assignment of this when the eventListenerMethod is called', () => { // eslint-disable-line max-len
      const self = this;
      assert.doesNotThrow(() => {
        self.mediator._registerEvents({
          name: 'test',
          events: {
            event: 'method',
          },
        }, 'events', self.mediator._registerRepeatedEventListener);
      }, TypeError);
    });
  });
  describe('_registerMultipleEvents method', () => {
    beforeEach(() => {
      this._registerRepeatedEventListener = sinon.stub(
        this.mediator, '_registerRepeatedEventListener'
      );
    });
    afterEach(() => {
      this._registerRepeatedEventListener.restore();
    });
    describe('called with valid but empty input', () => {
      beforeEach(() => {
        this.kolibriModule = {
          name: 'test',
        };
        this.mediator._registerMultipleEvents(this.kolibriModule);
      });
      it('should not call listener registration', () => {
        assert(!this._registerRepeatedEventListener.called);
      });
    });
    describe('called with valid input with event object', () => {
      beforeEach(() => {
        this.kolibriModule = {
          name: 'test',
          events: {
            event: 'method',
          },
        };
        this.mediator._registerMultipleEvents(this.kolibriModule);
      });
      afterEach(() => {
        delete this.kolibriModule;
      });
      it('should call listener registration', () => {
        assert(this._registerRepeatedEventListener.called);
      });
      it('should pass event, kolibriModule, and method to listener registration', () => {
        assert(
          this._registerRepeatedEventListener.calledWith('event', this.kolibriModule, 'method')
        );
      });
    });
    describe('called with valid input with event ', () => {
      beforeEach(() => {
        this.kolibriModule = {
          name: 'test',
          events: () => ({ event: 'method' }),
        };
        this.mediator._registerMultipleEvents(this.kolibriModule);
      });
      afterEach(() => {
        delete this.kolibriModule;
      });
      it('should call listener registration', () => {
        assert(this._registerRepeatedEventListener.called);
      });
      it('should pass event, kolibriModule, and method to listener registration', () => {
        assert(
          this._registerRepeatedEventListener.calledWith('event', this.kolibriModule, 'method')
        );
      });
    });
    describe('called with invalid input', () => {
      it('should throw a TypeError', () => {
        assert.throws(() => {this.mediator._registerMultipleEvents(undefined);}, TypeError);
      });
    });
  });
  describe(' _registerOneTimeEvents method', () => {
    beforeEach(() => {
      this._registerOneTimeEventListener = sinon.stub(
        this.mediator, '_registerOneTimeEventListener'
      );
    });
    afterEach(() => {
      this._registerOneTimeEventListener.restore();
    });
    describe('called with valid but empty input', () => {
      beforeEach(() => {
        this.kolibriModule = {
          name: 'test',
        };
        this.mediator._registerOneTimeEvents(this.kolibriModule);
      });
      it('should not call listener registration', () => {
        assert(!this._registerOneTimeEventListener.called);
      });
    });
    describe('called with valid input with event object', () => {
      beforeEach(() => {
        this.kolibriModule = {
          name: 'test',
          once: () => ({ event: 'method' }),
        };
        this.mediator._registerOneTimeEvents(this.kolibriModule);
      });
      afterEach(() => {
        delete this.kolibriModule;
      });
      it('should call listener registration', () => {
        assert(this._registerOneTimeEventListener.called);
      });
      it('should pass event, kolibriModule, and method to listener registration', () => {
        assert(
          this._registerOneTimeEventListener.calledWith('event', this.kolibriModule, 'method')
        );
      });
    });
    describe('called with valid input with event ', () => {
      beforeEach(() => {
        this.kolibriModule = {
          name: 'test',
          once: {
            event: 'method',
          },
        };
        this.mediator._registerOneTimeEvents(this.kolibriModule);
      });
      afterEach(() => {
        delete this.kolibriModule;
      });
      it('should call listener registration', () => {
        assert(this._registerOneTimeEventListener.called);
      });
      it('should pass event, kolibriModule, and method to listener registration', () => {
        assert(
          this._registerOneTimeEventListener.calledWith('event', this.kolibriModule, 'method')
        );
      });
    });
    describe('called with invalid input', () => {
      it('should throw a TypeError', () => {
        assert.throws(() => {this.mediator._registerOneTimeEvents(undefined);}, TypeError);
      });
    });
  });
  describe('_registerRepeatedEventListener method', () => {
    beforeEach(() => {
      this.stub = sinon.stub(this.mediator, '_registerEventListener');
      this.event = 'event';
      this.kolibriModule = { name: 'test' };
      this.method = 'method';
      this.mediator._registerRepeatedEventListener(this.event, this.kolibriModule, this.method);
    });
    afterEach(() => {
      this.stub.restore();
    });
    it('should call _registerEventListener method', () => {
      assert(this.stub.called);
    });
    it('should pass three args to _registerEventListener method', () => {
      assert(this.stub.calledWith(this.event, this.kolibriModule, this.method));
    });
  });
  describe('_registerOneTimeEventListener method', () => {
    beforeEach(() => {
      this.event = 'event';
      this.kolibriModule = { name: 'test' };
      this.method = 'method';
    });
    afterEach(() => {
      this.stub.restore();
    });
    it('should call _registerEventListener method', () => {
      this.stub = sinon.stub(this.mediator, '_registerEventListener');
      this.mediator._registerOneTimeEventListener(this.event, this.kolibriModule, this.method);
      assert(this.stub.called);
    });
    it('should pass three args to _registerEventListener method', () => {
      this.stub = sinon.stub(this.mediator, '_registerEventListener');
      this.mediator._registerOneTimeEventListener(this.event, this.kolibriModule, this.method);
      assert(this.stub.calledWith(this.event, this.kolibriModule, this.method));
    });
    it('should properly invoke the listenToOnce with this set to the Mediator event object', () => {
      const self = this;
      assert.doesNotThrow(() => {
        self.mediator._registerOneTimeEventListener(self.event, self.kolibriModule, self.method);
      });
    });
  });
  describe('_registerEventListener method', () => {
    beforeEach(() => {
      this.spy = sinon.spy();
      this.event = 'event';
      this.kolibriModule = { name: 'test' };
      this.method = 'method';
      this.mediator._registerEventListener(this.event, this.kolibriModule, this.method, this.spy);
    });
    it('should put a callback  in the callback registry', () => {
      assert(this.mediator._callbackRegistry.test.event.method instanceof Function);
    });
    it('should call listen method', () => {
      assert(this.spy.called);
    });
    it('should pass at least one arg to listen method', () => {
      assert(this.spy.calledWith(this.event));
    });
  });
  describe('stopListening method', () => {
    beforeEach(() => {
      this.stub = sinon.stub(this.mediator._eventDispatcher, '$off');
      this.event = 'event';
      this.kolibriModule = { name: 'test' };
      this.method = 'method';
    });
    afterEach(() => {
      this.stub.restore();
    });
    describe('when no callback registered', () => {
      it('should not call stopListening when no callback registered', () => {
        this.mediator.stopListening(this.event, this.kolibriModule, this.method);
        assert(!this.stub.called);
      });
    });
    describe('when callback is registered', () => {
      beforeEach(() => {
        this.callback = () => {};
        const obj = {};
        this.mediator._callbackRegistry[this.kolibriModule.name] = obj;
        obj[this.event] = {};
        obj[this.event][this.method] = this.callback;
        this.mediator.stopListening(this.event, this.kolibriModule, this.method);
      });
      it('should call $off', () => {
        assert(this.stub.called);
      });
      it('should pass two args to $off method', () => {
        assert(this.stub.calledWith(this.event, this.callback));
      });
      it('should remove the callback from the registry', () => {
        const registry = this.mediator._callbackRegistry;
        const callback = registry[this.kolibriModule.name][this.event][this.method];
        assert(typeof callback === 'undefined');
      });
    });
  });
  describe('_executeCallbackBuffer method', () => {
    beforeEach(() => {
      this.spy = sinon.spy();
      this.kolibriModule = {
        name: 'test',
        method: this.spy,
      };
      this.args = ['this', 'that'];
      this.mediator._callbackBuffer.test = [{
        method: 'method',
        args: this.args,
      }];
      this.mediator._executeCallbackBuffer(this.kolibriModule);
    });
    it('should call the callback ', () => {
      assert(this.spy.called);
    });
    it('should pass the args to the callback ', () => {
      assert.deepEqual(this.spy.lastCall.args, this.args);
    });
    it('should remove the entry from callback registry', () => {
      assert(typeof this.mediator._callbackBuffer.test === 'undefined');
    });
  });
  describe('registerKolibriModuleAsync method', () => {
    beforeEach(() => {
      this.kolibriModuleName = 'test';
      this.kolibriModuleUrls = ['test.js', 'test.css'];
      this.events = {
        event: 'method',
      };
      this.once = {
        once: 'once_method',
      };
      this.stub = sinon.stub(this.mediator._eventDispatcher, '$on');
      this.mediator.registerKolibriModuleAsync(
        this.kolibriModuleName, this.kolibriModuleUrls, this.events, this.once
      );
    });
    afterEach(() => {
      this.stub.restore();
    });
    it('should add create a callback buffer for the kolibriModule', () => {
      assert(typeof this.mediator._callbackBuffer[this.kolibriModuleName] !== 'undefined');
    });
    it('should put two entries in the async callback registry', () => {
      assert.equal(this.mediator._asyncCallbackRegistry[this.kolibriModuleName].length, 2);
    });
    it('should put a callback  in each entry in the async callback registry', () => {
      const registry = this.mediator._asyncCallbackRegistry;
      assert(registry[this.kolibriModuleName][0].callback instanceof Function);
      assert(registry[this.kolibriModuleName][1].callback instanceof Function);
    });
    it('should call $on twice', () => {
      assert(this.stub.calledTwice);
    });
    it('should pass both events to $on', () => {
      assert(this.stub.calledWith('event'));
      assert(this.stub.calledWith('once'));
    });
    describe('async callbacks', () => {
      beforeEach(() => {
        this.args = ['this', 'that'];
        this.mediator._asyncCallbackRegistry[this.kolibriModuleName][0].callback(this.args);
      });
      it('should add an entry to the callback buffer when called', () => {
        assert.equal(this.mediator._callbackBuffer[this.kolibriModuleName].length, 1);
      });
      it('should add args in the callback buffer when called', () => {
        assert.deepEqual(this.mediator._callbackBuffer[this.kolibriModuleName].args, this.arg);
      });
    });
    describe('async callbacks with error on script load', () => {
      beforeEach(() => {
        const self = this;
        this.args = ['this', 'that'];
        Mediator.__set__('assetLoader', (files, callback) => {
          callback('error!', self.kolibriModuleUrls);
        });
        this.spy = sinon.spy();
        Mediator.__set__('logging', { error: this.spy });
        this.mediator._asyncCallbackRegistry[this.kolibriModuleName][0].callback(this.args);
      });
      it('should call logging.error twice', () => {
        assert(this.spy.calledTwice);
      });
      it('should call logging.error with each of the args', () => {
        assert(this.spy.calledWith(`${this.kolibriModuleUrls[0]} failed to load`));
        assert(this.spy.calledWith(`${this.kolibriModuleUrls[1]} failed to load`));
      });
    });
  });
  describe('_clearAsyncCallbacks method', () => {
    beforeEach(() => {
      this.kolibriModule = {
        name: 'test',
      };
      this.event = 'event';
      this.callback = () => {};
      this.mediator._asyncCallbackRegistry[this.kolibriModule.name] = [{
        event: this.event,
        callback: this.callback,
      }];
      this.stub = sinon.stub(this.mediator._eventDispatcher, '$off');
      this.mediator._clearAsyncCallbacks(this.kolibriModule);
    });
    afterEach(() => {
      this.stub.restore();
    });
    it('should clear the callbacks', () => {
      assert(typeof this.mediator._asyncCallbackRegistry[this.kolibriModule.name] === 'undefined');
    });
    it('should call $off once', () => {
      assert(this.stub.calledOnce);
    });
    it('should call $off with two args', () => {
      assert(this.stub.calledWith(this.event, this.callback));
    });
  });
  describe('emit method', () => {
    beforeEach(() => {
      this.stub = sinon.stub(this.mediator._eventDispatcher, '$emit');
    });
    afterEach(() => {
      this.mediator._eventDispatcher.$emit.restore();
    });
    it('should call the event dispatcher $emit', () => {
      this.mediator.emit();
      assert(this.stub.called);
    });
    it('should proxy all arguments to the event dispatcher $emit', () => {
      const arg1 = 'this';
      const arg2 = 'that';
      const arg3 = ['four'];
      this.mediator.emit(arg1, arg2, arg3);
      assert(this.stub.alwaysCalledWith(arg1, arg2, arg3));
    });
  });
});
