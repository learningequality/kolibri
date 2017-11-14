// Karma configuration
const _ = require('lodash');
const webpack_config = _.clone(require('../frontend_build/src/webpack.config.base'));
const path = require('path');
const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

webpack_config.plugins.push(
  new webpack.DefinePlugin({
    __coreAPISpec: '{}',
    'process.env': {
      NODE_ENV: '"production"',
    },
  })
);

webpack_config.plugins.push(new ExtractTextPlugin('styles.css'));

webpack_config.devtool = 'none';

// html5media plugin requires this
webpack_config.module.rules.push({
  test: /html5media\/dist\/api\/1\.1\.8\/html5media/,
  use: [
    {
      loader: 'imports-loader?this=>window',
    },
  ],
});

webpack_config.stats = 'none';

const aliases = require('../frontend_build/src/apiSpecExportTools').coreAliases();
aliases.testUtils = path.resolve(__dirname, './testUtils');
aliases['vue-test'] = path.resolve(__dirname, './vueLocal');

webpack_config.resolve.alias = aliases;

webpack_config.externals = {
  kolibri: 'kolibriGlobal',
};

module.exports = function(config) {
  config.set({
    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '../',

    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['mocha'],

    // list of files / patterns to load
    files: [
      './karma_config/globals.js',
      // Detailed pattern to include a file. Similarly other options can be used
      { pattern: './node_modules/core-js/client/core.js', watched: false },
      'kolibri/**/assets/test/**/*.js',
      'kolibri/**/assets/**/*.spec.js',
    ],

    // list of files to exclude
    exclude: ['kolibri/**/assets/test/util/*.*'],

    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
      'kolibri/**/assets/test/**/*.js': ['webpack', 'sourcemap'],
      'kolibri/**/assets/**/*.spec.js': ['webpack', 'sourcemap'],
    },

    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['spec'],

    // web server port
    port: 9876,

    // enable / disable colors in the output (reporters and logs)
    colors: true,

    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,

    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,

    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['ChromeHeadless'],

    webpack: webpack_config,

    webpackMiddleware: {
      // suppress all webpack building information to make test logs more readable.
      noInfo: true,
    },

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: false,

    // Concurrency level
    // how many browser should be started simultaneous
    concurrency: Infinity,
  });
};
