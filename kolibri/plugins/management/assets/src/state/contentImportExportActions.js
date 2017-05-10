/* eslint-disable prefer-arrow-callback */
const ConditionalPromise = require('kolibri.lib.conditionalPromise');
const coreActions = require('kolibri.coreVue.vuex.actions');
const getters = require('kolibri.coreVue.vuex.getters');
const map = require('lodash/map');
const { samePageCheckGenerator } = require('kolibri.coreVue.vuex.actions');
const preparePage = require('./preparePage');
const { PageNames } = require('../constants');
const { FileResource, TaskResource, ChannelResource } = require('kolibri').resources;

function _taskState(data) {
  const state = {
    id: data.id,
    type: data.type,
    status: data.status,
    metadata: data.metadata,
    percentage: data.percentage,
  };
  return state;
}

function _managePageTitle(title) {
  return `Manage ${title}`;
}

// Grabs all files in a channel and sends it to mutation to update
// statistics like number of files and total size.
// TODO: Getting files via FileResource requires a lot of bandwidth and memory.
// Should write backend that aggregates the file numbers/sizes on the server-side instead.
function updateChannelContentInfo(store, channelId) {
  const resourceRequests = [
    FileResource.getCollection({ channel_id: channelId }).fetch(),
  ];
  return ConditionalPromise.all(resourceRequests).only(
    samePageCheckGenerator(store),
    function onSuccess([files]) {
      store.dispatch('CONTENT_MGMT_UPDATE_CHANNEL_INFO', { channelId, files });
    },
    function onFailure(err) {
      return coreActions.handleApiError(store, err);
    }
  );
}

function deleteChannel(store, channelId) {
  // This will probably just delete channel from the DB, but prob not from filesystem.
  return ChannelResource.getModel(channelId).delete()
  .then(() => {
    store.dispatch('CORE_REMOVE_CHANNEL', channelId);
  });
}

function showContentPage(store) {
  preparePage(store.dispatch, { name: PageNames.CONTENT_MGMT_PAGE, title: _managePageTitle('Content') });

  if (!getters.isSuperuser(store.state)) {
    store.dispatch('CORE_SET_PAGE_LOADING', false);
    return Promise.resolve();
  }
  const taskCollectionPromise = TaskResource.getCollection().fetch();
  return taskCollectionPromise.only(
    samePageCheckGenerator(store),
    (taskList) => {
      const pageState = {
        taskList: taskList.map(_taskState),
        wizardState: { shown: false },
        channelInfo: {},
      };
      coreActions.setChannelInfo(store).then(() => {
        const channelIds = map(store.state.core.channels.list, 'id');
        channelIds.forEach(id => updateChannelContentInfo(store, id));
        store.dispatch('SET_PAGE_STATE', pageState);
        store.dispatch('CORE_SET_PAGE_LOADING', false);
      });
    },
    error => { coreActions.handleApiError(store, error); }
  );
}

module.exports = {
  deleteChannel,
  showContentPage,
  updateChannelContentInfo,
};
