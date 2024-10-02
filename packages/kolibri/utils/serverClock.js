// The currently known difference between server time and local clock time.
let diff = 0;

function setServerTime(serverNow, clientNow) {
  // Set the offset between the server now and the client now
  // so that we can consistently offset client generated
  // date objects to match the server.
  diff = new Date(serverNow) - clientNow;
}

function now() {
  return new Date(new Date().getTime() + diff);
}

export { now, setServerTime };
