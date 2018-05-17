import isEmpty from 'lodash/isEmpty';
import find from 'lodash/find';
import { RemoteChannelResource } from 'kolibri.resources';
import { ContentWizardPages as PageNames, TransferTypes } from '../../constants';
import { showAvailableChannelsPage } from './availableChannelsActions';
import { loadChannelMetaData, showSelectContentPage } from './selectContentActions';
import { cancelTask, refreshDriveList } from './taskActions';
import { refreshChannelList } from './manageContentActions';

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
        return showAvailableChannelsPage(store);
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
      return showAvailableChannelsPage(store);
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

// Handler for when user goes directly to the Available Channels URL
// params { drive_id?: string, for_export?: boolean }
// are normalized at the router handler function
export function showAvailableChannelsPageDirectly(store, params) {
  let transferType;
  let selectedDrivePromise = Promise.resolve({});
  let availableChannelsPromise;
  const { for_export, drive_id } = params;

  if (for_export && !drive_id) {
    return Promise.reject({ type: 'invalid_parameters' });
  }

  // Importing or Exporting from a drive
  if (drive_id) {
    selectedDrivePromise = new Promise((resolve, reject) => {
      refreshDriveList(store).then(driveList => {
        const drive = find(driveList, { id: drive_id });
        if (drive) {
          // TODO does not check to see if drive is (not) writeable, depending on workflow
          resolve({ ...drive });
        } else {
          reject({ type: 'drive_not_found' });
        }
      });
    });

    if (for_export) {
      transferType = TransferTypes.LOCALEXPORT;
      availableChannelsPromise = refreshChannelList(store);
    } else {
      transferType = TransferTypes.LOCALIMPORT;
      availableChannelsPromise = selectedDrivePromise.then(drive => {
        return [...drive.metadata.channels];
      });
    }
  } else {
    // Importing from Studio
    transferType = TransferTypes.REMOTEIMPORT;
    availableChannelsPromise = new Promise((resolve, reject) => {
      RemoteChannelResource.getCollection()
        .fetch()
        .then(channels => resolve([...channels]))
        .catch(() => reject({ type: 'kolibri_studio_unavailable' }));
    });
  }

  return Promise.all([availableChannelsPromise, selectedDrivePromise, transferType]).then(
    ([availableChannels, selectedDrive, transferType]) => {
      // Hydrate wizardState as if user went through UI workflow
      store.dispatch('SET_TRANSFER_TYPE', transferType);
      store.dispatch('SET_SELECTED_DRIVE', selectedDrive.id);
      store.dispatch('SET_AVAILABLE_CHANNELS', availableChannels);
      store.dispatch('SET_PAGE_NAME', PageNames.AVAILABLE_CHANNELS);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    }
  );
}
