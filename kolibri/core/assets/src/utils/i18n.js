import find from 'lodash/find';
import FontFaceObserver from 'fontfaceobserver';
import Lockr from 'lockr';
import vue from 'kolibri.lib.vue';
import logger from '../logging';
import supportedLanguages from '../../../../locale/supported_languages.json';
import importIntlLocale from './intl-locale-data';
import importVueIntlLocaleData from './vue-intl-locale-data';

const logging = logger.getLogger(__filename);

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

  return formatter(message, args);
}

export const languageDirections = {
  LTR: 'ltr',
  RTL: 'rtl',
};

const DEFAULT_LOCALE = 'en';

export const defaultLanguage = {
  id: 'en',
  lang_name: 'English',
  lang_direction: languageDirections.LTR,
};

export const languageValidator = language => {
  return ['id', 'lang_name', 'lang_direction'].reduce((valid, key) => valid && language[key], true);
};

export const availableLanguages = {
  en: defaultLanguage,
};

export let currentLanguage = DEFAULT_LOCALE;

// Default to ltr
export let languageDirection = languageDirections.LTR;

export const getContentLangDir = language => {
  return (language || {}).lang_direction || languageDirections.LTR;
};

export const getLangDir = id => {
  return (availableLanguages[id] || {}).lang_direction || languageDirections.LTR;
};

export const isRtl = id => {
  return getLangDir(id) === languageDirections.RTL;
};

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

function languageIdToCode(id) {
  return id.split('-')[0].toLowerCase();
}

function setLanguageDensity(id) {
  const langCode = languageIdToCode(id);
  // Set the exported languageDensity in JS
  languageDensity = languageDensityMapping[langCode] || languageDensities.englishLike;
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

function _setUpVueIntl() {
  /**
   * Use the vue-intl plugin.
   **/
  const VueIntl = require('vue-intl');
  vue.use(VueIntl, { DEFAULT_LOCALE });
  vue.prototype.isRtl = global.languageDir === 'rtl';
  languageDirection = global.languageDir || languageDirection;

  if (global.languages) {
    Object.assign(availableLanguages, global.languages);
  }

  vue.prototype.$tr = function $tr(messageId, args) {
    const nameSpace = this.$options.name || this.$options.$trNameSpace;
    return $trWrapper(nameSpace, this.$options.$trs, this.$formatMessage, messageId, args);
  };

  vue.setLocale(currentLanguage);
  if (global.coreLanguageMessages) {
    vue.registerMessages(currentLanguage, global.coreLanguageMessages);
  }
  importVueIntlLocaleData().forEach(localeData => VueIntl.addLocaleData(localeData));
}

function _loadFonts() {
  /*
   * On older browsers we load the full fonts asynchronously, but avoid referencing them
   * until they've been fully loaded. This is done by adding a class to the HTML root
   * which has the effect of switching fonts from system defaults to Noto.
   *
   * This prevents the text from being invisible while the fonts are loading ("FOIT")
   * and instead falls back on system fonts while they're loading ("FOUT").
   *
   * NOTE: Currently only the default font for the current language is loaded on older
   * browsers, which means that content in other alphabets will always render using the
   * default system fonts.
   */

  if (global.useModernFontLoading) {
    logging.info(
      'Fonts should be loaded on-demand based on the text currently visible. ' +
        "If you see fonts being loaded unnecessarily, it's a bug!"
    );
    return;
  }

  // We use the <html> element to store CSS class flags
  const htmlEl = document.documentElement;

  // If we have previously loaded the font bail out early
  const LOCAL_STORAGE_KEY = 'font-cache-info';
  const fontCacheInfo = Lockr.get(LOCAL_STORAGE_KEY) || {};
  if (fontCacheInfo[currentLanguage]) {
    htmlEl.classList.add('fonts-loaded');
    logging.debug(`Already loaded full font for '${currentLanguage}'`);
    // TODO: uncomment below
    // return;
  }

  const language = find(supportedLanguages, lang => lang.intl_code == currentLanguage);

  const uiFontObserver = new FontFaceObserver('noto-ui');
  uiFontObserver
    // passing 'language_name' to 'load' for its glyphs, not its value per se
    .load(language.language_name, 20000)
    .then(function() {
      logging.debug(`Loaded full font for '${currentLanguage}'`);
      // update local flag
      htmlEl.classList.add('fonts-loaded');
      // update cache
      fontCacheInfo[currentLanguage] = true;
      Lockr.set(LOCAL_STORAGE_KEY, fontCacheInfo);
    })
    .catch(function() {
      logging.warning(`Could not load full font for '${currentLanguage}'`);
    });
}

export function i18nSetup(skipPolyfill = false) {
  /**
   * Load fonts, app strings, and Intl polyfills
   **/

  // Set up exported module variable
  if (global.languageCode) {
    currentLanguage = global.languageCode;
  }

  // Set up typography
  setLanguageDensity(currentLanguage);
  _loadFonts();

  // If the browser doesn't support the Intl polyfill, we retrieve that and
  // the modules need to wait until that happens.
  return new Promise((resolve, reject) => {
    if (Object.prototype.hasOwnProperty.call(global, 'Intl') || skipPolyfill) {
      _setUpVueIntl();
      resolve();
    } else {
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
        ([requireIntl, requireIntlLocaleData]) => {
          requireIntl(); // requireIntl must run before requireIntlLocaleData
          requireIntlLocaleData();
          _setUpVueIntl();
          resolve();
        },
        error => {
          logging.error(error);
          logging.error('An error occurred trying to setup Internationalization', error);
          reject();
        }
      );
    }
  });
}

export function localeCompare(str1, str2) {
  // Catch if browser does not support extended localeCompare arguments
  try {
    // use 'search' option to ignore case rather than use locale defaults
    return String(str1).localeCompare(String(str2), 'default', { usage: 'search' });
  } catch (e) {
    return String(str1).localeCompare(String(str2));
  }
}
