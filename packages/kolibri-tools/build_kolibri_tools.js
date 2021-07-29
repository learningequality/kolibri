/* Build file for kolibri-tools and kolibri */
const fs = require('fs');
const path = require('path');
const { __builder } = require('./lib/apiSpecExportTools');

/*
 * Step 1: Generate a copy of the Core API aliases and externals to be able to verify imports
 */

__builder.buildApiSpec();

/*
 * Step 2: Generate the exported copy of the Core API itself, to constitute the `kolibri` package.
 */

__builder.exportApiSpec(path.resolve(__dirname, '../kolibri-core-for-export'));

/*
 * Step 3: Copy the kolibri-core module dependencies to the exported kolibri module.
 */

const kolibriCorePkg = require(path.resolve(__dirname, '../../kolibri/core/package.json'));

const kolibriPackageFile = path.resolve(__dirname, '../kolibri-core-for-export/package.json');

const kolibriPkg = require(kolibriPackageFile);

kolibriPkg.dependencies = kolibriCorePkg.dependencies;

fs.writeFileSync(kolibriPackageFile, JSON.stringify(kolibriPkg, undefined, 2), {
  encoding: 'utf-8',
});

/*
 * Step 4: Copy the kolibri language_info.json into the kolibri-tools package for use externally
 */

const languageInfo = require(path.resolve(__dirname, '../../kolibri/locale/language_info.json'));

fs.writeFileSync(
  path.resolve(__dirname, './lib/i18n/language_info.json'),
  JSON.stringify(languageInfo, undefined, 2),
  {
    encoding: 'utf-8',
  }
);
