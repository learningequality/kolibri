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
var merge = require('webpack-merge');

var aliases = require('./apiSpecExportTools').coreAliases();

var production = process.env.NODE_ENV === 'production';
var lint = (process.env.LINT || production);

aliases['kolibri_module']= path.resolve('kolibri/core/assets/src/kolibri_module');
aliases['content_renderer_module'] = path.resolve('kolibri/core/assets/src/content_renderer_module');


// helps convert to older string syntax for vue-loader
var combineLoaders = require('webpack-combine-loaders');

// for stylus blocks in vue files
const vueStylusLoaders = [
  'vue-style-loader', // includes postcss processing
  {
    loader: 'css-loader',
    options: { minimize: production, sourceMap: !production }
  },
  'stylus-loader'
];

if (lint) {
  vueStylusLoaders.push('stylint-loader')
}

// for scss blocks in vue files (e.g. Keen-UI files)
const vueSassLoaders = [
  'vue-style-loader', // includes postcss processing
  {
    loader: 'css-loader',
    options: {
      minimize: production,
      sourceMap: !production,
    }
  },
  'sass-loader'
];

// primary webpack config
var config = {
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: 'vue-loader',
        options: {
          loaders: {
            js: 'buble-loader',
            stylus: combineLoaders(vueStylusLoaders),
            scss: combineLoaders(vueSassLoaders),
          },
          preLoaders: {
            // handles <mat-svg/>, <ion-svg/>, <iconic-svg/>, and <file-svg/> svg inlining
            html: 'svg-icon-inline-loader',
          }
        }
      },
      {
        test: /\.js$/,
        loader: 'buble-loader'
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: { minimize: production, sourceMap: !production }
          },
          'postcss-loader'
        ]
      },
      {
        test: /\.styl$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: { minimize: production, sourceMap: !production }
          },
          'postcss-loader',
          'stylus-loader',
        ]
      },
      {
        test: /\.s[a|c]ss$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: { minimize: production, sourceMap: !production }
          },
          'postcss-loader',
          'sass-loader',
        ]
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/,
        use: [
          {
            loader: 'url-loader',
            options: {
              limit: 10000,
              name: '[name].[ext]?[hash]'
            }
          }
        ]
      },
      // Use file loader to load font files.
      {
        test: /\.(eot|woff|ttf|woff2)$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[name].[ext]?[hash]'
            }
          }
        ]
      },
      // Hack to make the onloadCSS node module properly export-able.
      // Not currently used - we may be able to delete this if we
      // deprecate our custom KolibriModule async css loading functionality.
      {
        test: /fg-loadcss\/src\/onloadCSS/,
        use: 'exports-loader?onloadCSS'
      }
    ]
  },
  plugins: [
  ],
  resolve: {
    alias: aliases,
    extensions: [".js", ".vue"],
  },
  node: {
    __filename: true
  }
};


// Only lint in dev mode if LINT env is set. Always lint in production.
if (lint) {

  // adds custom rules
  require('./htmlhint_custom');

  var lintConfig = {
    module: {
      rules: [
        {
          test: /\.(vue|js)$/,
          enforce: 'pre',
          use: [
            {
              loader: 'eslint-loader',
              options: {
                failOnError: true
              }
            }
          ],
          exclude: /node_modules/
        },
        {
          test: /\.(vue|html)/,
          enforce: 'pre',
          use: [
            {
              loader: 'htmlhint-loader',
              options: {
                failOnError: true,
                emitAs: "error"
              }
            }
          ],
          exclude: /node_modules/
        },
        {
          test: /\.styl$/,
          enforce: 'pre',
          loader: 'stylint-loader'
        }
      ]
    }
  };
  config = merge.smart(config, lintConfig);
}

module.exports = config;
