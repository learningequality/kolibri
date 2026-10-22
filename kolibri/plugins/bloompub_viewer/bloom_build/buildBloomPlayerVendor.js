const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

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

function buildPlayer(repo, packageJson) {
  const env = {
    ...process.env,
    SOURCE_DATE_EPOCH: execFileSync('git', ['log', '-1', '--format=%ct'], {
      cwd: repo,
      encoding: 'utf8',
    }).trim(),
  };
  const pnpm = (...args) =>
    run('npx', ['--yes', packageJson.packageManager, ...args], { cwd: repo, env });
  pnpm('install', '--frozen-lockfile');
  pnpm('exec', 'vitest', 'run');
  pnpm('run', 'build:standalone');
}

function copyBuild(repo) {
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
}

const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-player-'));
try {
  checkout(repo);
  const packageJson = JSON.parse(fs.readFileSync(path.join(repo, 'package.json'), 'utf8'));
  checkNodeVersion(packageJson);
  applyPatches(repo);
  fs.rmSync(targetFolder, { recursive: true, force: true });
  buildPlayer(repo, packageJson);
  copyBuild(repo);
  logging.log(`Built Bloom Player ${bloomCommit} into ${targetFolder}`);
} catch (err) {
  logging.error(err.message);
  process.exitCode = 1;
} finally {
  fs.rmSync(repo, { recursive: true, force: true });
}
