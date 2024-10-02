import has from 'lodash/has';
import Vue from 'kolibri.lib.vue';
import logger from 'kolibri.lib.logging';
import plugin_data from 'plugin_data';
import importIntlLocale from './intl-locale-data';
import importVueIntlLocaleData from './vue-intl-locale-data';
import setupAndLoadFonts from './setupAndLoadFonts';

export const languageDirections = {
  LTR: 'ltr',
  RTL: 'rtl',
};

export const defaultLanguage = {
  id: 'en',
  lang_name: 'English',
  lang_direction: languageDirections.LTR,
};

export const languageValidator = language => {
  return ['id', 'lang_name', 'lang_direction'].reduce((valid, key) => valid && language[key], true);
};

export const getContentLangDir = language => {
  return (language || {}).lang_direction || languageDirections.LTR;
};

const contentLanguageCodes = {
  ff: ['ful', 'fuv'],
  ny: ['nya'],
  sw: ['swa'],
  yo: ['yor'],
};

export const getContentLangActive = language => {
  const langCode = languageIdToCode(currentLanguage);
  const additionalCodes = contentLanguageCodes[langCode] || [];
  if (language.id.toLowerCase() === currentLanguage.toLowerCase()) {
    // Best possible match, return a 2 to have it still be truthy, but distinguishable
    // from a 1 which is a lang_code match
    return 2;
  }
  if (language.lang_code === langCode || additionalCodes.includes(language.lang_code)) {
    return 1;
  }
  return 0;
};

const logging = logger.getLogger(__filename);

const languageGlobals = plugin_data['languageGlobals'] || {};

let _i18nReady = false;

function $trWrapper(nameSpace, defaultMessages, formatter, messageId, args) {
  if (!_i18nReady) {
    throw 'Translator used before i18n is ready';
  }
  if (args) {
    if (!Array.isArray(args) && typeof args !== 'object') {
      logging.error(`The $tr functions take either an array of positional
                      arguments or an object of named options.`);
    }
  }

  // Handle the possibility that the message is defined with an object including context.
  const messageValue = defaultMessages[messageId];
  const defaultMessageText =
    typeof messageValue === 'object' && has(messageValue, 'message')
      ? messageValue.message
      : messageValue;

  const message = {
    id: `${nameSpace}.${messageId}`,
    defaultMessage: defaultMessageText,
  };

  return formatter(message, args);
}

const defaultLocale = defaultLanguage.id;

export const availableLanguages = {
  ...(languageGlobals.languages || { [defaultLocale]: defaultLanguage }),
};

export const currentLanguage = languageGlobals.languageCode || defaultLocale;

// Default to ltr
export const languageDirection = languageGlobals.languageDir || languageDirections.LTR;

export function getLangDir(id) {
  return (availableLanguages[id] || {}).lang_direction || languageDirections.LTR;
}

export function isRtl(id) {
  return getLangDir(id) === languageDirections.RTL;
}

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

export function languageIdToCode(id) {
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
    this._nameSpace = nameSpace;
    this._defaultMessages = defaultMessages;
    for (const key in defaultMessages) {
      this[`${key}$`] = this.$tr.bind(this, key);
    }
  }
  $tr(messageId, args) {
    return $trWrapper(
      this._nameSpace,
      this._defaultMessages,
      Vue.prototype.$formatMessage,
      messageId,
      args,
    );
  }
  // For convenience, also proxy all vue intl translation methods on this object
  $formatDate(date, options = {}) {
    return Vue.prototype.$formatDate(date, options);
  }
  $formatTime(time, options = {}) {
    return Vue.prototype.$formatTime(time, options);
  }
  $formatRelative(date, options = {}) {
    return Vue.prototype.$formatRelative(date, options);
  }
  $formatNumber(number, options = {}) {
    return Vue.prototype.$formatNumber(number, options);
  }
  $formatPlural(plural, options = {}) {
    return Vue.prototype.$formatPlural(plural, options);
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

/**
 * Returns a Translator instance that can grab strings from another component.
 * WARNINGS:
 *  - Cannot be used across plugin boundaries
 *  - Use sparingly, e.g. to bypass string freeze
 *  - Try to remove post-string-freeze
 * @param {Component} Component - An imported component.
 */
export function crossComponentTranslator(Component) {
  return new Translator(Component.name, Component.$trs);
}

function _setUpVueIntl() {
  /**
   * Use the vue-intl plugin.
   *
   * Note that this _must_ be called after i18nSetup because this function sets up
   * the currentLanguage module variable which is referenced inside of here.
   **/
  const VueIntl = require('vue-intl');
  Vue.use(VueIntl, { defaultLocale });
  Vue.prototype.isRtl = languageDirection === 'rtl';

  Vue.prototype.$tr = function $tr(messageId, args) {
    const nameSpace = this.$options.name || this.$options.$trNameSpace;
    return $trWrapper(nameSpace, this.$options.$trs, this.$formatMessage, messageId, args);
  };

  Vue.setLocale(currentLanguage);
  if (languageGlobals.coreLanguageMessages) {
    Vue.registerMessages(currentLanguage, languageGlobals.coreLanguageMessages);
  }
  importVueIntlLocaleData().forEach(localeData => VueIntl.addLocaleData(localeData));

  _i18nReady = true;
}

export function i18nSetup(skipPolyfill = false) {
  /**
   * Load fonts, app strings, and Intl polyfills
   **/

  // Set up typography
  setLanguageDensity(currentLanguage);
  setupAndLoadFonts();

  // If the browser doesn't support the Intl polyfill, we retrieve that and
  // the modules need to wait until that happens.
  return new Promise((resolve, reject) => {
    if (Object.prototype.hasOwnProperty.call(global, 'Intl') || skipPolyfill) {
      _setUpVueIntl();
      resolve();
    } else {
      Promise.all([
        new Promise(res => {
          require.ensure(
            ['intl'],
            require => {
              res(() => require('intl'));
            },
            'intl',
          );
        }),
        importIntlLocale(currentLanguage),
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
        },
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

// Wrapper to Intl.ListFormat
export function formatList(array) {
  if (Intl.ListFormat) {
    const formatter = new Intl.ListFormat(currentLanguage, { style: 'short', type: 'unit' });
    return formatter.format(array);
  } else {
    return array.join(', ');
  }
}

/**
 * Sorts an Array of language objects by their `lang_name` property.
 * If currentLanguageId is truthy and is a language code that exists in
 * an element of availableLanguages, that element is always sorted first.
 *
 * @export
 * @param {Array} availableLanguages Array of language objects
 * @param {(String|null|undefined)} currentLanguageId Lang code for currently
 *  selected language
 * @returns {Array} Array of sorted language objects with the
 *  currently selected language object first, if one exists.
 */
export function sortLanguages(availableLanguages, currentLanguageId) {
  const currentLanguageElem = availableLanguages.find(language => {
    return language.id == currentLanguageId;
  });

  const sortedLanguages = availableLanguages
    .sort(compareLanguages)
    .filter(language => language.id != currentLanguageId);

  if (currentLanguageElem) {
    sortedLanguages.unshift(currentLanguageElem);
  }

  return sortedLanguages;
}

export function compareLanguages(a, b) {
  if (a.lang_name.toLowerCase() < b.lang_name.toLowerCase()) {
    return -1;
  }
  if (b.lang_name.toLowerCase() < a.lang_name.toLowerCase()) {
    return 1;
  }
  return 0;
}
