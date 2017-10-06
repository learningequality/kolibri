import Vue from 'vue';
import Vuex from 'vuex';
import cloneDeep from 'lodash/cloneDeep';
import mutations from './mutations';
import initialState from './initialState';

Vue.use(Vuex);

export default function makeStore(options = {}) {
  const { pageName } = options;
  const state = cloneDeep(initialState);
  if (pageName) {
    state.pageName = pageName;
  }

  return new Vuex.Store({
    mutations,
    state,
  });
}
