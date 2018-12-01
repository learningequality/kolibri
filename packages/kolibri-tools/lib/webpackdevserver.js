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

const devServerConfig = {
  address: 'localhost',
  port: 3000,
  host: '0.0.0.0',
  basePath: 'js-dist',
  get publicPath() {
    return (
      'http://' + this.address + ':' + this.port + '/' + (this.basePath ? this.basePath + '/' : '')
    );
  },
};

function webpackConfig(pluginData) {
  const pluginBundle = webpackBaseConfig(pluginData);

  pluginBundle.devtool = '#cheap-module-source-map';
  pluginBundle.mode = 'development';
  pluginBundle.plugins = pluginBundle.plugins.concat([
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: '"debug"',
      },
    }),
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NamedModulesPlugin(), // HMR shows correct file names in console on update.
  ]);
  pluginBundle.output.path = path.resolve(path.join('./', devServerConfig.basePath));
  return pluginBundle;
}

function buildWebpack(data, index, startCallback, doneCallback, options) {
  const port = devServerConfig.port + index;
  const address = devServerConfig.address;
  const basePath = devServerConfig.basePath;
  const publicPath = `http://${address}:${port}/` + (basePath ? basePath + '/' : '');
  const hot = options.hot;

  // webpack config for this bundle
  const bundleConfig = webpackConfig(data);
  bundleConfig.output.publicPath = publicPath;

  // for hot module reload
  if (hot) {
    bundleConfig.entry[data.name] = [bundleConfig.entry[data.name]]
    bundleConfig.entry[data.name].unshift(
      `webpack-dev-server/client?http://${address}:${port}/`,
      "webpack/hot/dev-server"
    );
  }

  const compiler = webpack(bundleConfig);
  const devServerOptions = {
    hot,
    host: devServerConfig.host,
    watchOptions: {
      aggregateTimeout: 300,
      poll: 1000,
    },
    publicPath,
    stats: 'minimal',
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  };

  // for hot module reload
  if (hot) {
    WebpackDevServer.addDevServerEntrypoints(bundleConfig, devServerOptions);
  }

  const server = new WebpackDevServer(compiler, devServerOptions);
  compiler.hooks.compile.tap('Process', startCallback);
  compiler.hooks.done.tap('Process', doneCallback);
  server.use('/__open-in-editor', openInEditor());
  server.listen(port, devServerConfig.host, () => {
    console.log(`webpack dev server listening on port ${port}`);
  });
  return compiler;
}

if (require.main === module) {
  const data = JSON.parse(process.env.data);
  const index = JSON.parse(process.env.index);
  const options = JSON.parse(process.env.options);
  buildWebpack(
    data,
    index,
    () => {
      process.send('compile');
    },
    () => {
      process.send('done');
    },
    options,
  );
}

module.exports = buildWebpack;
