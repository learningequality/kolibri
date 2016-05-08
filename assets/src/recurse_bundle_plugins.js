'use strict';
/**
 * Bundle plugin directory recurser module.
 * @module recurseBundlePlugins
 */

var fs = require("fs");
var path = require("path");
var logging = require("./logging");
var _ = require("lodash");

var readBundlePlugins = require('./read_bundle_plugins');

/**
 * Calls django management command 'webpack_json' to query for which JS bundles
 * are present in the installation.
 *
 * @param {string} base_dir - The absolute path of the base directory for writing files to.
 * @returns {Array} bundles - An array containing webpack config objects.
 */
var recurseBundlePlugins = function(base_dir, libs) {

    var externals = {};

    // Find all the kolibri_plugin.py files in the Kolibri folder.
    var bundles = [];

    var result = readBundlePlugins(base_dir);

    // Append all the found bundles
    bundles = bundles.concat(result[0]);

    // Inspect the mappings
    for (var key in result[1]) {
        // Double check that no modules set the same external flag (we don't want two different modules trying
        // to occupy the same global variable name.
        if (typeof externals[key] === "undefined") {
            externals[key] = result[1][key];
        } else {
            logging.warn("Two plugins set with same external flag " + key);
        }
    }

    // One bundle is special - that is the one for the core bundle.
    var core_bundle = _.find(bundles, function(bundle) {return bundle.core && bundle.core !== null;});

    // For that bundle, we replace all references to library modules (like Backbone) that we bundle into the core app
    // with references to the core app itself, so if someone does `var Backbone = require('backbone');` webpack
    // will replace it with a reference to Bacbkone bundled into the core Kolibri app.
    var lib_externals = core_bundle ? libs(core_bundle.output.library) : {};

    bundles.forEach(function(bundle) {
        if (bundle.core === null) {
            // If this is not the core bundle, then we need to add the external library mappings.
            bundle.externals = _.extend({}, externals, lib_externals);
        } else {
            bundle.externals = externals;
        }
    });

    return bundles;
};

module.exports = recurseBundlePlugins;
