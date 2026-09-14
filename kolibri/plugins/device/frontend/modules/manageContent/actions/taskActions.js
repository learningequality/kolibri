import logger from 'kolibri-logging';
import TaskResource from 'kolibri/apiResources/TaskResource';
import DriveInfoResource from 'kolibri-common/apiResources/DriveInfoResource';
import isEqual from 'lodash/isEqual';
import pick from 'lodash/fp/pick';
import { TaskTypes } from 'kolibri-common/utils/syncTaskUtils';

const logging = logger.getLogger(__filename);

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
  return DriveInfoResource.list().then(data => {
    store.commit('wizard/SET_DRIVE_LIST', data);
    return data;
  });
}
