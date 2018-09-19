import find from 'lodash/find';
import ConditionalPromise from 'kolibri.lib.conditionalPromise';
import { handleApiError, samePageCheckGenerator } from 'kolibri.coreVue.vuex.actions';
import { RemoteChannelResource } from 'kolibri.resources';
import router from 'kolibri.coreVue.router';
import { createTranslator } from 'kolibri.utils.i18n';
import { ContentWizardPages, ContentWizardErrors, TransferTypes } from '../../constants';
import {
  availableChannelsPageLink,
  selectContentPageLink,
  manageContentPageLink,
} from '../../views/manage-content-page/manageContentLinks';
import ChannelResource from '../../apiResources/deviceChannel';
import { isImportingMore } from '../getters';
import {
  getAvailableSpaceOnDrive,
  loadChannelMetaData,
  updateTreeViewTopic,
} from './selectContentActions';
import { refreshDriveList } from './taskActions';
import { refreshChannelList, setToolbarTitle } from './manageContentActions';
import { getAllRemoteChannels } from './availableChannelsActions';

const translator = createTranslator('contentWizardTexts', {
  loadingChannelsToolbar: 'Loading channels…',
  loadingChannelToolbar: 'Loading channel…',
  availableChannelsOnDrive: "Available Channels on '{driveName}'",
  availableChannelsOnStudio: 'Available Channels on Kolibri Studio',
  availableChannelsOnDevice: 'Available Channels on this device',
  selectContentFromChannel: "Select Content from '{channelName}'",
});

export const LOCAL_DRIVE = 'local';
export const KOLIBRI_STUDIO = 'network';

// TODO move wizardState.pageName out of Vuex into local state
export function setWizardPageName(store, pageName) {
  store.dispatch('SET_WIZARD_PAGENAME', pageName);
}

export function setTransferType(store, transferType) {
  store.dispatch('SET_TRANSFER_TYPE', transferType);
}

export function setTransferredChannel(store, channel) {
  store.dispatch('SET_TRANSFERRED_CHANNEL', { ...channel });
}

export function startImportWorkflow(store, channel) {
  channel && setTransferredChannel(store, channel);
  setWizardPageName(store, ContentWizardPages.SELECT_IMPORT_SOURCE);
}

export function startExportWorkflow(store) {
  setTransferType(store, TransferTypes.LOCALEXPORT);
  setWizardPageName(store, ContentWizardPages.SELECT_DRIVE);
}

// Cancels wizard and resets wizardState
export function resetContentWizardState(store) {
  store.dispatch('RESET_CONTENT_WIZARD_STATE');
}

// Provide a intermediate state before Available Channels is fully-loaded
function prepareForAvailableChannelsPage(store) {
  setToolbarTitle(store, translator.$tr('loadingChannelsToolbar'));
  store.dispatch('SET_PAGE_NAME', ContentWizardPages.AVAILABLE_CHANNELS);
}

// Forward from SELECT_IMPORT -> SELECT_DRIVE or AVAILABLE_CHANNELS
export function goForwardFromSelectImportSourceModal(store, source) {
  const { transferredChannel } = store.state.pageState.wizardState;

  if (source === LOCAL_DRIVE) {
    setTransferType(store, TransferTypes.LOCALIMPORT);
    setWizardPageName(store, ContentWizardPages.SELECT_DRIVE);
  }

  if (source === KOLIBRI_STUDIO) {
    setTransferType(store, TransferTypes.REMOTEIMPORT);
    if (isImportingMore(store.state)) {
      // From import-more-from-channel workflow
      return router.push(selectContentPageLink({ channelId: transferredChannel.id }));
    }
    // From top-level import workflow
    prepareForAvailableChannelsPage(store);
    return router.push(availableChannelsPageLink());
  }
}

// Forward from SELECT_DRIVE -> AVAILABLE_CHANNELS or SELECT_CONTENT
export function goForwardFromSelectDriveModal(store, { driveId, forExport }) {
  const { transferredChannel } = store.state.pageState.wizardState;
  // From import-more-from-channel workflow
  if (isImportingMore(store.state)) {
    setWizardPageName(store, ContentWizardPages.SELECT_CONTENT);
    return router.push(
      selectContentPageLink({ channelId: transferredChannel.id, driveId, forExport })
    );
  }
  // From top-level import/export workflow
  prepareForAvailableChannelsPage(store);
  return router.push(availableChannelsPageLink({ driveId, forExport }));
}

