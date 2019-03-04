import { createTranslator } from 'kolibri.utils.i18n';

export const trs = createTranslator('DisconnectionSnackbars', {
  disconnected: 'Disconnected from server. Will try to reconnect in { remainingTime }',
  tryNow: 'Try now',
  tryingToReconnect: 'Trying to reconnect…',
  successfullyReconnected: 'Successfully reconnected!',
});

export function createTryingToReconnectSnackbar(store) {
  store.commit('CORE_CREATE_SNACKBAR', {
    text: trs.$tr('tryingToReconnect'),
    backdrop: true,
    autoDismiss: false,
  });
}

let dynamicReconnectTime = 0;
let timer = null;

export function createDisconnectedSnackbar(store, beatCallback) {
  // clear timers
  clearTimer();
  // set proper time
  setDynamicReconnectTime(store.state.core.connection.reconnectTime);
  // create snackbar
  store.commit('CORE_CREATE_SNACKBAR', {
    text: generateDisconnectedSnackbarText(),
    actionText: trs.$tr('tryNow'),
    actionCallback: beatCallback,
    backdrop: true,
    forceReuse: true,
    autoDismiss: false,
  });
  // start timeout
  timer = setInterval(() => {
    setDynamicReconnectTime(dynamicReconnectTime - 1);
    store.commit('CORE_SET_SNACKBAR_TEXT', generateDisconnectedSnackbarText());
  }, 1000);
}

function setDynamicReconnectTime(time) {
  dynamicReconnectTime = Math.max(time, 0);
}

function generateDisconnectedSnackbarText() {
  const remainingTime = new Date(1000 * dynamicReconnectTime).toISOString().substr(14, 5);
  return trs.$tr('disconnected', { remainingTime });
}

function clearTimer() {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
}

export function createReconnectedSnackbar(store) {
  clearTimer();
  store.dispatch('createSnackbar', trs.$tr('successfullyReconnected'));
}
