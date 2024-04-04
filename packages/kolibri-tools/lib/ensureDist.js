const fs = require('node:fs');
const path = require('node:path');

function ensureDist() {
  fs.mkdirSync(path.resolve(__dirname, '../dist'), { recursive: true });
}

module.exports = ensureDist;
