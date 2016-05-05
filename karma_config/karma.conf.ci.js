// Karma CI configuration
var base_config = require('./karma.conf.js');


module.exports = function(config) {
  base_config(config);

  var reporters = config.reporters;

  reporters.push('coverage');

  var webpack = config.webpack;

  webpack.module.postLoaders = [{
          test: /\.js/,
          exclude: /(test|node_modules)/,
          loader: 'istanbul-instrumenter'
  }];

  config.set({

    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: reporters,

    coverageReporter: {

      reporters: [
                // generates ./coverage/lcov.info
                {type:'lcovonly', subdir: '.'},
                // generates ./coverage/coverage-final.json
                {type:'json', subdir: '.'},
      ],
      dir: 'coverage/'

    },

    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: false,

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: true,

  });
};
