'use strict';
/**
 * Bundle plugin parser module.
 * @module parseBundlePlugin
 * This file defines a function for parsing frontend plugin specific information in order to
 * add plugin specific configuration options to the base webpack config defined in the
 * webpack.config.base.js file. Any configuration that does not require specific information
 * about the plugin being built (like the entry file, the path for the plugin, etc)
 * should be added in that file and not in here.
 */

var BundleTracker = require('webpack-bundle-tracker');
var path = require('path');
var logging = require('./logging');
var webpack = require('webpack');
var base_config = require('./webpack.config.base');
var _ = require('lodash');
var extract$trs = require('./extract_$trs');
var merge = require('webpack-merge');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
var WebpackRTLPlugin = require('webpack-rtl-plugin');

/**
 * Turn an object containing the vital information for a frontend plugin and return a bundle
 * configuration for webpack.
 * @param {Object} data - An object that contains the data for configuring the bundle.
 * @param {string} data.src_file - The Javascript source file that initializes the plugin.
 * @param {string} data.name - The name that the plugin is referred to by.
 * @param {string} data.static_dir - Directory path to the module in which the plugin is defined.
 * @param {string} data.stats_file - The name of the webpack bundle stats file that the plugin data
 * @returns {Object} bundle - An object defining the webpack config.
 */
var parseBundlePlugin = function(data) {
  if (
    typeof data.src_file === 'undefined' ||
    typeof data.name === 'undefined' ||
    typeof data.static_dir === 'undefined' ||
    typeof data.static_url_root === 'undefined' ||
    typeof data.stats_file === 'undefined' ||
    typeof data.locale_data_folder === 'undefined' ||
    typeof data.plugin_path === 'undefined' ||
    typeof data.version === 'undefined'
  ) {
    logging.error(data.name + ' plugin is misconfigured, missing parameter(s)');
    return;
  }

  // Start from a base configuration file that defines common features of the webpack configuration
  // for all Kolibri plugins (including the core app).
  var base_bundle = _.cloneDeep(base_config);

  var local_config;

  try {
    local_config = require(path.resolve(path.join(data.plugin_path, 'webpack.config.js')));
  } catch (e) {
    local_config = {};
  }

  if (local_config.coreAPISpec) {
    // Resolve this path now so that it can be unproblematically resolved later.
    local_config.coreAPISpec = path.resolve(path.join(data.plugin_path, local_config.coreAPISpec));
  }

  // Calculate these paths here, so that we can export __publicPath as a variable in the webpack
  // define plugin
  var publicPath, outputPath;

  if (process.env.DEV_SERVER) {
    var devServerConfig = require('./webpackdevserverconfig');
    // If running webpack dev server point to that endpoint.
    publicPath = devServerConfig.publicPath;
    // Set output path to local dir, as no files will be written - all built files are cached in
    // memory.
    outputPath = devServerConfig.basePath
      ? path.resolve(path.join('./', devServerConfig.basePath))
      : path.resolve('./');
  } else {
    publicPath = path.join('/', data.static_url_root, data.name, '/');
    outputPath = path.resolve(path.join(data.static_dir, data.name));
  }

  var bundle = {
    // Set the main entry for this module, set the name based on the data.name and the path to the
    // entry file from the data.src_file
    entry: {
      [data.name]: path.join(data.plugin_path, data.src_file),
    },
    name: data.name,
    output: {
      path: outputPath,
      filename: '[name]-' + data.version + '.js',
      // Need to define this in order for chunks to be named
      // Without this chunks from different bundles will likely have colliding names
      chunkFilename: '[name]-' + data.version + '.js',
      publicPath: publicPath,
    },
    resolve: {
      modules: [
        // Add local resolution paths
        path.join(data.plugin_path, 'node_modules'),
      ],
    },
    resolveLoader: {
      // Add local resolution paths for loaders
      modules: [path.join(data.plugin_path, 'node_modules')],
    },
    plugins: [
      new ExtractTextPlugin('[name]' + data.version + '.css'),
      new WebpackRTLPlugin({
        minify: {
          zindex: false,
          // prevent renaming keyframes
          reduceIdents: false,
        },
      }),
      // BundleTracker creates stats about our built files which we can then pass to Django to
      // allow our template tags to load the correct frontend files.
      new BundleTracker({
        path: path.dirname(data.stats_file),
        filename: path.basename(data.stats_file),
      }),
      // Plugins know their own name, by having a variable that we define here, based on the name
      // they are given in kolibri_plugins.py inside their relevant module.
      // We also pass in the events hashes here as well, as they are defined in the Python
      // specification of the KolibriModule.
      new webpack.DefinePlugin({
        __kolibriModuleName: JSON.stringify(data.name),
        __events: JSON.stringify(data.events || {}),
        __once: JSON.stringify(data.once || {}),
        __version: JSON.stringify(data.version),
        // This is necessary to allow modules that use service workers to fetch their service
        // worker code
        __publicPath: JSON.stringify(publicPath),
      }),
      new extract$trs(data.locale_data_folder, data.name),
    ],
  };

  bundle = merge.smart(bundle, base_bundle, local_config);

  return bundle;
};

module.exports = parseBundlePlugin;
