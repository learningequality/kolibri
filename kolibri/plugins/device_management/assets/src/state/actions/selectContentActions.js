import client from 'kolibri.client';
import urls from 'kolibri.urls';
import { ContentNodeGranularResource } from 'kolibri.resources';
import { channelIsInstalled, wizardState, inLocalImportMode, inExportMode } from '../getters';
import { downloadChannelMetadata } from './contentTransferActions';
import { setTransferredChannel } from './contentWizardActions';

/**
 * Transitions the import/export wizard to the 'load-channel-metadata' interstitial state
 *
 */
export function loadChannelMetaData(store) {
  let dbPromise;
  const { transferredChannel } = wizardState(store.state);
  const channelOnDevice = channelIsInstalled(store.state)(transferredChannel.id);

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
        store.dispatch('SET_WIZARD_STATUS', errorType);
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
  const { selectedDrive } = wizardState(store.state);
  const fetchArgs = {};
  if (inLocalImportMode(store.state)) {
    fetchArgs.importing_from_drive_id = selectedDrive.id;
  }
  if (inExportMode(store.state)) {
    fetchArgs.for_export = 'true';
  }
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  return (
    ContentNodeGranularResource.getModel(topic.id)
      // Need to force fetch, since cached values are used even with different
      // query params
      .fetch(fetchArgs, true)
      .then(contents => {
        store.dispatch('SET_CURRENT_TOPIC_NODE', contents);
        store.dispatch('UPDATE_PATH_BREADCRUMBS', topic);
      })
      .catch(() => {
        store.dispatch('SET_WIZARD_STATUS', 'TREEVIEW_LOADING_ERROR');
      })
      .then(() => {
        store.dispatch('CORE_SET_PAGE_LOADING', false);
      })
  );
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
