/* Build file for kolibri-tools and kolibri */
const fs = require('fs');
const path = require('path');
const { rebuildApiSpec } = require('./lib/apiSpecExportTools');

// /*
//  * Copy the kolibri language_info.json into the kolibri-tools package for use externally
//  */

const languageInfo = require(path.resolve(__dirname, '../../kolibri/locale/language_info.json'));

fs.writeFileSync(
  path.resolve(__dirname, './lib/i18n/language_info.json'),
  JSON.stringify(languageInfo, undefined, 2),
  {
    encoding: 'utf-8',
  },
);

rebuildApiSpec();
