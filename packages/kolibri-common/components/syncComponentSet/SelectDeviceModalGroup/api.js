import matches from 'lodash/matches';
import {
  NetworkLocationResource,
  StaticNetworkLocationResource,
} from 'kolibri-common/apiResources/NetworkLocationResource';
import RemoteChannelResource from 'kolibri-common/apiResources/RemoteChannelResource';

export function createDevice(address) {
  return StaticNetworkLocationResource.createModel({
    base_url: address.base_url,
    nickname: address.nickname,
  }).save();
}

export function deleteDevice(id) {
  return StaticNetworkLocationResource.deleteModel({ id });
}

export function fetchDevices(params = {}) {
  return NetworkLocationResource.fetchCollection({ force: true, getParams: params });
}

export function deviceHasMatchingFacility(device, facility) {
  // TODO: ideally we could pass along the filters directly to the API
  return NetworkLocationResource.fetchFacilities(device.id).then(({ facilities }) => {
    return Boolean(facilities.find(matches(facility)));
  });
}

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

export function updateConnectionStatus(device) {
  return NetworkLocationResource.updateConnectionStatus(device.id);
}
