/*
 * This file defines the base webpack configuration that is shared across both
 * build and testing environments. If you need to add anything to the general
 * webpack config, like adding loaders for different asset types, different
 * preLoaders or Plugins - they should be done here. If you are looking to add
 * dev specific features, please do so in webpack.config.dev.js - if you wish
 * to add test specific features, these can be done in the karma.conf.js.
 *
 * Note:
 *  This file is not called directly by webpack.
 *  It copied once for each plugin by parse_bundle_plugin.js
 *  and used as a template, with additional plugin-specific
 *  modifications made on top.
 */

var fs = require('fs');
var path = require('path');
var webpack = require('webpack');

require('./htmlhint_custom'); // adds custom rules

var config = {
  module: {
    preLoaders: [
      {
        test: /\.(vue|js)$/,
        loader: 'eslint',
        exclude: /node_modules/
      },
      {
        test: /\.(vue|html)/,
        loader: 'htmlhint',
        exclude: /node_modules/
      }
    ],
    loaders: [
      {
        test: /\.vue$/,
        loader: 'vue'
      },
      {
        test: /\.js$/,
        loader: 'babel',
        exclude: /node_modules/
      },
      {
        test: /\.json$/,
        loader: 'json',
      },
      {
        test: /\.css$/,
        loader: 'style-loader!css-loader'
      },
      {
        test: /\.styl$/,
        loader: 'style-loader!css-loader?sourceMap!stylus-loader!stylint'
      },
      // moved from parse_bundle_plugin.js
      {
        test: /\.(png|jpg|gif)$/,
        loader: 'url',
        query: {
          limit: 10000,
          name: '[name].[ext]?[hash]'
        }
      },
      // Hack to make the onloadCSS node module properly export-able.
      // Not currently used - we may be able to delete this if we
      // deprecate our custom KolibriModule async css loading functionality.
      {
        test: /fg-loadcss\/src\/onloadCSS/,
        loader: 'exports?onloadCSS'
      }
    ]
  },
  plugins: [
  ],
  resolve: {
    alias: {
      'kolibri_module': path.join(__dirname, '..', '..', 'kolibri', 'core', 'assets', 'src', 'kolibri_module'),
      'core-base': path.join(__dirname, '..', '..', 'kolibri', 'core', 'assets', 'src', 'core-base'),
      'core-theme.styl': path.join(__dirname, '..', '..', 'kolibri', 'core', 'assets', 'src', 'core-theme.styl'),
      'content-renderer': path.resolve('kolibri/core/assets/src/content-renderer'),
    },
    extensions: ["", ".vue", ".js"],
  },
  eslint: {
    failOnError: true
  },
  htmlhint: {
    failOnError: true,
    emitAs: "error"
  },
  vue: {
    loaders: {
      stylus: 'vue-style-loader!css-loader?sourceMap!stylus-loader!stylint',
    }
  }
};

module.exports = config;
