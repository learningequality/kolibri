var BundleTracker = require('webpack-bundle-tracker');
var iniParser = require('ini-parser');
var fs = require("fs");
var path = require("path");

var parseBundleIni = require('./parse_bundle_ini');

var recurseBundleIni = function(directory, bundles, base_dir) {
    var files = fs.readdirSync(directory);
    files.forEach(function(file){
        var stats = fs.statSync(path.join(directory, file));
        if (stats.isDirectory()) {
            recurseBundleIni(path.join(directory, file), bundles, base_dir);
        } else if (file.indexOf("bundles.ini") > -1) {
            parseBundleIni(path.join(directory, file), bundles, base_dir);
        }
    });
};

module.exports = recurseBundleIni;
