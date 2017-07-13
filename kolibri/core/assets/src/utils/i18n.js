import VueIntl from 'vue-intl';
import vue from 'kolibri.lib.vue';
import logger from '../logging';
import importIntlLocale from './import-intl-locale';

const logging = logger.getLogger(__filename);

let toFakeRTL;
// This will get set during initialization if the dummy language
// has been activated

function $trWrapper(nameSpace, defaultMessages, formatter, messageId, args) {
  if (args) {
    if (!Array.isArray(args) && typeof args !== 'object') {
      logging.error(`The $tr functions take either an array of positional
                      arguments or an object of named options.`);
    }
  }
  const defaultMessageText = defaultMessages[messageId];

  if (vue.locale === 'rt-lft') {
    message.defaultMessage = toFakeRTL(defaultMessageText);
  }

  const message = {
    id: `${nameSpace}.${messageId}`,
    defaultMessage: defaultMessageText,
  };
  return formatter(message, args);
}

// Default to ltr
export let languageDirection = 'ltr';

/**
 * Class exposing translation functions for a particular message name space.
 * @class
 */
class Translator {
  /**
   * Create a Translator object.
   * @param {string} nameSpace - The nameSpace of the messages for translation.
   * @param {object} defaultMessages - an object mapping message ids to default messages.
   */
  constructor(nameSpace, defaultMessages) {
    this.nameSpace = nameSpace;
    this.defaultMessages = defaultMessages;
  }
  $tr(messageId, args) {
    return $trWrapper(
      this.nameSpace,
      this.defaultMessages,
      vue.prototype.$formatMessage,
      messageId,
      args
    );
  }
}

/**
 * Returns a Translator instance.
 * @param {string} nameSpace - The nameSpace of the messages for translation.
 * @param {object} defaultMessages - an object mapping message ids to default messages.
 */
export function createTranslator(nameSpace, defaultMessages) {
  return new Translator(nameSpace, defaultMessages);
}

function setUpVueIntl() {
  /**
   * Use the vue-intl plugin.
   **/
  vue.use(VueIntl, { defaultLocale: 'en-us' });

  vue.prototype.isRtl = global.languageBidi === 'rtl';

  languageDirection = global.languageBidi || languageDirection;

  vue.prototype.$tr = function $tr(messageId, args) {
    const nameSpace = this.$options.name || this.$options.$trNameSpace;
    return $trWrapper(nameSpace, this.$options.$trs, this.$formatMessage, messageId, args);
  };
  vue.prototype.$trHtml = function $trHtml(messageId, args) {
    const nameSpace = this.$options.name || this.$options.$trNameSpace;
    return $trWrapper(nameSpace, this.$options.$trs, this.$formatHTMLMessage, messageId, args);
  };

  if (global.languageCode) {
    vue.setLocale(global.languageCode);
    if (global.coreLanguageMessages) {
      vue.registerMessages(global.languageCode, global.coreLanguageMessages);
    }
  }
}

export function setUpIntl() {
  /**
   * If the browser doesn't support the Intl polyfill, we retrieve that and
   * the modules need to wait until that happens.
   **/
  return new Promise((resolve, reject) => {
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
          resolve();
        },
        error => {
          logging.error(error);
          logging.error('An error occurred trying to setup Internationalization', error);
          reject();
        }
      );
    } else if (global.languageCode === 'rt-lft') {
      require.ensure([], () => {
        toFakeRTL = require('./mirrorText').toFakeRTL;
        setUpVueIntl();
        resolve();
      });
    } else {
      setUpVueIntl();
      resolve();
    }
  });
}
