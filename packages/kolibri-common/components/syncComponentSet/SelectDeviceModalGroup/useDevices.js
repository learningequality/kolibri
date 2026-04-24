import logger from 'kolibri-logging';
import _get from 'lodash/get';
import isArray from 'lodash/isArray';
import { ref, reactive, computed, onBeforeUnmount, watch } from 'vue';
import { get, set, useMemoize, useTimeoutPoll } from '@vueuse/core';

import useMinimumKolibriVersion from 'kolibri/composables/useMinimumKolibriVersion';
import { fetchDevices, channelIsAvailableAtDevice, deviceHasMatchingFacility } from './api';

const logging = logger.getLogger(__filename);

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
        _devices.map(d => reactive(d)),
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

export function useDevicesWithFilter(apiParams, filterFunctionOrFunctions) {
  const isFiltering = ref(false);
  const filteringFailed = ref(false);
  const hasFiltered = ref(false);
  const availableIds = ref([]);
  const unavailableIds = ref([]);
  const { devices, isFetching, fetchFailed, hasFetched, forceFetch } = useDevices(apiParams);

  const filterFunctions = isArray(filterFunctionOrFunctions)
    ? filterFunctionOrFunctions
    : [filterFunctionOrFunctions];

  // await for changes in devices array
  watch(devices, async devices => {
    set(isFiltering, true);
    let failed = false;

    // Initiate 'is available' requests concurrently
    await Promise.all(
      get(devices).map(async device => {
        try {
          // result is memoized once successful
          let isAvailable = true;
          for (const filterFunction of filterFunctions) {
            if (filterFunction && !(await filterFunction(device))) {
              isAvailable = false;
              break;
            }
          }

          // Put into refs to trigger reactive behavior in computed devices
          if (isAvailable) {
            if (!get(availableIds).includes(device.id)) {
              get(availableIds).push(device.id);
            }
          } else {
            if (!get(unavailableIds).includes(device.id)) {
              get(unavailableIds).push(device.id);
            }
          }
        } catch (e) {
          logging.error(e);
          failed = true;
        }
      }),
    );

    set(filteringFailed, failed);
    set(isFiltering, false);
    set(hasFiltered, true);
  });

  return {
    // use computed array that depends on availableIds/unavailableIds
    devices: computed(() => {
      return get(devices)
        .filter(d => !get(unavailableIds).includes(d.id))
        .map(d => {
          // set unavailable if we haven't determined if it should be filtered out yet
          if (!get(availableIds).includes(d.id)) {
            return {
              ...d,
              available: false,
            };
          }
          return d;
        });
    }),
    isFetching: computed(() => get(isFiltering) || get(isFetching)),
    fetchFailed: computed(() => get(fetchFailed) || get(filteringFailed)),
    hasFetched: computed(() => get(hasFetched) && get(hasFiltered)),
    forceFetch,
  };
}

function useAsyncDeviceFilter(filterFunction) {
  const memoized = useMemoize(filterFunction, { getKey: device => device.id });

  return async function deviceFilter(device) {
    try {
      return await memoized(device);
    } catch (e) {
      // If not 404 clear cache to try again on next poll
      if (_get(e, 'response.status') !== 404) {
        memoized.cache.delete(device.id);
        throw e;
      }

      return false;
    }
  };
}

export function useDeviceFacilityFilter({
  id = null,
  learner_can_sign_up = null,
  on_my_own_setup = null,
}) {
  const filters = {};

  // If `id` is an empty string, we don't want to filter by that
  if (id) {
    filters.id = id;
  }

  if (learner_can_sign_up !== null) {
    filters.learner_can_sign_up = learner_can_sign_up;
  }

  if (on_my_own_setup !== null) {
    filters.on_my_own_setup = on_my_own_setup;
  }

  return useAsyncDeviceFilter(function deviceFacilityFilter(device) {
    return deviceHasMatchingFacility(device, filters);
  });
}

export function useDeviceChannelFilter({ id = null }) {
  if (!id) {
    return () => Promise.resolve(true);
  }

  return useAsyncDeviceFilter(function deviceChannelFilter(device) {
    return channelIsAvailableAtDevice(id, device);
  });
}

export function useDeviceMinimumVersionFilter(major, minor, patch) {
  const { isMinimumKolibriVersion } = useMinimumKolibriVersion(major, minor, patch);

  return async function deviceMinimumVersionFilter(device) {
    return isMinimumKolibriVersion(device.kolibri_version);
  };
}
