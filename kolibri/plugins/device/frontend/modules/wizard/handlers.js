import find from 'lodash/find';
import router from 'kolibri/router';
import logger from 'kolibri-logging';
import { handleApiError } from 'kolibri/utils/appError';
import samePageCheckGenerator from 'kolibri-common/utils/samePageCheckGenerator';
import { TransferTypes } from 'kolibri-common/utils/syncTaskUtils';
import ContentNodeGranularResource from 'kolibri-common/apiResources/ContentNodeGranularResource';
import RemoteChannelResource from 'kolibri-common/apiResources/RemoteChannelResource';
import { pageLoading } from 'kolibri-common/composables/usePageLoading';
import { ContentWizardPages, ContentWizardErrors } from '../../constants';
import { manageContentPageLink } from '../../views/ManageContentPage/manageContentLinks';
import { getAvailableSpaceOnDrive, loadChannelMetadata } from './actions/selectContentActions';
import {
  getAvailableChannelsOnPeerServer,
  getTransferredChannelOnPeerServer,
} from './apiPeerImport';
import { getChannelWithContentSizes } from './apiChannelMetadata';

const logging = logger.getLogger(__filename);

// Utilities for the show*Page actions
/**
 * Fetches the drive list and resolves with the drive matching the given ID.
 * @param {object} store - The Vuex store instance with wizard state.
 * @param {string} driveId - The ID of the drive to find.
 * @returns {Promise<object>} Resolves with the drive object, or rejects with an error type.
 */
function getSelectedDrive(store, driveId) {
  return new Promise((resolve, reject) => {
    store
      .dispatch('manageContent/refreshDriveList', null, { root: true })
      .then(driveList => {
        store.commit('manageContent/wizard/SET_DRIVE_LIST', driveList);
        const drive = find(driveList, { id: driveId });
        if (drive) {
          resolve({ ...drive });
        } else {
          reject({ error: ContentWizardErrors.DRIVE_NOT_FOUND });
        }
      })
      .catch(() => {
        // Generic error fetching drive list (e.g. 500 stemming from root_pk/root_id issue)
        reject({ error: ContentWizardErrors.DRIVE_ERROR });
      });
  });
}

/**
 * Returns a promise that resolves with the list of installed channels, fetching if not cached.
 * @param {object} store - The Vuex store instance with manageContent state.
 * @returns {Promise<Array>} Resolves with the list of installed channel objects.
 */
function getInstalledChannelsPromise(store) {
  const { channelList } = store.state.manageContent;
  // Only refresh channel list if it hasn't been fetched yet (i.e. user went straight to URL)
  if (channelList.length === 0) {
    return store.dispatch('manageContent/refreshChannelList', null, { root: true });
  } else {
    return Promise.resolve([...channelList]);
  }
}

/**
 * Determines the transfer type (local import, peer import, or remote import) from route params.
 * @param {object} params - Route params object potentially containing drive_id or address_id.
 * @returns {string} The TransferTypes constant corresponding to the transfer type.
 */
function getTransferType(params) {
  const { drive_id, address_id } = params;
  if (drive_id) {
    return TransferTypes.LOCALIMPORT;
  }

  if (address_id) {
    return TransferTypes.PEERIMPORT;
  }
  // If no parameters, assume REMOTEIMPORT
  return TransferTypes.REMOTEIMPORT;
}

/**
 * Handles a wizard page error by committing the error type to the store or reporting it.
 * @param {object} store - The Vuex store instance.
 * @param {object} error - The error object, optionally containing an errorType property.
 * @returns {void}
 */
function handleError(store, error) {
  const { error: errorType } = error;
  // special errors that are handled gracefully by UI
  if (errorType) {
    return store.commit('manageContent/wizard/SET_WIZARD_STATUS', errorType);
  }
  // handle other errors generically
  store.commit('manageContent/wizard/RESET_STATE');
  handleApiError({ error });
}

