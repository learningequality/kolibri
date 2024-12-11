/**
 * A composable function containing logic related to restarting the device
 */

import { ref } from 'vue';
import heartbeat from 'kolibri/heartbeat';
import client from 'kolibri/client';
import clientFactory from 'kolibri/utils/baseClient';
import urls from 'kolibri/urls';
import plugin_data from 'kolibri-plugin-data';

// The refs are defined in the outer scope so they can be used as a shared store
const restarting = ref(false);
const canRestart = plugin_data.canRestart;

// Use this for checking if the device is restarting to avoid triggering
// the connection error detection.
const baseClient = clientFactory();

// POST to /api/device/devicerestart
export function restartDevice() {
  return client({
    url: urls['kolibri:core:devicerestart'](),
    method: 'POST',
  }).then(resp => Boolean(resp.data));
}

export function isDeviceRestarting() {
  return baseClient({
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
  heartbeat.stopPolling();
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
    return checkStatus(false).then(() => {
      heartbeat.startPolling();
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
