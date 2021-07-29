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
  return glob.sync(path.join(dir, 'CSV_FILES', subDir, '*.csv')).reduce((acc, filePath) => {
    const csvFile = fs.readFileSync(filePath).toString();

    return [...acc, ...parseCsvSync(csvFile, { skip_empty_lines: true, columns: true })];
  }, []);
}

// Turn a language name (en-us) into a locale name (en_US).
// This is converted from the equivalent Django function.
function toLocale(language) {
  let [lang, ...country] = language.toLowerCase().split('-');
  country = country.join('-');
  if (!country) {
    return language.slice(0, 3).toLowerCase() + language.slice(3);
  }
  // A language with > 2 characters after the dash only has its first
  // character after the dash capitalized; e.g. sr-latn becomes sr_Latn.
  // A language with 2 characters after the dash has both characters
  // capitalized; e.g. en-us becomes en_US.
  let tail;
  [country, ...tail] = country.split('-');
  tail = tail.join('-');
  if (country.length > 2) {
    country = country.slice(0, 1).toUpperCase() + country.slice(1);
  } else {
    country = country.toUpperCase();
  }
  if (tail.length) {
    country += '-' + tail;
  }
  return lang + '_' + country;
}

module.exports = {
  parseCSVDefinitions,
  toLocale,
  writeSourceToFile,
};
