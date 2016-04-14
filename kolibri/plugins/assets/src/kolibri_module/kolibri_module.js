'use strict';
/**
 * KolibriModule module.
 * Provides the base class for Kolibri Modules - all Kolibri Modules must extend this Base class.
 * @module kolibri_module
 */

var Kolibri = require('kolibri');
var _ = require('lodash');
var Backbone = require('backbone');

/**
 * The constructor function for the base KolibriModule object.
 * @param {object} options - an options hash to set properties of the object.
 * @constructor
 */
var KolibriModule = function (options) {
    // __kolibri_module_name is replaced during webpack compilation with the name derived from the Python module name
    // and the name of the class that defines the frontend kolibri_module.
    this.name = __kolibri_module_name;

    // Insert the event hashes defined in the Python code.
    this.events = __events;
    this.once = __once;
    _.extend(this, _.pick(options, this.kolibri_module_options));
    // Pass all arguments to the constructor directly to initialize for easy access.
    this.initialize.apply(this, arguments);
    // Register the kolibri_module with the Kolibri core app.
    this._register_kolibri_module();
};

/**
 * An array of options to select from the options object passed into the constructor.
 * @type {string[]}
 */
KolibriModule.prototype.kolibri_module_options = [];

/**
 * Method to automatically register the kolibri_module with the Koliri core app once it has initialized.
 * @private
 */
KolibriModule.prototype._register_kolibri_module = function() {
    Kolibri.register_kolibri_module_sync(this);
};

/**
 * A dummy initialization function - this function will be passed anything passed to the constructor.
 * Useful for setting up the kolibri_module before it is registered against the Kolibri core app.
 */
KolibriModule.prototype.initialize = function() {};

/**
 * Convenience method to unregister the kolibri_module from listening to certain events.
 * @param {string} event - the event name
 * @param {string} method - the name of the method to unbind
 */
KolibriModule.prototype.stop_listening = function(event, method) {
    Kolibri.stop_listening(event, this, method);
};

/**
 * Convenience method to fire an event on the global Mediator and pass in a data payload.
 * @param {string} event - the event name
 * @param [arguments] arguments - additional arguments to the event handler.
 */
KolibriModule.prototype.trigger = function() {
    Kolibri.trigger.apply(Kolibri, arguments);
};


// The Backbone Model extend method is a standalone function that is used to extend many Backbone objects.
// We use it here in preference to rolling our own to allow for extension of Plugins.

KolibriModule.extend = Backbone.Model.extend;

module.exports = KolibriModule;
