import { RemoteChannelResource } from 'kolibri.resources';
import { ContentWizardPages, TransferTypes } from '../../constants';
import { driveChannelList, installedChannelList, wizardState } from '../getters';
import router from 'kolibri.coreVue.router';
import differenceBy from 'lodash/differenceBy';

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
      .fetch({}, true)
      ._promise.then(publicChannels => {
        return getAllRemoteChannels(store, publicChannels);
      })
      .then(allChannels => {
        setAvailableChannels(allChannels);
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

/**
 * HACK: Makes a request to Kolibri Studio to get info on unlisted channels, then appends
 * them to the public channels. This hack is to get around the fact that the ChannelMetadata object
 * does not indicate the origins of a channel: whether a remote public, remote unlisted, or bespoke channel
 * from USB, the ChannelMetadata is identical.
 *
 * @param {Array<Channel>} publicChannels - the list of publich channels, which will not be queried
 * @returns {Promise<Array<Channel>>}
 */
export function getAllRemoteChannels(store, publicChannels) {
  const installedChannels = installedChannelList(store.state);
  const potentiallyUnlisted = differenceBy(installedChannels, publicChannels, 'id').filter(
    channel => channel.on_device_resources > 0
  );
  const promises = potentiallyUnlisted.map(channel =>
    getRemoteChannelByToken(channel.id)
      .then(([channel]) => Promise.resolve(channel))
      .catch(() => Promise.resolve())
  );
  return Promise.all(promises).then(unlisted => {
    return [...unlisted.filter(Boolean), ...publicChannels];
  });
}
