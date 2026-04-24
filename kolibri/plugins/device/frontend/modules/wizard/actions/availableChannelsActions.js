import differenceBy from 'lodash/differenceBy';
import find from 'lodash/find';
import { getRemoteChannelByToken } from '../utils';

/**
 * Fetch all remote channels, merging installed unlisted channels with public ones.
 * @param {object} store - The Vuex store instance.
 * @param {object[]} publicChannels - Array of public channel objects.
 * @returns {Promise<object[]>} Resolves with the combined channel list.
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
      .catch(() => Promise.resolve()),
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
