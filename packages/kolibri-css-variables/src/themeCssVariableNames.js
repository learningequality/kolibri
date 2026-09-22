/*
 * The theme CSS variable names the lint rules check against. They come from the same
 * color and token files the runtime theme is built from, so the rules stay in sync when
 * someone adds a token, a brand color, or a palette color.
 *
 * `kolibri-design-system` is an optional peer dependency, and this package installs
 * none, so each project lints against the copy it already has. A project that cannot
 * resolve it gets one error from each rule that needs it, rather than a silent pass.
 */

const {
  THEME_VARIABLE_PREFIXES,
  flattenThemeTree,
  formatPathSegment,
} = require('./themeCssVariableNaming');

// a rule catches this code and reports one message for the file, rather than letting
// the failure end the whole lint run
const THEME_SOURCE_UNAVAILABLE = 'KOLIBRI_THEME_SOURCE_UNAVAILABLE';

let cachedNames = null;
let cachedError = null;

function isThemeSourceError(error) {
  return Boolean(error) && error.code === THEME_SOURCE_UNAVAILABLE;
}

function themeSourceError(message, cause) {
  const error = new Error(message, { cause });
  error.code = THEME_SOURCE_UNAVAILABLE;
  return error;
}

function designSystemInstalled() {
  try {
    require('kolibri-design-system/package.json');
    return true;
  } catch (error) {
    // an export map that does not list `package.json` still means it is installed
    return error.code !== 'MODULE_NOT_FOUND';
  }
}

/**
 * The design system's color and token definitions.
 * @returns {object}
 * @throws {Error} When the design system's color and token files cannot be loaded.
 */
function themeSource() {
  try {
    // these are ES modules, loaded through Node's `require(esm)` support
    return {
      materialColors: require('kolibri-design-system/lib/styles/colorsMaterial').default,
      ...require('kolibri-design-system/lib/styles/colorsDefault'),
    };
  } catch (error) {
    // only an absent design system is relabelled. A failure inside it, or a path a
    // release has moved, keeps its own message.
    if (
      error.code !== 'MODULE_NOT_FOUND' ||
      !/'kolibri-design-system/.test(error.message) ||
      designSystemInstalled()
    ) {
      throw error;
    }
    throw themeSourceError(
      'The Kolibri theming lint rules read their valid names from `kolibri-design-system`, ' +
        'a peer dependency that is not installed. Install it, or turn off ' +
        '`kolibri/vue-no-theme-tokens-in-v-bind` and ' +
        '`kolibri/no-unknown-theme-custom-properties`.',
      error,
    );
  }
}

/**
 * Every valid theme CSS variable name, as a `Set`.
 * @returns {Set<string>}
 * @throws {Error} When the theme source cannot be read. `isThemeSourceError` tells that
 * error apart from any other.
 */
function getThemeCssVariableNames() {
  if (cachedNames) {
    return cachedNames;
  }
  // Node does not cache a failed `require`, so the failure is cached here instead of
  // being retried for every file
  if (cachedError) {
    throw cachedError;
  }
  try {
    const { materialColors, defaultBrandColors, defaultTokenMapping } = themeSource();
    const names = [
      ...flattenThemeTree('palette', materialColors),
      ...flattenThemeTree('brand', defaultBrandColors),
      ...flattenThemeTree('tokens', defaultTokenMapping),
    ].map(([name]) => name);
    if (!names.length) {
      throw themeSourceError('No theme CSS variable names were found in the theme source files');
    }
    cachedNames = new Set(names);
    return cachedNames;
  } catch (error) {
    if (isThemeSourceError(error)) {
      cachedError = error;
    }
    throw error;
  }
}

function isThemedCustomProperty(name) {
  return THEME_VARIABLE_PREFIXES.some(prefix => name.startsWith(prefix));
}

/**
 * Returns the valid name an invalid one was probably meant to be, or `null`.
 * @param {string} name - The custom property name that matched no variable.
 * @returns {string|null}
 */
function suggestThemeCssVariableName(name) {
  const normalized = name.split('-').map(formatPathSegment).join('-');
  if (normalized !== name && getThemeCssVariableNames().has(normalized)) {
    return normalized;
  }
  return null;
}

module.exports = {
  getThemeCssVariableNames,
  isThemeSourceError,
  isThemedCustomProperty,
  suggestThemeCssVariableName,
};
