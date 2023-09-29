const fs = require('fs');
const { lint } = require('kolibri-tools/lib/lint');

function writeSourceToFile(filePath, fileSource) {
  fs.writeFileSync(filePath, fileSource, { encoding: 'utf-8' });

  lint({
    file: filePath,
    write: true,
    silent: true,
  });
}

module.exports = writeSourceToFile;
