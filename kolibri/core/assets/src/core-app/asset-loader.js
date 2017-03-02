'use strict';
/**
 * Asset Loader module.
 * Loads frontend assets (JS and CSS) asynchronously, to avoid page bloat, and
 * improve page load time.
 * @module assetLoader
 */

const scriptjs = require('scriptjs');
const loadcss = require('fg-loadcss').loadCSS;
const onloadcss = require('fg-loadcss/src/onloadCSS');
const logging = require('kolibri.lib.logging').getLogger(__filename);

/**
 * Take an Array of frontend asset files and asynchronously load in order.
 * @param {Array} assets - An array that contains the paths for each of the files to be loaded.
 * @param {assetLoadCallback=} callback - A callback that gets called when fetching
 * is complete.
 * @param {Number=} timeout - A ms timeout after which to error for CSS files - this
 * compensates for the lack of wide
 * support for the onerror event on 'link' tags in HTML.
 */
module.exports = function loadAssets(assets, callback, timeout = 5000) {
  if (!Array.isArray(assets)) {
    logging.debug(assets);
    callback(new Error('Non-array passed to assets'), null);
  }
  const loaded = {};
  const queueLength = assets.length;

  function cb(dep, success) {
    if (!loaded.hasOwnProperty(dep)) {
      if (success) {
        loaded[dep] = 1;
      } else {
        loaded[dep] = 0;
      }
      if (Object.getOwnPropertyNames(loaded).length === queueLength) {
        const missing = Object.getOwnPropertyNames(loaded).filter(prop => loaded[prop] === 0);
        if (missing.length > 0) {
          callback(new Error('Some assets failed to load'), missing);
        } else {
          callback(null, null);
        }
      }
    }
  }

  assets.forEach(asset => {
    if (asset.indexOf('.css') === (asset.length - 4)) {
      const stylesheet = loadcss(asset);
      onloadcss(stylesheet, () => cb(asset, true));
      setTimeout(() => cb(asset, false), timeout);
    } else if (asset.indexOf('.js') === (asset.length - 3)) {
      scriptjs(asset, () => cb(asset, true), () => cb(asset, false));
    }
  });
};

/**
 * @callback assetLoadCallback
 * @param {Error} err - Error object - null if no error.
 * @param {Array} notFound - Array of dependencies that could not be loaded - null if none.
 */
