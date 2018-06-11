process.env.DEV_SERVER = true;

var WebpackDevServer = require('webpack-dev-server');
var webpack = require('webpack');
var devServerConfig = require('./webpackdevserverconfig');
var openInEditor = require('launch-editor-middleware');

var bundles = require('./webpack.config.dev');
var compiler = webpack(bundles);
var server = new WebpackDevServer(compiler, {
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
  publicPath: devServerConfig.publicPath,
  stats: 'minimal',
  headers: {
    'Access-Control-Allow-Origin': '*',
  },
});
server.use('/__open-in-editor', openInEditor());

server.listen(devServerConfig.port, devServerConfig.address, function() {});
