/*
 * This defines the production settings for our webpack build.
 * Anything defined here is only applied during production building.
 */

process.env.NODE_ENV = 'production';

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
    })
  ]);
}

module.exports = bundles;
