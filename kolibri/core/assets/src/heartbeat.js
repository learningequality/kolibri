import logger from 'kolibri.lib.logging';
import { currentUserId, connected, reconnectTime } from 'kolibri.coreVue.vuex.getters';
import store from 'kolibri.coreVue.vuex.store';
import { SignedOutDueToInactivitySnackbar, ConnectionSnackbars } from './constants';
import Lockr from 'lockr';
import urls from 'kolibri.urls';
import baseClient from './core-app/baseClient';
import mime from 'rest/interceptor/mime';
import interceptor from 'rest/interceptor';
import errorCodes from './disconnectionErrorCodes';

const logging = logger.getLogger(__filename);

const reconnectMultiplier = 2;

const maxReconnectTime = 600;

const minReconnectTime = 5;

export class HeartBeat {
  constructor(delay = 150000) {
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
    const reconnect = reconnectTime(store.state);
    this.timerId = setTimeout(this.beat, reconnect * 1000 || this.delay);
    return this.timerId;
  }
  checkSession() {
    const userId = currentUserId(store.state);
    let client = baseClient.wrap(mime, { mime: 'application/json' });
    if (!connected(store.state)) {
      store.dispatch('CORE_SET_CURRENT_SNACKBAR', ConnectionSnackbars.TRYING_TO_RECONNECT);
      client = client.wrap(
        interceptor({
          response: function(response) {
            if (!errorCodes.includes(response.status.code)) {
              // Not one of our 'disconnected' status codes, so we are connected again
              heartbeat.setConnected();
              return response;
            }
            store.dispatch('CORE_SET_CURRENT_SNACKBAR', ConnectionSnackbars.DISCONNECTED);
            const reconnect = reconnectTime(store.state);
            store.dispatch(
              'CORE_SET_RECONNECT_TIME',
              Math.min(reconnectMultiplier * reconnect, maxReconnectTime)
            );
            return response;
          },
        })
      );
    }
    return client({
      params: {
        active: this.active,
      },
      path: this.sessionUrl('current'),
    })
      .then(response => {
        if (response.entity.user_id !== userId) {
          this.signOutDueToInactivity();
        }
      })
      .catch(error => {
        logging.error('Session polling failed, with error: ', error);
        if (errorCodes.includes(error.status.code)) {
          this.monitorDisconnect();
        }
      });
  }
  monitorDisconnect() {
    if (connected(store.state)) {
      // We have not already registered that we have been disconnected
      store.dispatch('CORE_SET_CONNECTED', false);
      store.dispatch('CORE_SET_RECONNECT_TIME', minReconnectTime);
      store.dispatch('CORE_SET_CURRENT_SNACKBAR', ConnectionSnackbars.DISCONNECTED);
      this.wait();
    }
  }
  setConnected() {
    store.dispatch('CORE_SET_CONNECTED', true);
    store.dispatch('CORE_SET_RECONNECT_TIME', null);
    store.dispatch('CORE_SET_CURRENT_SNACKBAR', ConnectionSnackbars.SUCCESSFULLY_RECONNECTED);
    this.wait();
  }
  signOutDueToInactivity() {
    Lockr.set(SignedOutDueToInactivitySnackbar, true);
    window.location = window.origin;
  }
  sessionUrl(id) {
    return urls['session-detail'](id);
  }
  beat() {
    if (this.active) {
      this.setActivityListeners();
    } else {
      logging.debug('No user activity');
    }
    if (this.timerId) {
      clearTimeout(this.timerId);
    }
    return this.checkSession().finally(() => {
      this.setInactive();
      this.wait();
    });
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

const heartbeat = new HeartBeat();

export default heartbeat;
