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
 * @classdesc The Mediator class - registers and loads kolibri_modules and acts as a global event dispatcher.
 */
var Mediator = function() {
    /**
     * Keep track of all registered kolibri_modules - object is of form:
     * kolibri_module_name: kolibri_module_object
     **/
    this._kolibri_module_registry = {};

    /**
     * Keep track of all callbacks that have been fired for as yet unloaded modules.
     * kolibri_module_name: {Function[]} of callbacks
     **/
    this._callback_buffer = {};

    /**
     * Keep track of all registered callbacks bound to events - this allows for easier stopListening later.
     * kolibri_module_name: {object} - event: {object} - method: callback function
     **/
    this._callback_registry = {};

    /**
     * Keep track of all registered async callbacks bound to events - this allows for easier stopListening later.
     * kolibri_module_name: {object[]} - with keys 'event' and 'callback'.
     **/
    this._async_callback_registry = {};

    this._event_dispatcher = _.clone(Backbone.Events);
};

/**
 * @param {KolibriModule} kolibri_module - object of KolibriModule class
 * @description Registers a kolibri_module that has already been loaded into the frontend. Registers event listeners for
 * multiple time and one time events. When all event listeners have been registered, any buffered callbacks are passed
 * to the KolibriModule object, in case it was previously registered asynchronously.
 */
Mediator.prototype.register_kolibri_module_sync = function(kolibri_module) {

    // Register all events that will be called repeatedly.
    this._register_multiple_events(kolibri_module);
    // Register all events that are listened to once and then unbound.
    this._register_one_time_events(kolibri_module);

    // Create an entry in the kolibri_module registry.
    this._kolibri_module_registry[kolibri_module.name] = kolibri_module;

    // Clear any previously bound asynchronous callbacks for this kolibri_module.
    this._clear_async_callbacks(kolibri_module);

    // Execute any callbacks that were called before the kolibri_module had loaded, in the order that they happened.
    this._execute_callback_buffer(kolibri_module);
    logging.info('KolibriModule: ' + kolibri_module.name + ' registered');
    this.trigger('kolibri_register', kolibri_module);
    kolibri_module.ready();
};

/**
 * Generic event registration method - inspects KolibriModule class for event key and then registers all events with
 * specified event registration method
 * @param {KolibriModule} kolibri_module - object of KolibriModule class
 * @param {string} events_key - 'events' or 'once'
 * @param {Function} event_listener_method - Mediator.prototype._register_multiple_events or
 * Mediator.prototype._register_one_time_events
 * @private
 */
Mediator.prototype._register_events = function(kolibri_module, events_key, event_listener_method) {
    var events;
    event_listener_method = _.bind(event_listener_method, this);
    // Prevent undefined errors, allow events hash to be either an object or a function.
    if (typeof kolibri_module[events_key] === 'undefined') {
        events = {};
    } else if (typeof kolibri_module[events_key] === 'function') {
        events = kolibri_module[events_key]();
    } else {
        events = kolibri_module[events_key];
    }
    _.forEach(events, function(value, key) {
        event_listener_method(key, kolibri_module, value);
    });
};

/**
 * Method to register events that will fire multiple times until unregistered.
 * @param {KolibriModule} kolibri_module - object of KolibriModule class
 * @private
 */
Mediator.prototype._register_multiple_events = function(kolibri_module) {
    this._register_events(kolibri_module, 'events', this._register_repeated_event_listener);
};

/**
 * Method to register events that will fire only once.
 * @param {KolibriModule} kolibri_module - object of KolibriModule class
 * @private
 */
Mediator.prototype._register_one_time_events = function(kolibri_module) {
    this._register_events(kolibri_module, 'once', this._register_one_time_event_listener);
};

/**
 * Method to register a single repeating event for a particular kolibri_module with a method of that kolibri_module as a
 * callback.
 * @param {string} event - the event name.
 * @param {KolibriModule} kolibri_module - object of KolibriModule class
 * @param {string} method - the name of the method of the KolibriModule object.
 * @private
 */
Mediator.prototype._register_repeated_event_listener = function(event, kolibri_module, method) {
    this._register_event_listener(event, kolibri_module, method, this._event_dispatcher.listenTo);
};

/**
 * Method to register a single one time event for a particular kolibri_module with a method of that kolibri_module as a
 * callback.
 * @param {string} event - the event name.
 * @param {KolibriModule} kolibri_module - object of KolibriModule class
 * @param {string} method - the name of the method of the KolibriModule object.
 * @private
 */
Mediator.prototype._register_one_time_event_listener = function(event, kolibri_module, method) {
    this._register_event_listener(event, kolibri_module, method, this._event_dispatcher.listenToOnce);
};

/**
 * Method to register either a one time or a multitime event and add it to the callback registry of the Mediator object
 * for easy clean up and stopListening later.
 * @param {string} event - the event name.
 * @param {KolibriModule} kolibri_module - object of KolibriModule class
 * @param {string} method - the name of the method of the KolibriModule object.
 * @param {Function} listen_method - Backbone.Events.listenTo or Backbone.Events.listenToOnce
 * @private
 */
