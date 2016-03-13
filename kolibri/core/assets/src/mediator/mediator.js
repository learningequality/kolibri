'use strict';

var asset_loader = require('./asset_loader');
var Backbone = require('backbone');
var _ = require('lodash');
var logging = require('loglevel');

var Mediator = function(options) {
    /*
     * Keep track of all registered plugins - object is of form:
     * plugin_name: plugin_object
     */
    this._plugin_registry = {};

    this._callback_buffer = {};

    this._callback_registry = {};

    this._event_dispatcher = _.clone(Backbone.Events);
};


Mediator.prototype.register_plugin_sync = function(plugin) {

    this._register_multiple_events(plugin);
    this._register_one_time_events(plugin);

    this._plugin_registry[plugin.name] = plugin;
    logging.info('Plugin: ' + plugin.name + ' registered');
    this.trigger('kolibri_register', plugin);
    this._execute_callback_buffer(plugin);
};

Mediator.prototype._register_multiple_events = function(plugin) {
    var self = this;
    var events;
    if (typeof plugin.events === 'undefined') {
        events = {};
    } else if (typeof plugin.events === 'function') {
        events = plugin.events();
    } else {
        events = plugin.events;
    }
    _.forEach(events, function(value, key) {
        self._register_repeated_event_listener(key, plugin, value);
    });
};

Mediator.prototype._register_one_time_events = function(plugin) {
    var self = this;
    var once;
    if (typeof plugin.once === 'undefined') {
        once = {};
    } else if (typeof plugin.once === 'function') {
        once = plugin.once();
    } else {
        once = plugin.once;
    }
    _.forEach(once, function(value, key) {
        self._register_one_time_event_listener(key, plugin, value);
    });
};

Mediator.prototype._register_repeated_event_listener = function(event, plugin, method) {
    this._register_event_listener(event, plugin, method, this._event_dispatcher.listenTo);
};

Mediator.prototype._register_one_time_event_listener = function(event, plugin, method) {
    this._register_event_listener(event, plugin, method, this._event_dispatcher.listenToOnce);
};

Mediator.prototype._register_event_listener = function(event, plugin, method, listen_method) {
    var callback = function() {plugin[method].apply(plugin, arguments);};
    if (typeof this._callback_registry[plugin.name] === 'undefined') {
        this._callback_registry[plugin.name] = {};
    }
    if (typeof this._callback_registry[plugin.name][event] === 'undefined') {
        this._callback_registry[plugin.name][event] = {};
    }
    this._callback_registry[plugin.name][event][method] = callback;
    listen_method(this._event_dispatcher, event, callback);
};

Mediator.prototype.stop_listening = function(event, plugin, method) {
    var callback = this._callback_registry[plugin.name][event][method];
    this._event_dispatcher.stopListening(this, event, callback);
    delete this._callback_registry[plugin.name][event][method];
};

Mediator.prototype._execute_callback_buffer = function(plugin) {
    if (typeof this._callback_buffer[plugin.name] !== 'undefined') {
        _.forEach(this._callback_buffer[plugin.name], function(buffer) {
            plugin[buffer.method].apply(plugin, buffer.args);
        });
        delete this._callback_buffer[plugin.name];
    }
};

Mediator.prototype.register_plugin_async = function(plugin_name, plugin_urls, events) {
    var self = this;
    var callback_buffer = this._callback_buffer[plugin_name] = [];
    _.forEach(events, function(value, key) {
        var callback = function() {
            callback_buffer.push({
                args: arguments,
                method: value
            });
            if (typeof self._plugin_registry[plugin_name] === 'undefined') {
                asset_loader([plugin_urls], function(err, notFound) {
                    if (!err) {
                        self._event_dispatcher.stopListening(self._event_dispatcher, key, callback);
                    } else {
                        _.forEach(notFound, function(file) {
                           logging.error(file + ' failed to load');
                        });
                    }
                });
            }
        };
        self._event_dispatcher.listenTo(self._event_dispatcher, key, callback);
    });
};

Mediator.prototype.trigger = function() {
    this._event_dispatcher.trigger.apply(this._event_dispatcher, arguments);
};


module.exports = Mediator;
