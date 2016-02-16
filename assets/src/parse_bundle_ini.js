var BundleTracker = require('webpack-bundle-tracker');
var iniParser = require('ini-parser');
var fs = require("fs");
var path = require("path");
var logging = require('./logging');

var parseBundleIni = function(iniFile, bundles, base_dir, externals) {
    var data = iniParser.parse(fs.readFileSync(iniFile, 'utf-8'));
    var bundle_data = {};
    var library;
    for (var key in data) {
        if (typeof data[key].entry_file !== "undefined") {
            if (typeof bundle_data[key] === "undefined") {
                bundle_data[key] = path.relative(base_dir, path.join(path.dirname(iniFile), data[key].entry_file));
                if (typeof data[key].external !== "undefined" && data[key].external) {
                    if (typeof externals[key] === "undefined") {
                        externals[key] = key;
                        library = key;

                    } else {
                        logging.warn(iniFile + " file is misconfigured, duplicate key " + key + " set as external module");
                    }
                }
            } else {
                logging.warn(iniFile + " file is misconfigured, duplicate key " + key + " set for plugins");
            }
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
                path: path.relative(base_dir, path.join(path.dirname(iniFile), "static", module_name)),
                filename: "[name]-[hash].js",
                publicPath: path.join(module_name, "/"),
                library: library
            },
            plugins: [
                new BundleTracker({
                    path: path.dirname(iniFile),
                    filename: "bundle_catalog.json"
                })
            ],
            resolve: {
                root: base_dir
            }
        });
    }

    return [bundles, externals];
};

module.exports = parseBundleIni;
