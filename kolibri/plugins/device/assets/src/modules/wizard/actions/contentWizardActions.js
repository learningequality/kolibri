import router from 'kolibri.coreVue.router';
import { createTranslator } from 'kolibri.utils.i18n';
import { ContentSources, ContentWizardPages, TransferTypes } from '../../../constants';
import {
  availableChannelsPageLink,
  selectContentPageLink,
} from '../../../views/ManageContentPage/manageContentLinks';

const translator = createTranslator('ContentWizardTexts', {
  loadingChannelsToolbar: 'Loading channels…',
});

// Provide a intermediate state before Available Channels is fully-loaded
function prepareForAvailableChannelsPage(store) {
  store.commit('coreBase/SET_APP_BAR_TITLE', translator.$tr('loadingChannelsToolbar'), {
    root: true,
  });
  store.commit('SET_PAGE_NAME', ContentWizardPages.AVAILABLE_CHANNELS, { root: true });
}

// Forward from SELECT_IMPORT -> SELECT_DRIVE or AVAILABLE_CHANNELS
export function goForwardFromSelectImportSourceModal(store, source) {
  const { transferredChannel } = store.state;
  const { isImportingMore } = store.getters;

  if (source === ContentSources.LOCAL_DRIVE) {
    store.commit('SET_TRANSFER_TYPE', TransferTypes.LOCALIMPORT);
    store.commit('SET_WIZARD_PAGENAME', ContentWizardPages.SELECT_DRIVE);
  }

  if (source === ContentSources.KOLIBRI_STUDIO) {
    store.commit('SET_TRANSFER_TYPE', TransferTypes.REMOTEIMPORT);
    if (isImportingMore) {
      // From import-more-from-channel workflow
      return router.push(selectContentPageLink({ channelId: transferredChannel.id }));
    }
    // From top-level import workflow
    prepareForAvailableChannelsPage(store);
    return router.push(availableChannelsPageLink());
  }

  if (source === ContentSources.PEER_KOLIBRI_SERVER) {
    store.commit('SET_TRANSFER_TYPE', TransferTypes.PEERIMPORT);
    store.commit('SET_WIZARD_PAGENAME', ContentWizardPages.SELECT_NETWORK_ADDRESS);
  }
}

// Forward from SELECT_DRIVE -> AVAILABLE_CHANNELS or SELECT_CONTENT
export function goForwardFromSelectDriveModal(store, { driveId, forExport }) {
  const { transferredChannel } = store.state;
  const { isImportingMore } = store.getters;
  // From import-more-from-channel workflow
  if (isImportingMore) {
    store.commit('SET_WIZARD_PAGENAME', ContentWizardPages.SELECT_CONTENT);
    return router.push(
      selectContentPageLink({ channelId: transferredChannel.id, driveId, forExport })
    );
  }
  // From top-level import/export workflow
  prepareForAvailableChannelsPage(store);
  return router.push(availableChannelsPageLink({ driveId, forExport }));
}
