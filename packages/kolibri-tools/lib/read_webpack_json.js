const fs = require('fs');
const execSync = require('child_process').execSync;
const path = require('path');
const temp = require('temp').track();

const webpack_json = path.resolve(path.dirname(__filename), './webpack_json.py');

module.exports = function({ pluginFile, plugins, pluginPaths }) {
  // the temporary path where the webpack_json json is stored
  const webpack_json_tempfile = temp.openSync({ suffix: '.json' }).path;

  // Extract the relevant information about the plugin configuration from the Python code.

  // For reasons unknown, there is an extra /usr/bin injected into PATH while running execSync, which
  // by-passes the virtualenv!

  // Refs: https://github.com/yarnpkg/yarn/issues/5874
  // See PR: https://github.com/learningequality/kolibri/pull/3777

  // You can debug it like this:
  //     execSync("PATH=$(echo $PATH | sed 's/\\/usr\\/bin://g')\":/usr/bin\" which python >&2 && exit 1", {env: process.env});
  // ..hence, we have manipulated the path in the shell command to remove Node's unwanted manipulation
  let command = `python ${webpack_json} --output_file ${webpack_json_tempfile} `;
  // The plugin file takes precedence here.
  if (pluginFile) {
    command += `--plugin_file ${pluginFile}`;
  } else if (plugins.length) {
    const allPlugins = plugins.join(' ');
    command += `--plugins ${allPlugins}`;
    if (pluginPaths.length && pluginPaths.length === plugins.length) {
      const allPaths = pluginPaths.map(p => path.resolve(process.cwd(), p)).join(' ');
      command += ` --plugin_paths ${allPaths}`;
    } else if (pluginPaths.length && pluginPaths.length !== plugins.length) {
      throw ReferenceError('Plugin paths and plugins must be of equal length');
    }
  }
  if (process.platform !== 'win32') {
    execSync(`PATH=$(echo $PATH | sed 's/\\/usr\\/bin://g')\":/usr/bin\" ${command}`);
  } else {
    execSync(command);
  }

  const result = fs.readFileSync(webpack_json_tempfile);

  temp.cleanupSync(); // cleanup the tempfile immediately!

  if (result.length > 0) {
    // The above script prints JSON to stdout, here we parse that JSON and use it as input to our webpack
    // configuration builder module, parseBundlePlugin.
    return JSON.parse(result);
  }

  return [];
};
