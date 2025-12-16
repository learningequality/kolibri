// This is only used during build time, so OK to reference files outside of Kolibri src.
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
];
