/* eslint-disable import-x/no-commonjs, import-x/no-amd, import-x/no-import-module-exports */
const piRegex = /text\{pi\}/g;
const piTextPlaceholder = 'text[pi]';

function replacePiText(string) {
  return string.replace(piRegex, piTextPlaceholder);
}

function revertPiText(string) {
  return string.replace(piTextPlaceholder, 'text{pi}');
}

function _getTranslatedStringOrFunction(translatorObject, key) {
  const defaultMessage = translatorObject._defaultMessages[key];
  if (defaultMessage) {
    // Do a very simple test for whether this includes any ICU message formatting placeholders
    // If it does, return a function that will call the translation function with the options
    // If it doesn't, just return the translated string
    if (/{/.test(defaultMessage)) {
      return options => {
        return revertPiText(translatorObject[`${key}$`](options));
      };
    }
    return revertPiText(translatorObject[`${key}$`]());
  }
}

class PerseusMessageWrapper {
  constructor(translatorObject, untranslatedMessages) {
    Object.assign(this, untranslatedMessages);
    for (const key in translatorObject._defaultMessages) {
      Object.defineProperty(this, key, {
        enumerable: true,
        get: () =>
          _getTranslatedStringOrFunction(translatorObject, key) ?? untranslatedMessages[key],
      });
    }
  }
}

function wrapPerseusMessages(translatorObject, untranslatedMessages = {}) {
  if (window.Proxy) {
    return new Proxy(translatorObject, {
      get: function (target, prop) {
        return _getTranslatedStringOrFunction(target, prop) ?? untranslatedMessages[prop];
      },
    });
  }
  return new PerseusMessageWrapper(translatorObject, untranslatedMessages);
}

module.exports = {
  replacePiText,
  revertPiText,
  wrapPerseusMessages,
};
