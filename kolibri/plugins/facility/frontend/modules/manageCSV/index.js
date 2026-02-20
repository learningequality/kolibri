import { set } from 'vue';
import { CSVGenerationStatuses, UsersExportStatuses } from '../../constants';
import actions from './actions';

function defaultState() {
  return {
    summaryLogStatus: CSVGenerationStatuses.NO_LOGS_CREATED,
    summaryTaskId: '',
    summaryDateCreated: null,
    summaryLogRequest: null,
    sessionLogStatus: CSVGenerationStatuses.NO_LOGS_CREATED,
    sessionTaskId: '',
    sessionDateCreated: null,
    sessionLogRequest: null,
    firstLogDate: null,
    facilities: [],
    facilityTaskId: '',
    exportUsersTaskId: '',
    exportUsersStatus: CSVGenerationStatuses.NO_LOGS_CREATED,
    exportUsersDateCreated: null,
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
    exportingUsers(state) {
      return state.exportUsersStatus === UsersExportStatuses.EXPORTING;
    },
    exported(state) {
      return state.exportUsersStatus !== CSVGenerationStatuses.NO_LOGS_CREATED;
    },
    summaryLogRequest(state) {
      return state.summaryLogRequest;
    },
    sessionLogRequest(state) {
      return state.sessionLogRequest;
    },
    firstLogDate(state) {
      return state.firstLogDate;
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
    SET_REGISTERED(state, facility) {
      const match = state.facilities.find(f => f.id === facility.id);
      if (match) {
        set(match.dataset, 'registered', true);
      }
    },
    /*State for export users tasks*/
    START_EXPORT_USERS(state, payload) {
      state.exportUsersStatus = UsersExportStatuses.EXPORTING;
      state.exportUsersTaskId = payload.id;
    },
    SET_FINISH_EXPORT_USERS(state, payload) {
      state.exportUsersDateCreated = payload;
      state.exportUsersStatus = UsersExportStatuses.FINISHED;
      state.exportUsersTaskId = '';
    },
    /*State for First Log Date*/
    SET_FIRST_LOG_DATE(state, payload) {
      state.firstLogDate = payload;
    },
    /*State for Log Request*/
    SET_SESSION_LOG_REQUEST(state, payload) {
      state.sessionLogRequest = payload;
    },
    SET_SUMMARY_LOG_REQUEST(state, payload) {
      state.summaryLogRequest = payload;
    },
  },
  actions,
};
