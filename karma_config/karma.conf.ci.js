// Karma CI configuration
var base_config = require('./karma.conf.js');
var merge = require('webpack-merge');

module.exports = function(config) {
  base_config(config);

  var reporters = config.reporters;

  reporters.push('coverage');

  config.webpack.module.rules.forEach(function(rule) {
    if (rule.test.test('test.js')) {
      rule.use = [
          {
            loader: 'babel-loader'
          }
        ]
    }
  });

  config.webpack = merge.smart(config.webpack, {
    module: {
      rules: [
        {
          test: /\.js$/,
          enforce: 'post',
          exclude: /(test|node_modules)/,
          use: [
            {
              loader: 'istanbul-instrumenter-loader',
              options: {
                debug: true
              }
            }
          ]
        }
      ]
    }
  });

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
