import { TaskResource } from 'kolibri.resources';
import { handleApiError } from 'kolibri.coreVue.vuex.actions';
import { closeImportExportWizard } from './contentWizardActions';

function _taskState(data) {
  return {
    id: data.id,
    type: data.type,
    status: data.status,
    metadata: data.metadata,
    percentage: data.percentage,
  };
}

export function fetchCurrentTasks() {
  return TaskResource.getCollection().fetch()
  .then(function onSuccess(tasks) {
    return tasks.map(task => ({
      id: task.id,
      type: task.type,
      status: task.status,
      metadata: task.metadata,
      percentage: task.percentage,
    }));
  });
}

export function clearTask(store, taskId) {
  return TaskResource.clearTask(taskId)
    .then(() => {
      store.dispatch('SET_CONTENT_PAGE_TASKS', []);
    })
    .catch(error => {
      handleApiError(store, error);
    });
}

export function triggerLocalContentImportTask(store, driveId) {
  store.dispatch('SET_CONTENT_PAGE_WIZARD_BUSY', true);
  return TaskResource.localImportContent(driveId)
    .then(response => {
      store.dispatch('SET_CONTENT_PAGE_TASKS', [_taskState(response.entity)]);
      closeImportExportWizard(store);
    })
    .catch(error => {
      store.dispatch('SET_CONTENT_PAGE_WIZARD_ERROR', error.status.text);
      store.dispatch('SET_CONTENT_PAGE_WIZARD_BUSY', false);
    });
}

export function triggerLocalContentExportTask(store, driveId) {
  store.dispatch('SET_CONTENT_PAGE_WIZARD_BUSY', true);
  TaskResource.localExportContent(driveId)
    .then(response => {
      store.dispatch('SET_CONTENT_PAGE_TASKS', [_taskState(response.entity)]);
      closeImportExportWizard(store);
    })
    .catch(error => {
      store.dispatch('SET_CONTENT_PAGE_WIZARD_ERROR', error.status.text);
      store.dispatch('SET_CONTENT_PAGE_WIZARD_BUSY', false);
    });
}

export function triggerRemoteContentImportTask(store, channelId) {
  store.dispatch('SET_CONTENT_PAGE_WIZARD_BUSY', true);
  return TaskResource.remoteImportContent(channelId)
    .then(response => {
      store.dispatch('SET_CONTENT_PAGE_TASKS', [_taskState(response.entity)]);
      closeImportExportWizard(store);
    })
    .catch(error => {
      if (error.status.code === 404) {
        store.dispatch('SET_CONTENT_PAGE_WIZARD_ERROR', 'That ID was not found on our server.');
      } else {
        store.dispatch('SET_CONTENT_PAGE_WIZARD_ERROR', error.status.text);
      }
      store.dispatch('SET_CONTENT_PAGE_WIZARD_BUSY', false);
    });
}
