var BundleTracker = require('webpack-bundle-tracker');
var fs = require("fs");
var path = require("path");
var logging = require("./logging");

var readBundlePlugin = require('./read_bundle_plugin');

var recurseBundlePlugins = function(directories, base_dir) {
    var recurse = function(directories, base_dir) {
        var files = [];
        directories.forEach(function (directory) {
            var dir_files = fs.readdirSync(directory);
            dir_files.forEach(function (file) {
                var stats = fs.statSync(path.join(directory, file));
                if (stats.isDirectory()) {
                    files = files.concat(recurse([path.join(directory, file)], base_dir));
                } else if (file === "kolibri_plugin.py") {
                    files.push(path.join(directory, file));
                }
            });
        });
        return files;
    };

    var files = recurse(directories, base_dir);
    var bundles = [];
    var externals = {};

    for (var i = 0; i < files.length; i ++){
        var file = files[i];
        var result = readBundlePlugin(file, base_dir);
        bundles = bundles.concat(result[0]);
        for (var key in result[1]) {
            externals[key] = result[1][key];
        }
    }


    bundles.forEach(function(bundle) {
        bundle.externals = externals;
    });

    return bundles;
};

module.exports = recurseBundlePlugins;
