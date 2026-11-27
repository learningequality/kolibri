const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const webpack = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const baseConfig = require('../webpack.config.base');

// Polyfill setImmediate for Jest environment (webpack requires it)
if (typeof setImmediate === 'undefined') {
  global.setImmediate = (fn, ...args) => setTimeout(fn, 0, ...args);
  global.clearImmediate = id => clearTimeout(id);
}

function compileBundle(config) {
  return new Promise((resolve, reject) => {
    const compiler = webpack(config);
    compiler.run((err, stats) => {
      if (err) {
        reject(err);
        return;
      }
      compiler.close(() => resolve(stats));
    });
  });
}

function expectNoErrors(stats) {
  expect(stats.toJson({ all: false, errors: true }).errors.map(e => e.message)).toEqual([]);
}

const COMPILE_TIMEOUT = 30000;

// Jest on Node 20 cannot require the ESM-only @csstools/postcss-cascade-layers
// that postcss-loader loads.
function withoutPostCss(config) {
  const rules = config.module.rules.map(rule =>
    String(rule.test) === String(/\.css$/)
      ? {
          ...rule,
          use: rule.use.filter(loader => !String(loader.loader).includes('postcss-loader')),
        }
      : rule,
  );
  return { ...config, module: { ...config.module, rules } };
}

describe('webpack.config.base', () => {
  let tempDir;
  let entryFile;
  let outputDir;

  beforeEach(() => {
    // webpack's default `browserslist` target warns when caniuse-lite data is stale.
    jest.spyOn(console, 'warn').mockImplementation();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'webpack-config-base-test-'));
    entryFile = path.join(tempDir, 'entry.js');
    outputDir = path.join(tempDir, 'dist');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it(
    'minifies production bundles without comments or extracted licence files',
    async () => {
      fs.writeFileSync(
        entryFile,
        [
          '/*! licence comment */',
          'window.licensed = 1;',
          '/* block comment */',
          'window.blocked = 2;',
          '// line comment',
          'window.lined = 3;',
        ].join('\n'),
      );

      const stats = await compileBundle({
        ...baseConfig({ mode: 'production' }),
        entry: entryFile,
        output: { path: outputDir, filename: 'bundle.js' },
      });

      expectNoErrors(stats);
      expect(fs.readdirSync(outputDir).filter(f => f.endsWith('.LICENSE.txt'))).toEqual([]);
      const bundle = fs.readFileSync(path.join(outputDir, 'bundle.js'), 'utf-8');
      expect(bundle).toContain('window.lined');
      expect(bundle).not.toMatch(/licence comment|block comment|line comment|\/\*!/);
    },
    COMPILE_TIMEOUT,
  );

  describe('css insertion', () => {
    beforeEach(() => {
      fs.writeFileSync(path.join(tempDir, '.browserslistrc'), 'Chrome >= 49\n');
      fs.writeFileSync(path.join(tempDir, 'styles.css'), '.box { color: red; }\n');
      fs.writeFileSync(entryFile, "import './styles.css';\n");
    });

    it(
      'resolves the hot css loader from kolibri-build outside its node_modules',
      async () => {
        const config = withoutPostCss(baseConfig({ hot: true }));
        const stats = await compileBundle({
          ...config,
          context: tempDir,
          entry: entryFile,
          output: { path: outputDir, filename: 'bundle.js' },
          resolveLoader: { ...config.resolveLoader, modules: ['node_modules'] },
        });

        expectNoErrors(stats);
        expect(fs.readdirSync(outputDir).filter(f => f.endsWith('.css'))).toEqual([]);
      },
      COMPILE_TIMEOUT,
    );

    it(
      'extracts css into its own asset when not hot',
      async () => {
        const config = withoutPostCss(baseConfig());
        const stats = await compileBundle({
          ...config,
          context: tempDir,
          entry: entryFile,
          output: { path: outputDir, filename: 'bundle.js' },
          plugins: [...config.plugins, new MiniCssExtractPlugin()],
        });

        expectNoErrors(stats);
        expect(fs.readdirSync(outputDir).filter(f => f.endsWith('.css'))).toEqual(['main.css']);
      },
      COMPILE_TIMEOUT,
    );
  });
});
