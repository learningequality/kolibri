import { Resource } from 'kolibri/apiResource';
import urls from 'kolibri/urls';

/**
 * @typedef {object} NetworkLocation
 * @property {string} id - stable identifier for the network location record
 * @property {string} instance_id - Kolibri instance UUID of the remote device
 * @property {string} device_name - human-readable name reported by the device
 * @property {string} nickname - user-supplied label for the device
 * @property {string} operating_system - OS name reported by the device
 * @property {string} application - application identifier (e.g. `kolibri`)
 * @property {string} kolibri_version - Kolibri version string reported by the device
 * @property {string} base_url - reachable base URL for the device
 * @property {string} connection_status - current connectivity state
 * @property {boolean} dynamic - true when discovered dynamically rather than statically configured
 * @property {boolean} available - true when the device is currently reachable
 * @property {boolean} subset_of_users_device - true when the remote device is a SoUD
 * @property {string|Date} added - timestamp the location was first recorded
 * @property {string|Date} last_accessed - timestamp of the last successful contact
 * @property {number} since_last_accessed - Seconds since `last_accessed`
 */

/**
 * Refresh the cached connection status for a network location.
 * @param {string} id - network location id
 * @returns {NetworkLocation} the updated network location record
 */
function updateConnectionStatus(id) {
  const url = urls['kolibri:core:networklocation_update_connection_status'](id);
  return this.client({ url, method: 'post' }).then(response => {
    return response.data;
  });
}

/**
 * Fetch the facilities advertised by a remote network location.
 * @param {string} id - network location id
 * @returns {{facilities: [{id: string}]}} the facilities listing from the remote device
 */
function fetchFacilities(id) {
  return this.client({
    url: urls['kolibri:core:networklocation_facilities_detail'](id),
  }).then(response => {
    return response.data;
  });
}

export const NetworkLocationResource = new Resource({
  name: 'networklocation',
  updateConnectionStatus,
  fetchFacilities,

  /**
   * @name fetchModel
   * @function
   * @returns {NetworkLocation}
   */

  /**
   * @name fetchCollection
   * @function
   * @returns {NetworkLocation[]}
   */
});

export const StaticNetworkLocationResource = new Resource({
  name: 'staticnetworklocation',
  updateConnectionStatus,
  fetchFacilities,

  /**
   * @name fetchModel
   * @function
   * @returns {NetworkLocation}
   */

  /**
   * @name fetchCollection
   * @function
   * @returns {NetworkLocation[]}
   */
});

export const DynamicNetworkLocationResource = new Resource({
  name: 'dynamicnetworklocation',
  updateConnectionStatus,
  fetchFacilities,

  /**
   * @name fetchModel
   * @function
   * @returns {NetworkLocation}
   */

  /**
   * @name fetchCollection
   * @function
   * @returns {NetworkLocation[]}
   */
});
