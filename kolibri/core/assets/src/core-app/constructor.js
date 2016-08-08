/**
 * Provides the public API for the Kolibri FrontEnd core app.
 * @module Facade
 */

const vue = require('vue');
const vuex = require('vuex');
const Mediator = require('./mediator');
const ResourceManager = require('../api-resource').ResourceManager;
const Resources = require('../api-resources');

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
  'off',
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
  this.logging = require('../logging');
  this.vue = vue;
  this.vuex = vuex;
  this.coreBase = require('../vue/core-base');
  this.contentRenderer = require('../vue/content-renderer');
}

/**
 * Constructor for object that forms the public API for the Kolibri
 * core app.
 * @constructor
 */
module.exports = function CoreApp() {
  this.lib = new Lib();
  this.resources = new ResourceManager(this);
  const mediator = new Mediator();

  this.constants = require('../constants');

  Object.keys(Resources).forEach((resourceClassName) =>
    this.resources.registerResource(resourceClassName, Resources[resourceClassName]));

  vue.prototype.Kolibri = this;
  /**
   * Use vuex for state management.
   */
  vue.use(vuex);

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
        /**
         * Use the vue-intl plugin.
         **/
        const VueIntl = require('vue-intl');
        vue.use(VueIntl);
        mediator.setReady();
      }
    );
  } else {
    /**
     * Use the vue-intl plugin.
     **/
    const VueIntl = require('vue-intl');
    vue.use(VueIntl);
    mediator.setReady();
  }

  // Bind 'this' value for public methods - those that will be exposed in the Facade.
  this.kolibri_modules = mediator._kolibriModuleRegistry;
  publicMethods.forEach((method) => {
    this[method] = mediator[method].bind(mediator);
  });
};
