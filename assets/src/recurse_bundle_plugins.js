/**
 * Bundle plugin directory recurser module.
 * @module recurseBundlePlugins
 */

var BundleTracker = require('webpack-bundle-tracker');
var fs = require("fs");
var path = require("path");
var logging = require("./logging");

var readBundlePlugin = require('./read_bundle_plugin');

/**
 * Take an array of directories, recurse over all directories inside them, and look for any files named
 * 'kolibri_plugin.py', then extract frontend bundle configuration data from them.
 * @param {Array} directories - The directories overwhich to recursively search for plugin files.
 * @param {string} base_dir - The absolute path of the base directory for writing files to.
 * @returns {Array} bundles - An array containing webpack config objects.
 */
var recurseBundlePlugins = function(directories, base_dir) {
    var recurse = function(directories, base_dir) {
        var files = [];
        directories.forEach(function (directory) {
            var dir_files = fs.readdirSync(directory);
            dir_files.forEach(function (file) {
                var stats = fs.statSync(path.join(directory, file));
                if (stats.isDirectory()) {
                    files = files.concat(recurse([path.join(directory, file)], base_dir));
                } else if (file === "kolibri_plugin.py") {
                    files.push(path.join(directory, file));
                }
            });
        });
        return files;
    };

    var files = recurse(directories, base_dir);
    var bundles = [];
    var externals = {};

    for (var i = 0; i < files.length; i ++){
        var file = files[i];
        var result = readBundlePlugin(file, base_dir);
        bundles = bundles.concat(result[0]);
        for (var key in result[1]) {
            if (typeof externals[key] === "undefined") {
                externals[key] = result[1][key];
            } else {
                logging.warn("Two plugins set with same external flag " + key);
            }
        }
    }


    bundles.forEach(function(bundle) {
        bundle.externals = externals;
    });

    return bundles;
};

module.exports = recurseBundlePlugins;
