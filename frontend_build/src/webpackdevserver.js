process.env.DEV_SERVER = true;

var cluster = require('cluster');
var WebpackDevServer = require('webpack-dev-server');
var webpack = require('webpack');
var openInEditor = require('launch-editor-middleware');
var devServerConfig = require('./webpackdevserverconfig');
var logging = require('./logging');

var bundles = require('./webpack.config.dev');

if (cluster.isMaster) {
  bundles.forEach((bundle, index) => {
    cluster.fork({ index });
  });
  cluster.on('exit', (worker, code, signal) => {
    logging.warn(`worker ${worker.process.pid} died`);
    Object.keys(cluster.workers).forEach(key => {
      cluster.workers[key].kill(signal);
    });
    process.exit(code);
  });
} else {
  const index = Number(process.env.index);
  const bundle = bundles[index];
  const port = devServerConfig.port + index;
  const address = devServerConfig.address;
  const basePath = devServerConfig.basePath;
  const publicPath = 'http://' + address + ':' + port + '/' + (basePath ? basePath + '/' : '');
  bundle.output.publicPath = publicPath;
  var compiler = webpack(bundle);
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
}
