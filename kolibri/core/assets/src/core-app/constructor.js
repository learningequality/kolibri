/**
 * Provides the public API for the Kolibri FrontEnd core app.
 * @module Facade
 */

const vue = require('vue');
const vuex = require('vuex');
const Mediator = require('./mediator');
const ResourceManager = require('../api-resource').ResourceManager;
const Resources = require('../api-resources');
const rest = require('rest');
const mime = require('rest/interceptor/mime');
const csrf = require('rest/interceptor/csrf');
const errorCode = require('rest/interceptor/errorCode');
const cookiejs = require('js-cookie');
const constructorExport = require('./constructorExport');


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
  'registerLanguageAssetsUrl',
];

/**
 * Constructor for object that forms the public API for the Kolibri
 * core app.
 * @constructor
 */

module.exports = class CoreApp {
  constructor() {
    Object.assign(this, constructorExport());

    this.resources = new ResourceManager(this);
    const mediator = new Mediator();

    Object.keys(Resources).forEach((resourceClassName) =>
      this.resources.registerResource(resourceClassName, Resources[resourceClassName]));

    vue.prototype.Kolibri = this;
    /**
     * Use vuex for state management.
     */
    vue.use(vuex);

    // Register global components
    vue.component('content-renderer', require('../vue/content-renderer'));
    vue.component('download-button', require('../vue/content-renderer/download-button'));
    vue.component('loading-spinner', require('../vue/loading-spinner'));
    vue.component('core-modal', require('../vue/core-modal'));
    vue.component('progress-bar', require('../vue/progress-bar'));
    vue.component('content-icon', require('../vue/content-icon'));
    vue.component('core-base', require('../vue/core-base'));

    this.i18n = {
      reversed: false,
    };

    // Shim window.location.origin for IE.
    if (!window.location.origin) {
      window.location.origin = `${window.location.protocol}//${window.location.hostname}${(
            window.location.port ? `:${window.location.port}` : '')}`;
    }

    const self = this;

    function setUpVueIntl() {
      /**
       * Use the vue-intl plugin.
       **/
      const VueIntl = require('vue-intl');
      vue.use(VueIntl, { defaultLocale: 'en-us' });

      vue.prototype.$tr = function $tr(messageId, ...args) {
        const defaultMessageText = this.$options.$trs[messageId];
        const message = {
          id: `${this.$options.$trNameSpace}.${messageId}`,
          defaultMessage: defaultMessageText,
        };
        // Allow string reversal in debug mode.
        if (process.env.NODE_ENV === 'debug') {
          if (self.i18n.reversed) {
            return defaultMessageText.split('').reverse().join('');
          }
        }
        return this.$formatMessage(message, ...args);
      };
      vue.prototype.$trHtml = function $trHtml(messageId, ...args) {
        const defaultMessageText = this.$options.$trs[messageId];
        const message = {
          id: `${this.$options.$trNameSpace}.${messageId}`,
          defaultMessage: defaultMessageText,
        };
        // Allow string reversal in debug mode.
        if (process.env.NODE_ENV === 'debug') {
          if (self.i18n.reversed) {
            return defaultMessageText.split('').reverse().join('');
          }
        }
        return this.$formatHTMLMessage(message, ...args);
      };

      if (global.languageCode) {
        vue.setLocale(global.languageCode);
        if (global.coreLanguageMessages) {
          vue.registerMessages(global.languageCode, global.coreLanguageMessages);
        }
      }

      mediator.setReady();
    }

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

          setUpVueIntl();
        }
      );
    } else {
      setUpVueIntl();
    }

    // Bind 'this' value for public methods - those that will be exposed in the Facade.
    this.kolibri_modules = mediator._kolibriModuleRegistry;
    publicMethods.forEach((method) => {
      this[method] = mediator[method].bind(mediator);
    });
  }

  get client() {
    return rest.wrap(mime, { mime: 'application/json' }).wrap(csrf, { name: 'X-CSRFToken',
        token: cookiejs.get('csrftoken') }).wrap(errorCode);
  }
};
