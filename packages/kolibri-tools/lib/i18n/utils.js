const fs = require('fs');
const path = require('path');
const glob = require('glob');
const parseCsvSync = require('csv-parse/lib/sync');
const { lint } = require('kolibri-tools/lib/lint');

function writeSourceToFile(filePath, fileSource) {
  fs.writeFileSync(filePath, fileSource, { encoding: 'utf-8' });

  lint({
    file: filePath,
    write: true,
    silent: true,
  });
}

// Compile all of the defined strings & context from the CSVs that have been downloaded
// from Crowdin.
function parseCSVDefinitions(dir, subDir = '**') {
  return glob.sync(path.join(dir, subDir, '*.csv')).reduce((acc, filePath) => {
    const csvFile = fs.readFileSync(filePath).toString();

    return [...acc, ...parseCsvSync(csvFile, { skip_empty_lines: true, columns: true })];
  }, []);
}

module.exports = {
  parseCSVDefinitions,
  writeSourceToFile,
};
