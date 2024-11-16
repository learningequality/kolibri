import logger from 'kolibri-logging';
import TaskResource from 'kolibri/apiResources/TaskResource';
import GenerateCSVLogRequestResource from 'kolibri-common/apiResources/GenerateCSVLogRequestResource';
import client from 'kolibri/client';
import urls from 'kolibri/urls';
import { currentLanguage } from 'kolibri/utils/i18n';
import { TaskStatuses, TaskTypes } from 'kolibri-common/utils/syncTaskUtils';

const logging = logger.getLogger(__filename);

function getFirstLogDate(store) {
  return client({
    url: urls['kolibri:kolibri.plugins.facility:firstlogdate'](store.rootGetters.activeFacilityId),
  }).then(response => {
    store.commit('SET_FIRST_LOG_DATE', new Date(response.data.first_log_date));
  });
}

function getCSVLogRequest(store, logType, facility) {
  return GenerateCSVLogRequestResource.fetchCollection({
    getParams: { log_type: logType, facility: facility },
    force: true,
  })
    .then(csvlogrequest => {
      if (logType == 'summary') {
        store.commit('SET_SUMMARY_LOG_REQUEST', csvlogrequest[0]);
      } else {
        store.commit('SET_SESSION_LOG_REQUEST', csvlogrequest[0]);
      }
    })
    .catch(error => {
      return store.dispatch('handleApiError', { error }, { root: true });
    });
}

function startCSVExport(store, type, dateRange, creating, commitStart) {
  if (creating) {
    return;
  }
  const params = {
    facility: store.rootGetters.activeFacilityId,
    start_date: dateRange['start'],
    end_date: dateRange['end'],
    locale: currentLanguage,
    type,
  };
  return TaskResource.startTask(params).then(task => {
    store.commit(commitStart, task);
    return task.id;
  });
}

function startSummaryCSVExport(store, dateRange) {
  return startCSVExport(
    store,
    TaskTypes.EXPORTSUMMARYLOGCSV,
    dateRange,
    store.getters.inSummaryCSVCreation,
    'START_SUMMARY_CSV_EXPORT',
  );
}

function startSessionCSVExport(store, dateRange) {
  return startCSVExport(
    store,
    TaskTypes.EXPORTSESSIONLOGCSV,
    dateRange,
    store.getters.inSessionCSVCreation,
    'START_SESSION_CSV_EXPORT',
  );
}

function getExportedCSVsInfo(store) {
  return client({
    url: urls['kolibri:kolibri.plugins.facility:exportedcsvinfo'](
      store.rootGetters.activeFacilityId,
    ),
  }).then(response => {
    const data = response.data;
    if (data.session != null) {
      getCSVLogRequest(store, 'session', store.rootGetters.activeFacilityId);
      const sessionTimeStamp = new Date(data.session * 1000);
      store.commit('SET_FINISHED_SESSION_CSV_CREATION', sessionTimeStamp);
    }
    if (data.summary != null) {
      getCSVLogRequest(store, 'summary', store.rootGetters.activeFacilityId);
      const summaryTimeStamp = new Date(data.summary * 1000);
      store.commit('SET_FINISHED_SUMMARY_CSV_CREATION', summaryTimeStamp);
    }
    if (data.user != null) {
      const userTimeStamp = new Date(data.user * 1000);
      store.commit('SET_FINISH_EXPORT_USERS', userTimeStamp);
    }
  });
}

function checkTaskStatus(store, newTasks, taskType, taskId, commitStart, commitFinish) {
  const myNewTasks = newTasks.filter(task => {
    return task.facility_id === store.rootGetters.activeFacilityId;
  });
  // if task job has already been fetched, just continually check if its completed
  if (taskId) {
    const task = myNewTasks.find(task => task.id === taskId);

    if (task && task.status === TaskStatuses.COMPLETED) {
      if (task.type === TaskTypes.EXPORTUSERSTOCSV) {
        store.commit(commitFinish, task.extra_metadata.filename);
      } else {
        store.commit(commitFinish, new Date());
        getExportedCSVsInfo(store);
      }
      TaskResource.clear(taskId);
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
  if (store.getters.exportingUsers) {
    return;
  }
  return TaskResource.startTask({
    type: TaskTypes.EXPORTUSERSTOCSV,
    facility: store.rootGetters.activeFacilityId,
    locale: currentLanguage,
  }).then(task => {
    store.commit('START_EXPORT_USERS', task);
    return task.id;
  });
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
        'SET_FINISHED_SESSION_CSV_CREATION',
      );
      checkTaskStatus(
        store,
        newTasks,
        TaskTypes.EXPORTSUMMARYLOGCSV,
        store.getters.summaryTaskId,
        'START_SUMMARY_CSV_EXPORT',
        'SET_FINISHED_SUMMARY_CSV_CREATION',
      );
      checkTaskStatus(
        store,
        newTasks,
        TaskTypes.EXPORTUSERSTOCSV,
        store.state.exportUsersTaskId,
        'START_EXPORT_USERS',
        'SET_FINISH_EXPORT_USERS',
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
  getExportedCSVsInfo,
  startExportUsers,
  getFirstLogDate,
  getCSVLogRequest,
};
