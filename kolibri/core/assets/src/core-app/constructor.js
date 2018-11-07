/**
 * Provides the public API for the Kolibri FrontEnd core app.
 * @module Facade
 */

import Vue from 'vue';
import VueMeta from 'vue-meta';
import VueRouter from 'vue-router';
import Vuex from 'vuex';
import merge from 'lodash/merge';
import { i18nSetup } from '../utils/i18n';
import Mediator from './mediator';
import apiSpec from './apiSpec';

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
  'registerLanguageAssets',
  'registerContentRenderer',
  'retrieveContentRenderer',
  'loadDirectionalCSS',
  'scriptLoader',
  'canRenderContent',
];

/**
 * Constructor for object that forms the public API for the Kolibri
 * core app.
 * @constructor
 */

export default class CoreApp {
  constructor() {
    // Assign API spec
    Object.assign(this, apiSpec);

    const mediator = new Mediator();

    Vue.prototype.Kolibri = this;

    // Register Vue plugins
    Vue.use(Vuex);
    Vue.use(VueRouter);
    Vue.use(VueMeta);

    // Shim window.location.origin for IE.
    if (!window.location.origin) {
      window.location.origin = `${window.location.protocol}//${window.location.hostname}${
        window.location.port ? `:${window.location.port}` : ''
      }`;
    }

    const intlReady = () => {
      mediator.registerMessages();
      mediator.setReady();
    };

    i18nSetup().then(intlReady);

    // Bind 'this' value for public methods - those that will be exposed in the Facade.
    this.kolibri_modules = mediator._kolibriModuleRegistry;
    publicMethods.forEach(method => {
      this[method] = mediator[method].bind(mediator);
    });
  }
}
