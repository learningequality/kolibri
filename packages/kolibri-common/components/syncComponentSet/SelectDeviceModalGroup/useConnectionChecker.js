import { ref, onBeforeUnmount } from 'vue';
import { get, set, useMemoize, useTimeoutPoll } from '@vueuse/core';
import { updateConnectionStatus } from './api';
import { ConnectionStatus } from './constants';

function useMemoizeWithExpiry(asyncFunction, options = {}) {
  const getKey = args => (options.getKey ? options.getKey(...args) : args[0]);
  const memoizedFunc = useMemoize(asyncFunction, options);

  return async (...args) => {
    let result = null;
    try {
      result = await memoizedFunc(...args);
      setTimeout(() => memoizedFunc.cache.delete(getKey(args)), options.expiry || 10000);
    } catch (e) {
      // clear immediately
      memoizedFunc.cache.delete(getKey(args));
    }
    return result;
  };
}

/**
 *
 * @param {Ref<NetworkLocation[]>} devices
 * @param {Number} threshold - minimum `since_last_accessed` needed to perform check
 * @param {Number} interval - time between running individual checks
 * @param {Number} concurrency - the number of simultaneous connection checks
 * @return {{
 *  checkFailed: Ref<bool>, isChecking: Ref<bool>, hasChecked: Ref<bool>,
 *  doCheck: (function(id: string): Promise<NetworkLocation>),
 * }}
 */
export default function useConnectionChecker(
  devices,
  { threshold = 5, interval = 2, concurrency = 3 } = {},
) {
  const isChecking = ref(false);

  function doCheck(id) {
    const device = get(devices).find(d => d.id === id);
    if (!device) {
      return;
    }

    return updateConnectionStatus(device)
      .then(updatedDevice => {
        Object.assign(device, updatedDevice);
        return updatedDevice;
      })
      .catch(() => {
        device.available = false;
        device.connection_status = ConnectionStatus.Unknown;
        return device;
      });
  }

  const memoizedCheck = useMemoizeWithExpiry(doCheck, { expiry: threshold * 1000 });

  const { pause } = useTimeoutPoll(
    async () => {
      // Sort to the least recently accessed instances above the threshold
      const sortedDevices = get(devices)
        .filter(d => d.since_last_accessed >= threshold)
        .sort((deviceA, deviceB) => deviceB.since_last_accessed - deviceA.since_last_accessed);

      if (!sortedDevices.length) {
        return;
      }

      set(isChecking, true);

      try {
        // once any check has completed, resolve this timeout function to try again on the next
        // loop, and since the check is memoized, the unresolved shouldn't try again until the
        // previous call is resolved in case the next sorted devices slice returns the same device
        await Promise.any(sortedDevices.slice(0, concurrency).map(d => memoizedCheck(d.id)));
      } catch (e) {
        // We simply ignore these errors to try again on the next loop
      }
      set(isChecking, false);
    },
    interval * 1000,
    { immediate: true },
  );

  // Stop polling
  onBeforeUnmount(() => {
    pause();
  });

  return {
    isChecking,
    doCheck,
  };
}
