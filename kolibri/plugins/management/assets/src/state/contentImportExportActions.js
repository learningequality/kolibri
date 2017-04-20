/* eslint-disable prefer-arrow-callback */
const ConditionalPromise = require('kolibri.lib.conditionalPromise');
const coreActions = require('kolibri.coreVue.vuex.actions');
const logging = require('kolibri.lib.logging');
const map = require('lodash/map');
const { samePageCheckGenerator } = require('kolibri.coreVue.vuex.actions');
const preparePage = require('./preparePage');
const { PageNames, ContentWizardPages } = require('../constants');
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
  // This will probably just delete channel from the DB, but prob not from
  // filesystem. When 'SET_CODE_CHANNEL_LIST' is called in polling, the
  // channel doesn't disappear though. Need to see if this is bc still in filesystem.
  return ChannelResource.getModel(channelId).delete();
}

function showContentPage(store) {
  preparePage(store.dispatch, { name: PageNames.CONTENT_MGMT_PAGE, title: _managePageTitle('Content') });
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

function updateWizardLocalDriveList(store) {
  const localDrivesPromise = TaskResource.localDrives();
  store.dispatch('SET_CONTENT_PAGE_WIZARD_BUSY', true);
  localDrivesPromise.then((response) => {
    store.dispatch('SET_CONTENT_PAGE_WIZARD_BUSY', false);
    store.dispatch('SET_CONTENT_PAGE_WIZARD_DRIVES', response.entity);
  })
  .catch((error) => {
    store.dispatch('SET_CONTENT_PAGE_WIZARD_BUSY', false);
    coreActions.handleApiError(store, error);
  });
}

function startImportWizard(store) {
  store.dispatch('SET_CONTENT_PAGE_WIZARD_STATE', {
    shown: true,
    page: ContentWizardPages.CHOOSE_IMPORT_SOURCE,
    error: null,
    busy: false,
    drivesLoading: false,
    driveList: null,
  });
}

function startExportWizard(store) {
  store.dispatch('SET_CONTENT_PAGE_WIZARD_STATE', {
    shown: true,
    page: ContentWizardPages.EXPORT,
    error: null,
    busy: false,
    drivesLoading: false,
    driveList: null,
  });
  updateWizardLocalDriveList(store);
}

function showImportNetworkWizard(store) {
  store.dispatch('SET_CONTENT_PAGE_WIZARD_STATE', {
    shown: true,
    page: ContentWizardPages.IMPORT_NETWORK,
    error: null,
    busy: false,
    drivesLoading: false,
    driveList: null,
  });
}

function showImportLocalWizard(store) {
  store.dispatch('SET_CONTENT_PAGE_WIZARD_STATE', {
    shown: true,
    page: ContentWizardPages.IMPORT_LOCAL,
    error: null,
    busy: false,
    drivesLoading: false,
    driveList: null,
  });
  updateWizardLocalDriveList(store);
}

function cancelImportExportWizard(store) {
  store.dispatch('SET_CONTENT_PAGE_WIZARD_STATE', {
    shown: false,
    error: null,
    busy: false,
    drivesLoading: false,
    driveList: null,
  });
}

// called from a timer to continually update UI
function pollTasksAndChannels(store) {
  const samePageCheck = samePageCheckGenerator(store);
  TaskResource.getCollection().fetch({}, true).only(
    // don't handle response if we've switched pages or if we're in the middle of another operation
    () => samePageCheck() && !store.state.pageState.wizardState.busy,
    (taskList) => {
      // Perform channel poll AFTER task poll to ensure UI is always in a consistent state.
      // I.e. channel list always reflects the current state of ongoing task(s).
      coreActions.setChannelInfo(store).only(
        samePageCheckGenerator(store),
        () => {
          store.dispatch('SET_CONTENT_PAGE_TASKS', taskList.map(_taskState));
          // Close the wizard if there's an outstanding task.
          // (this can be removed when we support more than one
          // concurrent task.)
          if (taskList.length && store.state.pageState.wizardState.shown) {
            cancelImportExportWizard(store);
          }
        }
      );
    },
    error => { logging.error(`poll error: ${error}`); }
  );
}

function clearTask(store, taskId) {
  return TaskResource.clearTask(taskId)
  .then(() => { store.dispatch('SET_CONTENT_PAGE_TASKS', []); })
  .catch(error => { coreActions.handleApiError(store, error); });
}

function triggerLocalContentImportTask(store, driveId) {
  store.dispatch('SET_CONTENT_PAGE_WIZARD_BUSY', true);
  const localImportPromise = TaskResource.localImportContent(driveId);
  localImportPromise.then((response) => {
    store.dispatch('SET_CONTENT_PAGE_TASKS', [_taskState(response.entity)]);
    cancelImportExportWizard(store);
  })
  .catch((error) => {
    store.dispatch('SET_CONTENT_PAGE_WIZARD_ERROR', error.status.text);
    store.dispatch('SET_CONTENT_PAGE_WIZARD_BUSY', false);
  });
}

function triggerLocalContentExportTask(store, driveId) {
  store.dispatch('SET_CONTENT_PAGE_WIZARD_BUSY', true);
  const localExportPromise = TaskResource.localExportContent(driveId);
  localExportPromise.then((response) => {
    store.dispatch('SET_CONTENT_PAGE_TASKS', [_taskState(response.entity)]);
    cancelImportExportWizard(store);
  })
  .catch((error) => {
    store.dispatch('SET_CONTENT_PAGE_WIZARD_ERROR', error.status.text);
    store.dispatch('SET_CONTENT_PAGE_WIZARD_BUSY', false);
  });
}

function triggerRemoteContentImportTask(store, channelId) {
  store.dispatch('SET_CONTENT_PAGE_WIZARD_BUSY', true);
  const remoteImportPromise = TaskResource.remoteImportContent(channelId);
  remoteImportPromise.then((response) => {
    store.dispatch('SET_CONTENT_PAGE_TASKS', [_taskState(response.entity)]);
    cancelImportExportWizard(store);
  })
  .catch((error) => {
    if (error.status.code === 404) {
      store.dispatch('SET_CONTENT_PAGE_WIZARD_ERROR', 'That ID was not found on our server.');
    } else {
      store.dispatch('SET_CONTENT_PAGE_WIZARD_ERROR', error.status.text);
    }
    store.dispatch('SET_CONTENT_PAGE_WIZARD_BUSY', false);
  });
}

module.exports = {
  cancelImportExportWizard,
  clearTask,
  deleteChannel,
  pollTasksAndChannels,
  showContentPage,
  showImportLocalWizard,
  showImportNetworkWizard,
  startExportWizard,
  startImportWizard,
  triggerLocalContentExportTask,
  triggerLocalContentImportTask,
  triggerRemoteContentImportTask,
  updateChannelContentInfo,
  updateWizardLocalDriveList,
};
