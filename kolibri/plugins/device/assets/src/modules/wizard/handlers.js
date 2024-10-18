import find from 'lodash/find';
import router from 'kolibri/router';
import logger from 'kolibri-logging';
import samePageCheckGenerator from 'kolibri-common/utils/samePageCheckGenerator';
import { TransferTypes } from 'kolibri-common/utils/syncTaskUtils';
import ContentNodeGranularResource from 'kolibri-common/apiResources/ContentNodeGranularResource';
import RemoteChannelResource from 'kolibri-common/apiResources/RemoteChannelResource';
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

function getInstalledChannelsPromise(store) {
  const { channelList } = store.state.manageContent;
  // Only refresh channel list if it hasn't been fetched yet (i.e. user went straight to URL)
  if (channelList.length === 0) {
    return store.dispatch('manageContent/refreshChannelList', null, { root: true });
  } else {
    return Promise.resolve([...channelList]);
  }
}

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

function handleError(store, error) {
  const { error: errorType } = error;
  // special errors that are handled gracefully by UI
  if (errorType) {
    return store.commit('manageContent/wizard/SET_WIZARD_STATUS', errorType);
  }
  // handle other errors generically
  store.commit('manageContent/wizard/RESET_STATE');
  store.dispatch('handleApiError', { error });
}

// Handler for when user goes directly to the Available Channels URL.
// Params are { drive_id?: string, address_id?: string }
export function showAvailableChannelsPage(store, params) {
  let availableChannelsPromise;
  let selectedDrivePromise;
  const transferType = getTransferType(params);

  store.commit('SET_PAGE_NAME', ContentWizardPages.AVAILABLE_CHANNELS);
  store.commit('CORE_SET_PAGE_LOADING', true);
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
  const shouldResolve = samePageCheckGenerator(store);
  return Promise.all([availableChannelsPromise, selectedDrivePromise]).then(
    function onSuccess([availableChannels, selectedDrive]) {
      if (shouldResolve()) {
        store.commit('manageContent/wizard/HYDRATE_SHOW_AVAILABLE_CHANNELS_PAGE', {
          availableChannels,
          selectedDrive,
          transferType,
        });
        store.commit('CORE_SET_PAGE_LOADING', false);
      }
    },
    function onFailure(error) {
      if (shouldResolve()) {
        store.commit('CORE_SET_PAGE_LOADING', false);
        return handleError(store, error);
      }
    },
  );
}

/**
 * Handler for going to Select Content Page URL directly
 * params are { channel_id: string, drive_id?: string, address_id? },
 */
export function showSelectContentPage(store, params) {
  let selectedDrivePromise = Promise.resolve({});
  let transferredChannelPromise;
  let availableSpacePromise;
  const { drive_id, channel_id } = params;
  const transferType = getTransferType(params);

  store.commit('manageContent/wizard/RESET_STATE');
  store.commit('SET_PAGE_NAME', ContentWizardPages.SELECT_CONTENT);
  store.commit('CORE_SET_PAGE_LOADING', true);

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
      store.commit('CORE_SET_PAGE_LOADING', false);
    })
    .catch(error => {
      store.commit('CORE_SET_PAGE_LOADING', false);
      return handleError(store, error);
    });
}

/**
 * Updates wizardState.treeView when a new topic is clicked.
 *
 * @param {Object} topic - { id, title, path }
 *
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
