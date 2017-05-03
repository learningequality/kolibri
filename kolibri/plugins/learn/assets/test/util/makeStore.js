const Vue = require('vue');
const Vuex = require('vuex');
const cloneDeep = require('lodash/cloneDeep');
const mutations = require('../../src/state/mutations');
const initialState = require('../../src/state/initialState');

Vue.use(Vuex);

module.exports = function makeStore() {
  return new Vuex.Store({
    mutations,
    state: cloneDeep(initialState)
  });
};
