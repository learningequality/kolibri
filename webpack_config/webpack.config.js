/*
 * This file acts as the entry point for webpack building of frontend assets. From here, all Kolibri Plugin folders will
 * be scanned for kolibri_plugins.py and the relevant KolibriModule metadata extracted for webpack configuration.
 * The 'bundles' emitted as the module.exports are the Webpack configuration objects that are then parsed by Webpack
 * to bundle the assets. See recurseBundlePlugins and associated functions for details of how we make these
 * configurations and Webpack documentation for details on what the configuration bundles do.
 */


var path = require('path');
var webpack = require('webpack');
var logging = require('../assets/src/logging');
var readBundlePlugins = require('../assets/src/read_bundle_plugins');


// Mappings for libraries that we bundle in the Kolibri core app.
// * the keys are names exposed by webpack to use in `require` statements, across apps
// * the values are references to the packages, already inserted into kolibriGlobal
//
// kolibri_name is always == kolibriGlobal (this is defined in the base settings - base.py)
var libs = function(kolibri_name) {
  return {
    'loglevel': kolibri_name + '.lib.loglevel',
    'vue': kolibri_name + '.lib.vue',
    'kolibri': kolibri_name,
    'core-base': kolibri_name + '.lib.coreBase',
  };
};

var bundles = readBundlePlugins(path.dirname(__dirname), libs);

module.exports = bundles;
