const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createHash } = require('node:crypto');
const kolibriBrowsers = require('browserslist-config-kolibri');
const wawoff2 = require('wawoff2');

const upstreamUrl = 'https://github.com/BloomBooks/bloom-player';

const bloomCommit = fs
  .readFileSync(path.resolve(__dirname, './.bloom-player-commit-sha'), 'utf8')
  .trim();

const patchesFolder = path.resolve(__dirname, './patches');

const targetFolder = path.resolve(__dirname, './vendor');

const fontsFolder = path.join(targetFolder, 'fonts');

const andikaUrl = 'https://raw.githubusercontent.com/silnrsi/font-andika';

// Andika 6.101, the version Bloom Reader ships.
const andikaFonts = {
  'Andika-Regular': '202b96b1f174a4a43baefe885b40dacacb81786755efd08ed4b7704e79c45515',
  'Andika-Bold': '4361126189a2d0e0da66999352db58aaf1b4ca940faf8a8239d725f8303d890d',
  'Andika-Italic': '6a4a0dd26d28f577b51dd6afb5acf6fd91ab21694e25649c270a32179bb52a62',
  'Andika-BoldItalic': '2d000f8791a1827c0c4d411e9f4593c4fc2db0fdbb868bb1f863593b3d3968e6',
};

const andikaFontsPath = 'b12c1cc619674126a53750c91d09dc4b4d27405b/references/v6101';

// Tag v6.101.
const andikaLicensePath = 'ca568520c61193de89a795ca676b6978fb435759/OFL.txt';

const andikaLicenseSha256 = '854a86b0716d0615b6bbf3f2f0bf7b17289c076dfa36cf1f46469cbc9882fb74';

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

async function fetchPinned(urlPath, sha256) {
  const response = await fetch(`${andikaUrl}/${urlPath}`).catch(err => {
    throw new Error(`Fetching ${urlPath} failed: ${err.cause?.code ?? err.message}`);
  });
  if (!response.ok) {
    throw new Error(`Fetching ${urlPath} failed with ${response.status}`);
  }
  const data = Buffer.from(await response.arrayBuffer());
  if (createHash('sha256').update(data).digest('hex') !== sha256) {
    throw new Error(`${urlPath} does not match its pinned SHA-256`);
  }
  return data;
}

async function vendorAndika() {
  fs.mkdirSync(fontsFolder, { recursive: true });
  for (const [name, sha256] of Object.entries(andikaFonts)) {
    const ttf = await fetchPinned(`${andikaFontsPath}/${name}.ttf`, sha256);
    fs.writeFileSync(path.join(fontsFolder, `${name}.woff2`), await wawoff2.compress(ttf));
  }
  const license = await fetchPinned(andikaLicensePath, andikaLicenseSha256);
  fs.writeFileSync(path.join(fontsFolder, 'OFL.txt'), license);
}

async function main() {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-player-'));
  try {
    checkout(repo);
    const packageJson = JSON.parse(fs.readFileSync(path.join(repo, 'package.json'), 'utf8'));
    checkNodeVersion(packageJson);
    applyPatches(repo);
    fs.rmSync(targetFolder, { recursive: true, force: true });
    const licenses = buildPlayer(repo, packageJson);
    copyBuild(repo, licenseNotices(repo, licenses));
    await vendorAndika();
    logging.log(`Built Bloom Player ${bloomCommit} into ${targetFolder}`);
  } catch (err) {
    logging.error(err.message);
    process.exitCode = 1;
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
}

main();
