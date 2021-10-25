import Vue from 'kolibri.lib.vue';
import fromPairs from 'lodash/fromPairs';

export default {
  state: {
    complete: null,
    progress: null,
    progress_delta: null,
    last_saved_progress: null,
    time_spent: null,
    time_spent_delta: null,
    session_id: null,
    extra_fields: null,
    extra_fields_dirty_bit: null,
    mastery_criterion: null,
    totalattempts: null,
    pastattempts: null,
    pastattemptMap: null,
    // Array of as yet unsaved responses
    unsavedResponses: null,
    saving: null,
    context: null,
  },
  mutations: {
    SET_EMPTY_LOGGING_STATE(state) {
      for (let key in state) {
        state[key] = null;
      }
    },
    INITIALIZE_LOGGING_STATE(state, data) {
      state.context = data.context;
      state.complete = data.complete;
      state.progress = data.progress;
      state.progress_delta = 0;
      state.time_spent = data.time_spent;
      state.time_spent_delta = 0;
      state.session_id = data.session_id;
      state.extra_fields = data.extra_fields;
      state.mastery_criterion = data.mastery_criterion ? data.mastery_criterion : null;
      state.pastattempts = data.pastattempts ? data.pastattempts : null;
      state.pastattemptMap = data.pastattempts
        ? fromPairs(data.pastattempts.map(a => [a.id, a]))
        : null;
      state.totalattempts = data.totalattempts ? data.totalattempts : null;
      state.unsavedResponses = [];
    },
    ADD_UNSAVED_RESPONSE(state, response) {
      state.unsavedResponses.push(response);
    },
    ADD_OR_UPDATE_ATTEMPT(state, attempt) {
      if (attempt.id) {
        if (!state.pastattemptMap[attempt.id]) {
          state.pastattempts.unshift(attempt);
          Vue.set(state.pastattemptMap, attempt.id, attempt);
          state.totalattempts += 1;
        } else {
          Object.assign(state.pastattemptMap[attempt.id], attempt);
        }
      }
    },
    UPDATE_LOGGING_TIME(state, timeDelta) {
      state.time_spent = state.time_spent + timeDelta;
    },
    SET_LOGGING_CONTENT_STATE(state, contentState) {
      state.extra_fields.contentState = contentState;
      state.extra_fields_dirty_bit = true;
    },
    SET_LOGGING_PROGRESS(state, progress) {
      if (state.progress < progress) {
        state.progress_delta = progress - state.progress;
        state.progress = progress;
      }
    },
    ADD_LOGGING_PROGRESS(state, progressDelta) {
      state.progress_delta = state.progress_delta + progressDelta;
      state.progress = Math.min(state.progress + progressDelta, 1);
    },
    LOGGING_SAVING(state) {
      state.progress_delta = 0;
      state.time_spent_delta = 0;
      state.extra_fields_dirty_bit = false;
      state.unsavedResponses = [];
    },
  },
};
