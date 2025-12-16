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
  constructor(translatorObject) {
    for (const key in translatorObject._defaultMessages) {
      this[`${key}`] = _getTranslatedStringOrFunction(translatorObject, key);
    }
  }
}

function wrapPerseusMessages(translatorObject) {
  if (window.Proxy) {
    return new Proxy(translatorObject, {
      get: function (target, prop) {
        return _getTranslatedStringOrFunction(target, prop);
      },
    });
  }
  return new PerseusMessageWrapper(translatorObject);
}

module.exports = {
  replacePiText,
  revertPiText,
  wrapPerseusMessages,
};
