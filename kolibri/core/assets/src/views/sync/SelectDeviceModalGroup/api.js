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
 * @param {string} facilityId
 * @param {NetworkLocation} device
 * @return {Promise<boolean>}
 */
export function facilityIsAvailableAtDevice(facilityId, device) {
  return NetworkLocationResource.fetchFacilities(device.id).then(({ facilities }) => {
    return Boolean(facilities.find(({ id }) => id === facilityId));
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

/**
 * @param {string} deviceId
 * @return {Promise<boolean>}
 */
export function deviceFacilityCanSignUp(deviceId) {
  return NetworkLocationResource.fetchFacilities(deviceId).then(({ device_id, facilities }) => {
    if (deviceId === device_id) {
      for (const facility of facilities) {
        if (facility.learner_can_sign_up) {
          return true;
        }
      }
    }
    return false;
  });
}
