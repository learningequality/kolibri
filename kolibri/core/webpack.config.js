// This is only used during build time, so OK to reference files outside of Kolibri src.
const { kolibriName } = require('kolibri-tools/lib/kolibriName');

module.exports = {
  output: {
    library: kolibriName,
  },
};
