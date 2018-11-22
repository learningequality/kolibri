import logger from 'kolibri.lib.logging';
import filter from 'lodash/filter';
import { TaskResource } from 'kolibri.resources';
import { TaskStatuses } from '../../constants';

const logging = logger.getLogger(__filename);

function startSummaryCSVExport(store) {
  const params = {
    logtype: 'summary',
  };
  if (!store.getters.inSummaryCSVCreation) {
    let promise = TaskResource.startexportlogcsv(params);

    return promise.then(task => {
      store.commit('START_SUMMARY_CSV_EXPORT', task.entity.id);
      return task.entity.id;
    });
  }
}

function startSessionCSVExport(store) {
  const params = {
    logtype: 'session',
  };
  if (!store.getters.inSessionCSVCreation) {
    let promise = TaskResource.startexportlogcsv(params);

    return promise.then(task => {
      store.commit('START_SESSION_CSV_EXPORT', task.entity.id);
      return task.entity.id;
    });
  }
}

function refreshTaskList(store) {
  return TaskResource.fetchCollection({
    force: true,
  })
    .then(newTasks => {
      if (store.getters.sessionTaskId) {
        const sessionCompleted = filter(newTasks, {
          id: store.getters.sessionTaskId,
        });
        if (sessionCompleted.length > 0) {
          const task = sessionCompleted[0];
          if (task.status === TaskStatuses.COMPLETED)
            store.commit('SET_FINISHED_SESSION_CSV_CREATION');
          else if (task.status === TaskStatuses.RUNNING)
            store.commit('SET_SESSION_PERCENTAGE', task.percentage);
        }
      }
      if (store.getters.summaryTaskId) {
        const summaryCompleted = filter(newTasks, {
          id: store.getters.summaryTaskId,
        });
        if (summaryCompleted.length > 0) {
          const task = summaryCompleted[0];
          if (task.status === TaskStatuses.COMPLETED)
            store.commit('SET_FINISHED_SUMMARY_CSV_CREATION');
          else if (task.status === TaskStatuses.RUNNING)
            store.commit('SET_SUMMARY_PERCENTAGE', task.percentage);
        }
      }
    })
    .catch(error => {
      logging.error('There was an error while fetching the task list: ', error);
    });
}

export default {
  refreshTaskList,
  startSummaryCSVExport,
  startSessionCSVExport,
};
