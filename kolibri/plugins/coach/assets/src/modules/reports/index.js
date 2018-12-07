import Vue from 'kolibri.lib.vue';
import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
import * as getters from './getters';
import * as actions from './actions';

function defaultState() {
  return {
    attemptLogIndex: 0,
    attemptLogs: [],
    channelId: '',
    channelRootId: '',
    contentScope: '',
    contentScopeId: '',
    contentScopeSummary: {},
    currentAttemptLog: {},
    currentInteraction: undefined,
    currentInteractionHistory: [],
    exercise: {},
    interactionIndex: 0,
    lastActiveTime: null,
    showRecentOnly: undefined,
    sortColumn: '',
    sortOrder: '',
    summaryLog: {},
    tableData: [],
    user: {},
    userScope: '',
    userScopeId: '',
    userScopeName: '',
    viewBy: '',
  };
}

export default {
  namespaced: true,
  state: defaultState(),
  actions,
  getters,
  mutations: {
    SET_STATE(state, payload) {
      Object.assign(state, payload);
    },
    RESET_STATE(state) {
      Object.assign(state, defaultState());
    },
    SET_REPORT_SORTING(state, { sortColumn, sortOrder }) {
      Vue.set(state, 'sortColumn', sortColumn);
      Vue.set(state, 'sortOrder', sortOrder);
    },
    CLEAR_REPORT_SORTING(state) {
      Vue.set(state, 'sortColumn', '');
      Vue.set(state, 'sortOrder', '');
    },
    SET_REPORT_PROPERTIES(state, payload) {
      Vue.set(state, 'channelId', payload.channelId);
      Vue.set(state, 'channelRootId', payload.channelRootId);
      Vue.set(state, 'contentScope', payload.contentScope);
      Vue.set(state, 'contentScopeId', payload.contentScopeId);
      Vue.set(state, 'lastActiveTime', payload.lastActiveTime);
      Vue.set(state, 'userScope', payload.userScope);
      Vue.set(state, 'userScopeId', payload.userScopeId);
      Vue.set(state, 'userScopeName', payload.userScopeName);
      Vue.set(state, 'viewBy', payload.viewBy);
      Vue.set(state, 'showRecentOnly', payload.showRecentOnly);
    },
    SET_REPORT_TABLE_DATA(state, tableData) {
      Vue.set(state, 'tableData', tableData);
    },
    SET_REPORT_CONTENT_SUMMARY(state, summary) {
      const kind = summary.ancestors.length === 0 ? ContentNodeKinds.CHANNEL : summary.kind;
      Vue.set(state, 'contentScopeSummary', {
        ...summary,
        kind,
      });
    },
    SET_REPORT_USER_SUMMARY(state, summary) {
      Vue.set(state, 'userScopeSummary', summary);
    },
  },
};
