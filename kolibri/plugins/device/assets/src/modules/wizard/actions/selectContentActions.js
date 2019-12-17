import client from 'kolibri.client';
import urls from 'kolibri.urls';
import { downloadChannelMetadata } from '../utils';
import { getChannelWithContentSizes } from '../apiChannelMetadata';

/**
 * Transitions the import/export wizard to the 'load-channel-metadata' interstitial state
 *
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
 * Makes a call to freespace API and places result in the store.
 * If transfer type is LOCALEXPORT, it gets the selected drive's freespace.
 *
 * @param {string} path - Path to the Kolibri data folder.
 * If empty, defaults to server's KOLIBRI_HOME.
 * @returns {Promise}
 *
 */
export function getAvailableSpaceOnDrive(selectedDrive) {
  if (selectedDrive) {
    return Promise.resolve(selectedDrive.freespace);
  }
  return client({
    path: `${urls['kolibri:core:freespace']()}`,
    params: { path: 'Content' },
  })
    .then(({ entity }) => entity.freespace)
    .catch(() => -1);
}
