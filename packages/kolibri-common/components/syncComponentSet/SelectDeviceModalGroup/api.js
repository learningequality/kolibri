import matches from 'lodash/matches';
import {
  NetworkLocationResource,
  StaticNetworkLocationResource,
} from 'kolibri-common/apiResources/NetworkLocationResource';
import RemoteChannelResource from 'kolibri-common/apiResources/RemoteChannelResource';

/** @typedef {import('kolibri-common/apiResources/NetworkLocationResource')} NLR */
/** @typedef {NLR.NetworkLocation} NetworkLocation */

export function createDevice(address) {
  return StaticNetworkLocationResource.createModel({
    base_url: address.base_url,
    nickname: address.nickname,
  }).save();
}

export function deleteDevice(id) {
  return StaticNetworkLocationResource.deleteModel({ id });
}

/**
 * Fetch all known network locations, optionally filtered by query params.
 * @param {object} [params] - query parameters forwarded to the network location endpoint
 * @returns {Promise<NetworkLocation[]>} the matching network locations
 */
export function fetchDevices(params = {}) {
  return NetworkLocationResource.fetchCollection({ force: true, getParams: params });
}

/**
 * @typedef {object} FacilityFilter
 * @property {string} [id] - match a facility with this id
 * @property {boolean} [learner_can_sign_up] - match facilities allowing learner sign-up
 * @property {boolean} [on_my_own_setup] - match facilities configured as on-my-own setups
 */

/**
 * Check whether any facility on a device matches the given filter.
 * @param {NetworkLocation} device - network location to query
 * @param {FacilityFilter} facility - subset of fields a facility must match
 * @returns {Promise<boolean>} true when at least one facility matches the filter
 */
export function deviceHasMatchingFacility(device, facility) {
  // TODO: ideally we could pass along the filters directly to the API
  return NetworkLocationResource.fetchFacilities(device.id).then(({ facilities }) => {
    return Boolean(facilities.find(matches(facility)));
  });
}

/**
 * Check whether a channel is available on a remote device.
 * @param {string} channelId - channel to look up remotely
 * @param {NetworkLocation} device - network location hosting the channel
 * @returns {Promise<boolean>} true when the channel is available at the device
 */
export function channelIsAvailableAtDevice(channelId, device) {
  return RemoteChannelResource.fetchModel({
    id: channelId,
    getParams: {
      baseurl: device.base_url,
    },
    force: true,
  }).then(() => {
    return true;
  });
}

/**
 * Refresh the cached connection status for a device.
 * @param {NetworkLocation} device - network location to re-probe
 * @returns {Promise<NetworkLocation>} the refreshed network location record
 */
export function updateConnectionStatus(device) {
  return NetworkLocationResource.updateConnectionStatus(device.id);
}
