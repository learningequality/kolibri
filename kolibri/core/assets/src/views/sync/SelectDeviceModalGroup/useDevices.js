import { ref, reactive, computed, onBeforeUnmount, watch } from 'kolibri.lib.vueCompositionApi';
import { get, set, useMemoize, useTimeoutPoll } from '@vueuse/core';

import useMinimumKolibriVersion from 'kolibri.coreVue.composables.useMinimumKolibriVersion';
import { fetchDevices, channelIsAvailableAtDevice, facilityIsAvailableAtDevice } from './api';

/**
 * @param {{}} apiParams
 * @return {{
 *  devices: Ref<NetworkLocation[]>, hasFetched: Ref<bool>, isFetching: Ref<bool>,
 *  filterFailed: Ref<bool>, forceFetch: (function(): Promise<void>)
 * }}
 */
export default function useDevices(apiParams = {}) {
  const devices = ref([]);
  const isFetching = ref(false);
  const fetchFailed = ref(false);
  const hasFetched = ref(false);

  async function doFetch() {
    set(isFetching, true);
    set(fetchFailed, false);
    try {
      const _devices = await fetchDevices(apiParams);
      set(
        devices,
        _devices.map(d => reactive(d))
      );

      set(hasFetched, true);
      set(isFetching, false);
    } catch (e) {
      set(fetchFailed, true);
      set(isFetching, false);
    }
  }

  // Start polling
  const fetch = useTimeoutPoll(doFetch, 5000, { immediate: true });

  // Stop polling
  onBeforeUnmount(() => {
    fetch.pause();
  });

  return {
    devices,
    isFetching,
    fetchFailed,
    hasFetched,
    forceFetch: doFetch,
  };
}

/**
 *
 * @param {{}} apiParams
 * @param {function(NetworkLocation): Promise<bool>} filterFunction
 * @return {{
 *  devices: Ref<NetworkLocation[]>, hasFetched: Ref<bool>, isFetching: Ref<bool>,
 *  filterFailed: Ref<bool>, forceFetch: (function(): Promise<void>)
 * }}
 */
function useDevicesWithFilter(apiParams, filterFunction) {
  const isFiltering = ref(false);
  const filteringFailed = ref(false);
  const hasFiltered = ref(false);
  const availableIds = ref([]);
  const unavailableIds = ref([]);
  const { devices, isFetching, fetchFailed, hasFetched, forceFetch } = useDevices(apiParams);

  const getIsAvailable = useMemoize(filterFunction, { getKey: device => device.id });

  // await for changes in devices array
  watch(devices, async devices => {
    set(isFiltering, true);
    let failed = false;

    // Initiate 'is available' requests concurrently
    await Promise.all(
      get(devices).map(async device => {
        try {
          // result is memoized once successful
          const isAvailable = await getIsAvailable(device);

          // Put into refs to trigger reactive behavior in computed devices
          if (isAvailable) {
            if (get(availableIds).indexOf(device.id) < 0) {
              get(availableIds).push(device.id);
            }
          } else {
            if (get(unavailableIds).indexOf(device.id) < 0) {
              get(unavailableIds).push(device.id);
            }
          }
        } catch (e) {
          // clear cache to try again on next poll
          getIsAvailable.cache.delete(device.id);

          // If 404, don't mark as failed
          if (e.response.status !== 404) {
            failed = true;
          }
        }
      })
    );

    set(filteringFailed, failed);
    set(isFiltering, false);
    set(hasFiltered, true);
  });

  return {
    // use computed array that depends on availableIds/unavailableIds
    devices: computed(() => {
      return get(devices)
        .filter(d => get(unavailableIds).indexOf(d.id) < 0)
        .map(d => {
          // set unavailable if we haven't determined if it should be filtered out yet
          d.available = get(availableIds).indexOf(d.id) >= 0;
          return d;
        });
    }),
    isFetching: computed(() => get(isFiltering) || get(isFetching)),
    fetchFailed: computed(() => get(fetchFailed) || get(filteringFailed)),
    hasFetched: computed(() => get(hasFetched) && get(hasFiltered)),
    forceFetch,
  };
}

/**
 * Filters devices to those that also have the specified channel
 * @param channelId
 * @return {{
 *  devices: Ref<NetworkLocation[]>, hasFetched: Ref<bool>, isFetching: Ref<bool>,
 *  filterFailed: Ref<bool>, forceFetch: (function(): Promise<void>)
 * }}
 */
export function useDevicesWithChannel(channelId = '') {
  // If channelId is not provided, then we are at top-level import workflow and do not
  // disable any devices unless it is unavailable
  const filterDevices =
    channelId === '' ? () => Promise.resolve(true) : channelIsAvailableAtDevice.bind({}, channelId);

  return useDevicesWithFilter({}, filterDevices);
}

/**
 * Filters devices to those that also have the specified facility
 * @param facilityId
 * @return {{
 *  devices: Ref<NetworkLocation[]>, hasFetched: Ref<bool>, isFetching: Ref<bool>,
 *  filterFailed: Ref<bool>, forceFetch: (function(): Promise<void>)
 * }}
 */
export function useDevicesWithFacility({ facilityId = '', soud = false } = {}) {
  // If facilityId is not provided, then we are at the initial Facility Import workflow
  // disable any devices unless it is unavailable/offline
  const filterDevices =
    facilityId === ''
      ? () => Promise.resolve(true)
      : facilityIsAvailableAtDevice.bind({}, facilityId);

  return useDevicesWithFilter({ subset_of_users_device: soud }, filterDevices);
}

/**
 * Filters devices to those that are not SoUDs/LOD, since SoUD/LOD sync to full-facility devices
 * @return {{
 *  devices: Ref<NetworkLocation[]>, hasFetched: Ref<bool>, isFetching: Ref<bool>,
 *  filterFailed: Ref<bool>, forceFetch: (function(): Promise<void>)
 * }}
 */
export function useDevicesForLearnOnlyDevice() {
  const { isMinimumKolibriVersion } = useMinimumKolibriVersion(0, 15, 0);
  return useDevicesWithFilter({ subset_of_users_device: false }, async device => {
    return isMinimumKolibriVersion(device.kolibri_version);
  });
}
