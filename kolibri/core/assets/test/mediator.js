'use strict';

var assert = require('assert');
var sinon = require('sinon');
var Backbone = require('backbone');

var Mediator = require('../src/mediator/mediator.js');

var mediator = new Mediator();

describe('Mediator', function() {
    describe('plugin registry', function() {
        it('should be empty', function () {
            assert.deepEqual(mediator._plugin_registry, {});
        });
    });
    describe('callback buffer', function() {
        it('should be empty', function () {
            assert.deepEqual(mediator._callback_buffer, {});
        });
    });
    describe('callback registry', function() {
        it('should be empty', function () {
            assert.deepEqual(mediator._callback_registry, {});
        });
    });
    describe('event dispatcher', function() {
        it('should be a Backbone Event object', function () {
            assert(typeof mediator._event_dispatcher === 'object');
            assert(mediator._event_dispatcher.listenTo instanceof Function);
        });
    });
    describe('trigger method', function() {
        beforeEach(function() {
            this.stub = sinon.stub(mediator._event_dispatcher, 'trigger');
        });
        afterEach(function() {
            mediator._event_dispatcher.trigger.restore();
        });
        it('should call the event dispatcher trigger', function() {
            mediator.trigger();
            assert(this.stub.called);
        });
        it('should proxy all arguments to the event dispatcher trigger', function() {
            var arg1 = 'this';
            var arg2 = 'that';
            var arg3 = ['four'];
            mediator.trigger(arg1, arg2, arg3);
            assert(this.stub.alwaysCalledWith(arg1, arg2, arg3));
        });
    });
    describe('register_plugin_sync method', function() {
        beforeEach(function() {
            this._register_multiple_events = sinon.stub(mediator, '_register_multiple_events');
            this._register_one_time_events = sinon.stub(mediator, '_register_one_time_events');
            this.trigger = sinon.stub(mediator, 'trigger');
            this._execute_callback_buffer = sinon.stub(mediator, '_execute_callback_buffer');
        });
        afterEach(function() {
            mediator._plugin_registry = {};
            this._register_multiple_events.restore();
            this._register_one_time_events.restore();
            this.trigger.restore();
            this._execute_callback_buffer.restore();
        });
        describe('called with valid input', function() {
            beforeEach(function() {
                this.plugin = {name: 'test'};
                mediator.register_plugin_sync(this.plugin);
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
                assert.deepEqual(mediator._plugin_registry[this.plugin.name], this.plugin);
            });
        });
        describe('called with invalid input', function() {
            beforeEach(function() {
                this.plugin = undefined;
                try {
                    mediator.register_plugin_sync(this.plugin);
                }
                catch (e) {}
            });
            it('should raise an error', function() {
                assert.throws(function() {mediator.register_plugin_sync(this.plugin);}, TypeError);
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
                assert.deepEqual(mediator._plugin_registry, {});
            });
        });
    });
    describe('_register_multiple_events method',function() {
        beforeEach(function() {
            this._register_repeated_event_listener = sinon.stub(mediator, '_register_repeated_event_listener');
        });
        afterEach(function() {
            this._register_repeated_event_listener.restore();
        });
        describe('called with valid but empty input', function() {
            beforeEach(function(){
                this.plugin = {
                    name: 'test'
                };
                mediator._register_multiple_events(this.plugin);
            });
            it('should not call listener registration', function() {
                assert(!this._register_repeated_event_listener.called);
            });
        });
        describe('called with valid input', function() {
            beforeEach(function(){
                this.plugin = {
                    name: 'test',
                    events: {
                        event: 'method'
                    }
                };
                mediator._register_multiple_events(this.plugin);
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
                assert.throws(function() {mediator._register_multiple_events(undefined);}, TypeError);
            });
        });
    });
    describe(' _register_one_time_events method',function() {
        beforeEach(function() {
            this._register_one_time_event_listener = sinon.stub(mediator, '_register_one_time_event_listener');
        });
        afterEach(function() {
            this._register_one_time_event_listener.restore();
        });
        describe('called with valid but empty input', function() {
            beforeEach(function(){
                this.plugin = {
                    name: 'test'
                };
                mediator. _register_one_time_events(this.plugin);
            });
            it('should not call listener registration', function() {
                assert(!this._register_one_time_event_listener.called);
            });
        });
        describe('called with valid input', function() {
            beforeEach(function(){
                this.plugin = {
                    name: 'test',
                    once: {
                        event: 'method'
                    }
                };
                mediator. _register_one_time_events(this.plugin);
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
                assert.throws(function() {mediator. _register_one_time_events(undefined);}, TypeError);
            });
        });
    });
    describe('_register_repeated_event_listener method', function() {
        beforeEach(function() {
            this.stub = sinon.stub(mediator, '_register_event_listener');
            this.event = 'event';
            this.plugin = {name: 'test'};
            this.method = 'method';
            mediator._register_repeated_event_listener(this.event, this.plugin, this.method);
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
            this.stub = sinon.stub(mediator, '_register_event_listener');
            this.event = 'event';
            this.plugin = {name: 'test'};
            this.method = 'method';
            mediator._register_one_time_event_listener(this.event, this.plugin, this.method);
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
});
