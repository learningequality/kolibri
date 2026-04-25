import differenceBy from 'lodash/differenceBy';
import find from 'lodash/find';
import { getRemoteChannelByToken } from '../utils';

/**
 * @typedef {import('kolibri-common/apiResources/RemoteChannelResource').Channel} Channel
 */

/**
 * HACK: Makes a request to Kolibri Studio to get info on unlisted channels, then appends
 * them to the public channels. This hack is to get around the fact that the ChannelMetadata
 * object does not indicate the origins of a channel: whether a remote public, remote unlisted,
 * or bespoke channel from USB, the ChannelMetadata is identical.
 * @param {object} store - The Vuex store instance.
 * @param {Array<Channel>} publicChannels - The list of public channels, which will not be
 * queried.
 * @returns {Promise<Array<Channel>>} Resolves with the combined channel list.
 */
export function getAllRemoteChannels(store, publicChannels) {
  const { channelList } = store.rootState.manageContent;
  const installedUnlistedChannels = differenceBy(channelList, publicChannels, 'id').filter(
    channel => channel.available,
  );
  const promises = installedUnlistedChannels.map(installedChannel =>
    getRemoteChannelByToken(installedChannel.id)
      .then(channel =>
        Promise.resolve({
          ...channel,
          ...installedChannel,
          installed_version: installedChannel.version,
          latest_version: channel.version,
        }),
      )
      .catch(() => {
        if (installedChannel.version === 0) {
          return Promise.resolve({
            ...installedChannel,
            installed_version: installedChannel.version,
          });
        }
        return Promise.resolve();
      }),
  );
  return Promise.all(promises).then(unlisted => {
    return [...unlisted.filter(Boolean), ...publicChannels];
  });
}

export function getAllDriveChannels(store, drive) {
  // Adds extra version information to drive.metadata.channels objects
  // to support the upgrade UIs
  // channelList must be up-to-date before running this
  const { channelList } = store.rootState.manageContent;
  return drive.metadata.channels.map(c => {
    const installedChannel = find(channelList, { id: c.id, available: true }) || {};
    return {
      ...c,
      installed_version: installedChannel.version,
      latest_version: c.version,
    };
  });
}
