import has from 'lodash/has';
import Vue, { ref } from 'vue';
import logger from 'kolibri-logging';
import plugin_data from 'kolibri-plugin-data';
import VueIntl from 'vue-intl';
import importIntlLocale from './internal/intl-locale-data';
import importVueIntlLocaleData from './internal/vue-intl-locale-data';
import setupAndLoadFonts from './internal/setupAndLoadFonts';

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

export const i18nReady = ref(false);

/**
 * Wrap a translation call with namespace and formatter context.
 * @param {string} nameSpace - The translator namespace.
 * @param {object} defaultMessages - Map of message IDs to default message strings.
 * @param {Function} formatter - The vue-intl $formatMessage function.
 * @param {string} messageId - The key of the message to translate.
 * @param {object|Array} args - Positional array or named options for interpolation.
 * @returns {string} The formatted translated string.
 * @throws {string} If called before i18n is ready.
 */
function $trWrapper(nameSpace, defaultMessages, formatter, messageId, args) {
  if (!i18nReady.value) {
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

/**
 * Get the language direction for a language ID.
 * @param {string} id - The language ID to look up.
 * @returns {string} The language direction ('ltr' or 'rtl').
 */
export function getLangDir(id) {
  return (availableLanguages[id] || {}).lang_direction || languageDirections.LTR;
}

/**
 * Check whether a language ID corresponds to a right-to-left language.
 * @param {string} id - The language ID to check.
 * @returns {boolean} True if the language is RTL.
 */
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

/**
 * Extract the BCP 47 language code from a language ID.
 * @param {string} id - The language ID (e.g. 'en-US').
 * @returns {string} The lowercase language code (e.g. 'en').
 */
export function languageIdToCode(id) {
  return id.split('-')[0].toLowerCase();
}

/**
 * Set the global language density based on a language ID.
 * @param {string} id - The language ID used to determine density.
 * @returns {void}
 */
function setLanguageDensity(id) {
  const langCode = languageIdToCode(id);
  // Set the exported languageDensity in JS
  languageDensity = languageDensityMapping[langCode] || languageDensities.englishLike;
  // Set the body class for global typography
  global.document.body.classList.add(`language-${languageDensity}`);
}

class Translator {
  constructor(nameSpace, defaultMessages) {
    this._nameSpace = nameSpace;
    this._defaultMessages = defaultMessages;
    for (const key in defaultMessages) {
      this[`${key}$`] = this.$tr.bind(this, key);
      this[`${key}$`].KOLIBRI_I18N_WRAPPED_STRING = true;
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
 * Create a Translator instance for the given namespace and messages.
 * @param {string} nameSpace - The unique namespace for this translator.
 * @param {object} defaultMessages - Map of message IDs to default message strings.
 * @returns {Translator} A configured Translator instance.
 */
export function createTranslator(nameSpace, defaultMessages) {
  return new Translator(nameSpace, defaultMessages);
}

/**
 * Create a Translator that shares the namespace and strings of another Vue component.
 * @param {object} Component - A Vue component options object with a name and $trs.
 * @returns {Translator} A configured Translator instance for the component.
 */
export function crossComponentTranslator(Component) {
  return new Translator(Component.name, Component.$trs);
}

/**
 * Install vue-intl and load locale data for the current language.
 * @returns {Promise<void>} Resolves when vue-intl is fully configured.
 */
async function _setUpVueIntl() {
  /**
   * Use the vue-intl plugin.
   *
   * Note that this _must_ be called after i18nSetup because this function sets up
   * the currentLanguage module variable which is referenced inside of here.
   */
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

  // Load vue-intl locale data asynchronously for current language
  // Extract just the language code (e.g., 'en' from 'en-us') for vue-intl
  const vueIntlLanguageCode = currentLanguage.split('-')[0];
  const module = await importVueIntlLocaleData(vueIntlLanguageCode);
  // import() returns the module directly
  const localeData = module.default || module;
  VueIntl.addLocaleData(localeData);
  i18nReady.value = true;
}

/**
 * Initialize the i18n system: set up fonts, polyfills, and vue-intl.
 * @param {boolean} skipPolyfill - When true, skip loading the Intl polyfill.
 * @returns {Promise<void>} Resolves when i18n is fully initialized.
 */
export async function i18nSetup(skipPolyfill = false) {
  // Set up typography
  setLanguageDensity(currentLanguage);
  setupAndLoadFonts();

  // If the browser doesn't support the Intl polyfill, we retrieve that and
  // the modules need to wait until that happens.
  if (Object.prototype.hasOwnProperty.call(global, 'Intl') || skipPolyfill) {
    await _setUpVueIntl();
  } else {
    try {
      await Promise.all([import('intl'), importIntlLocale(currentLanguage)]);

      await _setUpVueIntl();
    } catch (error) {
      logging.error(error);
      logging.error('An error occurred trying to setup Internationalization', error);
      throw error;
    }
  }
}

/**
 * Locale-aware string comparison, with fallback for browsers that lack full support.
 * @param {string} str1 - The first string to compare.
 * @param {string} str2 - The second string to compare.
 * @param {string} [locale] - The BCP 47 locale tag to use for comparison.
 * @param {object} [options] - Additional Intl.Collator options.
 * @returns {number} Negative, zero, or positive as per localeCompare semantics.
 */
export function localeCompare(str1, str2, locale, options) {
  const compareLocale = locale || currentLanguage;
  const compareOptions = { usage: 'sort', ...options };

  // Catch if browser does not support extended localeCompare arguments (iOS 9.3)
  try {
    return String(str1).localeCompare(String(str2), compareLocale, compareOptions);
  } catch (e) {
    return String(str1).localeCompare(String(str2));
  }
}

/**
 * Format an array of values as a locale-aware list string.
 * @param {string[]} array - The items to format as a list.
 * @returns {string} A locale-formatted list string.
 */
export function formatList(array) {
  if (Intl.ListFormat) {
    const formatter = new Intl.ListFormat(currentLanguage, { style: 'short', type: 'unit' });
    return formatter.format(array);
  } else {
    return array.join(', ');
  }
}

/**
 * Sort languages alphabetically, placing the current language first.
 * @param {object[]} availableLanguages - Array of language objects with an id property.
 * @param {string} currentLanguageId - The ID of the language to place first.
 * @returns {object[]} Sorted array of language objects.
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

/**
 * Compares two language objects by their lang_name property using locale-aware comparison.
 * Used for sorting language lists in the language switcher.
 * @param {object} a - First language object with lang_name property.
 * @param {object} b - Second language object with lang_name property.
 * @returns {number} -1 if a < b, 0 if equal, 1 if a > b.
 */
export function compareLanguages(a, b) {
  return localeCompare(a.lang_name, b.lang_name);
}
