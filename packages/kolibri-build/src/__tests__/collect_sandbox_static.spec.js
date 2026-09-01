const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { gzipSync } = require('node:zlib');
const collectSandboxStatic = require('../collect_sandbox_static');
const compressFile = require('../compress');

describe('collectSandboxStatic', () => {
  let tmp;
  let destination;
  let core;
  let plugin;

  function write(filePath, contents) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, contents);
  }

  /* Mirror compress.js: gzip the file, truncate the original, record its size. */
  function writeTruncated(filePath, contents) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath + '.gz', gzipSync(Buffer.from(contents)));
    fs.writeFileSync(filePath, '');
    fs.writeFileSync(filePath + '.file_size', String(contents.length));
  }

  function read(...relative) {
    return fs.readFileSync(path.join(destination, ...relative), 'utf-8');
  }

  /* The subset of read_webpack_json output that collectSandboxStatic reads. */
  function bundleData({ handlerPlugins = [plugin] } = {}) {
    return [
      { module_path: 'kolibri.core', plugin_path: core, sandbox_handler: false },
      ...handlerPlugins.map(pluginPath => ({
        module_path: 'kolibri.plugins.test_viewer',
        plugin_path: pluginPath,
        static_dir: path.join(pluginPath, 'static'),
        sandbox_handler: true,
      })),
    ];
  }

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'collect-sandbox-static-'));
    destination = path.join(tmp, 'dest');
    // The core content static directory is nested inside the kolibri.core plugin path.
    core = path.join(tmp, 'core');
    plugin = path.join(tmp, 'plugin');
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  function coreStatic(...relative) {
    return path.join(core, 'content', 'static', ...relative);
  }

  function pluginStatic(...relative) {
    return path.join(plugin, 'static', ...relative);
  }

  it('collects from every source dir', () => {
    write(coreStatic('core.js'), 'core');
    write(pluginStatic('nested', 'plugin.js'), 'plugin');

    collectSandboxStatic(bundleData(), destination);

    expect(read('core.js')).toEqual('core');
    expect(read('nested', 'plugin.js')).toEqual('plugin');
  });

  it('skips plugins with no sandbox handler bundle', () => {
    write(coreStatic('core.js'), 'core');
    write(pluginStatic('plugin.js'), 'plugin');

    collectSandboxStatic(bundleData({ handlerPlugins: [] }), destination);

    expect(fs.existsSync(path.join(destination, 'plugin.js'))).toBe(false);
  });

  it('resolves colliding paths first-wins', () => {
    // FileFinder serves the first matching location, so the collected bundle must
    // keep the core copy rather than the later plugin one.
    write(coreStatic('shared.js'), 'core');
    write(pluginStatic('shared.js'), 'plugin');

    collectSandboxStatic(bundleData(), destination);

    expect(read('shared.js')).toEqual('core');
  });

  it('skips a missing source dir', () => {
    write(coreStatic('core.js'), 'core');

    collectSandboxStatic(bundleData(), destination);

    expect(read('core.js')).toEqual('core');
  });

  it('throws when no files are found', () => {
    fs.mkdirSync(coreStatic(), { recursive: true });

    expect(() => collectSandboxStatic(bundleData(), destination)).toThrow(
      'No static files found to collect',
    );
  });

  it('throws when kolibri.core is absent from the bundle data', () => {
    expect(() => collectSandboxStatic([], destination)).toThrow('kolibri.core must be');
  });

  it('removes stale destination files when clearing', () => {
    write(path.join(destination, 'stale.js'), 'stale');
    write(coreStatic('core.js'), 'core');

    collectSandboxStatic(bundleData(), destination, { clear: true });

    expect(fs.existsSync(path.join(destination, 'stale.js'))).toBe(false);
    expect(read('core.js')).toEqual('core');
  });

  it('recollects over an existing destination without clear', () => {
    write(path.join(destination, 'core.js'), 'stale');
    write(coreStatic('core.js'), 'core');

    collectSandboxStatic(bundleData(), destination);

    expect(read('core.js')).toEqual('core');
  });

  it('reconstructs a build-truncated file from its gzip', () => {
    // A CDN won't reconstruct build-truncated files, so the collected copy must
    // carry the full bytes, inflated from the .gz counterpart.
    writeTruncated(coreStatic('app.js'), 'real content');

    collectSandboxStatic(bundleData(), destination);

    expect(read('app.js')).toEqual('real content');
  });

  it('reconstructs a file compressed by the real compressor', async () => {
    // writeTruncated only mirrors compress.js; drive the compressor itself so the
    // two halves of the round-trip cannot drift apart.
    write(coreStatic('app.js'), 'real content');
    await compressFile(coreStatic('app.js'));

    collectSandboxStatic(bundleData(), destination);

    expect(read('app.js')).toEqual('real content');
    expect(fs.existsSync(path.join(destination, 'app.js.gz'))).toBe(false);
    expect(fs.existsSync(path.join(destination, 'app.js.file_size'))).toBe(false);
  });

  it('does not collect the file_size sidecar', () => {
    writeTruncated(coreStatic('app.js'), 'real content');

    collectSandboxStatic(bundleData(), destination);

    expect(fs.existsSync(path.join(destination, 'app.js.file_size'))).toBe(false);
  });

  it('does not collect a gzip sidecar', () => {
    // DynamicWhiteNoise serves the .gz as content-encoding on app.js's own URL, so a
    // collected app.js.gz would be an unreachable duplicate.
    writeTruncated(coreStatic('app.js'), 'real content');

    collectSandboxStatic(bundleData(), destination);

    expect(fs.existsSync(path.join(destination, 'app.js.gz'))).toBe(false);
  });

  it('collects a gzip file that has no primary', () => {
    // A .gz with no counterpart is a content file in its own right.
    write(coreStatic('archive.gz'), 'archive');

    collectSandboxStatic(bundleData(), destination);

    expect(read('archive.gz')).toEqual('archive');
  });

  it('refuses to clear a symlinked destination', () => {
    write(coreStatic('core.js'), 'core');
    const real = path.join(tmp, 'real');
    write(path.join(real, 'keep.js'), 'keep');
    fs.symlinkSync(real, destination);

    expect(() => collectSandboxStatic(bundleData(), destination, { clear: true })).toThrow(
      'Refusing to clear symlinked destination',
    );
    // The symlink target's contents must survive.
    expect(fs.existsSync(path.join(real, 'keep.js'))).toBe(true);
  });

  it('refuses to clear a destination containing a source', () => {
    core = path.join(destination, 'core');
    write(coreStatic('core.js'), 'core');

    expect(() => collectSandboxStatic(bundleData(), destination, { clear: true })).toThrow(
      'it contains source',
    );
    // The source under the destination must not be wiped.
    expect(fs.existsSync(coreStatic('core.js'))).toBe(true);
  });

  it('refuses a destination containing a source without clearing', () => {
    core = path.join(destination, 'core');
    write(coreStatic('core.js'), 'core');

    expect(() => collectSandboxStatic(bundleData(), destination)).toThrow('it contains source');
  });

  it('refuses a destination inside a source', () => {
    // The walk reads each directory as it descends, so files already written to a
    // destination below the source get collected again under a doubled path.
    write(coreStatic('core.js'), 'core');
    destination = coreStatic('collected');

    expect(() => collectSandboxStatic(bundleData(), destination)).toThrow('it is inside source');
    expect(fs.existsSync(destination)).toBe(false);
  });
});
