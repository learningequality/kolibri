// Karma configuration
var RewirePlugin = require("rewire-webpack");
var _ = require("lodash");
var webpack_config = _.clone(require("../frontend_build/src/webpack.config.base"));
var path = require('path');

webpack_config.plugins.push(new RewirePlugin());
webpack_config.devtool = '#inline-source-map';
webpack_config.resolve.alias['kolibri'] = path.resolve(__dirname, './kolibriGlobalMock');
webpack_config.resolve.alias['vue-test'] = path.resolve(__dirname, './vueLocal');

module.exports = function(config) {
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '../',

    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['mocha'],

    // list of files / patterns to load
    files: [
      // Detailed pattern to include a file. Similarly other options can be used
      { pattern: './node_modules/core-js/client/core.js', watched: false },
      './node_modules/phantomjs-polyfill-find/find-polyfill.js',
      'kolibri/**/assets/test/*.js',
      {pattern: 'kolibri/**/assets/src/**/*.js', included: false} // load these, but not in the browser, just for linting
    ],

    // list of files to exclude
    exclude: [],

    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
      'kolibri/**/assets/test/*.js': ['eslint', 'webpack', 'sourcemap'],
      '*.js': ['eslint'],
      'kolibri/**/assets/src/**/*.js': ['eslint']
    },

    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['progress'],

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
    browsers: ['PhantomJS'],

    webpack: webpack_config,

    webpackMiddleware: {
      // suppress all webpack building information to make test logs more readable.
       noInfo: true
    },

    eslint: {
      engine: {
        configFile: '.eslintrc.js'
      },
      stopOnError: false
    },

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: false,

    // Concurrency level
    // how many browser should be started simultaneous
    concurrency: Infinity
  });
};
