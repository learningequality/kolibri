const logging = require('kolibri.lib.logging').getLogger(__filename);

class HeartBeat {
  constructor(kolibri, delay = 60000) {
    if (!kolibri) {
      throw new ReferenceError('A kolibri instance must be passed into the constructor');
    }
    this.kolibri = kolibri;
    if (typeof delay !== 'number') {
      throw new ReferenceError('The delay must be a number in milliseconds');
    }
    this.delay = delay;
    // Do this to have a consistent callback that has 'this' properly bound
    // but can be repeatedly referenced to add and remove listeners.
    this.setActive = this.setActive.bind(this);
    this.beat = this.beat.bind(this);
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
      document.addEventListener(event, this.setActive, true);
    });
  }
  clearActivityListeners() {
    this.events.forEach((event) => {
      document.removeEventListener(event, this.setActive, true);
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
    this.timerId = setTimeout(this.beat, this.delay);
    return this.timerId;
  }
  get events() {
    return [
      'mousemove',
      'mousedown',
      'keypress',
      'DOMMouseScroll',
      'mousewheel',
      'touchmove',
      'MSPointerMove',
    ];
  }
}

module.exports = HeartBeat;
