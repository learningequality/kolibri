import { displayModal, SET_DATA_LOADING, SET_ERROR, SET_MODAL } from '../shared';
import { createClass } from './actions';

function defaultState() {
  return {
    classes: [],
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
    ADD_CLASS(state, classroom) {
      state.classes.push(classroom);
    },
    DELETE_CLASS(state, id) {
      state.classes = state.classes.filter(classModel => classModel.id !== id);
    },
  },
  actions: {
    createClass,
    displayModal,
  },
};
