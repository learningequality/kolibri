const fs = require('fs');
const execSync = require('child_process').execSync;
const temp = require('temp').track();
const semver = require('semver');
const logger = require('./logging');

const logging = logger.getLogger('Kolibri Version');

function getVersion(prerelease = false) {
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

  temp.cleanupSync(); // cleanup the tempfile immediately!

  const semVersion = semver.coerce(version);
  const start = semVersion.version;
  const remainder = version.replace(start, '');

  let suffix = '';

  if (remainder && prerelease) {
    const preidMap = {
      b: 'beta',
      a: 'alpha',
      dev: 'dev',
    };

    const preid = ['b', 'a', 'dev'].find(pre => remainder.includes(pre));

    const prereleaseId = preidMap[preid];

    const prereleaseNumRe = new RegExp(`${preid}([0-9]+)`);

    const prereleaseNum = preid === 'dev' ? 'x' : prereleaseNumRe[Symbol.match](remainder)[1];

    suffix = `-${prereleaseId}.${prereleaseNum}`;
  }

  return semVersion.version + suffix;
}

function setVersion(packageFile) {
  const version = getVersion();

  const pkg = require(packageFile);

  pkg.version = version;

  fs.writeFileSync(packageFile, JSON.stringify(pkg, undefined, 2), { encoding: 'utf-8' });
}

module.exports = setVersion;

if (require.main === module) {
  logging.info('Suggested release version is ' + getVersion(true));
}
