var colors = require('colors');

var log = function(msg, color) {
    console.log(color("Kolibri: " + msg));
};

logging = {
    warn: function(msg) {
        log(msg, colors.yellow);
    },

    info: function(msg) {
        log(msg, colors.green);
    },

    error: function(msg) {
        log(msg, colors.red);
    }
};

module.exports = logging;
