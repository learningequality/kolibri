import isEmpty from 'lodash/isEmpty';
import find from 'lodash/find';
import { samePageCheckGenerator } from 'kolibri.coreVue.vuex.actions';
import { RemoteChannelResource, ChannelResource } from 'kolibri.resources';
import router from 'kolibri.coreVue.router';
import { ContentWizardPages as PageNames, TransferTypes } from '../../constants';
import { loadChannelMetaData, updateTreeViewTopic } from './selectContentActions';
import { refreshDriveList } from './taskActions';
import { refreshChannelList } from './manageContentActions';
import { getAllRemoteChannels } from './availableChannelsActions';

export const LOCAL_DRIVE = 'local';
export const KOLIBRI_STUDIO = 'network';

export function setWizardPageName(store, pageName) {
  store.dispatch('SET_WIZARD_PAGENAME', pageName);
}

export function setTransferType(store, transferType) {
  store.dispatch('SET_TRANSFER_TYPE', transferType);
}

export function setTransferredChannel(store, channel) {
  store.dispatch('SET_TRANSFERRED_CHANNEL', channel);
}

export function startImportWorkflow(store, channel) {
  channel && setTransferredChannel(store, channel);
  setWizardPageName(store, PageNames.SELECT_IMPORT_SOURCE);
}

export function startExportWorkflow(store) {
  setTransferType(store, TransferTypes.LOCALEXPORT);
  setWizardPageName(store, PageNames.SELECT_DRIVE);
}

// Cancels wizard and resets wizardState
export function cancelContentTransferWizard(store) {
  store.dispatch('SET_TRANSFERRED_CHANNEL', {});
  setTransferType(store, '');
  return setWizardPageName(store, '');
}

// Forward from SELECT_IMPORT -> SELECT_DRIVE or AVAILABLE_CHANNELS
export function goForwardFromSelectImportSourceModal(store, source) {
  const { transferredChannel } = store.state.pageState.wizardState;

  if (source === LOCAL_DRIVE) {
    setTransferType(store, TransferTypes.LOCALIMPORT);
    setWizardPageName(store, PageNames.SELECT_DRIVE);
  }

  if (source === KOLIBRI_STUDIO) {
    setTransferType(store, TransferTypes.REMOTEIMPORT);
    // From top-level import workflow
    if (isEmpty(transferredChannel)) {
      return router.push({
        name: 'GOTO_AVAILABLE_CHANNELS_PAGE_DIRECTLY',
      });
    }
    // From import-more-from-channel workflow
    return router.push({
      name: 'GOTO_SELECT_CONTENT_PAGE_DIRECTLY',
      params: {
        channel_id: transferredChannel.id,
      },
    });
  }
}

// Forward from SELECT_DRIVE -> AVAILABLE_CHANNELS or SELECT_CONTENT
export function goForwardFromSelectDriveModal(store, { driveId, forExport }) {
  const { transferredChannel } = store.state.pageState.wizardState;
  // From top-level import/export workflow
  if (isEmpty(transferredChannel)) {
    setWizardPageName(store, PageNames.AVAILABLE_CHANNELS);
    return router.push({
      name: 'GOTO_AVAILABLE_CHANNELS_PAGE_DIRECTLY',
      query: {
        drive_id: driveId,
        for_export: forExport,
      },
    });
  }
  // From import-more-from-channel workflow
  setWizardPageName(store, PageNames.SELECT_CONTENT);
  return router.push({
    name: 'GOTO_SELECT_CONTENT_PAGE_DIRECTLY',
    params: {
      channel_id: transferredChannel.id,
    },
    query: {
      drive_id: driveId,
    },
  });
}

