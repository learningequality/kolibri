// This is only used during build time, so OK to reference files outside of Kolibri src.
const { kolibriName } = require('kolibri-tools/lib/kolibriName');

module.exports = [
  {
    bundle_id: 'default_frontend',
    webpack_config: {
      entry: './assets/src/core-app',
      output: {
        library: kolibriName,
        libraryExport: 'default',
        libraryTarget: 'window',
      },
    },
  },
  {
    bundle_id: 'user_agent',
    webpack_config: {
      entry: './assets/src/userAgentCheck.js',
    },
  },
];
