const writeVersion = require('kolibri-tools/lib/version');
const path = require('path');

const distPath = path.resolve(__dirname);

/*
 * Step 1: Set the version to the current Kolibri version
 */

writeVersion(path.resolve(distPath, 'package.json'));
