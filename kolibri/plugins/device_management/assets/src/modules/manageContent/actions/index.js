import { ContentWizardPages, TransferTypes } from '../../../constants';
import ChannelResource from '../../../apiResources/deviceChannel';
import * as taskActions from './taskActions';

function refreshChannelList(store) {
  store.commit('SET_CHANNEL_LIST_LOADING', true);
  return ChannelResource.fetchCollection({
    force: true,
  }).then(channels => {
    store.commit('SET_CHANNEL_LIST', [...channels]);
    store.commit('SET_CHANNEL_LIST_LOADING', false);
    return [...channels];
  });
}

function startImportWorkflow(store, channel) {
  if (channel) {
    store.commit('wizard/SET_TRANSFERRED_CHANNEL', channel);
  }
  store.commit('wizard/SET_WIZARD_PAGENAME', ContentWizardPages.SELECT_IMPORT_SOURCE);
}

function startExportWorkflow(store) {
  store.commit('wizard/SET_TRANSFER_TYPE', TransferTypes.LOCALEXPORT);
  store.commit('wizard/SET_WIZARD_PAGENAME', ContentWizardPages.SELECT_DRIVE);
}

export default {
  ...taskActions,
  refreshChannelList,
  startImportWorkflow,
  startExportWorkflow,
};
