var BundleTracker = require('webpack-bundle-tracker');
var iniParser = require('ini-parser');
var fs = require("fs");
var path = require("path");
var logging = require('./logging');

var parseBundleIni = function(iniFile, bundles, base_dir) {
    var data = iniParser.parse(fs.readFileSync(iniFile, 'utf-8'));
    var bundle_data = {};
    for (var key in data) {
        if (typeof data[key].entry_file !== "undefined") {
            bundle_data[key] = path.join(path.dirname(iniFile), data[key].entry_file);
        } else {
            logging.error(iniFile + " file is misconfigured, missing 'entry_file' parameter for bundle " + key);
        }
    }

    var module_name = path.relative(base_dir, path.dirname(iniFile)).replace(/\//g, ".");

    if (Object.keys(bundle_data).length > 0) {
        bundles.push({
            context: base_dir,
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

module.exports = parseBundleIni;
