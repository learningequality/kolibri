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
  const deviceId = computed(() => {
    const params = get(route) && get(route).params;
    return params && params.deviceId;
  });
  const baseurl = computed(() => {
    const device = get(currentDevice);
    if (device && device.id === get(deviceId)) {
      return device.base_url;
    }
    return;
  });
  const deviceName = computed(() => {
    const device = get(currentDevice);
    if (device && device.id === get(deviceId)) {
      return device.device_name;
    }
    return;
  });

  return {
    fetchDevices,
    setCurrentDevice,
    baseurl,
    deviceName,
  };
}
