import * as actions from './actions';

function defaultState() {
  return {
    busy: false,
    errors: [],
    unrecognizedError: false,
  };
}

export default {
  namespaced: true,
  state: defaultState(),
  schema: {
    busy: {
      default: false,
      type: Boolean,
    },
    errors: {
      default: [],
      type: Array,
      validator: function(value) {
        return value.reduce((acc, val) => {
          if (!(val instanceof String)) {
            return false;
          }
          return acc;
        }, true);
      },
    },
    unrecognizedError: {
      default: false,
      type: Boolean,
    },
  },
  mutations: {
    SET_STATE(state, payload) {
      Object.assign(state, payload);
    },
    RESET_STATE(state) {
      Object.assign(state, defaultState());
    },
    SET_SIGN_UP_BUSY(state, busy) {
      state.busy = busy;
    },
    SET_SIGN_UP_ERRORS(state, errors) {
      state.errors = errors;
    },
    SET_SIGN_UP_UNRECOGNIZED_ERROR(state) {
      state.unrecognizedError = true;
    },
  },
  actions,
};
