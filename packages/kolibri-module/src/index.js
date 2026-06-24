/**
 * KolibriModule module.
 * Provides the base class for Kolibri Modules - all Kolibri Modules must extend this Base class.
 * @module kolibriModule
 */

import coreApp from 'kolibri';

export default class KolibriModule {
  /**
   * An array of options to select from the options object passed into the constructor.
   * @type {string[]}
   */
  get kolibriModuleOptions() {
    return [];
  }
  /**
   * The constructor function for the base KolibriModule object.
   * @class
   * @param {object} options - An options hash to set properties of the object.
   * @param {Array} args - Any additional arguments that will be passed to initialize.
   */
  constructor(options, ...args) {
    /* eslint-disable no-undef */
    // __kolibriModuleName is replaced during webpack compilation with the name derived from
    // the unique_slug that is defined on the class that defines the frontend kolibriModule.
    this.name = __kolibriModuleName;
    /* eslint-enable no-undef */
    const safeOptions = {};
    this.kolibriModuleOptions.forEach(option => {
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
  initialize() {}

  /**
   * A dummy ready function
   * Useful for initiating behaviour of the kolibriModule after it is registered against the
   * Kolibri core app.
   */
  ready() {}

  get Kolibri() {
    return coreApp;
  }
}
