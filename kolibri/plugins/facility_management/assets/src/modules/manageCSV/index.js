import { CSVGenerationStatuses } from '../../constants';
import actions from './actions';

function defaultState() {
  return {
    summaryLogStatus: CSVGenerationStatuses.NO_LOGS_CREATED,
    summaryTaskId: '',
    summaryPercentage: 0,
    sessionLogStatus: CSVGenerationStatuses.NO_LOGS_CREATED,
    sessionTaskId: '',
    sessionPercentage: 0,
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
    sessionPercentage: state => state.sessionPercentage,
    summaryPercentage: state => state.summaryPercentage,
  },
  mutations: {
    SET_STATE(state, payload) {
      Object.assign(state, payload);
    },
    RESET_STATE(state) {
      Object.assign(state, defaultState());
    },
    START_SUMMARY_CSV_EXPORT(state, payload) {
      state.summaryLogStatus = CSVGenerationStatuses.GENERATING;
      state.summaryTaskId = payload;
    },
    START_SESSION_CSV_EXPORT(state, payload) {
      state.sessionLogStatus = CSVGenerationStatuses.GENERATING;
      state.sessionTaskId = payload;
    },
    SET_FINISHED_SUMMARY_CSV_CREATION(state) {
      state.summaryLogStatus = CSVGenerationStatuses.AVAILABLE;
      state.summaryTaskId = '';
      state.summaryPercentage = 0;
    },
    SET_FINISHED_SESSION_CSV_CREATION(state) {
      state.sessionLogStatus = CSVGenerationStatuses.AVAILABLE;
      state.sessionTaskId = '';
      state.sessionPercentage = 0;
    },
    SET_SESSION_PERCENTAGE(state, payload) {
      state.sessionPercentage = payload;
    },
    SET_SUMMARY_PERCENTAGE(state, payload) {
      state.summaryPercentage = payload;
    },
  },
  actions,
};
