var temp = require('temp').track();
var fs = require('fs');
var execSync = require('child_process').execSync;

module.exports = function() {
  // the temporary path where the webpack_json json is stored
  var webpack_json_tempfile = temp.openSync({ suffix: '.json' }).path;

  // Run the script below to extract the relevant information about the plugin configuration from the Python code.

  // For reasons unknown, there is an extra /usr/bin injected into PATH while running execSync, which
  // by-passes the virtualenv!
  // You can debug it like this:
  //     execSync("PATH=$(echo $PATH | sed 's/\\/usr\\/bin://g')\":/usr/bin\" which python >&2 && exit 1", {env: process.env});
  // ..hence, we have manipulated the path in the shell command to remove Node's unwanted manipulation
  execSync("PATH=$(echo $PATH | sed 's/\\/usr\\/bin://g')\":/usr/bin\" python -m kolibri manage webpack_json --outputfile " + webpack_json_tempfile, {env: process.env});

  var result = fs.readFileSync(webpack_json_tempfile);

  temp.cleanupSync(); // cleanup the tempfile immediately!

  if (result.length > 0) {
    // The above script prints JSON to stdout, here we parse that JSON and use it as input to our webpack
    // configuration builder module, parseBundlePlugin.
    return JSON.parse(result);
  }

  return [];
};
