import { TaskResource } from 'kolibri.resources';
import Vue from 'kolibri.lib.vue';
import { CSVImportStatuses } from '../../constants';
import actions from './actions';

function defaultState() {
  return {
    taskId: '',
    status: CSVImportStatuses.NOT_STARTED,
    overall_error: [],
    per_line_errors: [],
    classes_report: {
      created: 0,
      updated: 0,
      cleared: 0,
    },
    users_report: {
      created: 0,
      updated: 0,
      deleted: 0,
    },
  };
}

export default {
  namespaced: true,
  state: defaultState(),
  getters: {
    taskId(state) {
      return state.taskId;
    },
    importingOrValidating(state) {
      return (
        state.status === CSVImportStatuses.VALIDATING || state.status === CSVImportStatuses.SAVING
      );
    },
    importedOrValidated(state) {
      return (
        state.status === CSVImportStatuses.VALIDATED || state.status === CSVImportStatuses.FINISHED
      );
    },
  },
  mutations: {
    SET_STATE(state, payload) {
      Object.assign(state, payload);
    },
    RESET_STATE(state) {
      Object.assign(state, defaultState());
    },
    START_VALIDATE_USERS(state, payload) {
      state.status = CSVImportStatuses.VALIDATING;
      state.taskId = payload.id;
    },
    SET_FINISHED_IMPORT_USERS(state) {
      if (state.status == CSVImportStatuses.VALIDATING) state.status = CSVImportStatuses.VALIDATED;
      else if (state.status == CSVImportStatuses.SAVING) state.status = CSVImportStatuses.FINISHED;
      TaskResource.fetchCollection({
        force: true,
      }).then(newTasks => {
        const task = newTasks.find(task => task.id === state.taskId);
        Vue.set(state, 'per_line_errors', task.per_line_errors);
        Vue.set(state, 'overall_error', task.overall_error);
        state.users_report = task.users;
        state.classes_report = task.classes;
        TaskResource.deleteFinishedTask(state.taskId);
        state.taskId = '';
      });
    },
  },
  actions,
};
