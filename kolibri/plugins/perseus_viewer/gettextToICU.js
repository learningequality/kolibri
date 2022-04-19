/*
 * A function to transform Perseus' gettext formatted messages to ICU message syntax
 * Can be used replace all strings in a source file,
 * Or on a string by string basis to convert gettext formatted strings into ICU syntax,
 * For example when importing Khan Academy's gettext format translated strings.
 */
const gettextToICU = (string) => {
  // Regex taken from perseus/lib/i18n.js interpolationMarker variable
  return string.replace(/%\(([\w_]+)\)s/g, '{ $1 }');
};

module.exports = gettextToICU;
