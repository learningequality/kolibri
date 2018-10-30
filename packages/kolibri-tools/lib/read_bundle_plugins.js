'use strict';
/**
 * Bundle plugin Python config reader module.
 * @module readBundlePlugins
 */

const _ = require('lodash');
const webpack = require('webpack');
const logging = require('./logging');

const parseBundlePlugin = require('./parse_bundle_plugin');

const coreExternals = require('./apiSpecExportTools').coreExternals;

const coreAliases = require('./apiSpecExportTools').coreAliases;

const { kolibriName } = require('./kolibriName');

function setNodePaths(nodePaths) {
  /*
   * This is a filthy hack. Do as I say, not as I do.
   * Taken from: https://gist.github.com/branneman/8048520#6-the-hack
   * This forces the NODE_PATH environment variable to include the main
   * kolibri node_modules folder, so that even plugins being built outside
   * of the kolibri folder will have access to all installed loaders, etc.
   * Doing it here, rather than at command invocation, allows us to do this
   * in a cross platform way, and also to avoid having to prepend it to all
   * our commands that end up invoking webpack.
   */
  nodePaths.forEach(nodePath => {
    var delimiter = process.platform === 'win32' ? ';' : ':';
    process.env.NODE_PATH = process.env.NODE_PATH + delimiter + nodePath;
  });
  require('module').Module._initPaths();
}

/**
 * Extract the information regarding front end plugin configuration using a
 * Python script to import information about the relevant plugins and then run methods
 * against them to create the config data.
 * @returns {Array} bundles - An array containing webpack config objects.
 */
var readBundlePlugins = function(bundles) {
  bundles = bundles
    .map(parseBundlePlugin)
    .filter(function(bundle) {
      return bundle;
    });

  if (bundles.length > 0) {
    for (var k = 0; k < bundles.length; k++) {
      for (var j = 0; j < bundles.length; j++) {
        // We want to prevent the same bundle being built twice, so enforce that here by checking
        // no duplicates.
        if (k !== j) {
          // Only one key per object here, so just get the first key
          if (Object.keys(bundles[k].entry)[0] === Object.keys(bundles[j].entry)[0]) {
            logging.error('Duplicate keys: ' + Object.keys(bundles[k].entry)[0]);
          }
        }
      }
    }
  }

  // A bundle can specify a modification to the coreAPI.
  var coreAPISpec = (
    _.find(bundles, function(bundle) {
      return bundle.coreAPISpec;
    }) || {}
  ).coreAPISpec;

  // Check that there is only one bundle modifying the coreAPI spec.
  if (
    _.filter(bundles, function(bundle) {
      return bundle.coreAPISpec;
    }).length > 1
  ) {
    logging.warn('You have more than one coreAPISpec modification specified.');
  }

  // All references to the core API spec will be referenced as subproperties of the global
  // Kolibri object in the browser, so any references to anything we bundle in the core API
  // will be replaced by a property reference to the global object, e.g. for a Vue import:
  // `import Vue from 'vue';` webpack will replace it with a reference to Vue bundled into the
  // core Kolibri app.
  var core_externals = coreExternals();

  bundles.forEach(function(bundle) {
    Object.assign(bundle.resolve.alias, coreAliases(coreAPISpec));
    // Only the default bundle is built for library output to a global variable
    if (bundle.output.library !== kolibriName) {
      // If this is not the core bundle, then we need to add the external library mappings.
      bundle.externals = core_externals;
    } else {
      bundle.externals = { kolibri: bundle.output.library };
      if (coreAPISpec) {
        bundle.plugins.push(
          new webpack.ProvidePlugin({
            __coreAPISpec: coreAPISpec,
          })
        );
        bundle.plugins.push(
          new webpack.DefinePlugin({
            __copyrightYear: new Date().getFullYear(),
          })
        );
      } else {
        bundle.plugins.push(
          new webpack.DefinePlugin({
            __coreAPISpec: '{}',
            __copyrightYear: new Date().getFullYear(),
          })
        );
      }
    }
  });

  var nodePaths = [];

  // We add some custom configuration options to the bundles that webpack 2 dislikes, clean them
  // up here.
  bundles.forEach(function(bundle) {
    delete bundle.coreAPISpec;
    if (bundle.nodePaths) {
      if (!Array.isArray(bundle.nodePaths)) {
        nodePaths.push(bundle.nodePaths);
      } else {
        nodePaths = nodePaths.concat(bundle.nodePaths);
      }
    }
    delete bundle.nodePaths;
  });

  // Allow individual plugins to set extra node paths - this is potentially dangerous,
  // because different node modules might have the same module in them, and we can't
  // predict which one will get resolved first. Caveat emptor.
  setNodePaths(nodePaths);

  // Sort bundles to give a consistent return order in case this is being read by different
  // processes.
  return bundles.sort((a, b) => {
    if (a.name > b.name) {
      return 1;
    } else if (a.name < b.name) {
      return -1;
    }
    return 0;
  });
};

module.exports = readBundlePlugins;
