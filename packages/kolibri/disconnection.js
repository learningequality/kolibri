import { createTranslator } from 'kolibri/utils/i18n';
import { get } from '@vueuse/core';
import useSnackbar from 'kolibri/composables/useSnackbar';
import useConnection from './useConnection';

export const trs = createTranslator('DisconnectionSnackbars', {
  disconnected: {
    message: 'Disconnected from server. Will try to reconnect in { remainingTime }',
    context:
      'Message that indicates when Kolibri is disconnected from a server. It also displays the time in countdown format that it will waiting until attempting to connect again.',
  },
  tryNow: {
    message: 'Try now',
    context:
      'Prompt indicating to the user that they should try again to reconnect Kolibri with the server.',
  },
  tryingToReconnect: {
    message: 'Trying to reconnect…',
    context:
      'Message which displays while Kolibri is trying to reconnect with the server following a disconnection.',
  },
  successfullyReconnected: {
    message: 'Successfully reconnected!',
    context: 'Message indicating that Kolibri has been able to connect with the server again.',
  },
});

export function createTryingToReconnectSnackbar() {
  const { createSnackbar } = useSnackbar();
  createSnackbar({
    text: trs.$tr('tryingToReconnect'),
    backdrop: true,
    autoDismiss: false,
  });
}

let dynamicReconnectTime = 0;
let timer = null;

export function createDisconnectedSnackbar(beatCallback) {
  // clear timers
  clearTimer();
  // set proper time
  const { reconnectTime } = useConnection();
  setDynamicReconnectTime(get(reconnectTime));
  // create snackbar
  const { createSnackbar, setSnackbarText } = useSnackbar();
  createSnackbar({
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
    setSnackbarText(generateDisconnectedSnackbarText());
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

export function createReconnectedSnackbar() {
  clearTimer();
  const { createSnackbar } = useSnackbar();
  createSnackbar(trs.$tr('successfullyReconnected'));
}
