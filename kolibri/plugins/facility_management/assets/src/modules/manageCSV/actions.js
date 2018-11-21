import logger from 'kolibri.lib.logging';
import isEqual from 'lodash/isEqual';
import pick from 'lodash/fp/pick';
import { TaskResource } from 'kolibri.resources';

const logging = logger.getLogger(__filename);

function startSummaryCSVExport(store) {
  const params = {
    logtype: 'summary',
  };
  if (!store.getters.inSummaryCSVCreation) {
    let promise = TaskResource.startexportlogcsv(params);

    return promise
      .then(task => {
        store.commit('START_SUMMARY_CSV_EXPORT', task.entity.id);
        return task.entity.id;
      })
      .then(completedTask => {
        updateStatuses(store, completedTask);
      });
  }
}

function startSessionCSVExport(store) {
  const params = {
    logtype: 'session',
  };
  if (!store.getters.inSessionCSVCreation) {
    let promise = TaskResource.startexportlogcsv(params);

    return promise
      .then(task => {
        store.commit('START_SESSION_CSV_EXPORT', task.entity.id);
        return task.entity.id;
      })
      .then(completedTask => {
        updateStatuses(store, completedTask);
      });
  }
}

function updateTasks(store, tasks) {
  store.commit('SET_TASK_LIST', tasks);
}

function updateStatuses(store, task_id) {
  if (task_id === store.getters.summaryTaskId) store.commit('SET_FINISHED_SUMMARY_CSV_CREATION');
  else if (task_id === store.getters.sessionTaskId)
    store.commit('SET_FINISHED_SESSION_CSV_CREATION');
}

function _taskListShouldUpdate(state, newTasks) {
  const oldTasks = state.taskList;
  return oldTasks && !isEqual(oldTasks.map(simplifyTask), newTasks.map(simplifyTask));
}

function refreshTaskList(store) {
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

const simplifyTask = pick(['id', 'status', 'percentage']);

export default {
  refreshTaskList,
  startSummaryCSVExport,
  startSessionCSVExport,
  updateTasks,
  simplifyTask,
};
