var temp = require('temp').track();
var fs = require("fs");
var execSync = require('child_process').execSync;

module.exports = function () {
  // the temporary path where the webpack_json json is stored
  var webpack_json_tempfile = temp.openSync({suffix: '.json'}).path;

  // Run the script below to extract the relevant information about the plugin configuration from the Python code.
  execSync("python -m kolibri manage webpack_json -- --outputfile " + webpack_json_tempfile);

  var result = fs.readFileSync(webpack_json_tempfile);

  temp.cleanupSync();           // cleanup the tempfile immediately!

  if (result.length > 0) {
    // The above script prints JSON to stdout, here we parse that JSON and use it as input to our webpack
    // configuration builder module, parseBundlePlugin.
    return JSON.parse(result);
  }

  return [];
};
