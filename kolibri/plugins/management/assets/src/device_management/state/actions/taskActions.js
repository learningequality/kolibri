/* eslint-env node */
import { TaskResource } from 'kolibri.resources';
import isEqual from 'lodash/isEqual';
import pick from 'lodash/fp/pick';

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

// need to convert observable Task to plain Object to make it deep-comparable
const simplifyTask = pick(['id', 'status', 'percentage']);

function _taskListShouldUpdate(state, newTasks) {
  const oldTasks = state.pageState.taskList;
  return !isEqual(oldTasks.map(simplifyTask), newTasks.map(simplifyTask));
}

/**
 * Updates pageState.taskList, but only if there is a change.
 *
 */
export function refreshTaskList(store) {
  return TaskResource.getTasks().then(({ entity: newTasks }) => {
    if (_taskListShouldUpdate(store.state, newTasks)) {
      updateTasks(store, newTasks);
    }
  });
}

/**
 * Updates pageState.wizardState.driveList
 *
 */
export function refreshDriveList(store) {
  return TaskResource.localDrives().then(({ entity }) => {
    store.dispatch('SET_DRIVE_LIST', entity);
  });
}