// Handler for when user goes directly to the Available Channels URL.
// Params are { drive_id?: string, address_id?: string }
/**
 * Loads available channels for the given transfer type and populates the wizard state.
 * @param {object} store - The Vuex store instance.
 * @param {object} params - Route params with optional drive_id, address_id, and token.
 * @param {object} route - The current Vue Router route object.
 * @returns {Promise<void>} Resolves when the available channels page state is ready.
 */
export function showAvailableChannelsPage(store, params, route) {
  let availableChannelsPromise;
  let selectedDrivePromise;
  const transferType = getTransferType(params);

  store.commit('SET_PAGE_NAME', ContentWizardPages.AVAILABLE_CHANNELS);
  pageLoading.value = true;
  store.commit('manageContent/wizard/RESET_STATE');

  if (transferType === null) {
    return router.replace(manageContentPageLink());
  }

  if (transferType === TransferTypes.LOCALIMPORT) {
    selectedDrivePromise = getSelectedDrive(store, params.drive_id);
    availableChannelsPromise = getInstalledChannelsPromise(store).then(() => {
      return selectedDrivePromise.then(drive => {
        return store.dispatch('manageContent/wizard/getAllDriveChannels', drive);
      });
    });
  }

  if (transferType === TransferTypes.REMOTEIMPORT) {
    selectedDrivePromise = Promise.resolve({});
    availableChannelsPromise = new Promise((resolve, reject) => {
      getInstalledChannelsPromise(store).then(() => {
        return RemoteChannelResource.fetchCollection({ getParams: { token: params.token } })
          .then(remoteChannels => {
            if (!params.token) {
              return store
                .dispatch('manageContent/wizard/getAllRemoteChannels', remoteChannels)
                .then(allChannels => resolve(allChannels));
            }
            resolve(remoteChannels);
          })
          .catch(() => reject({ error: ContentWizardErrors.KOLIBRI_STUDIO_UNAVAILABLE }));
      });
    });
  }

  if (transferType === TransferTypes.PEERIMPORT) {
    selectedDrivePromise = Promise.resolve({});
    availableChannelsPromise = getInstalledChannelsPromise(store).then(() => {
      return getAvailableChannelsOnPeerServer(store, params.address_id);
    });
  }
  const shouldResolve = samePageCheckGenerator(route);
  return Promise.all([availableChannelsPromise, selectedDrivePromise]).then(
    function onSuccess([availableChannels, selectedDrive]) {
      if (shouldResolve()) {
        store.commit('manageContent/wizard/HYDRATE_SHOW_AVAILABLE_CHANNELS_PAGE', {
          availableChannels,
          selectedDrive,
          transferType,
        });
        pageLoading.value = false;
      }
    },
    function onFailure(error) {
      if (shouldResolve()) {
        pageLoading.value = false;
        return handleError(store, error);
      }
    },
  );
}

/**
 * Loads the select content page state for a given channel and transfer type.
 * @param {object} store - The Vuex store instance.
 * @param {object} params - Route params with drive_id, address_id, and channel_id.
 * @returns {Promise<void>} Resolves when the select content page state is ready.
 */
