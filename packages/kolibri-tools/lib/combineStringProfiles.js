/**
 * Once the strings in Kolibri have been profiled via `yarn makemessages`
 * you can run this to combine them all into a single larger CSV file.
 *
 * The new CSV file will not be separated by module.
 *
 * USAGE
 * node combineStringProfiles.js /path/to/folder/with/json-dumps
 * EXAMPLE - When run from the root directory package.json command:
 * node combineStringProfiles.js ./kolibri/locale/en/LC_MESSAGES/csv_profiles
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const uniqWith = require('lodash/uniqWith');
const isEqual = require('lodash/isEqual');
const logger = require('./logging');
const writeProfileToCSV = require('./ProfileStrings').writeProfileToCSV;

const logging = logger.getLogger('Kolibri String Profiler');

// Get first argument passed - which will be the path to the CSVs we'll process.
let basePath = process.argv[process.argv.length - 1];

// Check that the path exists - show error and exit if not.
if (!fs.existsSync(basePath)) {
  logging.error(
    `
    Path (${basePath}) does not exist. Please be sure you have run
    'yarn makemessages' before running this and ensure that the path
    given is to the location of the JSON profiles.
    `
  );
  process.exit(1);
} else {
  logging.log(`Processing JSON files in ${path.resolve(basePath)}`);
}

let fullProfile = {};

glob(basePath + '/*.json', {}, (err, files) => {
  logging.log(`Processing ${files.length} files.`);
  // Read each JSON file and combine.
  files.forEach(file => {
    logging.log(`${file} processed.`);
    let json = JSON.parse(fs.readFileSync(file).toString());

    Object.keys(json).forEach(str => {
      if (fullProfile.hasOwnProperty(str)) {
        fullProfile[str].definitions = uniqWith(
          [...fullProfile[str].definitions, ...json[str].definitions],
          isEqual
        );
        fullProfile[str].uses = [...fullProfile[str].uses, ...json[str].uses];
      } else {
        fullProfile[str] = json[str];
      }
    });
  });
  // Not necessary - if left uncommented then you must delete it before running again.
  //fs.writeFileSync(`${basePath}/fullProfile.json`, JSON.stringify(fullProfile));
  writeProfileToCSV(fullProfile, 'fullProfile', basePath);
});
