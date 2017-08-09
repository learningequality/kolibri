import { ChannelResource, FileSummaryResource } from 'kolibri.resources';
import { ContentWizardPages } from '../constants';
import * as actions from './actions';
import { mutationTypes } from './manageContentMutations';
import find from 'lodash/find';

/**
 * Force-refresh the ChannelResource Collection
 *
 */
export function refreshChannelList() {
  return ChannelResource.getCollection().fetch({}, true);
}

/**
 * Delete a Channel from the device
 *
 * @param {Object} store - vuex store object
 * @param {string} channelId - a valid channel UUID
 * @returns {Promise}
 */
export function deleteChannel(store, channelId) {
  return ChannelResource.getModel(channelId).delete()
    .then(() => {
      store.dispatch(mutationTypes.REMOVE_CHANNEL_FILE_SUMMARY, channelId);
    })
    .then(refreshChannelList)
}

/**
 * Request and hydrate pageState with file summary info for single channel
 *
 * @param {Object} store - vuex store object
 * @param {string} channelId - channel UUID
 * @returns {Promise}
 */
export function addChannelFileSummary(store, channelId) {
  return (
    FileSummaryResource.getCollection({ channel_id: channelId })
      .fetch()
      // FileSummary response is wrapped in an array as workaround on server side
      .then(function onSuccess([data]) {
        store.dispatch(mutationTypes.ADD_CHANNEL_FILE_SUMMARY, data);
      })
      .catch(function onFailure(err) {
        console.error(err); // eslint-disable-line
      })
  );
}

/**
 * Hydrate the manage content pageState with file summary info for all channels.
 * Requests for individual channels are non-blocking.
 *
 * @param {Object} store - vuex store object
 * @param {Array<String>} channelIds - an array of channelIds
 * @return {undefined}
 */
export function addChannelFileSummaries(store, channelIds) {
  channelIds.forEach(channelId => {
    if (store.state.pageState[channelId]) return;
    addChannelFileSummary(store, channelId);
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
