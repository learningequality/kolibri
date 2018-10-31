/* Build file for kolibri-tools */
const path = require('path');
const { __buildKolibriName } = require('./lib/kolibriName');
const { __builder } = require('./lib/apiSpecExportTools');
const writeVersion = require('./lib/setVersionFromKolibri');

/*
 * Step 1: Generate a local copy of the KOLIBRI_CORE_JS_NAME file
 */

__buildKolibriName();

/*
 * Step 2: Generate a copy of the Core API aliases and externals to be able to verify imports
 */

__builder.buildApiSpec();

/*
 * Step 3: Set the version to the current Kolibri version
 */

writeVersion(path.resolve(__dirname, 'package.json'));
