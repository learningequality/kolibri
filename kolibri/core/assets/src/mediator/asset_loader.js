'use strict';
/**
 * Asset Loader module.
 * Loads frontend assets (JS and CSS) asynchronously, to avoid page bloat, and improve page load time.
 * @module assetLoader
 */

var scriptjs = require('scriptjs');
var loadcss = require('fg-loadcss').loadCSS;
var onloadcss = require('exports?onloadCSS!fg-loadcss/src/onloadCSS');
var logging = require('loglevel');
var _ = require('lodash');

/**
 * Take an Array of frontend asset files and asynchronously load in order.
 * @param {Array} assets - An array that contains the paths for each of the files to be loaded.
 * @param {assetLoadCallback=} callback - A callback that gets called when fetching is complete.
 * @param {Number=} timeout - A ms timeout after which to error for CSS files - this compensates for the lack of wide
 * support for the onerror event on 'link' tags in HTML.
 */
var assetLoader = function(assets, callback, timeout) {
    if ((timeout === null) || (typeof timeout === 'undefined')) {
        timeout = 5000;
    }
    if (!_.isArray(assets)) {
        logging.debug(assets);
        return callback(new Error('Non-array passed to assets'), null);
    }
    var loaded = {};
    var queue_length = assets.length;

    function cb(dep, success) {
        if (!_.has(loaded, dep)) {
            if (success) {
                loaded[dep] = 1;
            } else {
                loaded[dep] = 0;
            }
            if (_.keys(loaded).length === queue_length) {
                var missing = _.keys(_.pickBy(loaded, function(load, dep) {
                    return load === 0;
                }));
                if (missing.length > 0) {
                    callback(new Error('Some assets failed to load'), missing);
                } else {
                    callback(null, null);
                }
            }
        }
    }

    _.forEach(assets, function(asset) {
       if (_.endsWith(asset, '.css')) {
           var stylesheet = loadcss(asset);
           onloadcss(stylesheet, function() {
              cb(asset, true);
           });
           setTimeout(function() {
               cb(asset, false);
           }, timeout);
       } else if (_.endsWith(asset, '.js')) {
           scriptjs(asset, function() {
               cb(asset, true);
           }, function() {
               cb(asset, false);
           });
       }
    });
};

/**
 * This callback is displayed as a global member.
 * @callback assetLoadCallback
 * @param {Error} err - Error object - null if no error.
 * @param {Array} notFound - Array of dependencies that could not be loaded - null if none.
 */

module.exports = assetLoader;
