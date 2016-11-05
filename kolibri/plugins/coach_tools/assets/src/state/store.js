const Vuex = require('vuex');
const coreStore = require('kolibri.coreVue.vuex.store');

const initialState = {
  pageName: 'REPORTS',
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
    content_scope_summary: '',
    user_scope_summary: '',
    // list of objects from server
    table_data: [{}],
  },
};

const mutations = {
  SET_PAGE_NAME(state, name) {
    state.pageName = name;
  },
};

// assigns core state and mutations
Object.assign(initialState, coreStore.initialState);
Object.assign(mutations, coreStore.mutations);

module.exports = new Vuex.Store({
  state: initialState,
  mutations,
});
