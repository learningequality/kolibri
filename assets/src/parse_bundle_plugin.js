'use strict';
/**
 * Bundle plugin parser module.
 * @module parseBundlePlugin
 */


var BundleTracker = require('webpack-bundle-tracker');
var fs = require("fs");
var path = require("path");
var logging = require('./logging');
var webpack = require('webpack');
var base_config = require('../../webpack_config/webpack.config.base');
var _ = require('lodash');

/**
 * Turn an object containing the vital information for a frontend plugin and return a bundle configuration for webpack.
 * @param {Object} data - An object that contains the data for configuring the bundle.
 * @param {string} data.entry_file - The Javascript source file that initializes the plugin.
 * @param {string} data.name - The name that the plugin is referred to by.
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
    var bundle_data = {};
    var external;
    // Start from a base configuration file that defines common features of the webpack configuration for all Kolibri
    // plugins (including the core app).
    var bundle = _.clone(base_config);
    var library;
    if ((typeof data.entry_file !== "undefined") &&
        (typeof data.name !== "undefined") &&
        (typeof data.module_path !== "undefined") &&
        (typeof data.stats_file !== "undefined")) {
        bundle_data[data.name] = path.join(data.module_path, data.entry_file);
        if (typeof data.external !== "undefined" && data.external) {
            // If we want to create a plugin that can be directly referenced by other plugins, this sets it to be
            // instantiated as a global variable. Only currently used by the Kolibri core app.
            external = data.name;
            // change the periods of the Python module path name to underscores, so that it is a valid JS variable name.
            library = data.core ? 'Kolibri' : data.name.replace(/\./g, "_");
        }

        bundle.resolve.root = base_dir;
        bundle.plugins = bundle.plugins.concat([
            // BundleTracker creates stats about our built files which we can then pass to Django to allow our template
            // tags to load the correct frontend files.
            new BundleTracker({
                path: path.dirname(data.stats_file),
                filename: path.basename(data.stats_file)
            }),
            // Plugins know their own name, by having a variable that we define here, based on the name they are given
            // in kolibri_plugins.py inside their relevant module.
            // We also pass in the events hashes here as well, as they are defined in the Python specification of the
            // KolibriModule.
            new webpack.DefinePlugin({
                __kolibriModuleName: JSON.stringify(data.name),
                __events: JSON.stringify(data.events || {}),
                __once: JSON.stringify(data.once || {})
            })
        ]);
        _.extend(bundle, {
            core: data.core,
            name: data.name,
            context: base_dir,
            entry: bundle_data,
            output: {
                path: path.relative(base_dir, path.join(data.module_path, "static", data.name)),
                filename: "[name]-[hash].js",
                publicPath: path.join(data.name, "/"),
                library: library
            },

            async_file: data.async_file
        });
        return [bundle, external];
    } else {
        logging.error(data.name + ' plugin is misconfigured, missing parameter(s)');
    }
};

module.exports = parseBundlePlugin;
