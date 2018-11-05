/* Build file for kolibri-tools */
const path = require('path');
const { __buildKolibriName } = require('./lib/kolibriName');
const { __builder } = require('./lib/apiSpecExportTools');
const versionTools = require('./lib/version');

/*
 * Step 1: Generate a local copy of the KOLIBRI_CORE_JS_NAME file
 */

__buildKolibriName();

/*
 * Step 2: Generate a copy of the Core API aliases and externals to be able to verify imports
 */

__builder.buildApiSpec();
