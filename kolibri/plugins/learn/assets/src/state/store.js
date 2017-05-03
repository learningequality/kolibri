const Vuex = require('kolibri.lib.vuex');
const initialState = require('./initialState');
const mutations = require('./mutations');

module.exports = new Vuex.Store({
  state: initialState,
  mutations,
});
