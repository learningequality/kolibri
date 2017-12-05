import client from 'kolibri.client';
import urls from 'kolibri.urls';
import { ContentNodeGranularResource } from 'kolibri.resources';
import { ContentWizardPages, TransferTypes } from '../../constants';
import { channelIsInstalled, wizardState } from '../getters';
import { downloadChannelMetadata } from './contentTransferActions';
import { navigateToTopicUrl } from '../../wizardTransitionRoutes';

/**
 * Transitions the import/export wizard to the 'select-content-page'
 *
 */
export function showSelectContentPage(store) {
  let dbPromise;
  const { transferredChannel } = wizardState(store.state);
  const channelOnDevice = channelIsInstalled(store.state)(transferredChannel.id);
  store.dispatch('SET_WIZARD_PAGENAME', ContentWizardPages.SELECT_CONTENT);

  // Downloading the Content Metadata DB
  if (!channelOnDevice) {
    // Update metadata when no content has been downloaded
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
      store.dispatch('SET_TRANSFERRED_CHANNEL', {
        ...channel,
        version: transferredChannel.version,
        public: transferredChannel.public,
      });
      navigateToTopicUrl({ title: channel.name, pk: channel.root });
    })
    .catch(({ errorType }) => {
      store.dispatch('SET_WIZARD_STATUS', errorType);
    });
}

/**
 * Updates wizardState.treeView when a new topic is clicked.
 *
 * @param {Object} topic - { pk, title, path }
 *
 */
export function updateTreeViewTopic(store, topic) {
  const { transferType, selectedDrive } = wizardState(store.state);
  const fetchArgs = {};
  if (transferType === TransferTypes.LOCALIMPORT) {
    fetchArgs.importing_from_drive_id = selectedDrive.id;
  }
  return (
    ContentNodeGranularResource.getModel(topic.pk)
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
  );
}

/**
 * Makes a call to freespace API and places result in the store.
 * If transfer type is LOCALEXPORT, it gets the selected drive's freespace.
 *
 * @param {string} path - Path to the Kolibri data folder. If empty, defaults to server's KOLIBRI_HOME.
 * @returns {Promise}
 *
 */
export function getAvailableSpaceOnDrive(store, path = '') {
  const { transferType, selectedDrive } = wizardState(store.state);
  let promise;

  if (transferType === TransferTypes.LOCALEXPORT) {
    promise = Promise.resolve(selectedDrive.freespace);
  } else {
    const params = path ? { path } : {};
    promise = client({
      path: `${urls['freespace']()}`,
      params,
    }).then(({ entity }) => entity.freespace);
  }
  return promise
    .then(freespace => {
      return store.dispatch('SET_AVAILABLE_SPACE', freespace);
    })
    .catch(() => {
      // UI will handle this gracefully with something instead of throwing an error
      return store.dispatch('SET_AVAILABLE_SPACE', -1);
    });
}
