const path = require('path');
const { percySnapshot } = require('@percy/webdriverio');

/**
 * @param {String|String[]} name
 * @return {Promise<void>}
 */
exports.percySnapshot = async function(name) {
  if (!Array.isArray(name)) {
    name = [name];
  }

  name.unshift(global.browser.capabilities.browserName);

  const screenshot = path.resolve(
    __dirname,
    '../screenshots',
    name
      .join('.')
      .replace(/\s+/g, '-')
      .toLowerCase()
  );
  global.browser.saveScreenshot(`${screenshot}.png`);

  return await percySnapshot(global.browser, name.join(' | '));
};
