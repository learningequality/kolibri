const fs = require('node:fs');
const execFileSync = require('node:child_process').execFileSync;
const path = require('node:path');
const temp = require('temp').track();

const webpack_json = path.resolve(path.dirname(__filename), './webpack_json.py');

const VENV_PYTHON = process.platform === 'win32' ? ['Scripts', 'python.exe'] : ['bin', 'python'];

// uv puts the project environment in `.venv` unless UV_PROJECT_ENVIRONMENT overrides it,
// and resolves a relative override against the project root.
const PROJECT_VENV = process.env.UV_PROJECT_ENVIRONMENT || '.venv';

// webpack_json.py has to import the plugin modules, so it needs the interpreter they are
// installed into. A bare `python` is the system interpreter whenever the build runs
// outside an activated shell — CI calling `make`, an editor task runner — and there the
// plugins are not importable at all.
function resolvePython() {
  if (process.env.VIRTUAL_ENV) {
    return path.join(process.env.VIRTUAL_ENV, ...VENV_PYTHON);
  }
  for (let dir = process.cwd(); ; dir = path.dirname(dir)) {
    const candidate = path.join(path.resolve(dir, PROJECT_VENV), ...VENV_PYTHON);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
    if (path.dirname(dir) === dir) {
      return 'python';
    }
  }
}

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
    // Flag for sandbox handler builds - these are built with no externals
    // and output as IIFE format for script tag injection
    sandbox_handler: buildConfig.sandbox_handler || false,
  };
}

function readPythonPlugins({ pluginFile, plugins, pluginPath }) {
  if (!pluginFile && !(plugins && plugins.length)) {
    return [];
  }
  // the temporary path where the webpack_json json is stored
  const webpack_json_tempfile = temp.openSync({ suffix: '.json' }).path;

  // Extract the relevant information about the plugin configuration from the Python code.
  const args = [webpack_json, '--output_file', webpack_json_tempfile];
  // The plugin file takes precedence here.
  if (pluginFile) {
    args.push('--plugin_file', pluginFile);
  } else if (plugins.length) {
    args.push('--plugins', ...plugins);
    if (pluginPath) {
      args.push('--plugin_path', pluginPath);
    }
  }
  execFileSync(resolvePython(), args);

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
