import pick from 'lodash/fp/pick';
import { TaskResource } from 'kolibri.resources';

function startSummaryCSVExport(store) {
  const params = {
    logtype: 'summary',
  };
  if (!store.getters.inSummaryCSVCreation) {
    store.commit('START_SUMMARY_CSV_EXPORT');
    return TaskResource.startexportlogcsv(params);
  }
}

function startSessionCSVExport(store) {
  const params = {
    logtype: 'session',
  };
  if (!store.getters.inSessionCSVCreation) {
    store.commit('START_SESSION_CSV_EXPORT');
    return TaskResource.startexportlogcsv(params);
  }
}

function updateTasks(store, tasks) {
  store.commit('SET_TASK_LIST', tasks);
}

const simplifyTask = pick(['id', 'status', 'percentage']);

export default {
  startSummaryCSVExport,
  startSessionCSVExport,
  updateTasks,
  simplifyTask,
};
