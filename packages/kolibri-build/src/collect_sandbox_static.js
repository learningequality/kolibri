const fs = require('node:fs');
const path = require('node:path');
const { gunzipSync } = require('node:zlib');
const logger = require('kolibri-logging');

const logging = logger.getLogger('Kolibri Sandbox Static Collector');

const GZ = '.gz';
const FILE_SIZE = '.file_size';

/**
 * @typedef {object} BundleDatum The fields of a read_webpack_json entry used here.
 * @property {string} module_path Dotted Python path of the plugin the bundle belongs to.
 * @property {string} plugin_path Filesystem path of the plugin package.
 * @property {string} static_dir The plugin's static directory.
 * @property {boolean} sandbox_handler Whether the bundle is a sandbox handler.
 */

/**
 * List the directories alt_wsgi.py mounts on the sandbox server: the core content
 * static directory (where the kolibri-sandbox package builds to) followed by the
 * static directory of every plugin shipping a sandbox handler bundle.
 * @param {BundleDatum[]} bundleData - All bundles read from the plugins being built.
 * @returns {string[]} Source directories, in the order the sandbox server resolves them.
 * @throws {Error} If kolibri.core is absent, leaving the core static path unknown.
 */
function sandboxStaticPaths(bundleData) {
  const core = bundleData.find(bundle => bundle.module_path === 'kolibri.core');
  if (!core) {
    throw new Error('kolibri.core must be in the plugin list to locate the core static files');
  }
  return [
    path.join(core.plugin_path, 'content', 'static'),
    ...new Set(bundleData.filter(bundle => bundle.sandbox_handler).map(b => b.static_dir)),
  ];
}

/**
 * Whether a file exists only to support serve-time reconstruction, so a plain static
 * host has no URL for it. DynamicWhiteNoise serves a .gz as content-encoding on its
 * primary's URL, never as a path of its own; a .gz with no primary is a content file.
 * @param {string} srcFile - Path of the candidate file.
 * @returns {boolean} True when the file should not be collected.
 */
function isServeArtifact(srcFile) {
  if (srcFile.endsWith(FILE_SIZE)) {
    return true;
  }
  return srcFile.endsWith(GZ) && fs.existsSync(srcFile.slice(0, -GZ.length));
}

/**
 * Copy one file, writing it whole. This undoes compress.js, which gzips each static
 * file, truncates the original to 0 bytes and leaves a .file_size sibling;
 * DynamicWhiteNoise rebuilds those at serve time but a CDN won't.
 * @param {string} srcFile - Path of the file to collect.
 * @param {string} destFile - Path to write, whose parent directory must already exist.
 */
function collectFile(srcFile, destFile) {
  const buildCompressed =
    fs.existsSync(srcFile + FILE_SIZE) &&
    fs.statSync(srcFile).size === 0 &&
    fs.existsSync(srcFile + GZ);
  if (buildCompressed) {
    fs.writeFileSync(destFile, gunzipSync(fs.readFileSync(srcFile + GZ)));
  } else {
    fs.copyFileSync(srcFile, destFile);
  }
}

/**
 * Resolve a path through symlinks, tolerating one that does not exist yet by resolving
 * its nearest existing ancestor and re-appending the rest.
 * @param {string} target - Path to resolve, which need not exist.
 * @returns {string} Absolute path with every existing symlink component resolved.
 */
function realPath(target) {
  const missing = [];
  let existing = path.resolve(target);
  while (!fs.existsSync(existing)) {
    missing.unshift(path.basename(existing));
    existing = path.dirname(existing);
  }
  return path.join(fs.realpathSync(existing), ...missing);
}

/**
 * Refuse a destination that overlaps a source tree, in either direction: one containing
 * a source loses it to --clear, and one nested inside a source is walked as it is
 * written, collecting each file again under a doubled relative path.
 * @param {string} destination - Directory to collect into, which need not exist yet.
 * @param {string[]} sourceDirs - Source directories to collect from.
 * @throws {Error} If the destination overlaps a source directory.
 */
function assertDisjoint(destination, sourceDirs) {
  const destReal = realPath(destination);
  for (const sourceDir of sourceDirs) {
    if (!fs.existsSync(sourceDir)) {
      continue;
    }
    const sourceReal = fs.realpathSync(sourceDir);
    if (sourceReal === destReal || sourceReal.startsWith(destReal + path.sep)) {
      throw new Error(`Refusing to collect into ${destination}: it contains source ${sourceDir}`);
    }
    if (destReal.startsWith(sourceReal + path.sep)) {
      throw new Error(`Refusing to collect into ${destination}: it is inside source ${sourceDir}`);
    }
  }
}

/**
 * Delete an existing destination tree, refusing a symlink: rm would remove the link
 * rather than the tree it names, leaving the stale files in place.
 * @param {string} destination - Directory to delete, which must exist.
 * @throws {Error} If the destination is a symlink.
 */
function clearDestination(destination) {
  if (fs.lstatSync(destination).isSymbolicLink()) {
    throw new Error(`Refusing to clear symlinked destination: ${destination}`);
  }
  logging.info(`Clearing destination directory: ${destination}`);
  fs.rmSync(destination, { recursive: true });
}

/**
 * Recursively yield every file under a directory.
 * @param {string} dir - Directory to walk.
 * @yields {string} Path of each file found, at any depth.
 */
function* walkFiles(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkFiles(entryPath);
    } else {
      yield entryPath;
    }
  }
}

/**
 * Copy every file the sandbox server serves into a single directory, suitable for
 * upload to a CDN or object storage.
 * @param {BundleDatum[]} bundleData - All bundles read from the plugins being built.
 * @param {string} destination - Directory to collect into; created if absent.
 * @param {object} options - Collection options.
 * @param {boolean} [options.clear] - Delete the destination tree before collecting.
 * @returns {number} How many files were collected.
 * @throws {Error} If the sources yield no files, or the destination overlaps a source.
 */
function collectSandboxStatic(bundleData, destination, { clear = false } = {}) {
  const sourceDirs = sandboxStaticPaths(bundleData);

  assertDisjoint(destination, sourceDirs);

  if (clear && fs.existsSync(destination)) {
    clearDestination(destination);
  }

  fs.mkdirSync(destination, { recursive: true });

  const collected = new Set();

  for (const sourceDir of sourceDirs) {
    if (!fs.existsSync(sourceDir)) {
      logging.warn(`Source directory not found: ${sourceDir}`);
      continue;
    }

    logging.info(`Collecting from: ${sourceDir}`);

    for (const srcFile of walkFiles(sourceDir)) {
      if (isServeArtifact(srcFile)) {
        continue;
      }

      // FileFinder resolves colliding relative paths first-wins, in source order —
      // mirror that rather than overwriting.
      const relFile = path.relative(sourceDir, srcFile);
      if (collected.has(relFile)) {
        logging.debug(`Skipping ${srcFile}: already collected from an earlier source`);
        continue;
      }
      collected.add(relFile);

      const destFile = path.join(destination, relFile);
      fs.mkdirSync(path.dirname(destFile), { recursive: true });
      collectFile(srcFile, destFile);
    }
  }

  if (!collected.size) {
    throw new Error('No static files found to collect');
  }

  logging.info(`Successfully collected ${collected.size} files to ${destination}`);
  return collected.size;
}

module.exports = collectSandboxStatic;
module.exports.sandboxStaticPaths = sandboxStaticPaths;
