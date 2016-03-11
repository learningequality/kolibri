var path = require('path');
var webpack = require('webpack');

var logging = require('./assets/src/logging');
var recurseBundlePlugins = require('./assets/src/recurse_bundle_plugins');

var js_source_dirs = [
    "kolibri/core",
    "kolibri/plugins"
].map(function(file_path) {
    return path.join(__dirname, file_path);
});

// Mappings for libraries that we bundle in the Kolibri core app.

var libs =  function (kolibri_name) {
    return {
        'lodash': kolibri_name + '.lib._',
        'backbone': kolibri_name + '.lib.Backbone',
        'loglevel': kolibri_name + '.lib.loglevel',
        'kolibri': kolibri_name
    };

};

var bundles = recurseBundlePlugins(js_source_dirs, __dirname, libs);

module.exports = bundles;
