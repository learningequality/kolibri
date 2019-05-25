const browserstack = require('browserstack-local');
const { config } = require('./defaults');

/**
 * Browserstack
 */
exports.config = Object.assign({}, config, {
  runner: 'local',
  services: ['browserstack'],

  user: process.env.BROWSERSTACK_USER,
  key: process.env.BROWSERSTACK_KEY,

  capabilities: [
    {
      browserName: 'chrome',
      os: 'Windows',
      os_version: '10',
      browser: 'Chrome',
      browser_version: '62.0',
      resolution: '1024x768',
      'browserstack.local': true,
    },
    {
      browserName: 'Firefox',
      os: 'Windows',
      os_version: '10',
      browser: 'Firefox',
      browser_version: '66.0',
      resolution: '1024x768',
      'browserstack.local': true,
    },
    {
      browserName: 'IE11',
      os: 'Windows',
      os_version: '10',
      browser: 'IE',
      browser_version: '11.0',
      resolution: '1024x768',
      'browserstack.local': true,
    },
  ],

  /**
   * Code to start browserstack local before start of test, which allows connecting to localhost
   * from browserstack
   *
   * @return {Promise}
   */
  onPrepare() {
    /* eslint-disable no-console */
    console.log('Connecting browserstack.local');
    return new Promise((resolve, reject) => {
      exports.bs_local = new browserstack.Local();
      exports.bs_local.start({ key: exports.config.key }, error => {
        if (error) return reject(error);
        console.log('Connected browserstack.local. Now testing...');

        resolve();
      });
    });
  },

  /**
   * Code to stop browserstack local after end of test
   */
  onComplete() {
    exports.bs_local.stop(() => {});
  },
});
