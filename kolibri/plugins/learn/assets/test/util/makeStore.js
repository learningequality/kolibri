import Vue from 'vue';
import Vuex from 'vuex';
import cloneDeep from 'lodash/cloneDeep';
import mutations from '../../src/state/mutations';
import initialState from '../../src/state/initialState';

Vue.use(Vuex);

export default function makeStore(options = {}) {
  const { pageName } = options;
  const coreState = {
    core: {
      session: {
        kind: [],
      },
      logging: {
        mastery: {},
        summary: {},
      },
    },
  };
  const state = cloneDeep(initialState);
  Object.assign(state, coreState);
  state.pageState.content = {};
  state.pageState.topic = {};
  if (pageName) {
    state.pageName = pageName;
  }

  return new Vuex.Store({
    mutations: {
      ...mutations,
      CORE_SET_ERROR() {},
    },
    state,
  });
}
