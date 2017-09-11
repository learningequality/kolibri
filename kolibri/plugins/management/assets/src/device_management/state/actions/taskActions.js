/* eslint-env node */
import { TaskResource } from 'kolibri.resources';
import {
  handleApiError,
  samePageCheckGenerator,
  setChannelInfo,
} from 'kolibri.coreVue.vuex.actions';
import logger from 'kolibri.lib.logging';
import { closeImportExportWizard } from './contentWizardActions';

const logging = logger.getLogger(__filename);

function transformTasks(tasks) {
  return tasks.map(task => ({
    id: task.id,
    type: task.type,
    status: task.status,
    metadata: task.metadata,
    percentage: task.percentage,
  }));
}

export function fetchCurrentTasks() {
  return TaskResource.getCollection().fetch().then(transformTasks);
}

export function cancelTask(store, taskId) {
  return TaskResource.cancelTask(taskId)
    .then(function onSuccess() {
      updateTasks(store, []);
    })
    .catch(function onFailure(error) {
      handleApiError(store, error);
    });
}

function updateTasks(store, tasks) {
  store.dispatch('SET_CONTENT_PAGE_TASKS', transformTasks(tasks));
}

function triggerTask(store, taskPromise) {
  store.dispatch('SET_CONTENT_PAGE_WIZARD_BUSY', true);
  return taskPromise
    .then(function onSuccess(task) {
      updateTasks(store, [task.entity]);
      closeImportExportWizard(store);
    })
    .catch(function onFailure(error) {
      let errorText;
      if (error.status.code === 404) {
        errorText = 'That ID was not found on our server.';
      } else {
        errorText = error.status.text;
      }
      store.dispatch('SET_CONTENT_PAGE_WIZARD_ERROR', errorText);
      store.dispatch('SET_CONTENT_PAGE_WIZARD_BUSY', false);
    });
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

export function pollTasks(store) {
  const samePageCheck = samePageCheckGenerator(store);
  TaskResource.getCollection().fetch({}, true).only(
    // don't handle response if we've switched pages or if we're in the middle of another operation
    () => samePageCheck() && !store.state.pageState.wizardState.busy,
    taskList => {
      // Perform channel poll AFTER task poll to ensure UI is always in a consistent state.
      // I.e. channel list always reflects the current state of ongoing task(s).
      setChannelInfo(store).only(samePageCheckGenerator(store), () => {
        updateTasks(store, taskList);
        // Close the wizard if there's an outstanding task.
        // (this can be removed when we support more than one
        // concurrent task.)
        if (taskList.length && store.state.pageState.wizardState.shown) {
          closeImportExportWizard(store);
        }
      });
    },
    error => {
      logging.error(`poll error: ${error}`);
    }
  );
}
