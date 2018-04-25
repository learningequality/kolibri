/*
 * This defines the production settings for our webpack build.
 * Anything defined here is only applied during production building.
 */

process.env.NODE_ENV = 'production';

var webpack = require('webpack');
var bundles = require('./webpack.config.js');
var UglifyJsPlugin = require('uglifyjs-webpack-plugin');
var OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');

for (var i = 0; i < bundles.length; i++) {
  bundles[i].mode = 'production';
  bundles[i].optimization = {
    minimizer: [
      new UglifyJsPlugin({
        cache: true,
        parallel: true,
        sourceMap: false, // set to true if you want JS source maps
      }),
      new OptimizeCSSAssetsPlugin({}),
    ],
  };
  bundles[i].plugins = bundles[i].plugins.concat([
    // short-circuits all Vue.js warning code
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: '"production"',
      },
    }),
    new webpack.LoaderOptionsPlugin({
      minimize: true,
      debug: false,
    }),
  ]);
}

module.exports = bundles;
