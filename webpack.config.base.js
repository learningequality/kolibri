/*
 * This file defines the base webpack configuration that is shared across both build and testing environments.
 * If you need to add anything to the general webpack config, like adding loaders for different asset types, different
 * preLoaders or Plugins - they should be done here. If you are looking to add dev specific features, please do so in
 * webpack.config.dev.js - if you wish to add test specific features, these can be done in the karma.conf.js.
 */

var webpack = require('webpack');

var config = {
    module: {
        preLoaders: [],
        loaders: [
            // This is required in order to prevent Backbone from importing jQuery.
            // See here for more details: https://github.com/jashkenas/backbone/wiki/Using-Backbone-without-jQuery
            { test: /backbone\.js$/, loader: 'imports?define=>false' },
            { test: /fg-loadcss\/src\/onloadCSS/, loader: 'exports?onloadCSS'}
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
            'kolibri_module': 'kolibri/plugins/assets/src/kolibri_module/kolibri_module',
            'components': 'kolibri/core/assets/src/components'
        }
    }
};

module.exports = config;
