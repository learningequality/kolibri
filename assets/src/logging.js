'use strict';
/**
 * logging module.
 * @module logging
 */

var colors = require('colors');

/**
 * Log a message in a particular colour.
 * N.B. This is only for command line output, not in the browser.
 * @param {string} msg - The msg to log.
 * @param {Object} color - A function that maps the colour of the string for output.
 */
var log = function(msg, color) {
    console.log(color("Kolibri: " + msg));
};

var logging = {
    /** Warn logging. */
    warn: function(msg) {
        log(msg, colors.yellow);
    },
    /** Info logging. */
    info: function(msg) {
        log(msg, colors.green);
    },
    /** Error logging. */
    error: function(msg) {
        log(msg, colors.red);
    }
};

module.exports = logging;
