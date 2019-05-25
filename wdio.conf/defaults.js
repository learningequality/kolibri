exports.config = {
  runner: 'local',
  region: 'us',

  maxInstances: 1,
  maxInstancesPerCapability: 1,

  // Level of logging verbosity: trace | debug | info | warn | error | silent
  logLevel: 'warn',
  logLevels: {
    '@wdio/selenium-standalone-service': 'error',
  },

  bail: 0,
  baseUrl: 'http://localhost:8000',
  waitforTimeout: 5000,

  framework: 'jasmine',
  specs: ['integration_testing/**/*.int.js'],
  // Patterns to exclude.
  exclude: [],
  specFileRetries: 1,
  reporters: ['spec'],
  jasmineNodeOpts: {
    // Jasmine default timeout
    defaultTimeoutInterval: 5000,
  },
};
