import { TaskResource } from 'kolibri.resources';
import Vue from 'kolibri.lib.vue';
import { CSVImportStatuses } from '../../constants';
import actions from './actions';

function defaultState() {
  return {
    taskId: '',
    status: CSVImportStatuses.NOT_STARTED,
    deleteUsers: false,
    filename: '',
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
    deleteUsers(state) {
      return state.deleteUsers;
    },
    filename(state) {
      return state.filename;
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
    START_SAVE_USERS(state, payload) {
      state.status = CSVImportStatuses.SAVING;
      state.taskId = payload.id;
    },
    SET_DELETE_USERS(state, payload) {
      state.deleteUsers = payload;
    },
    SET_FILENAME(state, payload) {
      state.filename = payload;
    },
    UPDATE_TASK_REPORT(state, task) {
      Vue.set(state, 'per_line_errors', task.per_line_errors);
      Vue.set(state, 'overall_error', task.overall_error);
      state.filename = task.filename;
      state.users_report = task.users;
      state.classes_report = task.classes;
      state.taskId = '';
    },
    SET_FINISHED_IMPORT_USERS(state, task) {
      if (state.status == CSVImportStatuses.VALIDATING) state.status = CSVImportStatuses.VALIDATED;
      else if (state.status == CSVImportStatuses.SAVING) state.status = CSVImportStatuses.FINISHED;

      Vue.set(state, 'per_line_errors', task.per_line_errors);
      Vue.set(state, 'overall_error', task.overall_error);
      state.filename = task.filename;
      state.users_report = task.users;
      state.classes_report = task.classes;
      TaskResource.deleteFinishedTask(state.taskId);
      state.taskId = '';
    },
    SET_FAILED(state, task) {
      state.status = CSVImportStatuses.ERRORS;
      Vue.set(state, 'overall_error', task.overall_error);
      Vue.set(state, 'per_line_errors', []);
      TaskResource.deleteFinishedTask(state.taskId);
      state.taskId = '';
    },
  },
  actions,
};
