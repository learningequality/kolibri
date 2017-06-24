/* eslint-disable prefer-arrow-callback */
import { ChannelResource, FileSummaryResource } from 'kolibri.resources';
import { ContentWizardPages } from '../constants';
import * as actions from './actions';
import { mutationTypes } from './manageContentMutations';


/**
 * Force-refresh the ChannelResource Collection
 *
 * @param {Object} store - vuex store object
 */
function refreshChannelList(store) {
  return ChannelResource.getCollection().fetch({}, true);
}

/**
 * Delete a Channel from the device
 *
 * @param {Object} store - vuex store object
 * @param {string} channelId - a valid channel UUID
 * @returns {Promise}
 */
function deleteChannel(store, channelId) {
  return ChannelResource.getModel(channelId).delete()
  .then(refreshChannelList);
}

/**
 * Request and hydrate pageState with file summary info for single channel
 *
 * @param {Object} store - vuex store object
 * @param {string} channelId - channel UUID
 * @returns {Promise}
 */
function addChannelFileSummary(store, channelId) {
  return FileSummaryResource.getCollection({ channel_id: channelId }).fetch()
  // FileSummary response is wrapped in an array as workaround on server side
  .then(function onSuccess([data]) {
    store.dispatch(mutationTypes.ADD_CHANNEL_FILE_SUMMARY, data);
  })
  .catch(function onFailure(err) {
    console.error(err); // eslint-disable-line
  });
}

/**
 * Hydrate the manage content pageState with file summary info for all channels.
 * Requests for individual channels are non-blocking.
 *
 * @param {Object} store - vuex store object
 * @param {Array<String>} channelIds - an array of channelIds
 * @return {undefined}
 */
function addChannelFileSummaries(store, channelIds) {
  channelIds.forEach((channelId) => {
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
function transitionWizardPage(store, transition, params) {
  const wizardPage = store.state.pageState.wizardState.page;
  const FORWARD = 'forward';
  const BACKWARD = 'backward';
  const CANCEL = 'cancel';

  if (transition === CANCEL) {
    return actions.cancelImportExportWizard(store);
  }

  // At Choose Source Wizard
  if (wizardPage === ContentWizardPages.CHOOSE_IMPORT_SOURCE) {
    // Now: Shows list of local drives
    // Later: `source` is driveId, and next screen is preview of imported channels
    if (transition === FORWARD && params.source === 'local') {
      return actions.showImportLocalWizard(store);
    }
    // Now: Show text box to get channelId
    // Later: Same
    if (transition === FORWARD && params.source === 'network') {
      return actions.showImportNetworkWizard(store);
    }
  }

  // At Local Import Wizard
  if (wizardPage === ContentWizardPages.IMPORT_LOCAL) {
    if (transition === BACKWARD) {
      return actions.startImportWizard(store);
    }
    // Now: Start downloading immediately
    // Later: Show preview of imported channels
    if (transition === FORWARD) {
      return actions.triggerLocalContentImportTask(store, params.driveId);
    }
  }

  // At Network Import Wizard
  if (wizardPage === ContentWizardPages.IMPORT_NETWORK) {
    if (transition === BACKWARD) {
      return actions.startImportWizard(store);
    }
    // Now: Start downloading immediately
    // Later: Show preview of imported channels
    if (transition === FORWARD) {
      return actions.triggerRemoteContentImportTask(store, params.contentId);
    }
  }

  // At Export Wizard
  if (wizardPage === ContentWizardPages.EXPORT) {
    // Now: Start exporting immediately
    // Later: Show preview of exported channels
    if (transition === FORWARD) {
      return actions.triggerLocalContentExportTask(store, params.driveId);
    }
  }

  return undefined;
}

export {
  actionTypes,
  addChannelFileSummaries,
  deleteChannel,
  transitionWizardPage,
  refreshChannelList,
};
