import client from 'kolibri/client';
import urls from 'kolibri/urls';
import { downloadChannelMetadata } from '../utils';
import { getChannelWithContentSizes } from '../apiChannelMetadata';

/**
 * Loads channel metadata for the current transfer, downloading it if needed.
 * @param {object} store - The Vuex store instance with wizard state.
 * @returns {Promise<void>} Resolves when channel metadata has been loaded into the store.
 */
export function loadChannelMetadata(store) {
  let dbPromise;
  const { transferredChannel } = store.state.manageContent.wizard;
  const channelOnDevice = store.getters['manageContent/channelIsOnDevice'](transferredChannel.id);

  // If channel _is_ on the device, but not "available" (i.e. no resources installed yet)
  // _and_ has been updated, then download the metadata
  const newChannelDbAvailable =
    channelOnDevice &&
    !channelOnDevice.available &&
    channelOnDevice.version < transferredChannel.version;

  // Update metadata when no content db has been downloaded or if it is stale
  if (!channelOnDevice || newChannelDbAvailable) {
    dbPromise = downloadChannelMetadata(store);
  } else {
    // If already on device, then skip the DB download, and use on-device
    // Channel metadata, since it has root id.
    dbPromise = getChannelWithContentSizes(transferredChannel.id);
  }

  // Hydrating the store with the Channel Metadata
  return dbPromise
    .then(channel => {
      // The channel objects are not consistent if they come from different workflows.
      // Replacing them here with canonical type from ChannelResource.
      store.commit('manageContent/wizard/SET_TRANSFERRED_CHANNEL', {
        ...channel,
        version: transferredChannel.version,
        public: transferredChannel.public,
      });
    })
    .catch(err => {
      // ignore cancellations and unhandled task exceptions
      if (err && err.errorType !== 'CHANNEL_TASK_ERROR') {
        store.commit('manageContent/wizard/SET_WIZARD_STATUS', err.errorType);
      }
    });
}

/**
 * Gets the available free space on a drive, or on the device's content storage if no drive given.
 * @param {object} selectedDrive - Optional drive object with a freespace property.
 * @returns {Promise<number>} Resolves with the available free space in bytes, or -1 on error.
 */
export function getAvailableSpaceOnDrive(selectedDrive) {
  if (selectedDrive) {
    return Promise.resolve(selectedDrive.freespace);
  }
  return client({
    url: `${urls['kolibri:core:freespace']()}`,
    params: { path: 'Content' },
  })
    .then(({ data }) => data.freespace)
    .catch(() => -1);
}
