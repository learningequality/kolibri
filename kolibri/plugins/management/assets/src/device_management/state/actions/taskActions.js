import { TaskResource } from 'kolibri.resources';
import { handleApiError } from 'kolibri.coreVue.vuex.actions';
import { closeImportExportWizard } from './contentWizardActions';

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
  .then(function onSuccess() {
    store.dispatch('SET_CONTENT_PAGE_TASKS', []);
  })
  .catch(function onFailure(error) {
    handleApiError(store, error);
  });
}

function updateTaskState(store, taskData) {
  store.dispatch('SET_CONTENT_PAGE_TASKS', [{
    id: taskData.id,
    type: taskData.type,
    status: taskData.status,
    metadata: taskData.metadata,
    percentage: taskData.percentage,
  }]);
  return closeImportExportWizard(store);
}

function handleTaskError(store, error) {
  let errorText;
  if (error.status.code === 404) {
    errorText = 'That ID was not found on our server.';
  } else {
    errorText = error.status.text;
  }
  store.dispatch('SET_CONTENT_PAGE_WIZARD_ERROR', errorText);
  store.dispatch('SET_CONTENT_PAGE_WIZARD_BUSY', false);
}

function triggerTask(store, taskPromise) {
  store.dispatch('SET_CONTENT_PAGE_WIZARD_BUSY', true);
  return taskPromise
  .then(updateTaskState)
  .catch(handleTaskError);
}

export function triggerLocalContentImportTask(store, driveId) {
  return triggerTask(store, TaskResource.localImportContent(driveId));
}

export function triggerLocalContentExportTask(store, driveId) {
  return triggerTask(store, TaskResource.localExportContent(driveId));
}

export function triggerRemoteContentImportTask(store, channelId) {
  return triggerTask(store, TaskResource.remoteImportContent(channelId));
}
