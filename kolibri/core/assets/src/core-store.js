

const UserKinds = require('./constants').UserKinds;

const baseLoggingState = {
  summary: { progress: 0 },
  session: {},
  mastery: {},
  attempt: {},
};

// core state is namespaced, and merged with a particular app's state
const initialState = {
  core: {
    error: '',
    loading: true,
    pageSessionId: 0,
    session: {
      id: undefined,
      username: '',
      full_name: '',
      user_id: undefined,
      facility_id: undefined,
      kind: [UserKinds.ANONYMOUS],
    },
    loginModalVisible: false,
    loginError: null,
    fullname: '',
    logging: baseLoggingState,
  },
};

const mutations = {

  CORE_SET_SESSION(state, value) {
    state.core.session = value;
    state.core.loginModalVisible = false;
  },
  // Makes settings for wrong credentials 401 error
  CORE_SET_LOGIN_ERROR(state, value) {
    state.core.loginError = value;
  },
  CORE_CLEAR_SESSION(state) {
    state.core.session = {
      id: undefined,
      username: '',
      full_name: '',
      user_id: undefined,
      facility_id: undefined,
      kind: [UserKinds.ANONYMOUS],
    };
  },
  CORE_SET_LOGIN_MODAL_VISIBLE(state, value) {
    state.core.loginModalVisible = value;
  },


  CORE_SET_PAGE_LOADING(state, value) {
    const update = { loading: value };
    if (value) {
      Object.assign(update, { pageSessionId: state.core.pageSessionId + 1 });
    }
    Object.assign(state.core, update);
  },
  CORE_SET_ERROR(state, error) {
    state.core.error = error;
  },
  SET_LOGGING_SUMMARY_STATE(state, summaryState) {
    state.core.logging.summary = summaryState;
  },
  SET_LOGGING_SUMMARY_ID(state, summaryId) {
    state.core.logging.summary.id = summaryId;
  },
  SET_LOGGING_SESSION_ID(state, sessionId) {
    state.core.logging.session.id = sessionId;
  },
  SET_LOGGING_SESSION_STATE(state, sessionState) {
    state.core.logging.session = sessionState;
  },
  SET_LOGGING_PROGRESS(state, sessionProgress, summaryProgress) {
    state.core.logging.session.progress = sessionProgress;
    state.core.logging.summary.progress = summaryProgress;
  },
  SET_LOGGING_COMPLETION_TIME(state, time) {
    state.core.logging.summary.completion_timestamp = time;
  },
  SET_LOGGING_TIME(state, sessionTime, summaryTime, currentTime) {
    state.core.logging.session.end_timestamp = currentTime;
    state.core.logging.summary.end_timestamp = currentTime;
    state.core.logging.session.time_spent = sessionTime;
    state.core.logging.summary.time_spent = summaryTime;
  },
  SET_LOGGING_PENDING(state, summaryPending, sessionPending) {
    state.core.logging.summary.pending_create = summaryPending;
    state.core.logging.session.pending_create = sessionPending;
  },
  SET_LOGGING_THRESHOLD_CHECKS(state, progress, timeSpent) {
    state.core.logging.session.total_time_at_last_save = timeSpent;
    state.core.logging.session.progress_at_last_save = progress;
  },
  SET_LOGGING_MASTERY_STATE(state, masteryState) {
    state.core.logging.mastery = masteryState;
  },
  SET_LOGGING_ATTEMPT_STATE(state, attemptState) {
    state.core.logging.attempt = attemptState;
  },
  SET_EMPTY_LOGGING_STATE(state) {
    state.core.logging = baseLoggingState;
  },
};

module.exports = {
  initialState,
  mutations,
};
