// How a theme CSS variable is named

// the theme accessor each variable prefix corresponds to
const THEME_ACCESSOR_PREFIXES = {
  themeTokens: 'tokens',
  themeBrand: 'brand',
  themePalette: 'palette',
};

const THEME_VARIABLE_PREFIXES = Object.values(THEME_ACCESSOR_PREFIXES).map(
  prefix => `--${prefix}-`,
);

/**
 * Version keys are emitted as `vN`, so `v_400` becomes `v400`.
 * @param {string} key - One segment of a path of object keys.
 * @returns {string}
 */
function formatPathSegment(key) {
  return key.replace(/^v_(\d+)$/, 'v$1');
}

/**
 * The variable name for a path of object keys, e.g. `--palette-grey-v400`.
 * @param {string} prefix - The accessor the path is rooted at, with or without `--`.
 * @param {Array<string>} segments - The object keys leading to the value.
 * @returns {string}
 */
function themeCssVariableName(prefix, segments) {
  // a caller may pass either `palette` or `--palette`
  const accessor = prefix.replace(/^-+/, '');
  return [`--${accessor}`, ...segments.map(formatPathSegment)].join('-');
}

/**
 * Every `[name, value]` pair of a color or token tree, where a string is a leaf
 * and any other non-object value is skipped.
 * @param {string} prefix - The accessor the tree is rooted at.
 * @param {object} tree - The color or token tree to flatten.
 * @returns {Array<Array<string>>}
 */
function flattenThemeTree(prefix, tree) {
  const entries = [];
  const walk = (segments, value) => {
    if (typeof value === 'string') {
      entries.push([themeCssVariableName(prefix, segments), value]);
    } else if (value && typeof value === 'object') {
      for (const key of Object.keys(value)) {
        walk([...segments, key], value[key]);
      }
    }
  };
  walk([], tree);
  return entries;
}

module.exports = {
  THEME_ACCESSOR_PREFIXES,
  THEME_VARIABLE_PREFIXES,
  flattenThemeTree,
  formatPathSegment,
  themeCssVariableName,
};
