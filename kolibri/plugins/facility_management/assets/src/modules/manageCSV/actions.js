import logger from 'kolibri.lib.logging';
import filter from 'lodash/filter';
import { TaskResource } from 'kolibri.resources';
import client from 'kolibri.client';
import urls from 'kolibri.urls';
import { TaskStatuses, TaskTypes } from '../../constants';

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

function getExportedLogsInfo(store) {
  return client({
    path: urls['kolibri:core:exportedlogsinfo'](),
  }).then(response => {
    const data = response.entity;
    let sessionTimeStamp = null;
    if (data.session != null) {
      sessionTimeStamp = new Date(data.session * 1000);
      store.commit('SET_FINISHED_SESSION_CSV_CREATION', sessionTimeStamp);
    }
    let summaryTimeStamp = null;
    if (data.summary != null) {
      summaryTimeStamp = new Date(data.summary * 1000);
      store.commit('SET_FINISHED_SUMMARY_CSV_CREATION', summaryTimeStamp);
    }
  });
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
      // Identify if some of the generation scripts are running:
      if (!store.getters.sessionTaskId) {
        const sessionRunning = filter(newTasks, function(task) {
          return (
            task.type === TaskTypes.EXPORTSESSIONLOGCSV &&
            task.status !== TaskStatuses.COMPLETED &&
            task.status !== TaskStatuses.FAILED
          );
        });
        if (sessionRunning.length > 0)
          store.commit('START_SESSION_CSV_EXPORT', sessionRunning[0].id);
      } else {
        const sessionCompleted = filter(newTasks, {
          id: store.getters.sessionTaskId,
        });
        if (sessionCompleted.length > 0) {
          const task = sessionCompleted[0];
          if (task.status === TaskStatuses.COMPLETED)
            store.commit('SET_FINISHED_SESSION_CSV_CREATION', new Date());
        }
      }

      if (!store.getters.summaryTaskId) {
        const summaryRunning = filter(newTasks, function(task) {
          return (
            task.type === TaskTypes.EXPORTSUMMARYLOGCSV &&
            task.status !== TaskStatuses.COMPLETED &&
            task.status !== TaskStatuses.FAILED
          );
        });
        if (summaryRunning.length > 0)
          store.commit('START_SUMMARY_CSV_EXPORT', summaryRunning[0].id);
      } else {
        const summaryCompleted = filter(newTasks, {
          id: store.getters.summaryTaskId,
        });
        if (summaryCompleted.length > 0) {
          const task = summaryCompleted[0];
          if (task.status === TaskStatuses.COMPLETED)
            store.commit('SET_FINISHED_SUMMARY_CSV_CREATION', new Date());
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
  getExportedLogsInfo,
};
