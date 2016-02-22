var fs = require("fs");
var path = require("path");
var logging = require('./logging');
var execSync = require('child_process').execSync;

var parseBundlePlugin = require('./parse_bundle_plugin');

var readBundlePlugin = function(plugin_file, base_dir) {
    plugin_file = path.relative(base_dir, plugin_file).replace(".py", "").replace(/\//g, ".");
    var bundles = [];
    var externals = {};

    var result = execSync("python kolibri/utils/webpack_config_export.py " + plugin_file).toString();

    if (result.length > 0) {

        result.split(/\n/g).forEach(function (message) {
            if (message.replace(/ /g, "") !== "") {
                message = JSON.parse(message);
                var results = parseBundlePlugin(message, base_dir);
                bundles.push(results[0]);
                externals[results[1]] = results[1];
            }
        });
    }

    return [bundles, externals];

};

module.exports = readBundlePlugin;
