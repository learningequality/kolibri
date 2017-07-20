const logging = require('kolibri.lib.logging').getLogger(__filename);

// The currently known difference between server time and local clock time.
let diff = 0;

function setServerTime(time) {
  let clientTime = new Date();
  if (window.performance && window.performance.timing) {
    clientTime = window.performance.timing.requestStart;
  }
  diff = new Date(time) - clientTime;
  logging.debug(`Server time difference set to ${diff}`);
}

function now() {
  return new Date(new Date().getTime() + diff);
}

module.exports = {
  now,
  setServerTime,
};
