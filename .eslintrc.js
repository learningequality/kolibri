const config = require('kolibri-tools/.eslintrc');

// for puppeteer integration tests
config.globals['page'] = true;
config.globals['browser'] = true;
config.globals['context'] = true;
config.globals['jestPuppeteer'] = true;

module.exports = config;
