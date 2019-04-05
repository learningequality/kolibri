import find from 'lodash/find';
import router from 'kolibri.coreVue.router';
import { createTranslator } from 'kolibri.utils.i18n';
import ConditionalPromise from 'kolibri.lib.conditionalPromise';
import samePageCheckGenerator from 'kolibri.utils.samePageCheckGenerator';
import { ContentNodeGranularResource, RemoteChannelResource } from 'kolibri.resources';
import { ContentWizardPages, ContentWizardErrors, TransferTypes } from '../../constants';
import { manageContentPageLink } from '../../views/ManageContentPage/manageContentLinks';
import { getAvailableSpaceOnDrive, loadChannelMetadata } from './actions/selectContentActions';
import {
  getAvailableChannelsOnPeerServer,
  getTransferredChannelOnPeerServer,
} from './apiPeerImport';
import { getChannelWithContentSizes } from './apiChannelMetadata';

const translator = createTranslator('WizardHandlerTexts', {
  loadingChannelToolbar: 'Loading channel…',
});

// Utilities for the show*Page actions
function getSelectedDrive(store, driveId) {
  const { transferType } = store.state;
  return new Promise((resolve, reject) => {
    store
      .dispatch('manageContent/refreshDriveList', null, { root: true })
      .then(driveList => {
        store.commit('manageContent/wizard/SET_DRIVE_LIST', driveList);
        const drive = find(driveList, { id: driveId });
        if (drive) {
          if (transferType === TransferTypes.LOCALEXPORT && !drive.writable) {
            reject({ error: ContentWizardErrors.DRIVE_IS_NOT_WRITEABLE });
          } else {
            resolve({ ...drive });
          }
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
  const { for_export, drive_id, address_id } = params;
  // invalid combinations
  if (for_export) {
    if (!drive_id || address_id) {
      return null;
    }
  }
  if (drive_id) {
    return for_export ? TransferTypes.LOCALEXPORT : TransferTypes.LOCALIMPORT;
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
  store.dispatch('handleApiError', error);
  store.commit('manageContent/wizard/RESET_STATE');
}

// Handler for when user goes directly to the Available Channels URL.
// Params are { drive_id?: string, for_export?: boolean }
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

  if (transferType === TransferTypes.LOCALEXPORT) {
    selectedDrivePromise = getSelectedDrive(store, params.drive_id);
    availableChannelsPromise = getInstalledChannelsPromise(store).then(channels =>
      channels.filter(c => c.available)
    );
  }

  if (transferType === TransferTypes.LOCALIMPORT) {
    selectedDrivePromise = getSelectedDrive(store, params.drive_id);
    availableChannelsPromise = selectedDrivePromise.then(drive => {
      return [...drive.metadata.channels];
    });
  }

  if (transferType === TransferTypes.REMOTEIMPORT) {
    selectedDrivePromise = Promise.resolve({});
    availableChannelsPromise = new Promise((resolve, reject) => {
      getInstalledChannelsPromise(store).then(() => {
        return RemoteChannelResource.fetchCollection()
          .then(remoteChannels => {
            return store
              .dispatch('manageContent/wizard/getAllRemoteChannels', remoteChannels)
              .then(allChannels => resolve(allChannels));
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

  return ConditionalPromise.all([availableChannelsPromise, selectedDrivePromise]).only(
    samePageCheckGenerator(store),
    function onSuccess([availableChannels, selectedDrive]) {
      store.commit('manageContent/wizard/HYDRATE_SHOW_AVAILABLE_CHANNELS_PAGE', {
        availableChannels,
        selectedDrive,
        transferType,
      });
      store.commit('CORE_SET_PAGE_LOADING', false);
    },
    function onFailure(error) {
      store.commit('CORE_SET_PAGE_LOADING', false);
      return handleError(store, error);
    }
  );
}

/**
 * Handler for going to Select Content Page URL directly
 * params are { channel_id: string, drive_id?: string, for_export?: boolean },
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
  store.commit('coreBase/SET_APP_BAR_TITLE', translator.$tr('loadingChannelToolbar'));

  if (transferType === null) {
    return router.replace(manageContentPageLink());
  }

  // HACK if going directly to URL, we make sure channelList has this channel at the minimum.
  // We only get the one channel, since GETing /api/channel with file sizes is slow.
  // We let it fail silently, since it is only used to show "on device" files/resources.
  const installedChannelPromise = getChannelWithContentSizes(params.channel_id)
    .then(channel => {
      if (store.state.manageContent.channelList.length === 0) {
        store.commit('manageContent/SET_CHANNEL_LIST', [channel]);
      }
    })
    .catch(() => {});

  if (transferType === TransferTypes.LOCALEXPORT) {
    selectedDrivePromise = getSelectedDrive(store, drive_id);
    availableSpacePromise = selectedDrivePromise.then(drive => getAvailableSpaceOnDrive(drive));
    transferredChannelPromise = new Promise((resolve, reject) => {
      getChannelWithContentSizes(params.channel_id)
        .then(channel => {
          resolve({ ...channel });
        })
        .catch(() => {
          reject({ error: ContentWizardErrors.CHANNEL_NOT_FOUND_ON_SERVER });
        });
    });
  }

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
          channels => {
            resolve({ ...channels[0] });
          },
          () => reject({ error: ContentWizardErrors.CHANNEL_NOT_FOUND_ON_STUDIO })
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

  return ConditionalPromise.all([
    selectedDrivePromise,
    transferredChannelPromise,
    availableSpacePromise,
    installedChannelPromise,
  ]).only(
    samePageCheckGenerator(store),
    function onSuccess([selectedDrive, transferredChannel, availableSpace]) {
      store.commit('manageContent/wizard/HYDRATE_SELECT_CONTENT_PAGE', {
        availableSpace,
        selectedDrive,
        transferType,
        transferredChannel,
      });
      store.commit('CORE_SET_PAGE_LOADING', false);

      const isSamePage = samePageCheckGenerator(store);
      return loadChannelMetadata(store).then(() => {
        if (isSamePage()) {
          return updateTreeViewTopic(store, {
            id: store.state.manageContent.wizard.transferredChannel.root,
            title: transferredChannel.name,
          }).then(() => {});
        }
      });
    },
    function onFailure(error) {
      store.commit('CORE_SET_PAGE_LOADING', false);
      return handleError(store, error);
    }
  );
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
  if (store.getters['manageContent/wizard/inExportMode']) {
    fetchArgs.for_export = 'true';
  }
  store.commit('CORE_SET_PAGE_LOADING', true);
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
        ContentWizardErrors.TREEVIEW_LOADING_ERROR
      );
    })
    .then(() => {
      store.commit('CORE_SET_PAGE_LOADING', false);
    });
}
