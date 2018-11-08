/*
 * This extracts front-end strings
 */

var os = require('os');
var bundles = require('./webpack.config.js');

for (var i = 0; i < bundles.length; i++) {
  bundles[i].mode = 'development';
  bundles[i].output.path = os.tmpdir();
}

module.exports = bundles;
