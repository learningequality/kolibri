/**
 * Provides the public API for the Kolibri FrontEnd core app.
 * @module Facade
 */

const vue = require('vue');
const vuex = require('vuex');
const router = require('vue-router');
const Mediator = require('./mediator');
const ResourceManager = require('../api-resource').ResourceManager;
const Resources = require('../api-resources');
const rest = require('rest');
const mime = require('rest/interceptor/mime');
const csrf = require('rest/interceptor/csrf');
const errorCode = require('rest/interceptor/errorCode');
const cookiejs = require('js-cookie');
const constructorExport = require('./constructorExport');
const logging = require('../logging');
const HeartBeat = require('../heartbeat');
const importIntlLocale = require('./import-intl-locale');


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

module.exports = class CoreApp {
  constructor() {
    Object.assign(this, constructorExport());

    this.resources = new ResourceManager(this);
    const mediator = new Mediator();

    Object.keys(Resources).forEach((resourceClassName) =>
      this.resources.registerResource(resourceClassName, Resources[resourceClassName]));

    vue.prototype.Kolibri = this;
    /**
     * Use vuex and vue-router.
     */
    vue.use(vuex);
    vue.use(router);

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
        // Allow string reversal in debug mode.
        if (process.env.NODE_ENV === 'debug') {
          if (self.i18n.reversed) {
            return defaultMessageText.split('').reverse().join('');
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
      Promise.all([(new Promise((resolve) => {
        require.ensure([], (require) => {
          resolve(() => require('intl'));
        });
      })), importIntlLocale(global.languageCode)]).then( // eslint-disable-line
        (requires) => {
          // Executes function that requires 'intl'
          requires[0]();
          // Executes function that requires intl locale data - needs intl to have run
          requires[1]();
          setUpVueIntl();
        },
        (error) => {
          logging.error(error);
          logging.error('An error occurred trying to setup Internationalization', error);
        });
    } else {
      setUpVueIntl();
    }

    // Bind 'this' value for public methods - those that will be exposed in the Facade.
    this.kolibri_modules = mediator._kolibriModuleRegistry;
    publicMethods.forEach((method) => {
      this[method] = mediator[method].bind(mediator);
    });
    this.heartBeat = new HeartBeat(this);
  }

  get client() {
    return (options) => {
      if ((options && typeof options === 'object' && !Array.isArray(options)) &&
        (!options.method || options.method === 'GET')) {
        if (!options.params) {
          options.params = {};
        }
        const cacheBust = new Date().getTime();
        options.params[cacheBust] = cacheBust;
      }
      return rest.wrap(mime, { mime: 'application/json' }).wrap(csrf, { name: 'X-CSRFToken',
        token: cookiejs.get('csrftoken') }).wrap(errorCode)(options);
    };
  }
};
