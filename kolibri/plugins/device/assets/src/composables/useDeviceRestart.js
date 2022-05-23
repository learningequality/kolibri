/**
 * A composable function containing logic related to restarting the device
 */

import { ref } from 'kolibri.lib.vueCompositionApi';
import client from 'kolibri.client';
import urls from 'kolibri.urls';
import plugin_data from 'plugin_data';

// The refs are defined in the outer scope so they can be used as a shared store
const restarting = ref(false);
const canRestart = plugin_data.canRestart;

// POST to /api/device/devicerestart
export function restartDevice() {
  return client({
    url: urls['kolibri:core:devicerestart'](),
    method: 'POST',
  }).then(resp => Boolean(resp.data));
}

export function isDeviceRestarting() {
  return client({
    url: urls['kolibri:core:devicerestart'](),
  })
    .then(resp => Boolean(resp.data))
    .catch(() => true);
}

function restart() {
  if (!canRestart) {
    return Promise.reject('Device restart is not supported with current server configuration');
  }
  restarting.value = true;
  let statusPromise = restartDevice();
  const checkStatus = expectedStatus => {
    return statusPromise.then(status => {
      if (status !== expectedStatus) {
        statusPromise = new Promise(resolve => {
          setTimeout(() => {
            isDeviceRestarting().then(resolve);
          }, 500);
        });
        return checkStatus(expectedStatus);
      }
    });
  };
  // First wait for the device to be restarting
  return checkStatus(true).then(() => {
    // Then wait for it to have finished restarting
    checkStatus(false).then(() => {
      restarting.value = false;
    });
  });
}

export default function useDeviceRestart() {
  return {
    restarting,
    restart,
    canRestart,
  };
}
