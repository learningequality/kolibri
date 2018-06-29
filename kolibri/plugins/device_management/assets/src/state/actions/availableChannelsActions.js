import { RemoteChannelResource } from 'kolibri.resources';
import differenceBy from 'lodash/differenceBy';
import { installedChannelList } from '../getters';

/**
 * Makes request to RemoteChannel API with a token. Does not actually interact
 * with Vuex store.
 *
 * @param {string} token -
 * @returns Promise
 */
export function getRemoteChannelByToken(token) {
  return RemoteChannelResource.getModel(token).fetch({}, true)._promise;
}

/**
 * HACK: Makes a request to Kolibri Studio to get info on unlisted channels, then appends
 * them to the public channels. This hack is to get around the fact that the ChannelMetadata object
 * does not indicate the origins of a channel: whether a remote public, remote unlisted, or bespoke
 * channel from USB, the ChannelMetadata is identical.
 *
 * @param {Array<Channel>} publicChannels - the list of publich channels, which will not be queried
 * @returns {Promise<Array<Channel>>}
 */
export function getAllRemoteChannels(store, publicChannels) {
  const installedChannels = installedChannelList(store.state);
  const privateChannels = differenceBy(installedChannels, publicChannels, 'id').filter(
    channel => channel.available
  );
  const promises = privateChannels.map(privateChannel =>
    getRemoteChannelByToken(privateChannel.id)
      .then(([channel]) => Promise.resolve({ ...channel, ...privateChannel }))
      .catch(() => Promise.resolve())
  );
  return Promise.all(promises).then(unlisted => {
    return [...unlisted.filter(Boolean), ...publicChannels];
  });
}
