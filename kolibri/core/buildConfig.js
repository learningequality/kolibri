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
      module: {
        rules: [
          {
            // Use babel-loader only for the entry file that imports core-js,
            // so that @babel/preset-env can expand `import 'core-js'` into
            // granular polyfill imports based on the browserslist targets.
            test: /\.(js|mjs)$/,
            include: [path.resolve(__dirname, 'frontend/index.js')],
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
];
