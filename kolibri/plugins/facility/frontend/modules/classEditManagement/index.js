import { displayModal, SET_DATA_LOADING, SET_ERROR, SET_MODAL } from '../shared';
import { removeClassLearner, removeClassCoach, updateClass } from './actions';

function defaultState() {
  return {
    classCoaches: [],
    classLearners: [],
    classes: [],
    currentClass: null,
    error: '',
    dataLoading: false,
    modalShown: false,
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
    SET_DATA_LOADING,
    SET_ERROR,
    SET_MODAL,
    UPDATE_CLASS(state, { id, updatedClass }) {
      state.classes.forEach((classModel, index, arr) => {
        if (classModel.id === id) {
          arr[index] = updatedClass;
        }
      });
      if (state.currentClass && state.currentClass.id === id) {
        state.currentClass = updatedClass;
      }
    },
    DELETE_CLASS_LEARNER(state, id) {
      state.classLearners = state.classLearners.filter(user => user.id !== id);
    },
    DELETE_CLASS_COACH(state, id) {
      state.classCoaches = state.classCoaches.filter(user => user.id !== id);
      // Note that we only do this here because we use `currentClass.coaches` when relevant,
      // but there is no equivalent `currentClass.learners` - instead code uses `classLearners`
      // where relevant. This is a bit of a stop-gap before this is converted away from Vuex
      // in the near future.
      if (state.currentClass) {
        state.currentClass.coaches = state.currentClass.coaches.filter(u => u.id !== id);
      }
    },
  },
  actions: {
    displayModal,
    removeClassLearner,
    removeClassCoach,
    updateClass,
  },
};
