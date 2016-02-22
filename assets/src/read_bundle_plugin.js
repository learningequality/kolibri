var fs = require("fs");
var path = require("path");
var logging = require('./logging');
var execSync = require('child_process').execSync;

var parseBundlePlugin = require('./parse_bundle_plugin');

var readBundlePlugin = function(plugin_file, base_dir) {
    var plugin = path.relative(base_dir, plugin_file).replace(".py", "").replace(/\//g, ".");
    var bundles = [];
    var externals = {};

    var result = execSync("python kolibri/utils/webpack_config_export.py " + plugin).toString();

    if (result.length > 0) {

        var results = result.split(/\n/g);

        for (var i = 0; i < results.length; i++) {
            var message = results[i];
            if (message.replace(/ /g, "") !== "") {
                message = JSON.parse(message);
                var output = parseBundlePlugin(message, base_dir);
                if (typeof output !== "undefined") {
                    bundles.push(output[0]);
                    if (typeof externals[output[1]] === "undefined") {
                        externals[output[1]] = output[1];
                    } else {
                        logging.warn("Two plugins setting with same external flag " + output[1] + " in plugin file: " + plugin_file);
                    }
                }
            }
        }
    }
    if (bundles.length > 0) {
        for (var k = 0; k < bundles.length; k++) {
            for (var j = 0; j < bundles.length; j++) {
                if (k !== j) {
                    // Only one key per object here, so just get the first key
                    if (Object.keys(bundles[k].entry)[0] === Object.keys(bundles[j].entry)[0]) {
                        logging.error("Duplicate keys: " + Object.keys(bundles[k].entry)[0] +
                            " in Python file: " + plugin_file);
                    }
                }
            }
        }
    }

    return [bundles, externals];

};

module.exports = readBundlePlugin;
