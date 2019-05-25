const chrome = require('./index');

const config = Object.assign({}, chrome.config);

config.services.push('devtools');
config.capabilities = config.capabilities
  .filter(capability => capability.browserName === 'chrome')
  .map(capability => {
    capability['goog:chromeOptions'].args.push('--remote-debugging-port=9222');
    return capability;
  });

/**
 * Headless Chrome with devtools
 */
exports.config = config;
