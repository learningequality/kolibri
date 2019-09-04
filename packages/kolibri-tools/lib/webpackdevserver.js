/*
 * This takes all bundles defined in our production webpack configuration and adds inline source
 * maps to all of them for easier debugging.
 * Any dev specific modifications to the build should be specified in here, where each bundle
 * in the webpackConfig function is a webpack configuration object that needs to be
 * edited/manipulated to add features to.
 */

process.env.DEV_SERVER = true;

const path = require('path');
const WebpackDevServer = require('webpack-dev-server');
const webpack = require('webpack');
const openInEditor = require('launch-editor-middleware');
const webpackBaseConfig = require('./webpack.config.base');
const logger = require('./logging');
const { getEnvVars } = require('./build');

const buildLogging = logger.getLogger('Kolibri Webpack Dev Server');

function genPublicPath(address, port, basePath) {
  const baseURL = `http://${address}:${port}/`;
  if (basePath) {
    return baseURL + basePath + '/';
  }
  return baseURL;
}

const CONFIG = {
  address: 'localhost',
  host: '0.0.0.0',
  basePath: 'js-dist',
};

function webpackConfig(pluginData, hot) {
  const pluginBundle = webpackBaseConfig(pluginData, { hot });
  pluginBundle.devtool = 'cheap-module-source-map';
  pluginBundle.plugins = pluginBundle.plugins.concat([
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: '"debug"',
      },
    }),
  ]);
  if (hot) {
    pluginBundle.plugins = pluginBundle.plugins.concat([
      new webpack.HotModuleReplacementPlugin(),
      new webpack.NamedModulesPlugin(), // show correct file names in console on update
    ]);
  }
  pluginBundle.output.path = path.resolve(path.join('./', CONFIG.basePath));
  return pluginBundle;
}

function buildWebpack(data, index, startCallback, doneCallback, options) {
  const port = options.port + index;
  const publicPath = genPublicPath(CONFIG.address, port, CONFIG.basePath);
  const hot = Boolean(options.hot);

  // webpack config for this bundle
  const bundleConfig = webpackConfig(data, hot);
  bundleConfig.output.publicPath = publicPath;

  // Add entry points for hot module reloading
  // The standard strategy (addDevServerEntrypoints) doesn't work for us. See:
  //   https://github.com/webpack/webpack-dev-server/issues/1051#issuecomment-443794959
  if (hot) {
    Object.keys(bundleConfig.entry).forEach(key => {
      // First, turn entry points into an array if it's currently a string:
      if (typeof bundleConfig.entry[key] === 'string') {
        bundleConfig.entry[key] = [bundleConfig.entry[key]];
      } else if (!Array.isArray(bundleConfig.entry[key])) {
        buildLogging.error('Unhandled data type for bundle entries');
        process.exit(1);
      }
      // Next, prepend two hot-reload-related entry points to the config:
      bundleConfig.entry[key].unshift(
        `webpack-dev-server/client?http://${CONFIG.address}:${port}/`,
        'webpack/hot/dev-server'
      );
    });
  }

  const compiler = webpack(bundleConfig);
  const devServerOptions = {
    hot,
    liveReload: !hot,
    host: CONFIG.host,
    port,
    watchOptions: {
      aggregateTimeout: 300,
      poll: 1000,
    },
    publicPath,
    stats: 'none',
    quiet: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  };

  const server = new WebpackDevServer(compiler, devServerOptions);

  compiler.hooks.compile.tap('Process', startCallback);
  compiler.hooks.done.tap('Process', doneCallback);

  // Only register the launch editor middleware for port 3000, which
  // is where Django redirects the request from vue-devtools
  if (port === 3000) {
    server.use('/__open-in-editor', openInEditor());
  }

  server.listen(port, CONFIG.host, () => {});

  return compiler;
}

const { data, index, options, start } = getEnvVars();

function build() {
  buildWebpack(
    data,
    index,
    () => {
      process.send('compile');
    },
    () => {
      process.send('done');
    },
    options
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
