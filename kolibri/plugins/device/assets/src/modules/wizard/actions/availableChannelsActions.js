import differenceBy from 'lodash/differenceBy';
import { getRemoteChannelByToken } from '../utils';

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
  const { channelList } = store.rootState.manageContent;
  const privateChannels = differenceBy(channelList, publicChannels, 'id').filter(
    channel => channel.available
  );
  const promises = privateChannels.map(privateChannel =>
    getRemoteChannelByToken(privateChannel.id)
      .then(([channel]) =>
        Promise.resolve({ ...channel, ...privateChannel, latest_version: channel.version })
      )
      .catch(() => Promise.resolve())
  );
  return Promise.all(promises).then(unlisted => {
    return [...unlisted.filter(Boolean), ...publicChannels];
  });
}
