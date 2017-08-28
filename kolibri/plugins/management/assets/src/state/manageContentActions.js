import { ChannelResource } from 'kolibri.resources';
import { ContentWizardPages } from '../constants';
import * as actions from './actions';
import find from 'lodash/find';

/**
 * Force-refresh the ChannelResource Collection
 *
 */
export function refreshChannelList(store) {
  return ChannelResource.getCollection().fetch({ file_sizes: true }, true).then(channels => {
    store.dispatch('SET_CONTENT_PAGE_CHANNELS', channels);
  });
}

/**
 * Delete a Channel from the device
 *
 * @param {Object} store - vuex store object
 * @param {string} channelId - a valid channel UUID
 * @returns {Promise}
 */
export function deleteChannel(store, channelId) {
  return ChannelResource.getModel(channelId).delete().then(() => {
    refreshChannelList(store);
  });
}

/**
 * State machine for the Import/Export wizards.
 * Only handles forward, back, and cancel transitions.
 *
 * @param store - vuex store object
 * @param {string} transition - 'forward', 'backward', or 'cancel'
 * @param {Object} params - data needed to execute transition
 * @returns {undefined}
 */
export function transitionWizardPage(store, transition, params) {
  const wizardPage = store.state.pageState.wizardState.page;
  const FORWARD = 'forward';
  const BACKWARD = 'backward';
  const CANCEL = 'cancel';

  const showPage = actions.showWizardPage.bind(null, store);

  if (transition === CANCEL) {
    return showPage(false);
  }

  // At Choose Source Wizard
  if (wizardPage === ContentWizardPages.CHOOSE_IMPORT_SOURCE) {
    if (transition === FORWARD && params.source === 'local') {
      return showPage(ContentWizardPages.IMPORT_LOCAL);
    }
    if (transition === FORWARD && params.source === 'network') {
      return showPage(ContentWizardPages.IMPORT_NETWORK);
    }
  }

  // At Local Import Wizard
  if (wizardPage === ContentWizardPages.IMPORT_LOCAL) {
    if (transition === BACKWARD) {
      return showPage(ContentWizardPages.CHOOSE_IMPORT_SOURCE);
    }
    if (transition === FORWARD) {
      const driveInfo = find(store.state.pageState.wizardState.driveList, { id: params.driveId });
      return showPage(ContentWizardPages.LOCAL_IMPORT_PREVIEW, {
        driveId: params.driveId,
        driveName: driveInfo.name,
        channelList: driveInfo.metadata.channels,
      });
    }
  }

  // At Network Import Wizard
  if (wizardPage === ContentWizardPages.IMPORT_NETWORK) {
    if (transition === BACKWARD) {
      return showPage(ContentWizardPages.CHOOSE_IMPORT_SOURCE);
    }
    if (transition === FORWARD) {
      return showPage(ContentWizardPages.REMOTE_IMPORT_PREVIEW, {
        channelId: params.channelId,
      });
    }
  }

  // At Export Wizard
  if (wizardPage === ContentWizardPages.EXPORT) {
    if (transition === FORWARD) {
      return actions.triggerLocalContentExportTask(store, params.driveId);
    }
  }

  // At Local Import Preview
  if (wizardPage === ContentWizardPages.LOCAL_IMPORT_PREVIEW) {
    if (transition === BACKWARD) {
      return showPage(ContentWizardPages.IMPORT_LOCAL);
    }
    if (transition === FORWARD) {
      return actions.triggerLocalContentImportTask(store, params.sourceId);
    }
  }

  // At Network Import Preview
  if (wizardPage === ContentWizardPages.REMOTE_IMPORT_PREVIEW) {
    if (transition === BACKWARD) {
      return showPage(ContentWizardPages.IMPORT_NETWORK);
    }
    if (transition === FORWARD) {
      return actions.triggerRemoteContentImportTask(store, params.sourceId);
    }
  }

  return undefined;
}
