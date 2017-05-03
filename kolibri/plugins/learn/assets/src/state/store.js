const constants = require('../constants');
const Vuex = require('kolibri.lib.vuex');
const coreStore = require('kolibri.coreVue.vuex.store');
const mutations = require('./mutations');

const initialState = {
  pageName: constants.PageNames.EXPLORE_CHANNEL,
  pageState: {
    topics: [],
    contents: [],
    searchTerm: '',
  },
  learnAppState: {},
  examLog: {},
  examAttemptLogs: {},
};

// assigns core state and mutations
Object.assign(initialState, coreStore.initialState);

module.exports = new Vuex.Store({
  state: initialState,
  mutations,
});