// Utilities for the show*Page actions
function getSelectedDrive(store, driveId) {
  const { transferType } = store.state.pageState.wizardState;
  return new Promise((resolve, reject) => {
    refreshDriveList(store)
      .then(driveList => {
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
  const { channelList } = store.state.pageState;
  // Only refresh channel list if it hasn't been fetched yet (i.e. user went straight to URL)
  if (channelList.length === 0) {
    return refreshChannelList(store);
  } else {
    return Promise.resolve([...channelList]);
  }
}

function getTransferType(params) {
  const { for_export, drive_id } = params;
  // invalid combination
  if (for_export && !drive_id) {
    return null;
  }
  if (drive_id) {
    return for_export ? TransferTypes.LOCALEXPORT : TransferTypes.LOCALIMPORT;
  } else {
    return TransferTypes.REMOTEIMPORT;
  }
}

function handleError(store, error) {
  const { error: errorType } = error;
  // special errors that are handled gracefully by UI
  if (errorType) {
    return store.dispatch('SET_WIZARD_STATUS', errorType);
  }
  // handle other errors generically
  handleApiError(store, error);
  return resetContentWizardState(store);
}

// Handler for when user goes directly to the Available Channels URL.
// Params are { drive_id?: string, for_export?: boolean }
export function showAvailableChannelsPage(store, params) {
  let availableChannelsPromise;
  let selectedDrivePromise;
  let pageTitle;
  const transferType = getTransferType(params);

  store.dispatch('SET_PAGE_NAME', ContentWizardPages.AVAILABLE_CHANNELS);
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  resetContentWizardState(store);

  if (transferType === null) {
    return router.replace(manageContentPageLink());
  }

  if (transferType === TransferTypes.LOCALEXPORT) {
    selectedDrivePromise = getSelectedDrive(store, params.drive_id);
    availableChannelsPromise = getInstalledChannelsPromise(store).then(channels =>
      channels.filter(c => c.available)
    );
    pageTitle = translator.$tr('availableChannelsOnDevice');
  }

  if (transferType === TransferTypes.LOCALIMPORT) {
    selectedDrivePromise = getSelectedDrive(store, params.drive_id);
    availableChannelsPromise = selectedDrivePromise.then(drive => {
      pageTitle = translator.$tr('availableChannelsOnDrive', { driveName: drive.name });
      return [...drive.metadata.channels];
    });
  }

  if (transferType === TransferTypes.REMOTEIMPORT) {
    selectedDrivePromise = Promise.resolve({});
    availableChannelsPromise = new Promise((resolve, reject) => {
      getInstalledChannelsPromise(store).then(() => {
        return RemoteChannelResource.getCollection()
          .fetch()
          ._promise.then(channels => {
            return getAllRemoteChannels(store, channels).then(allChannels => resolve(allChannels));
          })
          .catch(() => reject({ error: ContentWizardErrors.KOLIBRI_STUDIO_UNAVAILABLE }));
      });
    });
    pageTitle = translator.$tr('availableChannelsOnStudio');
  }

  return ConditionalPromise.all([availableChannelsPromise, selectedDrivePromise]).only(
    samePageCheckGenerator(store),
    function onSuccess([availableChannels, selectedDrive]) {
      store.dispatch('HYDRATE_SHOW_AVAILABLE_CHANNELS_PAGE', {
        availableChannels,
        selectedDrive,
        transferType,
      });
      store.dispatch('CORE_SET_TITLE', pageTitle);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    },
    function onFailure(error) {
      store.dispatch('CORE_SET_PAGE_LOADING', false);
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

  store.dispatch('RESET_CONTENT_WIZARD_STATE');
  store.dispatch('SET_PAGE_NAME', ContentWizardPages.SELECT_CONTENT);
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  setToolbarTitle(store, translator.$tr('loadingChannelToolbar'));

  if (transferType === null) {
    return router.replace(manageContentPageLink());
  }

  // HACK if going directly to URL, we make sure channelList has this channel at the minimum.
  // We only get the one channel, since GETing /api/channel with file sizes is slow.
  // We let it fail silently, since it is only used to show "on device" files/resources.
  // eslint-disable-next-line
  const installedChannelPromise = ChannelResource.getModel(params.channel_id)
    .fetch(
      {
        include_fields: [
          'total_resources',
          'total_file_size',
          'on_device_resources',
          'on_device_file_size',
        ],
      },
      true
    )
    .then(channel => {
      if (store.state.pageState.channelList.length === 0) {
        store.dispatch('SET_CHANNEL_LIST', [channel]);
      }
    })
    .catch(() => {});

  if (transferType === TransferTypes.LOCALEXPORT) {
    selectedDrivePromise = getSelectedDrive(store, drive_id);
    availableSpacePromise = selectedDrivePromise.then(drive => getAvailableSpaceOnDrive(drive));
    transferredChannelPromise = new Promise((resolve, reject) => {
      getInstalledChannelsPromise(store).then(channels => {
        const match = find(channels, { id: channel_id });
        if (match) {
          resolve({ ...match });
        } else {
          reject({ error: ContentWizardErrors.CHANNEL_NOT_FOUND_ON_SERVER });
        }
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
      RemoteChannelResource.getModel(channel_id)
        // Force fetching because using cached version switches
        // between returning an array and returning an object
        .fetch({}, true)
        .then(
          channels => {
            resolve({ ...channels[0] });
          },
          () => reject({ error: ContentWizardErrors.CHANNEL_NOT_FOUND_ON_STUDIO })
        );
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
      store.dispatch('HYDRATE_SELECT_CONTENT_PAGE', {
        availableSpace,
        selectedDrive,
        transferType,
        transferredChannel,
      });
      store.dispatch(
        'CORE_SET_TITLE',
        translator.$tr('selectContentFromChannel', { channelName: transferredChannel.name })
      );
      store.dispatch('CORE_SET_PAGE_LOADING', false);

      const isSamePage = samePageCheckGenerator(store);
      return loadChannelMetaData(store).then(() => {
        if (isSamePage()) {
          return updateTreeViewTopic(store, {
            id: store.state.pageState.wizardState.transferredChannel.root,
            title: transferredChannel.name,
          }).then(() => {});
        }
      });
    },
    function onFailure(error) {
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      return handleError(store, error);
    }
  );
}
