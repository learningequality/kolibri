import unionBy from 'lodash/unionBy';
import * as actions from './actions';

function defaultState() {
  return {
    examsModalSet: false,
    exerciseContentNodes: [],
    exercises: [],
    selectedExercises: [],
    subtopics: [],
    topic: {},
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
    SET_TOPIC(state, topic) {
      state.topic = topic;
    },
    SET_SUBTOPICS(state, subtopics) {
      state.subtopics = subtopics;
    },
    SET_EXERCISES(state, exercises) {
      state.exercises = exercises;
    },
    SET_SELECTED_EXERCISES(state, selectedExercises) {
      state.selectedExercises = selectedExercises;
      state.exerciseContentNodes = unionBy(state.exerciseContentNodes, selectedExercises, 'id');
    },
    SET_EXAMS_MODAL(state, modalName) {
      state.examsModalSet = modalName;
    },
  },
  actions,
};
