const phantomjs = require('phantomjs-prebuilt');
const { config } = require('./defaults');

/**
 * Phantomjs headless browser config
 */
exports.config = Object.assign({}, config, {
  capabilities: [
    {
      browserName: 'phantomjs',
    },
  ],

  /**
   * Start up phantomjs
   *
   * @return {Promise<T | never>}
   */
  onPrepare() {
    return phantomjs.run
      .apply(phantomjs, ['--webdriver=4444', '--web-security=false'])
      .then(p => (this.process = p));
  },

  /**
   * Kill phantomjs
   */
  onComplete() {
    if (this.process) this.process.kill();
  },
});
