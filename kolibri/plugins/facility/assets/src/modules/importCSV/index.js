// import Vue from 'kolibri.lib.vue';
import { CSVImportStatuses } from '../../constants';
import actions from './actions';

function defaultState() {
  return {
    taskId: '',
    status: CSVImportStatuses.NOT_STARTED,
    overall_error: [],
    per_line_errors: [],
    classes_report: { created: 0, updated: 0, cleared: 0 },
    users_report: { created: 0, updated: 0, deleted: 0 },
  };
}

export default {
  namespaced: true,
  state: defaultState(),
  getters: {},
  mutations: {},
  actions,
};
