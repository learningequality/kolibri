import logger from 'kolibri.lib.logging';

const logging = logger.getLogger(__filename);

export default class HeartBeat {
  constructor(kolibri, delay = 150000) {
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
  }
  start() {
    logging.debug('Starting heartbeat');
    this.setActivityListeners();
    // No need to start it straight away, can wait.
    this.beat();
  }
  setActivityListeners() {
    this.events.forEach(event => {
      document.addEventListener(event, this.setActive, true);
    });
  }
  clearActivityListeners() {
    this.events.forEach(event => {
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
  wait() {
    this.timerId = setTimeout(this.beat, this.delay);
    return this.timerId;
  }
  beat() {
    const sessionModel = this.kolibri.resources.SessionResource.getModel('current');
    const userId = sessionModel.attributes.user_id;
    if (this.active) {
      this.setActivityListeners();
    } else {
      logging.debug('No user activity');
    }
    this.kolibri.resources.SessionResource
      .getModel('current')
      .fetch({ active: this.active }, true)
      .then(session => {
        if (session.user_id !== userId) {
          window.location.reload();
        }
      })
      .catch(error => {
        logging.error('Heartbeat server polling failed, with error: ', error);
      });
    this.setInactive();

    return this.wait();
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
