/**
 * Bundle plugin parser module.
 * @module parseBundlePlugin
 */


var BundleTracker = require('webpack-bundle-tracker');
var fs = require("fs");
var path = require("path");
var logging = require('./logging');

/**
 * Turn an object containing the vital information for a frontend plugin and return a bundle configuration for webpack.
 * @param {Object} data - An object that contains the data for configuring the bundle.
 * @param {string} data.entry_file - The Javascript source file that initializes the plugin.
 * @param {string} data.name - The name that the plugin is referred to by.
 * @param {string} data.module_name - The name (e.g. 'kolibri.plugin.example') of the Python module
 * in which the frontend plugin is defined.
 * @param {string} data.module_path - Directory path to the module in which the plugin is defined.
 * @param {string} data.stats_file - The name of the webpack bundle stats file that the plugin data should be saved to.
 * @param {string} [data.external] - Flag to indicate that the module should be exposed as an external library
 * to other plugins.
 * @param {string} base_dir - The absolute path of the base directory for writing files to.
 * @returns {Array}
 * @returns {Object} [0] bundle - An object defining the webpack config.
 * @returns {string} [1] [external] - A string flagging the name to be used to refer to the plugin as an external lib.
 */
var parseBundlePlugin = function(data, base_dir) {
    var module_name = data.module_name;
    var bundle_data = {};
    var external, bundle;
    var library;
    if ((typeof data.entry_file !== "undefined") &&
        (typeof data.name !== "undefined") &&
        (typeof data.module_name !== "undefined") &&
        (typeof data.module_path !== "undefined") &&
        (typeof data.stats_file !== "undefined")) {
        bundle_data[data.name] = path.join(data.module_path, data.entry_file);
        if (typeof data.external !== "undefined" && data.external) {
            external = data.name;
            library = data.name;
        }
        bundle = {
            context: base_dir,
            entry: bundle_data,
            output: {
                path: path.relative(base_dir, path.join(data.module_path, "static", module_name)),
                filename: "[name]-[hash].js",
                publicPath: path.join(module_name, "/"),
                library: library
            },
            plugins: [
                new BundleTracker({
                    path: path.dirname(data.stats_file),
                    filename: path.basename(data.stats_file)
                })
            ],
            resolve: {
                root: base_dir
            }
        };
        return [bundle, external];
    } else {
        logging.error(module_name + " file is misconfigured, missing parameter(s) for bundle " + data.name);
    }
};

module.exports = parseBundlePlugin;
