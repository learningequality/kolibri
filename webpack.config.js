var path = require("path");
var webpack = require('webpack');
var BundleTracker = require('webpack-bundle-tracker');
var iniParser = require('ini-parser');
var fs = require('fs');
var logging = require('./assets/js/logging');

var bundles = [];

var js_source_dirs = [
    "kolibri/core",
    "kolibri/plugins"
];

var parseBundleIni = function(iniFile) {
    var data = iniParser.parse(fs.readFileSync(iniFile, 'utf-8'));
    var bundle_data = {};
    for (key in data) {
        logging.info(path.join(path.dirname(iniFile), "webpack-stats.json"));
        if (typeof data[key]["entry_file"] !== "undefined") {
            bundle_data[key] = path.join(path.dirname(iniFile), data[key]["entry_file"]);

        } else {
            logging.error(iniFile + " file is misconfigured, missing 'entry_file' parameter for bundle " + key);
        }
    }

    if (Object.keys(bundle_data).length > 0) {
        bundles.push({
            context: __dirname,
            entry: bundle_data,
            output: {
                path: path.join(path.dirname(iniFile), "static"),
                filename: "[name]-[hash].js"
            },
            plugins: [
                new BundleTracker({path: path.dirname(iniFile), filename: "webpack-stats.json"})
            ]
        });
    }
};

var recurseBundleIni = function(directory) {
    var files = fs.readdirSync(directory);
    files.forEach(function(file){
        var stats = fs.statSync(path.join(directory, file));
        if (stats.isDirectory()) {
            recurseBundleIni(path.join(directory, file));
        } else if (file.indexOf("bundles.ini") > -1) {
            parseBundleIni(path.join(directory, file));
        }
    });
};

for (var i = 0; i < js_source_dirs.length; i++) {
    recurseBundleIni(path.join(__dirname, js_source_dirs[i]));
}

module.exports = bundles;
