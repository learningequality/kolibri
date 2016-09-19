'use strict';
/**
 * Mediator module.
 * Provides the main controller and event dispatcher for the Kolibri FrontEnd core app.
 * @module Mediator
 */


const assetLoader = require('./asset-loader');
const Vue = require('vue');
const logging = require('kolibri/lib/logging').getLogger(__filename);

/**
 * @constructor
 * @classdesc The Mediator class - registers and loads kolibri_modules and acts as
 * a global event dispatcher.
 */
module.exports = class Mediator {
  constructor() {
    /**
     * Keep track of all registered kolibri_modules - object is of form:
     * kolibriModuleName: kolibri_module_object
     **/
    this._kolibriModuleRegistry = {};

    /**
     * Keep track of all callbacks that have been fired for as yet unloaded modules.
     * kolibriModuleName: {Function[]} of callbacks
     **/
    this._callbackBuffer = {};

    /**
     * Keep track of all registered callbacks bound to events - this allows for easier
     * stopListening later.
     * kolibriModuleName: {object} - event: {object} - method: callback function
     **/
    this._callbackRegistry = {};

    /**
     * Keep track of all registered async callbacks bound to events - this allows for
     * easier stopListening later.
     * kolibriModuleName: {object[]} - with keys 'event' and 'callback'.
     **/
    this._asyncCallbackRegistry = {};

    // we use a Vue object solely for its event functionality
    this._eventDispatcher = new Vue();

    // wait to call kolibri_module `ready` until dependencies are loaded
    this._ready = false;
  }

  /**
   * Trigger 'ready' function on all registered modules
   **/
  setReady() {
    this._ready = true;
    this.emit('ready');
  }

  /**
   * @param {KolibriModule} kolibriModule - object of KolibriModule class
   * @description Registers a kolibriModule that has already been loaded into the
   * frontend. Registers event listeners for multiple time and one time events.
   * When all event listeners have been registered, any buffered callbacks are passed
   * to the KolibriModule object, in case it was previously registered asynchronously.
   */
  registerKolibriModuleSync(kolibriModule) {
    // Register all events that will be called repeatedly.
    this._registerMultipleEvents(kolibriModule);
    // Register all events that are listened to once and then unbound.
    this._registerOneTimeEvents(kolibriModule);

    // Create an entry in the kolibriModule registry.
    this._kolibriModuleRegistry[kolibriModule.name] = kolibriModule;

    // Clear any previously bound asynchronous callbacks for this kolibriModule.
    this._clearAsyncCallbacks(kolibriModule);

    // Execute any callbacks that were called before the kolibriModule had loaded,
    // in the order that they happened.
    this._executeCallbackBuffer(kolibriModule);
    logging.info(`KolibriModule: ${kolibriModule.name} registered`);
    this.emit('kolibri_register', kolibriModule);
    if (this._ready) {
      kolibriModule.ready();
    } else {
      this._eventDispatcher.$once('ready', () => {
        kolibriModule.ready();
      });
    }
  }

  /**
   * Generic event registration method - inspects KolibriModule class for event
   * key and then registers all events with
   * specified event registration method
   * @param {KolibriModule} kolibriModule - object of KolibriModule class
   * @param {string} eventsKey - 'events' or 'once'
   * @param {Function} eventListenerMethod - Mediator.prototype._registerMultipleEvents or
   * Mediator.prototype._registerOneTimeEvents
   * @private
   */
  _registerEvents(kolibriModule, eventsKey, eventListenerMethod) {
    let events;
    const boundEventListenerMethod = eventListenerMethod.bind(this);
    // Prevent undefined errors, allow events hash to be either an object or a function.
    if (typeof kolibriModule[eventsKey] === 'undefined') {
      events = {};
    } else if (typeof kolibriModule[eventsKey] === 'function') {
      events = kolibriModule[eventsKey]();
    } else {
      events = kolibriModule[eventsKey];
    }
    for (const key of Object.getOwnPropertyNames(events)) {
      boundEventListenerMethod(key, kolibriModule, events[key]);
    }
  }

  /**
   * Method to register events that will fire multiple times until unregistered.
   * @param {KolibriModule} kolibriModule - object of KolibriModule class
   * @private
   */
  _registerMultipleEvents(kolibriModule) {
    this._registerEvents(kolibriModule, 'events', this._registerRepeatedEventListener);
  }

  /**
   * Method to register events that will fire only once.
   * @param {KolibriModule} kolibriModule - object of KolibriModule class
   * @private
   */
  _registerOneTimeEvents(kolibriModule) {
    this._registerEvents(kolibriModule, 'once', this._registerOneTimeEventListener);
  }

  /**
   * Method to register a single repeating event for a particular kolibriModule
   * with a method of that kolibriModule as a
   * callback.
   * @param {string} event - the event name.
   * @param {KolibriModule} kolibriModule - object of KolibriModule class
   * @param {string} method - the name of the method of the KolibriModule object.
   * @private
   */
  _registerRepeatedEventListener(event, kolibriModule, method) {
    this._registerEventListener(event, kolibriModule, method, this._eventDispatcher.$on);
  }

  /**
   * Method to register a single one time event for a particular kolibriModule
   * with a method of that kolibriModule as a callback.
   * @param {string} event - the event name.
   * @param {KolibriModule} kolibriModule - object of KolibriModule class
   * @param {string} method - the name of the method of the KolibriModule object.
   * @private
   */
  _registerOneTimeEventListener(event, kolibriModule, method) {
    this._registerEventListener(event, kolibriModule, method, this._eventDispatcher.$once);
  }

  /**
   * Method to register either a one time or a multitime event and add it to the
   * callback registry of the Mediator object for easy clean up and stopListening
   * later.
   * @param {string} event - the event name.
   * @param {KolibriModule} kolibriModule - object of KolibriModule class
   * @param {string} method - the name of the method of the KolibriModule object.
   * @param {Function} listenMethod - Backbone.Events.listenTo or Backbone.Events.listenToOnce
   * @private
   */
  _registerEventListener(event, kolibriModule, method, listenMethod) {
    // Create a function that calls the kolibriModule method, while setting
    // 'this' to the kolibriModule itself.
    function callback(...args) {
      kolibriModule[method].apply(kolibriModule, ...args);
    }
    if (typeof this._callbackRegistry[kolibriModule.name] === 'undefined') {
      this._callbackRegistry[kolibriModule.name] = {};
    }
    if (typeof this._callbackRegistry[kolibriModule.name][event] === 'undefined') {
      this._callbackRegistry[kolibriModule.name][event] = {};
    }
    // Keep track of this function to allow easy unbinding later.
    this._callbackRegistry[kolibriModule.name][event][method] = callback;
    listenMethod.apply(this._eventDispatcher, [event, callback]);
  }

  /**
   * Method to unbind event listeners once they have been registered.
   * @param {string} event - the event name.
   * @param {KolibriModule} kolibriModule - object of KolibriModule class
   * @param {string} method - the name of the method of the KolibriModule object.
   */
  stopListening(event, kolibriModule, method) {
    // Allow an event to be unlistened to.
    const callback = ((this._callbackRegistry[kolibriModule.name] || {})[event] || {})[method];
    if (typeof callback !== 'undefined') {
      this._eventDispatcher.$off(event, callback);
      delete this._callbackRegistry[kolibriModule.name][event][method];
    }
  }

  /**
   * Finds all callbacks that were called before the kolibriModule was loaded
   * and registered synchronously and
   * executes them in order of creation.
   * @param {KolibriModule} kolibriModule - object of KolibriModule class
   * @private
   */
  _executeCallbackBuffer(kolibriModule) {
    if (typeof this._callbackBuffer[kolibriModule.name] !== 'undefined') {
      this._callbackBuffer[kolibriModule.name].forEach((buffer) => {
        // Do this to ensure proper 'this'ness.
        kolibriModule[buffer.method].apply(kolibriModule, buffer.args);
      });
      delete this._callbackBuffer[kolibriModule.name];
    }
  }

  /**
   * Registers a kolibriModule before it has been loaded into the page. Buffers
   * any events that are fired, causing the
   * arguments to be saved in the callback buffer array for this kolibriModule.
   * @param {string} kolibriModuleName - the name of the kolibriModule
   * @param {string[]} kolibriModuleUrls - the URLs of the Javascript and CSS
   * files that constitute the kolibriModule
   * @param {object} events - key, value pairs of event names and methods for
   * repeating callbacks.
   * @param {object} once - key value pairs of event names and methods for one
   * time callbacks.
   */
  registerKolibriModuleAsync(kolibriModuleName, kolibriModuleUrls, events, once) {
    const self = this;
    // Create a buffer for events that are fired before a kolibriModule has
    // loaded. Keep track of the method and the arguments passed to the callback.
    const callbackBuffer = this._callbackBuffer[kolibriModuleName] = [];
    // Look at all events, whether listened to once or multiple times.
    const eventArray = [];
    for (const key of Object.getOwnPropertyNames(events)) {
      eventArray.push([key, events[key]]);
    }
    for (const key of Object.getOwnPropertyNames(once)) {
      eventArray.push([key, once[key]]);
    }
    if (typeof this._asyncCallbackRegistry[kolibriModuleName] === 'undefined') {
      this._asyncCallbackRegistry[kolibriModuleName] = [];
    }
    eventArray.forEach((tuple) => {
      const key = tuple[0];
      const value = tuple[1];
      // Create a callback function that will push objects to the callback buffer,
      // and also cause loading of the the frontend assets that the kolibriModule
      // needs, should an event it is listening for be emitted.
      const callback = (...args) => {
        // First check that the kolibriModule hasn't already been loaded.
        if (typeof self._kolibriModuleRegistry[kolibriModuleName] === 'undefined') {
          // Add the details about the event callback to the buffer.
          callbackBuffer.push({
            args,
            method: value,
          });
          // Call the asset loader to load all the kolibriModule files.
          assetLoader(kolibriModuleUrls, (err, notFound) => {
            if (err) {
              notFound.forEach((file) => {
                logging.error(`${file} failed to load`);
              });
            }
          });
        }
      };
      // Listen to the event and call the above function
      self._eventDispatcher.$on(key, callback);
      // Keep track of all these functions for easy cleanup after the kolibriModule has been loaded.
      self._asyncCallbackRegistry[kolibriModuleName].push({
        event: key,
        callback,
      });
    });
  }

  /**
   * Function to unbind and remove all callbacks created by the registerKolibriModuleAsync method.
   * @param {KolibriModule} kolibriModule - object of KolibriModule class
   * @private
   */
  _clearAsyncCallbacks(kolibriModule) {
    (this._asyncCallbackRegistry[kolibriModule.name] || []).forEach((async) => {
      this._eventDispatcher.$off(async.event, async.callback);
    });
    delete this._asyncCallbackRegistry[kolibriModule.name];
  }

  /**
   * Proxy to the Vue object that is the global dispatcher.
   * Takes any arguments and passes them on.
   */
  emit(...args) {
    this._eventDispatcher.$emit(...args);
  }
  /**
   * Proxy to the Vue object that is the global dispatcher.
   * Takes any arguments and passes them on.
   */
  on(...args) {
    this._eventDispatcher.$on(...args);
  }
  /**
   * Proxy to the Vue object that is the global dispatcher.
   * Takes any arguments and passes them on.
   */
  once(...args) {
    this._eventDispatcher.$once(...args);
  }
  /**
   * Proxy to the Vue object that is the global dispatcher.
   * Takes any arguments and passes them on.
   */
  off(...args) {
    this._eventDispatcher.$off(...args);
  }
};
