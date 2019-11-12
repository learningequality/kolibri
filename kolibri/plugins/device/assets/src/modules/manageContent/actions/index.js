import { ContentWizardPages } from '../../../constants';
import ChannelResource from '../../../apiResources/deviceChannel';
import * as taskActions from './taskActions';

function refreshChannelList(store) {
  store.commit('SET_CHANNEL_LIST_LOADING', true);
  return ChannelResource.fetchCollection({
    getParams: { include_fields: 'on_device_file_size' },
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

export default {
  ...taskActions,
  refreshChannelList,
  startImportWorkflow,
};
