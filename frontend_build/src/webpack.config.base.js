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
var webpack = require('webpack');
var jeet = require('jeet');
var autoprefixer = require('autoprefixer');
var merge = require('webpack-merge');

var aliases = require('./apiSpecExportTools').coreAliases();

aliases['kolibri_module']= path.resolve('kolibri/core/assets/src/kolibri_module');
aliases['content_renderer_module'] = path.resolve('kolibri/core/assets/src/content_renderer_module');

require('./htmlhint_custom'); // adds custom rules

var config = {
  module: {
    loaders: [
      {
        test: /\.vue$/,
        loader: 'vue'
      },
      {
        test: /\.js$/,
        loader: 'buble',
        exclude: /node_modules/
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
        loader: 'style-loader!css-loader?sourceMap!postcss-loader!stylus-loader'
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
      }
    ],
    postLoaders: [
      {
        test: /vue-icons/,
        loader: "callback-loader"
      }
    ]
  },
  plugins: [
  ],
  resolve: {
    alias: aliases,
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
      js: 'buble-loader',
      stylus: 'vue-style-loader!css-loader?sourceMap!postcss-loader!stylus-loader',
      html: 'vue-loader/lib/template-compiler!svg-inline', // inlines SVGs
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
  },
};

if (process.env.LINT || process.env.NODE_ENV === 'production') {
  // Only lint in dev mode if LINT env is set. Always lint in production.
  var lintConfig = {
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
          test: /\.styl$/,
          loader: 'style-loader!css-loader?sourceMap!postcss-loader!stylus-loader!stylint'
        }
      ],
    },
    vue: {
      loaders: {
        stylus: 'vue-style-loader!css-loader?sourceMap!postcss-loader!stylus-loader!stylint'
      }
    },
  };
  config = merge.smart(config, lintConfig);
}

module.exports = config;
