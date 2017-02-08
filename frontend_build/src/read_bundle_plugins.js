'use strict';
/**
 * Bundle plugin Python config reader module.
 * @module readBundlePlugin
 */

var readWebpackJson = require('./read_webpack_json');
var logging = require('./logging');
var _ = require("lodash");
var path = require('path');
var fs = require('fs');
var mkdirp = require('mkdirp');

var parseBundlePlugin = require('./parse_bundle_plugin');

var coreExternals = require('./apiSpecExportTools').coreExternals;

/**
 * Take a Python plugin file name as input, and extract the information regarding front end plugin configuration from it
 * using a Python script to import the relevant plugins and then run methods against them to retrieve the config data.
 * @param {string} base_dir - The absolute path of the base directory for writing files to.
 * module names to the global namespace at which those modules can be accessed.
 * @returns {Array} bundles - An array containing webpack config objects.
 */
var readBundlePlugin = function(base_dir) {

  // Takes a module file path and turns it into a Python module path.
  var bundles = [];
  var externals = {};

  var results = readWebpackJson();

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
      } else if (external) {
        logging.warn("Two plugins setting with same external flag " + external);
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

  // Check that there is only one core bundle and throw an error if there is more than one.
  if (_.filter(bundles, function(bundle) {return bundle.core_name && bundle.core_name !== null;}).length > 1) {
    throw new RangeError('You have more than one core bundle specified.');
  }

  // For that bundle, we replace all references to library modules (like Backbone) that we bundle into the core app
  // with references to the core app itself, so if someone does `var Backbone = require('backbone');` webpack
  // will replace it with a reference to Bacbkone bundled into the core Kolibri app.
  var core_externals = core_bundle ? coreExternals(core_bundle.output.library) : {};

  bundles.forEach(function(bundle) {
    if (bundle.core_name === null || typeof bundle.core_name === "undefined") {
      // If this is not the core bundle, then we need to add the external library mappings.
      bundle.externals = _.extend({}, externals, core_externals);
    } else {
      bundle.externals = _.extend({kolibri: core_bundle.output.library}, externals);
    }
  });

  // Create name to path mapping to allow translated json files to be copied into
  // the correct static directory.

  var namePathMapping = {};

  bundles.forEach(function (bundle) {
    namePathMapping[bundle.name] = path.resolve(path.dirname(bundle.output.path));
  });

  var locale_dir = path.join(base_dir, 'kolibri', 'locale')

  mkdirp.sync(locale_dir);

  // This will output a file mapping from the bundle name to the static directory where
  // the built files for this mapping are put. This is used for redistributing translated message files
  // back to their plugins.

  fs.writeFileSync(path.join(locale_dir, 'pathMapping.json'), JSON.stringify(namePathMapping));

  // We add some custom configuration options to the bundles that webpack 2 dislikes, clean them up here.
  bundles.forEach(function (bundle) {
    delete bundle.core_name;
    delete bundle.coreAPISpec;
  });

  return bundles;

};

module.exports = readBundlePlugin;
