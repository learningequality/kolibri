import { set } from 'vue';
import * as actions from './actions';

function defaultState() {
  return {
    learnerGroups: [],
    lessons: [],
  };
}

export default {
  namespaced: true,
  state: defaultState(),
  mutations: {
    SET_STATE(state, payload) {
      Object.assign(state, payload);
    },
    RESET_STATE(state) {
      Object.assign(state, defaultState());
    },
    SET_LEARNER_GROUPS(state, learnerGroups) {
      state.learnerGroups = [...learnerGroups];
    },
    SET_CLASS_LESSONS(state, lessons) {
      state.lessons = lessons;
    },
    SET_CLASS_LESSONS_SIZES(state, sizes) {
      if (sizes.length > 0) {
        for (const sizeItem of sizes) {
          for (const [key, val] of Object.entries(sizeItem)) {
            const lesson = state.lessons.find(lesson => lesson.id === key);
            if (lesson) {
              set(lesson, 'size', val);
            }
          }
        }
        state.lessons = [...state.lessons];
      }
    },
  },
  actions,
};
