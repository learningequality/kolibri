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
var recurseBundlePlugins = require('../assets/src/recurse_bundle_plugins');


// This defines the directories where we should search for kolibri_plugins.pys that will specify KolibriModules to be
// built. It might be nice to use INSTALLED_APPS here?
var js_source_dirs = [
    "kolibri/core",
    "kolibri/plugins"
].map(function(file_path) {
    return path.join(path.dirname(__dirname), file_path);
});

// Mappings for libraries that we bundle in the Kolibri core app.

var libs =  function (kolibri_name) {
    return {
        'loglevel': kolibri_name + '.lib.loglevel',
        'vue': kolibri_name + '.lib.vue',
        'kolibri': kolibri_name
    };

};

var bundles = recurseBundlePlugins(js_source_dirs, path.dirname(__dirname), libs);

module.exports = bundles;
