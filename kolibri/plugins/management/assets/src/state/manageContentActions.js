/* eslint-disable prefer-arrow-callback */
const ConditionalPromise = require('kolibri.lib.conditionalPromise');
const coreActions = require('kolibri.coreVue.vuex.actions');
const getters = require('kolibri.coreVue.vuex.getters');
const logging = require('kolibri.lib.logging');
const map = require('lodash/map');
const { samePageCheckGenerator } = require('kolibri.coreVue.vuex.actions');
const preparePage = require('./preparePage');
const { FileResource, TaskResource, ChannelResource } = require('kolibri').resources;
const { PageNames, ContentWizardPages } = require('../constants');

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

function updateWizardPage(store, pageName, meta = {}) {
  return store.dispatch('SET_CONTENT_PAGE_WIZARD_STATE', {
    busy: false,
    driveList: null,
    drivesLoading: false,
    error: null,
    page: pageName,
    meta,
    shown: true,
  });
}

function startImportWizard(store) {
  return updateWizardPage(store, ContentWizardPages.CHOOSE_IMPORT_SOURCE);
}

function startExportWizard(store) {
  return updateWizardPage(store, ContentWizardPages.EXPORT);
}

function showImportNetworkWizard(store) {
  return updateWizardPage(store, ContentWizardPages.IMPORT_NETWORK);
}

function showLocalImportPreview(store, driveData) {
  return updateWizardPage(store, ContentWizardPages.IMPORT_PREVIEW, {
    sourceId: driveData.driveId,
    sourceName: driveData.driveName,
    sourceType: 'local',
    channels: driveData.channels,
    error: null,
  });
}

function showNetworkImportPreview(store, channelId) {
  const channelMetadataRequest = ChannelResource.getModel(channelId).fetch();
  const payload = {
    sourceId: channelId,
    sourceName: '',
    sourceType: 'network',
    channels: [], // just to make types consistent
    error: null,
  };
  return channelMetadataRequest._promise
  .then((channel) => {
    updateWizardPage(
      store,
      ContentWizardPages.IMPORT_PREVIEW,
      Object.assign(payload, { sourceName: channel.name })
    );
  })
  .catch((err) => {
    updateWizardPage(
      store,
      ContentWizardPages.IMPORT_PREVIEW,
      Object.assign(payload, { error: err.entity })
    );
  });
}

function cancelImportExportWizard(store) {
  return updateWizardPage(store, ContentWizardPages.NONE);
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
  const clearTaskPromise = TaskResource.clearTask(taskId);
  clearTaskPromise.then(() => {
    store.dispatch('SET_CONTENT_PAGE_TASKS', []);
  })
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
  showImportNetworkWizard,
  showLocalImportPreview,
  showNetworkImportPreview,
  startExportWizard,
  startImportWizard,
  triggerLocalContentExportTask,
  triggerLocalContentImportTask,
  triggerRemoteContentImportTask,
  updateChannelContentInfo,
  updateWizardLocalDriveList,
};
