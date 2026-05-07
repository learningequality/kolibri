import { watch } from 'vue';
import useAuthFlow from './useAuthFlow';

/**
 * @typedef {function} FacilityChangeCallback
 * @param {string|null} newFacilityId
 * @param {string|null} oldFacilityId
 * @return {void}
 */
/**
 * @typedef {function} FacilityConfigChangeCallback
 * @param {object|null} newFacilityConfig
 * @param {object|null} oldFacilityConfig
 * @return {void}
 */

/**
 * @typedef {object} UseAuthWatcherReturn
 * @property {function(FacilityChangeCallback): void} watchForFacilityChange
 * @property {function(FacilityConfigChangeCallback): void} watchForFacilityConfigChange
 */

/**
 * @param {FacilityChangeCallback} callback
 */
function watchForFacilityChange(callback) {
  const { facilityId } = useAuthFlow();

  watch(facilityId, (newFacilityId, oldFacilityId) => {
    callback(newFacilityId, oldFacilityId);
  });
}

/**
 * Fires the callback when the configuration itself has changed, not when the facility ID changes
 * @param {FacilityConfigChangeCallback} callback
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
 * @return {UseAuthWatcherReturn}
 */
export default function useAuthWatcher() {
  return {
    watchForFacilityChange,
    watchForFacilityConfigChange,
  };
}
