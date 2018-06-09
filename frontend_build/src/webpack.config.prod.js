/*
 * This defines the production settings for our webpack build.
 * Anything defined here is only applied during production building.
 */

var webpack = require('webpack');
var bundles = require('./webpack.config.js');

for (var i = 0; i < bundles.length; i++) {
  bundles[i].mode = 'production';
  bundles[i].stats = 'normal';
  bundles[i].plugins = bundles[i].plugins.concat([
    new webpack.LoaderOptionsPlugin({
      minimize: true,
      debug: false,
    }),
  ]);
}

module.exports = bundles;
