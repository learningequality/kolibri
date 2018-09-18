/*
 * This defines the production settings for our webpack build.
 * Anything defined here is only applied during production building.
 */

var os = require('os');
var webpack = require('webpack');
var { VueLoaderPlugin } = require('vue-loader');
var MiniCssExtractPlugin = require('mini-css-extract-plugin');
var bundles = require('./webpack.config.js');
var extract$trs = require('./extract_$trs');

for (var i = 0; i < bundles.length; i++) {
  bundles[i].mode = 'development';
  bundles[i].output.path = os.tmpdir();
  bundles[i].plugins = bundles[i].plugins.filter(function(plugin) {
    return (
      plugin instanceof extract$trs ||
      plugin instanceof VueLoaderPlugin ||
      plugin instanceof webpack.DefinePlugin ||
      plugin instanceof MiniCssExtractPlugin
    );
  });
  bundles[i].module.rules = bundles[i].module.rules.filter(function(rule) {
    return rule.enforce !== 'pre';
  });
}

module.exports = bundles;
