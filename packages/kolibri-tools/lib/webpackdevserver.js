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
  ]);
  pluginBundle.output.path = path.resolve(path.join('./', devServerConfig.basePath));
  return pluginBundle;
}

function buildWebpack(data, index, startCallback, doneCallback) {
  const bundle = webpackConfig(data);
  const port = devServerConfig.port + index;
  const address = devServerConfig.address;
  const basePath = devServerConfig.basePath;
  const publicPath = 'http://' + address + ':' + port + '/' + (basePath ? basePath + '/' : '');
  bundle.output.publicPath = publicPath;
  const compiler = webpack(bundle);
  const server = new WebpackDevServer(compiler, {
    // webpack-dev-server options

    // contentBase: "http://localhost:3000/",
    // Can also be an array, or: contentBase: "http://localhost/",

    // Set this as true if you want to access dev server from arbitrary url.
    // This is handy if you are using a html5 router.
    historyApiFallback: false,

    // Set this if you want to enable gzip compression for assets
    compress: true,

    // webpack-dev-middleware options
    watchOptions: {
      aggregateTimeout: 300,
      poll: 1000,
    },
    // It's a required option.
    publicPath,
    stats: 'minimal',
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  });
  compiler.hooks.compile.tap('Process', startCallback);
  compiler.hooks.done.tap('Process', doneCallback);
  server.use('/__open-in-editor', openInEditor());

  server.listen(port, devServerConfig.host, function() {});
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
