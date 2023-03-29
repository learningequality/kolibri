import logger from 'kolibri.lib.logging';
import coreStore from 'kolibri.coreVue.vuex.store';
import { TaskResource } from 'kolibri.resources';
import client from 'kolibri.client';
import urls from 'kolibri.urls';
import isEqual from 'lodash/isEqual';
import pick from 'lodash/fp/pick';
import { TaskStatuses, TaskTypes } from 'kolibri.utils.syncTaskUtils';

const logging = logger.getLogger(__filename);

export function cancelTask(store, taskId) {
  return new Promise(resolve => {
    const cancelWatch = coreStore.watch(
      state =>
        (state.manageContent.taskList.find(task => task.id === taskId) || {}).status ===
        TaskStatuses.CANCELED,
      () => {
        cancelWatch();
        TaskResource.clear(taskId).then(resolve);
      }
    );
    TaskResource.cancel(taskId);
  });
}

function updateTasks(store, tasks) {
  const contentTasks = tasks.filter(task => Object.values(TaskTypes).includes(task.type));
  store.commit('SET_TASK_LIST', contentTasks);
}

const simplifyTask = pick(['id', 'status', 'percentage']);

function _taskListShouldUpdate(state, newTasks) {
  const oldTasks = state.taskList;
  return oldTasks && !isEqual(oldTasks.map(simplifyTask), newTasks.map(simplifyTask));
}

export function refreshTaskList(store) {
  return TaskResource.list({ queue: 'content' })
    .then(newTasks => {
      if (_taskListShouldUpdate(store.state, newTasks)) {
        updateTasks(store, newTasks);
      }
    })
    .catch(error => {
      logging.error('There was an error while fetching the task list: ', error);
    });
}

export function refreshDriveList(store) {
  return client({ url: urls['kolibri:core:driveinfo-list']() }).then(({ data }) => {
    store.commit('wizard/SET_DRIVE_LIST', data);
    return data;
  });
}
