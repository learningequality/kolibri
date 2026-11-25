import logger from 'kolibri-logging';
import TaskResource from 'kolibri/apiResources/TaskResource';
import GenerateCSVLogRequestResource from 'kolibri-common/apiResources/GenerateCSVLogRequestResource';
import client from 'kolibri/client';
import urls from 'kolibri/urls';
import { currentLanguage } from 'kolibri/utils/i18n';
import { TaskStatuses, TaskTypes } from 'kolibri-common/utils/syncTaskUtils';
import { handleApiError } from 'kolibri/utils/appError';

const logging = logger.getLogger(__filename);
const pendingTaskLists = new WeakMap();

function getFirstLogDate(store) {
  return client({
    url: urls['kolibri:kolibri.plugins.facility:firstlogdate'](store.rootGetters.activeFacilityId),
  }).then(response => {
    store.commit('SET_FIRST_LOG_DATE', new Date(response.data.first_log_date));
  });
}

function getCSVLogRequest(store, logType, facility) {
  return GenerateCSVLogRequestResource.list({ log_type: logType, facility })
    .then(csvlogrequest => {
      if (logType == 'summary') {
        store.commit('SET_SUMMARY_LOG_REQUEST', csvlogrequest[0]);
      } else {
        store.commit('SET_SESSION_LOG_REQUEST', csvlogrequest[0]);
      }
    })
    .catch(error => {
      handleApiError({ error });
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

function getExportedCSVsInfo(store, { usersOnly = false } = {}) {
  const facility = store.rootGetters.activeFacilityId;
  const userTaskId = store.state.exportUsersTaskId;
  return client({
    url: urls['kolibri:kolibri.plugins.facility:exportedcsvinfo'](facility),
  }).then(response => {
    if (store.rootGetters.activeFacilityId !== facility) {
      return;
    }
    const data = response.data;
    if (!usersOnly && data.session != null) {
      getCSVLogRequest(store, 'session', facility);
      const sessionTimeStamp = new Date(data.session);
      store.commit('SET_FINISHED_SESSION_CSV_CREATION', sessionTimeStamp);
    }
    if (!usersOnly && data.summary != null) {
      getCSVLogRequest(store, 'summary', facility);
      const summaryTimeStamp = new Date(data.summary);
      store.commit('SET_FINISHED_SUMMARY_CSV_CREATION', summaryTimeStamp);
    }
    if (data.user != null && (!usersOnly || store.state.exportUsersTaskId === userTaskId)) {
      store.commit('SET_EXPORT_USERS_FILE_INFO', {
        dateCreated: new Date(data.user),
        taskId: userTaskId,
      });
    }
  });
}

function checkTaskStatus(
  store,
  facilityTasks,
  taskType,
  taskId,
  commitStart,
  commitFinish,
  requestedUserTaskId,
) {
  // if task job has already been fetched, just continually check if its completed
  if (taskId) {
    const task = facilityTasks.find(task => task.id === taskId);
    const isUserExport = taskType === TaskTypes.EXPORTUSERSTOCSV;
    if (isUserExport && (task || taskId === requestedUserTaskId)) {
      const newlyMissing = !task && !store.state.exportUsersTaskMissing;
      store.commit('SET_EXPORT_USERS_TASK_MISSING', !task);
      if (newlyMissing && store.state.exportUsersTaskId === taskId) {
        getExportedCSVsInfo(store, { usersOnly: true }).catch(error => {
          logging.error('Could not fetch the exported user CSV info: ', error);
        });
      }
    }
    if (!task) {
      return;
    }

    if (task.status === TaskStatuses.COMPLETED) {
      if (isUserExport) {
        store.commit(commitFinish, task.extra_metadata.filename);
      } else {
        store.commit(commitFinish, new Date());
        getExportedCSVsInfo(store);
      }
    } else if (isUserExport && task.status === TaskStatuses.FAILED) {
      store.commit(
        'SET_FAILED_EXPORT_USERS',
        (task.extra_metadata?.overall_error || []).join('\n'),
      );
    } else {
      return;
    }
    TaskResource.clear(taskId).catch(error => {
      logging.error('Could not clear the CSV export task: ', error);
    });
  } else {
    const running = facilityTasks.find(task => {
      return (
        task.type === taskType &&
        task.status !== TaskStatuses.COMPLETED &&
        task.status !== TaskStatuses.FAILED
      );
    });
    if (running) store.commit(commitStart, running);
  }
}

function startExportUsers(store) {
  const facility = store.rootGetters.activeFacilityId;
  const { latestTokens } = store.state.exportUsersEnqueues;
  if (store.getters.exportingUsers || latestTokens[facility]) {
    return;
  }
  const enqueueToken = Symbol();
  store.commit('BEGIN_EXPORT_USERS_ENQUEUE', { facility, enqueueToken });
  return TaskResource.startTask({
    type: TaskTypes.EXPORTUSERSTOCSV,
    facility,
    locale: currentLanguage,
  })
    .then(task => {
      if (
        store.rootGetters.activeFacilityId === facility &&
        !store.state.exportUsersEnqueues.settledTaskIds.includes(task.id)
      ) {
        store.commit('START_EXPORT_USERS', task);
      }
      return task.id;
    })
    .catch(error => {
      logging.error('Could not start the user CSV export: ', error);
      if (
        store.rootGetters.activeFacilityId === facility &&
        latestTokens[facility] === enqueueToken
      ) {
        store.commit('SET_FAILED_EXPORT_USERS', '');
      }
    })
    .finally(() => {
      store.commit('END_EXPORT_USERS_ENQUEUE', { facility, enqueueToken });
    });
}

function refreshTaskList(store) {
  const pending = pendingTaskLists.get(store.state);
  if (pending) {
    return pending;
  }
  const requestedUserTaskId = store.state.exportUsersTaskId;
  const refresh = TaskResource.list()
    .then(newTasks => {
      const facility = store.rootGetters.activeFacilityId;
      const facilityTasks = newTasks.filter(task => task.facility_id === facility);
      checkTaskStatus(
        store,
        facilityTasks,
        TaskTypes.EXPORTUSERSTOCSV,
        store.state.exportUsersTaskId,
        'START_EXPORT_USERS',
        'SET_FINISH_EXPORT_USERS',
        requestedUserTaskId,
      );
      checkTaskStatus(
        store,
        facilityTasks,
        TaskTypes.EXPORTSESSIONLOGCSV,
        store.getters.sessionTaskId,
        'START_SESSION_CSV_EXPORT',
        'SET_FINISHED_SESSION_CSV_CREATION',
      );
      checkTaskStatus(
        store,
        facilityTasks,
        TaskTypes.EXPORTSUMMARYLOGCSV,
        store.getters.summaryTaskId,
        'START_SUMMARY_CSV_EXPORT',
        'SET_FINISHED_SUMMARY_CSV_CREATION',
      );
    })
    .catch(error => {
      logging.error('There was an error while fetching the task list: ', error);
    })
    .finally(() => {
      pendingTaskLists.delete(store.state);
    });
  pendingTaskLists.set(store.state, refresh);
  return refresh;
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
