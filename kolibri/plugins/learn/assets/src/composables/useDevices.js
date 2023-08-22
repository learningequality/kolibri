/**
 * A composable function containing logic related to channels
 */

import { computed, getCurrentInstance, ref } from 'kolibri.lib.vueCompositionApi';
import { NetworkLocationResource, RemoteChannelResource } from 'kolibri.resources';
import { get, set } from '@vueuse/core';
import useMinimumKolibriVersion from 'kolibri.coreVue.composables.useMinimumKolibriVersion';
import useUser from 'kolibri.coreVue.composables.useUser';
import plugin_data from 'plugin_data';
import { KolibriStudioId } from '../constants';
import { learnStrings } from '../views/commonLearnStrings';

/**
 * The ref is defined in the outer scope so it can be used as a shared store
 * @type {Ref<NetworkLocation|null>}
 */
const currentDevice = ref(null);

const { kolibriLibrary$ } = learnStrings;

const KolibriStudioDeviceData = {
  ...plugin_data.studioDevice,
  id: KolibriStudioId,
  get device_name() {
    return kolibriLibrary$();
  },
};

const { isMinimumKolibriVersion } = useMinimumKolibriVersion(0, 16, 0);

const { isLearnerOnlyImport, canManageContent } = useUser();

function canAccessStudio() {
  return !get(isLearnerOnlyImport) && get(canManageContent);
}

function fetchDevices() {
  return Promise.all([
    canAccessStudio() ? RemoteChannelResource.getKolibriStudioStatus() : Promise.resolve(null),
    NetworkLocationResource.list(),
  ]).then(([studioResponse, devices]) => {
    if (canAccessStudio()) {
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
    }
    return devices;
  });
}

export function setCurrentDevice(id) {
  if (id === KolibriStudioId) {
    if (!canAccessStudio()) {
      return Promise.reject('Cannot access Kolibri Studio');
    }
    set(currentDevice, KolibriStudioDeviceData);
    return Promise.resolve(KolibriStudioDeviceData);
  }
  return NetworkLocationResource.fetchModel({ id }).then(device => {
    set(currentDevice, device);
    return device;
  });
}

/**
 * @param {string|null} routingDeviceId
 * @param {function(NetworkLocation):*} callback
 * @return {ComputedRef<*|null>}
 */
function computedDevice(routingDeviceId, callback) {
  return computed(() => {
    const device = get(currentDevice);
    if (device && device.instance_id === get(routingDeviceId)) {
      return callback(device);
    }
    return undefined;
  });
}

export default function useDevices(store) {
  store = store || getCurrentInstance().proxy.$store;
  const route = computed(() => store && store.state.route);
  const routingDeviceId = computed(() => {
    const params = get(route) && get(route).params;
    return params && params.deviceId;
  });

  const instanceId = computedDevice(routingDeviceId, device => device.instance_id);
  const baseurl = computedDevice(routingDeviceId, device => device.base_url);
  const deviceName = computedDevice(routingDeviceId, device => device.device_name);

  return {
    fetchDevices,
    setCurrentDevice,
    instanceId,
    baseurl,
    deviceName,
  };
}
