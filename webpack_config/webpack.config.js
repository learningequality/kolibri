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
var libs =  function (kolibri_name) {
    return {
        'lodash': kolibri_name + '.lib._',
        'backbone': kolibri_name + '.lib.Backbone',
        'loglevel': kolibri_name + '.lib.loglevel',
        'kolibri': kolibri_name
    };

};

var bundles = readBundlePlugins(path.dirname(__dirname), libs);

module.exports = bundles;
