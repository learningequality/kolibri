import { watch } from 'vue';
import useAuthFlow from './useAuthFlow';

/**
 * @callback FacilityChangeCallback
 * @param {string|null} newFacilityId - The newly selected facility ID, or null.
 * @param {string|null} oldFacilityId - The previously selected facility ID, or null.
 * @returns {void}
 */
/**
 * @callback FacilityConfigChangeCallback
 * @param {object|null} newFacilityConfig - The new facility configuration, or null.
 * @param {object|null} oldFacilityConfig - The previous facility configuration, or null.
 * @returns {void}
 */

/**
 * @typedef {object} UseAuthWatcherReturn
 * @property {(callback: FacilityChangeCallback) => void} watchForFacilityChange - Registers a
 * callback fired when the selected facility changes.
 * @property {(callback: FacilityConfigChangeCallback) => void} watchForFacilityConfigChange -
 * Registers a callback fired when the facility configuration changes.
 */

/**
 * Registers a callback fired when the selected facility ID changes.
 * @param {FacilityChangeCallback} callback - Invoked with the new and old facility IDs.
 */
function watchForFacilityChange(callback) {
  const { facilityId } = useAuthFlow();

  watch(facilityId, (newFacilityId, oldFacilityId) => {
    callback(newFacilityId, oldFacilityId);
  });
}

/**
 * Fires the callback when the configuration itself has changed, not when the facility ID changes
 * @param {FacilityConfigChangeCallback} callback - Invoked with the new and old facility configs.
 */
function watchForFacilityConfigChange(callback) {
  const { facilityConfig } = useAuthFlow();

  watch(facilityConfig, (newFacilityConfig, oldFacilityConfig) => {
    // if the ID has changed, that's a facility change, so we defer changes to watchers using that
    if (
      newFacilityConfig &&
      (!oldFacilityConfig || newFacilityConfig.id === oldFacilityConfig.id)
    ) {
      callback(newFacilityConfig, oldFacilityConfig);
    }
  });
}

/**
 * Common watcher patterns for this Kolibri plugin
 * @returns {UseAuthWatcherReturn} The facility and config change watcher registrars.
 */
export default function useAuthWatcher() {
  return {
    watchForFacilityChange,
    watchForFacilityConfigChange,
  };
}
