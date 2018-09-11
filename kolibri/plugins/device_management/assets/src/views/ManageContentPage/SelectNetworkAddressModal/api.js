import { RemoteChannelResource } from 'kolibri.resources';
import { NetworkLocationResource } from '../../../apiResources';

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

export function createAddress(address) {
  return NetworkLocationResource.createModel({
    base_url: address.base_url,
    device_name: address.device_name,
  }).save();
}

export function deleteAddress(id) {
  return NetworkLocationResource.deleteModel({ id });
}
