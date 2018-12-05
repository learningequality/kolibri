'use strict';
/**
 * logging module.
 * @module logging
 */

var colors = require('colors');

var logging = {
  /**
   * Log a message in a particular colour.
   * N.B. This is only for command line output, not in the browser.
   * @param {string} msg - The msg to log.
   * @param {Object} color - A function that maps the colour of the string for output.
   */
  prefix: 'Kolibri: ',
  log(msg, color, prefixed = true) {
    /* eslint-disable no-console */
    if (color && prefixed) {
      console.log(color(this.prefix + msg));
    } else if (color) {
      console.log(color(msg));
    } else {
      console.log(msg);
    }
    /* eslint-enable no-console */
  },
  /** Warn logging. */
  warn(msg) {
    this.log(msg, colors.yellow);
  },
  /** Info logging. */
  info(msg) {
    this.log(msg, colors.green);
  },
  /** Error logging. */
  error(msg) {
    this.log(msg, colors.red);
  },
  getLogger(name) {
    const logger = Object.assign({}, this);
    logger.prefix = name + ': ';
    return logger;
  },
};

module.exports = logging;
