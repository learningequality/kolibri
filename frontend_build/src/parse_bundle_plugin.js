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
var base_config = require('./webpack.config.base');
var _ = require('lodash');
var extract$trs = require('./extract_$trs');
var merge = require('webpack-merge');
var iconLoader = require("vue-icons/icon-loader");

/**
 * Turn an object containing the vital information for a frontend plugin and return a bundle configuration for webpack.
 * @param {Object} data - An object that contains the data for configuring the bundle.
 * @param {string} data.src_file - The Javascript source file that initializes the plugin.
 * @param {string} data.name - The name that the plugin is referred to by.
 * @param {string} data.static_dir - Directory path to the module in which the plugin is defined.
 * @param {string} data.stats_file - The name of the webpack bundle stats file that the plugin data should be saved to.
 * @param {string} [data.external] - Flag to indicate that the module should be exposed as an external library
 * to other plugins.
 * @param {string} base_dir - The absolute path of the base directory for writing files to.
 * @returns {Array}
 * @returns {Object} [0] bundle - An object defining the webpack config.
 * @returns {string} [1] [external] - A string flagging the name to be used to refer to the plugin as an external lib.
 */
var parseBundlePlugin = function(data, base_dir) {

  if ((typeof data.src_file === "undefined") ||
      (typeof data.name === "undefined") ||
      (typeof data.static_dir === "undefined") ||
      (typeof data.static_url_root === "undefined") ||
      (typeof data.stats_file === "undefined") ||
      (typeof data.locale_data_folder === "undefined") ||
      (typeof data.plugin_path === "undefined") ||
      (typeof data.version === "undefined")) {
    logging.error(data.name + ' plugin is misconfigured, missing parameter(s)');
    return;
  }

  // Start from a base configuration file that defines common features of the webpack configuration for all Kolibri
  // plugins (including the core app).
  var bundle = _.cloneDeep(base_config);
  var external;
  var library;

  var local_config;

  try {
    local_config = require(path.resolve(path.join(data.plugin_path, 'webpack.config.js')));
  } catch (e) {
    local_config = {};
  }

  bundle = merge.smart(bundle, local_config);

  bundle.callbackLoader = iconLoader(bundle.iconList);

  // This might be non-standard use of the entry option? It seems to
  // interact with read_bundle_plugins.js
  bundle.entry = {}
  bundle.entry[data.name] = path.join(data.plugin_path, data.src_file);

  if (typeof data.external !== "undefined" && data.external && data.core_name) {
    // If we want to create a plugin that can be directly referenced by other plugins, this sets it to be
    // instantiated as a global variable. Only to be used by the Kolibri core app.
    external = data.name;
    library = data.core_name;
  }

  // Add local resolution paths
  bundle.resolve.root = [path.join(data.plugin_path, 'node_modules'), base_dir, path.join(base_dir, 'node_modules')];
  // Add local and global resolution paths for loaders to allow any plugin to
  // access kolibri/node_modules loaders during bundling.
  bundle["resolveLoader"] = {
    root: [path.join(data.plugin_path, 'node_modules'), base_dir, path.join(base_dir, 'node_modules')]
  };

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
    }),
    new extract$trs(data.locale_data_folder, data.name)
  ]);

  var publicPath, outputPath;

  if (process.env.DEV_SERVER) {
    var devServerConfig = require('./webpackdevserverconfig');
    // If running webpack dev server point to that endpoint.
    publicPath = devServerConfig.publicPath;
    // Set output path to base dir, as no files will be written - all built files are cached in memory.
    outputPath = devServerConfig.basePath ? path.resolve(path.join(base_dir, devServerConfig.basePath)) : path.resolve(base_dir);
  } else {
    publicPath = path.join("/", data.static_url_root, data.name, "/");
    outputPath = path.join(data.static_dir, data.name);
  }

  bundle.core_name = data.core_name;
  bundle.name = data.name;
  bundle.context = base_dir;
  bundle.output = {
    path: outputPath,
    filename: "[name]-" + data.version + ".js",
    publicPath: publicPath,
    library: library
  };

  bundle.async_file = data.async_file;

  return [bundle, external];
};

module.exports = parseBundlePlugin;
