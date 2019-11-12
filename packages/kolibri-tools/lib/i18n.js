/*
 * This defines the translation settings for our webpack build.
 * Anything defined here is only applied during frontend message extraction.
 */
const os = require('os');
const webpack = require('webpack');
const logger = require('./logging');
const ProfileStrings = require('./ProfileStrings');
const webpackBaseConfig = require('./webpack.config.base');
const { getEnvVars } = require('./build');

function webpackConfig(pluginData) {
  const pluginBundle = webpackBaseConfig(pluginData);

  pluginBundle.output.path = os.tmpdir();
  pluginBundle.plugins.push(new ProfileStrings(pluginData.locale_data_folder, pluginData.name));

  return pluginBundle;
}

const buildLogging = logger.getLogger('Kolibri Frontend Message Extraction');

function buildWebpack(data, index, startCallback, doneCallback) {
  const bundle = webpackConfig(data);
  const compiler = webpack(bundle, (err, stats) => {
    if (stats.hasErrors()) {
      buildLogging.error(`There was a build error for ${bundle.name}`);
      buildLogging.log(stats.toString('errors-only'));
      process.exit(1);
    }
  });
  compiler.hooks.compile.tap('Process', startCallback);
  compiler.hooks.done.tap('Process', doneCallback);
  return compiler;
}

const { data, index, start } = getEnvVars();

function build() {
  buildWebpack(
    data,
    index,
    () => {
      process.send('compile');
    },
    () => {
      process.send('done');
    }
  );
}

let waitToBuild;

waitToBuild = msg => {
  if (msg === 'start') {
    build();
  } else {
    process.once('message', waitToBuild);
  }
};

if (require.main === module) {
  if (start) {
    build();
  } else {
    waitToBuild();
  }
}

module.exports = buildWebpack;
