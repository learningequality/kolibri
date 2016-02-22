var BundleTracker = require('webpack-bundle-tracker');
var fs = require("fs");
var path = require("path");
var logging = require('./logging');

var parseBundlePlugin = function(data, base_dir) {
    var module_name = data.module_name;
    var bundle_data = {};
    var external, bundle;
    var library;
    if ((typeof data.entry_file !== "undefined") &&
        (typeof data.name !== "undefined") &&
        (typeof data.module_name !== "undefined") &&
        (typeof data.module_path !== "undefined") &&
        (typeof data.stats_file !== "undefined")) {
        bundle_data[data.name] = path.join(data.module_path, data.entry_file);
        if (typeof data.external !== "undefined" && data.external) {
            external = data.name;
            library = data.name;
        }
        bundle = {
            context: base_dir,
            entry: bundle_data,
            output: {
                path: path.relative(base_dir, path.join(data.module_path, "static", module_name)),
                filename: "[name]-[hash].js",
                publicPath: path.join(module_name, "/"),
                library: library
            },
            plugins: [
                new BundleTracker({
                    path: path.dirname(data.stats_file),
                    filename: path.basename(data.stats_file)
                })
            ],
            resolve: {
                root: base_dir
            }
        };
        return [bundle, external];
    } else {
        logging.error(module_name + " file is misconfigured, missing parameter(s) for bundle " + data.name);
    }
};

module.exports = parseBundlePlugin;
