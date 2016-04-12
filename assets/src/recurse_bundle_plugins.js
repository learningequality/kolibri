'use strict';
/**
 * Bundle plugin directory recurser module.
 * @module recurseBundlePlugins
 */

var fs = require("fs");
var path = require("path");
var logging = require("./logging");
var _ = require("lodash");

var readBundlePlugin = require('./read_bundle_plugin');

/**
 * Take an array of directories, recurse over all directories inside them, and look for any files named
 * 'kolibri_plugin.py', then extract frontend bundle configuration data from them.
 * @param {Array} directories - The directories overwhich to recursively search for plugin files.
 * @param {string} base_dir - The absolute path of the base directory for writing files to.
 * @returns {Array} bundles - An array containing webpack config objects.
 */
var recurseBundlePlugins = function(directories, base_dir, libs) {
    var recurse = function(directories, base_dir) {
        var files = [];
        // Look through every directory passed in.
        directories.forEach(function (directory) {
            // Read all the files in the directory.
            var dir_files = fs.readdirSync(directory);
            dir_files.forEach(function (file) {
                // Examine each item in the directory.
                var stats = fs.statSync(path.join(directory, file));
                if (stats.isDirectory()) {
                    // If it's a directory, keep recursing to find more files.
                    files = files.concat(recurse([path.join(directory, file)], base_dir));
                } else if (file === "kolibri_plugin.py") {
                    // If it's a file, we only care if it is kolibri_plugin.py, add it to our list.
                    files.push(path.join(directory, file));
                }
            });
        });
        return files;
    };

    var externals = {};

    // Find all the kolibri_plugin.py files in the Kolibri folder.
    var files = recurse(directories, base_dir);
    var bundles = [];

    for (var i = 0; i < files.length; i ++){
        var file = files[i];
        // Go through each one of the kolibri_plugin files and see if there are any Frontend plugins defined therein.
        var result = readBundlePlugin(file, base_dir);
        bundles = bundles.concat(result[0]);
        for (var key in result[1]) {
            // Double check that no modules set the same external flag (we don't want two different modules trying
            // to occupy the same global variable name.
            if (typeof externals[key] === "undefined") {
                externals[key] = result[1][key];
            } else {
                logging.warn("Two plugins set with same external flag " + key);
            }
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
