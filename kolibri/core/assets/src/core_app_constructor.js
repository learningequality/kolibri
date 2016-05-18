/**
 * Provides the public API for the Kolibri FrontEnd core app.
 * @module Facade
 */

import Mediator from './core_app_mediator';

/**
 * Array containing the names of all methods of the Mediator that
 * should be exposed publicly through the Facade.
 * @type {string[]}
 */
const publicMethods = [
  'register_kolibri_module_async',
  'register_kolibri_module_sync',
  'stop_listening',
  'emit',
];

/**
 * Constructor for lib object that exposes third party libraries that
 * we bundle into the core app.
 * @classdesc
 */
function Lib() {
  this.loglevel = require('loglevel');
  this.vue = require('vue');
}

/**
 * Constructor for object that forms the public API for the Kolibri
 * core app.
 * @constructor
 */
module.exports = function CoreApp() {
  this.lib = new Lib();
  const mediator = new Mediator();

  // Bind 'this' value for public methods - those that will be exposed in the Facade.
  this.kolibri_modules = mediator._kolibri_module_registry;
  publicMethods.forEach((method) => {
    this[method] = mediator[method].bind(mediator);
  });
};
