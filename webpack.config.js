var path = require('path');
var webpack = require('webpack');

var logging = require('./assets/src/logging');
var recurseBundleIni = require('./assets/src/recurse_bundle_ini');

var bundles = [];

var js_source_dirs = [
    "kolibri/core",
    "kolibri/plugins"
];

for (var i = 0; i < js_source_dirs.length; i++) {
    recurseBundleIni(path.join(__dirname, js_source_dirs[i]), bundles, __dirname);
}

module.exports = bundles;
