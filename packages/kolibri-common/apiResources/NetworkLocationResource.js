import { Resource } from 'kolibri/apiResource';
import urls from 'kolibri/urls';

/**
 * @typedef {Object} NetworkLocation
 * @property {string} id
 * @property {string} instance_id
 * @property {string} device_name
 * @property {string} nickname
 * @property {string} operating_system
 * @property {string} application
 * @property {string} kolibri_version
 * @property {string} base_url
 * @property {string} connection_status
 * @property {bool} dynamic
 * @property {bool} available
 * @property {bool} subset_of_users_device
 * @property {string|Date} added
 * @property {string|Date} last_accessed
 * @property {Number} since_last_accessed - Seconds since `last_accessed`
 */

/**
 * @param {string} id
 * @return {NetworkLocation}
 */
function updateConnectionStatus(id) {
  const url = urls['kolibri:core:networklocation_update_connection_status'](id);
  return this.client({ url, method: 'post' }).then(response => {
    return response.data;
  });
}

/**
 * @param {string} id
 * @return {{facilities: [{id: string}]}}
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
   * @method
   * @name fetchModel
   * @return {NetworkLocation}
   */

  /**
   * @method
   * @name fetchCollection
   * @return {NetworkLocation[]}
   */
});

export const StaticNetworkLocationResource = new Resource({
  name: 'staticnetworklocation',
  updateConnectionStatus,
  fetchFacilities,

  /**
   * @method
   * @name fetchModel
   * @return {NetworkLocation}
   */

  /**
   * @method
   * @name fetchCollection
   * @return {NetworkLocation[]}
   */
});

export const DynamicNetworkLocationResource = new Resource({
  name: 'dynamicnetworklocation',
  updateConnectionStatus,
  fetchFacilities,

  /**
   * @method
   * @name fetchModel
   * @return {NetworkLocation}
   */

  /**
   * @method
   * @name fetchCollection
   * @return {NetworkLocation[]}
   */
});
