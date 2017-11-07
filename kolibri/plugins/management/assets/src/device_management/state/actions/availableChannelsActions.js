import { RemoteChannelResource } from 'kolibri.resources';
import { ContentWizardPages, TransferTypes } from '../../constants';
import { driveChannelList, installedChannelList } from '../getters';
import { MutationTypes as Mutations } from '../mutations/contentWizardMutations';

/**
 * Prepares the Available Channels Page for import/export flows
 *
 * @param {Object} store -
 * @param {TransferType} options.transferType -
 * @param {Drive?} options.drive -
 *
 */
export function showAvailableChannelsPage(store, options) {
  const { transferType, drive } = options;
  let source;
  let destination;

  if (drive && transferType === TransferTypes.LOCALEXPORT) {
    source = {},
    destination = drive;
  } else if (drive && transferType === TransferTypes.LOCALIMPORT) {
    source = drive;
    destination = {};
  } else {
    source = { type: 'NETWORK_SOURCE', baseUrl: '' };
    destination = {};
  }

  store.dispatch(Mutations.SET_CONTENT_PAGE_WIZARD_PAGENAME, ContentWizardPages.AVAILABLE_CHANNELS);
  store.dispatch(Mutations.SET_CONTENT_PAGE_WIZARD_META, { transferType, source, destination });

  const setChannels = store.dispatch.bind(null, Mutations.SET_AVAILABLE_CHANNELS);

  // REMOTEIMPORT -> get Available Channels from RemoteChannel API
  if (transferType === TransferTypes.REMOTEIMPORT) {
    return RemoteChannelResource.getCollection()
      .fetch()
      .then(publicChannels => {
        setChannels(publicChannels);
      });
  }

  // LOCALIMPORT -> get Available Channels from selected drive's metadata
  if (transferType === TransferTypes.LOCALIMPORT) {
    setChannels(driveChannelList(store.state)(source.driveId));
  }

  // LOCALEXPORT -> get Available Channels from store
  if (transferType === TransferTypes.LOCALEXPORT) {
    setChannels(installedChannelList(store.state));
  }
  return Promise.resolve();
}
