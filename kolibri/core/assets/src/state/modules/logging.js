import { MaxPointsPerContent } from '../../constants';

export default {
  state: {
    summary: { progress: 0 },
    session: {},
    mastery: {},
    attempt: {},
  },
  getters: {
    logging(state) {
      return state;
    },
    contentPoints(state) {
      return Math.floor(state.summary.progress) * MaxPointsPerContent;
    },
    sessionTimeSpent(state) {
      return state.session.time_spent;
    },
  },
  mutations: {
    SET_LOGGING_SUMMARY_STATE(state, summaryState) {
      state.summary = summaryState;
    },
    SET_LOGGING_SUMMARY_ID(state, summaryId) {
      state.summary.id = summaryId;
    },
    SET_LOGGING_SESSION_ID(state, sessionId) {
      state.session.id = sessionId;
    },
    SET_LOGGING_SESSION_STATE(state, sessionState) {
      state.session = sessionState;
    },
    SET_LOGGING_PROGRESS(state, { sessionProgress, summaryProgress }) {
      state.session.progress = sessionProgress;
      state.summary.progress = summaryProgress;
    },
    SET_LOGGING_COMPLETION_TIME(state, time) {
      state.summary.completion_timestamp = time;
    },
    SET_LOGGING_CONTENT_STATE(state, contentState) {
      // TODO: Consider whether we want to save these to the session log as well.
      if (!state.summary.extra_fields) {
        state.summary.extra_fields = {};
      }
      state.summary.extra_fields.contentState = contentState;
    },
    SET_LOGGING_TIME(state, { sessionTime, summaryTime, currentTime }) {
      state.session.end_timestamp = currentTime;
      state.summary.end_timestamp = currentTime;
      state.session.time_spent = sessionTime;
      state.summary.time_spent = summaryTime;
    },
    SET_LOGGING_THRESHOLD_CHECKS(state, { progress, timeSpent }) {
      state.session.total_time_at_last_save = timeSpent;
      state.session.progress_at_last_save = progress;
    },
    SET_LOGGING_MASTERY_STATE(state, masteryState) {
      state.mastery = masteryState;
    },
    SET_LOGGING_MASTERY_COMPLETE(state, completetime) {
      state.mastery.complete = true;
      state.mastery.completion_timestamp = completetime;
    },
    SET_LOGGING_ATTEMPT_STATE(state, attemptState) {
      state.attempt = attemptState;
    },
    SET_LOGGING_ATTEMPT_STARTTIME(state, starttime) {
      state.attempt.start_timestamp = starttime;
    },
    UPDATE_LOGGING_ATTEMPT_INTERACTION_HISTORY(state, action) {
      state.attempt.interaction_history.push(action);
    },
    UPDATE_LOGGING_MASTERY(state, { currentTime, correct, firstAttempt, hinted, error }) {
      if (firstAttempt) {
        state.mastery.totalattempts += 1;
        state.mastery.pastattempts.unshift({ correct, hinted, error });
      }
      state.mastery.end_timestamp = currentTime;
    },
    UPDATE_LOGGING_ATTEMPT(
      state,
      { currentTime, correct, firstAttempt, complete, hinted, answerState, simpleAnswer, error }
    ) {
      if (complete) {
        state.attempt.completion_timestamp = currentTime;
        state.attempt.complete = true;
      } else {
        state.attempt.completion_timestamp = null;
        state.attempt.complete = false;
      }
      state.attempt.end_timestamp = currentTime;
      let starttime = state.attempt.start_timestamp;
      if (typeof starttime === 'string') {
        starttime = new Date(starttime);
      }
      state.attempt.time_spent = currentTime - starttime;
      if (firstAttempt) {
        // Can only get it correct on the first try.
        state.attempt.correct = correct;
        state.attempt.hinted = hinted;
        state.attempt.answer = answerState;
        state.attempt.simple_answer = simpleAnswer;
        state.attempt.error = error;
      } else if (state.attempt.correct < 1) {
        // Only set hinted if attempt has not already been marked as correct
        // and set it to true if now true, but leave as true if false.
        state.attempt.hinted = state.attempt.hinted || hinted;
      }
    },
    SET_EMPTY_LOGGING_STATE(state) {
      state.summary = { progress: 0 };
      state.session = {};
      state.mastery = {};
      state.attempt = {};
    },
  },
};
