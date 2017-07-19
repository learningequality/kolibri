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
  const message = {
    id: `${nameSpace}.${messageId}`,
    defaultMessage: defaultMessageText,
  };

  if (vue.locale === 'rt-lft') {
    message.defaultMessage = toFakeRTL(defaultMessageText);
  }

  return formatter(message, args);
}

const defaultLocale = 'en';

export const availableLanguages = {
  en: {
    code: 'en',
    name: 'English',
  },
};

export let currentLanguage = defaultLocale;

// Default to ltr
export let languageDirection = 'ltr';

export const languageDensities = {
  englishLike: 'english_like',
  tall: 'tall',
  dense: 'dense',
};

export let languageDensity = languageDensities.englishLike;

const languageDensityMapping = {
  ar: languageDensities.tall,
  bn: languageDensities.tall,
  fa: languageDensities.tall,
  gu: languageDensities.tall,
  hi: languageDensities.tall,
  ja: languageDensities.dense,
  km: languageDensities.tall,
  kn: languageDensities.tall,
  ko: languageDensities.dense,
  lo: languageDensities.tall,
  ml: languageDensities.tall,
  mr: languageDensities.tall,
  my: languageDensities.tall,
  ne: languageDensities.tall,
  pa: languageDensities.tall,
  si: languageDensities.tall,
  ta: languageDensities.tall,
  te: languageDensities.tall,
  th: languageDensities.tall,
  ur: languageDensities.tall,
  vi: languageDensities.tall,
  zh: languageDensities.dense,
};

function setLanguageDensity(lang_code) {
  const shortCode = lang_code.split('-')[0].toLowerCase();
  // Set the exported languageDensity in JS
  languageDensity = languageDensityMapping[shortCode] || languageDensities.englishLike;
  // Set the body class for global typography
  global.document.body.classList.add(`language-${languageDensity}`);
}

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
  // For convenience, also proxy all vue intl translation methods on this object
  $formatDate(date, options = {}) {
    return vue.prototype.$formatDate(date, options);
  }
  $formatTime(time, options = {}) {
    return vue.prototype.$formatTime(time, options);
  }
  $formatRelative(date, options = {}) {
    return vue.prototype.$formatRelative(date, options);
  }
  $formatNumber(number, options = {}) {
    return vue.prototype.$formatNumber(number, options);
  }
  $formatPlural(plural, options = {}) {
    return vue.prototype.$formatPlural(plural, options);
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
  const VueIntl = require('vue-intl');

  vue.use(VueIntl, { defaultLocale });

  vue.prototype.isRtl = global.languageDir === 'rtl';

  languageDirection = global.languageDir || languageDirection;

  if (global.languages) {
    Object.assign(availableLanguages, global.languages);
  }

  vue.prototype.$tr = function $tr(messageId, args) {
    const nameSpace = this.$options.name || this.$options.$trNameSpace;
    return $trWrapper(nameSpace, this.$options.$trs, this.$formatMessage, messageId, args);
  };
  vue.prototype.$trHtml = function $trHtml(messageId, args) {
    const nameSpace = this.$options.name || this.$options.$trNameSpace;
    return $trWrapper(nameSpace, this.$options.$trs, this.$formatHTMLMessage, messageId, args);
  };

  if (global.languageCode) {
    currentLanguage = global.languageCode;
    vue.setLocale(currentLanguage);
    setLanguageDensity(currentLanguage);

    if (global.coreLanguageMessages) {
      vue.registerMessages(currentLanguage, global.coreLanguageMessages);
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
          require.ensure(
            ['intl'],
            require => {
              resolve(() => require('intl'));
            },
            'intl'
          );
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
      require.ensure(
        ['./mirrorText'],
        require => {
          toFakeRTL = require('./mirrorText').default;
          setUpVueIntl();
          resolve();
        },
        'fakeRtl'
      );
    } else {
      setUpVueIntl();
      resolve();
    }
  });
}
