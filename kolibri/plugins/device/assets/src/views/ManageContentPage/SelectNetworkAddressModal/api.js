import { RemoteChannelResource } from 'kolibri.resources';
import { NetworkLocationResource, NetworkSearchResource } from '../../../apiResources';

function channelIsAvailableAtLocation(channelId, location) {
  if (!location.available) {
    return Promise.resolve(false);
  }
  return RemoteChannelResource.fetchModel({
    id: channelId,
    getParams: {
      baseurl: location.base_url,
    },
    force: true,
  })
    .then(() => {
      return true;
    })
    .catch(() => {
      return false;
    });
}

export function fetchAddresses(withChannelId = '') {
  return NetworkLocationResource.fetchCollection({ force: true }).then(locations => {
    // If channelId is provided, then we are in an 'import-more' workflow and disable
    // locations that do not have the channel we are importing from.
    if (withChannelId !== '') {
      const locationsWithAvailbilityPromises = locations.map(location => {
        // Need to wrap in normal promise, otherwise Promise.all will cause some of these
        // to resolve as undefined
        return new Promise(resolve => {
          return channelIsAvailableAtLocation(withChannelId, location).then(isAvailable => {
            resolve({ ...location, hasContent: isAvailable });
          });
        });
      });
      return Promise.all(locationsWithAvailbilityPromises);
    }

    // If channelId is not provided, then we are at top-level import workflow and do not
    // disable any locations unless it is unavailable
    return locations.map(location => ({ ...location, hasContent: location.available }));
  });
}

export function fetchDevices(withChannelId = '') {
  return NetworkSearchResource.fetchCollection({ force: true }).then(devices => {
    // Don't include ourself in the results
    devices = devices.filter(device => !device.self);
    // If channelId is provided, then we are in an 'import-more' workflow and we exclude
    // devices that do not have the channel we are looking for. Otherwise, only filter
    // out devices that don't have any channels loaded at all.
    if (withChannelId === '') {
      return devices.map(device => ({
        ...device,
        disabled: device.data.channels.length === 0,
      }));
    } else {
      return devices.map(device => ({
        ...device,
        disabled: !device.data.channels.map(channel => channel.id).includes(withChannelId),
      }));
    }
  });
}

export function createAddress(address) {
  return NetworkLocationResource.createModel({
    base_url: address.base_url,
    device_name: address.device_name,
  }).save();
}

export function deleteAddress(id) {
  return NetworkLocationResource.deleteModel({ id });
}
