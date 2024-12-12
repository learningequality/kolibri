/**
 * A composable function containing logic related to channels
 */

import { computed, getCurrentInstance, ref, onBeforeUnmount, watch } from 'vue';
import { NetworkLocationResource } from 'kolibri-common/apiResources/NetworkLocationResource';
import RemoteChannelResource from 'kolibri-common/apiResources/RemoteChannelResource';
import { get, set, useTimeoutPoll } from '@vueuse/core';
import useMinimumKolibriVersion from 'kolibri/composables/useMinimumKolibriVersion';
import useUser from 'kolibri/composables/useUser';
import { localeCompare } from 'kolibri/utils/i18n';
import useChannels from 'kolibri-common/composables/useChannels';
import plugin_data from 'kolibri-plugin-data';
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

const { isLearnerOnlyImport, canManageContent, isUserLoggedIn } = useUser();

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

export const StudioNotAllowedError = 'Cannot access Kolibri Studio';

export function setCurrentDevice(id) {
  if (id === KolibriStudioId) {
    if (!canAccessStudio()) {
      return Promise.reject(StudioNotAllowedError);
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

export function currentDeviceData(store) {
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
    instanceId,
    baseurl,
    deviceName,
  };
}

export default function useDevices(store) {
  const { fetchChannels } = useChannels();
  const networkDevices = ref({});
  const isLoading = ref(false);
  const { instanceId, baseurl, deviceName } = currentDeviceData(store);

  const deviceChannelsMap = ref({});
  const isLoadingChannels = ref(true);

  function _updateDeviceChannels(device, channels) {
    set(deviceChannelsMap, {
      ...get(deviceChannelsMap),
      [device.instance_id]: channels,
    });
  }

  function loadDeviceChannels() {
    const promises = [];
    // Clear out the device channels map when data refreshes
    // to remove stale channel fetches.
    const newDeviceChannelsMap = {};
    for (const currentDevice of Object.values(networkDevices.value)) {
      if (!get(deviceChannelsMap)[currentDevice.instance_id]) {
        const baseurl = currentDevice.base_url;
        const promise = fetchChannels({ baseurl })
          .then(channels => {
            _updateDeviceChannels(currentDevice, channels);
            isLoadingChannels.value = false;
          })
          .catch(() => {
            // If we fail to fetch channels, set the channels to an empty array
            // to avoid repeatedly polling devices that are returning an error
            // code.
            _updateDeviceChannels(currentDevice, []);
          });
        promises.push(promise);
      } else {
        newDeviceChannelsMap[currentDevice.instance_id] =
          get(deviceChannelsMap)[currentDevice.instance_id];
      }
    }
    set(deviceChannelsMap, newDeviceChannelsMap);
    Promise.all(promises).then(() => {
      // In case we don't successfully fetch any channels, don't do a perpetual loading state.
      isLoadingChannels.value = false;
    });
  }

  async function setNetworkDevices() {
    isLoading.value = true;
    const newNetworkDevices = {};
    const devices = await fetchDevices();
    for (const device of devices) {
      if (device['available']) {
        newNetworkDevices[device.instance_id] = device;
      }
    }
    networkDevices.value = newNetworkDevices;
    isLoading.value = false;
  }

  // Start polling
  if (get(isUserLoggedIn)) {
    const fetch = useTimeoutPoll(setNetworkDevices, 5000, { immediate: true });
    // Stop polling
    onBeforeUnmount(() => {
      fetch.pause();
    });
  }

  function keepDeviceChannelsUpdated() {
    if (get(isUserLoggedIn)) {
      loadDeviceChannels();
      watch(networkDevices, loadDeviceChannels);
    }
  }

  const networkDevicesWithChannels = computed(() => {
    return Object.values(get(networkDevices))
      .filter(device => get(deviceChannelsMap)[device.instance_id]?.length > 0)
      .sort((a, b) => {
        if (a.instance_id === KolibriStudioId) {
          return -1;
        }
        if (b.instance_id === KolibriStudioId) {
          return 1;
        }
        return localeCompare(a.device_name, b.device_name);
      });
  });

  return {
    fetchDevices,
    deviceChannelsMap,
    keepDeviceChannelsUpdated,
    isLoadingChannels,
    isLoading,
    setCurrentDevice,
    instanceId,
    baseurl,
    deviceName,
    networkDevices,
    networkDevicesWithChannels,
  };
}
