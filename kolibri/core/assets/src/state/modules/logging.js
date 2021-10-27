import Vue from 'kolibri.lib.vue';
import fromPairs from 'lodash/fromPairs';

function valOrNull(val) {
  return typeof val !== 'undefined' ? val : null;
}

function progressPrecision(num) {
  if (num) {
    return Number(num.toPrecision(3));
  }
  return num;
}

export default {
  state: () => ({
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
    // Array of as yet unsaved interactions
    unsavedInteractions: null,
    context: null,
  }),
  mutations: {
    SET_EMPTY_LOGGING_STATE(state) {
      for (let key in state) {
        state[key] = null;
      }
    },
    INITIALIZE_LOGGING_STATE(state, data) {
      state.context = valOrNull(data.context);
      state.complete = valOrNull(data.complete);
      state.progress = progressPrecision(valOrNull(data.progress));
      state.progress_delta = 0;
      state.time_spent = valOrNull(data.time_spent);
      state.time_spent_delta = 0;
      state.session_id = valOrNull(data.session_id);
      state.extra_fields = valOrNull(data.extra_fields);
      state.mastery_criterion = valOrNull(data.mastery_criterion);
      state.pastattempts = valOrNull(data.pastattempts);
      state.pastattemptMap = data.pastattempts
        ? fromPairs(data.pastattempts.map(a => [a.id, a]))
        : null;
      state.totalattempts = valOrNull(data.totalattempts);
      state.unsavedInteractions = [];
    },
    ADD_UNSAVED_INTERACTION(state, interaction) {
      state.unsavedInteractions.push(interaction);
      if (!interaction.id) {
        const unsavedInteraction = state.pastattempts.find(
          a => !a.id && a.item === interaction.item
        );
        if (unsavedInteraction) {
          for (let key in interaction) {
            Vue.set(unsavedInteraction, key, interaction[key]);
          }
        } else {
          state.pastattempts.unshift(interaction);
          state.totalattempts += 1;
        }
      }
    },
    UPDATE_ATTEMPT(state, interaction) {
      if (interaction.id) {
        if (!state.pastattemptMap[interaction.id]) {
          const nowSavedInteraction = state.pastattempts.find(
            a => !a.id && a.item === interaction.item
          );
          for (let key in interaction) {
            Vue.set(nowSavedInteraction, key, interaction[key]);
          }
          Vue.set(state.pastattemptMap, nowSavedInteraction.id, nowSavedInteraction);
          state.totalattempts += 1;
        } else {
          for (let key in interaction) {
            Vue.set(state.pastattemptMap[interaction.id], key, interaction[key]);
          }
        }
      }
    },
    UPDATE_LOGGING_TIME(state, timeDelta) {
      state.time_spent = state.time_spent + timeDelta;
      state.time_spent_delta = state.time_spent_delta + timeDelta;
    },
    SET_LOGGING_CONTENT_STATE(state, contentState) {
      state.extra_fields.contentState = contentState;
      state.extra_fields_dirty_bit = true;
    },
    SET_LOGGING_PROGRESS(state, progress) {
      progress = progressPrecision(progress);
      if (state.progress < progress) {
        state.progress_delta = progressPrecision(progress - state.progress);
        state.progress = progress;
      }
    },
    ADD_LOGGING_PROGRESS(state, progressDelta) {
      progressDelta = progressPrecision(progressDelta);
      state.progress_delta = progressPrecision(state.progress_delta + progressDelta);
      state.progress = Math.min(progressPrecision(state.progress + progressDelta), 1);
    },
    LOGGING_SAVING(state) {
      state.progress_delta = 0;
      state.time_spent_delta = 0;
      state.extra_fields_dirty_bit = false;
      state.unsavedInteractions = [];
    },
    SET_COMPLETE(state) {
      state.complete = true;
    },
  },
};
