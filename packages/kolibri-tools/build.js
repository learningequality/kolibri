/* Build file for kolibri-tools and kolibri */
const fs = require('fs');
const path = require('path');
const { __buildKolibriName } = require('./lib/kolibriName');
const { __builder } = require('./lib/apiSpecExportTools');

/*
 * Step 1: Generate a local copy of the KOLIBRI_CORE_JS_NAME file
 */

__buildKolibriName();

/*
 * Step 2: Generate a copy of the Core API aliases and externals to be able to verify imports
 */

__builder.buildApiSpec();

/*
 * Step 3: Generate the exported copy of the Core API itself, to constitute the `kolibri` package.
 */

__builder.exportApiSpec(path.resolve(__dirname, '../kolibri-core-for-export'));

/*
 * Step 4: Copy the kolibri-core module dependencies to the exported kolibri module.
 */

const kolibriCorePkg = require(path.resolve(__dirname, '../../kolibri/core/package.json'));

const kolibriPackageFile = path.resolve(__dirname, '../kolibri-core-for-export/package.json');

const kolibriPkg = require(kolibriPackageFile);

kolibriPkg.dependencies = kolibriCorePkg.dependencies;

fs.writeFileSync(kolibriPackageFile, JSON.stringify(kolibriPkg, undefined, 2), {
  encoding: 'utf-8',
});
