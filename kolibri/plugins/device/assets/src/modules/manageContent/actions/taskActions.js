import logger from 'kolibri.lib.logging';
import coreStore from 'kolibri.coreVue.vuex.store';
import { TaskResource } from 'kolibri.resources';
import isEqual from 'lodash/isEqual';
import pick from 'lodash/fp/pick';
import { waitForTaskToComplete } from '../utils';
import { TaskStatuses, TaskTypes } from '../../../constants';

const logging = logger.getLogger(__filename);
export function cancelTask(store, taskId) {
  return new Promise(resolve => {
    let cancelWatch;
    cancelWatch = coreStore.watch(
      state =>
        (state.manageContent.taskList.find(task => task.id === taskId) || {}).status ===
        TaskStatuses.CANCELED,
      () => {
        cancelWatch();
        TaskResource.deleteFinishedTasks().then(resolve);
      }
    );
    TaskResource.cancelTask(taskId);
  });
}

function updateTasks(store, tasks) {
  const contentTasks = tasks.filter(task => Object.values(TaskTypes).includes(task.type));
  store.commit('SET_TASK_LIST', contentTasks);
}

function triggerTask(store, taskPromise) {
  return taskPromise
    .then(function onSuccess(response) {
      updateTasks(store, [response.entity]);
      return response;
    })
    .catch(function onFailure(error) {
      let errorText;
      if (error.status.code === 404) {
        errorText = 'That ID was not found on our server.';
      } else {
        errorText = error.status.text;
      }
      store.commit('wizard/SET_CONTENT_PAGE_WIZARD_ERROR', errorText);
    });
}

export function triggerChannelDeleteTask(store, channelId) {
  return triggerTask(store, TaskResource.deleteChannel({ channelId }))
    .then(response => waitForTaskToComplete(response.entity.id))
    .then(() => store.dispatch('refreshChannelList'));
}

const simplifyTask = pick(['id', 'status', 'percentage']);

function _taskListShouldUpdate(state, newTasks) {
  const oldTasks = state.taskList;
  return oldTasks && !isEqual(oldTasks.map(simplifyTask), newTasks.map(simplifyTask));
}

export function refreshTaskList(store) {
  return TaskResource.fetchCollection({ force: true })
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
  return TaskResource.localDrives().then(({ entity }) => {
    store.commit('wizard/SET_DRIVE_LIST', entity);
    return entity;
  });
}
