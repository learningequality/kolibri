import Vuex from 'vuex';
import Vue from 'vue';
import { initialState } from './initialState';
import coreMutations from './mutations';

Vue.use(Vuex);

const store = new Vuex.Store({});

export default store;

store.registerModule = ({ state, mutations } = { state: {}, mutations: {} }) => {
  if (store.__initialized) {
    throw new Error(
      'The store has already been initialized, dynamic initalization is not currently available'
    );
  }
  store.hotUpdate({ mutations: Object.assign(mutations, coreMutations) });
  store.replaceState(Object.assign(state, initialState));
  store.__initialized = true;
};

store.factory = ({ state, mutations } = { state: {}, mutations: {} }) => {
  store.__initialized = false;
  store.registerModule({ state, mutations });
  return store;
};