export function showSelectContentPage(store, params) {
  let selectedDrivePromise = Promise.resolve({});
  let transferredChannelPromise;
  let availableSpacePromise;
  const { drive_id, channel_id } = params;
  const transferType = getTransferType(params);

  store.commit('manageContent/wizard/RESET_STATE');
  store.commit('SET_PAGE_NAME', ContentWizardPages.SELECT_CONTENT);
  pageLoading.value = true;

  if (transferType === null) {
    return router.replace(manageContentPageLink());
  }

  // HACK if going directly to URL, we make sure channelList has this channel at the minimum.
  // We only get the one channel, since GETing /api/channel with file sizes is slow.
  // We let it fail silently, since it is only used to show "on device" files/resources.
  const installedChannelPromise = getChannelWithContentSizes(params.channel_id)
    .then(channel => {
      store.commit('manageContent/REMOVE_FROM_CHANNEL_LIST', channel.id);
      store.commit('manageContent/ADD_TO_CHANNEL_LIST', channel);
    })
    .catch(error => {
      // This is an expected scenario because it's possible that there
      // are no data for this channel on a device yet (download channel
      // metadata task will be triggered later for this situation)
      if (error.response && error.response.status === 404) {
        logging.error(
          `^^^ 404 (Not Found) error returned while requesting "${error.response.config.url}..." is an expected response.`,
        );
      }
    });

  if (transferType === TransferTypes.LOCALIMPORT) {
    selectedDrivePromise = getSelectedDrive(store, drive_id);
    availableSpacePromise = getAvailableSpaceOnDrive();
    transferredChannelPromise = new Promise((resolve, reject) => {
      selectedDrivePromise.then(drive => {
        const match = find(drive.metadata.channels, { id: channel_id });
        if (match) {
          resolve({ ...match });
        } else {
          reject({ error: ContentWizardErrors.CHANNEL_NOT_FOUND_ON_DRIVE });
        }
      });
    });
  }

  if (transferType === TransferTypes.REMOTEIMPORT) {
    availableSpacePromise = getAvailableSpaceOnDrive();
    transferredChannelPromise = new Promise((resolve, reject) => {
      RemoteChannelResource.fetchModel({ id: channel_id, force: true })
        // Force fetching because using cached version switches
        // between returning an array and returning an object
        .then(
          channel => {
            resolve(channel);
          },
          error => {
            if (error.response.status === 404) {
              reject({ error: ContentWizardErrors.CHANNEL_NOT_FOUND_ON_STUDIO });
            } else {
              reject({ error: ContentWizardErrors.KOLIBRI_STUDIO_UNAVAILABLE });
            }
          },
        );
    });
  }

  if (transferType === TransferTypes.PEERIMPORT) {
    availableSpacePromise = getAvailableSpaceOnDrive();
    transferredChannelPromise = getTransferredChannelOnPeerServer(store, {
      addressId: params.address_id,
      channelId: params.channel_id,
    });
  }

  return Promise.all([
    selectedDrivePromise,
    transferredChannelPromise,
    availableSpacePromise,
    installedChannelPromise,
  ])
    .then(([selectedDrive, transferredChannel, availableSpace]) => {
      store.commit('manageContent/wizard/HYDRATE_SELECT_CONTENT_PAGE', {
        availableSpace,
        selectedDrive,
        transferType,
        transferredChannel,
      });

      return loadChannelMetadata(store).then(() => {
        return updateTreeViewTopic(store, {
          id: store.state.manageContent.wizard.transferredChannel.root,
          title: transferredChannel.name,
        }).then(() => {});
      });
    })
    .then(() => {
      pageLoading.value = false;
    })
    .catch(error => {
      pageLoading.value = false;
      return handleError(store, error);
    });
}

/**
 * Fetches granular content node data for a topic and updates the wizard tree view.
 * @param {object} store - The Vuex store instance with wizard state.
 * @param {object} topic - The topic content node object with id and title.
 * @returns {Promise<void>} Resolves when the tree view topic has been updated in the store.
 */
export function updateTreeViewTopic(store, topic) {
  const fetchArgs = {};
  if (store.getters['manageContent/wizard/inLocalImportMode']) {
    const { selectedDrive } = store.state.manageContent.wizard;
    fetchArgs.importing_from_drive_id = selectedDrive.id;
  }
  if (store.getters['manageContent/wizard/inPeerImportMode']) {
    const { selectedPeer } = store.state.manageContent.wizard;
    fetchArgs.importing_from_peer_id = selectedPeer.id;
  }
  return ContentNodeGranularResource.fetchModel({
    id: topic.id,
    getParams: fetchArgs,
    force: true,
  })
    .then(contents => {
      store.commit('manageContent/wizard/SET_CURRENT_TOPIC_NODE', contents);
      store.dispatch('manageContent/wizard/updatePathBreadcrumbs', topic);
    })
    .catch(() => {
      store.commit(
        'manageContent/wizard/SET_WIZARD_STATUS',
        ContentWizardErrors.TREEVIEW_LOADING_ERROR,
      );
    });
}
