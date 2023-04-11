/**
 * A composable function containing logic related to channels
 */

import { computed, getCurrentInstance, ref } from 'kolibri.lib.vueCompositionApi';
import { NetworkLocationResource, RemoteChannelResource } from 'kolibri.resources';
import { get, set } from '@vueuse/core';
import useMinimumKolibriVersion from 'kolibri.coreVue.composables.useMinimumKolibriVersion';
import { KolibriStudioId } from '../constants';
import { learnStrings } from '../views/commonLearnStrings';
import plugin_data from 'plugin_data';

// The refs are defined in the outer scope so they can be used as a shared store
const currentDevice = ref(null);

const KolibriStudioDeviceData = {
  id: KolibriStudioId,
  instance_id: KolibriStudioId,
  base_url: plugin_data.studio_baseurl,
  get device_name() {
    return learnStrings.$tr('kolibriLibrary');
  },
};

const { isMinimumKolibriVersion } = useMinimumKolibriVersion(0, 16, 0);

function fetchDevices() {
  return Promise.all([
    RemoteChannelResource.getKolibriStudioStatus(),
    NetworkLocationResource.list(),
  ]).then(([studioResponse, devices]) => {
    const studio = studioResponse.data;
    devices = devices.filter(device => isMinimumKolibriVersion(device.kolibri_version));
    if (studio.available && isMinimumKolibriVersion(studio.kolibri_version || '0.15.0')) {
      return [
        {
          ...studio,
          ...KolibriStudioDeviceData,
        },
        ...devices,
      ];
    }
    return devices;
  });
}

export function setCurrentDevice(id) {
  if (id === KolibriStudioId) {
    set(currentDevice, KolibriStudioDeviceData);
    return Promise.resolve(KolibriStudioDeviceData);
  }
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
