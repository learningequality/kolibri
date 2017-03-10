/**
 * KolibriModule module.
 * Provides the base class for Kolibri Modules - all Kolibri Modules must extend this Base class.
 * @module kolibriModule
 */

const coreApp = require('kolibri');

module.exports = class KolibriModule {
  /**
   * An array of options to select from the options object passed into the constructor.
   * @type {string[]}
   */
  get kolibriModuleOptions() {
    return [];
  }
  /**
  * The constructor function for the base KolibriModule object.
  * @param {object} options - an options hash to set properties of the object.
  * @param {Array} args - any additional arguments that will be passed to initialize.
  * @constructor
  */
  constructor(options, ...args) {
    /* eslint-disable no-undef */
    // __kolibriModuleName is replaced during webpack compilation with the name derived from
    // the Python module name and the name of the class that defines the frontend kolibriModule.
    this.name = __kolibriModuleName;
    // Insert the event hashes defined in the Python code.
    this.events = __events;
    this.once = __once;
    /* eslint-enable no-undef */
    const safeOptions = {};
    this.kolibriModuleOptions.forEach((option) => {
      if (options[option]) {
        safeOptions[option] = options[option];
      }
    });
    Object.assign(this, safeOptions);
    // Pass all arguments to the constructor directly to initialize for easy access.
    this.initialize(options, ...args);
    // Register the kolibriModule with the Kolibri core app.
    this._registerKolibriModule();
  }

  /**
   * Method to automatically register the kolibriModule with the Kolibri core app once it has
   * initialized.
   * @private
   */
  _registerKolibriModule() {
    coreApp.registerKolibriModuleSync(this);
  }

  /**
   * A dummy initialization function - this function will be passed anything passed to the
   * constructor.
   * Useful for setting up the kolibriModule before it is registered against the Kolibri core app.
   */
  initialize() {
  }

  /**
   * A dummy ready function
   * Useful for initiating behaviour of the kolibriModule after it is registered against the
   * Kolibri core app.
   */
  ready() {
  }

  /**
   * Convenience method to unregister the kolibriModule from listening to certain events.
   * @param {string} event - the event name
   * @param {string} method - the name of the method to unbind
   */
  stopListening(event, method) {
    coreApp.stopListening(event, this, method);
  }

  /**
   * Convenience method to fire an event on the global Mediator and pass in a data payload.
   * @param {string} event - the event name
   * @param {Array} args - additional arguments to the event handler.
   */
  emit(...args) {
    coreApp.emit(...args);
  }
};
