const fs = require('fs');
const execSync = require('child_process').execSync;
const temp = require('temp').track();
const readlineSync = require('readline-sync');
const semver = require('semver');

function getVersion(prompt = false) {
  // the temporary path where the version is stored
  const filename = temp.openSync().path;

  // Extract the relevant version information from the Python code.

  // For reasons unknown, there is an extra /usr/bin injected into PATH while
  // running execSync, which by-passes the virtualenv!

  // Refs: https://github.com/yarnpkg/yarn/issues/5874
  // See PR: https://github.com/learningequality/kolibri/pull/3777

  // You can debug it like this:
  //     execSync("PATH=$(echo $PATH | sed 's/\\/usr\\/bin://g')\":/usr/bin\" which python >&2 && exit 1", {env: process.env});
  // ..hence, we have manipulated the path in the shell command to remove Node's
  // unwanted manipulation
  const command = `python -c "import kolibri; print(kolibri.__version__)" > ${filename}`;

  if (process.platform !== 'win32') {
    execSync(`PATH=$(echo $PATH | sed 's/\\/usr\\/bin://g')":/usr/bin" ${command}`);
  } else {
    execSync(command);
  }

  const version = fs.readFileSync(filename, { encoding: 'utf-8' }).trim();

  temp.cleanupSync(); // cleanup the tempfile immediately!

  const semVersion = semver.coerce(version);
  const start = semVersion.version;
  const remainder = version.replace(start, '');

  let suffix = '';

  if (remainder) {
    const preidMap = {
      b: 'beta',
      a: 'alpha',
      dev: 'dev',
    };

    const preid = remainder.includes('dev')
      ? 'dev'
      : ['b', 'a'].find(pre => remainder.startsWith(pre));

    const prereleaseId = preidMap[preid];

    const prereleaseNumRe = new RegExp(`${preid}([0-9]+)`);

    let userNum;

    const userDefinedPrerelease = prompt && preid === 'dev';

    if (userDefinedPrerelease) {
      // If required, prompt for a dev release number
      // As Kolibri versioning will not give us an extra number of dev releases,
      // but will for all prereleases
      // If we are not generating a version number for use in a published package, this
      // does not matter.
      while (isNaN(Number(userNum))) {
        userNum = readlineSync
          .question('What version suffix number should be used for the dev release? ')
          .trim();
      }
    }

    const prereleaseNum = userDefinedPrerelease
      ? userNum
      : prereleaseNumRe[Symbol.match](remainder)[1];

    suffix = `-${prereleaseId}.${prereleaseNum}`;
  }

  return semVersion.version + suffix;
}

function setVersion(packageFile, version = null) {
  if (version === null) {
    version = getVersion(true);
  }

  const pkg = require(packageFile);

  pkg.version = version;

  fs.writeFileSync(packageFile, JSON.stringify(pkg, undefined, 2), { encoding: 'utf-8' });

  return version;
}

function setDependencyVersion(dependencyName, packageFile, version = null) {
  if (version === null) {
    version = getVersion(true);
  }

  const pkg = require(packageFile);

  if (pkg.dependencies && pkg.dependencies[dependencyName]) {
    pkg.dependencies[dependencyName] = version;
  }

  if (pkg.devDependencies && pkg.devDependencies[dependencyName]) {
    pkg.devDependencies[dependencyName] = version;
  }

  if (pkg.optionalDependencies && pkg.optionalDependencies[dependencyName]) {
    pkg.optionalDependencies[dependencyName] = version;
  }

  fs.writeFileSync(packageFile, JSON.stringify(pkg, undefined, 2), { encoding: 'utf-8' });

  return version;
}

function isPrerelease(version = null) {
  if (version === null) {
    version = getVersion(true);
  }
  const parsed = semver.parse(version);

  return Boolean(parsed.prerelease.length);
}

module.exports = {
  setVersion,
  getVersion,
  setDependencyVersion,
  isPrerelease,
};
