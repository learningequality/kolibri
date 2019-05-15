const viewer = require('webpack-bundle-analyzer/lib/viewer');
const webpack = require('webpack');
// Import the production configuration so that we remain consistent
const webpackConfig = require('./production').webpackConfig;
const logger = require('./logging');
const { getEnvVars } = require('./build');

const buildLogging = logger.getLogger('Kolibri Build Stats');

function buildWebpack(data, index, startCallback, doneCallback, options) {
  const bundle = webpackConfig(data);
  const compiler = webpack(bundle, (err, stats) => {
    if (stats.hasErrors()) {
      buildLogging.error(`There was a build error for ${bundle.name}`);
      process.exit(1);
    } else {
      const port = options.port + 1 + index;
      viewer.startServer(stats.toJson(), {
        openBrowser: false,
        port,
      });
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
