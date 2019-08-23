const path = require('path');
const execSync = require('child_process').execSync;
const versionTools = require('./kolibri-tools/lib/version');

/*
 * Step 1 - Set the version of the kolibri package by the current Kolibri version
 */

const version = versionTools.setVersion(
  path.resolve(__dirname, 'kolibri-core-for-export/package.json')
);

/*
 * Step 2 - Set the version of the kolibri-tools package by the current Kolibri version
 */

versionTools.setVersion(path.resolve(__dirname, 'kolibri-tools/package.json'), version);

/*
 * Step 3 - Set the version of the eslint-plugin-kolibri package by the current Kolibri version
 */

versionTools.setVersion(path.resolve(__dirname, 'eslint-plugin-kolibri/package.json'), version);

/*
 * Step 4 - Set the version of the kolibri-components package by the current Kolibri version
 */

versionTools.setVersion(path.resolve(__dirname, 'kolibri-components/package.json'), version);

/*
 * Step 5 - Set version of the kolibri-tools dev dependency
 */

versionTools.setDependencyVersion(
  'kolibri-tools',
  path.resolve(__dirname, 'kolibri-core-for-export/package.json'),
  version
);

versionTools.setDependencyVersion(
  'kolibri-tools',
  path.resolve(__dirname, '../package.json'),
  version
);

versionTools.setDependencyVersion(
  'kolibri-tools',
  path.resolve(__dirname, '../kolibri/core/package.json'),
  version
);

/*
 * Step 6 - Set version of kolibri-tools' kolibri dependency and eslint-plugin-kolibri dependency
 */

versionTools.setDependencyVersion(
  'kolibri',
  path.resolve(__dirname, 'kolibri-tools/package.json'),
  version
);
versionTools.setDependencyVersion(
  'eslint-plugin-kolibri',
  path.resolve(__dirname, 'kolibri-tools/package.json'),
  version
);

/*
 * Step 7 - Set version of the kolibri-components dependency
 */

versionTools.setDependencyVersion(
  'kolibri-components',
  path.resolve(__dirname, 'kolibri-core-for-export/package.json'),
  version
);

versionTools.setDependencyVersion(
  'kolibri-components',
  path.resolve(__dirname, '../kolibri/core/package.json'),
  version
);

// If the version is a prerelease use the 'next' tag to prevent auto upgrades, otherwise use latest.
const tag = versionTools.isPrerelease(version) ? 'next' : 'latest';

const currentCwd = process.cwd();

process.chdir(path.resolve(__dirname, '..'));

function publishCommand(workspace) {
  execSync(`yarn workspace ${workspace} publish --new-version ${version} --tag ${tag}`, {
    stdio: 'inherit',
  });
}

['eslint-plugin-kolibri', 'kolibri', 'kolibri-tools', 'kolibri-components'].forEach(publishCommand);

process.chdir(currentCwd);
