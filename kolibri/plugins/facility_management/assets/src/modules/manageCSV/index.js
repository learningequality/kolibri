import { CSVGenerationStatuses } from '../../constants';
import actions from './actions';

function defaultState() {
  return {
    summaryLogStatus: CSVGenerationStatuses.NO_LOGS_CREATED,
    summaryTaskId: '',
    sessionLogStatus: CSVGenerationStatuses.NO_LOGS_CREATED,
    sessionTaskId: '',
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
  },
  mutations: {
    SET_STATE(state, payload) {
      Object.assign(state, payload);
    },
    RESET_STATE(state) {
      Object.assign(state, defaultState());
    },
    START_SUMMARY_CSV_EXPORT(state) {
      state.summaryLogStatus = CSVGenerationStatuses.GENERATING;
    },
    START_SESSION_CSV_EXPORT(state) {
      state.sessionLogStatus = CSVGenerationStatuses.GENERATING;
    },
  },
  actions,
};
