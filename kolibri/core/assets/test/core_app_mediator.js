'use strict';

var assert = require('assert');
var sinon = require('sinon');
var rewire = require('rewire');

var Mediator = rewire('../src/core_app_mediator.js');

describe('Mediator', function() {
    beforeEach(function() {
        this.mediator = new Mediator();
    });
    afterEach(function() {
        delete this.mediator;
    });
    describe('kolibriModule registry', function() {
        it('should be empty', function () {
            assert.deepEqual(this.mediator._kolibriModuleRegistry, {});
        });
    });
    describe('callback buffer', function() {
        it('should be empty', function () {
            assert.deepEqual(this.mediator._callbackBuffer, {});
        });
    });
    describe('callback registry', function() {
        it('should be empty', function () {
            assert.deepEqual(this.mediator._callbackRegistry, {});
        });
    });
    describe('async callback registry', function() {
        it('should be empty', function () {
            assert.deepEqual(this.mediator._asyncCallbackRegistry, {});
        });
    });
    describe('event dispatcher', function() {
        it('should be a Vue object', function () {
          assert(this.mediator._eventDispatcher.$on instanceof Function);
          assert(this.mediator._eventDispatcher.$emit instanceof Function);
          assert(this.mediator._eventDispatcher.$once instanceof Function);
          assert(this.mediator._eventDispatcher.$off instanceof Function);
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
                this.kolibriModule = {name: 'test', 'ready': function(){}};
                this.mediator.registerKolibriModuleSync(this.kolibriModule);
            });
            it('should call the _registerMultipleEvents method', function() {
                assert(this._registerMultipleEvents.called);
            });
            it('should pass the kolibriModule to the _registerMultipleEvents method', function() {
                assert(this._registerMultipleEvents.calledWith(this.kolibriModule));
            });
            it('should call the _registerOneTimeEvents method', function() {
                assert(this._registerOneTimeEvents.called);
            });
            it('should pass the kolibriModule to the _registerOneTimeEvents method', function() {
                assert(this._registerOneTimeEvents.calledWith(this.kolibriModule));
            });
            it('should call the emit method', function() {
                assert(this.emit.called);
            });
            it('should pass the kolibriModule to the emit method', function() {
                assert(this.emit.calledWith('kolibri_register', this.kolibriModule));
            });
            it('should call the _executeCallbackBuffer method', function() {
                assert(this._executeCallbackBuffer.called);
            });
            it('should call pass the kolibriModule to the _executeCallbackBuffer method', function() {
                assert(this._executeCallbackBuffer.calledWith(this.kolibriModule));
            });
            it('should put the kolibriModule into the kolibriModule registry', function() {
                assert.deepEqual(this.mediator._kolibriModuleRegistry[this.kolibriModule.name], this.kolibriModule);
            });
        });
        describe('called with invalid input', function() {
            beforeEach(function() {
                this.kolibriModule = undefined;
                try {
                    this.mediator.registerKolibriModuleSync(this.kolibriModule);
                }
                catch (e) {}
            });
            it('should raise an error', function() {
                assert.throws(function() {this.mediator.registerKolibriModuleSync(this.kolibriModule);}, TypeError);
            });
            it('should call the _registerMultipleEvents method', function() {
                assert(this._registerMultipleEvents.called);
            });
            it('should pass the kolibriModule to the _registerMultipleEvents method', function() {
                assert(this._registerMultipleEvents.calledWith(this.kolibriModule));
            });
            it('should call the _registerOneTimeEvents method', function() {
                assert(this._registerOneTimeEvents.called);
            });
            it('should pass the kolibriModule to the _registerOneTimeEvents method', function() {
                assert(this._registerOneTimeEvents.calledWith(this.kolibriModule));
            });
            it('should not call the trigger method', function() {
                assert(!this.emit.called);
            });
            it('should not call the _executeCallbackBuffer method', function() {
                assert(!this._executeCallbackBuffer.called);
            });
            it('should leave the kolibriModule registry empty', function() {
                assert.deepEqual(this.mediator._kolibriModuleRegistry, {});
            });
        });
    });
    describe('_registerEvents method', function() {
        it('should not throw a TypeError due to incorrect assignment of this when the eventListenerMethod is called', function() {
            var self = this;
            assert.doesNotThrow(function () {
                self.mediator._registerEvents({
                    name: 'test',
                    events: {
                        event: 'method'
                    }
                }, 'events', self.mediator._registerRepeatedEventListener);
            }, TypeError);
        });
    });
    describe('_registerMultipleEvents method',function() {
        beforeEach(function() {
            this._registerRepeatedEventListener = sinon.stub(this.mediator, '_registerRepeatedEventListener');
        });
        afterEach(function() {
            this._registerRepeatedEventListener.restore();
        });
        describe('called with valid but empty input', function() {
            beforeEach(function(){
                this.kolibriModule = {
                    name: 'test'
                };
                this.mediator._registerMultipleEvents(this.kolibriModule);
            });
            it('should not call listener registration', function() {
                assert(!this._registerRepeatedEventListener.called);
            });
        });
        describe('called with valid input with event object', function() {
            beforeEach(function(){
                this.kolibriModule = {
                    name: 'test',
                    events: {
                        event: 'method'
                    }
                };
                this.mediator._registerMultipleEvents(this.kolibriModule);
            });
            afterEach(function() {
                delete this.kolibriModule;
            });
            it('should call listener registration', function() {
                assert(this._registerRepeatedEventListener.called);
            });
            it('should pass event, kolibriModule, and method to listener registration', function() {
                assert(this._registerRepeatedEventListener.calledWith('event', this.kolibriModule, 'method'));
            });
        });
        describe('called with valid input with event function', function() {
            beforeEach(function(){
                this.kolibriModule = {
                    name: 'test',
                    events: function() {
                        return {event: 'method'};
                    }
                };
                this.mediator._registerMultipleEvents(this.kolibriModule);
            });
            afterEach(function() {
                delete this.kolibriModule;
            });
            it('should call listener registration', function() {
                assert(this._registerRepeatedEventListener.called);
            });
            it('should pass event, kolibriModule, and method to listener registration', function() {
                assert(this._registerRepeatedEventListener.calledWith('event', this.kolibriModule, 'method'));
            });
        });
        describe('called with invalid input', function() {
            it('should throw a TypeError', function() {
                assert.throws(function() {this.mediator._registerMultipleEvents(undefined);}, TypeError);
            });
        });
    });
    describe(' _registerOneTimeEvents method',function() {
        beforeEach(function() {
            this._registerOneTimeEventListener = sinon.stub(this.mediator, '_registerOneTimeEventListener');
        });
        afterEach(function() {
            this._registerOneTimeEventListener.restore();
        });
        describe('called with valid but empty input', function() {
            beforeEach(function(){
                this.kolibriModule = {
                    name: 'test'
                };
                this.mediator._registerOneTimeEvents(this.kolibriModule);
            });
            it('should not call listener registration', function() {
                assert(!this._registerOneTimeEventListener.called);
            });
        });
        describe('called with valid input with event object', function() {
            beforeEach(function(){
                this.kolibriModule = {
                    name: 'test',
                    once: function() {
                        return {event: 'method'};
                    }
                };
                this.mediator._registerOneTimeEvents(this.kolibriModule);
            });
            afterEach(function() {
                delete this.kolibriModule;
            });
            it('should call listener registration', function() {
                assert(this._registerOneTimeEventListener.called);
            });
            it('should pass event, kolibriModule, and method to listener registration', function() {
                assert(this._registerOneTimeEventListener.calledWith('event', this.kolibriModule, 'method'));
            });
        });
        describe('called with valid input with event function', function() {
            beforeEach(function(){
                this.kolibriModule = {
                    name: 'test',
                    once: {
                        event: 'method'
                    }
                };
                this.mediator._registerOneTimeEvents(this.kolibriModule);
            });
            afterEach(function() {
                delete this.kolibriModule;
            });
            it('should call listener registration', function() {
                assert(this._registerOneTimeEventListener.called);
            });
            it('should pass event, kolibriModule, and method to listener registration', function() {
                assert(this._registerOneTimeEventListener.calledWith('event', this.kolibriModule, 'method'));
            });
        });
        describe('called with invalid input', function() {
            it('should throw a TypeError', function() {
                assert.throws(function() {this.mediator._registerOneTimeEvents(undefined);}, TypeError);
            });
        });
    });
    describe('_registerRepeatedEventListener method', function() {
        beforeEach(function() {
            this.stub = sinon.stub(this.mediator, '_registerEventListener');
            this.event = 'event';
            this.kolibriModule = {name: 'test'};
            this.method = 'method';
            this.mediator._registerRepeatedEventListener(this.event, this.kolibriModule, this.method);
        });
        afterEach(function() {
            this.stub.restore();
        });
        it('should call _registerEventListener method', function() {
            assert(this.stub.called);
        });
        it('should pass three args to _registerEventListener method', function() {
            assert(this.stub.calledWith(this.event, this.kolibriModule, this.method));
        });
    });
    describe('_registerOneTimeEventListener method', function() {
        beforeEach(function() {
            this.event = 'event';
            this.kolibriModule = {name: 'test'};
            this.method = 'method';
        });
        afterEach(function() {
            this.stub.restore();
        });
        it('should call _registerEventListener method', function() {
            this.stub = sinon.stub(this.mediator, '_registerEventListener');
            this.mediator._registerOneTimeEventListener(this.event, this.kolibriModule, this.method);
            assert(this.stub.called);
        });
        it('should pass three args to _registerEventListener method', function() {
            this.stub = sinon.stub(this.mediator, '_registerEventListener');
            this.mediator._registerOneTimeEventListener(this.event, this.kolibriModule, this.method);
            assert(this.stub.calledWith(this.event, this.kolibriModule, this.method));
        });
        it('should properly invoke the listenToOnce with this set to the Mediator event object', function() {
            var self = this;
            assert.doesNotThrow(function() {
                self.mediator._registerOneTimeEventListener(self.event, self.kolibriModule, self.method);
            });
        });
    });
    describe('_registerEventListener method', function() {
        beforeEach(function() {
            this.spy = sinon.spy();
            this.event = 'event';
            this.kolibriModule = {name: 'test'};
            this.method = 'method';
            this.mediator._registerEventListener(this.event, this.kolibriModule, this.method, this.spy);
        });
        it('should put a callback function in the callback registry', function() {
            assert(this.mediator._callbackRegistry.test.event.method instanceof Function);
        });
        it('should call listen method', function() {
            assert(this.spy.called);
        });
        it('should pass at least one arg to listen method', function() {
            assert(this.spy.calledWith(this.event));
        });
    });
    describe('stopListening method', function() {
        beforeEach(function() {
            this.stub = sinon.stub(this.mediator._eventDispatcher, '$off');
            this.event = 'event';
            this.kolibriModule = {name: 'test'};
            this.method = 'method';
        });
        afterEach(function() {
            this.stub.restore();
        });
        describe('when no callback registered', function() {
            it('should not call stopListening when no callback registered', function() {
                this.mediator.stopListening(this.event, this.kolibriModule, this.method);
                assert(!this.stub.called);
            });
        });
        describe('when callback is registered', function() {
            beforeEach(function() {
                this.mediator._callbackRegistry[this.kolibriModule.name] = {};
                this.mediator._callbackRegistry[this.kolibriModule.name][this.event] = {};
                this.callback = function() {};
                this.mediator._callbackRegistry[this.kolibriModule.name][this.event][this.method] = this.callback;
                this.mediator.stopListening(this.event, this.kolibriModule, this.method);
            });
            it('should call $off', function() {
                assert(this.stub.called);
            });
            it('should pass two args to $off method', function() {
                assert(this.stub.calledWith(this.event, this.callback));
            });
            it('should remove the callback from the registry', function() {
                var callback = this.mediator._callbackRegistry[this.kolibriModule.name][this.event][this.method];
                assert(typeof callback === 'undefined');
            });
        });
    });
    describe('_executeCallbackBuffer method', function() {
        beforeEach(function() {
            this.spy = sinon.spy();
            this.kolibriModule = {
                name: 'test',
                method: this.spy
            };
            this.args = ['this', 'that'];
            this.mediator._callbackBuffer.test = [{
                method: 'method',
                args: this.args
            }];
            this.mediator._executeCallbackBuffer(this.kolibriModule);
        });
        it('should call the callback function', function() {
            assert(this.spy.called);
        });
        it('should pass the args to the callback function', function() {
            assert.deepEqual(this.spy.lastCall.args, this.args);
        });
        it('should remove the entry from callback registry', function() {
            assert(typeof this.mediator._callbackBuffer.test === 'undefined');
        });
    });
    describe('registerKolibriModuleAsync method', function() {
        beforeEach(function() {
            this.kolibriModuleName = 'test';
            this.kolibriModuleUrls = ['test.js', 'test.css'];
            this.events = {
                event: 'method'
            };
            this.once = {
                once: 'once_method'
            };
            this.stub = sinon.stub(this.mediator._eventDispatcher, '$on');
            this.mediator.registerKolibriModuleAsync(this.kolibriModuleName, this.kolibriModuleUrls, this.events, this.once);
        });
        afterEach(function() {
            this.stub.restore();
        });
        it('should add create a callback buffer for the kolibriModule', function() {
            assert(typeof this.mediator._callbackBuffer[this.kolibriModuleName] !== 'undefined');
        });
        it('should put two entries in the async callback registry', function() {
            assert.equal(this.mediator._asyncCallbackRegistry[this.kolibriModuleName].length, 2);
        });
        it('should put a callback function in each entry in the async callback registry', function() {
            assert(this.mediator._asyncCallbackRegistry[this.kolibriModuleName][0].callback instanceof Function);
            assert(this.mediator._asyncCallbackRegistry[this.kolibriModuleName][1].callback instanceof Function);
        });
        it('should call $on twice', function() {
            assert(this.stub.calledTwice);
        });
        it('should pass both events to $on', function() {
            assert(this.stub.calledWith('event'));
            assert(this.stub.calledWith('once'));
        });
        describe('async callbacks', function() {
            beforeEach(function() {
                this.args = ['this', 'that'];
                this.mediator._asyncCallbackRegistry[this.kolibriModuleName][0].callback(this.args);
            });
            it('should add an entry to the callback buffer when called', function() {
                assert.equal(this.mediator._callbackBuffer[this.kolibriModuleName].length, 1);
            });
            it('should add args in the callback buffer when called', function() {
                assert.deepEqual(this.mediator._callbackBuffer[this.kolibriModuleName].args, this.arg);
            });
        });
        describe('async callbacks with error on script load', function() {
            beforeEach(function() {
                var self = this;
                this.args = ['this', 'that'];
                Mediator.__set__('assetLoader', function(files, callback) {
                    callback('error!', self.kolibriModuleUrls);
                });
                this.spy = sinon.spy();
                Mediator.__set__('logging', {error: this.spy});
                this.mediator._asyncCallbackRegistry[this.kolibriModuleName][0].callback(this.args);
            });
            it('should call logging.error twice', function() {
                assert(this.spy.calledTwice);
            });
            it('should call logging.error with each of the args', function() {
                assert(this.spy.calledWith(this.kolibriModuleUrls[0] + ' failed to load'));
                assert(this.spy.calledWith(this.kolibriModuleUrls[1] + ' failed to load'));
            });
        });
    });
    describe('_clearAsyncCallbacks method', function() {
        beforeEach(function() {
            this.kolibriModule = {
                name: 'test'
            };
            this.event = 'event';
            this.callback = function() {};
            this.mediator._asyncCallbackRegistry[this.kolibriModule.name] = [{
                event: this.event,
                callback: this.callback
            }];
            this.stub = sinon.stub(this.mediator._eventDispatcher, '$off');
            this.mediator._clearAsyncCallbacks(this.kolibriModule);
        });
        afterEach(function() {
            this.stub.restore();
        });
        it('should clear the callbacks', function() {
            assert(typeof this.mediator._asyncCallbackRegistry[this.kolibriModule.name] === 'undefined');
        });
        it('should call $off once', function() {
            assert(this.stub.calledOnce);
        });
        it('should call $off with two args', function() {
            assert(this.stub.calledWith(this.event, this.callback));
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
            assert(this.stub.called);
        });
        it('should proxy all arguments to the event dispatcher $emit', function() {
            var arg1 = 'this';
            var arg2 = 'that';
            var arg3 = ['four'];
            this.mediator.emit(arg1, arg2, arg3);
            assert(this.stub.alwaysCalledWith(arg1, arg2, arg3));
        });
    });
});
