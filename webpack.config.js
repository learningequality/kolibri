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

var bundles = recurseBundlePlugins(js_source_dirs, __dirname);

module.exports = bundles;
