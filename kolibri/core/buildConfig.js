// This is only used during build time, so OK to reference files outside of Kolibri src.
const path = require('node:path');
const { kolibriName } = require('kolibri-build');

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
              presets: [
                [
                  '@babel/preset-env',
                  {
                    useBuiltIns: 'entry',
                    corejs: '3.31',
                  },
                ],
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
