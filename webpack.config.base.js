/*
 * This file defines the base webpack configuration that is shared across both build and testing environments.
 */

var webpack = require('webpack');

var config = {
    module: {
        preLoaders: [],
        loaders: [
            { test: /backbone\.js$/, loader: 'imports?define=>false' }
        ]
    },
    plugins: [
        new webpack.IgnorePlugin(/^jquery$/)
    ],
    resolve: {
        alias: {
            'plugin_base': 'kolibri/plugins/assets/src/plugin_base/plugin_base'
        }
    }
};

module.exports = config;
