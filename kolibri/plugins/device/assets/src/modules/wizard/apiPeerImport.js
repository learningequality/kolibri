import find from 'lodash/find';
import { RemoteChannelResource } from 'kolibri.resources';
import { NetworkLocationResource } from '../../apiResources';
import { ContentWizardErrors } from '../../constants';

export function getAvailableChannelsOnPeerServer(store, addressId) {
  const { channelList } = store.state.manageContent;
  return new Promise((resolve, reject) => {
    NetworkLocationResource.fetchModel({ id: addressId })
      .then(networkLocation => {
        if (networkLocation.available) {
          store.commit('manageContent/wizard/SET_SELECTED_PEER', networkLocation);
          RemoteChannelResource.fetchCollection({
            getParams: {
              baseurl: networkLocation.base_url,
            },
            force: true,
          })
            .then(remoteChannels => {
              const availableChannels = remoteChannels
                .filter(({ total_resources }) => total_resources > 0)
                .map(c => {
                  // Adds extra version information to drive.metadata.channels objects
                  // to support the upgrade UIs
                  const installedChannel = find(channelList, { id: c.id, available: true }) || {};
                  return {
                    ...c,
                    installed_version: installedChannel.version,
                    latest_version: c.version,
                  };
                });
              resolve(availableChannels);
            })
            .catch(() => {
              reject({ error: ContentWizardErrors.NETWORK_LOCATION_DOES_NOT_HAVE_CHANNEL });
            });
        } else {
          // Fail if the Network Location is not running at the moment
          reject({ error: ContentWizardErrors.NETWORK_LOCATION_UNAVAILABLE });
        }
      })
      .catch(() => {
        reject({ error: ContentWizardErrors.NETWORK_LOCATION_DOES_NOT_EXIST });
      });
  });
}

export function getTransferredChannelOnPeerServer(store, { addressId, channelId }) {
  return new Promise((resolve, reject) => {
    NetworkLocationResource.fetchModel({ id: addressId })
      .then(networkLocation => {
        if (networkLocation.available) {
          store.commit('manageContent/wizard/SET_SELECTED_PEER', networkLocation);
          RemoteChannelResource.fetchModel({
            id: channelId,
            getParams: {
              baseurl: networkLocation.base_url,
            },
            force: true,
          })
            .then(channels => {
              resolve({ ...channels[0] });
            })
            .catch(() => {
              // Only appears if channel with channelId is not on the device. Will still load
              // gracefully if channel has zero resources
              reject({ error: ContentWizardErrors.NETWORK_LOCATION_DOES_NOT_HAVE_CHANNEL });
            });
        } else {
          reject({ error: ContentWizardErrors.NETWORK_LOCATION_UNAVAILABLE });
        }
      })
      .catch(() => {
        reject({ error: ContentWizardErrors.NETWORK_LOCATION_DOES_NOT_EXIST });
      });
  });
}
