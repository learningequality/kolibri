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
 * Small wrapper around glob dependency to make it easier to switch to a different library.
 */
module.exports = {
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
