'use strict';
/**
 * Bundle plugin Python config reader module.
 * @module readBundlePlugin
 */

var fs = require("fs");
var path = require("path");
var logging = require('./logging');
var execSync = require('child_process').execSync;

var parseBundlePlugin = require('./parse_bundle_plugin');

/**
 * Take a Python plugin file name as input, and extract the information regarding front end plugin configuration from it
 * using a Python script to import the relevant plugins and then run methods against them to retrieve the config data.
 * @param {string} plugin_file - The directory path of the Python plugin file.
 * @param {string} base_dir - The absolute path of the base directory for writing files to.
 * @returns {Array}
 * @returns {Array} [0] bundles - An array containing webpack config objects.
 * @returns {Object} [1] externals - An object containing mapping from plugin name to plugin name for accessing those
 * plugins as an external library.
 */
var readBundlePlugin = function(plugin_file, base_dir) {
    // Takes a module file path and turns it into a Python module path.
    var plugin = path.relative(base_dir, plugin_file).replace(".py", "").replace(new RegExp("\\" + path.sep, 'g'), ".");
    var bundles = [];
    var externals = {};

    // Run the script below to extract the relevant information about the plugin configuration from the Python code.
    var result = execSync("python kolibri/utils/webpack_config_export.py " + plugin).toString();

    if (result.length > 0) {

        var results = result.split(/\n/g);

        for (var i = 0; i < results.length; i++) {
            var message = results[i];
            // The above script prints JSON to stdout, here we parse that JSON and use it as input to our webpack
            // configuration builder module, parseBundlePlugin.
            if (message.replace(/ /g, "") !== "") {
                message = JSON.parse(message);
                var output = parseBundlePlugin(message, base_dir);
                if (typeof output !== "undefined") {
                    // The first part of the output is the Webpack configuration for that Kolibri plugin.
                    bundles.push(output[0]);
                    if (typeof externals[output[1]] === "undefined") {
                        // The second part of the output is any global variables that will be available to all other
                        // plugins. For the moment, this is only the `kolibriGlobal` variable.

                        ////////////////
                        // [NOTE - seems to often be undefined here, which is probably wrong]
                        if (output[1] !== undefined) {
                            externals[output[1]] = output[1];
                        }
                        ////////////////

                    } else {
                        logging.warn("Two plugins setting with same external flag " + output[1] + " in plugin file: " + plugin_file);
                    }
                }
            }
        }
    }
    if (bundles.length > 0) {
        for (var k = 0; k < bundles.length; k++) {
            for (var j = 0; j < bundles.length; j++) {
                // We want to prevent the same bundle being built twice, so enforce that here by checking no duplicates.
                if (k !== j) {
                    // Only one key per object here, so just get the first key
                    if (Object.keys(bundles[k].entry)[0] === Object.keys(bundles[j].entry)[0]) {
                        logging.error("Duplicate keys: " + Object.keys(bundles[k].entry)[0] +
                            " in Python file: " + plugin_file);
                    }
                }
            }
        }
    }

    return [bundles, externals];

};

module.exports = readBundlePlugin;
