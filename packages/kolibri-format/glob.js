const fastGlob = require('fast-glob');

const defaultOptions = {
  ignore: [],
  expandDirectories: true,
  braceExpansion: true,
  dot: false,
  extglob: true,
  globstar: true,
  caseSensitiveMatch: true,
};

/**
 * Small wrapper around glob dependency to make it easier to switch to a different library
 */
module.exports = {
  /**
   * Synchronously search for files that match a glob pattern
   * @param {string|string[]} globPaths
   * @param {object} options - see fast-glob options
   * @returns {string[]}
   */
  sync(globPaths, options = {}) {
    if (Array.isArray(globPaths)) {
      globPaths = [...new Set(globPaths)];
    } else {
      globPaths = [globPaths];
    }

    return fastGlob.sync(globPaths, {
      ...defaultOptions,
      ...options,
    });
  },
};