Mediator.prototype._register_event_listener = function(event, kolibri_module, method, listen_method) {
    // Create a function that calls the kolibri_module method, while setting 'this' to the kolibri_module itself.
    var callback = function() {kolibri_module[method].apply(kolibri_module, arguments);};
    if (typeof this._callback_registry[kolibri_module.name] === 'undefined') {
        this._callback_registry[kolibri_module.name] = {};
    }
    if (typeof this._callback_registry[kolibri_module.name][event] === 'undefined') {
        this._callback_registry[kolibri_module.name][event] = {};
    }
    // Keep track of this function to allow easy unbinding later.
    this._callback_registry[kolibri_module.name][event][method] = callback;
    listen_method.apply(this._event_dispatcher, [this._event_dispatcher, event, callback]);
};

/**
 * Method to unbind event listeners once they have been registered.
 * @param {string} event - the event name.
 * @param {KolibriModule} kolibri_module - object of KolibriModule class
 * @param {string} method - the name of the method of the KolibriModule object.
 */
Mediator.prototype.stop_listening = function(event, kolibri_module, method) {
    // Allow an event to be unlistened to.
    var callback = ((this._callback_registry[kolibri_module.name] || {})[event] || {})[method];
    if (typeof callback !== 'undefined') {
        this._event_dispatcher.stopListening(this._event_dispatcher, event, callback);
        delete this._callback_registry[kolibri_module.name][event][method];
    }
};

/**
 * Finds all callbacks that were triggered before the kolibri_module was loaded and registered synchronously and
 * executes them in order of creation.
 * @param {KolibriModule} kolibri_module - object of KolibriModule class
 * @private
 */
Mediator.prototype._execute_callback_buffer = function(kolibri_module) {
    if (typeof this._callback_buffer[kolibri_module.name] !== 'undefined') {
        _.forEach(this._callback_buffer[kolibri_module.name], function(buffer) {
            // Do this to ensure proper 'this'ness.
            kolibri_module[buffer.method].apply(kolibri_module, buffer.args);
        });
        delete this._callback_buffer[kolibri_module.name];
    }
};

/**
 * Registers a kolibri_module before it has been loaded into the page. Buffers any events that are fired, causing the
 * arguments to be saved in the callback buffer array for this kolibri_module.
 * @param {string} kolibri_module_name - the name of the kolibri_module
 * @param {string[]} kolibri_module_urls - the URLs of the Javascript and CSS files that constitute the kolibri_module
 * @param {object} events - key, value pairs of event names and methods for repeating callbacks.
 * @param {object} once - key value pairs of event names and methods for one time callbacks.
 */
Mediator.prototype.register_kolibri_module_async = function(kolibri_module_name, kolibri_module_urls, events, once) {
    var self = this;
    // Create a buffer for events that are fired before a kolibri_module has loaded. Keep track of the method and the
    // arguments passed to the callback.
    var callback_buffer = this._callback_buffer[kolibri_module_name] = [];
    // Look at all events, whether listened to once or multiple times.
    var event_array = _.toPairs(events).concat(_.toPairs(once));
    if (typeof this._async_callback_registry[kolibri_module_name] === 'undefined') {
        this._async_callback_registry[kolibri_module_name] = [];
    }
    _.forEach(event_array, function(tuple) {
        var key = tuple[0];
        var value = tuple[1];
        // Create a callback function that will push objects to the callback buffer, and also trigger loading of the
        // the frontend assets that the kolibri_module needs, should an event it is listening for be triggered.
        var callback = function() {
            // First check that the kolibri_module hasn't already been loaded.
            if (typeof self._kolibri_module_registry[kolibri_module_name] === 'undefined') {
                // Add the details about the event callback to the buffer.
                callback_buffer.push({
                    args: arguments,
                    method: value
                });
                // Call the asset loader to load all the kolibri_module files.
                asset_loader([kolibri_module_urls], function(err, notFound) {
                    if (err) {
                        _.forEach(notFound, function (file) {
                            logging.error(file + ' failed to load');
                        });
                    }
                });
            }
        };
        // Listen to the event and call the above function
        self._event_dispatcher.listenTo(self._event_dispatcher, key, callback);
        // Keep track of all these functions for easy cleanup after the kolibri_module has been loaded.
        self._async_callback_registry[kolibri_module_name].push({
            event: key,
            callback: callback
        });
    });
};

/**
 * Function to unbind and remove all callbacks created by the register_kolibri_module_async method.
 * @param {KolibriModule} kolibri_module - object of KolibriModule class
 * @private
 */
Mediator.prototype._clear_async_callbacks = function(kolibri_module) {
    var self = this;
    _.forEach(this._async_callback_registry[kolibri_module.name], function(async) {
        self._event_dispatcher.stopListening(self._event_dispatcher, async.event, async.callback);
    });
    delete this._async_callback_registry[kolibri_module.name];
};

/**
 * Proxy to the Backbone.Events object that is the global dispatcher.
 * Takes any arguments and passes them on.
 */
Mediator.prototype.trigger = function() {
    this._event_dispatcher.trigger.apply(this._event_dispatcher, arguments);
};


module.exports = Mediator;
