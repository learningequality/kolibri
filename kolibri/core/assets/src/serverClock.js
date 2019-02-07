// The currently known difference between server time and local clock time.
let diff = 0;

function setServerTime(time) {
  let clientTime = new Date();
  if (window.performance && window.performance.timing) {
    clientTime = window.performance.timing.requestStart;
  }
  diff = new Date(time) - clientTime;
}

function now() {
  return new Date(new Date().getTime() + diff);
}

export { now, setServerTime };
