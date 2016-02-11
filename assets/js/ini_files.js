var BundleTracker = require('webpack-bundle-tracker');
var iniParser = require('ini-parser');
var fs = require("fs");
var path = require("path");

var parseBundleIni = function(iniFile, bundles) {
    var data = iniParser.parse(fs.readFileSync(iniFile, 'utf-8'));
    var bundle_data = {};
    for (var key in data) {
        if (typeof data[key].entry_file !== "undefined") {
            bundle_data[key] = path.join(path.dirname(iniFile), data[key].entry_file);
        } else {
            logging.error(iniFile + " file is misconfigured, missing 'entry_file' parameter for bundle " + key);
        }
    }

    var module_name = path.relative(__dirname, path.dirname(iniFile)).replace(/\//g, ".");

    if (Object.keys(bundle_data).length > 0) {
        bundles.push({
            context: __dirname,
            entry: bundle_data,
            output: {
                path: path.join(path.dirname(iniFile), "static", module_name),
                filename: "[name]-[hash].js"
            },
            plugins: [
                new BundleTracker({path: path.dirname(iniFile), filename: "bundle_catalog.json"})
            ]
        });
    }

    return bundles;
};

var recurseBundleIni = function(directory, bundles) {
    var files = fs.readdirSync(directory);
    files.forEach(function(file){
        var stats = fs.statSync(path.join(directory, file));
        if (stats.isDirectory()) {
            recurseBundleIni(path.join(directory, file), bundles);
        } else if (file.indexOf("bundles.ini") > -1) {
            parseBundleIni(path.join(directory, file), bundles);
        }
    });
};

module.exports = {
    parseBundleIni: parseBundleIni,
    recurseBundleIni: recurseBundleIni
};
