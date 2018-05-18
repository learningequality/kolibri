import isEmpty from 'lodash/isEmpty';
import find from 'lodash/find';
import { samePageCheckGenerator } from 'kolibri.coreVue.vuex.actions';
import { RemoteChannelResource } from 'kolibri.resources';
import router from 'kolibri.coreVue.router';
import { ContentWizardPages as PageNames, TransferTypes } from '../../constants';
import {
  loadChannelMetaData,
  showSelectContentPage,
  updateTreeViewTopic,
} from './selectContentActions';
import { cancelTask, refreshDriveList } from './taskActions';
import { refreshChannelList } from './manageContentActions';
import { getAllRemoteChannels } from './availableChannelsActions';

export const CANCEL = 'cancel';
export const FORWARD = 'forward';
export const BACKWARD = 'backward';
export const LOCAL_DRIVE = 'local';
export const KOLIBRI_STUDIO = 'network';

/**
 * State machine for the Import/Export wizards.
 * Only handles forward, backward, and cancel transitions.
 *
 * @param store - vuex store object
 * @param {string} transition - 'forward' or 'cancel'
 * @param {Object} params - data needed to execute transition
 * @returns {Promise}
 *
 */
export function transitionWizardPage(store, transition, params) {
  const wizardPage = store.state.pageState.wizardState.pageName;

  function _updatePageName(pageName) {
    store.dispatch('SET_WIZARD_PAGENAME', pageName);
  }

  function _updateTransferType(transferType) {
    store.dispatch('SET_TRANSFER_TYPE', transferType);
  }

  if (transition === CANCEL) {
    store.dispatch('SET_TRANSFERRED_CHANNEL', {});
    return _updatePageName('');
  }

  const { transferredChannel } = store.state.pageState.wizardState;
  const { pageName } = store.state;

  // AT LANDING PAGE
  // Forward with params : { import : Boolean }
  if (wizardPage === '') {
    if (params.import) {
      _updatePageName(PageNames.SELECT_IMPORT_SOURCE);
    } else {
      _updateTransferType(TransferTypes.LOCALEXPORT);
      _updatePageName(PageNames.SELECT_DRIVE);
    }
    return Promise.resolve();
  }

  // At SELECT_IMPORT_SOURCE
  // Forward with params : { source : 'local' | 'network' }
  if (wizardPage === PageNames.SELECT_IMPORT_SOURCE && transition === FORWARD) {
    const { source } = params;
    if (source === LOCAL_DRIVE) {
      _updateTransferType(TransferTypes.LOCALIMPORT);
      _updatePageName(PageNames.SELECT_DRIVE);
      return Promise.resolve();
    }
    if (source === KOLIBRI_STUDIO) {
      _updateTransferType(TransferTypes.REMOTEIMPORT);
      // From top-level import workflow
      if (isEmpty(transferredChannel)) {
        _updatePageName(PageNames.AVAILABLE_CHANNELS);
        return router.push({
          name: 'GOTO_AVAILABLE_CHANNELS_PAGE_DIRECTLY',
        });
      }
      // From import-more-from-channel workflow
      return loadChannelMetaData(store);
    }
  }

  // At SELECT_DRIVE
  // Forward with params : { driveId }
  if (wizardPage === PageNames.SELECT_DRIVE && transition === FORWARD) {
    store.dispatch('SET_SELECTED_DRIVE', params.driveId);
    // From top-level import workflow
    if (isEmpty(transferredChannel)) {
      _updatePageName(PageNames.AVAILABLE_CHANNELS);
      return router.push({
        name: 'GOTO_AVAILABLE_CHANNELS_PAGE_DIRECTLY',
        query: {
          drive_id: params.driveId,
          for_export: store.state.pageState.wizardState.transferType === TransferTypes.LOCALEXPORT,
        },
      });
    }
    // From import-more-from-channel workflow
    return loadChannelMetaData(store);
  }

  // At AVAILABLE_CHANNELS
  // Forward with params: { channel }
  if (pageName === PageNames.AVAILABLE_CHANNELS && transition === FORWARD) {
    store.dispatch('SET_TRANSFERRED_CHANNEL', params.channel);
    return loadChannelMetaData(store);
  }

  // At LOADING_CHANNEL_METADATA
  // Forward
  if (wizardPage === PageNames.LOADING_CHANNEL_METADATA && transition === FORWARD) {
    return showSelectContentPage(store);
  }

  // At LOADING_CHANNEL_METADATA
  // Backward
  if (wizardPage === PageNames.LOADING_CHANNEL_METADATA && transition === BACKWARD) {
    return cancelTask(store, store.state.pageState.taskList[0].id).then(() => {
      store.dispatch('RESET_WIZARD_STATE_FOR_AVAILABLE_CHANNELS');
    });
  }

  // AT SELECT_CONTENT, going backwards
  if (pageName === PageNames.SELECT_CONTENT && transition === BACKWARD) {
    store.dispatch('RESET_WIZARD_STATE_FOR_AVAILABLE_CHANNELS');
    return Promise.resolve();
  }

  return Promise.resolve();
}

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

// Utilities for the show*Directly actions
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

  store.dispatch('CORE_SET_PAGE_LOADING', true);
  // HACK have to set the wizardName for state machine to work as-is
  store.dispatch('SET_WIZARD_PAGENAME', PageNames.AVAILABLE_CHANNELS);

  const transferType = getTransferType(params);

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
        .fetch()
        .then(
          ([channel]) => {
            resolve({ ...channel });
          },
          () => reject({ error: 'channel_not_found_on_studio' })
        );
    });
  }

  const isSamePage = samePageCheckGenerator(store);

  return Promise.all([selectedDrivePromise, transferredChannelPromise]).then(promises => {
    const [selectedDrive, transferredChannel] = promises;

    if (isSamePage()) {
      store.dispatch('SET_SELECTED_DRIVE', selectedDrive.id);
      store.dispatch('SET_TRANSFERRED_CHANNEL', { ...transferredChannel });
      store.dispatch('SET_TRANSFER_TYPE', transferType);
      store.dispatch('SET_PAGE_NAME', PageNames.SELECT_CONTENT);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      return loadChannelMetaData(store).then(() => {
        return updateTreeViewTopic(store, {
          pk: store.state.pageState.wizardState.transferredChannel.root,
          title: transferredChannel.name,
        });
      });
    }
  });
}
