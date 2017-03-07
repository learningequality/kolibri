const Vuex = require('kolibri.lib.vuex');
const coreStore = require('kolibri.coreVue.vuex.store');
const constants = require('./constants');

const initialState = {
  pageName: constants.PageNames.REPORTS,
  pageState: {
    // URL-input
    channel_id: '',
    content_scope: '',
    content_scope_id: '',
    user_scope: '',
    user_scope_id: '',
    all_or_recent: '',
    view_by_content_or_learners: '',
    sort_column: '',
    sort_order: '',

    // API-generated
    content_scope_summary: {},
    user_scope_summary: {},
    // list of objects from server
    table_data: [{}],
  },
};

const mutations = {
  SET_PAGE_NAME(state, pageName) {
    state.pageName = pageName;
  },
  SET_CHANNEL_ID(state, channelId) {
    state.pageState.channel_id = channelId;
  },
  SET_CONTENT_SCOPE(state, contentScope) {
    state.pageState.content_scope = contentScope;
  },
  SET_CONTENT_SCOPE_ID(state, contentScopeId) {
    state.pageState.content_scope_id = contentScopeId;
  },
  SET_USER_SCOPE(state, userScope) {
    state.pageState.user_scope = userScope;
  },
  SET_USER_SCOPE_ID(state, userScopeId) {
    state.pageState.user_scope_id = userScopeId;
  },
  SET_ALL_OR_RECENT(state, allOrRecent) {
    state.pageState.all_or_recent = allOrRecent;
  },
  SET_VIEW_BY_CONTENT_OR_LEARNERS(state, viewByContentOrLearners) {
    state.pageState.view_by_content_or_learners = viewByContentOrLearners;
  },
  SET_SORT_COLUMN(state, sortColumn) {
    state.pageState.sort_column = sortColumn;
  },
  SET_SORT_ORDER(state, sortOrder) {
    state.pageState.sort_order = sortOrder;
  },
  SET_CONTENT_SCOPE_SUMMARY(state, contentScopeSummary) {
    state.pageState.content_scope_summary = contentScopeSummary;
  },
  SET_USER_SCOPE_SUMMARY(state, userScopeSummary) {
    state.pageState.user_scope_summary = userScopeSummary;
  },
  SET_TABLE_DATA(state, tableData) {
    state.pageState.table_data = tableData;
  },
};

// assigns core state and mutations
Object.assign(initialState, coreStore.initialState);
Object.assign(mutations, coreStore.mutations);

module.exports = new Vuex.Store({
  state: initialState,
  mutations,
});
