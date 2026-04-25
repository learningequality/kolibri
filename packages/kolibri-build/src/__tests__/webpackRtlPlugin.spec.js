const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const webpack = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const WebpackRTLPlugin = require('../webpackRtlPlugin');
const { createCssInsert } = require('../createCssInsert');

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

/* Helper to create test files for webpack compilation */
function createTestFiles(tempDir) {
  const entryFile = path.join(tempDir, 'entry.js');
  const cssFile = path.join(tempDir, 'styles.css');
  const asyncModuleFile = path.join(tempDir, 'asyncModule.js');

  fs.writeFileSync(cssFile, '.test { direction: ltr; margin-left: 10px; }');
  fs.writeFileSync(asyncModuleFile, `import './styles.css'; export default 'async';`);
  fs.writeFileSync(entryFile, `import('./asyncModule.js');`);

  return { entryFile, cssFile, asyncModuleFile };
}

describe('WebpackRTLPlugin', () => {
  let tempDir;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rtl-test-'));
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('RTL CSS file generation', () => {
    it('should generate .rtl.css files with RTL-transformed styles', async () => {
      // Somehow this test triggers swc-compiler's import of browserslist
      // which then does a warning about not being up to date.
      // Suppress the warning as the up to dateness is irrelevant to this test.
      jest.spyOn(console, 'warn').mockImplementation();
      const testDir = path.join(tempDir, 'rtl-generation');
      fs.mkdirSync(testDir, { recursive: true });
      const { entryFile } = createTestFiles(testDir);
      const outputDir = path.join(testDir, 'dist');

      await compileBundle({
        mode: 'development',
        entry: entryFile,
        output: { path: outputDir, filename: 'bundle.js' },
        module: {
          rules: [
            { test: /\.css$/, use: [MiniCssExtractPlugin.loader, require.resolve('css-loader')] },
          ],
        },
        plugins: [
          new MiniCssExtractPlugin({ filename: '[name].css' }),
          new WebpackRTLPlugin({ isCoreBundle: true }),
        ],
      });

      const files = fs.readdirSync(outputDir);
      const cssFiles = files.filter(f => f.endsWith('.css') && !f.endsWith('.rtl.css'));
      const rtlCssFiles = files.filter(f => f.endsWith('.rtl.css'));

      expect(cssFiles.length).toBeGreaterThan(0);
      expect(rtlCssFiles.length).toBeGreaterThan(0);

      // Verify RTL transformation actually happened (margin-left -> margin-right)
      const rtlCssContent = fs.readFileSync(path.join(outputDir, rtlCssFiles[0]), 'utf-8');
      expect(rtlCssContent).toContain('margin-right');
      expect(rtlCssContent).not.toContain('margin-left');
    });
  });

  describe('runtime module ordering', () => {
    it('should order RTLCSSRuntimeModule to run after GetChunkFilenameRuntimeModule', async () => {
      const testDir = path.join(tempDir, 'ordering');
      fs.mkdirSync(testDir, { recursive: true });
      const { entryFile } = createTestFiles(testDir);
      const outputDir = path.join(testDir, 'dist');

      let foundBothModules = false;
      let orderingCorrect = false;

      const compiler = webpack({
        mode: 'development',
        entry: entryFile,
        output: { path: outputDir, filename: 'bundle.js' },
        module: {
          rules: [
            { test: /\.css$/, use: [MiniCssExtractPlugin.loader, require.resolve('css-loader')] },
          ],
        },
        plugins: [
          new MiniCssExtractPlugin({ filename: '[name].css' }),
          new WebpackRTLPlugin({ isCoreBundle: true }),
        ],
      });

      compiler.hooks.compilation.tap('TestPlugin', compilation => {
        compilation.hooks.afterProcessAssets.tap('TestPlugin', () => {
          for (const chunk of compilation.chunks) {
            const runtimeModules = [...compilation.chunkGraph.getChunkRuntimeModulesInOrder(chunk)];
            let miniCssIndex = -1;
            let rtlIndex = -1;

            runtimeModules.forEach((module, index) => {
              if (module.name && module.name.includes('mini-css')) miniCssIndex = index;
              if (module.name === 'RTL CSS Loading') rtlIndex = index;
            });

            if (miniCssIndex !== -1 && rtlIndex !== -1) {
              foundBothModules = true;
              orderingCorrect = rtlIndex > miniCssIndex;
            }
          }
        });
      });

      await new Promise((resolve, reject) => {
        compiler.run((err, stats) => {
          if (err) reject(err);
          else if (stats.hasErrors()) reject(new Error(stats.toString()));
          else resolve();
        });
      });

      expect(foundBothModules).toBe(true);
      expect(orderingCorrect).toBe(true);
    });
  });

  describe('runtime code generation', () => {
    let bundleContent;
    let testDir;

    beforeAll(async () => {
      testDir = path.join(tempDir, 'runtime-code');
      fs.mkdirSync(testDir, { recursive: true });
      const { entryFile } = createTestFiles(testDir);
      const outputDir = path.join(testDir, 'dist');

      await compileBundle({
        name: 'test-bundle-name',
        mode: 'development',
        entry: entryFile,
        output: { path: outputDir, filename: 'bundle.js' },
        module: {
          rules: [
            { test: /\.css$/, use: [MiniCssExtractPlugin.loader, require.resolve('css-loader')] },
          ],
        },
        plugins: [
          new MiniCssExtractPlugin({ filename: '[name].css' }),
          new WebpackRTLPlugin({ isCoreBundle: true }),
        ],
      });

      bundleContent = fs.readFileSync(path.join(outputDir, 'bundle.js'), 'utf-8');
    });

    it('should include bundle ID in generated code', () => {
      expect(bundleContent).toContain('test-bundle-name');
    });

    it('should intercept miniCssF', () => {
      expect(bundleContent).toContain('originalMiniCssF');
      expect(bundleContent).toMatch(/__webpack_require__\.miniCssF\s*=\s*function/);
    });

    it('should use lazy initialization for bundleAPI', () => {
      expect(bundleContent).toContain('bundleAPI');
      expect(bundleContent).toContain('if (!bundleAPI)');
    });

    it('should register bundle with rtlManager', () => {
      expect(bundleContent).toContain('registerBundle');
    });

    it('should use __webpack_require__ for core bundle rtlcss access', () => {
      // Core bundles use __webpack_require__ with the resolved module ID,
      // not the import specifier "kolibri/rtlcss"
      expect(bundleContent).toContain('__webpack_require__');
      expect(bundleContent).not.toContain('__webpack_require__("kolibri/rtlcss")');
    });
  });

  describe('plugin bundle code generation', () => {
    let bundleContent;

    beforeAll(async () => {
      const testDir = path.join(tempDir, 'plugin-bundle');
      fs.mkdirSync(testDir, { recursive: true });
      const { entryFile } = createTestFiles(testDir);
      const outputDir = path.join(testDir, 'dist');

      await compileBundle({
        name: 'plugin-bundle-name',
        mode: 'development',
        entry: entryFile,
        output: { path: outputDir, filename: 'bundle.js' },
        module: {
          rules: [
            { test: /\.css$/, use: [MiniCssExtractPlugin.loader, require.resolve('css-loader')] },
          ],
        },
        plugins: [
          new MiniCssExtractPlugin({ filename: '[name].css' }),
          new WebpackRTLPlugin({ isCoreBundle: false }), // Plugin bundle, not core
        ],
      });

      bundleContent = fs.readFileSync(path.join(outputDir, 'bundle.js'), 'utf-8');
    });

    it('should use window global for plugin bundle rtlcss access', () => {
      // Plugin bundles access rtlcss via window.kolibriCoreAppGlobal
      expect(bundleContent).toContain('window.kolibriCoreAppGlobal');
      expect(bundleContent).toContain('kolibri/rtlcss');
    });

    it('should include plugin bundle ID', () => {
      expect(bundleContent).toContain('plugin-bundle-name');
    });
  });

  describe('integration with MiniCssExtractPlugin', () => {
    let entryFile;
    let cssFile;
    let integrationDir;

    beforeAll(() => {
      integrationDir = path.join(tempDir, 'integration');
      fs.mkdirSync(integrationDir, { recursive: true });
      entryFile = path.join(integrationDir, 'entry.js');
      cssFile = path.join(integrationDir, 'styles.css');
      const asyncModuleFile = path.join(integrationDir, 'asyncModule.js');

      fs.writeFileSync(cssFile, '.test { direction: ltr; }');
      fs.writeFileSync(asyncModuleFile, `import './styles.css'; export default 'async';`);
      fs.writeFileSync(entryFile, `import('./asyncModule.js');`);
    });

    it('should generate RTL CSS files', done => {
      const outputDir = path.join(tempDir, 'dist2');

      const compiler = webpack({
        mode: 'development',
        entry: entryFile,
        output: {
          path: outputDir,
          filename: 'bundle.js',
        },
        module: {
          rules: [
            {
              test: /\.css$/,
              use: [MiniCssExtractPlugin.loader, require.resolve('css-loader')],
            },
          ],
        },
        plugins: [
          new MiniCssExtractPlugin({
            filename: '[name].css',
          }),
          new WebpackRTLPlugin({ isCoreBundle: true }),
        ],
      });

      compiler.run((err, stats) => {
        if (err) {
          done(err);
          return;
        }
        if (stats.hasErrors()) {
          done(new Error(stats.toString()));
          return;
        }

        // Verify that both LTR and RTL CSS files were generated
        const files = fs.readdirSync(outputDir);
        // With dynamic imports, CSS ends up in a chunk file not main.css
        const cssFiles = files.filter(f => f.endsWith('.css'));
        const rtlCssFiles = cssFiles.filter(f => f.endsWith('.rtl.css'));
        const ltrCssFiles = cssFiles.filter(f => !f.endsWith('.rtl.css'));
        expect(ltrCssFiles.length).toBeGreaterThan(0);
        expect(rtlCssFiles.length).toBeGreaterThan(0);
        done();
      });
    });

    it('should have miniCssF intercept code in the generated bundle', done => {
      const outputDir = path.join(tempDir, 'dist3');

      const compiler = webpack({
        mode: 'development',
        entry: entryFile,
        output: {
          path: outputDir,
          filename: 'bundle.js',
        },
        module: {
          rules: [
            {
              test: /\.css$/,
              use: [MiniCssExtractPlugin.loader, require.resolve('css-loader')],
            },
          ],
        },
        plugins: [
          new MiniCssExtractPlugin({
            filename: '[name].css',
          }),
          new WebpackRTLPlugin({ isCoreBundle: true }),
        ],
      });

      compiler.run((err, stats) => {
        if (err) {
          done(err);
          return;
        }
        if (stats.hasErrors()) {
          done(new Error(stats.toString()));
          return;
        }

        // Read the generated bundle and verify the intercept pattern
        const bundleContent = fs.readFileSync(path.join(outputDir, 'bundle.js'), 'utf-8');

        // The bundle should contain the miniCssF definition (from MiniCssExtractPlugin)
        expect(bundleContent).toContain('miniCssF');

        // Verify the intercept overwrites miniCssF
        expect(bundleContent).toContain('originalMiniCssF');

        // Verify it registers with rtlManager
        expect(bundleContent).toContain('registerBundle');

        done();
      });
    });
  });

  describe('createCssInsert', () => {
    it('should return a function', () => {
      const insert = createCssInsert('test-bundle');
      expect(typeof insert).toBe('function');
    });

    it('should serialize with bundleId as literal string, not variable reference', () => {
      // MiniCssExtractPlugin serializes insert functions with .toString()
      // If bundleId were a closure variable, it would be lost during serialization
      const insert = createCssInsert('my-bundle-id');
      const serialized = insert.toString();

      // The serialized function must contain the bundleId as a literal string
      expect(serialized).toContain('"my-bundle-id"');
      // And must NOT reference bundleId as a variable
      expect(serialized).not.toMatch(/[^"']bundleId[^"']/);
    });

    it('should tag link element with data-webpack-bundle attribute', () => {
      const insert = createCssInsert('my-bundle-id');

      // Create a real link element for JSDOM
      const linkElement = document.createElement('link');
      linkElement.rel = 'stylesheet';
      linkElement.href = 'test.css';

      insert(linkElement);

      expect(linkElement).toHaveAttribute('data-webpack-bundle', 'my-bundle-id');
      expect(document.head.contains(linkElement)).toBe(true);

      // Clean up
      linkElement.remove();
    });

    it('should work with MiniCssExtractPlugin insert option', async () => {
      const testDir = path.join(tempDir, 'css-insert-test');
      fs.mkdirSync(testDir, { recursive: true });
      const { entryFile } = createTestFiles(testDir);
      const outputDir = path.join(testDir, 'dist');

      const bundleName = 'insert-test-bundle';

      await compileBundle({
        name: bundleName,
        mode: 'development',
        entry: entryFile,
        output: { path: outputDir, filename: 'bundle.js' },
        module: {
          rules: [
            { test: /\.css$/, use: [MiniCssExtractPlugin.loader, require.resolve('css-loader')] },
          ],
        },
        plugins: [
          new MiniCssExtractPlugin({
            filename: '[name].css',
            insert: createCssInsert(bundleName),
          }),
          new WebpackRTLPlugin({ isCoreBundle: true }),
        ],
      });

      // Read the generated bundle and verify the insert function is included
      const bundleContent = fs.readFileSync(path.join(outputDir, 'bundle.js'), 'utf-8');

      // The bundle should contain the insert function with bundle ID
      expect(bundleContent).toContain('data-webpack-bundle');
      expect(bundleContent).toContain(bundleName);
    });
  });
});
