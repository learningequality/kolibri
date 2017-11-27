import { RemoteChannelResource } from 'kolibri.resources';
import { ContentWizardPages, TransferTypes } from '../../constants';
import { driveChannelList, installedChannelList, wizardState } from '../getters';
import router from 'kolibri.coreVue.router';

/**
 * Prepares the Available Channels Page for import/export flows
 *
 */
export function showAvailableChannelsPage(store) {
  router.push({
    name: 'GOTO_AVAILABLE_CHANNELS_PAGE',
  });
  store.dispatch('SET_WIZARD_PAGENAME', ContentWizardPages.AVAILABLE_CHANNELS);
  const { transferType, selectedDrive } = wizardState(store.state);
  const setAvailableChannels = store.dispatch.bind(null, 'SET_AVAILABLE_CHANNELS');

  // REMOTEIMPORT -> get Available Channels from RemoteChannel API
  if (transferType === TransferTypes.REMOTEIMPORT) {
    store.dispatch('SET_WIZARD_STATUS', 'LOADING_CHANNELS_FROM_KOLIBRI_STUDIO');
    return RemoteChannelResource.getCollection()
      .fetch()
      .then(publicChannels => {
        setAvailableChannels(publicChannels);
        store.dispatch('SET_WIZARD_STATUS', '');
      });
  }

  // LOCALIMPORT -> get Available Channels from selected drive's metadata
  if (transferType === TransferTypes.LOCALIMPORT) {
    setAvailableChannels(driveChannelList(store.state)(selectedDrive.id));
  }

  // LOCALEXPORT -> get Available Channels from store
  if (transferType === TransferTypes.LOCALEXPORT) {
    setAvailableChannels(installedChannelList(store.state));
  }
  return Promise.resolve();
}

/**
 * Makes request to RemoteChannel API with a token. Does not actually interact
 * with Vuex store.
 *
 * @param {string} token -
 * @returns Promise
 */
export function getRemoteChannelByToken(token) {
  return RemoteChannelResource.getModel(token).fetch()._promise;
}
