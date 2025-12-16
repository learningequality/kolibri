/**
 * A composable function containing logic related to pinned devices
 */

import { get, set } from '@vueuse/core';
import { computed, ref } from 'vue';
import PinnedDeviceResource from 'kolibri-common/apiResources/PinnedDeviceResource';
import { crossComponentTranslator } from 'kolibri/utils/i18n';
import useSnackbar from 'kolibri/composables/useSnackbar';
import { KolibriStudioId } from '../constants';
import LibraryItem from '../views/ExploreLibrariesPage/LibraryItem';

const PinStrings = crossComponentTranslator(LibraryItem);

export default function usePinnedDevices(networkDevicesWithChannels) {
  const userPinsMap = ref({});
  const { createSnackbar } = useSnackbar();

  const devicesWithChannels = computed(() => {
    return networkDevicesWithChannels ? get(networkDevicesWithChannels) || [] : [];
  });

  function fetchPinsForUser() {
    return PinnedDeviceResource.fetchCollection({ force: true }).then(pins => {
      const updatedPins = {};
      for (const pin of pins) {
        updatedPins[pin.instance_id] = pin;
      }
      set(userPinsMap, updatedPins);
    });
  }

  function createPinForUser(instance_id) {
    set(userPinsMap, {
      ...get(userPinsMap),
      [instance_id]: { instance_id },
    });
    createSnackbar(PinStrings.$tr('pinnedTo'));
    return PinnedDeviceResource.create({ instance_id }).then(pin => {
      set(userPinsMap, {
        ...get(userPinsMap),
        [pin.instance_id]: pin,
      });
    });
  }

  function deletePinForUser(instance_id) {
    const map = get(userPinsMap);
    const id = map[instance_id].id;
    const newMap = { ...map };
    delete newMap[instance_id];
    set(userPinsMap, newMap);
    createSnackbar(PinStrings.$tr('pinRemoved'));
    return PinnedDeviceResource.deleteModel({ id });
  }

  function _isPinnedDevice(device) {
    return get(userPinsMap)[device.instance_id] || device.instance_id === KolibriStudioId;
  }

  const pinnedDevices = computed(() => {
    return get(devicesWithChannels).filter(_isPinnedDevice);
  });
  const pinnedDevicesExist = computed(() => {
    return get(pinnedDevices).length > 0;
  });
  const unpinnedDevices = computed(() => {
    return get(devicesWithChannels).filter(d => !_isPinnedDevice(d));
  });
  const unpinnedDevicesExist = computed(() => {
    return get(unpinnedDevices).length > 0;
  });

  function handlePinToggle(instance_id) {
    if (get(userPinsMap)[instance_id]) {
      return deletePinForUser(instance_id);
    }
    return createPinForUser(instance_id);
  }

  return {
    handlePinToggle,
    fetchPinsForUser,
    userPinsMap,
    pinnedDevices,
    pinnedDevicesExist,
    unpinnedDevices,
    unpinnedDevicesExist,
  };
}
