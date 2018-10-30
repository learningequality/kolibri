process.env.DEV_SERVER = true;

var WebpackDevServer = require('webpack-dev-server');
var webpack = require('webpack');
var openInEditor = require('launch-editor-middleware');
var devServerConfig = require('./webpackdevserverconfig');
var logging = require('./logging');

var bundleFn = require('./webpack.config.dev');

const data = JSON.parse(process.env.data);
const index = JSON.parse(process.env.index);
const bundle = bundleFn([data])[0];
const port = devServerConfig.port + index;
const address = devServerConfig.address;
const basePath = devServerConfig.basePath;
const publicPath = 'http://' + address + ':' + port + '/' + (basePath ? basePath + '/' : '');
bundle.output.publicPath = publicPath;
const compiler = webpack(bundle);
compiler.hooks.compile.tap('Process', () => {
    process.send('compile');
});
compiler.hooks.done.tap('Process', () => {
    process.send('done');
});
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
  publicPath,
  stats: 'minimal',
  headers: {
    'Access-Control-Allow-Origin': '*',
  },
});
server.use('/__open-in-editor', openInEditor());

server.listen(port, devServerConfig.host, function() {});
