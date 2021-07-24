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

function getCSVDefinitions(pathInfo, crowdinLangCode) {
  // Get a unique set of locale file paths to look for CSV files in
  const localeFilePaths = Array.from(
    new Set(
      pathInfo.map(pathData => {
        return path.join(
          path.dirname(path.dirname(pathData.localeFilePath)),
          // Grab all downloaded CSV files so we don't have to play whackamole trying to work out
          // which language actually has all the included context in the exported CSV files.
          'CSV_FILES'
        );
      })
    )
  );
  return localeFilePaths.reduce((acc, filePath) => {
    return [...acc, ...parseCSVDefinitions(filePath, crowdinLangCode)];
  }, []);
}

module.exports = {
  getCSVDefinitions,
  writeSourceToFile,
};
