/*
 * This takes all bundles defined in our production webpack configuration and adds inline source
 * maps to all of them for easier debugging.
 * Any dev specific modifications to the build should be specified in here, where each bundles[i]
 * object is a webpack configuration object that needs to be edited/manipulated to add features to.
 */

const webpack = require('webpack');
const readBundlePlugins = require('./read_bundle_plugins');

function bundles(pluginsData) {
  const pluginBundles = readBundlePlugins(pluginsData);

  for (var i = 0; i < pluginBundles.length; i++) {
    pluginBundles[i].devtool = '#cheap-module-source-map';
    pluginBundles[i].mode = 'development';
    pluginBundles[i].plugins = pluginBundles[i].plugins.concat([
      new webpack.DefinePlugin({
        'process.env': {
          NODE_ENV: '"debug"',
        },
      }),
    ]);
  }
  return pluginBundles;
}


module.exports = bundles;
