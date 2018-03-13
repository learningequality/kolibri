// This is only used during build time, so OK to reference files outside of Kolibri src.
var kolibriName = require('../../frontend_build/src/kolibriName');

module.exports = {
  output: {
    library: kolibriName,
  },
};
