import { ContentWizardPages as PageNames, TransferTypes } from '../../constants';
import { showAvailableChannelsPage } from './availableChannelsActions';
import { loadChannelMetaData, showSelectContentPage } from './selectContentActions';
import { cancelTask } from './taskActions';

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
  const CANCEL = 'cancel';
  const FORWARD = 'forward';
  const BACKWARD = 'backward';
  const LOCAL_DRIVE = 'local';
  const KOLIBRI_STUDIO = 'network';

  function _updatePageName(pageName) {
    store.dispatch('SET_WIZARD_PAGENAME', pageName);
  }

  function _updateTransferType(transferType) {
    store.dispatch('SET_TRANSFER_TYPE', transferType);
  }

  if (transition === CANCEL) {
    return _updatePageName('');
  }

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
      return showAvailableChannelsPage(store);
    }
  }

  // At SELECT_DRIVE
  // Forward with params : { driveId }
  if (wizardPage === PageNames.SELECT_DRIVE && transition === FORWARD) {
    store.dispatch('SET_SELECTED_DRIVE', params.driveId);
    return showAvailableChannelsPage(store);
  }

  // At AVAILABLE_CHANNELS
  // Forward with params: { channel }
  if (wizardPage === PageNames.AVAILABLE_CHANNELS && transition === FORWARD) {
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
  if (wizardPage === PageNames.SELECT_CONTENT && transition === BACKWARD) {
    store.dispatch('RESET_WIZARD_STATE_FOR_AVAILABLE_CHANNELS');
    return Promise.resolve();
  }

  return Promise.resolve();
}
