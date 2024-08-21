const fs = require('fs');
const path = require('path');
const intersection = require('lodash/intersection');
const { parse } = require('csv-parse/sync');
const { addAliases, resetAliases } = require('kolibri-tools/lib/alias_import_resolver');
const glob = require('../glob');
const logging = require('../logging');

/*
 * A function that compares two message objects, and ensure that they do not share any messageIds
 * unless the text of the message is an exact match.
 */
function checkForDuplicateIds(obj1, obj2) {
  const potentialDuplicates = intersection(Object.keys(obj1), Object.keys(obj2));
  const actualDuplicates = [];
  for (const potentialDuplicate of potentialDuplicates) {
    const message1 = obj1[potentialDuplicate].message;
    const message2 = obj2[potentialDuplicate].message;
    if (message1 !== message1) {
      logging.error(
        `${potentialDuplicate} messageId is repeated with different strings '${message1}' and '${message2}'`,
      );
      actualDuplicates.push(potentialDuplicate);
    }
  }
  return Boolean(actualDuplicates.length);
}

// Compile all of the defined strings & context from the CSVs that have been downloaded
// from Crowdin.
function parseCSVDefinitions(dir, intlLangCode = null) {
  if (intlLangCode) {
    intlLangCode = toLocale(intlLangCode);
  } else {
    intlLangCode = '**';
  }
  return glob.sync(path.join(dir, intlLangCode, 'LC_MESSAGES', '*.csv')).reduce((acc, filePath) => {
    const csvFile = fs.readFileSync(filePath).toString();

    return [...acc, ...parse(csvFile, { skip_empty_lines: true, columns: true })];
  }, []);
}

// Turn a language name (en-us) into a locale name (en_US).
// This is converted from the equivalent Django function.
function toLocale(language) {
  const [lang, ...countryFromLanguage] = language.toLowerCase().split('-');
  let country = countryFromLanguage.join('-');
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

function forEachPathInfo(pathInfo, callback) {
  for (const pathData of pathInfo) {
    if (pathData.aliases) {
      addAliases(pathData.aliases);
    }
    callback(pathData);
    resetAliases();
  }
}

module.exports = {
  parseCSVDefinitions,
  toLocale,
  forEachPathInfo,
  checkForDuplicateIds,
};
