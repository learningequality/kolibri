/* eslint-env node */
import logger from 'kolibri.lib.logging';
import { TaskResource } from 'kolibri.resources';
import isEqual from 'lodash/isEqual';
import pick from 'lodash/fp/pick';

const logging = logger.getLogger(__filename);

export function cancelTask(store, taskId) {
  return TaskResource.cancelTask(taskId).then(function onSuccess() {
    updateTasks(store, []);
  });
}

function updateTasks(store, tasks) {
  store.dispatch('SET_CONTENT_PAGE_TASKS', tasks);
}

function triggerTask(store, taskPromise) {
  return taskPromise
    .then(function onSuccess(task) {
      updateTasks(store, [task.entity]);
    })
    .catch(function onFailure(error) {
      let errorText;
      if (error.status.code === 404) {
        errorText = 'That ID was not found on our server.';
      } else {
        errorText = error.status.text;
      }
      store.dispatch('SET_CONTENT_PAGE_WIZARD_ERROR', errorText);
    });
}

export function triggerChannelDeleteTask(store, channelId) {
  return triggerTask(store, TaskResource.deleteChannel(channelId));
}

const simplifyTask = pick(['id', 'status', 'percentage']);

function _taskListShouldUpdate(state, newTasks) {
  const oldTasks = state.pageState.taskList;
  return oldTasks && !isEqual(oldTasks.map(simplifyTask), newTasks.map(simplifyTask));
}

/**
 * Updates pageState.taskList, but only if there is a change.
 */
export function refreshTaskList(store) {
  // This uses TaskResource.getTasks instead of .getCollection because
  // .getCollection mutates values in store.state such that _taskListShouldUpdate doesn't work
  return TaskResource.getTasks()
    .then(({ entity: newTasks }) => {
      if (_taskListShouldUpdate(store.state, newTasks)) {
        updateTasks(store, newTasks);
      }
    })
    .catch(error => {
      logging.error('There was an error while fetching the task list: ', error);
    });
}

/**
 * Updates pageState.wizardState.driveList
 *
 */
export function refreshDriveList(store) {
  return TaskResource.localDrives().then(({ entity }) => {
    store.dispatch('SET_DRIVE_LIST', entity);
    return entity;
  });
}