// Utilities for the show*Directly actions
function getSelectedDrive(store, driveId) {
  return new Promise((resolve, reject) => {
    refreshDriveList(store).then(driveList => {
      const drive = find(driveList, { id: driveId });
      if (drive) {
        // TODO does not check to see if drive is (not) writeable, depending on workflow
        resolve({ ...drive });
      } else {
        reject(Error('drive_not_found'));
      }
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

// Handler for when user goes directly to the Available Channels URL
// params { drive_id?: string, for_export?: boolean }
// are normalized at the router handler function
export function showAvailableChannelsPageDirectly(store, params) {
  let selectedDrivePromise = Promise.resolve({});
  let availableChannelsPromise;
  const transferType = getTransferType(params);

  store.dispatch('CORE_SET_PAGE_LOADING', true);

  if (transferType === null) {
    return Promise.reject({ error: 'invalid_parameters' });
  }

  if (transferType === TransferTypes.LOCALEXPORT) {
    selectedDrivePromise = getSelectedDrive(store, params.drive_id);
    availableChannelsPromise = getInstalledChannelsPromise(store);
  }

  if (transferType === TransferTypes.LOCALIMPORT) {
    selectedDrivePromise = getSelectedDrive(store, params.drive_id);
    availableChannelsPromise = selectedDrivePromise.then(drive => {
      return [...drive.metadata.channels];
    });
  }

  if (transferType === TransferTypes.REMOTEIMPORT) {
    availableChannelsPromise = new Promise((resolve, reject) => {
      getInstalledChannelsPromise(store).then(() => {
        return RemoteChannelResource.getCollection()
          .fetch()
          ._promise.then(channels => {
            return getAllRemoteChannels(store, channels).then(allChannels => resolve(allChannels));
          })
          .catch(() => reject({ error: 'kolibri_studio_unavailable' }));
      });
    });
  }

  const isSamePage = samePageCheckGenerator(store);

  return Promise.all([availableChannelsPromise, selectedDrivePromise]).then(
    ([availableChannels, selectedDrive]) => {
      // Hydrate wizardState as if user went through UI workflow
      if (isSamePage()) {
        store.dispatch('SET_AVAILABLE_CHANNELS', availableChannels);
        store.dispatch('SET_SELECTED_DRIVE', selectedDrive.id);
        store.dispatch('SET_TRANSFER_TYPE', transferType);
        store.dispatch('SET_PAGE_NAME', PageNames.AVAILABLE_CHANNELS);
        store.dispatch('CORE_SET_PAGE_LOADING', false);
      }
    }
  );
}

/**
 * Handler for going to Select Content Page URL directly
 * params are { channel_id: string, drive_id?: string, for_export?: boolean },
 * which are normalized at router handler function
 */
export function showSelectContentPageDirectly(store, params) {
  let selectedDrivePromise = Promise.resolve({});
  let transferredChannelPromise;
  const { drive_id, channel_id } = params;
  const transferType = getTransferType(params);
  // HACK if going directly to URL, make sure channel list has this channel at the minimum.
  // We only get the one channel, since GETing channel-list with file sizes is slow.
  const installedChannelPromise = ChannelResource.getModel(params.channel_id)
    .fetch({ file_sizes: true }, true)
    .then(channel => {
      if (store.state.pageState.channelList.length === 0) {
        store.dispatch('SET_CHANNEL_LIST', [channel]);
      }
    })
    .catch(() => {});

  if (transferType === null) {
    return Promise.reject({ error: 'invalid_parameters' });
  }

  if (transferType === TransferTypes.LOCALEXPORT) {
    selectedDrivePromise = getSelectedDrive(store, drive_id);
    transferredChannelPromise = new Promise((resolve, reject) => {
      getInstalledChannelsPromise(store).then(channels => {
        const match = find(channels, { id: channel_id });
        if (match) {
          resolve({ ...match });
        } else {
          reject({ error: 'channel_not_found_on_server' });
        }
      });
    });
  }

  if (transferType === TransferTypes.LOCALIMPORT) {
    selectedDrivePromise = getSelectedDrive(store, drive_id);
    transferredChannelPromise = new Promise((resolve, reject) => {
      selectedDrivePromise.then(drive => {
        const match = find(drive.metadata.channels, { id: channel_id });
        if (match) {
          resolve({ ...match });
        } else {
          reject({ error: 'channel_not_found_on_drive' });
        }
      });
    });
  }

  if (transferType === TransferTypes.REMOTEIMPORT) {
    transferredChannelPromise = new Promise((resolve, reject) => {
      RemoteChannelResource.getModel(channel_id)
        // Force fetching because using cached version switches
        // between returning an array and returning an object
        .fetch({}, true)
        .then(
          channels => {
            resolve({ ...channels[0] });
          },
          () => reject({ error: 'channel_not_found_on_studio' })
        );
    });
  }

  let isSamePage = samePageCheckGenerator(store);

  return Promise.all([
    selectedDrivePromise,
    transferredChannelPromise,
    installedChannelPromise,
  ]).then(promises => {
    const [selectedDrive, transferredChannel] = promises;

    if (isSamePage()) {
      store.dispatch('SET_SELECTED_DRIVE', selectedDrive.id);
      store.dispatch('SET_TRANSFERRED_CHANNEL', { ...transferredChannel });
      store.dispatch('SET_TRANSFER_TYPE', transferType);
      store.dispatch('SET_PAGE_NAME', PageNames.SELECT_CONTENT);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      isSamePage = samePageCheckGenerator(store);
      return loadChannelMetaData(store).then(() => {
        if (isSamePage()) {
          return updateTreeViewTopic(store, {
            pk: store.state.pageState.wizardState.transferredChannel.root,
            title: transferredChannel.name,
          });
        }
      });
    }
  });
}
