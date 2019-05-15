/*
 * This defines the production settings for our webpack build.
 * Anything defined here is only applied during production building.
 */
const webpack = require('webpack');
const webpackBaseConfig = require('./webpack.config.base');
const logger = require('./logging');
const { getEnvVars } = require('./build');

function webpackConfig(pluginData) {
  const pluginBundle = webpackBaseConfig(pluginData, {
    mode: 'production',
  });

  pluginBundle.devtool = 'source-map';
  pluginBundle.stats = 'normal';
  pluginBundle.plugins = pluginBundle.plugins.concat([
    new webpack.LoaderOptionsPlugin({
      minimize: true,
      debug: false,
    }),
    // requires >= v3.0.0, which is specified in the kolibri-core yarn workspace
    new webpack.NormalModuleReplacementPlugin(/^vue-intl$/, 'vue-intl/dist/vue-intl.prod.min.js'),
  ]);
  return pluginBundle;
}

const buildLogging = logger.getLogger('Kolibri Production Build');

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

module.exports.webpackConfig = webpackConfig;
