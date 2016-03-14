/*
 * This file defines the base webpack configuration that is shared across both build and testing environments.
 */

var webpack = require('webpack');

var config = {
    module: {
        preLoaders: [],
        loaders: [
            // This is required in order to prevent Backbone from importing jQuery.
            // See here for more details: https://github.com/jashkenas/backbone/wiki/Using-Backbone-without-jQuery
            { test: /backbone\.js$/, loader: 'imports?define=>false' }
        ]
    },
    plugins: [
        // This is required in order to prevent Backbone from importing jQuery.
        new webpack.IgnorePlugin(/^jquery$/)
    ],
    resolve: {
        // This allows us to specify some 'shortcuts' to avoid typing out very long relative paths for frequently
        // imported requires.
        alias: {
            'plugin_base': 'kolibri/plugins/assets/src/plugin_base/plugin_base'
        }
    }
};

module.exports = config;
