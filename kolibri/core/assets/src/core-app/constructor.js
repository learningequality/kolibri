/**
 * Provides the public API for the Kolibri FrontEnd core app.
 * @module Facade
 */

import vue from 'vue';
import vuex from 'vuex';
import router from 'vue-router';
import merge from 'lodash/merge';
import { setUpIntl } from '../utils/i18n';
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

    // Assign any overridden core API elements here
    // Use the default object if it has been specified using an ES6 default export.
    merge(this, __coreAPISpec.default || __coreAPISpec);

    const mediator = new Mediator();

    vue.prototype.Kolibri = this;
    /**
     * Use vuex and vue-router.
     */
    vue.use(vuex);
    vue.use(router);

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

    setUpIntl().then(intlReady);

    // Bind 'this' value for public methods - those that will be exposed in the Facade.
    this.kolibri_modules = mediator._kolibriModuleRegistry;
    publicMethods.forEach(method => {
      this[method] = mediator[method].bind(mediator);
    });
  }
}
