/**
 * Provides the public API for the Kolibri FrontEnd core app.
 * @module Facade
 */

const Mediator = require('./core_app_mediator');
const _ = require('lodash');

/**
 * Array containing the names of all methods of the Mediator that
 * should be exposed publicly through the Facade.
 * @type {string[]}
 */
const publicMethods = [
  'register_kolibri_module_async',
  'register_kolibri_module_sync',
  'stop_listening',
  'trigger',
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
  this.Backbone = require('backbone');
  this.loglevel = require('loglevel');
  this.vue = require('vue');
  this._ = require('lodash');

  // views
  this.coreBase = require('./core-base');
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
  _.bindAll(mediator, publicMethods);
  this.kolibri_modules = mediator._kolibri_module_registry;
  _.extend(this, _.pick(mediator, publicMethods));
};
