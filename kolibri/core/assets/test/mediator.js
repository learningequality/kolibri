'use strict';

var assert = require('assert');
var sinon = require('sinon');
var Backbone = require('backbone');
var rewire = require('rewire');

var Mediator = rewire('../src/mediator/mediator.js');

describe('Mediator', function() {
    beforeEach(function() {
        this.mediator = new Mediator();
    });
    afterEach(function() {
        delete this.mediator;
    });
    describe('plugin registry', function() {
        it('should be empty', function () {
            assert.deepEqual(this.mediator._plugin_registry, {});
        });
    });
    describe('callback buffer', function() {
        it('should be empty', function () {
            assert.deepEqual(this.mediator._callback_buffer, {});
        });
    });
    describe('callback registry', function() {
        it('should be empty', function () {
            assert.deepEqual(this.mediator._callback_registry, {});
        });
    });
    describe('async callback registry', function() {
        it('should be empty', function () {
            assert.deepEqual(this.mediator._async_callback_registry, {});
        });
    });
    describe('event dispatcher', function() {
        it('should be a Backbone Event object', function () {
            assert(typeof this.mediator._event_dispatcher === 'object');
            assert(this.mediator._event_dispatcher.listenTo instanceof Function);
        });
    });
    describe('register_plugin_sync method', function() {
        beforeEach(function() {
            this._register_multiple_events = sinon.stub(this.mediator, '_register_multiple_events');
            this._register_one_time_events = sinon.stub(this.mediator, '_register_one_time_events');
            this.trigger = sinon.stub(this.mediator, 'trigger');
            this._execute_callback_buffer = sinon.stub(this.mediator, '_execute_callback_buffer');
        });
        afterEach(function() {
            this.mediator._plugin_registry = {};
            this._register_multiple_events.restore();
            this._register_one_time_events.restore();
            this.trigger.restore();
            this._execute_callback_buffer.restore();
        });
        describe('called with valid input', function() {
            beforeEach(function() {
                this.plugin = {name: 'test'};
                this.mediator.register_plugin_sync(this.plugin);
            });
            it('should call the _register_multiple_events method', function() {
                assert(this._register_multiple_events.called);
            });
            it('should pass the plugin to the _register_multiple_events method', function() {
                assert(this._register_multiple_events.calledWith(this.plugin));
            });
            it('should call the _register_one_time_events method', function() {
                assert(this._register_one_time_events.called);
            });
            it('should pass the plugin to the _register_one_time_events method', function() {
                assert(this._register_one_time_events.calledWith(this.plugin));
            });
            it('should call the trigger method', function() {
                assert(this.trigger.called);
            });
            it('should pass the plugin to the trigger method', function() {
                assert(this.trigger.calledWith('kolibri_register', this.plugin));
            });
            it('should call the _execute_callback_buffer method', function() {
                assert(this._execute_callback_buffer.called);
            });
            it('should call pass the plugin to the _execute_callback_buffer method', function() {
                assert(this._execute_callback_buffer.calledWith(this.plugin));
            });
            it('should put the plugin into the plugin registry', function() {
                assert.deepEqual(this.mediator._plugin_registry[this.plugin.name], this.plugin);
            });
        });
        describe('called with invalid input', function() {
            beforeEach(function() {
                this.plugin = undefined;
                try {
                    this.mediator.register_plugin_sync(this.plugin);
                }
                catch (e) {}
            });
            it('should raise an error', function() {
                assert.throws(function() {this.mediator.register_plugin_sync(this.plugin);}, TypeError);
            });
            it('should call the _register_multiple_events method', function() {
                assert(this._register_multiple_events.called);
            });
            it('should pass the plugin to the _register_multiple_events method', function() {
                assert(this._register_multiple_events.calledWith(this.plugin));
            });
            it('should call the _register_one_time_events method', function() {
                assert(this._register_one_time_events.called);
            });
            it('should pass the plugin to the _register_one_time_events method', function() {
                assert(this._register_one_time_events.calledWith(this.plugin));
            });
            it('should not call the trigger method', function() {
                assert(!this.trigger.called);
            });
            it('should not call the _execute_callback_buffer method', function() {
                assert(!this._execute_callback_buffer.called);
            });
            it('should leave the plugin registry empty', function() {
                assert.deepEqual(this.mediator._plugin_registry, {});
            });
        });
    });
    describe('_register_events method', function() {
        it('should not throw a TypeError due to incorrect assignment of this when the event_listener_method is called', function() {
            var self = this;
            assert.doesNotThrow(function () {
                self.mediator._register_events({
                    name: 'test',
                    events: {
                        event: 'method'
                    }
                }, 'events', self.mediator._register_repeated_event_listener);
            }, TypeError);
        });
    });
    describe('_register_multiple_events method',function() {
        beforeEach(function() {
            this._register_repeated_event_listener = sinon.stub(this.mediator, '_register_repeated_event_listener');
        });
        afterEach(function() {
            this._register_repeated_event_listener.restore();
        });
        describe('called with valid but empty input', function() {
            beforeEach(function(){
                this.plugin = {
                    name: 'test'
                };
                this.mediator._register_multiple_events(this.plugin);
            });
            it('should not call listener registration', function() {
                assert(!this._register_repeated_event_listener.called);
            });
        });
        describe('called with valid input with event object', function() {
            beforeEach(function(){
                this.plugin = {
                    name: 'test',
                    events: {
                        event: 'method'
                    }
                };
                this.mediator._register_multiple_events(this.plugin);
            });
            afterEach(function() {
                delete this.plugin;
            });
            it('should call listener registration', function() {
                assert(this._register_repeated_event_listener.called);
            });
            it('should pass event, plugin, and method to listener registration', function() {
                assert(this._register_repeated_event_listener.calledWith('event', this.plugin, 'method'));
            });
        });
        describe('called with valid input with event function', function() {
            beforeEach(function(){
                this.plugin = {
                    name: 'test',
                    events: function() {
                        return {event: 'method'};
                    }
                };
                this.mediator._register_multiple_events(this.plugin);
            });
            afterEach(function() {
                delete this.plugin;
            });
            it('should call listener registration', function() {
                assert(this._register_repeated_event_listener.called);
            });
            it('should pass event, plugin, and method to listener registration', function() {
                assert(this._register_repeated_event_listener.calledWith('event', this.plugin, 'method'));
            });
        });
        describe('called with invalid input', function() {
            it('should throw a TypeError', function() {
                assert.throws(function() {this.mediator._register_multiple_events(undefined);}, TypeError);
            });
        });
    });
    describe(' _register_one_time_events method',function() {
        beforeEach(function() {
            this._register_one_time_event_listener = sinon.stub(this.mediator, '_register_one_time_event_listener');
        });
        afterEach(function() {
            this._register_one_time_event_listener.restore();
        });
        describe('called with valid but empty input', function() {
            beforeEach(function(){
                this.plugin = {
                    name: 'test'
                };
                this.mediator._register_one_time_events(this.plugin);
            });
            it('should not call listener registration', function() {
                assert(!this._register_one_time_event_listener.called);
            });
        });
        describe('called with valid input with event object', function() {
            beforeEach(function(){
                this.plugin = {
                    name: 'test',
                    once: function() {
                        return {event: 'method'};
                    }
                };
                this.mediator._register_one_time_events(this.plugin);
            });
            afterEach(function() {
                delete this.plugin;
            });
            it('should call listener registration', function() {
                assert(this._register_one_time_event_listener.called);
            });
            it('should pass event, plugin, and method to listener registration', function() {
                assert(this._register_one_time_event_listener.calledWith('event', this.plugin, 'method'));
            });
        });
        describe('called with valid input with event function', function() {
            beforeEach(function(){
                this.plugin = {
                    name: 'test',
                    once: {
                        event: 'method'
                    }
                };
                this.mediator._register_one_time_events(this.plugin);
            });
            afterEach(function() {
                delete this.plugin;
            });
            it('should call listener registration', function() {
                assert(this._register_one_time_event_listener.called);
            });
            it('should pass event, plugin, and method to listener registration', function() {
                assert(this._register_one_time_event_listener.calledWith('event', this.plugin, 'method'));
            });
        });
        describe('called with invalid input', function() {
            it('should throw a TypeError', function() {
                assert.throws(function() {this.mediator._register_one_time_events(undefined);}, TypeError);
            });
        });
    });
    describe('_register_repeated_event_listener method', function() {
        beforeEach(function() {
            this.stub = sinon.stub(this.mediator, '_register_event_listener');
            this.event = 'event';
            this.plugin = {name: 'test'};
            this.method = 'method';
            this.mediator._register_repeated_event_listener(this.event, this.plugin, this.method);
        });
        afterEach(function() {
            this.stub.restore();
        });
        it('should call _register_event_listener method', function() {
            assert(this.stub.called);
        });
        it('should pass three args to _register_event_listener method', function() {
            assert(this.stub.calledWith(this.event, this.plugin, this.method));
        });
    });
    describe('_register_one_time_event_listener method', function() {
        beforeEach(function() {
            this.event = 'event';
            this.plugin = {name: 'test'};
            this.method = 'method';
        });
        afterEach(function() {
            this.stub.restore();
        });
        it('should call _register_event_listener method', function() {
            this.stub = sinon.stub(this.mediator, '_register_event_listener');
            this.mediator._register_one_time_event_listener(this.event, this.plugin, this.method);
            assert(this.stub.called);
        });
        it('should pass three args to _register_event_listener method', function() {
            this.stub = sinon.stub(this.mediator, '_register_event_listener');
            this.mediator._register_one_time_event_listener(this.event, this.plugin, this.method);
            assert(this.stub.calledWith(this.event, this.plugin, this.method));
        });
        it('should properly invoke the listenToOnce with this set to the Mediator event object', function() {
            var self = this;
            assert.doesNotThrow(function() {
                self.mediator._register_one_time_event_listener(self.event, self.plugin, self.method);
            });
        });
    });
    describe('_register_event_listener method', function() {
        beforeEach(function() {
            this.spy = sinon.spy();
            this.event = 'event';
            this.plugin = {name: 'test'};
            this.method = 'method';
            this.mediator._register_event_listener(this.event, this.plugin, this.method, this.spy);
        });
        it('should put a callback function in the callback registry', function() {
            assert(this.mediator._callback_registry.test.event.method instanceof Function);
        });
        it('should call listen method', function() {
            assert(this.spy.called);
        });
        it('should pass at least two args to listen method', function() {
            assert(this.spy.calledWith(this.mediator._event_dispatcher, this.event));
        });
    });
    describe('stop_listening method', function() {
        beforeEach(function() {
            this.stub = sinon.stub(this.mediator._event_dispatcher, 'stopListening');
            this.event = 'event';
            this.plugin = {name: 'test'};
            this.method = 'method';
        });
        afterEach(function() {
            this.stub.restore();
        });
        describe('when no callback registered', function() {
            it('should not call stopListening when no callback registered', function() {
                this.mediator.stop_listening(this.event, this.plugin, this.method);
                assert(!this.stub.called);
            });
        });
        describe('when callback is registered', function() {
            beforeEach(function() {
                this.mediator._callback_registry[this.plugin.name] = {};
                this.mediator._callback_registry[this.plugin.name][this.event] = {};
                this.callback = function() {};
                this.mediator._callback_registry[this.plugin.name][this.event][this.method] = this.callback;
                this.mediator.stop_listening(this.event, this.plugin, this.method);
            });
            it('should call stopListening', function() {
                assert(this.stub.called);
            });
            it('should pass three args to stopListening method', function() {
                assert(this.stub.calledWith(this.mediator._event_dispatcher, this.event, this.callback));
            });
            it('should remove the callback from the registry', function() {
                var callback = this.mediator._callback_registry[this.plugin.name][this.event][this.method];
                assert(typeof callback === 'undefined');
            });
        });
    });
    describe('_execute_callback_buffer method', function() {
        beforeEach(function() {
            this.spy = sinon.spy();
            this.plugin = {
                name: 'test',
                method: this.spy
            };
            this.args = ['this', 'that'];
            this.mediator._callback_buffer.test = [{
                method: 'method',
                args: this.args
            }];
            this.mediator._execute_callback_buffer(this.plugin);
        });
        it('should call the callback function', function() {
            assert(this.spy.called);
        });
        it('should pass the args to the callback function', function() {
            assert.deepEqual(this.spy.lastCall.args, this.args);
        });
        it('should remove the entry from callback registry', function() {
            assert(typeof this.mediator._callback_buffer.test === 'undefined');
        });
    });
    describe('register_plugin_async method', function() {
        beforeEach(function() {
            this.plugin_name = 'test';
            this.plugin_urls = ['test.js', 'test.css'];
            this.events = {
                event: 'method'
            };
            this.once = {
                once: 'once_method'
            };
            this.stub = sinon.stub(this.mediator._event_dispatcher, 'listenTo');
            this.mediator.register_plugin_async(this.plugin_name, this.plugin_urls, this.events, this.once);
        });
        afterEach(function() {
            this.stub.restore();
        });
        it('should add create a callback buffer for the plugin', function() {
            assert(typeof this.mediator._callback_buffer[this.plugin_name] !== 'undefined');
        });
        it('should put two entries in the async callback registry', function() {
            assert.equal(this.mediator._async_callback_registry[this.plugin_name].length, 2);
        });
        it('should put a callback function in each entry in the async callback registry', function() {
            assert(this.mediator._async_callback_registry[this.plugin_name][0].callback instanceof Function);
            assert(this.mediator._async_callback_registry[this.plugin_name][1].callback instanceof Function);
        });
        it('should call listenTo twice', function() {
            assert(this.stub.calledTwice);
        });
        it('should pass the dispatcher and both events to listenTo', function() {
            assert(this.stub.calledWith(this.mediator._event_dispatcher, 'event'));
            assert(this.stub.calledWith(this.mediator._event_dispatcher, 'once'));
        });
        describe('async callbacks', function() {
            beforeEach(function() {
                this.args = ['this', 'that'];
                this.mediator._async_callback_registry[this.plugin_name][0].callback(this.args);
            });
            it('should add an entry to the callback buffer when called', function() {
                assert.equal(this.mediator._callback_buffer[this.plugin_name].length, 1);
            });
            it('should add args in the callback buffer when called', function() {
                assert.deepEqual(this.mediator._callback_buffer[this.plugin_name].args, this.arg);
            });
        });
        describe('async callbacks with error on script load', function() {
            beforeEach(function() {
                var self = this;
                this.args = ['this', 'that'];
                Mediator.__set__('asset_loader', function(files, callback) {
                    callback('error!', self.plugin_urls);
                });
                this.spy = sinon.spy();
                Mediator.__set__('logging', {error: this.spy});
                this.mediator._async_callback_registry[this.plugin_name][0].callback(this.args);
            });
            it('should call logging.error twice', function() {
                assert(this.spy.calledTwice);
            });
            it('should call logging.error with each of the args', function() {
                assert(this.spy.calledWith(this.plugin_urls[0] + ' failed to load'));
                assert(this.spy.calledWith(this.plugin_urls[1] + ' failed to load'));
            });
        });
    });
    describe('_clear_async_callbacks method', function() {
        beforeEach(function() {
            this.plugin = {
                name: 'test'
            };
            this.event = 'event';
            this.callback = function() {};
            this.mediator._async_callback_registry[this.plugin.name] = [{
                event: this.event,
                callback: this.callback
            }];
            this.stub = sinon.stub(this.mediator._event_dispatcher, 'stopListening');
            this.mediator._clear_async_callbacks(this.plugin);
        });
        afterEach(function() {
            this.stub.restore();
        });
        it('should clear the callbacks', function() {
            assert(typeof this.mediator._async_callback_registry[this.plugin.name] === 'undefined');
        });
        it('should call stopListening once', function() {
            assert(this.stub.calledOnce);
        });
        it('should call stopListening with three args', function() {
            assert(this.stub.calledWith(this.mediator._event_dispatcher, this.event, this.callback));
        });
    });
    describe('trigger method', function() {
        beforeEach(function() {
            this.stub = sinon.stub(this.mediator._event_dispatcher, 'trigger');
        });
        afterEach(function() {
            this.mediator._event_dispatcher.trigger.restore();
        });
        it('should call the event dispatcher trigger', function() {
            this.mediator.trigger();
            assert(this.stub.called);
        });
        it('should proxy all arguments to the event dispatcher trigger', function() {
            var arg1 = 'this';
            var arg2 = 'that';
            var arg3 = ['four'];
            this.mediator.trigger(arg1, arg2, arg3);
            assert(this.stub.alwaysCalledWith(arg1, arg2, arg3));
        });
    });
});
