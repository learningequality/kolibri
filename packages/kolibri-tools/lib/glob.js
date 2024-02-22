const globbySync = require('globby').sync;

/**
 * Small wrapper around glob dependency to make it easier to switch to a different library
 */
module.exports = {
  /**
   * Synchronously search for files that match a glob pattern
   * @param {string} globPath
   * @param {object} options
   * @param {string[]} options.ignore
   * @returns {string[]}
   */
  sync(globPath, { ignore = [] } = {}) {
    return globbySync(globPath, { ignore });
  },
};
