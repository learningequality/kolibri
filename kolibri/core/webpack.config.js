// This is only used during build time, so OK to reference files outside of Kolibri src.
const { kolibriName } = require('kolibri-tools/lib/kolibriName');

module.exports = [
  {
    unique_slug: 'default_frontend',
    entry: './assets/src/core-app',
    output: {
      library: kolibriName,
    },
  },
  {
    unique_slug: 'user_agent',
    entry: './assets/src/userAgentCheck.js',
  },
];
