const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const kolibriBrowsers = require('browserslist-config-kolibri');

const upstreamUrl = 'https://github.com/BloomBooks/bloom-player';

const bloomCommit = fs
  .readFileSync(path.resolve(__dirname, './.bloom-player-commit-sha'), 'utf8')
  .trim();

const patchesFolder = path.resolve(__dirname, './patches');

const targetFolder = path.resolve(__dirname, './vendor');

const logging = console; // eslint-disable-line no-console

function run(command, args, options) {
  return execFileSync(command, args, { stdio: 'inherit', ...options });
}

function checkout(repo) {
  run('git', ['init', '--quiet', repo]);
  run('git', ['fetch', '--quiet', '--depth', '1', upstreamUrl, bloomCommit], { cwd: repo });
  run('git', ['checkout', '--quiet', 'FETCH_HEAD'], { cwd: repo });
}

function checkNodeVersion(packageJson) {
  const requiredVersion = `v${packageJson.volta.node}`;
  if (process.version !== requiredVersion) {
    throw new Error(
      `Bloom Player ${bloomCommit} must be built with Node ${requiredVersion}, not ${process.version}`,
    );
  }
}

function applyPatches(repo) {
  const patches = fs
    .readdirSync(patchesFolder)
    .filter(name => name.endsWith('.patch'))
    .sort();
  for (const patch of patches) {
    try {
      run('git', ['apply', path.join(patchesFolder, patch)], { cwd: repo });
    } catch {
      throw new Error(`${patch} does not apply to Bloom Player ${bloomCommit}`);
    }
  }
}

// The Android browsers in browserslist-config-kolibri are Chromium >= 49 or
// Firefox >= 68, which the desktop entries cover.
const esbuildEngines = {
  Chrome: 'chrome',
  Edge: 'edge',
  Firefox: 'firefox',
  iOS: 'ios',
  Opera: 'opera',
  Safari: 'safari',
};

function cssTarget() {
  return kolibriBrowsers
    .map(query => query.split(' >= '))
    .filter(([browser]) => esbuildEngines[browser])
    .map(([browser, version]) => esbuildEngines[browser] + version)
    .join(',');
}

function buildPlayer(repo, packageJson) {
  const env = {
    ...process.env,
    CSS_TARGET: cssTarget(),
    SOURCE_DATE_EPOCH: execFileSync('git', ['log', '-1', '--format=%ct'], {
      cwd: repo,
      encoding: 'utf8',
    }).trim(),
  };
  const pnpm = (args, options) =>
    run('npx', ['--yes', packageJson.packageManager, ...args], { cwd: repo, env, ...options });
  pnpm(['install', '--frozen-lockfile']);
  pnpm(['exec', 'vitest', 'run']);
  pnpm(['run', 'build:standalone']);
  const licenses = pnpm(['licenses', 'list', '--prod', '--json'], {
    encoding: 'utf8',
    stdio: ['inherit', 'pipe', 'inherit'],
    maxBuffer: 64 * 1024 * 1024,
  });
  return JSON.parse(licenses);
}

function licenseText(dependency) {
  const folder = dependency.paths[0];
  const file = fs.readdirSync(folder).find(name => /^(licen[cs]e|copying)/i.test(name));
  const header = `${dependency.name} ${dependency.versions.join(', ')} (${dependency.license})`;
  const body = file
    ? [fs.readFileSync(path.join(folder, file), 'utf8').trimEnd()]
    : [dependency.author, dependency.homepage];
  return [header, ...body].filter(Boolean).join('\n') + '\n';
}

function coreJsDependency() {
  const packageFile = require.resolve('core-js/package.json');
  const { name, version, license } = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
  return { name, versions: [version], license, paths: [path.dirname(packageFile)] };
}

// Vite drops most libraries' license banners, and upstream's own LICENSE is in
// no bundled file; Terser extracts `/*!` comments into the shipped LICENSE.txt.
function licenseNotices(repo, licenses) {
  const dependencies = [...Object.values(licenses).flat(), coreJsDependency()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  return [fs.readFileSync(path.join(repo, 'LICENSE.txt'), 'utf8'), ...dependencies.map(licenseText)]
    .map(text => `/*!\n${text.replaceAll('*/', '* /')}*/\n`)
    .join('');
}

function copyBuild(repo, notices) {
  const dist = path.join(repo, 'dist');
  const files = fs.readdirSync(dist);
  const outputs = {
    'bloomPlayer.js': /^bloomPlayer\.[^.]+\.js$/,
    'bloomPlayer.css': /^bloomPlayer-[^.]+\.css$/,
  };
  const dropped = files.filter(
    name =>
      name !== 'bloomplayer.htm' &&
      !name.endsWith('.map') &&
      !Object.values(outputs).some(pattern => pattern.test(name)),
  );
  if (dropped.length) {
    throw new Error(`dist has files the rebundle would drop: ${dropped.join(', ')}`);
  }
  fs.mkdirSync(targetFolder, { recursive: true });
  for (const [target, pattern] of Object.entries(outputs)) {
    const matches = files.filter(name => pattern.test(name));
    if (matches.length !== 1) {
      throw new Error(`Expected one ${pattern} in dist, found ${matches.length}`);
    }
    fs.copyFileSync(path.join(dist, matches[0]), path.join(targetFolder, target));
  }
  const player = path.join(targetFolder, 'bloomPlayer.js');
  fs.writeFileSync(player, notices + fs.readFileSync(player, 'utf8'));
}

const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-player-'));
try {
  checkout(repo);
  const packageJson = JSON.parse(fs.readFileSync(path.join(repo, 'package.json'), 'utf8'));
  checkNodeVersion(packageJson);
  applyPatches(repo);
  fs.rmSync(targetFolder, { recursive: true, force: true });
  const licenses = buildPlayer(repo, packageJson);
  copyBuild(repo, licenseNotices(repo, licenses));
  logging.log(`Built Bloom Player ${bloomCommit} into ${targetFolder}`);
} catch (err) {
  logging.error(err.message);
  process.exitCode = 1;
} finally {
  fs.rmSync(repo, { recursive: true, force: true });
}
