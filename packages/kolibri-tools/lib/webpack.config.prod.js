/*
 * This defines the production settings for our webpack build.
 * Anything defined here is only applied during production building.
 */

const webpack = require('webpack');
const readBundlePlugins = require('./read_bundle_plugins');

function bundles(pluginsData) {
  const pluginBundles = readBundlePlugins(pluginsData);

  for (var i = 0; i < pluginBundles.length; i++) {
    pluginBundles[i].mode = 'production';
    pluginBundles[i].stats = 'normal';
    pluginBundles[i].plugins = pluginBundles[i].plugins.concat([
      new webpack.LoaderOptionsPlugin({
        minimize: true,
        debug: false,
      }),
    ]);
  }
  return pluginBundles;
}


module.exports = bundles;
