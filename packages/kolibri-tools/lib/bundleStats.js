const viewer = require('webpack-bundle-analyzer/lib/viewer');
const webpack = require('webpack');
// Import the production configuration so that we remain consistent
const webpackConfig = require('./production').webpackConfig;
const logger = require('./logging');

const buildLogging = logger.getLogger('Kolibri Build Stats');

const basePort = 8889;

function buildWebpack(data, index, startCallback, doneCallback, options) {
  const bundle = webpackConfig(data);
  const compiler = webpack(bundle, (err, stats) => {
    if (stats.hasErrors()) {
      buildLogging.error(`There was a build error for ${bundle.name}`);
      process.exit(1);
    } else {
      const port = basePort + index;
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

if (require.main === module) {
  const data = JSON.parse(process.env.data);
  const index = JSON.parse(process.env.index);
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

module.exports = buildWebpack;
