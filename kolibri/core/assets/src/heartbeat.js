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
    // If we are currently engaged in exponential backoff in trying to reconnect to the server
    // use the current reconnect time preferentially instead of the standard delay.
    // The reconnect time is stored in seconds, so multiply by 1000 to give the milliseconds.
    this.timerId = setTimeout(this.beat, reconnect * 1000 || this.delay);
    return this.timerId;
  }
  /*
   * Method to check the current session endpoint, and record whether the user was active
   * in the last interval. Used both for keeping the session alive at regular intervals
   * and also for checking whether connection has been reestablished when it has previously
   * been lost.
   * @return {Promise} promise that resolves when the endpoint check is complete.
   */
  checkSession() {
    // Record the current user id to check if a different one is returned by the server.
    const userId = currentUserId(store.state);
    // Don't use the regular client, to avoid circular imports, and to use different custom
    // interceptors on the request specific to the behaviour here.
    let client = baseClient.wrap(mime, { mime: 'application/json' });
    if (!connected(store.state)) {
      // If not currently connected to the server, flag that we are currently trying to reconnect.
      store.dispatch('CORE_SET_CURRENT_SNACKBAR', ConnectionSnackbars.TRYING_TO_RECONNECT);
      client = client.wrap(
        interceptor({
          // Define an interceptor to monitor the response that gets returned.
          response: function(response) {
            // If the response does not have one of the disconnect error codes
            // then we have reconnected.
            if (!errorCodes.includes(response.status.code)) {
              // Not one of our 'disconnected' status codes, so we are connected again
              // Set connected and return the response here to prevent any further processing.
              heartbeat.setConnected();
              return response;
            }
            // If we have got here, then the error code meant that the server is still not reachable
            // set the snackbar to disconnected.
            store.dispatch('CORE_SET_CURRENT_SNACKBAR', ConnectionSnackbars.DISCONNECTED);
            // See what the previous reconnect interval was.
            const reconnect = reconnectTime(store.state);
            // Set a new reconnect interval.
            store.dispatch(
              'CORE_SET_RECONNECT_TIME',
              // Multiply the previous interval by our multiplier, but max out at a high interval.
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
        // Check the user id in the response
        if (response.entity.user_id !== userId) {
          // If it is different, then our user has been signed out.
          this.signOutDueToInactivity();
        }
      })
      .catch(error => {
        // An error occurred.
        logging.error('Session polling failed, with error: ', error);
        if (errorCodes.includes(error.status.code)) {
          // We had an error that indicates that we are disconnected, so start to monitoring
          // the disconnection.
          this.monitorDisconnect();
        }
      });
  }
  /*
   * Method to begin monitoring the disconnected state from the server.
   * This method can be called repeatedly as it will only initiate anything
   * if the vuex state does not already indicate disconnection.
   */
  monitorDisconnect() {
    if (connected(store.state)) {
      // We have not already registered that we have been disconnected
      store.dispatch('CORE_SET_CONNECTED', false);
      store.dispatch('CORE_SET_RECONNECT_TIME', minReconnectTime);
      store.dispatch('CORE_SET_CURRENT_SNACKBAR', ConnectionSnackbars.DISCONNECTED);
      this.wait();
    }
  }
  /*
   * Method to reset the vuex state to the connected state and restart server polling
   * on the regular heartbeat delay.
   */
  setConnected() {
    store.dispatch('CORE_SET_CONNECTED', true);
    store.dispatch('CORE_SET_RECONNECT_TIME', null);
    store.dispatch('CORE_SET_CURRENT_SNACKBAR', ConnectionSnackbars.SUCCESSFULLY_RECONNECTED);
    this.wait();
  }
  /*
   * Method to signout when automatic signout has been detected.
   */
  signOutDueToInactivity() {
    // Store that this sign out was for inactivity in local storage.
    Lockr.set(SignedOutDueToInactivitySnackbar, true);
    // Just navigate to the root URL and let the server sort out where
    // we should be.
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
