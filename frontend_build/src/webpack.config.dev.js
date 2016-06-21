/*
 * This takes all bundles defined in our production webpack configuration and adds inline source maps to all of them
 * for easier debugging.
 * Any dev specific modifications to the build should be specified in here, where each bundles[i] object is a webpack
 * configuration object that needs to be edited/manipulated to add features to.
 */

var webpack = require('webpack');
var bundles = require('./webpack.config.js');

for (var i=0; i < bundles.length; i++) {
  bundles[i].devtool = '#inline-source-map';
  bundles[i].plugins = bundles[i].plugins.concat([
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: '"debug"'
      }
    })
  ]);
}

module.exports = bundles;
