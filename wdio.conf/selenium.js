const { config } = require('./defaults');

/**
 * Run browsers through Selenium
 */
exports.config = Object.assign({}, config, {
  runner: 'local',
  services: ['selenium-standalone'],
  hostname: 'localhost',
  port: 4444,
  path: '/wd/hub',
  capabilities: [
    {
      browserName: 'chrome',
      'goog:chromeOptions': {
        // to run chrome headless the following flags are required
        // (see https://developers.google.com/web/updates/2017/04/headless-chrome)
        //args: ['--headless', '--disable-gpu'],
      },
    },
    {
      // maxInstances can get overwritten per capability. So if you have an in house Selenium
      // grid with only 5 firefox instance available you can make sure that not more than
      // 5 instance gets started at a time.
      maxInstances: 1,
      browserName: 'firefox',
      'moz:firefoxOptions': {
        // flag to activate Firefox headless mode (see https://github.com/mozilla/geckodriver/blob/master/README.md#firefox-capabilities for more details about moz:firefoxOptions)
        // args: ['-headless']
      },
      // If outputDir is provided WebdriverIO can capture driver session logs
      // it is possible to configure which logTypes to exclude.
      // excludeDriverLogs: ['*'], // pass '*' to exclude all driver session logs
      excludeDriverLogs: ['bugreport', 'server'],
    },
  ],
});
