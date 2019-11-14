import logger from 'kolibri.lib.logging';
import filter from 'lodash/filter';
import { TaskResource } from 'kolibri.resources';
import client from 'kolibri.client';
import urls from 'kolibri.urls';
import { TaskStatuses, TaskTypes } from '../../constants';

const logging = logger.getLogger(__filename);

function startCSVExport(store, logtype, creating, commitStart) {
  const params = {
    logtype: logtype,
  };
  if (!creating) {
    let promise = TaskResource.startexportlogcsv(params);
    return promise.then(task => {
      store.commit(commitStart, task.entity.id);
      return task.entity.id;
    });
  }
}

function startSummaryCSVExport(store) {
  return startCSVExport(
    store,
    'summary',
    store.getters.inSummaryCSVCreation,
    'START_SUMMARY_CSV_EXPORT'
  );
}

function startSessionCSVExport(store) {
  return startCSVExport(
    store,
    'session',
    store.getters.inSessionCSVCreation,
    'START_SESSION_CSV_EXPORT'
  );
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

function checkTaskStatus(store, newTasks, taskType, taskId, commitStart, commitFinish) {
  // if task job has already been fetched, just continually check if its completed
  if (taskId) {
    const completed = filter(newTasks, {
      id: taskId,
    });
    if (completed.length > 0) {
      const task = completed[0];
      if (task.status === TaskStatuses.COMPLETED) {
        store.commit(commitFinish, new Date());
        TaskResource.deleteFinishedTasks();
      }
    }
  } else {
    const running = filter(newTasks, function(task) {
      return (
        task.type === taskType &&
        task.status !== TaskStatuses.COMPLETED &&
        task.status !== TaskStatuses.FAILED
      );
    });
    if (running.length > 0) store.commit(commitStart, running[0]);
  }
}

function refreshTaskList(store) {
  return TaskResource.fetchCollection({
    force: true,
  })
    .then(newTasks => {
      checkTaskStatus(
        store,
        newTasks,
        TaskTypes.EXPORTSESSIONLOGCSV,
        store.getters.sessionTaskId,
        'START_SESSION_CSV_EXPORT',
        'SET_FINISHED_SESSION_CSV_CREATION'
      );
      checkTaskStatus(
        store,
        newTasks,
        TaskTypes.EXPORTSUMMARYLOGCSV,
        store.getters.summaryTaskId,
        'START_SUMMARY_CSV_EXPORT',
        'SET_FINISHED_SUMMARY_CSV_CREATION'
      );
      checkTaskStatus(
        store,
        newTasks,
        TaskTypes.SYNCDATAPORTAL,
        store.state.facilityTaskId,
        'START_FACILITY_SYNC',
        'SET_FINISH_FACILITY_SYNC'
      );
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
