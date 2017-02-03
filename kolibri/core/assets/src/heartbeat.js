const logging = require('kolibri.lib.logging').getLogger(__filename);

class HeartBeat {
  constructor(kolibri) {
    this.kolibri = kolibri;
    // Do this to have a consistent callback that has 'this' properly bound
    // but can be repeatedly referenced to add and remove listeners.
    this.setActiveCallback = this.setActive.bind(this);
    this.setInactive();
    this.start();
  }
  start() {
    logging.debug('Starting heartbeat');
    this.setActivityListeners();
    this.beat();
  }
  setActivityListeners() {
    this.events.forEach((event) => {
      document.addEventListener(event, this.setActiveCallback, true);
    });
  }
  clearActivityListeners() {
    this.events.forEach((event) => {
      document.removeEventListener(event, this.setActiveCallback, true);
    });
  }
  setActive() {
    this.active = true;
    this.clearActivityListeners();
  }
  setInactive() {
    this.active = false;
  }
  beat() {
    if (this.active) {
      logging.debug('There was activity, polling session endpoint!');
      this.kolibri.resources.SessionResource.getModel('current').fetch({}, true).catch((error) => {
        logging.error('Periodic server polling failed, with error: ', error);
      });
      this.setActivityListeners();
    }
    this.setInactive();
    setTimeout(this.beat.bind(this), 60000);
  }
  get events() {
    return [
      "mousemove",
      "mousedown",
      "keypress",
      "DOMMouseScroll",
      "mousewheel",
      "touchmove",
      "MSPointerMove",
    ];
  }
}

module.exports = HeartBeat;
