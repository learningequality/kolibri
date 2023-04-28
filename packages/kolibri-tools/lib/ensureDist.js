const fs = require('fs');
const path = require('path');

function ensureDist() {
  fs.mkdirSync(path.resolve(__dirname, '../dist'), { recursive: true });
}

module.exports = ensureDist;
