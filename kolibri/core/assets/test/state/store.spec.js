/* eslint-env mocha */
const Vue = require('vue');
const Vuex = require('vuex');
const s = require('../../src/state/store');
const getters = require('../../src/state/getters');
const actions = require('../../src/state/actions');

Vue.use(Vuex);

function createStore() {
  return new Vuex.Store({
    state: s.initialState,
    mutations: s.mutations,
    getters,
    actions,
  });
}

describe.only('Vuex store for core module', () => {
  it('works', () => {
    const store = createStore();
  });
});
