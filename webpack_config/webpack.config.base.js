/*
 * This file defines the base webpack configuration that is shared across both build and testing environments.
 * If you need to add anything to the general webpack config, like adding loaders for different asset types, different
 * preLoaders or Plugins - they should be done here. If you are looking to add dev specific features, please do so in
 * webpack.config.dev.js - if you wish to add test specific features, these can be done in the karma.conf.js.
 *
 * Note:
 * this file is not called directly by webpack.
 * It is called once for each plugin by parse_bundle_plugin.js
 */

var webpack = require('webpack');
var utils = require('./utils')

var config = {
    module: {
        preLoaders: [
          {
              test: /\.vue.html$/,
              loader: 'eslint',
              exclude: /node_modules/
          },
          {
              test: /\.js$/,
              loader: 'eslint',
              exclude: /node_modules/
          }
        ],
        loaders: [
            {
              test: /\.vue.html$/,
              loader: 'vue'
            },
            // This is required in order to prevent Backbone from importing jQuery.
            // See here for more details: https://github.com/jashkenas/backbone/wiki/Using-Backbone-without-jQuery
            {
                test: /backbone\.js$/,
                loader: 'imports?define=>false'
            },
            {
                test: /\.js$/,
                loader: 'babel',
                exclude: /node_modules/
            },
            {
                test: /fg-loadcss\/src\/onloadCSS/,
                loader: 'exports?onloadCSS'
            },
            //Loaders for straight css
            {
                test: /\.css$/,
                loader: 'style-loader!css-loader'
            },
            // loaders for stylus
            {
                test: /\.styl$/,
                loader: 'style-loader!css-loader!stylus-loader'
            }
        ]
    },
    plugins: [
        // This is required in order to prevent Backbone from importing jQuery.
        new webpack.IgnorePlugin(/^jquery$/)
    ],
    resolve: {
        // shortcut to allow importing the core kolibri_module from other bundles (plugins)
        alias: {
            'kolibri_module': 'kolibri/core/assets/src/kolibri_module'
        },
        extensions: ["", ".vue.html", ".js"],
    },
    eslint: {
        failOnError: true
    },
    vue: {
        loaders: utils.cssLoaders()
    }

};

module.exports = config;
