import logger from 'kolibri.lib.logging';
import store from 'kolibri.coreVue.vuex.store';
import { redirectBrowser } from 'kolibri.utils.browser';
import Lockr from 'lockr';
import urls from 'kolibri.urls';
import mime from 'rest/interceptor/mime';
import interceptor from 'rest/interceptor';
import baseClient from './core-app/baseClient';
import { SIGNED_OUT_DUE_TO_INACTIVITY } from './constants';
import errorCodes from './disconnectionErrorCodes';
import {
  createTryingToReconnectSnackbar,
  createDisconnectedSnackbar,
  createReconnectedSnackbar,
} from './disconnection';

const logging = logger.getLogger(__filename);

// Multiplier to use when doing exponential backoff
const RECONNECT_MULTIPLIER = 2;

// The longest time to wait to reconnect during exponential
// backoff when server is disconnected
const MAX_RECONNECT_TIME = 600;

// How long to wait after a timeout is recorded in requests
// before attempting to reconnect, this is intentionally
// much larger than the backoff in case of disconnect events
// to prevent hammering the Kolibri server when it is under load
// (which is the most likely cause of a timeout)
const TIMEOUT_RECONNECT_TIME = 60;

// How long to wait after a disconnection is detected for the first
// check - this is then used as the basis for exponential backoff.
const MIN_RECONNECT_TIME = 5;

// The usual time to wait between session check pings, this is set
// at 4 minutes, as this will maintain activity in the user activity
// log in the Kolibri server, if the user has been active in this time,
// as this is windowed at activity being logged in the last 5 minutes.
// In the case of the page being backgrounded, we double this, which is
// sufficient to maintain the current Kolibri session, but will start a
// new user session log when activity is detected again.
const ACTIVE_DELAY = 240;

export class HeartBeat {
  constructor() {
    // Do this to have a consistent callback that has 'this' properly bound
    // but can be repeatedly referenced to add and remove listeners.
    this.setUserActive = this.setUserActive.bind(this);
    this.pollSessionEndPoint = this.pollSessionEndPoint.bind(this);
    this.setUserInactive();
    this._enabled = false;
  }
  startPolling() {
    if (!this._enabled) {
      logging.debug('Starting heartbeat');
      this._enabled = true;
      this._setActivityListeners();
      // Do an immediate check to populate session info
      return this.pollSessionEndPoint();
    }
    // Either return the promise for the current session endpoint
    // poll, or return an immediately resolved promise, if that
    // has already completed and been resolved.
    return this._activePromise || Promise.resolve();
  }
  stopPolling() {
    logging.debug('Stopping heartbeat');
    this._enabled = false;
    this._clearActivityListeners();
    if (this._timerId) {
      clearTimeout(this._timerId);
    }
  }
  _setActivityListeners() {
    this._userActivityEvents.forEach(event => {
      document.addEventListener(event, this.setUserActive, { capture: true, passive: true });
    });
  }
  _clearActivityListeners() {
    this._userActivityEvents.forEach(event => {
      document.removeEventListener(event, this.setUserActive, { capture: true, passive: true });
    });
  }
  setUserActive() {
    if (this._active !== true) {
      this._active = true;
      this._clearActivityListeners();
    }
  }
  setUserInactive() {
    this._active = false;
  }
  get _delay() {
    const { reconnectTime } = store.getters;
    if (!store.getters.connected && reconnectTime) {
      // If we are currently engaged in exponential backoff in trying to reconnect to the server
      // use the current reconnect time preferentially instead of the standard delay.
      // The reconnect time is stored in seconds, so multiply by 1000 to give the milliseconds.
      return reconnectTime;
    }
    // If page is not visible, don't poll as frequently, as user activity is unlikely.
    return store.state.pageVisible ? ACTIVE_DELAY : ACTIVE_DELAY * 2;
  }

