import { del, set } from 'vue';
import { CSVGenerationStatuses } from '../../constants';
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
  };
}

function defaultUserExportState() {
  return {
    exportUsersTaskId: '',
    exportUsersTaskMissing: false,
    exportUsersTaskFileFound: false,
    exportUsersDateCreated: null,
    exportUsersError: null,
    exportUsersFailureCount: 0,
    exportUsersCompleted: false,
  };
}

function reconcileMissingUserExport(state) {
  if (state.exportUsersTaskMissing && state.exportUsersTaskFileFound) {
    state.exportUsersTaskId = '';
  }
}

function settleUserExport(state) {
  if (state.exportUsersTaskId) {
    if (state.exportUsersEnqueues.pending) {
      state.exportUsersEnqueues.settledTaskIds.push(state.exportUsersTaskId);
    }
    state.exportUsersTaskId = '';
  }
}

export default {
  namespaced: true,
  state: () => ({
    ...defaultState(),
    ...defaultUserExportState(),
    exportUsersEnqueues: { pending: 0, settledTaskIds: [], latestTokens: {} },
  }),
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
      return Boolean(state.exportUsersTaskId);
    },
    exported(state) {
      return state.exportUsersDateCreated !== null;
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
      Object.assign(state, defaultState(), defaultUserExportState());
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
    BEGIN_EXPORT_USERS_ENQUEUE(state, { facility, enqueueToken }) {
      set(state.exportUsersEnqueues.latestTokens, facility, enqueueToken);
      state.exportUsersEnqueues.pending += 1;
    },
    END_EXPORT_USERS_ENQUEUE(state, { facility, enqueueToken }) {
      state.exportUsersEnqueues.pending -= 1;
      if (state.exportUsersEnqueues.latestTokens[facility] === enqueueToken) {
        del(state.exportUsersEnqueues.latestTokens, facility);
      }
      if (state.exportUsersEnqueues.pending === 0) {
        state.exportUsersEnqueues.settledTaskIds = [];
      }
    },
    START_EXPORT_USERS(state, payload) {
      del(state.exportUsersEnqueues.latestTokens, payload.facility_id);
      state.exportUsersTaskId = payload.id;
      state.exportUsersTaskMissing = false;
      state.exportUsersTaskFileFound = false;
      state.exportUsersError = null;
      state.exportUsersCompleted = false;
    },
    SET_EXPORT_USERS_TASK_MISSING(state, missing) {
      state.exportUsersTaskMissing = missing;
      reconcileMissingUserExport(state);
    },
    SET_EXPORT_USERS_FILE_INFO(state, { dateCreated, taskId }) {
      state.exportUsersDateCreated = dateCreated;
      if (taskId && state.exportUsersTaskId === taskId) {
        state.exportUsersTaskFileFound = true;
        reconcileMissingUserExport(state);
      }
    },
    SET_FINISH_EXPORT_USERS(state, dateCreated) {
      state.exportUsersCompleted = true;
      state.exportUsersDateCreated = dateCreated;
      settleUserExport(state);
    },
    SET_FAILED_EXPORT_USERS(state, error) {
      settleUserExport(state);
      state.exportUsersError = error;
      state.exportUsersFailureCount += 1;
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
