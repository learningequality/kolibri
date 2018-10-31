const fs = require('fs');
const execSync = require('child_process').execSync;
const path = require('path');
const temp = require('temp').track();
const semver = require('semver');

module.exports = function(packageFile) {
  // the temporary path where the version is stored
  const filename = temp.openSync().path;

  // Extract the relevant version information from the Python code.

  // For reasons unknown, there is an extra /usr/bin injected into PATH while running execSync, which
  // by-passes the virtualenv!

  // Refs: https://github.com/yarnpkg/yarn/issues/5874
  // See PR: https://github.com/learningequality/kolibri/pull/3777

  // You can debug it like this:
  //     execSync("PATH=$(echo $PATH | sed 's/\\/usr\\/bin://g')\":/usr/bin\" which python >&2 && exit 1", {env: process.env});
  // ..hence, we have manipulated the path in the shell command to remove Node's unwanted manipulation
  const command = `python -c "import kolibri; print(kolibri.__version__)" > ${filename}`;

  if (process.platform !== 'win32') {
    execSync(`PATH=$(echo $PATH | sed 's/\\/usr\\/bin://g')\":/usr/bin\" ${command}`);
  } else {
    execSync(command);
  }

  const version = fs.readFileSync(filename, { encoding: 'utf-8' }).trim();

  let semVersion = semver.parse(version);

  if (semVersion === null) {
    // Semantic versioning has failed to parse, coerce
    const start = semver.coerce(version).version;
    const remainder = version.replace(start, '');
    semVersion = semver.parse(start + '-' + remainder.split('.').join(''));
  }

  temp.cleanupSync(); // cleanup the tempfile immediately!

  const pkg = require(packageFile);

  pkg.version = semVersion.version;

  fs.writeFileSync(packageFile, JSON.stringify(pkg, undefined, 2), { encoding: 'utf-8' });
};
