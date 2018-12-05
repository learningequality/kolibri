const path = require('path');
const mkdirp = require('mkdirp');

function ensureDist() {
  mkdirp.sync(path.resolve(__dirname, '../dist'));
}

module.exports = ensureDist;
