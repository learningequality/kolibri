const logging = require('kolibri.lib.logging').getLogger(__filename);

// The currently known difference between server time and local clock time.
let diff = 0;

function setServerTime(time) {
  diff = new Date(time) - new Date();
  logging.debug(`Server time difference set to ${diff}`);
}

function now() {
  return new Date(new Date().getTime() + diff);
}

module.exports = {
  now,
  setServerTime,
};
