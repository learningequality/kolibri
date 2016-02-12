var path = require('path');
var webpack = require('webpack');

var logging = require('./assets/js/logging');
var iniFiles = require('./assets/js/ini_files');

var bundles = [];

var js_source_dirs = [
    "kolibri/core",
    "kolibri/plugins"
];

for (var i = 0; i < js_source_dirs.length; i++) {
    iniFiles.recurseBundleIni(path.join(__dirname, js_source_dirs[i]), bundles, __dirname);
}

module.exports = bundles;
