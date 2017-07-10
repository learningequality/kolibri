/**
 * Provides the public API for the Kolibri FrontEnd core app.
 * @module Facade
 */

import vue from 'vue';
import vuex from 'vuex';
import VueIntl from 'vue-intl';
import router from 'vue-router';
import Mediator from './mediator';
import constructorExport from './constructorExport';
import logger from '../logging';
import HeartBeat from '../heartbeat';
import importIntlLocale from './import-intl-locale';

const logging = logger.getLogger(__filename);

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
];

/**
 * Constructor for object that forms the public API for the Kolibri
 * core app.
 * @constructor
 */

export default class CoreApp {
  constructor() {
    Object.assign(this, constructorExport());

    const mediator = new Mediator();

    vue.prototype.Kolibri = this;
    /**
     * Use vuex and vue-router.
     */
    vue.use(vuex);
    vue.use(router);
    vue.set(vue, 'bidiDirection', global.languageBidi || 'ltr');

    // Shim window.location.origin for IE.
    if (!window.location.origin) {
      window.location.origin = `${window.location.protocol}//${window.location.hostname}${window
        .location.port
        ? `:${window.location.port}`
        : ''}`;
    }

    const self = this;

    function setUpVueIntl() {
      /**
       * Use the vue-intl plugin.
       **/
      vue.use(VueIntl, { defaultLocale: 'en-us' });

      function $trWrapper(formatter, messageId, args) {
        if (args) {
          if (!Array.isArray(args) && typeof args !== 'object') {
            logging.error(`The $tr functions take either an array of positional
                            arguments or an object of named options.`);
          }
        }
        const defaultMessageText = this.$options.$trs[messageId];
        const message = {
          id: `${this.$options.$trNameSpace}.${messageId}`,
          defaultMessage: defaultMessageText,
        };
        // Allow mirror text in debug mode.
        if (process.env.NODE_ENV === 'debug') {
          if (vue.locale === 'rt-lft') {
            // Use require in conditional import, as it is not clear to me that ES6 imports would get omitted
            const { toFakeRTL } = require('../utils/mirrorText');
            return toFakeRTL(defaultMessageText);
          }
        }
        return formatter(message, args);
      }

      vue.prototype.$tr = function $tr(messageId, args) {
        return $trWrapper.call(this, this.$formatMessage, messageId, args);
      };
      vue.prototype.$trHtml = function $trHtml(messageId, args) {
        return $trWrapper.call(this, this.$formatHTMLMessage, messageId, args);
      };

      if (global.languageCode) {
        vue.setLocale(global.languageCode);
        if (global.coreLanguageMessages) {
          vue.registerMessages(global.languageCode, global.coreLanguageMessages);
        }
      }

      mediator.registerMessages();
      mediator.setReady();
    }

    /**
     * If the browser doesn't support the Intl polyfill, we retrieve that and
     * the modules need to wait until that happens.
     **/
    if (!Object.prototype.hasOwnProperty.call(global, 'Intl')) {
      Promise.all([
        new Promise(resolve => {
          require.ensure([], require => {
            resolve(() => require('intl'));
          });
        }),
        importIntlLocale(global.languageCode),
      ]).then(
        // eslint-disable-line
        requires => {
          // Executes function that requires 'intl'
          requires[0]();
          // Executes function that requires intl locale data - needs intl to have run
          requires[1]();
          setUpVueIntl();
        },
        error => {
          logging.error(error);
          logging.error('An error occurred trying to setup Internationalization', error);
        }
      );
    } else {
      setUpVueIntl();
    }

    // Bind 'this' value for public methods - those that will be exposed in the Facade.
    this.kolibri_modules = mediator._kolibriModuleRegistry;
    publicMethods.forEach(method => {
      this[method] = mediator[method].bind(mediator);
    });
    this.heartBeat = new HeartBeat(this);
  }
}
