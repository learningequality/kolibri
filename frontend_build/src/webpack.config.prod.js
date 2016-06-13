/*
 * This takes all bundles defined in our production webpack configuration and adds inline source maps to all of them
 * for easier debugging.
 * Any dev specific modifications to the build should be specified in here, where each bundles[i] object is a webpack
 * configuration object that needs to be edited/manipulated to add features to.
 */

var webpack = require('webpack');
var bundles = require('./webpack.config.js');

for (var i=0; i < bundles.length; i++) {
  bundles[i].plugins = bundles[i].plugins.concat([
    // short-circuits all Vue.js warning code
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: '"production"'
      }
    }),
    // minify with dead-code elimination
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        warnings: false
      }
    }),
    // optimize module ids by occurence count
    new webpack.optimize.OccurenceOrderPlugin()
  ]);
}

module.exports = bundles;
