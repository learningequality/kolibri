const fs = require('node:fs');
const execSync = require('node:child_process').execSync;
const path = require('node:path');
const temp = require('temp').track();

const webpack_json = path.resolve(path.dirname(__filename), './webpack_json.py');

function parseConfig(buildConfig, pythonData, configPath, index = null) {
  // Set the bundleId by a concatenation of the Python module path
  // And the specified bundle_id that should be unique within this plugin.
  const bundleId = `${pythonData.module_path}.${buildConfig.bundle_id}`;
  const pluginPath = pythonData.plugin_path;
  return {
    name: bundleId,
    bundle_id: buildConfig.bundle_id,
    static_dir: path.join(pluginPath, 'static'),
    stats_file: path.join(pluginPath, 'build', `${bundleId}_stats.json`),
    locale_data_folder: pythonData.locale_data_folder,
    plugin_path: pluginPath,
    version: pythonData.version,
    config_path: configPath,
    module_path: pythonData.module_path,
    index,
  };
}

function readPythonPlugins({ pluginFile, plugins, pluginPath }) {
  if (!pluginFile && !plugins && !plugins.length) {
    return [];
  }
  // the temporary path where the webpack_json json is stored
  const webpack_json_tempfile = temp.openSync({ suffix: '.json' }).path;

  // Extract the relevant information about the plugin configuration from the Python code.
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
  execSync(command);

  const result = fs.readFileSync(webpack_json_tempfile);

  temp.cleanupSync(); // cleanup the tempfile immediately!

  if (result.length > 0) {
    // The above script writes JSON to a temp file, here we parse that JSON and use it
    // as input to our webpack configuration builder.
    return JSON.parse(result);
  }
  return [];
}

module.exports = function ({ pluginFile, plugins, pluginPath }) {
  const parsedResult = readPythonPlugins({ pluginFile, plugins, pluginPath });
  const output = [];
  parsedResult.forEach(pythonData => {
    const configPath = path.join(pythonData.plugin_path, 'buildConfig.js');
    const buildConfig = require(configPath);
    if (Array.isArray(buildConfig)) {
      buildConfig.forEach((configObj, i) => {
        output.push(parseConfig(configObj, pythonData, configPath, i));
      });
    } else {
      output.push(parseConfig(buildConfig, pythonData, configPath));
    }
  });
  return output;
};

module.exports.readPythonPlugins = readPythonPlugins;
