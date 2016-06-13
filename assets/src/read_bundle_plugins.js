'use strict';
/**
 * Bundle plugin Python config reader module.
 * @module readBundlePlugin
 */

var fs = require("fs");
var path = require("path");
var logging = require('./logging');
var execSync = require('child_process').execSync;
var _ = require("lodash");

var parseBundlePlugin = require('./parse_bundle_plugin');

/**
 * Take a Python plugin file name as input, and extract the information regarding front end plugin configuration from it
 * using a Python script to import the relevant plugins and then run methods against them to retrieve the config data.
 * @param {string} base_dir - The absolute path of the base directory for writing files to.
 * @param {Function} libs - A function that takes the global name assigned to the core app and returns a mapping from
 * module names to the global namespace at which those modules can be accessed.
 * @returns {Array} bundles - An array containing webpack config objects.
 */
var readBundlePlugin = function(base_dir, libs) {

  // Takes a module file path and turns it into a Python module path.
  var bundles = [];
  var externals = {};

  // Run the script below to extract the relevant information about the plugin configuration from the Python code.
  var result = execSync("python -m kolibri manage webpack_json").toString();

  if (result.length > 0) {
    // The above script prints JSON to stdout, here we parse that JSON and use it as input to our webpack
    // configuration builder module, parseBundlePlugin.
    var results = JSON.parse(result);

    for (var i = 0; i < results.length; i++) {
      var message = results[i];

      var output = parseBundlePlugin(message, base_dir);
      if (typeof output !== "undefined") {
        var webpack_configuration = output[0];
        // The first part of the output is the Webpack configuration for that Kolibri plugin.
        bundles.push(webpack_configuration);
        // The second part of the output is any global variables that will be available to all other
        // plugins. For the moment, this is only the Kolibri global variable.
        var external = output[1];
        if (external && typeof externals[external] === "undefined") {

          externals[external] = external;
        } else {
          logging.warn("Two plugins setting with same external flag " + external);
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
            logging.error("Duplicate keys: " + Object.keys(bundles[k].entry)[0]);
          }
        }
      }
    }
  }

  // One bundle is special - that is the one for the core bundle.
  var core_bundle = _.find(bundles, function(bundle) {return bundle.core_name && bundle.core_name !== null;});

  // For that bundle, we replace all references to library modules (like Backbone) that we bundle into the core app
  // with references to the core app itself, so if someone does `var Backbone = require('backbone');` webpack
  // will replace it with a reference to Bacbkone bundled into the core Kolibri app.
  var lib_externals = core_bundle ? libs(core_bundle.output.library) : {};

  bundles.forEach(function(bundle) {
    if (bundle.core_name === null || typeof bundle.core_name === "undefined") {
      // If this is not the core bundle, then we need to add the external library mappings.
      bundle.externals = _.extend({}, externals, lib_externals);
    } else {
      bundle.externals = externals;
    }
  });

  return bundles;

};

module.exports = readBundlePlugin;
