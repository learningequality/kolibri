import matches from 'lodash/matches';
import {
  NetworkLocationResource,
  RemoteChannelResource,
  StaticNetworkLocationResource,
} from 'kolibri.resources';

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
 * @param params
 * @return {Promise<NetworkLocation[]>}
 */
export function fetchDevices(params = {}) {
  return NetworkLocationResource.fetchCollection({ force: true, getParams: params });
}

/**
 * @typedef {Object} FacilityFilter
 * @property {string} [id]
 * @property {boolean} [learner_can_sign_up]
 */

/**
 * @param {NetworkLocation} device
 * @param {FacilityFilter} facility
 * @return {Promise<boolean>}
 */
export function deviceHasMatchingFacility(device, facility) {
  // TODO: ideally we could pass along the filters directly to the API
  return NetworkLocationResource.fetchFacilities(device.id).then(({ facilities }) => {
    return Boolean(facilities.find(matches(facility)));
  });
}

/**
 * @param {string} channelId
 * @param {NetworkLocation} device
 * @return {Promise<boolean>}
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
 * @param {NetworkLocation} device
 * @return {Promise<NetworkLocation>}
 */
export function updateConnectionStatus(device) {
  return NetworkLocationResource.updateConnectionStatus(device.id);
}
