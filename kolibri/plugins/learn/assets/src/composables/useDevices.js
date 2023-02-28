/**
 * A composable function containing logic related to channels
 */

import { computed, getCurrentInstance, ref } from 'kolibri.lib.vueCompositionApi';
import { NetworkLocationResource } from 'kolibri.resources';
import { get, set } from '@vueuse/core';

// The refs are defined in the outer scope so they can be used as a shared store
const currentDevice = ref(null);

function fetchDevices() {
  return NetworkLocationResource.list().then(devices => {
    return devices;
  });
}

export function setCurrentDevice(id) {
  return NetworkLocationResource.fetchModel({ id }).then(device => {
    set(currentDevice, device);
    return device;
  });
}

export default function useDevices(store) {
  store = store || getCurrentInstance().proxy.$store;
  const route = computed(() => store && store.state.route);
  const baseurl = computed(() => {
    const params = get(route) && get(route).params;
    const deviceId = params && params.deviceId;
    const device = get(currentDevice);
    if (device && device.id === deviceId) {
      return device.base_url;
    }
    return;
  });

  return {
    fetchDevices,
    setCurrentDevice,
    baseurl,
  };
}
