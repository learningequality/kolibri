/**
 * A composable function containing logic related to channels
 */

import { computed, getCurrentInstance, reactive } from 'kolibri.lib.vueCompositionApi';
import { NetworkLocationResource } from 'kolibri.resources';
import { get, set } from '@vueuse/core';

// The refs are defined in the outer scope so they can be used as a shared store
const deviceMap = reactive({});

function fetchDevices(params) {
  return NetworkLocationResource.list(params).then(devices => {
    for (let device of devices) {
      set(deviceMap, device.id, device);
    }
    return devices;
  });
}

export function fetchDevice(id) {
  return NetworkLocationResource.fetchModel({ id }).then(device => {
    set(deviceMap, device.id, device);
    return device;
  });
}

export default function useDevices(store) {
  store = store || getCurrentInstance().proxy.$store;
  const route = computed(() => store && store.state.route);
  const baseurl = computed(() => {
    const params = get(route) && get(route).params;
    const deviceId = params && params.deviceId;
    const device = get(deviceMap)[deviceId];
    if (device) {
      return device.base_url;
    }
    return;
  });

  return {
    fetchDevices,
    fetchDevice,
    baseurl,
  };
}
