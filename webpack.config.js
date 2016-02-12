var path = require('path');
var webpack = require('webpack');

var logging = require('./assets/src/logging');
var recurseBundleIni = require('./assets/src/recurse_bundle_ini');

var bundles = [];

var js_source_dirs = [
    "kolibri/core",
    "kolibri/plugins"
];


bundles = recurseBundleIni(js_source_dirs, bundles, __dirname);


module.exports = bundles;
