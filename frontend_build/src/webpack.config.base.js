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
var path = require('path');

/*
 * This is a filthy hack. Do as I say, not as I do.
 * Taken from: https://gist.github.com/branneman/8048520#6-the-hack
 * This forces the NODE_PATH environment variable to include the main
 * kolibri node_modules folder, so that even plugins being built outside
 * of the kolibri folder will have access to all installed loaders, etc.
 * Doing it here, rather than at command invocation, allows us to do this
 * in a cross platform way, and also to avoid having to prepend it to all
 * our commands that end up invoking webpack.
 */

process.env.NODE_PATH = path.resolve(path.join(__dirname, '..', '..', 'node_modules'));
require('module').Module._initPaths();

var fs = require('fs');
var path = require('path');
var webpack = require('webpack');
var merge = require('webpack-merge');
var PrettierFrontendPlugin = require('./prettier-frontend-webpack-plugin');
var ExtractTextPlugin = require('extract-text-webpack-plugin');

var production = process.env.NODE_ENV === 'production';
var lint = process.env.LINT || production;

var postCSSLoader = {
  loader: 'postcss-loader',
  options: { config: path.resolve(__dirname, '../../postcss.config.js') },
};

var cssLoader = {
  loader: 'css-loader',
  options: { minimize: production, sourceMap: !production },
};

// for stylus blocks in vue files.
var vueStylusLoaders = [cssLoader, postCSSLoader, 'stylus-loader'];
if (lint) {
  vueStylusLoaders.push('stylint-loader');
}

// for scss blocks in vue files (e.g. Keen-UI files)
var vueSassLoaders = [
  cssLoader,
  postCSSLoader,
  {
    loader: 'sass-loader',
    // prepends these variable override values to every parsed vue SASS block
    options: { data: '@import "~kolibri.styles.keenVars";' },
  },
];

// primary webpack config
var config = {
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: 'vue-loader',
        options: {
          preserveWhitespace: false,
          loaders: {
            js: 'buble-loader',
            stylus: ExtractTextPlugin.extract({
              allChunks: true,
              use: vueStylusLoaders,
            }),
            scss: ExtractTextPlugin.extract({
              allChunks: true,
              use: vueSassLoaders,
            }),
          },
          // handles <mat-svg/>, <ion-svg/>, <iconic-svg/>, and <file-svg/> svg inlining
          preLoaders: { html: 'svg-icon-inline-loader' },
        },
      },
      {
        test: /\.js$/,
        loader: 'buble-loader',
        exclude: /node_modules\/(?!(keen-ui)\/).*/,
      },
      {
        test: /\.css$/,
        use: ExtractTextPlugin.extract({
          allChunks: true,
          use: [cssLoader, postCSSLoader],
        }),
      },
      {
        test: /\.styl$/,
        use: ExtractTextPlugin.extract({
          allChunks: true,
          use: [cssLoader, postCSSLoader, 'stylus-loader'],
        }),
      },
      {
        test: /\.s[a|c]ss$/,
        use: ExtractTextPlugin.extract({
          allChunks: true,
          use: [cssLoader, postCSSLoader, 'sass-loader'],
        }),
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/,
        use: {
          loader: 'url-loader',
          options: { limit: 10000, name: '[name].[ext]?[hash]' },
        },
      },
      // Use file loader to load font files.
      {
        test: /\.(eot|woff|ttf|woff2)$/,
        use: {
          loader: 'file-loader',
          options: { name: '[name].[ext]?[hash]' },
        },
      },
      // Hack to make the onloadCSS node module properly export-able.
      // Not currently used - we may be able to delete this if we
      // deprecate our custom KolibriModule async css loading functionality.
      {
        test: /fg-loadcss\/src\/onloadCSS/,
        use: 'exports-loader?onloadCSS',
      },
    ],
  },
  plugins: [],
  resolve: {
    extensions: ['.js', '.vue', '.styl'],
  },
  node: {
    __filename: true,
  },
};

// Only lint in dev mode if LINT env is set. Always lint in production.
if (lint) {
  // adds custom rules
  require('./htmlhint_custom');
  var prettierOptions = require('../../.prettier');

  var lintConfig = {
    module: {
      rules: [
        {
          test: /\.(vue|html)/,
          enforce: 'pre',
          use: {
            loader: 'htmlhint-loader',
            options: { failOnError: true, emitAs: 'error' },
          },
          exclude: /node_modules/,
        },
        {
          test: /\.styl$/,
          enforce: 'pre',
          loader: 'stylint-loader',
        },
      ],
    },
    plugins: [
      new PrettierFrontendPlugin({
        extensions: ['.js', '.vue'],
        logLevel: 'warn',
        prettierOptions,
      }),
    ],
  };
  config = merge.smart(config, lintConfig);
}

module.exports = config;