  _wait() {
    // Convert delay to milliseconds for use in setTimeout
    this._timerId = setTimeout(this.pollSessionEndPoint, this._delay * 1000);
    return this._timerId;
  }
  /*
   * Method to check the current session endpoint, and record whether the user was active
   * in the last interval. Used both for keeping the session alive at regular intervals
   * and also for checking whether connection has been reestablished when it has previously
   * been lost.
   * @return {Promise} promise that resolves when the endpoint check is complete.
   */
  _checkSession() {
    const { currentUserId, connected, reconnectTime } = store.getters;
    // Record the current user id to check if a different one is returned by the server.
    // Don't use the regular client, to avoid circular imports, and to use different custom
    // interceptors on the request specific to the behaviour here.
    let client = baseClient.wrap(mime, { mime: 'application/json' });
    if (!connected) {
      // If not currently connected to the server, flag that we are currently trying to reconnect.
      createTryingToReconnectSnackbar(store);
      client = client.wrap(
        interceptor({
          // Define an interceptor to monitor the response that gets returned.
          response: function(response) {
            // If the response does not have one of the disconnect error codes
            // then we have reconnected.
            if (!errorCodes.includes(response.status.code)) {
              // Not one of our 'disconnected' status codes, so we are connected again
              // Set connected and return the response here to prevent any further processing.
              heartbeat._setConnected();
              return response;
            }
            // If we have got here, then the error code meant that the server is still not reachable
            // set the snackbar to disconnected.
            // See what the previous reconnect interval was.
            const reconnect = reconnectTime;
            // Set a new reconnect interval.
            store.commit(
              'CORE_SET_RECONNECT_TIME',
              // Multiply the previous interval by our multiplier, but max out at a high interval.
              Math.min(RECONNECT_MULTIPLIER * reconnect, MAX_RECONNECT_TIME)
            );
            createDisconnectedSnackbar(store, heartbeat.pollSessionEndPoint);
            return response;
          },
        })
      );
    }
    // Log the time at the start of the request for time diff setting.
    const pollStart = Date.now();
    return client({
      params: {
        // Only send active when both connected and activity has been registered.
        // Do this to prevent a user logging activity cascade on the server side.
        active: connected && this._active,
      },
      path: this._sessionUrl('current'),
    })
      .then(response => {
        // Log the time that the poll of the session endpoint ended.
        const pollEnd = Date.now();
        const session = response.entity;
        // If our session is already defined, check the user id in the response
        if (store.state.core.session.id && session.user_id !== currentUserId) {
          if (session.user_id === null) {
            // If it is different, and the user_id is now null then our user has been signed out.
            return this.signOutDueToInactivity();
          } else {
            // Otherwise someone has logged in as another user within the same browser session
            // Redirect them and let that page sort them out.
            redirectBrowser();
          }
        }
        store.dispatch('setSession', {
          session,
          // Calculate an approximation of the client 'now' that was simultaneous to the server
          // 'now' that was sent back with the request. We calculate this as the mean of the
          // start of the request and the end of the request, which assumes that the calculation
          // of the local_now on the server side happens at the midpoint of the request response
          // cycle. Evidently this is not completely accurate, but it is the best that we can do.
          // Further, this fails to account for relativity, as simultaneity depends on your specific
          // frame of reference. If the client is moving relative to the server at speeds
          // approaching the speed of light, this may produce some odd results,
          // but I think that was always true.
          clientNow: new Date((pollEnd + pollStart) / 2),
        });
      })
      .catch(error => {
        // An error occurred.
        logging.error('Session polling failed, with error: ', error);
        if (errorCodes.includes(error.status.code)) {
          // We had an error that indicates that we are disconnected, so start to monitor
          // the disconnection.
          this.monitorDisconnect(error.status.code);
        }
      });
  }
  /*
   * Method to begin monitoring the disconnected state from the server.
   * This method can be called repeatedly as it will only initiate anything
   * if the vuex state does not already indicate disconnection.
   */
  monitorDisconnect(code = 0) {
    if (store.getters.connected) {
      // We have not already registered that we have been disconnected
      store.commit('CORE_SET_CONNECTED', false);
      let reconnectionTime;
      if (store.state.pageVisible) {
        // If current page is not visible, back off completely
        // user can force reconnect with interface when they return
        reconnectionTime = MAX_RECONNECT_TIME;
      } else if (code === 0) {
        // Do special behaviour if the request could not be completed
        reconnectionTime = MIN_RECONNECT_TIME;
      } else {
        // Otherwise the issue is likely an overload of the Kolibri server,
        // back off quickly before trying to reconnect.
        reconnectionTime = TIMEOUT_RECONNECT_TIME;
      }
      store.commit('CORE_SET_RECONNECT_TIME', reconnectionTime);
      createDisconnectedSnackbar(store, this.pollSessionEndPoint);
      this._wait();
    }
  }
  /*
   * Method to reset the vuex state to the connected state and restart server polling
   * on the regular heartbeat delay.
   */
  _setConnected() {
    store.commit('CORE_SET_CONNECTED', true);
    store.commit('CORE_SET_RECONNECT_TIME', null);
    createReconnectedSnackbar(store);
    this._wait();
  }
  /*
   * Method to signout when automatic signout has been detected.
   */
  signOutDueToInactivity() {
    // Store that this sign out was for inactivity in local storage.
    Lockr.set(SIGNED_OUT_DUE_TO_INACTIVITY, true);
    // Redirect the user to let the server sort out where they should
    // be now
    redirectBrowser();
  }
  _sessionUrl(id) {
    return urls['kolibri:core:session-detail'](id);
  }
  /*
   * Method to reset activity listeners clear timeouts waiting to
   * check the session endpoint, and then check the session endpoint
   * catching any errors and then setting off a timeout for the next
   * session endpoint poll.
   */
  pollSessionEndPoint() {
    if (!this._activePromise) {
      if (this._active) {
        this._setActivityListeners();
      } else {
        logging.debug('No user activity');
      }
      if (this._timerId) {
        clearTimeout(this._timerId);
      }
      const final = () => {
        delete this._activePromise;
        if (this._enabled) {
          this.setUserInactive();
          this._wait();
        }
      };
      this._activePromise = this._checkSession().then(final, final);
    }
    return this._activePromise;
  }
  get _userActivityEvents() {
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
