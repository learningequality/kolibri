import client from 'kolibri.client';
import urls from 'kolibri.urls';
import { ContentNodeGranularResource } from 'kolibri.resources';
import { downloadChannelMetadata } from './contentTransferActions';
import { setTransferredChannel } from './contentWizardActions';

/**
 * Transitions the import/export wizard to the 'load-channel-metadata' interstitial state
 *
 */
export function loadChannelMetaData(store) {
  let dbPromise;
  const { transferredChannel } = store.getters.wizardState;
  const channelOnDevice = store.getters.channelIsInstalled(transferredChannel.id);

  // Downloading the Content Metadata DB
  if (!channelOnDevice) {
    // Update metadata when no content db has been downloaded
    dbPromise = downloadChannelMetadata(store);
  } else if (!channelOnDevice.available && channelOnDevice.version < transferredChannel.version) {
    // If channel _is_ on the device, but not "available" (i.e. no resources installed yet)
    // _and_ has been updated, then download the metadata
    dbPromise = downloadChannelMetadata(store);
  } else {
    // If already on device, then skip the DB download, and use on-device
    // Channel metadata, since it has root id.
    dbPromise = Promise.resolve(channelOnDevice);
  }

  // Hydrating the store with the Channel Metadata
  return dbPromise
    .then(channel => {
      // The channel objects are not consistent if they come from different workflows.
      // Replacing them here with canonical type from ChannelResource.
      setTransferredChannel(store, {
        ...channel,
        version: transferredChannel.version,
        public: transferredChannel.public,
      });
    })
    .catch(({ errorType }) => {
      // ignore cancellations
      if (errorType !== 'CHANNEL_TASK_ERROR') {
        store.commit('SET_WIZARD_STATUS', errorType);
      }
    });
}

/**
 * Updates wizardState.treeView when a new topic is clicked.
 *
 * @param {Object} topic - { id, title, path }
 *
 */
export function updateTreeViewTopic(store, topic) {
  const { selectedDrive } = store.getters.wizardState;
  const fetchArgs = {};
  if (store.getters.inLocalImportMode) {
    fetchArgs.importing_from_drive_id = selectedDrive.id;
  }
  if (store.getters.inExportMode) {
    fetchArgs.for_export = 'true';
  }
  store.commit('CORE_SET_PAGE_LOADING', true);
  return ContentNodeGranularResource.fetchModel({
    id: topic.id,
    getParams: fetchArgs,
  })
    .then(contents => {
      store.commit('SET_CURRENT_TOPIC_NODE', contents);
      store.commit('UPDATE_PATH_BREADCRUMBS', topic);
    })
    .catch(() => {
      store.commit('SET_WIZARD_STATUS', 'TREEVIEW_LOADING_ERROR');
    })
    .then(() => {
      store.commit('CORE_SET_PAGE_LOADING', false);
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
    path: `${urls['freespace']()}`,
    params: {},
  })
    .then(({ entity }) => entity.freespace)
    .catch(() => -1);
}
