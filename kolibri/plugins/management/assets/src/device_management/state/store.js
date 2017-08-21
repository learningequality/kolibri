  import Vuex from 'kolibri.lib.vuex';
  import * as coreStore from 'kolibri.coreVue.vuex.store';
  import * as mutations from './mutations';

  const initialState = {
    pageName: 'yo',
    pageState: {},
  };

  export default new Vuex.Store({
    state: Object.assign(initialState, coreStore.initialState),
    mutations: Object.assign(mutations, coreStore.mutations),
  });
