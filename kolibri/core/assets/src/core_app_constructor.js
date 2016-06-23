/**
 * Provides the public API for the Kolibri FrontEnd core app.
 * @module Facade
 */

const vue = require('vue');
const VueIntl = require('vue-intl');
const Mediator = require('./core_app_mediator');

/**
 * Array containing the names of all methods of the Mediator that
 * should be exposed publicly through the Facade.
 * @type {string[]}
 */
const publicMethods = [
  'registerKolibriModuleAsync',
  'registerKolibriModuleSync',
  'stopListening',
  'emit',
  'on',
  'once',
];

/**
 * Constructor for lib object that exposes libraries that are shared across all plugins.
 * In addition to being added as properties of kolibriGlobal.lib, they are also made
 * available to be require'd in other webpack-loaded modules and apps. This behavior
 * is configured in webpack.config.js
 * @classdesc
 */
function Lib() {
  // libraries
  this.loglevel = require('loglevel');
  this.vue = vue;
  // views
  this.coreBase = require('./core-base');
  this.contentRenderer = require('./content-renderer');
}

/**
 * Constructor for object that forms the public API for the Kolibri
 * core app.
 * @constructor
 */
module.exports = function CoreApp() {
  this.lib = new Lib();
  const mediator = new Mediator();

  /**
   * Use the vue-intl plugin.
   **/
  vue.use(VueIntl);

  vue.prototype.Kolibri = this;
  /**
   * If the browser doesn't support the Intl polyfill, we retrieve that and
   * the modules need to wait until that happens.
   **/
  if (!global.hasOwnProperty('Intl')) {
    require.ensure(
      [
        'intl',
        'intl/locale-data/jsonp/en.js',
        // add more locales here
      ],
      (require) => {
        require('intl');
        require('intl/locale-data/jsonp/en.js');
        mediator.setReady();
      }
    );
  } else {
    mediator.setReady();
  }

  // Bind 'this' value for public methods - those that will be exposed in the Facade.
  this.kolibri_modules = mediator._kolibriModuleRegistry;
  publicMethods.forEach((method) => {
    this[method] = mediator[method].bind(mediator);
  });
};
