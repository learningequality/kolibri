import logger from 'kolibri.lib.logging';
import { TaskResource } from 'kolibri.resources';
import client from 'kolibri.client';
import urls from 'kolibri.urls';
import { TaskStatuses, TaskTypes } from '../../constants';

const logging = logger.getLogger(__filename);

function startCSVExport(store, logtype, creating, commitStart) {
  const params = {
    logtype: logtype,
    facility: store.rootGetters.activeFacilityId,
  };
  if (!creating) {
    let promise = TaskResource.startexportlogcsv(params);
    return promise.then(task => {
      store.commit(commitStart, task.data);
      return task.data.id;
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
    url: urls['kolibri:core:exportedlogsinfo'](
      store.rootGetters.activeFacilityId,
      store.rootGetters.currentFacilityName
    ),
  }).then(response => {
    const data = response.data;
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
  const myNewTasks = newTasks.filter(task => {
    return task.facility === store.rootGetters.activeFacilityId;
  });
  // if task job has already been fetched, just continually check if its completed
  if (taskId) {
    const task = myNewTasks.find(task => task.id === taskId);

    if (task && task.status === TaskStatuses.COMPLETED) {
      if (task.type === TaskTypes.EXPORTUSERSTOCSV) {
        store.commit(commitFinish, task.filename);
      } else {
        store.commit(commitFinish, new Date());
      }
      TaskResource.deleteFinishedTask(taskId);
    }
  } else {
    const running = myNewTasks.filter(task => {
      return (
        task.type === taskType &&
        task.status !== TaskStatuses.COMPLETED &&
        task.status !== TaskStatuses.FAILED
      );
    });
    if (running.length > 0) store.commit(commitStart, running[0]);
  }
}

function startExportUsers(store) {
  if (!store.getters.exportingUsers) {
    let promise = TaskResource.export_users_to_csv({
      facility_id: store.rootGetters.activeFacilityId,
    });
    return promise.then(task => {
      store.commit('START_EXPORT_USERS', task.data);
      return task.data.id;
    });
  }
}

function refreshTaskList(store) {
  return Promise.all([
    TaskResource.fetchCollection({
      force: true,
    }),
  ])
    .then(([newTasks]) => {
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
        TaskTypes.EXPORTUSERSTOCSV,
        store.state.exportUsersTaskId,
        'START_EXPORT_USERS',
        'SET_FINISH_EXPORT_USERS'
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
  startExportUsers,
};
