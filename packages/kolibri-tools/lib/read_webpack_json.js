const fs = require('fs');
const execSync = require('child_process').execSync;
const path = require('path');
const temp = require('temp').track();

const webpack_json = path.resolve(path.dirname(__filename), './webpack_json.py');

function parseConfig(webpackConfig, pythonData) {
  // Set the main entry for this module, set the name based on the data.name and the path to the
  // entry file from the data.src_file
  const uniqueSlug = webpackConfig.unique_slug;
  const pluginPath = pythonData.plugin_path;
  delete webpackConfig.unique_slug;
  if (typeof webpackConfig.entry === 'string') {
    webpackConfig.entry = {
      [uniqueSlug]: path.join(pluginPath, webpackConfig.entry),
    };
  } else {
    Object.keys(webpackConfig.entry).forEach(key => {
      function makePathAbsolute(entryPath) {
        if (entryPath.startsWith('./') || entryPath.startsWith('../')) {
          return path.join(pluginPath, entryPath);
        }
        return entryPath;
      }
      if (Array.isArray(webpackConfig.entry[key])) {
        webpackConfig.entry[key] = webpackConfig.entry[key].map(makePathAbsolute);
      } else {
        webpackConfig.entry[key] = makePathAbsolute(webpackConfig.entry[key]);
      }
    });
  }
  return {
    name: uniqueSlug,
    static_dir: path.join(pluginPath, 'static'),
    stats_file: path.join(pluginPath, 'build', `${uniqueSlug}_stats.json`),
    locale_data_folder: pythonData.locale_data_folder,
    plugin_path: pluginPath,
    version: pythonData.version,
    config: webpackConfig,
  };
}

module.exports = function({ pluginFile, plugins, pluginPath }) {
  // the temporary path where the webpack_json json is stored
  const webpack_json_tempfile = temp.openSync({ suffix: '.json' }).path;

  // Extract the relevant information about the plugin configuration from the Python code.

  // For reasons unknown, there is an extra /usr/bin injected into PATH while running
  // execSync, which by-passes the virtualenv!

  // Refs: https://github.com/yarnpkg/yarn/issues/5874
  // See PR: https://github.com/learningequality/kolibri/pull/3777

  // You can debug it like this:
  //     execSync("PATH=$(echo $PATH | sed 's/\\/usr\\/bin://g')\":/usr/bin\" which python >&2 && exit 1", {env: process.env});
  // ..hence, we have manipulated the path in the shell command to remove Node's
  // unwanted manipulation
  let command = `python ${webpack_json} --output_file ${webpack_json_tempfile} `;
  // The plugin file takes precedence here.
  if (pluginFile) {
    command += `--plugin_file ${pluginFile}`;
  } else if (plugins.length) {
    const allPlugins = plugins.join(' ');
    command += `--plugins ${allPlugins}`;
    if (pluginPath) {
      command += ` --plugin_path ${pluginPath}`;
    }
  }
  if (process.platform !== 'win32') {
    execSync(`PATH=$(echo $PATH | sed 's/\\/usr\\/bin://g')":/usr/bin" ${command}`);
  } else {
    execSync(command);
  }

  const result = fs.readFileSync(webpack_json_tempfile);

  temp.cleanupSync(); // cleanup the tempfile immediately!

  if (result.length > 0) {
    // The above script prints JSON to stdout, here we parse that JSON and use it
    // as input to our webpack configuration builder.
    const parsedResult = JSON.parse(result);
    const output = [];
    parsedResult.forEach(pythonData => {
      const webpackConfig = require(path.join(pythonData.plugin_path, 'webpack.config.js'));
      if (Array.isArray(webpackConfig)) {
        webpackConfig.forEach(configObj => {
          output.push(parseConfig(configObj, pythonData));
        });
      } else {
        output.push(parseConfig(webpackConfig, pythonData));
      }
    });
    return output;
  }

  return [];
};
