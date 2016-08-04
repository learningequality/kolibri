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
var jeet = require('jeet');
var autoprefixer = require('autoprefixer');

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
        exclude: /node_modules/,
        query: {
          presets: ['es2015-ie'],
          plugins: ['transform-runtime']
        },
      },
      {
        test: /\.json$/,
        loader: 'json',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        loader: 'style-loader!css-loader!postcss-loader'
      },
      {
        test: /\.styl$/,
        loader: 'style-loader!css-loader?sourceMap!postcss-loader!stylus-loader!stylint'
      },
      // moved from parse_bundle_plugin.js
      {
        test: /\.(png|jpe?g|gif|svg)$/,
        loader: 'url',
        query: {
          limit: 10000,
          name: '[name].[ext]?[hash]'
        }
      },
      // Usage of file loader allows referencing a local vtt file without in-lining it.
      // Can be removed once the local en.vtt test file is removed.
      {
        test: /\.(vtt|eot|woff|ttf|woff2)$/,
        loader: 'file',
        query: {
          name: '[name].[ext]?[hash]'
        }
      },
      // Hack to make the onloadCSS node module properly export-able.
      // Not currently used - we may be able to delete this if we
      // deprecate our custom KolibriModule async css loading functionality.
      {
        test: /fg-loadcss\/src\/onloadCSS/,
        loader: 'exports?onloadCSS'
      },
      // Allows <video> and <audio> HTML5 tags work on all major browsers.
      {
        test: require.resolve('html5media/dist/api/1.1.8/html5media'),
        loader: "imports?this=>window"
      }
    ]
  },
  plugins: [
  ],
  resolve: {
    alias: {
      'kolibri_module': path.resolve('kolibri/core/assets/src/kolibri_module'),
      'core-base': path.resolve('kolibri/core/assets/src/vue/core-base'),
      'nav-bar-item': path.resolve('kolibri/core/assets/src/vue/nav-bar/nav-bar-item'),
      'icon-button': path.resolve('kolibri/core/assets/src/vue/icon-button'),
      'core-theme.styl': path.resolve('kolibri/core/assets/src/styles/core-theme.styl'),
      'content-renderer': path.resolve('kolibri/core/assets/src/vue/content-renderer'),
      'content_renderer_module': path.resolve('kolibri/core/assets/src/content_renderer_module'),
      'logging': path.resolve('kolibri/core/assets/src/logging'),
      'router': path.resolve('kolibri/core/assets/src/router'),
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
      html: 'vue-html-loader!markup-inline', // inlines SVGs
    }
  },
  stylus: {
    use: [jeet()]
  },
  postcss: function () {
    return [autoprefixer];
  },
  node: {
    __filename: true
  }
};

module.exports = config;
