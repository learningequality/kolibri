'use strict';
/**
 * logging module.
 * @module logging
 */

const colors = require('colors');

const logging = {
  /**
   * Log a message in a particular colour.
   * N.B. This is only for command line output, not in the browser.
   * @param {string} msg - The msg to log.
   * @param {Object} color - A function that maps the colour of the string for output.
   */
  prefix: 'Kolibri:',
  write(level, messages, color, prefix = this.prefix) {
    if (prefix) {
      messages.unshift(prefix);
    }

    messages = color ? messages.map(msg => color(msg)) : messages;

    // eslint-disable-next-line no-console
    console[level](...messages);
  },
  /** Basic logging. */
  log(...messages) {
    this.write('log', messages);
  },
  /** Info logging. */
  info(...messages) {
    this.write('info', messages, colors.green);
  },
  /** Warn logging. */
  warn(...messages) {
    this.write('warn', messages, colors.yellow);
  },
  /** Error logging. */
  error(...messages) {
    this.write('error', messages, colors.red);
  },
  /** Writes empty line, creating visual whitespace */
  break() {
    this.write('log', '', null, false);
  },
  getLogger(name) {
    const logger = Object.assign({}, this);
    logger.prefix = name + ':';
    return logger;
  },
};

module.exports = logging;
