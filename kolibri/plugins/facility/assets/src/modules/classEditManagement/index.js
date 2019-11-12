import { displayModal, SET_BUSY, SET_ERROR, SET_MODAL } from '../shared';
import { removeClassLearner, removeClassCoach, updateClass } from './actions';

function defaultState() {
  return {
    classCoaches: [],
    classLearners: [],
    classes: [],
    currentClass: null,
    error: '',
    isBusy: false,
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
    SET_BUSY,
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
    },
  },
  actions: {
    displayModal,
    removeClassLearner,
    removeClassCoach,
    updateClass,
  },
};
