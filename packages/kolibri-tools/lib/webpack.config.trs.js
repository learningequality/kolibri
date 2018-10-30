/*
 * This defines the production settings for our webpack build.
 * Anything defined here is only applied during production building.
 */

const os = require('os');
const webpack = require('webpack');
const readBundlePlugins = require('./read_bundle_plugins');

function bundles(pluginsData) {
  const pluginBundles = readBundlePlugins(pluginsData);

  for (var i = 0; i < pluginBundles.length; i++) {
    pluginBundles[i].mode = 'development';
    pluginBundles[i].output.path = os.tmpdir();
  }
  return pluginBundles;
}

module.exports = bundles;
