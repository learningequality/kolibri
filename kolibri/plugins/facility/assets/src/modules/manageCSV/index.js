import Vue from 'kolibri.lib.vue';
import { CSVGenerationStatuses } from '../../constants';
import actions from './actions';

function defaultState() {
  return {
    summaryLogStatus: CSVGenerationStatuses.NO_LOGS_CREATED,
    summaryTaskId: '',
    summaryDateCreated: null,
    sessionLogStatus: CSVGenerationStatuses.NO_LOGS_CREATED,
    sessionTaskId: '',
    sessionDateCreated: null,
    facilities: [],
    facilityTaskId: '',
  };
}

export default {
  namespaced: true,
  state: defaultState(),
  getters: {
    inSummaryCSVCreation(state) {
      return state.summaryLogStatus === CSVGenerationStatuses.GENERATING;
    },
    inSessionCSVCreation(state) {
      return state.sessionLogStatus === CSVGenerationStatuses.GENERATING;
    },
    noSummaryLogs(state) {
      return state.summaryLogStatus === CSVGenerationStatuses.NO_LOGS_CREATED;
    },
    noSessionLogs(state) {
      return state.sessionLogStatus === CSVGenerationStatuses.NO_LOGS_CREATED;
    },
    summaryTaskId(state) {
      return state.summaryTaskId;
    },
    sessionTaskId(state) {
      return state.sessionTaskId;
    },
    availableSessionCSVLog(state) {
      return state.sessionLogStatus === CSVGenerationStatuses.AVAILABLE;
    },
    availableSummaryCSVLog(state) {
      return state.summaryLogStatus === CSVGenerationStatuses.AVAILABLE;
    },
  },
  mutations: {
    SET_STATE(state, payload) {
      Object.assign(state, payload);
    },
    RESET_STATE(state) {
      Object.assign(state, defaultState());
    },
    /*State for CSV tasks*/
    START_SUMMARY_CSV_EXPORT(state, payload) {
      state.summaryLogStatus = CSVGenerationStatuses.GENERATING;
      state.summaryTaskId = payload.id;
    },
    START_SESSION_CSV_EXPORT(state, payload) {
      state.sessionLogStatus = CSVGenerationStatuses.GENERATING;
      state.sessionTaskId = payload.id;
    },
    SET_FINISHED_SUMMARY_CSV_CREATION(state, payload) {
      state.summaryLogStatus = CSVGenerationStatuses.AVAILABLE;
      state.summaryTaskId = '';
      state.summaryDateCreated = payload;
    },
    SET_FINISHED_SESSION_CSV_CREATION(state, payload) {
      state.sessionLogStatus = CSVGenerationStatuses.AVAILABLE;
      state.sessionTaskId = '';
      state.sessionDateCreated = payload;
    },
    /*State for sync tasks*/
    START_FACILITY_SYNC(state, payload) {
      const match = state.facilities.find(f => f.id === payload.facility);
      if (match) {
        Vue.set(match, 'syncing', true);
      }
      state.facilityTaskId = payload.id;
    },
    SET_FINISH_FACILITY_SYNC(state, payload) {
      state.facilityTaskId = '';
      const match = state.facilities.find(f => f.syncing === true);
      if (match) {
        Vue.set(match, 'last_synced', payload);
        Vue.set(match, 'syncing', false);
      }
    },
    SET_REGISTERED(state, facility) {
      const match = state.facilities.find(f => f.id === facility.id);
      if (match) {
        Vue.set(match.dataset, 'registered', true);
      }
    },
  },
  actions,
};
