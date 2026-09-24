/*
 * What the Kolibri theming lint rules share: the valid theme CSS variable names, and how
 * a theme value is read out of a JS expression.
 */

const { themeRead } = require('./themeAccessorRead');
const {
  getThemeCssVariableNames,
  isThemeSourceError,
  isThemedCustomProperty,
  suggestThemeCssVariableName,
} = require('./themeCssVariableNames');
const { THEME_ACCESSOR_PREFIXES } = require('./themeCssVariableNaming');

module.exports = {
  THEME_ACCESSOR_PREFIXES,
  getThemeCssVariableNames,
  isThemeSourceError,
  isThemedCustomProperty,
  suggestThemeCssVariableName,
  themeRead,
};
