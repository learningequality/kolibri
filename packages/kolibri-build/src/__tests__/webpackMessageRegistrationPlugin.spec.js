const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const webpack = require('webpack');
const MessageRegistrationPlugin = require('../webpackMessageRegistrationPlugin');

// Polyfill setImmediate for Jest environment (webpack requires it)
if (typeof setImmediate === 'undefined') {
  global.setImmediate = (fn, ...args) => setTimeout(fn, 0, ...args);
  global.clearImmediate = id => clearTimeout(id);
}

/* Helper to compile a webpack bundle and return the output */
function compileBundle(config) {
  return new Promise((resolve, reject) => {
    const compiler = webpack(config);
    compiler.run((err, stats) => {
      if (err) {
        reject(err);
        return;
      }
      if (stats.hasErrors()) {
        reject(new Error(stats.toString()));
        return;
      }
      resolve({ compiler, stats });
    });
  });
}

describe('MessageRegistrationPlugin', () => {
  const moduleName = 'kolibri.plugins.test.main';
  let tempDir;
  let outputDir;

  beforeAll(async () => {
    // webpack's default `browserslist` target warns when caniuse-lite data is stale.
    jest.spyOn(console, 'warn').mockImplementation();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'message-registration-test-'));
    outputDir = path.join(tempDir, 'dist');
    const moduleEntry = path.join(tempDir, 'module.js');
    const workerEntry = path.join(tempDir, 'worker.js');
    fs.writeFileSync(moduleEntry, `export default 'module';`);
    fs.writeFileSync(workerEntry, `export default 'worker';`);
    await compileBundle({
      mode: 'development',
      entry: { pdfJSWorker: workerEntry, [moduleName]: moduleEntry },
      output: { path: outputDir, filename: '[name].js' },
      plugins: [new MessageRegistrationPlugin({ moduleName })],
    });
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function readEntry(entryName) {
    return fs.readFileSync(path.join(outputDir, `${entryName}.js`), 'utf-8');
  }

  it('registers language assets in the entry named after the module', () => {
    expect(readEntry(moduleName)).toContain(`registerLanguageAssets('${moduleName}')`);
  });

  it('does not register language assets in any other entry', () => {
    expect(readEntry('pdfJSWorker')).not.toContain('registerLanguageAssets');
  });
});
