/* eslint-disable prefer-arrow-callback */
const { ChannelResource, FileSummaryResource } = require('kolibri').resources;
const { ContentWizardPages } = require('../constants');
const actions = require('./actions');

const namespace = 'MANAGE_CONTENT';

const actionTypes = {
  ADD_CHANNEL_FILE_SUMMARY: `${namespace}_ADD_CHANNEL_FILE_SUMMARY`,
};

/**
 * Delete a Channel from the device
 *
 * @param store - vuex store object
 * @param {string} channelId - a valid channel UUID
 * @returns {Promise}
 */
function deleteChannel(store, channelId) {
  return ChannelResource.getModel(channelId).delete()
  .then(function onSuccess(msg) {
    // Bust the cache of ChannelResource. Page state should be updated
    // on next poll.
    ChannelResource.getCollection().fetch({}, true);
  });
}

/**
 * Request and hydrate pageState with file summary info for single channel
 *
 * @param store - vuex store object
 * @param {string} channelId - channel UUID
 * @returns {Promise}
 */
function addChannelFileSummary(store, channelId) {
  return FileSummaryResource.getCollection({ channel_id: channelId }).fetch()
  // FileSummary response is wrapped in an array as workaround on server side
  .then(function onSuccess([data]) {
    store.dispatch(actionTypes.ADD_CHANNEL_FILE_SUMMARY, data);
  })
  .catch(function onFailure(err) {
    console.error(err); // eslint-disable-line
  });
}

/**
 * Hydrate the manage content pageState with file summary info for all channels.
 * Requests for individual channels are non-blocking.
 *
 * @param store - vuex store object
 * @param {Array<String>} channelIds - an array of channelIds
 * @return {undefined}
 */
function addChannelFileSummaries(store, channelIds) {
  channelIds.forEach((channelId) => {
    addChannelFileSummary(store, channelId);
  });
}

/**
 * State machine for the Import wizards
 * @param store - vuex store object
 * @param {string} transition - 'forward', 'back', or 'cancel'
 * @param {Object} params - data needed to execute transition
 * @returns {undefined}
 */
function transitionToWizardStage(store, transition, params) {
  const wizardPage = store.state.pageState.wizardState.page;
  const FORWARD = 'forward';
  const BACKWARD = 'backward';
  const CANCEL = 'cancel';

  // At Choose Source Wizard
  if (wizardPage === ContentWizardPages.CHOOSE_IMPORT_SOURCE) {
    if (transition === FORWARD && params.source === 'local') {
      return actions.showImportLocalWizard(store);
    }
    if (transition === FORWARD && params.source === 'network') {
      return actions.showImportNetworkWizard(store);
    }
    if (transition === CANCEL) {
      return actions.cancelImportExportWizard(store);
    }
  }

  return undefined;
}

module.exports = {
  actionTypes,
  addChannelFileSummaries,
  deleteChannel,
  transitionToWizardStage,
};
