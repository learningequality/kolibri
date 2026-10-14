// This is only used during build time, so OK to reference files outside of Kolibri src.
const fs = require('node:fs');
const path = require('node:path');
const { kolibriName } = require('kolibri-build');

const mathjaxFontsSource = path.join(
  path.dirname(require.resolve('mathjax-full/package.json')),
  'ts/output/chtml/fonts/tex-woff-v2',
);
const mathjaxFontsTarget = path.resolve(__dirname, 'static/assets/mathjax/fonts');

// MathJax fetches fonts by bare filename from urls.static('assets/mathjax/fonts'),
// so they are copied unhashed.
class CopyMathJaxFontsPlugin {
  apply() {
    fs.mkdirSync(mathjaxFontsTarget, { recursive: true });
    for (const file of fs.readdirSync(mathjaxFontsSource)) {
      if (!file.endsWith('.woff')) continue;
      fs.copyFileSync(path.join(mathjaxFontsSource, file), path.join(mathjaxFontsTarget, file));
    }
  }
}

module.exports = [
  {
    bundle_id: 'default_frontend',
    webpack_config: {
      entry: './frontend/index.js',
      output: {
        library: kolibriName,
        libraryExport: 'default',
        libraryTarget: 'window',
      },
      plugins: [new CopyMathJaxFontsPlugin()],
    },
  },
  // The polyfills and polyfill_loader bundles below load and run before
  // default_frontend, so window.kolibriCoreAppGlobal does not exist yet;
  // both set skipMessageRegistration to opt out of that bootstrap.
  {
    bundle_id: 'polyfills',
    skipMessageRegistration: true,
    webpack_config: {
      entry: './frontend/polyfills.js',
      module: {
        rules: [
          {
            // Expand `import 'core-js'` into per-target polyfill imports.
            test: /\.(js|mjs)$/,
            include: [path.resolve(__dirname, 'frontend/polyfills.js')],
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env'],
              // `version` must track the `core-js` catalog entry in pnpm-workspace.yaml.
              plugins: [
                ['babel-plugin-polyfill-corejs3', { method: 'entry-global', version: '3.49' }],
              ],
              sourceType: 'unambiguous',
            },
          },
        ],
      },
    },
  },
  {
    bundle_id: 'polyfill_loader',
    skipMessageRegistration: true,
    webpack_config: {
      entry: './frontend/polyfillLoader.js',
    },
  },
];
