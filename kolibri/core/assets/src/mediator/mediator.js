'use strict';
/**
 * Mediator module.
 * Provides the main controller and event dispatcher for the Kolibri FrontEnd core app.
 * @module Mediator
 */


var asset_loader = require('./asset_loader');
var Backbone = require('backbone');
var _ = require('lodash');
var logging = require('loglevel');

/**
 * @constructor
 * @classdesc The Mediator class - registers and loads plugins and acts as a global event dispatcher.
 */
var Mediator = function() {
    /**
     * Keep track of all registered plugins - object is of form:
     * plugin_name: plugin_object
     **/
    this._plugin_registry = {};

    /**
     * Keep track of all callbacks that have been fired for as yet unloaded modules.
     * plugin_name: {Function[]} of callbacks
     **/
    this._callback_buffer = {};

    /**
     * Keep track of all registered callbacks bound to events - this allows for easier stopListening later.
     * plugin_name: {object} - event: {object} - method: callback function
     **/
    this._callback_registry = {};

    /**
     * Keep track of all registered async callbacks bound to events - this allows for easier stopListening later.
     * plugin_name: {object[]} - with keys 'event' and 'callback'.
     **/
    this._async_callback_registry = {};

    this._event_dispatcher = _.clone(Backbone.Events);
};

/**
 * @param {Plugin} plugin - object of Plugin class
 * @description Registers a plugin that has already been loaded into the frontend. Registers event listeners for
 * multiple time and one time events. When all event listeners have been registered, any buffered callbacks are passed
 * to the Plugin object, in case it was previously registered asynchronously.
 */
Mediator.prototype.register_plugin_sync = function(plugin) {

    this._register_multiple_events(plugin);
    this._register_one_time_events(plugin);

    this._plugin_registry[plugin.name] = plugin;
    this._clear_async_callbacks(plugin);
    this._execute_callback_buffer(plugin);
    logging.info('Plugin: ' + plugin.name + ' registered');
    this.trigger('kolibri_register', plugin);
};

/**
 * Generic event registration method - inspects Plugin class for event key and then registers all events with specified
 * event registration method
 * @param {Plugin} plugin - object of Plugin class
 * @param {string} events_key - 'events' or 'once'
 * @param {Function} event_listener_method - Mediator.prototype._register_multiple_events or
 * Mediator.prototype._register_one_time_events
 * @private
 */
Mediator.prototype._register_events = function(plugin, events_key, event_listener_method) {
    var events;
    if (typeof plugin[events_key] === 'undefined') {
        events = {};
    } else if (typeof plugin[events_key] === 'function') {
        events = plugin[events_key]();
    } else {
        events = plugin[events_key];
    }
    _.forEach(events, function(value, key) {
        event_listener_method(key, plugin, value);
    });
};

/**
 * Method to register events that will fire multiple times until unregistered.
 * @param {Plugin} plugin - object of Plugin class
 * @private
 */
Mediator.prototype._register_multiple_events = function(plugin) {
    this._register_events(plugin, 'events', this._register_repeated_event_listener);
};

/**
 * Method to register events that will fire only once.
 * @param {Plugin} plugin - object of Plugin class
 * @private
 */
Mediator.prototype._register_one_time_events = function(plugin) {
    this._register_events(plugin, 'once', this._register_one_time_event_listener);
};

/**
 * Method to register a single repeating event for a particular plugin with a method of that plugin as a callback.
 * @param {string} event - the event name.
 * @param {Plugin} plugin - object of Plugin class
 * @param {string} method - the name of the method of the Plugin object.
 * @private
 */
Mediator.prototype._register_repeated_event_listener = function(event, plugin, method) {
    this._register_event_listener(event, plugin, method, this._event_dispatcher.listenTo);
};

/**
 * Method to register a single one time event for a particular plugin with a method of that plugin as a callback.
 * @param {string} event - the event name.
 * @param {Plugin} plugin - object of Plugin class
 * @param {string} method - the name of the method of the Plugin object.
 * @private
 */
Mediator.prototype._register_one_time_event_listener = function(event, plugin, method) {
    this._register_event_listener(event, plugin, method, this._event_dispatcher.listenToOnce);
};

/**
 * Method to register either a one time or a multitime event and add it to the callback registry of the Mediator object
 * for easy clean up and stopListening later.
 * @param {string} event - the event name.
 * @param {Plugin} plugin - object of Plugin class
 * @param {string} method - the name of the method of the Plugin object.
 * @param {Function} listen_method - Backbone.Events.listenTo or Backbone.Events.listenToOnce
 * @private
 */
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

/**
 * Method to unbind event listeners once they have been registered.
 * @param {string} event - the event name.
 * @param {Plugin} plugin - object of Plugin class
 * @param {string} method - the name of the method of the Plugin object.
 */
Mediator.prototype.stop_listening = function(event, plugin, method) {
    var callback = ((this._callback_registry[plugin.name] || {})[event] || {})[method];
    if (typeof callback !== 'undefined') {
        this._event_dispatcher.stopListening(this._event_dispatcher, event, callback);
        delete this._callback_registry[plugin.name][event][method];
    }
};

/**
 * Finds all callbacks that were triggered before the plugin was loaded and registered synchronously and executes them
 * in order of creation.
 * @param {Plugin} plugin - object of Plugin class
 * @private
 */
Mediator.prototype._execute_callback_buffer = function(plugin) {
    if (typeof this._callback_buffer[plugin.name] !== 'undefined') {
        _.forEach(this._callback_buffer[plugin.name], function(buffer) {
            plugin[buffer.method].apply(plugin, buffer.args);
        });
        delete this._callback_buffer[plugin.name];
    }
};

/**
 * Registers a plugin before it has been loaded into the page. Buffers any events that are fired, causing the arguments
 * to be saved in the callback buffer array for this plugin.
 * @param {string} plugin_name - the name of the plugin
 * @param {string[]} plugin_urls - the URLs of the Javascript and CSS files that constitute the plugin
 * @param {object} events - key, value pairs of event names and methods for repeating callbacks.
 * @param {object} once - key value pairs of event names and methods for one time callbacks.
 */
Mediator.prototype.register_plugin_async = function(plugin_name, plugin_urls, events, once) {
    var self = this;
    var callback_buffer = this._callback_buffer[plugin_name] = [];
    var event_array = _.toPairs(events).concat(_.toPairs(once));
    if (typeof this._async_callback_registry[plugin_name] === 'undefined') {
        this._async_callback_registry[plugin_name] = [];
    }
    _.forEach(event_array, function(tuple) {
        var key = tuple[0];
        var value = tuple[1];
        var callback = function() {
            if (typeof self._plugin_registry[plugin_name] === 'undefined') {
                callback_buffer.push({
                    args: arguments,
                    method: value
                });
                asset_loader([plugin_urls], function(err, notFound) {
                    if (err) {
                        _.forEach(notFound, function (file) {
                            logging.error(file + ' failed to load');
                        });
                    }
                });
            }
        };
        self._event_dispatcher.listenTo(self._event_dispatcher, key, callback);
        self._async_callback_registry[plugin_name].push({
            event: key,
            callback: callback
        });
    });
};

/**
 * Function to unbind and remove all callbacks created by the register_plugin_async method.
 * @param {Plugin} plugin - object of Plugin class
 * @private
 */
Mediator.prototype._clear_async_callbacks = function(plugin) {
    var self = this;
    _.forEach(this._async_callback_registry[plugin.name], function(async) {
        self._event_dispatcher.stopListening(self._event_dispatcher, async.event, async.callback);
    });
    delete this._async_callback_registry[plugin.name];
};

/**
 * Proxy to the Backbone.Events object that is the global dispatcher.
 * Takes any arguments and passes them on.
 */
Mediator.prototype.trigger = function() {
    this._event_dispatcher.trigger.apply(this._event_dispatcher, arguments);
};


module.exports = Mediator;
